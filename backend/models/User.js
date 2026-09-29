const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  full_name: {
    type: String,
    required: true
  },
  mobile: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'teacher', 'admin'],
    required: true
  },
  institution_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institution',
    default: null
  },
  email_verified: {
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
  approval_status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  assigned_subjects: {
    type: [String],
    default: []
  },
  semester: {
    type: Number,
    default: 1
  },
  standard: {
    type: Number, // For school students (1-12)
    default: null
  },
  university_details: {
    type: String, // Department/Course for University
    default: null
  },
  college_name: {
    type: String, // Constituent college under a university
    default: null
  },
  ngo_details: {
    type: String, // Role/Function for NGO
    default: null
  }
});

userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    this.updated_at = Date.now();
    return;
  }

  this.password = await bcrypt.hash(this.password, 10);
  this.updated_at = Date.now();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.set('toJSON', {
  virtuals: true
});

// Indexes for institution+role queries (used heavily in lessons, quizzes, challenges)
userSchema.index({ institution_id: 1, role: 1 });
userSchema.index({ role: 1 });
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);
