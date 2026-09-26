const mongoose = require('mongoose');
const User = require('./models/User');
const Quiz = require('./models/Quiz');
const Lesson = require('./models/Lesson');
require('dotenv').config();

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const students = await User.find({ role: 'student' }).limit(5);
        const teachers = await User.find({ role: 'teacher' }).limit(5);
        const quizzes = await Quiz.find({}).limit(5);

        console.log('\n--- STUDENTS ---');
        students.forEach(s => console.log(`ID: ${s._id}, Name: ${s.full_name}, Inst: ${s.institution_id}, Class: ${s.standard || s.semester}`));

        console.log('\n--- TEACHERS ---');
        teachers.forEach(t => console.log(`ID: ${t._id}, Name: ${t.full_name}, Inst: ${t.institution_id}`));

        console.log('\n--- QUIZZES ---');
        quizzes.forEach(q => console.log(`ID: ${q._id}, Title: ${q.title}, Teacher: ${q.teacher_id}, Class: ${q.class_number}`));

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
