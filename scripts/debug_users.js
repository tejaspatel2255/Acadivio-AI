const mongoose = require('mongoose');
const User = require('./backend/models/User');
require('dotenv').config({ path: './backend/.env' });

async function checkStudents() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const students = await User.find({ role: 'student' }).select('full_name email semester role').limit(10);

        console.log('Students found:', students.length);
        students.forEach(s => {
            console.log(`Name: ${s.full_name}, Email: ${s.email}, Role: ${s.role}, Semester: ${s.semester} (${typeof s.semester})`);
        });

        const sem1 = await User.find({ role: 'student', semester: 1 });
        console.log('Students in Sem 1:', sem1.length);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkStudents();
