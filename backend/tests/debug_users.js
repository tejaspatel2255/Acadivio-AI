const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function checkStudents() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Use lean() to see the raw document
        const student = await User.findOne({ role: 'student' }).lean();
        console.log('Raw student document keys:', Object.keys(student));
        console.log('Does semester exist in raw doc?', 'semester' in student);
        console.log('Semester value in raw doc:', student.semester);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkStudents();
