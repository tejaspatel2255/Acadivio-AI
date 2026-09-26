const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const checkUserRole = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const users = await User.find({});
        console.log('--- User Roles ---');
        users.forEach(u => {
            console.log(`Email: ${u.email}, Role: ${u.role}, ID: ${u._id}`);
        });
        console.log('------------------');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkUserRole();
