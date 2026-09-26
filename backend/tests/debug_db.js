const mongoose = require('mongoose');
const InternalAssessment = require('./models/InternalAssessment');
const User = require('./models/User');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/acadivio';

async function debug() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to MongoDB');

        const assessment = await InternalAssessment.findOne({});
        if (assessment) {
            console.log('Assessment found:', assessment._id);
            console.log('Student ID in assessment:', assessment.student_id);

            // Check if string query works
            const m1 = await InternalAssessment.find({ student_id: assessment.student_id.toString() });
            console.log(`Query by String ID returns: ${m1.length}`);

            const student = await User.findById(assessment.student_id);
            if (student) {
                console.log('Student found in DB:');
                console.log('Name:', student.full_name);
                console.log('Email:', student.email);
                console.log('ID:', student._id);
                console.log('Role:', student.role);
            } else {
                console.log('ERROR: Student NOT found in DB with this ID!');
            }
        } else {
            console.log('No assessments found.');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

debug();
