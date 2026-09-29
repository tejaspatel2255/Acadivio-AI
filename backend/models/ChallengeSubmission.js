const mongoose = require('mongoose');

const challengeSubmissionSchema = new mongoose.Schema({
  challenge_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Challenge',
    required: true
  },
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  submission_text: {
    type: String,
    default: ''
  },
  submission_media: {
    type: [String], // URLs to images/videos
    default: []
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  points_awarded: {
    type: Number,
    default: 0
  },
  submitted_at: {
    type: Date,
    default: Date.now
  },
  reviewed_at: {
    type: Date,
    default: null
  },
  retake_status: {
    type: String,
    enum: ['none', 'pending', 'approved', 'rejected'],
    default: 'none'
  },
  highest_points: {
    type: Number,
    default: 0
  },
  reviewed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: { createdAt: 'submitted_at', updatedAt: 'reviewed_at' } });

// Indexes
challengeSubmissionSchema.index({ challenge_id: 1, student_id: 1 });
challengeSubmissionSchema.index({ student_id: 1 });
challengeSubmissionSchema.index({ challenge_id: 1, status: 1 });

module.exports = mongoose.model('ChallengeSubmission', challengeSubmissionSchema);

