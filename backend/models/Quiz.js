const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  lesson_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    default: null
  },
  teacher_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  class_number: {
    type: String,
    default: null
  },
  total_marks: {
    type: Number,
    default: 100
  },
  max_attempts: {
    type: Number,
    default: 1
  },
  time_limit: {
    type: Number, // in minutes
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  admin_feedback: {
    type: String,
    default: ''
  }
});

quizSchema.set('toJSON', {
  virtuals: true
});

// Indexes
quizSchema.index({ teacher_id: 1 });
quizSchema.index({ teacher_id: 1, class_number: 1 });
quizSchema.index({ class_number: 1 });
quizSchema.index({ lesson_id: 1 });

module.exports = mongoose.model('Quiz', quizSchema);

