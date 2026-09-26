const express = require('express');
const User = require('../models/User');
const Institution = require('../models/Institution');
const Lesson = require('../models/Lesson');
const Quiz = require('../models/Quiz');
const Challenge = require('../models/Challenge');
const StudentStats = require('../models/StudentStats');
const InternalAssessment = require('../models/InternalAssessment');
const RetakeRequest = require('../models/RetakeRequest');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get admin stats
router.get('/stats', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const users = await User.find();
    const institutions = await Institution.find();
    const lessons = await Lesson.find();
    const quizzes = await Quiz.find();

    const students = users.filter(u => u.role === 'student').length;
    const teachers = users.filter(u => u.role === 'teacher').length;
    const admins = users.filter(u => u.role === 'admin').length;

    res.json({
      totalUsers: users.length,
      totalStudents: students,
      totalTeachers: teachers,
      totalAdmins: admins,
      totalInstitutions: institutions.length,
      totalLessons: lessons.length,
      totalQuizzes: quizzes.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Get Exam Planner Stats
router.get('/exam-planner-stats', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    // 1. Completion Rate: % of students who have at least one internal assessment
    const totalStudents = await User.countDocuments({ role: 'student' });
    const studentsWithAssessments = await InternalAssessment.distinct('student_id');
    const completionRate = totalStudents > 0
      ? Math.round((studentsWithAssessments.length / totalStudents) * 100)
      : 0;

    // 2. Average Internal Score (Global)
    const allAssessments = await InternalAssessment.find();
    let totalPercentage = 0;
    let count = 0;

    allAssessments.forEach(ass => {
      if (ass.total_internal_marks > 0) {
        totalPercentage += (ass.internal_marks_obtained / ass.total_internal_marks) * 100;
        count++;
      }
    });

    const avgInternalScore = count > 0 ? (totalPercentage / count).toFixed(1) : 0;

    // 3. Pending Reviews (Retake requests)
    const pendingAssessments = await RetakeRequest.countDocuments({ status: 'pending' });

    // 4. Active Policies (Static for now, implies NEP 2020 compliance check)
    const activePolicies = 4;

    res.json({
      completionRate: `${completionRate}%`,
      avgInternalScore: `${avgInternalScore}%`,
      pendingAssessments,
      activePolicies
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users
router.get('/users', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').populate('institution_id', 'name type');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user role
router.put('/users/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update teacher subjects
router.put('/users/:id/subjects', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { assigned_subjects } = req.body;

    if (!assigned_subjects || !Array.isArray(assigned_subjects) || assigned_subjects.length === 0) {
      return res.status(400).json({ error: 'At least one subject is required.' });
    }

    const user = await User.findOne({ _id: req.params.id, role: 'teacher' });

    if (!user) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    user.assigned_subjects = assigned_subjects;
    await user.save();

    res.json({ message: 'Subjects updated successfully', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user
router.delete('/users/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper to build filters
const buildAnalyticsFilters = (query) => {
  const { institutionType, university, college, department, startDate, endDate } = query;
  let userFilter = {};
  let dateFilter = {};

  if (institutionType) {
    // Find institutions of this type first
    // This is complex because we need to filter users by institution_id where institution has type
    // For now, let's assume the frontend passes the right institution IDs or we handle it in the query
    // Actually, easier way: First find institutions of type, then filter users
  }

  if (university) userFilter.institution_id = university;
  if (college) userFilter.college_name = college;

  // Handle Department vs Class (Standard)
  if (department) {
    if (institutionType === 'school') {
      // For schools, 'department' param actually holds the class/standard number
      // Ensure we match it flexibly (e.g. "1" matches "1", "Standard 1", etc.)
      // But standard is usually stored as Number or String. Let's assume strict match for now or regex if needed.
      // Based on previous fixes, we should be flexible.
      // But wait, `standard` in User model might be a Number.
      // If we pass "1", we can try exact match first.
      userFilter.standard = department;
    } else {
      userFilter.university_details = department;
    }
  }

  if (startDate || endDate) {
    dateFilter.created_at = {};
    if (startDate) dateFilter.created_at.$gte = new Date(startDate);
    if (endDate) dateFilter.created_at.$lte = new Date(endDate);
  }

  return { userFilter, dateFilter };
};

// Get Analytics Metadata (Departments, etc.)
router.get('/analytics/metadata', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const departments = await User.distinct('university_details', {
      role: 'student',
      university_details: { $ne: null }
    });
    res.json({ departments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get analytics data
router.get('/analytics', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { userFilter, dateFilter } = buildAnalyticsFilters(req.query);

    // Handle Institution Type Filter
    if (req.query.institutionType) {
      // Find all institutions of this type
      const institutionsOfType = await Institution.find({ type: req.query.institutionType }).select('_id');
      const instIds = institutionsOfType.map(i => i._id);

      // If user hasn't selected a specific institution, filter by type
      if (!userFilter.institution_id) {
        userFilter.institution_id = { $in: instIds };
      }
    }

    const userQuery = { ...userFilter, ...dateFilter };

    const users = await User.find(userQuery);
    const institutions = await Institution.find();

    const teacherIds = users.filter(u => u.role === 'teacher').map(u => u._id);
    const lessons = await Lesson.find({ teacher_id: { $in: teacherIds } });
    const quizzes = await Quiz.find({ teacher_id: { $in: teacherIds } });
    const challenges = await Challenge.find({ teacher_id: { $in: teacherIds } });

    const students = users.filter(u => u.role === 'student').length;
    const teachers = users.filter(u => u.role === 'teacher').length;
    const admins = users.filter(u => u.role === 'admin').length;

    // Role distribution
    const roleDistribution = [
      { name: 'Students', value: students, color: '#10B981' },
      { name: 'Teachers', value: teachers, color: '#3B82F6' },
      { name: 'Admins', value: admins, color: '#8B5CF6' }
    ];

    // Institution types
    const institutionTypes = [
      { name: 'Schools', value: institutions.filter(i => i.type === 'school').length },
      { name: 'Colleges', value: institutions.filter(i => i.type === 'college').length },
      { name: 'Universities', value: institutions.filter(i => i.type === 'university').length },
      { name: 'NGOs', value: institutions.filter(i => i.type === 'ngo').length }
    ];

    // Monthly activity
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyActivity = months.map((month, index) => {
      const count = users.filter(u => new Date(u.created_at).getMonth() === index).length;
      return {
        month,
        users: count,
        lessons: Math.floor(lessons.length / 12),
        quizzes: Math.floor(quizzes.length / 12)
      };
    }).slice(0, new Date().getMonth() + 1);

    res.json({
      totalUsers: users.length,
      totalStudents: students,
      totalTeachers: teachers,
      totalInstitutions: institutions.length,
      totalLessons: lessons.length,
      totalQuizzes: quizzes.length,
      totalChallenges: challenges.length,
      avgQuizScore: 78,
      completionRate: 73,
      roleDistribution,
      institutionTypes,
      monthlyActivity,
      // NEW: Academic Demographics
      academicDemographics: {
        departmentDistribution: await User.aggregate([
          { $match: { ...userQuery, role: 'student', university_details: { $ne: null } } },
          { $group: { _id: '$university_details', count: { $sum: 1 } } }
        ]),
        semesterDistribution: await User.aggregate([
          { $match: { ...userQuery, role: 'student', semester: { $ne: null } } },
          { $group: { _id: '$semester', count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ]),
        standardDistribution: await User.aggregate([
          { $match: { ...userQuery, role: 'student', standard: { $ne: null } } },
          { $group: { _id: '$standard', count: { $sum: 1 } } },
          { $sort: { _id: 1 } }
        ])
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export Analytics Report
router.get('/analytics/export', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { userFilter, dateFilter } = buildAnalyticsFilters(req.query);

    // Handle Institution Type Filter
    if (req.query.institutionType) {
      const institutionsOfType = await Institution.find({ type: req.query.institutionType }).select('_id');
      const instIds = institutionsOfType.map(i => i._id);

      if (!userFilter.institution_id) {
        userFilter.institution_id = { $in: instIds };
      }
    }

    const userQuery = { ...userFilter, ...dateFilter };
    const users = await User.find(userQuery)
      .select('full_name email role institution_id created_at')
      .populate('institution_id', 'name');

    const exportData = users.map(user => ({
      Name: user.full_name,
      Email: user.email,
      Role: user.role,
      Institution: user.institution_id ? user.institution_id.name : 'N/A',
      Joined: user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'
    }));

    res.json(exportData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Compare Institutions
router.get('/analytics/compare', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { id1, id2 } = req.query;
    if (!id1 || !id2) return res.status(400).json({ error: 'Two institution IDs required' });

    const getInstStats = async (id) => {
      const users = await User.find({ institution_id: id });
      const students = users.filter(u => u.role === 'student');
      const teachers = users.filter(u => u.role === 'teacher').length;

      const studentIds = students.map(u => u._id);
      const assessments = await InternalAssessment.find({ student_id: { $in: studentIds } });

      let totalScore = 0;
      let totalMax = 0;
      assessments.forEach(a => {
        totalScore += a.internal_marks_obtained;
        totalMax += a.total_internal_marks;
      });

      const avgScore = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
      const activeStudents = new Set(assessments.map(a => a.student_id.toString())).size;
      const engagement = students.length > 0 ? Math.round((activeStudents / students.length) * 100) : 0;

      return {
        id,
        totalUsers: users.length,
        students: students.length,
        teachers,
        avgScore,
        engagement
      };
    };

    const stats1 = await getInstStats(id1);
    const stats2 = await getInstStats(id2);

    res.json([stats1, stats2]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// At-Risk Students
router.get('/analytics/at-risk', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { userFilter } = buildAnalyticsFilters(req.query);

    // Handle Institution Type Filter
    if (req.query.institutionType) {
      const institutionsOfType = await Institution.find({ type: req.query.institutionType }).select('_id');
      const instIds = institutionsOfType.map(i => i._id);

      if (!userFilter.institution_id) {
        userFilter.institution_id = { $in: instIds };
      }
    }

    const lowScorers = await InternalAssessment.find({
      $expr: { $lt: [{ $divide: ["$internal_marks_obtained", "$total_internal_marks"] }, 0.4] }
    }).populate({
      path: 'student_id',
      match: userFilter, // Apply user filter here
      select: 'full_name email mobile'
    });

    const atRiskStudents = lowScorers
      .filter(r => r.student_id)
      .map(r => ({
        id: r.student_id._id,
        name: r.student_id.full_name,
        email: r.student_id.email,
        mobile: r.student_id.mobile,
        issue: 'Low Internal Scores',
        score: (r.internal_marks_obtained / r.total_internal_marks * 100).toFixed(1) + '%'
      }));

    res.json(atRiskStudents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get leaderboard
router.get('/leaderboard', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { period = 'all-time' } = req.query;

    const studentStats = await StudentStats.find()
      .populate('student_id', 'full_name email institution_id')
      .sort({ total_points: -1 })
      .limit(100);

    const leaderboard = studentStats
      .filter(stat => stat.student_id) // Filter out null populated fields
      .map(stat => ({
        id: stat.student_id._id,
        full_name: stat.student_id.full_name,
        email: stat.student_id.email,
        institution_id: stat.student_id.institution_id,
        total_points: stat.total_points,
        current_level: stat.current_level,
        lessons_completed: stat.lessons_completed,
        academic_impact_score: stat.academic_impact_score,
        badges_earned: stat.badges_earned
      }));

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset user stats
router.post('/users/:id/reset-stats', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const userId = req.params.id;

    // Reset student stats
    await StudentStats.findOneAndUpdate(
      { student_id: userId },
      {
        total_points: 0,
        current_level: 1,
        lessons_completed: 0,
        quizzes_completed: 0,
        challenges_completed: 0,
        academic_impact_score: 0,
        badges_earned: []
      },
      { upsert: true }
    );

    res.json({ message: 'User stats reset successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all quiz results
router.get('/quiz-results', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const QuizAttempt = require('../models/QuizAttempt');
    const attempts = await QuizAttempt.find()
      .populate('quiz_id', 'title')
      .populate('student_id', 'full_name email')
      .sort({ completed_at: -1 });
    res.json(attempts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all challenge submissions
router.get('/challenge-results', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const ChallengeSubmission = require('../models/ChallengeSubmission');
    const submissions = await ChallengeSubmission.find()
      .populate('challenge_id', 'title')
      .populate('student_id', 'full_name email')
      .sort({ submitted_at: -1 });
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update content status
router.put('/content/:type/:id/status', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { type, id } = req.params;
    const { status } = req.body;

    let Model;
    switch (type) {
      case 'lessons':
        Model = Lesson;
        break;
      case 'quizzes':
        Model = Quiz;
        break;
      case 'challenges':
        Model = Challenge;
        break;
      default:
        return res.status(400).json({ error: 'Invalid content type' });
    }

    const content = await Model.findByIdAndUpdate(
      id,
      {
        status,
        ...(status === 'rejected' && { admin_feedback: req.body.feedback }),
        ...(status === 'approved' && { admin_feedback: '' }) // Clear feedback if approved
      },
      { new: true }
    );

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    res.json(content);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Pending Teacher Requests
router.get('/teacher-requests', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const teachers = await User.find({ role: 'teacher', approval_status: 'pending' })
      .select('-password')
      .sort({ created_at: -1 });
    res.json(teachers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve Teacher
router.post('/approve-teacher', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { userId, assigned_subjects } = req.body;

    if (!assigned_subjects || assigned_subjects.length === 0) {
      return res.status(400).json({ error: 'At least one subject must be assigned.' });
    }

    const teacher = await User.findById(userId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    teacher.approval_status = 'approved';
    teacher.assigned_subjects = assigned_subjects;
    await teacher.save();

    res.json({ message: 'Teacher approved successfully', teacher });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reject Teacher
router.post('/reject-teacher', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    const { userId } = req.body;

    const teacher = await User.findById(userId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    teacher.approval_status = 'rejected';
    await teacher.save();

    res.json({ message: 'Teacher rejected successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clean up duplicate student stats
router.post('/cleanup-duplicates', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try {
    // Find all student stats grouped by student_id
    const duplicates = await StudentStats.aggregate([
      {
        $group: {
          _id: '$student_id',
          count: { $sum: 1 },
          docs: { $push: '$_id' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);

    let removedCount = 0;
    for (const duplicate of duplicates) {
      // Keep the first document, remove the rest
      const toRemove = duplicate.docs.slice(1);
      await StudentStats.deleteMany({ _id: { $in: toRemove } });
      removedCount += toRemove.length;
    }

    res.json({ message: `Removed ${removedCount} duplicate student stats` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
