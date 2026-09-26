const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY is missing');
        return;
    }

    console.log(`Checking available models for key ending in ...${apiKey.slice(-5)}`);

    try {
        const response = await axios.get(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
        );

        const models = response.data.models;
        const output = models.map(m => ({
            name: m.name,
            supportedGenerationMethods: m.supportedGenerationMethods
        }));

        fs.writeFileSync('models_list.json', JSON.stringify(output, null, 2));
        console.log("Written models to models_list.json");

    } catch (error) {
        console.error("Failed to list models:");
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error(JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

listModels();
