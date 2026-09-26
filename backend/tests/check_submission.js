const mongoose = require('mongoose');
const dotenv = require('dotenv');
const ChallengeSubmission = require('./models/ChallengeSubmission');
const User = require('./models/User');

dotenv.config();

const check = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const submissions = await ChallengeSubmission.find({});
        console.log(`Total Submissions: ${submissions.length}`);

        for (const s of submissions) {
            console.log(`- ID: ${s._id}`);
            console.log(`  Student: ${s.student_id}`);
            console.log(`  Challenge: ${s.challenge_id}`);
            console.log(`  Status: ${s.status}`);
            console.log(`  Retake: ${s.retake_status}`);
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

check();
