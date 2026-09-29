const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema({
  quiz_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  score: {
    type: Number,
    default: 0
  },
  total_marks: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0
  },
  time_taken: {
    type: Number, // in seconds
    default: null
  },
  started_at: {
    type: Date,
    default: Date.now
  },
  completed_at: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'abandoned'],
    default: 'in_progress'
  }
}, { timestamps: { createdAt: 'started_at', updatedAt: 'completed_at' } });

// Indexes for fast lookup
quizAttemptSchema.index({ quiz_id: 1, student_id: 1 });
quizAttemptSchema.index({ student_id: 1 });
quizAttemptSchema.index({ student_id: 1, status: 1 });

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);

