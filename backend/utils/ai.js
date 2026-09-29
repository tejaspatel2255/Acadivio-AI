const axios = require('axios');

const generateQuiz = async (contextData) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('GEMINI_API_KEY is missing from environment variables');
        throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }

    // Validate API key format (Gemini API keys typically start with 'AIza')
    if (!apiKey.startsWith('AIza')) {
        console.warn('GEMINI_API_KEY format may be incorrect (expected to start with "AIza")');
    }

    console.log('Generating quiz with context data:', {
        subjectCount: contextData.examPlanner?.length || 0,
        hasPreviousQuizzes: contextData.previousQuizRemarks?.attemptsCount > 0
    });

    // --- DETERMINISTIC QUESTION DISTRIBUTION LOGIC ---
    let subjectDistributionString = "";
    if (contextData.examPlanner && contextData.examPlanner.length > 0) {
        const totalQuestions = 25;
        let subjects = contextData.examPlanner.map(s => {
            const max = s.totalMarks || 100;
            const current = s.marks || 0;
            // Calculate Gap (Weakness). Add base weight (e.g., 10) to ensure representation.
            // Gap = How many marks they lost. More lost marks = Higher weight.
            let gap = Math.max(0, max - current);
            return {
                subject: s.subject,
                weight: gap + 20, // +20 base weight ensures even high scorers get some questions
                marks: current,
                total: max
            };
        });

        const totalWeight = subjects.reduce((sum, s) => sum + s.weight, 0);

        // Initial distribution
        let distributedSubjects = subjects.map(s => {
            // Proportional share
            let share = (s.weight / totalWeight) * totalQuestions;
            return { ...s, count: Math.floor(share), remainder: share - Math.floor(share) };
        });

        // Ensure minimum 1 question per subject
        distributedSubjects.forEach(s => {
            if (s.count === 0) s.count = 1;
        });

        // Calculate current total
        let currentTotal = distributedSubjects.reduce((sum, s) => sum + s.count, 0);

        // Adjust to match exactly 25
        if (currentTotal < totalQuestions) {
            // Add to subjects with highest remainders (that represent the fraction lost)
            // Or simply add to highest weight (weakest subjects) to prioritize them more
            distributedSubjects.sort((a, b) => b.weight - a.weight);
            let diff = totalQuestions - currentTotal;
            for (let i = 0; i < diff; i++) {
                distributedSubjects[i % distributedSubjects.length].count++;
            }
        } else if (currentTotal > totalQuestions) {
            // Remove from subjects with lowest weight (strongest subjects), keeping min 1
            distributedSubjects.sort((a, b) => a.weight - b.weight);
            let diff = currentTotal - totalQuestions;
            for (let i = 0; i < diff; i++) {
                if (distributedSubjects[i % distributedSubjects.length].count > 1) {
                    distributedSubjects[i % distributedSubjects.length].count--;
                }
            }
        }

        // Generate the formatted string for the prompt
        subjectDistributionString = distributedSubjects.map(s =>
            `- ${s.subject}: ${s.count} questions (Marks: ${s.marks}/${s.total})`
        ).join('\n');

        console.log("Calculated Question Distribution:\n" + subjectDistributionString);
    }

const prompt = `
You are Acadivio AI's Adaptive Academic Quiz Engine.

This AI process is AUTOMATICALLY triggered whenever a student clicks the
"Smart Practice" module in the Acadivio AI dashboard.

The student does NOT type or provide any prompt.
The Smart Practice click acts as the trigger to:
1. Analyze complete Exam Planner data
2. Analyze feedback from previous quizzes (if available)
3. Decide subject-wise question distribution
4. Decide difficulty and focus areas
5. Generate a personalized academic quiz
6. Generate post-quiz remarks for student improvement

========================
INPUT DATA (FROM BACKEND)
========================
When Smart Practice is clicked, you will receive:

A) Exam Planner Data:
- Subject name (dynamic, academic)
- Marks / current performance per subject
- Focus areas (important or weak topics) per subject

B) Previous Quiz Feedback (if available):
- Subject-wise accuracy
- Incorrect focus areas
- Overall performance trend (improving / stagnant / declining)

Example input (for understanding only):

{
  "examPlanner": [
    {
      "subject": "C Programming",
      "marks": 48,
      "focusAreas": ["Pointers", "Functions", "Arrays"]
    },
    {
      "subject": "Engineering Mathematics",
      "marks": 72,
      "focusAreas": ["Differential Equations"]
    }
  ],
  "previousQuizRemarks": {
    "overallPerformance": "average",
    "weakFocusAreas": {
      "C Programming": ["Pointers"],
      "Engineering Mathematics": []
    }
  }
}

⚠️ Subject names are dynamic and must be used EXACTLY.
⚠️ Previous quiz remarks must influence future quizzes.

========================
STRICT QUESTION DISTRIBUTION (CALCULATED)
========================
You MUST follow this exact distribution of questions per subject. 
This has been calculated based on the student's marks (Lower Marks = More Questions).

${subjectDistributionString}

TOTAL QUESTIONS: 25

=======================
ANALYSIS & DIFFICULTY BRACKET RULES (STRICT)
=======================
1. Generate questions ONLY from subjects listed in Exam Planner.
2. ALL subjects must be included (no skipping).
3. FOLLOW THE STRICT DISTRIBUTION LISTED ABOVE.
4. Each subject must have at least ONE question.
5. Total questions MUST be exactly 25.

DIFFICULTY BRACKET SPECIFICATIONS:
- BEGINNER (Student composite/subject score < 60%):
  * Target: EASY (60%) + MEDIUM (40%) questions.
  * Focus on fundamental definitions, core syntax, step-by-step logic, and direct concept application.
  * Avoid tricky multi-layered edge cases.
- INTERMEDIATE (Student composite/subject score 60% - 85%):
  * Target: MEDIUM (70%) + HARD (30%) questions.
  * Focus on algorithmic analysis, code tracing, time complexity, and practical problem-solving.
- EXPERT (Student composite/subject score > 85%):
  * Target: HARD (80%) + EXPERT CHALLENGE (20%) questions.
  * Focus on edge cases, multi-step problem solving, optimization, architecture, and advanced application scenarios.

=======================
FOCUS AREA & WEAK-TOPIC RULES (VERY IMPORTANT)
=======================
- Primary focus areas originate from:
  1. Teacher-identified weak topics in Internal Assessments.
  2. Repeated mistakes from previous quiz attempts.
- A MAJORITY (>60%) of questions in a subject MUST target its weak focus areas.
- Repeatedly incorrect focus areas must appear with modified, novel test scenarios.
- Do NOT generate questions outside of the specified academic subjects and focus areas (STRICTLY NO general knowledge, trivia, or unrelated fields).
- Ensure question and option uniqueness:
  * No duplicate questions.
  * No duplicate options within any question.
  * Exactly 4 distinct options per MCQ.
  * Exactly 1 correct answer.
  * Detailed educational explanation for every question.

=======================
QUESTION RULES
=======================
- STRICTLY academic and engineering/computer science-related
- Suitable for university examinations
- No environmental, general knowledge, or unrelated content
- Avoid repetition, ambiguity, and vague wording

=======================
MCQ FORMAT RULES
=======================
- Multiple Choice Questions only
- Exactly 4 options per question (Option A, Option B, Option C, Option D)
- Only ONE correct answer (must match one of the 4 options)
- Provide a brief, high-yield explanation

=======================
OUTPUT FORMAT (STRICT)
=======================
Return a single JSON object with TWO keys only:
1. "quiz"
2. "remarks"

DO NOT use markdown, code blocks, or extra text.

------------------------
QUIZ ARRAY FORMAT
------------------------
"quiz": [
  {
    "question": "Clear, specific question text",
    "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
    "correctAnswer": "Option A text",
    "explanation": "Concise step-by-step explanation of why this answer is correct",
    "subject": "Exact subject name from Exam Planner",
    "focusArea": "Specific focus area topic name",
    "difficulty": "easy | medium | hard"
  }
]

------------------------
REMARKS FORMAT
------------------------
"remarks": {
  "overallFeedback": "Short motivational academic feedback summarizing performance",
  "strengths": ["Specific subjects or concepts where student performed well"],
  "weakAreas": ["Specific weak focus areas requiring immediate revision"],
  "recommendation": "Actionable, concrete study advice for next attempt"
}

=======================
CRITICAL CONSTRAINTS
=======================
- Quiz MUST contain exactly 25 questions
- JSON must be directly parsable
- Subject names must match Exam Planner exactly
- Remarks must be concise, academic, and constructive
- Do NOT mention internal marks or backend algorithm details
- Do NOT ask the student questions in the remarks

=======================
ACTUAL INPUT DATA
=======================
${JSON.stringify(contextData, null, 2)}
    
=======================
ADAPTIVE DIFFICULTY INSTRUCTIONS (CRITICAL)
=======================
${contextData.previousQuizRemarks?.difficultyTier === 'expert' || contextData.previousQuizRemarks?.highPerformanceMode ?
            `
⚠️ STUDENT CLASSIFIED AS EXPERT (>85% performance).
1. INCREASE DIFFICULTY LEVEL: Questions must be significantly harder (Level +1).
   - Move from simple recall to deep application, algorithmic analysis, and multi-step problem solving.
   - Test complex edge cases.
2. ENSURE COMPLETE NOVELTY: 
   - DO NOT use basic boilerplate questions.
   - Vary data structures, numerical constants, and problem contexts.
` : contextData.previousQuizRemarks?.difficultyTier === 'beginner' ?
            `
⚠️ STUDENT CLASSIFIED AS BEGINNER (<60% performance).
1. FOCUS ON FOUNDATIONS:
   - Provide clear, conceptual questions targeting weak areas to build mastery.
   - Emphasize foundational principles, core mechanics, and basic syntax.
` :
            `
⚠️ STUDENT CLASSIFIED AS INTERMEDIATE (60%-85% performance).
- Provide balanced conceptual and practical problem-solving questions.
`
        }
    `;

    try {
        // Try different models with API key in header (recommended method)
        const models = [
            'gemini-2.0-flash',
            'gemini-2.5-flash',
            'gemini-flash-latest',
            'gemini-pro-latest'
        ];

        let response = null;
        let lastError = null;

        for (const model of models) {
            try {
                // Use header method for API key (recommended by Google)
                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

                console.log(`Attempting Gemini API with model: ${model}`);

                response = await axios.post(
                    endpoint,
                    {
                        contents: [{ parts: [{ text: prompt }] }]
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'x-goog-api-key': apiKey
                        },
                        timeout: 60000 // 60 second timeout
                    }
                );

                console.log(`Successfully connected to Gemini API with model: ${model}`);
                break; // Success, exit loop
            } catch (error) {
                lastError = error;
                const status = error.response?.status;
                const statusText = error.response?.statusText;
                const errorData = error.response?.data;

                console.error(`Model ${model} failed:`, {
                    status,
                    statusText,
                    error: errorData?.error || errorData
                });

                // If it's a 401 (Auth Error), stop immediately as other models won't work either
                if (status === 401) {
                    throw error;
                }
                // For other errors (404, 429, 500), continue to next model
                continue;
            }
        }

        // If header method failed, try query parameter method as fallback
        if (!response) {
            console.log('Header method failed, trying query parameter method...');
            for (const model of ['gemini-pro', 'gemini-1.5-flash']) {
                try {
                    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

                    console.log(`Trying query parameter method with model: ${model}`);

                    response = await axios.post(
                        endpoint,
                        {
                            contents: [{ parts: [{ text: prompt }] }]
                        },
                        {
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            timeout: 60000
                        }
                    );

                    console.log(`Successfully connected using query parameter method with model: ${model}`);
                    break;
                } catch (error) {
                    lastError = error;
                    if (error.response?.status !== 404) {
                        throw error;
                    }
                }
            }
        }

        if (!response) {
            const errorDetails = lastError?.response?.data?.error || lastError?.response?.data || lastError?.message;
            console.error('All Gemini API methods failed. Last error:', errorDetails);
            throw lastError || new Error('Failed to connect to any Gemini API endpoint');
        }

        // Handle different response structures from Gemini API
        let textResponse = null;

        if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            textResponse = response.data.candidates[0].content.parts[0].text;
        } else if (response.data?.candidates?.[0]?.text) {
            textResponse = response.data.candidates[0].text;
        } else if (response.data?.text) {
            textResponse = response.data.text;
        }

        if (!textResponse) {
            console.error('Unexpected AI response structure:', JSON.stringify(response.data, null, 2));
            throw new Error('Empty or invalid response from AI service. Response structure may have changed.');
        }

        // Clean up markdown code blocks if present
        // Remove markdown code fences if present
        let cleanedResponse = textResponse.trim();
        if (cleanedResponse.startsWith('```json')) {
            cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedResponse.startsWith('```')) {
            cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        // Extract JSON object
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            console.error('Raw AI Response:', textResponse);
            throw new Error('Failed to parse JSON from AI response');
        }

        try {
            const parsed = JSON.parse(jsonMatch[0]);

            // Validate structure
            if (!parsed.quiz || !Array.isArray(parsed.quiz)) {
                throw new Error('AI response must contain a quiz array');
            }
            if (!parsed.remarks || typeof parsed.remarks !== 'object') {
                throw new Error('AI response must contain remarks object');
            }
            if (parsed.quiz.length !== 25) {
                throw new Error(`Quiz must contain exactly 25 questions, but received ${parsed.quiz.length}`);
            }

            return parsed;
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            console.error('Text to Parse:', jsonMatch[0]);
            throw new Error(`Failed to parse AI response: ${parseError.message}`);
        }
    } catch (error) {
        console.error('AI Generation Error Details:', {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            stack: error.stack
        });

        // Provide more specific error messages
        if (error.response) {
            // API returned an error response
            if (error.response.status === 400) {
                const errorMsg = error.response.data?.error?.message || 'Invalid request format';
                throw new Error(`Invalid request to AI service: ${errorMsg}. Please check your API key and request format.`);
            } else if (error.response.status === 401) {
                throw new Error('AI API authentication failed. Please check your GEMINI_API_KEY is valid and active.');
            } else if (error.response.status === 404) {
                const errorMsg = error.response.data?.error?.message || 'Model or endpoint not found';
                throw new Error(`AI API endpoint not found (404): ${errorMsg}. The model may not be available or the API endpoint has changed.`);
            } else if (error.response.status === 429) {
                throw new Error('AI API rate limit exceeded. Please try again later.');
            } else if (error.response.status >= 500) {
                throw new Error('AI service is temporarily unavailable. Please try again later.');
            } else {
                const errorMsg = error.response.data?.error?.message || error.response.statusText;
                throw new Error(`AI API error (${error.response.status}): ${errorMsg}`);
            }
        } else if (error.request) {
            // Request was made but no response received
            throw new Error('No response from AI service. Please check your internet connection and try again.');
        } else {
            // Error in setting up the request
            throw new Error(`Failed to generate quiz content: ${error.message}`);
        }
    }
};


const generateExamGuidance = async (contextData) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not defined');
    }

    // Calculate performance percentages for better analysis
    const enrichedData = contextData.map(item => {
        if (item.isCustom) {
            return {
                ...item,
                percentage: 'N/A',
                performanceLevel: 'Exploratory Learning'
            };
        }

        const percentage = (item.marksObtained / item.totalMarks) * 100;
        let performanceLevel = 'excellent';
        if (percentage < 50) performanceLevel = 'critical';
        else if (percentage < 60) performanceLevel = 'needs_improvement';
        else if (percentage < 75) performanceLevel = 'average';
        else if (percentage < 85) performanceLevel = 'good';

        return {
            ...item,
            percentage: Math.round(percentage),
            performanceLevel
        };
    });

    const prompt = `
You are an expert academic counselor and subject matter expert for engineering students.
Your role is to provide comprehensive, actionable guidance to help students improve their academic performance.

========================
STUDENT PERFORMANCE DATA
========================
${JSON.stringify(enrichedData, null, 2)}

========================
ANALYSIS REQUIREMENTS
========================
For EACH subject in the data, you must:

1. PERFORMANCE ANALYSIS:
   - Calculate and analyze the current score percentage (SKIP for "Exploratory Learning")
   - Determine performance status: "Excellent" (>85%), "Good" (75-85%), "Average" (60-75%), "Needs Improvement" (50-60%), "Critical Attention" (<50%)
   - Identify specific strengths and weaknesses based on marks obtained
   - **CRITICAL EXCEPTION**: If performanceLevel is "Exploratory Learning", ignore score analysis. Focus 100% on the requesting "topic" provided in the data.

2. FOCUS AREAS ANALYSIS:
   - If "focusAreas" field contains data, these are WEAK AREAS identified by teachers
   - These areas MUST be prioritized in your guidance
   - If focusAreas is empty or null, analyze based on the low score percentage
   - **CRITICAL EXCEPTION**: If "isCustom" is true, the "topic" field IS the focus area. Build the entire guidance around mastering this topic.

3. REMARKS ANALYSIS:
   - If "remarks" field contains teacher feedback, incorporate it into your advice
   - Use teacher feedback to understand specific issues

4. DETAILED GUIDANCE GENERATION:
   For each subject, provide:
   a) Current Status Assessment (2-3 sentences)
   b) Specific Improvement Advice (4-5 actionable points)
   c) Study Plan Recommendations (weekly/daily plan)
   d) Resource Suggestions (topics to focus on, concepts to review)
   e) 3 Practice Problems targeting weak areas (with detailed solutions)

========================
OUTPUT FORMAT (STRICT JSON)
========================
Return ONLY a valid JSON object with this exact structure:

{
  "guidance": [
    {
      "subject": "Exact subject name from input",
      "currentStatus": "Excellent | Good | Average | Needs Improvement | Critical Attention",
      "performancePercentage": <number>,
      "strengths": ["Strength 1", "Strength 2"],
      "weakAreas": ["Weak area 1", "Weak area 2"],
      "advice": "Comprehensive 4-5 paragraph advice covering: current performance analysis, specific improvement strategies, study plan, and resource recommendations. Make it detailed and actionable.",
      "studyPlan": {
        "weekly": ["Week 1: Focus on...", "Week 2: Practice..."],
        "daily": ["Day 1-2: Review...", "Day 3-4: Practice..."]
      },
      "practiceProblems": [
        {
          "problem": "Detailed problem statement targeting weak areas. For programming subjects, include code snippets. For math, include equations.",
          "solution": "Step-by-step detailed solution with explanations. For code, include complete working code with comments."
        },
        {
          "problem": "Second problem",
          "solution": "Detailed solution"
        },
        {
          "problem": "Third problem",
          "solution": "Detailed solution"
        }
      ],
      "recommendedTopics": ["Topic 1", "Topic 2", "Topic 3"],
      "targetScore": "Suggested target score for next assessment"
    }
  ]
}

========================
CRITICAL INSTRUCTIONS
========================
- Output MUST be valid JSON (no markdown, no code blocks)
- Subject names must match input EXACTLY
- If focusAreas exist, problems MUST target those specific areas
- Advice must be specific, actionable, and detailed (not generic)
- Problems should be university-level and relevant to the subject
- Solutions must be comprehensive with step-by-step explanations
- For programming subjects (C Programming, DSA, etc.), include actual code
- For mathematics/engineering subjects, include formulas and calculations
- Make guidance personalized based on actual performance data

Generate the guidance now.
`;

    try {
        // Try multiple models with header method first
        const models = ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-flash-latest'];
        let response = null;
        let lastError = null;

        for (const model of models) {
            try {
                const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

                console.log(`Generating guidance with model: ${model}`);

                response = await axios.post(
                    endpoint,
                    { contents: [{ parts: [{ text: prompt }] }] },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'x-goog-api-key': apiKey
                        },
                        timeout: 90000 // 90 seconds for detailed guidance
                    }
                );

                console.log(`Successfully generated guidance with model: ${model}`);
                break;
            } catch (error) {
                lastError = error;
                if (error.response?.status === 401) {
                    throw error; // Auth failed, no point retrying
                }

                // Try query parameter method as fallback for this model before moving to next model
                try {
                    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                    response = await axios.post(
                        endpoint,
                        { contents: [{ parts: [{ text: prompt }] }] },
                        { headers: { 'Content-Type': 'application/json' }, timeout: 90000 }
                    );
                    console.log(`Successfully generated guidance using query parameter method with model: ${model}`);
                    break;
                } catch (fallbackError) {
                    lastError = fallbackError;
                    // Prepare to try next model in the outer loop
                    console.warn(`Fallback method failed for ${model}, trying next model...`);
                }
            }
        }

        if (!response) {
            throw lastError || new Error('Failed to connect to AI service');
        }

        let textResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textResponse) {
            throw new Error('Empty response from AI service');
        }

        // Clean markdown code blocks
        let cleanedResponse = textResponse.trim();
        if (cleanedResponse.startsWith('```json')) {
            cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedResponse.startsWith('```')) {
            cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        // Extract JSON object
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('Raw AI Response:', textResponse);
            throw new Error('Failed to parse JSON from AI response');
        }

        let parsed = JSON.parse(jsonMatch[0]);

        // Robustness: Handle if AI returns array directly instead of object with guidance key
        if (Array.isArray(parsed)) {
            console.log('AI returned array directly, wrapping in guidance object');
            parsed = { guidance: parsed };
        } else if (parsed.guidance && Array.isArray(parsed.guidance)) {
            // Correct structure, do nothing
        } else {
            // Attempt to find any array property
            const keys = Object.keys(parsed);
            const arrayKey = keys.find(k => Array.isArray(parsed[k]));
            if (arrayKey) {
                console.log(`AI returned object with key '${arrayKey}', mapping to guidance`);
                parsed = { guidance: parsed[arrayKey] };
            }
        }

        // Validate structure
        if (!parsed.guidance || !Array.isArray(parsed.guidance)) {
            console.error('Invalid AI Response Structure:', JSON.stringify(parsed, null, 2));
            throw new Error('AI response must contain a guidance array');
        }

        // Validate each guidance item has required fields
        parsed.guidance.forEach((item, idx) => {
            if (!item.subject || !item.advice) {
                throw new Error(`Guidance item ${idx + 1} is missing required fields`);
            }
        });

        return parsed;
    } catch (error) {
        console.error('AI Guidance Generation Error:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
        });
        throw new Error(`Failed to generate guidance: ${error.message}`);
    }
};

module.exports = { generateQuiz, generateExamGuidance };
