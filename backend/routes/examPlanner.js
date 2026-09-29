const express = require('express');
const router = express.Router();
const InternalAssessment = require('../models/InternalAssessment');
const ExamGoal = require('../models/ExamGoal');
const User = require('../models/User');
const { authMiddleware, roleMiddleware, subjectAccessMiddleware } = require('../middleware/auth');
const { generateExamGuidance } = require('../utils/ai');

// @route   GET /api/exam-planner/students
// @desc    Search students for Internal Assessment (Teacher only)
// @access  Private (Teacher, Admin)
router.get('/students', authMiddleware, roleMiddleware('teacher', 'admin'), async (req, res) => {
    try {
        const { query } = req.query;
        let filter = { role: 'student' };

        // Restrict teachers to their own students
        if (req.user.role === 'teacher') {
            if (req.user.institution_id) {
                filter.institution_id = req.user.institution_id;
            }
            if (req.user.college_name) {
                filter.college_name = req.user.college_name;
            }
            if (req.user.university_details) {
                filter.university_details = req.user.university_details;
            }
        }

        if (query) {
            filter.$or = [
                { full_name: { $regex: query, $options: 'i' } },
                { email: { $regex: query, $options: 'i' } }
            ];
        }

        // Filter by semester if provided
        const { semester } = req.query;
        if (semester) {
            filter.semester = Number(semester);
        }

        const students = await User.find(filter).select('full_name email _id mobile semester');
        res.json(students);
    } catch (error) {
        console.error('Error searching students:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/exam-planner/internal-marks
// @desc    Add or update internal marks (Teacher only)
// @access  Private (Teacher)
router.post('/internal-marks', authMiddleware, roleMiddleware('teacher', 'admin'), subjectAccessMiddleware, async (req, res) => {
    try {
        const { student_id, subject_name, internal_marks_obtained, total_internal_marks, semester, exam_type, remarks, focus_areas } = req.body;

        // Strict Field Validation
        if (!student_id || !subject_name || !semester || !exam_type || !focus_areas) {
            return res.status(400).json({ error: 'Missing required fields (student_id, subject, semester, type, focus_areas)' });
        }

        const obtained = Number(internal_marks_obtained);
        const maxMarks = Number(total_internal_marks);

        // Strict Numeric Bounds Validation
        if (isNaN(obtained) || isNaN(maxMarks)) {
            return res.status(400).json({ error: 'Marks must be valid numbers' });
        }

        if (obtained < 0) {
            return res.status(400).json({ error: 'Obtained marks cannot be negative' });
        }

        if (maxMarks <= 0) {
            return res.status(400).json({ error: 'Total maximum marks must be greater than zero' });
        }

        if (obtained > maxMarks) {
            return res.status(400).json({ error: `Obtained marks (${obtained}) cannot exceed total maximum marks (${maxMarks})` });
        }

        // Validate if student exists
        const student = await User.findById(student_id);
        if (!student || student.role !== 'student') {
            return res.status(404).json({ error: 'Student not found or invalid role' });
        }

        // Verify student belongs to teacher's institution (if teacher role)
        if (req.user.role === 'teacher' && req.user.institution_id) {
            if (!student.institution_id || student.institution_id.toString() !== req.user.institution_id.toString()) {
                return res.status(403).json({ error: 'Unauthorized: Student does not belong to your institution' });
            }
        }

        let assessment = await InternalAssessment.findOne({
            student_id,
            subject_name,
            semester,
            exam_type
        });

        if (assessment) {
            // Update existing with audit log (simulated)
            assessment.internal_marks_obtained = internal_marks_obtained;
            assessment.total_internal_marks = total_internal_marks;
            assessment.teacher_id = req.user._id;
            assessment.updated_at = Date.now();
            assessment.remarks = remarks || '';
            assessment.focus_areas = focus_areas;
            await assessment.save();
            console.log(`[ExamPlanner][AUDIT] Updated assessment: Student ${student_id}, Subject: ${subject_name}, Sem: ${semester}, By: ${req.user.email}`);
        } else {
            // Create new
            assessment = new InternalAssessment({
                student_id,
                teacher_id: req.user._id,
                subject_name,
                internal_marks_obtained,
                total_internal_marks,
                semester,
                exam_type,
                remarks: remarks || '',
                focus_areas
            });
            await assessment.save();
            console.log(`[ExamPlanner][AUDIT] Created new assessment: Student ${student_id}, Subject: ${subject_name}, Sem: ${semester}, By: ${req.user.email}`);
        }

        res.json(assessment);
    } catch (error) {
        console.error('Error saving internal marks:', error);
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

// @route   DELETE /api/exam-planner/internal-marks
// @desc    Delete internal marks (Teacher only)
// @access  Private (Teacher)
router.delete('/internal-marks', authMiddleware, roleMiddleware('teacher', 'admin'), subjectAccessMiddleware, async (req, res) => {
    try {
        const { student_id, subject_name, semester } = req.body;

        if (!student_id || !subject_name || !semester) {
            return res.status(400).json({ error: 'Missing required fields (student_id, subject, semester)' });
        }

        const result = await InternalAssessment.deleteMany({
            student_id,
            subject_name,
            semester
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'No assessment records found to delete.' });
        }

        console.log(`[ExamPlanner][AUDIT] Deleted ${result.deletedCount} assessment(s): Student ${student_id}, Subject: ${subject_name}, Sem: ${semester}, By: ${req.user.email}`);
        res.json({ message: `Subject '${subject_name}' deleted successfully (${result.deletedCount} records removed).` });
    } catch (error) {
        console.error('Error deleting internal marks:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   GET /api/exam-planner/marks/:studentId
// @desc    Get internal marks for a student (Semester Isolation Enforced)
// @access  Private (Teacher, Student, Admin)
router.get('/marks/:studentId', authMiddleware, async (req, res) => {
    try {
        let targetStudentId = req.params.studentId;
        const { semester } = req.query;

        // Resolve 'me' alias
        if (targetStudentId === 'me') {
            targetStudentId = req.user._id.toString();
        }

        // STRICT ACCESS CONTROL
        // 1. Students can ONLY access their own data
        if (req.user.role === 'student' && targetStudentId !== req.user._id.toString()) {
            console.warn(`[ExamPlanner][SECURITY] Unauthorized access attempt by Student ${req.user._id} to view ${targetStudentId}`);
            return res.status(403).json({ error: 'Access denied. You can only view your own marks.' });
        }

        // Query Construction
        let query = { student_id: targetStudentId };

        // 2. Strict Semester Isolation (Optional filter, but recommended)
        if (semester) {
            query.semester = semester;
        }

        const marks = await InternalAssessment.find(query).sort({ semester: -1, subject_name: 1 });

        // Privacy Check: Ensure no data leakage (Double check)
        if (req.user.role === 'student') {
            // For students, ensure every returned record belongs to them (DB query should handle this, but explicit check adds safety)
            const foreignRecords = marks.filter(m => m.student_id.toString() !== req.user._id.toString());
            if (foreignRecords.length > 0) {
                console.error('[ExamPlanner][CRITICAL] Data leakage detected!', foreignRecords);
                return res.status(500).json({ error: 'Security constraint violation' });
            }
        }

        res.json(marks);
    } catch (error) {
        console.error('Error fetching marks:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/exam-planner/goals
// @desc    Set academic goals (Student)
// @access  Private (Student)
router.post('/goals', authMiddleware, roleMiddleware('student'), async (req, res) => {
    try {
        const { subject_name, target_grade, target_sgpa } = req.body;

        let goal = await ExamGoal.findOne({
            student_id: req.user._id,
            subject_name
        });

        if (goal) {
            goal.target_grade = target_grade;
            goal.target_sgpa = target_sgpa;
            goal.updated_at = Date.now();
            await goal.save();
        } else {
            goal = new ExamGoal({
                student_id: req.user._id,
                subject_name,
                target_grade,
                target_sgpa
            });
            await goal.save();
        }

        res.json(goal);
    } catch (error) {
        console.error('Error saving goal:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   GET /api/exam-planner/prediction
// @desc    Get prediction based on internal marks and goals
// @access  Private (Student)
router.get('/prediction', authMiddleware, roleMiddleware('student', 'teacher', 'admin'), async (req, res) => {
    try {
        const studentId = req.user._id;

        // Fetch all internal marks
        const marks = await InternalAssessment.find({ student_id: studentId });
        // Fetch all goals
        const goals = await ExamGoal.find({ student_id: studentId });

        // Combine data to calculate requirements
        const predictions = goals.map(goal => {
            const subjectMarks = marks.filter(m => m.subject_name === goal.subject_name);
            // Sort by semester/date to determine trend
            subjectMarks.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

            const totalInternalObtained = subjectMarks.reduce((sum, m) => sum + m.internal_marks_obtained, 0);
            const totalInternalMax = subjectMarks.reduce((sum, m) => sum + m.total_internal_marks, 0);

            // 1. Trend Analysis
            let trend = 'stable';
            if (subjectMarks.length >= 2) {
                const latest = subjectMarks[subjectMarks.length - 1];
                const previous = subjectMarks[subjectMarks.length - 2];
                const latestPct = latest.internal_marks_obtained / latest.total_internal_marks;
                const prevPct = previous.internal_marks_obtained / previous.total_internal_marks;

                if (latestPct > prevPct + 0.05) trend = 'improving';
                else if (latestPct < prevPct - 0.05) trend = 'declining';
            }

            // 2. Target Calculation
            let targetScore = 0;
            const scoringMap = { 'O': 90, 'A+': 80, 'A': 70, 'B+': 60, 'B': 55, 'C': 50, 'P': 40 };
            targetScore = scoringMap[goal.target_grade.toUpperCase()] || 60;

            const requiredExternal = Math.max(0, targetScore - totalInternalObtained);

            // 3. Priority Indicator
            // Based on current internal performance %
            const currentPct = totalInternalMax > 0 ? (totalInternalObtained / totalInternalMax) : 0;
            let priority = 'medium';
            if (currentPct < 0.60) priority = 'high'; // Needs Attention
            else if (currentPct > 0.80) priority = 'low'; // Strong

            // 4. Feasibility Check
            // Assuming 70 marks external paper. 
            // If required > 70, it's impossible (or > 100% of external).
            // Let's assume standard weights. If Required is > 90% of max external (e.g. > 63/70), it's Ambitious.
            let feasibility = 'achievable';
            if (requiredExternal > 70) feasibility = 'hard'; // Impossible if max is 70
            else if (requiredExternal > 63) feasibility = 'ambitious';

            // 5. Readiness Status
            let readiness = 'on_track';
            if (priority === 'high' || trend === 'declining') readiness = 'needs_focus';
            if (feasibility === 'hard') readiness = 'critical';

            // 6. Personalized Advice Generator
            let advice = "";
            if (trend === 'declining') {
                advice = "Your recent internal scores have dropped slightly. Review your last test to identify weak topics.";
            } else if (priority === 'high') {
                advice = "This subject requires immediate attention to meet your target. Consider scheduling extra study hours.";
            } else if (feasibility === 'ambitious') {
                advice = "Your target is ambitious! You'll need near-perfect external scores. Ensure you cover the entire syllabus.";
            } else {
                advice = "You are on track! systematic revision will help you secure your target grade.";
            }

            // 7. Action Plan Snippet
            let action = "";
            if (priority === 'high') action = "Revise Unit 1 & 2 concepts.";
            else if (trend === 'stable') action = "Attempt a mock test to boost confidence.";
            else action = "Maintain current study routine.";

            return {
                subject: goal.subject_name,
                target_grade: goal.target_grade,
                internal_obtained: totalInternalObtained,
                internal_max: totalInternalMax > 0 ? totalInternalMax : 30,
                required_external_marks: requiredExternal,
                trend,
                priority,
                readiness,
                advice,
                feasibility,
                action_plan: action,
                message: requiredExternal > 70 ? "Requires >100% in external. Consider adjusting goal." : "Achievable."
            };
        });

        res.json(predictions);
    } catch (error) {
        console.error('Error generating prediction:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Chat Assistant Endpoint (Rule-Based Context Aware)
router.post('/chat', authMiddleware, roleMiddleware('student'), async (req, res) => {
    try {
        const { message, context } = req.body; // context contains { predictions, marks }
        const msg = message.toLowerCase();

        // Helper: Find high priority subjects
        const highPriority = context?.predictions?.filter(p => p.priority === 'high') || [];
        const declining = context?.predictions?.filter(p => p.trend === 'declining') || [];
        const strong = context?.predictions?.filter(p => p.priority === 'low') || [];

        let response = "";

        // Intent 1: Status / Overview
        if (msg.includes('how am i doing') || msg.includes('status') || msg.includes('summary') || msg.includes('progress')) {
            if (highPriority.length > 0) {
                response = `You have ${highPriority.length} subject(s) that need attention: ${highPriority.map(p => p.subject).join(', ')}. Focus here first to get back on track!`;
            } else if (strong.length > 0) {
                response = `You're doing great! You are strong in ${strong.length} subjects. Keep maintaining this consistency.`;
            } else {
                response = "You are maintaining a stable performance. To boost your grades, try setting slightly higher targets for your next internal.";
            }
        }
        // Intent 2: Advice / Planning
        else if (msg.includes('study') || msg.includes('plan') || msg.includes('focus') || msg.includes('advice')) {
            if (highPriority.length > 0) {
                const topIssue = highPriority[0];
                response = `Make a plan for **${topIssue.subject}**. Your internal score is ${Math.round((topIssue.internal_obtained / topIssue.internal_max) * 100)}%. dedicating 30 mins extra daily to this can make a huge difference.`;
            } else if (declining.length > 0) {
                response = `I noticed a slight dip in **${declining[0].subject}**. Review your recent test papers to find the gap.`;
            } else {
                response = "Since your core subjects are stable, try solving previous year papers to build exam confidence.";
            }
        }
        // Intent 3: Stress / Panic
        else if (msg.includes('scared') || msg.includes('fail') || msg.includes('stress') || msg.includes('hard') || msg.includes('worry')) {
            response = "Take a deep breath. Remember, internal marks are just checkpoints, not the destination. You have time to improve. Set one small, achievable goal for today.";
        }
        // Intent 4: Greeting
        else if (msg.includes('hi') || msg.includes('hello') || msg.includes('hey')) {
            response = "Hello! I'm here to help you plan your studies. Ask me 'How am I doing?' or 'What should I focus on?'.";
        }
        // Default Fallback
        else {
            response = "I can help you analyze your progress. Try asking: 'Which subject needs focus?', 'How is my trend?', or 'Give me a study tip'.";
        }

        // Simulate "thinking" delay for realism
        await new Promise(resolve => setTimeout(resolve, 500));

        res.json({ response });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// @route   POST /api/exam-planner/guidance
// @desc    Generate comprehensive AI guidance with problems
// @access  Private (Student)
router.post('/guidance', authMiddleware, roleMiddleware('student'), async (req, res) => {
    try {
        const studentId = req.user._id;

        const { subject, topic } = req.body;

        if (subject && topic) {
            // CASE 1: Custom Subject/Topic Guidance (No Marks Needed)
            const contextData = [{
                subject: subject,
                topic: topic,
                isCustom: true,
                marksObtained: 0,
                totalMarks: 0,
                focusAreas: [],
                remarks: ''
            }];
            console.log(`Generating CUSTOM guidance for Student ${studentId} on Subject: ${subject}, Topic: ${topic}`);
            const aiResult = await generateExamGuidance(contextData);
            return res.json(aiResult);
        }

        let query = { student_id: studentId };
        if (subject) {
            query.subject_name = subject;
        }

        // Fetch Exam Planner Data
        const marks = await InternalAssessment.find(query);

        if (!marks || marks.length === 0) {
            return res.status(400).json({ error: subject ? `No marks found for subject: ${subject}` : "No exam marks found. Please add subjects first." });
        }

        // Parse focus_areas - handle comma-separated values
        const parseFocusAreas = (focusAreasString) => {
            if (!focusAreasString || typeof focusAreasString !== 'string') return [];
            return focusAreasString.split(',').map(area => area.trim()).filter(area => area.length > 0);
        };

        const contextData = marks.map(m => ({
            subject: m.subject_name,
            marksObtained: m.internal_marks_obtained,
            totalMarks: m.total_internal_marks,
            focusAreas: parseFocusAreas(m.focus_areas),
            remarks: m.remarks || ''
        }));

        console.log(`Generating guidance for Student ${studentId} with ${contextData.length} subjects.`);

        const aiResult = await generateExamGuidance(contextData);
        res.json(aiResult);

    } catch (error) {
        console.error('Error generating detailed guidance:', error.message);
        if (error.response) {
            console.error('AI Service Error Data:', JSON.stringify(error.response.data, null, 2));
        }
        res.status(500).json({ error: error.message || 'Server error' });
    }
});

module.exports = router;
