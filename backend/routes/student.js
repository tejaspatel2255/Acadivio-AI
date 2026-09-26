const express = require('express');
const StudentStats = require('../models/StudentStats');
const StudentProgress = require('../models/StudentProgress');
const QuizAttempt = require('../models/QuizAttempt');
const ClassEnrollment = require('../models/ClassEnrollment');
const { authMiddleware, roleMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get student stats
router.get('/stats', authMiddleware, roleMiddleware('student'), async (req, res) => {
  try {
    const stats = await StudentStats.findOne({ student_id: req.user._id });
    if (!stats) {
      return res.json({
        student_id: req.user._id,
        total_points: 0,
        current_level: 1,
        badges_earned: [],
        lessons_completed: 0,
        quizzes_completed: 0,
        challenges_completed: 0,
        academic_impact_score: 0
      });
    }
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get student progress
router.get('/progress', authMiddleware, roleMiddleware('student'), async (req, res) => {
  try {
    const progress = await StudentProgress.find({ student_id: req.user._id });
    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get leaderboard
router.get('/leaderboard', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;

    // Fetch all stats first, populate, then filter
    // We cannot easily filter by populated field in simple find(), so we filter in memory
    // This ensures we don't return 'Unknown' users who have been deleted
    const allStats = await StudentStats.find()
      .populate('student_id', 'full_name email')
      .sort({ total_points: -1 });

    const validStats = allStats.filter(stat => stat.student_id);

    res.json(validStats.slice(0, limit));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get analytics
router.get('/analytics', authMiddleware, roleMiddleware('student'), async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({
      student_id: req.user._id,
      status: 'completed'
    }).sort({ completed_at: -1 }).limit(10);

    res.json({ attempts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

