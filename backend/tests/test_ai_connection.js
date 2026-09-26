const { generateExamGuidance } = require('./utils/ai');
require('dotenv').config();

async function test() {
    console.log("Testing AI Connection...");
    console.log("API Key loaded:", process.env.GEMINI_API_KEY ? "Yes (" + process.env.GEMINI_API_KEY.slice(0, 5) + "...)" : "No");

    const sampleData = [{
        subject: 'Introduction to Programming',
        marksObtained: 45,
        totalMarks: 100,
        focusAreas: ['Loops', 'Conditionals'],
        remarks: 'Needs more practice'
    }];

    try {
        const result = await generateExamGuidance(sampleData);
        console.log("Success! AI Response received.");
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("Test Failed with Error:");
        console.error(error.message);
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        }
    }
}

test();
