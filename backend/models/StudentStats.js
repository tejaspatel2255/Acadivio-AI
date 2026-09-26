const mongoose = require('mongoose');

const studentStatsSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  total_points: {
    type: Number,
    default: 0
  },
  current_level: {
    type: Number,
    default: 1
  },
  badges_earned: {
    type: [String],
    default: []
  },
  lessons_completed: {
    type: Number,
    default: 0
  },
  quizzes_completed: {
    type: Number,
    default: 0
  },
  challenges_completed: {
    type: Number,
    default: 0
  },
  academic_impact_score: {
    type: Number,
    default: 0
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Calculate level based on points
studentStatsSchema.methods.calculateLevel = function() {
  return Math.max(1, Math.floor(Math.sqrt(this.total_points / 100)) + 1);
};

module.exports = mongoose.model('StudentStats', studentStatsSchema);

