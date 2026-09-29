const express = require('express');
const Challenge = require('../models/Challenge');
const ChallengeSubmission = require('../models/ChallengeSubmission');
const StudentStats = require('../models/StudentStats');
const User = require('../models/User');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get challenges
router.get('/', authMiddleware, async (req, res) => {
  try {
    let query = {};

    // Filter by class number if provided
    if (req.query.classNumber) {
      query.class_number = req.query.classNumber;
    }

    // Teachers only see their own challenges
    if (req.user.role === 'teacher') {
      query.teacher_id = req.user._id;
    }

    // Students only see global challenges OR challenges from their institution
    if (req.user.role === 'student') {
      const User = require('../models/User');

      // Find teachers in the same institution
      // If institution_id is missing, they only see global challenges
      let teacherIds = [];
      if (req.user.institution_id) {
        const teachers = await User.find({
          role: 'teacher',
          institution_id: req.user.institution_id
        }).select('_id');
        teacherIds = teachers.map(t => t._id);
      }

      // Allow global challenges OR institution challenges matching student's semester/class
      const userClass = req.user.standard || req.user.semester;
      let classQuery = {};
      if (userClass) {
        const s = String(userClass);
        classQuery = {
          $or: [
            { class_number: { $exists: false } },
            { class_number: null },
            { class_number: '' },
            { class_number: { $regex: new RegExp(`^(Sem|Semester|Standard|Grade)?\\s*${s}$`, 'i') } }
          ]
        };
      }

      query.$and = [
        {
          $or: [
            { is_global: true },
            { teacher_id: { $in: teacherIds } }
          ]
        },
        classQuery
      ];
    }

    const challenges = await Challenge.find(query)
      .populate('teacher_id', 'full_name')
      .sort({ created_at: -1 })
      .lean();

    // Aggregate stats for each challenge
    const challengesWithStats = await Promise.all(challenges.map(async (challenge) => {
      const submissionCount = await ChallengeSubmission.countDocuments({
        challenge_id: challenge._id,
        status: { $ne: 'rejected' } // Count approved and pending
      });

      const approvedCount = await ChallengeSubmission.countDocuments({
        challenge_id: challenge._id,
        status: 'approved'
      });

      // Calculate total potential students
      let totalStudents = 0;
      if (challenge.class_number) {
        totalStudents = await User.countDocuments({ role: 'student', class_number: challenge.class_number });
      } else {
        totalStudents = await User.countDocuments({ role: 'student' });
      }

      const completionRate = totalStudents > 0 ? Math.round((approvedCount / totalStudents) * 100) : 0;

      return {
        ...challenge,
        stats: {
          submissions: submissionCount,
          approved: approvedCount,
          completionRate: completionRate
        }
      };
    }));

    res.json(challengesWithStats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single challenge
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    let result = challenge.toObject();

    // If student, check for submission
    if (req.user.role === 'student') {
      const submission = await ChallengeSubmission.findOne({
        challenge_id: req.params.id,
        student_id: req.user._id
      });

      if (submission) {
        result.my_submission = submission;
      }
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create challenge (teacher/admin)
router.post('/', authMiddleware, roleMiddleware('teacher', 'admin'), async (req, res) => {
  try {
    const challenge = new Challenge({
      ...req.body,
      teacher_id: req.user.role === 'teacher' ? req.user._id : req.body.teacher_id
    });
    await challenge.save();
    res.status(201).json(challenge);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update challenge (teacher/admin)
router.put('/:id', authMiddleware, roleMiddleware('teacher', 'admin'), async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Teachers can only update their own challenges
    if (req.user.role === 'teacher' && challenge.teacher_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updatedChallenge = await Challenge.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        status: 'pending', // Reset status to pending on update
        admin_feedback: '' // Clear feedback
      },
      { new: true }
    );

    res.json(updatedChallenge);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete challenge (teacher/admin)
router.delete('/:id', authMiddleware, roleMiddleware('teacher', 'admin'), async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Teachers can only delete their own challenges
    if (req.user.role === 'teacher' && challenge.teacher_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete related submissions
    await ChallengeSubmission.deleteMany({ challenge_id: req.params.id });
    await Challenge.findByIdAndDelete(req.params.id);

    res.json({ message: 'Challenge deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Submit challenge (student)
// Submit challenge (student)
router.post('/:id/submit', authMiddleware, roleMiddleware('student'), async (req, res) => {
  try {
    console.log(`[DEBUG] POST /challenges/:id/submit - User ${req.user._id} submitting challenge ${req.params.id}`);
    let submission = await ChallengeSubmission.findOne({
      challenge_id: req.params.id,
      student_id: req.user._id
    });

    if (submission) {
      console.log(`[DEBUG] Found existing submission ${submission._id} status ${submission.status} retake ${submission.retake_status}`);
      if (submission.status === 'approved') {
        if (submission.retake_status !== 'approved') {
          console.log(`[DEBUG] Blocked submission: Retake permission required`);
          return res.status(403).json({ error: 'You need permission to retake this challenge' });
        }
        // Reset for retake
        submission.status = 'pending';
        submission.retake_status = 'none';
        submission.submission_text = req.body.submission_text;
        submission.submission_media = req.body.submission_media || [];
        submission.submitted_at = Date.now();
      } else if (submission.status === 'pending') {
        // Update pending submission
        submission.submission_text = req.body.submission_text;
        submission.submission_media = req.body.submission_media || [];
        submission.submitted_at = Date.now();
      } else {
        // Rejected - allow resubmit without retake permission? 
        // Usually rejected means "try again", so allow.
        submission.status = 'pending';
        submission.submission_text = req.body.submission_text;
        submission.submission_media = req.body.submission_media || [];
        submission.submitted_at = Date.now();
      }
    } else {
      console.log(`[DEBUG] Creating new submission`);
      submission = new ChallengeSubmission({
        challenge_id: req.params.id,
        student_id: req.user._id,
        submission_text: req.body.submission_text,
        submission_media: req.body.submission_media || [],
        status: 'pending'
      });
    }

    await submission.save();
    res.status(201).json(submission);
  } catch (error) {
    console.error(`[DEBUG] Error in POST /submit:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Request retake (student)
router.post('/:id/request-retake', authMiddleware, roleMiddleware('student'), async (req, res) => {
  try {
    const submission = await ChallengeSubmission.findOne({
      challenge_id: req.params.id,
      student_id: req.user._id
    });

    if (!submission) {
      return res.status(404).json({ error: 'No submission found to retake' });
    }

    if (submission.status !== 'approved') {
      return res.status(400).json({ error: 'Can only retake approved challenges' });
    }

    if (submission.retake_status === 'pending') {
      return res.status(400).json({ error: 'Retake request already pending' });
    }

    submission.retake_status = 'pending';
    await submission.save();
    res.json(submission);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Grade submission (teacher)
router.post('/submission/:id/grade', authMiddleware, roleMiddleware('teacher'), async (req, res) => {
  try {
    const { status, points } = req.body;
    const submission = await ChallengeSubmission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (status === 'approved') {
      const newPoints = parseInt(points);
      const currentHighest = submission.highest_points || 0;

      // Calculate delta for student stats (only add if we beat the previous high score)
      let pointsToAdd = 0;
      if (newPoints > currentHighest) {
        pointsToAdd = newPoints - currentHighest;
        submission.highest_points = newPoints;
      }

      submission.points_awarded = newPoints;
      submission.status = 'approved';
      submission.reviewed_at = Date.now();
      submission.reviewed_by = req.user._id;

      if (pointsToAdd > 0) {
        let stats = await StudentStats.findOne({ student_id: submission.student_id });
        if (!stats) {
          stats = new StudentStats({
            student_id: submission.student_id,
            total_points: 0,
            current_level: 1,
            challenges_completed: 0
          });
        }

        stats.total_points += pointsToAdd;

        // Update completions count correctly
        // Only increment if this challenge wasn't previously counted? 
        // For simplicity, if we are adding points (meaning higher score or first time), we assume it counts as a completion interaction.
        // But duplicative logic for "challenges_completed" is tricky with retakes.
        // Let's assume if pointsToAdd > 0, it's a meaningful progress.
        // Actually, better to check if it was previously approved from submission history?
        // Simpler check: If currentHighest was 0, it's a new completion.
        if (currentHighest === 0) {
          stats.challenges_completed += 1;
        }

        stats.current_level = Math.max(1, Math.floor(Math.sqrt(stats.total_points / 100)) + 1);

        // Update Academic Impact Score
        // Get the challenge correctly to find its academic_impact_value
        const challenge = await Challenge.findById(submission.challenge_id);
        if (challenge) {
          stats.academic_impact_score = (stats.academic_impact_score || 0) + (challenge.academic_impact_value || 5);
        }

        await stats.save();

      } else if (currentHighest === 0 && newPoints > 0) {
        // Case where points didn't increase above highest (impossible if highest was 0 and new > 0, covered above)
        // This block handles edge cases or logic fallthrough, but the above block covers the main point addition.
        // If pointsToAdd == 0 but it's first time approved with 0 points? (Rare/Useless).
        // Let's just focus on the pointsToAdd > 0 block which covers "First time getting points" and "Improving score".
      }
    } else {
      submission.status = status; // rejected
      submission.reviewed_at = Date.now();
      submission.reviewed_by = req.user._id;
    }

    await submission.save();
    res.json(submission);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get retake requests (Teacher)
router.get('/teacher/requests', authMiddleware, roleMiddleware('teacher'), async (req, res) => {
  try {
    const ChallengeSubmission = require('../models/ChallengeSubmission');
    // Find submissions with pending retake status where the challenge belongs to this teacher
    // We need to filter by teacher's challenges first or populate and filter

    // Efficient way: Find all challenges by this teacher first
    const challenges = await Challenge.find({ teacher_id: req.user._id }).select('_id');
    const challengeIds = challenges.map(c => c._id);

    const requests = await ChallengeSubmission.find({
      challenge_id: { $in: challengeIds },
      retake_status: 'pending'
    })
      .populate('student_id', 'full_name email')
      .populate('challenge_id', 'title')
      .sort({ updated_at: -1 }); // Assuming updated_at changes when status changes

    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handle retake request (teacher)
router.post('/submission/:id/handle-retake', authMiddleware, roleMiddleware('teacher'), async (req, res) => {
  try {
    const { status } = req.body; // approved or rejected
    const submission = await ChallengeSubmission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    submission.retake_status = status;
    await submission.save();
    res.json(submission);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
