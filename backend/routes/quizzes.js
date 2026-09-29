const express = require('express');
const Quiz = require('../models/Quiz');
const QuizQuestion = require('../models/QuizQuestion');
const QuizAttempt = require('../models/QuizAttempt');
const QuizAnswer = require('../models/QuizAnswer');
const RetakeRequest = require('../models/RetakeRequest');
const StudentStats = require('../models/StudentStats');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');
const { generateQuiz } = require('../utils/ai');
const { _gradeFreeResponseInternal } = require('../controllers/aiController');
const InternalAssessment = require('../models/InternalAssessment');
const User = require('../models/User'); // Import User for password verification

const router = express.Router();

// Get quizzes
router.get('/', authMiddleware, async (req, res) => {
  try {
    let query = {};

    // Filter by class number if provided
    if (req.query.classNumber) {
      query.class_number = req.query.classNumber;
    }

    // Teachers only see their own quizzes
    if (req.user.role === 'teacher') {
      query.teacher_id = req.user._id;
    }

    // Students only see quizzes from their institution (matching class) OR their own quizzes (Smart Practice)
    if (req.user.role === 'student') {
      const User = require('../models/User');

      // 1. Find Institution Teachers
      let institutionTeacherIds = [];
      if (req.user.institution_id) {
        const teachers = await User.find({
          role: 'teacher',
          institution_id: req.user.institution_id
        }).select('_id');
        institutionTeacherIds = teachers.map(t => t._id);
      }

      // 2. Construct Class/Semester Regex Matcher
      // Matches "1", "Sem 1", "Semester 1", "Standard 1", "Grade 1" (case insensitive)
      const userClass = req.user.standard || req.user.semester;
      let classQuery = {};
      if (userClass) {
        const s = String(userClass);
        classQuery = {
          class_number: { $regex: new RegExp(`^(Sem|Semester|Standard|Grade)?\\s*${s}$`, 'i') }
        };
      }

      // 3. Combine Logic: Institution Content (Filtered by Class) OR Own Content
      query.$or = [
        {
          teacher_id: { $in: institutionTeacherIds },
          ...classQuery
        },
        {
          teacher_id: req.user._id // Always see own quizzes (e.g. Smart Practice)
        }
      ];
    }

    const quizzes = await Quiz.find(query)
      .populate('teacher_id', 'full_name')
      .sort({ created_at: -1 })
      .lean(); // Use lean for performance

    // Fetch question counts for each quiz to display "Questions: X" correctly
    const quizzesWithCounts = await Promise.all(quizzes.map(async (quiz) => {
      const questionCount = await QuizQuestion.countDocuments({ quiz_id: quiz._id });

      let attemptsQuery = { quiz_id: quiz._id, status: 'completed' };
      if (req.user.role === 'student') {
        attemptsQuery.student_id = req.user._id;
      }

      const attemptsCount = await QuizAttempt.countDocuments(attemptsQuery);

      // Calculate average and max score
      const attempts = await QuizAttempt.find(attemptsQuery).select('percentage');
      const avgScore = attempts.length > 0
        ? attempts.reduce((acc, curr) => acc + curr.percentage, 0) / attempts.length
        : 0;
      const maxScore = attempts.length > 0
        ? Math.max(...attempts.map(a => a.percentage))
        : 0;

      return {
        ...quiz,
        questions: { length: questionCount }, // Mock object to match frontend expectation
        stats: {
          attempts: attemptsCount,
          avgScore: Math.round(avgScore),
          maxScore: Math.round(maxScore)
        }
      };
    }));

    res.json(quizzesWithCounts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request a retake
router.post('/:id/request-retake', authMiddleware, roleMiddleware('student'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

    const existingRequest = await RetakeRequest.findOne({
      student_id: req.user._id,
      quiz_id: req.params.id,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ error: 'Request already pending' });
    }

    const request = new RetakeRequest({
      student_id: req.user._id,
      quiz_id: req.params.id,
      teacher_id: quiz.teacher_id
    });

    await request.save();

    // Emit socket event to teacher
    const io = req.app.get('io');
    if (io) {
      io.emit('retake_request', {
        student: req.user.full_name,
        quiz: quiz.title,
        teacher_id: quiz.teacher_id
      });
    }

    res.json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get retake requests (Teacher)
router.get('/teacher/requests', authMiddleware, roleMiddleware('teacher'), async (req, res) => {
  try {
    const requests = await RetakeRequest.find({ teacher_id: req.user._id, status: 'pending' })
      .populate('student_id', 'full_name email')
      .populate('quiz_id', 'title')
      .sort({ created_at: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Respond to retake request (Teacher)
router.put('/requests/:requestId', authMiddleware, roleMiddleware('teacher'), async (req, res) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'
    const request = await RetakeRequest.findById(req.params.requestId);

    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.teacher_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    request.status = status;
    request.responded_at = Date.now();
    await request.save();

    res.json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single quiz with questions
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id).populate('teacher_id', 'full_name');
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Check availability logic...

    // For students, check attempts and retake status
    if (req.user.role === 'student') {
      const attemptsCount = await QuizAttempt.countDocuments({
        quiz_id: quiz._id,
        student_id: req.user._id,
        status: 'completed'
      });

      // Check for any approved requests (that imply an allowed extra attempt)
      // Simple logic: If approved requests count >= attempts count, they can take it?
      // Or simpler: If they have ANY approved request created AFTER their last attempt?
      // Let's go with: Allowed Attempts = 1 + Approved Requests

      const approvedRequests = await RetakeRequest.countDocuments({
        quiz_id: quiz._id,
        student_id: req.user._id,
        status: 'approved'
      });

      const pendingRequest = await RetakeRequest.findOne({
        quiz_id: quiz._id,
        student_id: req.user._id,
        status: 'pending'
      });

      // Allow unlimited attempts for Smart Practice quizzes
      const isSmartPractice = quiz.title.startsWith('Smart Practice');
      const maxAttempts = quiz.max_attempts || 1; // Default to 1
      const allowedAttempts = isSmartPractice ? Infinity : maxAttempts + approvedRequests;
      const canAttempt = isSmartPractice ? true : attemptsCount < allowedAttempts;

      return res.json({
        ...quiz.toObject(),
        questions: canAttempt ? await QuizQuestion.find({ quiz_id: quiz._id }).select('-correct_answer') : [], // Hide questions if blocked
        canAttempt,
        attemptsCount,
        maxAttempts,
        allowedAttempts,
        requestStatus: pendingRequest ? 'pending' : null
      });
    }

    // For teachers/admins, return everything
    const questions = await QuizQuestion.find({ quiz_id: quiz._id });
    res.json({ ...quiz.toObject(), questions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create quiz (teacher/admin)
router.post('/', authMiddleware, roleMiddleware('teacher', 'admin'), async (req, res) => {
  try {
    const { questions, ...quizData } = req.body;
    const quiz = new Quiz({
      ...quizData,
      teacher_id: req.user._id
    });
    await quiz.save();

    // Create questions
    if (questions && questions.length > 0) {
      const questionDocs = questions.map((q, index) => ({
        ...q,
        quiz_id: quiz._id,
        order_index: index
      }));
      await QuizQuestion.insertMany(questionDocs);
    }

    const createdQuestions = await QuizQuestion.find({ quiz_id: quiz._id });
    res.status(201).json({ ...quiz.toObject(), questions: createdQuestions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update quiz (teacher/admin)
router.put('/:id', authMiddleware, roleMiddleware('teacher', 'admin'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Teachers can only update their own quizzes
    if (req.user.role === 'teacher' && quiz.teacher_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { questions, ...quizData } = req.body;

    // Update quiz
    const updatedQuiz = await Quiz.findByIdAndUpdate(
      req.params.id,
      {
        ...quizData,
        status: 'pending', // Reset status to pending on update
        admin_feedback: '' // Clear feedback
      },
      { new: true }
    );

    // Update questions if provided
    if (questions) {
      await QuizQuestion.deleteMany({ quiz_id: req.params.id });
      if (questions.length > 0) {
        const questionDocs = questions.map((q, index) => ({
          ...q,
          quiz_id: req.params.id,
          order_index: index
        }));
        await QuizQuestion.insertMany(questionDocs);
      }
    }

    const updatedQuestions = await QuizQuestion.find({ quiz_id: req.params.id });
    res.json({ ...updatedQuiz.toObject(), questions: updatedQuestions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete quiz (teacher/admin/student with password)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Role-based Deletion Logic
    if (req.user.role === 'student') {
      const { password } = req.body;

      // 1. Verify Ownership (Must be their own smart practice quiz)
      if (quiz.teacher_id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Access denied. You can only delete your own practice quizzes.' });
      }

      // 2. Verify Password
      if (!password) {
        return res.status(400).json({ error: 'Password is required to confirm deletion.' });
      }

      // Fetch user with password
      const user = await User.findById(req.user._id).select('+password');
      const isMatch = await user.comparePassword(password);

      if (!isMatch) {
        return res.status(401).json({ error: 'Incorrect password. Deletion cancelled.' });
      }

    } else if (req.user.role === 'teacher') {
      // Teacher Logic (Existing)
      if (quiz.teacher_id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    // Admin can delete anything

    // Delete related data
    await QuizQuestion.deleteMany({ quiz_id: req.params.id });
    await QuizAttempt.deleteMany({ quiz_id: req.params.id });
    await Quiz.findByIdAndDelete(req.params.id);

    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit quiz (student)
router.post('/:id/submit', authMiddleware, roleMiddleware('student'), async (req, res) => {
  try {
    const { answers } = req.body;
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' }); // Added strict check

    // [CRITICAL] Enforce Retake Logic
    const attemptsCount = await QuizAttempt.countDocuments({
      quiz_id: quiz._id,
      student_id: req.user._id,
      status: 'completed'
    });

    const approvedRequests = await RetakeRequest.countDocuments({
      quiz_id: quiz._id,
      student_id: req.user._id,
      status: 'approved'
    });

    const isSmartPractice = quiz.title.startsWith('Smart Practice');
    // Default max_attempts to 1 if not set (for backward compatibility)
    const maxAttempts = quiz.max_attempts || 1;
    const allowedAttempts = isSmartPractice ? Infinity : maxAttempts + approvedRequests;

    if (attemptsCount >= allowedAttempts) {
      return res.status(403).json({
        error: 'Retake is not enabled or attempt limit reached.',
        details: { attempts: attemptsCount, allowed: allowedAttempts }
      });
    }

    const questions = await QuizQuestion.find({ quiz_id: req.params.id });

    // Create attempt
    const attempt = new QuizAttempt({
      quiz_id: req.params.id,
      student_id: req.user._id,
      status: 'in_progress'
    });
    await attempt.save();

    // Calculate score
    let totalScore = 0;
    let totalMarks = 0;

    for (const question of questions) {
      totalMarks += question.marks;
      const studentAnswer = answers[question._id.toString()] || '';

      const normalize = (str) => String(str).trim().toLowerCase().replace(/\s+/g, ' ');

      const normalizedStudent = normalize(studentAnswer);
      const normalizedCorrect = normalize(question.correct_answer);

      // Strict check for multiple choice (exact match expected usually simple like 'A', 'B')
      // For short answer, fuzzy matching is better handling
      let isCorrect = normalizedStudent === normalizedCorrect;
      let marksObtained = isCorrect ? question.marks : 0;
      let gradingMethod = 'exact_match';
      let gradingFeedback = '';
      let gradingBreakdown = { grammar: 0, clarity: 0, factual_accuracy: 0 };
      let aiScore = 0;

      // AI grading for long-form short answers (essay-like) when exact match fails
      const shouldUseAI =
        !isCorrect &&
        question.question_type === 'short_answer' &&
        typeof studentAnswer === 'string' &&
        studentAnswer.trim().length >= 60 &&
        !!process.env.GEMINI_API_KEY;

      if (shouldUseAI) {
        gradingMethod = 'ai';
        const rubric = `Grade based on factual accuracy, clarity, grammar, and relevance. Expected idea/answer: "${question.correct_answer}".`;

        const ai = await _gradeFreeResponseInternal({
          questionText: question.question_text,
          studentAnswer,
          rubric
        });

        aiScore = Number.isFinite(ai?.score) ? Math.max(0, Math.min(100, Math.round(ai.score))) : 0;
        const fraction = aiScore / 100;
        marksObtained = Math.round((question.marks * fraction) * 100) / 100;
        isCorrect = marksObtained >= question.marks;

        gradingFeedback = ai?.feedback ? String(ai.feedback) : '';
        gradingBreakdown = {
          grammar: Number.isFinite(ai?.grammar) ? Math.max(0, Math.min(100, Math.round(ai.grammar))) : 0,
          clarity: Number.isFinite(ai?.clarity) ? Math.max(0, Math.min(100, Math.round(ai.clarity))) : 0,
          factual_accuracy: Number.isFinite(ai?.factualAccuracy) ? Math.max(0, Math.min(100, Math.round(ai.factualAccuracy))) : 0
        };
      }

      // Debug log for troubleshooting (can be removed later)
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[Quiz Grade] Q: ${question.question_text}`);
        console.log(`  Student: "${normalizedStudent}" (raw: "${studentAnswer}")`);
        console.log(`  Correct: "${normalizedCorrect}" (raw: "${question.correct_answer}")`);
        console.log(`  Match: ${isCorrect}`);
      }

      totalScore += marksObtained;

      // Save answer
      const answer = new QuizAnswer({
        attempt_id: attempt._id,
        question_id: question._id,
        student_answer: studentAnswer,
        is_correct: isCorrect,
        marks_obtained: marksObtained,
        grading_method: gradingMethod,
        grading_feedback: gradingFeedback,
        grading_breakdown: gradingBreakdown,
        ai_score: aiScore
      });
      await answer.save();
    }

    const percentage = totalMarks > 0 ? (totalScore / totalMarks) * 100 : 0;

    // Update attempt
    attempt.score = totalScore;
    attempt.total_marks = totalMarks;
    attempt.percentage = percentage;
    attempt.status = 'completed';
    attempt.completed_at = Date.now();
    await attempt.save();

    // Update student stats
    let stats = await StudentStats.findOne({ student_id: req.user._id });
    if (!stats) {
      stats = new StudentStats({
        student_id: req.user._id,
        total_points: 0,
        current_level: 1,
        quizzes_completed: 0
      });
    }

    stats.total_points += Math.round(percentage * 2); // 2 points per percentage
    stats.quizzes_completed += 1;
    stats.current_level = Math.max(1, Math.floor(Math.sqrt(stats.total_points / 100)) + 1);
    await stats.save();

    // Emit leaderboard update
    const io = req.app.get('io');
    if (io) {
      io.emit('leaderboard_update');
    }

    res.json({
      score: totalScore,
      total_marks: totalMarks,
      percentage: percentage.toFixed(2)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get my attempts for a quiz (student)
router.get('/:id/my-attempts', authMiddleware, roleMiddleware('student'), async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({
      quiz_id: req.params.id,
      student_id: req.user._id
    }).sort({ created_at: -1 });

    res.json(attempts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get detailed attempt result (student) - New Endpoint for Result Page
router.get('/attempt/:id/details', authMiddleware, roleMiddleware('student'), async (req, res) => {
  try {
    const attempt = await QuizAttempt.findById(req.params.id)
      .populate('quiz_id')
      .populate('student_id', 'full_name');

    if (!attempt) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    // Verify it's the student's own attempt
    if (attempt.student_id._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all answers for this attempt
    const answers = await QuizAnswer.find({ attempt_id: attempt._id })
      .populate('question_id'); // Populate question details including correct answer and explanation

    // Transform to user-friendly format
    const detailedResults = answers.map(ans => {
      const q = ans.question_id;
      return {
        questionId: q._id,
        questionText: q.question_text,
        options: q.options,
        userAnswer: ans.student_answer,
        correctAnswer: q.correct_answer,
        isCorrect: ans.is_correct,
        marksObtained: ans.marks_obtained,
        gradingMethod: ans.grading_method,
        gradingFeedback: ans.grading_feedback,
        gradingBreakdown: ans.grading_breakdown,
        aiScore: ans.ai_score,
        explanation: q.explanation,
        subject: q.subject,
        focusArea: q.focus_area
      };
    });

    res.json({
      attempt: {
        score: attempt.score,
        totalMarks: attempt.total_marks,
        percentage: attempt.percentage,
        completedAt: attempt.completed_at
      },
      quizTitle: attempt.quiz_id.title,
      questions: detailedResults
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get quiz attempts (teacher and admin)
router.get('/:id/attempts', authMiddleware, roleMiddleware('teacher', 'admin'), async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Teachers can only view analytics for their own quizzes (Admins bypass this)
    if (req.user.role === 'teacher' && quiz.teacher_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const attempts = await QuizAttempt.find({ quiz_id: req.params.id })
      .populate('student_id', 'full_name email')
      .sort({ created_at: -1 });

    res.json(attempts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Smart Practice: Generate Adaptive Quiz
router.post('/smart-practice', authMiddleware, roleMiddleware('student'), async (req, res) => {
  try {
    const studentId = req.user._id;

    // 1. Fetch Exam Planner Data (Internal Assessment Marks)
    const assessments = await InternalAssessment.find({ student_id: studentId });

    if (!assessments || assessments.length === 0) {
      return res.status(400).json({
        error: 'No exam planner data found. Please add subjects in Exam Planner first.'
      });
    }

    // Parse focus_areas - handle comma-separated values
    const parseFocusAreas = (focusAreasString) => {
      if (!focusAreasString || typeof focusAreasString !== 'string') return [];
      return focusAreasString.split(',').map(area => area.trim()).filter(area => area.length > 0);
    };

    const examPlannerData = assessments.map(a => ({
      subject: a.subject_name,
      marks: a.internal_marks_obtained,
      totalMarks: a.total_internal_marks,
      focusAreas: parseFocusAreas(a.focus_areas)
    }));

    // 2. Fetch Previous Quiz Analytics (Last 5 attempts)
    const attempts = await QuizAttempt.find({ student_id: studentId })
      .sort({ created_at: -1 })
      .limit(5)
      .populate('quiz_id');

    // Extract subject-wise accuracy and incorrect focus areas from previous attempts
    const subjectAccuracy = {};
    const weakFocusAreas = {};
    const allSubjects = new Set(examPlannerData.map(e => e.subject));

    // Initialize subject tracking
    allSubjects.forEach(subject => {
      subjectAccuracy[subject] = { correct: 0, total: 0 };
      weakFocusAreas[subject] = [];
    });

    // Analyze previous quiz attempts
    for (const attempt of attempts) {
      if (attempt.status !== 'completed') continue;

      try {
        // Get all answers for this attempt
        const answers = await QuizAnswer.find({ attempt_id: attempt._id })
          .populate({
            path: 'question_id',
            select: 'subject focus_area'
          });

        for (const answer of answers) {
          const question = answer.question_id;
          if (!question || !question.subject) continue;

          // Find matching subject (case-insensitive)
          const matchingSubject = [...allSubjects].find(s =>
            s.toLowerCase() === question.subject.toLowerCase()
          );

          if (matchingSubject) {
            subjectAccuracy[matchingSubject].total++;
            if (answer.is_correct) {
              subjectAccuracy[matchingSubject].correct++;
            } else {
              // Track incorrect focus areas
              if (question.focus_area) {
                const focusArea = String(question.focus_area).trim();
                if (focusArea && !weakFocusAreas[matchingSubject].includes(focusArea)) {
                  weakFocusAreas[matchingSubject].push(focusArea);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error analyzing attempt ${attempt._id}:`, error);
        // Continue with other attempts
      }
    }

    // Calculate subject-wise accuracy percentages, repeated mistakes, and unanswered counts
    const subjectAccuracyPercentages = {};
    const repeatedMistakes = {};
    let totalUnanswered = 0;
    let totalQuestionsAttempted = 0;
    let totalCorrect = 0;

    Object.keys(subjectAccuracy).forEach(subject => {
      const { correct, total } = subjectAccuracy[subject];
      if (total > 0) {
        subjectAccuracyPercentages[subject] = Math.round((correct / total) * 100);
        totalQuestionsAttempted += total;
        totalCorrect += correct;
      } else {
        subjectAccuracyPercentages[subject] = null; // No data
      }
    });

    // Count repeated weak focus areas
    Object.keys(weakFocusAreas).forEach(subject => {
      repeatedMistakes[subject] = weakFocusAreas[subject];
    });

    // Calculate aggregate performance score across past attempts and internal assessments
    const overallQuizAvg = totalQuestionsAttempted > 0 ? (totalCorrect / totalQuestionsAttempted) * 100 : null;
    
    // Internal marks average
    const totalInternalMarks = examPlannerData.reduce((sum, e) => sum + (e.marks || 0), 0);
    const totalMaxInternal = examPlannerData.reduce((sum, e) => sum + (e.totalMarks || 100), 0);
    const internalMarksAvg = totalMaxInternal > 0 ? (totalInternalMarks / totalMaxInternal) * 100 : 50;

    // Combined performance benchmark: 60% Quiz history + 40% Internal Marks (or 100% internal if no quizzes)
    const compositeScore = overallQuizAvg !== null 
      ? Math.round(overallQuizAvg * 0.6 + internalMarksAvg * 0.4) 
      : Math.round(internalMarksAvg);

    // Explicit difficulty tier based on the rules:
    // BEGINNER: < 60%
    // INTERMEDIATE: 60% - 85%
    // EXPERT: > 85%
    let calculatedDifficultyTier = 'intermediate';
    if (compositeScore < 60) {
      calculatedDifficultyTier = 'beginner';
    } else if (compositeScore > 85) {
      calculatedDifficultyTier = 'expert';
    }

    // Determine overall performance trend
    let overallPerformance = 'average';
    if (attempts.length >= 2) {
      const recent = attempts.slice(0, Math.min(2, attempts.length)).map(a => a.percentage || 0);
      const older = attempts.slice(2, Math.min(4, attempts.length)).map(a => a.percentage || 0);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : recentAvg;

      if (recentAvg > olderAvg + 5) {
        overallPerformance = 'improving';
      } else if (recentAvg < olderAvg - 5) {
        overallPerformance = 'declining';
      } else {
        overallPerformance = 'stagnant';
      }
    } else if (attempts.length === 1) {
      overallPerformance = 'average';
    } else {
      overallPerformance = 'no_history';
    }

    // Format previousQuizRemarks with detailed multi-dimensional analytics
    const previousQuizRemarks = {
      overallPerformance,
      compositeScore,
      difficultyTier: calculatedDifficultyTier,
      subjectAccuracy: subjectAccuracyPercentages,
      weakFocusAreas,
      repeatedMistakes,
      attemptsCount: attempts.length,
      highPerformanceMode: calculatedDifficultyTier === 'expert' || (attempts.length > 0 && (attempts[0].percentage || 0) > 85)
    };

    const contextData = {
      examPlanner: examPlannerData,
      previousQuizRemarks: previousQuizRemarks
    };

    // Validate context data before sending to AI
    if (!examPlannerData || examPlannerData.length === 0) {
      throw new Error('No exam planner data available for quiz generation');
    }

    console.log('Preparing to generate quiz:', {
      subjects: examPlannerData.map(e => e.subject),
      totalSubjects: examPlannerData.length,
      previousAttempts: previousQuizRemarks.overallPerformance
    });

    // 3. Generate Quiz using AI
    const aiResult = await generateQuiz(contextData);

    if (!aiResult || !aiResult.quiz || !Array.isArray(aiResult.quiz)) {
      throw new Error('Invalid AI response structure: missing or invalid quiz array');
    }

    if (!aiResult.remarks || typeof aiResult.remarks !== 'object') {
      throw new Error('Invalid AI response structure: missing remarks object');
    }

    // Validate quiz has exactly 25 questions
    if (aiResult.quiz.length !== 25) {
      console.error(`Error: AI generated ${aiResult.quiz.length} questions, expected exactly 25`);
      throw new Error(`Quiz must contain exactly 25 questions, but received ${aiResult.quiz.length}`);
    }

    // Comprehensive Question Validation & Sanitization Layer
    const seenQuestions = new Set();
    const validatedQuiz = [];

    for (let idx = 0; idx < aiResult.quiz.length; idx++) {
      const q = aiResult.quiz[idx];

      if (!q.question || typeof q.question !== 'string' || q.question.trim().length < 5) {
        throw new Error(`Question ${idx + 1} is missing or has invalid question text`);
      }

      const normalizedQText = q.question.trim().toLowerCase();
      if (seenQuestions.has(normalizedQText)) {
        console.warn(`Duplicate question detected at index ${idx + 1}, skipping duplicate`);
        continue;
      }
      seenQuestions.add(normalizedQText);

      if (!q.options || !Array.isArray(q.options) || q.options.length !== 4) {
        throw new Error(`Question ${idx + 1} must have exactly 4 options as an array`);
      }

      // Ensure all 4 options are distinct strings
      const trimmedOptions = q.options.map(opt => String(opt || '').trim());
      const uniqueOptions = new Set(trimmedOptions.map(o => o.toLowerCase()));
      if (uniqueOptions.size !== 4) {
        throw new Error(`Question ${idx + 1} contains duplicate options`);
      }

      if (!q.correctAnswer || typeof q.correctAnswer !== 'string') {
        throw new Error(`Question ${idx + 1} is missing or invalid correctAnswer`);
      }

      if (!q.subject || typeof q.subject !== 'string') {
        throw new Error(`Question ${idx + 1} is missing or invalid subject`);
      }

      // Validate subject matches exam planner (case-insensitive comparison)
      const matchingSubject = examPlannerData.find(e =>
        e.subject.toLowerCase() === q.subject.toLowerCase()
      );
      if (!matchingSubject) {
        throw new Error(`Question ${idx + 1} has subject "${q.subject}" which is not in Exam Planner. Available subjects: ${examPlannerData.map(e => e.subject).join(', ')}`);
      }
      q.subject = matchingSubject.subject; // Use exact case from exam planner

      // Ensure explanation exists
      if (!q.explanation || typeof q.explanation !== 'string' || q.explanation.trim().length === 0) {
        q.explanation = `Correct answer is ${q.correctAnswer} based on ${q.subject} principles.`;
      }

      // Validate difficulty
      if (q.difficulty && !['easy', 'medium', 'hard'].includes(q.difficulty.toLowerCase())) {
        q.difficulty = calculatedDifficultyTier === 'expert' ? 'hard' : calculatedDifficultyTier === 'beginner' ? 'easy' : 'medium';
      } else if (!q.difficulty) {
        q.difficulty = calculatedDifficultyTier === 'expert' ? 'hard' : calculatedDifficultyTier === 'beginner' ? 'easy' : 'medium';
      }

      validatedQuiz.push(q);
    }

    if (validatedQuiz.length < 20) {
      throw new Error(`Quiz validation failed: only ${validatedQuiz.length} valid unique questions generated`);
    }

    aiResult.quiz = validatedQuiz;

    // 4. Save Generated Quiz to DB
    const quizTitle = `Smart Practice - ${new Date().toLocaleDateString()}`;

    const newQuiz = new Quiz({
      title: quizTitle,
      teacher_id: studentId,
      description: "AI-Generated Adaptive Quiz based on your Exam Planner performance.",
      class_number: "N/A",
      subject_name: "General",
      total_marks: aiResult.quiz.length * 1,
      time_limit: 30,
      is_active: true
    });

    await newQuiz.save();

    // Save Questions with subject, focusArea, difficulty, and explanation
    const questionDocs = aiResult.quiz.map((q, index) => {
      // Convert options array to object format for MongoDB Map
      let optionsObj = {};
      if (Array.isArray(q.options) && q.options.length === 4) {
        q.options.forEach((opt, idx) => {
          const key = String.fromCharCode(65 + idx); // A, B, C, D
          optionsObj[key] = String(opt).trim();
        });
      } else {
        throw new Error(`Question ${index + 1} has invalid options format`);
      }

      // Normalize correctAnswer - it might be "Option A" or just "A" or the full text
      let normalizedCorrectAnswer = String(q.correctAnswer).trim();

      // If it's like "Option A", extract "A"
      if (normalizedCorrectAnswer.startsWith('Option ')) {
        normalizedCorrectAnswer = normalizedCorrectAnswer.replace('Option ', '').trim();
      }

      // If it's a letter (A, B, C, D), use it directly
      // If it's the full option text, find the matching key
      if (['A', 'B', 'C', 'D'].includes(normalizedCorrectAnswer.toUpperCase())) {
        normalizedCorrectAnswer = normalizedCorrectAnswer.toUpperCase();
      } else {
        // Try to match by text content
        const matchingKey = Object.keys(optionsObj).find(key =>
          optionsObj[key].toLowerCase() === normalizedCorrectAnswer.toLowerCase()
        );
        if (matchingKey) {
          normalizedCorrectAnswer = matchingKey;
        } else {
          // Default to first option if no match found
          console.warn(`Question ${index + 1}: Could not match correctAnswer "${q.correctAnswer}", defaulting to "A"`);
          normalizedCorrectAnswer = 'A';
        }
      }

      return {
        quiz_id: newQuiz._id,
        question_text: String(q.question).trim(),
        options: optionsObj,
        correct_answer: normalizedCorrectAnswer,
        marks: 1,
        order_index: index,
        subject: String(q.subject).trim(),
        focus_area: q.focusArea ? String(q.focusArea).trim() : null,
        difficulty: q.difficulty || 'medium',
        explanation: q.explanation ? String(q.explanation).trim() : null
      };
    });

    await QuizQuestion.insertMany(questionDocs);

    // Verify all subjects are represented
    const subjectsInQuiz = new Set(questionDocs.map(q => q.subject));
    const subjectsInPlanner = new Set(examPlannerData.map(e => e.subject));
    const missingSubjects = [...subjectsInPlanner].filter(s => !subjectsInQuiz.has(s));

    if (missingSubjects.length > 0) {
      console.warn(`Warning: The following subjects from Exam Planner are not represented in the quiz: ${missingSubjects.join(', ')}`);
    }

    res.json({
      quizId: newQuiz._id,
      totalQuestions: questionDocs.length,
      remarks: aiResult.remarks
    });

  } catch (error) {
    console.error('Smart Practice Generation Error:', {
      message: error.message,
      stack: error.stack,
      studentId: req.user?._id
    });

    // Provide user-friendly error messages
    let errorMessage = error.message || 'Server error';
    let statusCode = 500;

    // Handle specific error types
    if (error.message.includes('GEMINI_API_KEY')) {
      errorMessage = 'AI service configuration error. Please contact administrator.';
      statusCode = 500;
    } else if (error.message.includes('No exam planner data')) {
      errorMessage = error.message;
      statusCode = 400;
    } else if (error.message.includes('exactly 25 questions')) {
      errorMessage = 'Quiz generation failed: Invalid question count. Please try again.';
      statusCode = 500;
    } else if (error.message.includes('parse') || error.message.includes('JSON')) {
      errorMessage = 'Quiz generation failed: Invalid response format. Please try again.';
      statusCode = 500;
    } else if (error.message.includes('API')) {
      errorMessage = `AI service error: ${error.message}`;
      statusCode = 500;
    }

    res.status(statusCode).json({ error: errorMessage });
  }
});

module.exports = router;

