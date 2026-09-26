const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  instructions: {
    type: String,
    default: ''
  },
  difficulty_level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  points_reward: {
    type: Number,
    default: 10
  },
  academic_impact_value: {
    type: Number,
    default: 5
  },
  teacher_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  class_number: {
    type: String,
    default: null
  },
  is_global: {
    type: Boolean,
    default: false
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

challengeSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('Challenge', challengeSchema);

