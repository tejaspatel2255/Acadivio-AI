const mongoose = require('mongoose');
const User = require('./models/User');
const Institution = require('./models/Institution');
require('dotenv').config();

async function checkData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Check Institutions
        const institutions = await Institution.find();
        console.log(`Found ${institutions.length} institutions.`);
        institutions.forEach(inst => {
            console.log(`- ${inst.name} (${inst.type}) ID: ${inst._id}`);
        });

        // 2. Check Users and their links
        const users = await User.find({ role: 'student' }).populate('institution_id');
        console.log(`Found ${users.length} students.`);
        users.forEach(u => {
            const instName = u.institution_id ? `${u.institution_id.name} (${u.institution_id.type})` : 'NONE';
            console.log(`- ${u.full_name}: Institution -> ${instName}, Semester: ${u.semester}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkData();
