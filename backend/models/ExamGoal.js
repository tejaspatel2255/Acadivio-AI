const mongoose = require('mongoose');

const examGoalSchema = new mongoose.Schema({
    student_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subject_name: {
        type: String,
        required: true,
        trim: true
    },
    target_grade: {
        type: String,
        required: true
    },
    target_sgpa: {
        type: Number,
        min: 0,
        max: 10
    }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Indexes
examGoalSchema.index({ student_id: 1 });
examGoalSchema.index({ student_id: 1, subject_name: 1 });

module.exports = mongoose.model('ExamGoal', examGoalSchema);
