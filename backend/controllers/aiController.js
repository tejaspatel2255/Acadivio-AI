const axios = require('axios');

function getApiKey() {
    const apiKey = process.env.GEMINI_API_KEY;
    return apiKey && String(apiKey).trim() ? String(apiKey).trim() : null;
}

function cleanJsonishText(text) {
    if (!text) return '';
    let cleaned = String(text).trim();
    cleaned = cleaned.replace(/```json/gi, '```');
    cleaned = cleaned.replace(/```/g, '').trim();
    return cleaned;
}

function extractFirstJson(text) {
    const cleaned = cleanJsonishText(text);
    const match = cleaned.match(/\{[\s\S]*\}/);
    return match ? match[0] : null;
}

function getModelFallbackList() {
    // Keep aligned with backend/utils/ai.js (known-working in this repo)
    return [
        'gemini-2.5-flash',
        'gemini-2.5-pro',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-pro'
    ];
}

function extractGeminiText(data) {
    const parts = data?.candidates?.[0]?.content?.parts;
    if (Array.isArray(parts)) {
        return parts.map(p => p?.text).filter(Boolean).join('').trim();
    }
    const fallback = data?.candidates?.[0]?.text || data?.text;
    return fallback ? String(fallback).trim() : '';
}

function containsAnswerLeak(text) {
    const t = String(text || '');
    // Guard against common answer-reveal phrasing + option-letter reveals
    return (
        /\b(the\s+answer\s+is|correct\s+answer|correct\s+option|option\s+[A-D]\b|answer\s*[:\-]\s*[A-D]\b)\b/i.test(t) ||
        /\b(it'?s|it\s+is)\s*(option\s*)?[A-D]\b/i.test(t)
    );
}

async function generateGeminiText({ prompt, temperature = 0.4, timeoutMs = 30000 }) {
    const apiKey = getApiKey();
    if (!apiKey) {
        const err = new Error('Missing GEMINI_API_KEY');
        err.code = 'NO_API_KEY';
        throw err;
    }

    const models = getModelFallbackList();
    let lastErr = null;

    for (const model of models) {
        try {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

            const resp = await axios.post(
                endpoint,
                {
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature }
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-goog-api-key': apiKey
                    },
                    timeout: timeoutMs
                }
            );

            const text = extractGeminiText(resp.data);
            if (!text) throw new Error('Empty response from AI service');
            return { text, modelUsed: model };
        } catch (err) {
            lastErr = err;
            const status = err?.response?.status;
            const msg = err?.response?.data?.error?.message || err?.message || String(err);
            console.error(`[AI] Model ${model} failed`, { status, msg });

            // If not model-not-found, still try next model; we'll throw at the end.
            continue;
        }
    }

    throw lastErr || new Error('Failed to connect to AI service');
}

/**
 * @desc    Ask AI for help/context
 * @route   POST /api/ai/ask
 * @access  Private
 */
exports.askAI = async (req, res) => {
    try {
        const { question, context } = req.body;

        if (!question) {
            return res.status(400).json({ msg: 'Please provide a question' });
        }

        const prompt = `
You are Acadivio AI's Academic Assistant.
1. IF the user asks about the specific "Context" (quiz question) provided below:
   - Your goal is to give the **BEST 5 POINTS** to help a student understand the specific topic.
   - **Format**: Numbered list of exactly 5 points.
   - **Constraint**: Do NOT reveal the answer choices or specific solution.
   - **Tone**: Educational, encouraging, and clear.

2. IF the user asks a GENERAL question (unrelated to the specific context options) or asks "out of question":
   - Answer the question directly and helpfully like a normal tutor.
   - You do NOT need to follow the 5-point format.
   - Be concise and clear.

Topic/Question:
${question}

Context:
${context || 'General conversation'}
`.trim();

        // First attempt
        let { text } = await generateGeminiText({ prompt, temperature: 0.4 });

        // Hard constraint: never reveal the answer. If it leaks, force rewrite once.
        if (containsAnswerLeak(text)) {
            const rewritePrompt = `
You MUST rewrite the following response to remove ANY answer reveal.
Rules:
- Do NOT mention the correct answer
- Do NOT mention option letters (A/B/C/D)
- Do NOT confirm correctness
- Only explain the concept and provide hints/steps

Original response:
${text}
`.trim();

            try {
                const rewritten = await generateGeminiText({ prompt: rewritePrompt, temperature: 0.2 });
                text = rewritten.text;
            } catch {
                // ignore and fall through to final guard
            }
        }

        if (containsAnswerLeak(text)) {
            text =
                'I can help you understand the concept behind this question, but I can’t give the exact answer. ' +
                'Tell me what you already know about the topic and I’ll guide you step-by-step.';
        }

        res.json({ answer: text });
    } catch (err) {
        const status = err?.response?.status;
        const msg = err?.response?.data?.error?.message || err?.message || 'Failed to get AI response';
        console.error('AI ask Error:', { status, msg });

        if (err?.code === 'NO_API_KEY') {
            return res.status(500).json({ msg: 'AI service not configured (missing GEMINI_API_KEY)' });
        }

        if (status === 401) {
            return res.status(500).json({ msg: 'AI API authentication failed. Please check GEMINI_API_KEY.' });
        }
        if (status === 429) {
            return res.status(500).json({ msg: 'AI API rate limit exceeded. Please try again later.' });
        }
        if (status === 404) {
            return res.status(500).json({ msg: 'AI model is not available for this API key.' });
        }

        res.status(500).json({ msg: 'Failed to get AI response' });
    }
};

/**
 * @desc    Grade essay/long answer
 * @route   POST /api/ai/grade
 * @access  Private (Teacher/System)
 */
exports.gradeEssay = async (req, res) => {
    try {
        const { question, answer, rubric } = req.body;

        if (!question || !answer) {
            return res.status(400).json({ msg: 'Please provide question and answer' });
        }

        const prompt = `
You are an AI grader for student long-form answers.

Grade on:
- Grammar (0-100)
- Clarity (0-100)
- Factual accuracy (0-100)
- Relevance/completeness based on rubric

Return STRICT JSON with exactly these keys:
{
  "score": <integer 0-100>,
  "grammar": <integer 0-100>,
  "clarity": <integer 0-100>,
  "factualAccuracy": <integer 0-100>,
  "strengths": [<string>, ...],
  "improvements": [<string>, ...],
  "feedback": <string>
}

Question:
${question}

Rubric:
${rubric || 'Grade based on accuracy, clarity, and relevance.'}

Student answer:
${answer}
`.trim();

        const { text } = await generateGeminiText({ prompt, temperature: 0.2, timeoutMs: 45000 });

        const jsonText = extractFirstJson(text) || cleanJsonishText(text);
        try {
            const parsed = JSON.parse(jsonText);
            res.json(parsed);
        } catch (parseError) {
            // Fallback: return the raw feedback
            res.json({
                score: 0,
                grammar: 0,
                clarity: 0,
                factualAccuracy: 0,
                strengths: [],
                improvements: [],
                feedback: cleanJsonishText(text)
            });
        }

    } catch (err) {
        console.error('AI Grade Error:', err);
        res.status(500).json({ msg: 'Failed to grade essay' });
    }
};

// Internal helper (server-side grading during quiz submit)
exports._gradeFreeResponseInternal = async ({ questionText, studentAnswer, rubric }) => {
    if (!getApiKey()) {
        return { score: 0, grammar: 0, clarity: 0, factualAccuracy: 0, feedback: 'AI not configured' };
    }
    const prompt = `
You are grading a student's free-response answer.
Return STRICT JSON with keys:
{
  "score": <integer 0-100>,
  "grammar": <integer 0-100>,
  "clarity": <integer 0-100>,
  "factualAccuracy": <integer 0-100>,
  "feedback": <string>
}

Question:
${questionText}

Rubric:
${rubric || 'Grade based on accuracy, clarity, relevance, and correctness.'}

Student answer:
${studentAnswer}
`.trim();

    const { text } = await generateGeminiText({ prompt, temperature: 0.2, timeoutMs: 45000 });

    const jsonText = extractFirstJson(text) || cleanJsonishText(text);
    try {
        return JSON.parse(jsonText);
    } catch {
        return {
            score: 0,
            grammar: 0,
            clarity: 0,
            factualAccuracy: 0,
            feedback: cleanJsonishText(text)
        };
    }
};
