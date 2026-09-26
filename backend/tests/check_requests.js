require('dotenv').config();
const mongoose = require('mongoose');
const ProfileUpdateRequest = require('./models/ProfileUpdateRequest');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const checkRequests = async () => {
    await connectDB();
    try {
        const requests = await ProfileUpdateRequest.find({});
        console.log(`Total Requests: ${requests.length}`);

        const pending = requests.filter(r => r.status === 'pending');
        console.log(`Pending Requests: ${pending.length}`);

        pending.forEach(r => {
            console.log(`- Request ID: ${r._id}, User: ${r.user_id}, Created: ${r.created_at}`);
            console.log(`  Changes:`, r.requested_changes);
        });

    } catch (error) {
        console.error('Error checking requests:', error);
    } finally {
        await mongoose.connection.close();
        process.exit();
    }
};

checkRequests();
