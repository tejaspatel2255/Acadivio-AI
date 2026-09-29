const mongoose = require('mongoose');

const internalAssessmentSchema = new mongoose.Schema({
    student_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    teacher_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subject_name: {
        type: String,
        required: true,
        trim: true
    },
    internal_marks_obtained: {
        type: Number,
        required: true,
        min: 0
    },
    total_internal_marks: {
        type: Number,
        required: true,
        min: 1
    },
    semester: {
        type: Number,
        required: true
    },
    exam_type: {
        type: String, // e.g., "Mid-Term", "Unit Test 1", "Assignment"
        default: "Internal"
    },
    feedback: {
        type: String,
        trim: true
    },
    remarks: {
        type: String,
        trim: true,
        default: ''
    },
    focus_areas: {
        type: String,
        trim: true,
        required: true // Compulsory as per requirements
    }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Indexes for frequent queries
internalAssessmentSchema.index({ student_id: 1, semester: 1 });
internalAssessmentSchema.index({ teacher_id: 1, subject_name: 1 });
internalAssessmentSchema.index({ student_id: 1, subject_name: 1, semester: 1 });

module.exports = mongoose.model('InternalAssessment', internalAssessmentSchema);
