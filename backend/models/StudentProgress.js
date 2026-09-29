const mongoose = require('mongoose');

const studentProgressSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lesson_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  completed_at: {
    type: Date,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Indexes for fast lookup
studentProgressSchema.index({ student_id: 1, lesson_id: 1 }, { unique: true });
studentProgressSchema.index({ student_id: 1 });
studentProgressSchema.index({ lesson_id: 1 });

module.exports = mongoose.model('StudentProgress', studentProgressSchema);

