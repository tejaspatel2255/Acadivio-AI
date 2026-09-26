const mongoose = require('mongoose');
require('dotenv').config();

// Define minimal schemas if requiring models is flaky, or just require them.
// Let's try requiring again, assuming we run from 'backend/' directory.
const User = require('./models/User');
const Quiz = require('./models/Quiz');
const Lesson = require('./models/Lesson');

const run = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error("MONGODB_URI is missing from .env");
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const students = await User.find({ role: 'student' }).limit(5).lean();
        const teachers = await User.find({ role: 'teacher' }).limit(5).lean();
        const quizzes = await Quiz.find({}).limit(5).lean();

        const fs = require('fs');
        let output = '';

        output += '--- STUDENTS ---\n';
        students.forEach(s => {
            output += JSON.stringify({
                id: s._id,
                name: s.full_name,
                email: s.email,
                institution_id: s.institution_id,
                standard: s.standard,
                semester: s.semester
            }) + '\n';
        });

        output += '\n--- TEACHERS ---\n';
        teachers.forEach(t => {
            output += JSON.stringify({
                id: t._id,
                name: t.full_name,
                email: t.email,
                institution_id: t.institution_id
            }) + '\n';
        });

        output += '\n--- QUIZZES ---\n';
        quizzes.forEach(q => {
            output += JSON.stringify({
                id: q._id,
                title: q.title,
                teacher_id: q.teacher_id,
                class_number: q.class_number
            }) + '\n';
        });

        fs.writeFileSync('debug_output.txt', output);
        console.log('Written to debug_output.txt');

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
