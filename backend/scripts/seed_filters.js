const mongoose = require('mongoose');
const User = require('./models/User');
const Institution = require('./models/Institution');
require('dotenv').config();

const run = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error("MONGODB_URI is missing from .env");
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        // 1. Ensure we have a School
        let school = await Institution.findOne({ type: 'school' });
        if (!school) {
            school = await Institution.create({
                name: 'Green Valley School',
                type: 'school',
                address: '123 School Lane',
                contact_number: '1234567890',
                email: 'school@test.com'
            });
            console.log('Created School:', school.name);
        } else {
            console.log('Found School:', school.name);
        }

        // 2. Ensure we have Students in Class 5 and Class 10
        const studentData = [
            { name: 'Student Class 5', email: 's5@school.com', standard: 5, institution_id: school._id },
            { name: 'Student Class 10', email: 's10@school.com', standard: 10, institution_id: school._id }
        ];

        for (const data of studentData) {
            let s = await User.findOne({ email: data.email });
            if (!s) {
                s = await User.create({
                    full_name: data.name,
                    email: data.email,
                    password: 'password123',
                    role: 'student',
                    institution_id: data.institution_id,
                    standard: data.standard
                });
                console.log(`Created ${data.name}`);
            } else {
                // Update standard just in case
                s.standard = data.standard;
                s.institution_id = data.institution_id;
                await s.save();
                console.log(`Updated ${data.name}`);
            }
        }

        // 3. Ensure we have a College
        let college = await Institution.findOne({ type: 'college' });
        if (!college) {
            college = await Institution.create({
                name: 'City College',
                type: 'college',
                address: '456 College Ave',
                contact_number: '0987654321',
                email: 'college@test.com'
            });
            console.log('Created College:', college.name);
        } else {
            console.log('Found College:', college.name);
        }

        // 4. Ensure we have an NGO
        let ngo = await Institution.findOne({ type: 'ngo' });
        if (!ngo) {
            ngo = await Institution.create({
                name: 'Eco Helpers',
                type: 'ngo',
                address: '789 NGO Blvd',
                contact_number: '1122334455',
                email: 'ngo@test.com'
            });
            console.log('Created NGO:', ngo.name);
        } else {
            console.log('Found NGO:', ngo.name);
        }

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

run();
