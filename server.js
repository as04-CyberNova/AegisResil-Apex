import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  SCAM_ANALYZER_SYSTEM_PROMPT,
  SCAM_RESPONSE_SCHEMA,
  RESUME_SCORER_SYSTEM_PROMPT,
  RESUME_RESPONSE_SCHEMA,
  COMPANY_TRUST_SYSTEM_PROMPT,
  COMPANY_TRUST_RESPONSE_SCHEMA,
  CAREER_ROADMAP_SYSTEM_PROMPT,
  CAREER_ROADMAP_RESPONSE_SCHEMA,
  INTERNSHIP_MATCH_SYSTEM_PROMPT,
  INTERNSHIP_MATCH_RESPONSE_SCHEMA,
  INTERVIEW_PREP_SYSTEM_PROMPT,
  INTERVIEW_PREP_RESPONSE_SCHEMA,
  INTERVIEW_FEEDBACK_SYSTEM_PROMPT,
  INTERVIEW_FEEDBACK_RESPONSE_SCHEMA,
  MOCK_INTERVIEW_SYSTEM_PROMPT,
  MOCK_EVALUATION_SYSTEM_PROMPT,
  MOCK_EVALUATION_RESPONSE_SCHEMA,
  SKILL_LESSON_SYSTEM_PROMPT,
  SKILL_LESSON_RESPONSE_SCHEMA,
  COVER_LETTER_SYSTEM_PROMPT,
  COVER_LETTER_RESPONSE_SCHEMA,
  PROFILE_OPTIMIZER_SYSTEM_PROMPT,
  PROFILE_OPTIMIZER_RESPONSE_SCHEMA,
  POST_OPTIMIZER_SYSTEM_PROMPT,
  POST_OPTIMIZER_RESPONSE_SCHEMA,
  // LinkedIn Intelligence Suite
  BRAND_VOICE_FORGE_SYSTEM_PROMPT,
  BRAND_VOICE_FORGE_RESPONSE_SCHEMA,
  RECRUITER_RADAR_SYSTEM_PROMPT,
  RECRUITER_RADAR_RESPONSE_SCHEMA,
  LINKEDIN_SCAM_SHIELD_SYSTEM_PROMPT,
  LINKEDIN_SCAM_SHIELD_RESPONSE_SCHEMA,
  POST_MOMENTUM_PREDICTOR_SYSTEM_PROMPT,
  POST_MOMENTUM_PREDICTOR_RESPONSE_SCHEMA,
  OUTREACH_FORGE_SYSTEM_PROMPT,
  OUTREACH_FORGE_RESPONSE_SCHEMA,
  COMMENT_INTELLIGENCE_SYSTEM_PROMPT,
  COMMENT_INTELLIGENCE_RESPONSE_SCHEMA,
  CONTENT_RUNWAY_SYSTEM_PROMPT,
  CONTENT_RUNWAY_RESPONSE_SCHEMA,
  BIO_STORY_BUILDER_SYSTEM_PROMPT,
  BIO_STORY_BUILDER_RESPONSE_SCHEMA
} from './prompts.js';


// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' })); // Support larger text inputs if needed
app.use(express.static('public'));

// Status endpoint to check if server is in Demo Mode
app.get('/api/status', (req, res) => {
  res.json({ isDemo: !hasApiKey });
});

// Check API key configuration
const hasApiKey = process.env.GEMINI_API_KEY && 
                    process.env.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE' && 
                    process.env.GEMINI_API_KEY.trim() !== '';

if (!hasApiKey) {
  console.warn('\x1b[33m%s\x1b[0m', '⚠️ WARNING: GEMINI_API_KEY is not set or is using the placeholder in .env.');
  console.warn('\x1b[33m%s\x1b[0m', 'The server will run in "Demo Mode" with simulated responses. Set a valid key to enable real AI analysis.');
}

// Initialize Gemini API
let genAI = null;
if (hasApiKey) {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}

/**
 * Helper to query Gemini with specific system prompts and structured schemas
 */
async function queryGemini(systemPrompt, userPrompt, responseSchema) {
  if (!genAI) {
    throw new Error('API_KEY_MISSING');
  }

  // We use gemini-2.5-flash as the fast, lightweight standard model
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemPrompt,
  });

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: responseSchema,
      temperature: 0.2, // Low temperature for high objectivity and consistency
    },
  });

  const responseText = result.response.text();
  return JSON.parse(responseText);
}

/**
 * Route: Scam / Message Analyzer
 */
app.post('/api/analyze-scam', async (req, res) => {
  const { text } = req.body;

  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Text input is required' });
  }

  // --- DEMO MODE FALLBACK ---
  if (!hasApiKey) {
    const textLower = text.toLowerCase();
    let risk_score = 15;
    let risk_level = 'LOW';
    let red_flags = [];
    let recommendation = 'This message appears typical. However, always verify recruiter identities and cross-reference jobs on company sites before sharing sensitive information.';

    if (textLower.includes('telegram') || textLower.includes('whatsapp') || textLower.includes('signal') || textLower.includes('chat') || textLower.includes('crypto')) {
      risk_score = 85;
      risk_level = 'HIGH';
      red_flags.push('Urgent communication requested via encrypted messaging apps (Telegram/WhatsApp)');
      red_flags.push('Lack of official recruiter email matching the company domain');
      recommendation = 'DO NOT proceed. Real companies rarely conduct recruitment or extend offers exclusively over Telegram or WhatsApp. Block the sender and report the listing.';
    } else if (textLower.includes('fee') || textLower.includes('payment') || textLower.includes('training cost') || textLower.includes('upfront') || textLower.includes('check')) {
      risk_score = 95;
      risk_level = 'HIGH';
      red_flags.push('Requires payment or check deposit for training, software, or office supplies');
      recommendation = 'CRITICAL DANGER. Legitimate employers will never ask you to pay for equipment or training, nor will they send you a check to buy tools. Immediately cut contact.';
    } else if (textLower.includes('urgent') || textLower.includes('immediate start') || textLower.includes('no experience') || textLower.includes('great pay')) {
      risk_score = 55;
      risk_level = 'MEDIUM';
      red_flags.push('High-pressure tactics requiring immediate acceptance');
      red_flags.push('Compensation seems unusually high for the level of experience required');
      recommendation = 'Proceed with extreme caution. Ask for formal contracts, verify the sender on LinkedIn, and perform a lookup of the parent organization. Do not share banking details.';
    }

    return res.json({
      isDemo: true,
      risk_score,
      risk_level,
      red_flags,
      recommendation
    });
  }
  // --------------------------

  try {
    const result = await queryGemini(SCAM_ANALYZER_SYSTEM_PROMPT, text, SCAM_RESPONSE_SCHEMA);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/analyze-scam:', error);
    res.status(500).json({
      error: 'Failed to analyze text using Gemini API',
      details: error.message
    });
  }
});

/**
 * Route: Resume Scorer
 */
app.post('/api/score-resume', async (req, res) => {
  const { text } = req.body;

  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Resume text content is required' });
  }

  // --- DEMO MODE FALLBACK ---
  if (!hasApiKey) {
    const textLower = text.toLowerCase();
    let overall_score = 65;
    let ats_compatibility_notes = [
      'Demo Mode warning: This is simulated feedback based on text length.',
    ];
    let missing_keywords = ['CI/CD', 'Unit Testing', 'System Design'];
    let suggestions = [
      'Quantify results: Replace descriptions like "helped build dashboard" with "Designed dashboard UI, improving client usage by 25%".',
      'Optimize layout: Standardize section headings (e.g. "Work Experience", "Education") to ensure ease of parsing.',
      'Add a summary: Insert a short profile summary at the top outlining your technical focus.'
    ];

    if (text.length > 2000) {
      overall_score = 82;
      ats_compatibility_notes.push('Good layout length. Section hierarchy appears clear.');
      missing_keywords = ['Docker', 'Cloud Infrastructure'];
    } else {
      overall_score = 52;
      ats_compatibility_notes.push('Extremely short resume content detected. Ensure you do not leave out major sections.');
      suggestions.push('Add project section: Detail 2-3 technical projects showcasing your skills.');
    }

    return res.json({
      isDemo: true,
      overall_score,
      ats_compatibility_notes,
      missing_keywords,
      suggestions
    });
  }
  // --------------------------

  try {
    const result = await queryGemini(RESUME_SCORER_SYSTEM_PROMPT, text, RESUME_RESPONSE_SCHEMA);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/score-resume:', error);
    res.status(500).json({
      error: 'Failed to score resume using Gemini API',
      details: error.message
    });
  }
});

/**
 * Route: Company Trust Analyzer (Feature 3)
 */
app.post('/api/analyze-company', async (req, res) => {
  const { companyName, websiteUrl, jobText } = req.body;

  if (!companyName || companyName.trim() === '') {
    return res.status(400).json({ error: 'Company name is required' });
  }

  const userPrompt = `
  Company Name: ${companyName}
  Website URL: ${websiteUrl || 'Not provided'}
  Job Description Text: ${jobText || 'Not provided'}
  `;

  // --- DEMO MODE FALLBACK ---
  if (!hasApiKey) {
    const nameLower = companyName.toLowerCase();
    const textLower = (jobText || '').toLowerCase();
    let trust_score = 88;
    let confidence_level = 'MEDIUM';
    let signals_checked = ['Company name query', 'Common phishing naming formats'];
    let caveats = [
      'Demo Mode notice: This is simulated data.',
      'This is an AI evaluation, not an official registry/WHOIS verification. Manually verify via corporate registries, LinkedIn, or phone.'
    ];
    let recommendation = 'This company name appears legitimate. Verify listings on LinkedIn or the official company careers page before submitting details.';

    if (nameLower.includes('virtual') || nameLower.includes('helper') || nameLower.includes('global pay') || nameLower.includes('easy income') || nameLower.includes('cash flow') || textLower.includes('telegram')) {
      trust_score = 22;
      confidence_level = 'MEDIUM';
      signals_checked.push('Scam keyword profile detection');
      caveats.push('The company name or associated job text matches common patterns used in remote hiring scams.');
      recommendation = 'CRITICAL CAUTION. This company matches typical remote task scams. We advise against sending any personal information or applications.';
    }

    return res.json({
      isDemo: true,
      trust_score,
      confidence_level,
      signals_checked,
      caveats,
      recommendation,
      search_grounded: false,
      search_citations: []
    });
  }
  // --------------------------

  try {
    let responseText;
    let searchGrounded = false;
    let searchCitations = [];

    try {
      // Create model with Google Search Grounding tool enabled
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: COMPANY_TRUST_SYSTEM_PROMPT,
      });

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: COMPANY_TRUST_RESPONSE_SCHEMA,
          temperature: 0.2,
        },
        tools: [{ googleSearch: {} }] // Enable Google Search
      });

      responseText = result.response.text();
      searchGrounded = true;

      // Extract search citations from groundingMetadata
      const metadata = result.response.groundingMetadata || result.response.candidates?.[0]?.groundingMetadata;
      if (metadata && metadata.groundingChunks) {
        searchCitations = metadata.groundingChunks
          .map(chunk => chunk.web)
          .filter(web => web && web.uri && web.title)
          .map(web => ({ uri: web.uri, title: web.title }));
      }
    } catch (groundingError) {
      console.warn('Gemini search grounding failed, falling back to standard reasoning:', groundingError.message);
      // Fallback: standard query without Google Search tool
      const fallbackResult = await queryGemini(COMPANY_TRUST_SYSTEM_PROMPT, userPrompt, COMPANY_TRUST_RESPONSE_SCHEMA);
      return res.json({
        ...fallbackResult,
        search_grounded: false,
        search_citations: []
      });
    }

    const parsed = JSON.parse(responseText);
    res.json({
      ...parsed,
      search_grounded: searchGrounded,
      search_citations: searchCitations
    });
  } catch (error) {
    console.error('Error in /api/analyze-company:', error);
    res.status(500).json({
      error: 'Failed to analyze company legitimacy using Gemini API',
      details: error.message
    });
  }
});

/**
 * Route: Career Roadmap Generator (Feature 4)
 */
app.post('/api/generate-roadmap', async (req, res) => {
  const { skillLevel, targetRole, resumeText, timelineMonths } = req.body;

  if (!targetRole || targetRole.trim() === '') {
    return res.status(400).json({ error: 'Target role is required' });
  }

  const duration = timelineMonths ? parseInt(timelineMonths, 10) : 3;
  const userPrompt = `
  Target Role: ${targetRole}
  Skill Level: ${skillLevel || 'beginner'}
  Timeline requested: ${duration} months
  Resume context: ${resumeText || 'None provided'}
  `;

  // --- DEMO MODE FALLBACK ---
  if (!hasApiKey) {
    const roadmap = [];
    for (let i = 1; i <= duration; i++) {
      roadmap.push({
        month: i,
        focus_area: `Month ${i}: Core Foundations & Industry Standards`,
        tasks: [
          `Set up study plan for ${targetRole} roadmap`,
          `Learn foundational concept ${i} for ${skillLevel || 'beginner'} level`,
          `Implement a mini project applying this month's learnings`
        ],
        resources: [
          `Free documentation for ${targetRole}`,
          `Online tutorials for ${skillLevel || 'beginner'} learners`
        ]
      });
    }

    return res.json({
      isDemo: true,
      roadmap,
      estimated_timeline_months: duration,
      key_milestones: [
        `Complete foundational coding exercises by Month 1`,
        `Build a working portfolio project by Month 2`,
        `Start applying for junior openings by Month ${duration}`
      ]
    });
  }
  // --------------------------

  try {
    const result = await queryGemini(CAREER_ROADMAP_SYSTEM_PROMPT, userPrompt, CAREER_ROADMAP_RESPONSE_SCHEMA);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/generate-roadmap:', error);
    res.status(500).json({
      error: 'Failed to generate career roadmap using Gemini API',
      details: error.message
    });
  }
});

/**
 * Route: Internship Match Score (Feature 5)
 */
app.post('/api/match-internship', async (req, res) => {
  const { jobDescription, resumeText, skillsText } = req.body;

  if (!jobDescription || jobDescription.trim() === '') {
    return res.status(400).json({ error: 'Job/internship description is required' });
  }

  const userPrompt = `
  Internship / Job Description:
  ${jobDescription}

  Student Skills Profile:
  ${skillsText || 'None provided'}

  Student Resume Context:
  ${resumeText || 'None provided'}
  `;

  // --- DEMO MODE FALLBACK ---
  if (!hasApiKey) {
    let match_score = 45;
    let matched_skills = ['HTML', 'CSS', 'JavaScript'];
    let skill_gaps = ['Docker', 'Database Indexing', 'API Security principles'];
    let recommendation = 'You meet some core frontend requirements, but are missing key backend and infrastructure skills. Focus on building and listing database skills before applying.';

    if (resumeText && resumeText.length > 1000) {
      match_score = 78;
      matched_skills.push('Git', 'Node.js', 'Express');
      skill_gaps = ['AWS Deployment', 'Redux/Context API'];
      recommendation = 'Strong match! You meet most technical criteria. We recommend applying. Highlight your Node.js experience in your cover letter.';
    }

    return res.json({
      isDemo: true,
      match_score,
      matched_skills,
      skill_gaps,
      recommendation
    });
  }
  // --------------------------

  try {
    const result = await queryGemini(INTERNSHIP_MATCH_SYSTEM_PROMPT, userPrompt, INTERNSHIP_MATCH_RESPONSE_SCHEMA);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/match-internship:', error);
    res.status(500).json({
      error: 'Failed to compute internship match score using Gemini API',
      details: error.message
    });
  }
});

/**
 * Route: Interview Preparation (Feature 6)
 */
app.post('/api/prep-interview', async (req, res) => {
  const { targetRole, jobDescription } = req.body;

  if (!targetRole || targetRole.trim() === '') {
    return res.status(400).json({ error: 'Target role is required' });
  }

  const userPrompt = `
  Target Role: ${targetRole}
  Job Description (Optional): ${jobDescription || 'None provided'}
  `;

  // --- DEMO MODE FALLBACK ---
  if (!hasApiKey) {
    return res.json({
      isDemo: true,
      questions: [
        {
          question: `Can you describe your experience with technologies related to the ${targetRole} position?`,
          category: 'technical',
          tip: 'Focus on explaining the stack you used in projects and why you chose it. Keep it structured (what you did, what tools you used, and what was the result).'
        },
        {
          question: 'Tell me about a time you faced a technical challenge in a project. How did you resolve it?',
          category: 'behavioral',
          tip: 'Use the STAR method: Situation (project context), Task (challenge faced), Action (your specific debugging steps), and Result (successful outcome).'
        },
        {
          question: 'How do you keep up to date with new developments and tech trends in your field?',
          category: 'behavioral',
          tip: 'Mention newsletters, technical blogs, podcasts, open source contributions, or personal study projects.'
        },
        {
          question: 'What is your approach to testing and ensuring code quality in your applications?',
          category: 'technical',
          tip: 'Mention unit testing frameworks, code linting, automated pipelines, and manual testing techniques.'
        }
      ],
      prep_roadmap: [
        'Review the job description and highlight key required skills',
        `Prepare 2 behavioral examples tailored to ${targetRole} responsibilities`,
        'Set up a quiet interview room and check webcam/audio inputs'
      ]
    });
  }
  // --------------------------

  try {
    const result = await queryGemini(INTERVIEW_PREP_SYSTEM_PROMPT, userPrompt, INTERVIEW_PREP_RESPONSE_SCHEMA);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/prep-interview:', error);
    res.status(500).json({
      error: 'Failed to generate interview prep materials using Gemini API',
      details: error.message
    });
  }
});

/**
 * Route: Interview Practice Answer Grader (Feature 6 Playground)
 */
app.post('/api/grade-answer', async (req, res) => {
  const { question, targetRole, jobDescription, answer } = req.body;

  if (!question || !answer || answer.trim() === '') {
    return res.status(400).json({ error: 'Both question and answer text are required' });
  }

  const userPrompt = `
  Target Role: ${targetRole || 'Not specified'}
  Job Description: ${jobDescription || 'None provided'}
  Interview Question: ${question}
  Student's Practice Answer: ${answer}
  `;

  // --- DEMO MODE FALLBACK ---
  if (!hasApiKey) {
    let score = 55;
    let strengths = ['The answer directly addresses the prompt.'];
    let improvements = [
      'Demo Mode feedback: Try giving a longer, more structured response.',
      'Incorporate the STAR framework: Situation, Task, Action, Result.',
      'Add metrics: Quantify your results (e.g. "improved load times by 20%").'
    ];
    let sample_answer = 'I faced a challenge when our frontend API requests were slow. I diagnosed that we made redundant queries. By implementing local caching in app.js, I cut network requests by 40% and improved visual load speed.';

    if (answer.length > 250) {
      score = 82;
      strengths.push('Good detail and explanation of steps taken.');
      improvements = ['Ensure you link your results to the primary goals of the project.'];
    }

    return res.json({
      isDemo: true,
      score,
      strengths,
      improvements,
      sample_answer
    });
  }
  // --------------------------

});

// --- PHASE 3: SECURE CONFIG & MOCK INTERVIEW SIMULATOR ROUTES ---

/**
 * Route: Get client-side Firebase configurations securely
 */
app.get('/api/firebase-config', (req, res) => {
  const enabled = !!(
    process.env.FIREBASE_API_KEY &&
    process.env.FIREBASE_API_KEY.trim() !== ''
  );
  
  if (enabled) {
    res.json({
      enabled: true,
      config: {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID
      }
    });
  } else {
    res.json({ enabled: false });
  }
});

/**
 * Route: Mock Interview Simulator Turn
 */
app.post('/api/simulator/turn', async (req, res) => {
  const { history, message } = req.body;

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message payload is required' });
  }

  // --- DEMO MODE FALLBACK ---
  if (!hasApiKey) {
    const chatLength = history ? history.length : 0;
    let reply = '';

    if (chatLength === 0) {
      reply = "Welcome! Thank you for joining today's mock interview. To start off, could you tell me about a challenging technical project you worked on recently and what role you played in it?";
    } else if (chatLength === 2) {
      reply = "Excellent. Working on that system sounds like it required careful planning. How did you decide on the technical stack and what database architecture did you choose?";
    } else if (chatLength === 4) {
      reply = "That database choice makes sense for scale. Moving on to some behavioral aspects: tell me about a time when you had a disagreement with a team member or class partner. How did you resolve it?";
    } else {
      reply = "Conflict resolution is vital for healthy collaboration. Finally, where do you see your technical skills growing over the next 12 months, and what is your strategy for learning them?\n[CONCLUDE]";
    }

    return res.json({ reply });
  }
  // --------------------------

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: MOCK_INTERVIEW_SYSTEM_PROMPT
    });

    // Initialize chat session on the model
    const chat = model.startChat({
      history: history || []
    });

    const result = await chat.sendMessage(message);
    const reply = result.response.text();

    res.json({ reply });
  } catch (error) {
    console.error('Error in /api/simulator/turn:', error);
    res.status(500).json({
      error: 'Failed to process interview turn using Gemini API',
      details: error.message
    });
  }
});

/**
 * Route: Evaluate Mock Interview Transcript
 */
app.post('/api/simulator/evaluate', async (req, res) => {
  const { history } = req.body;

  if (!history || history.length === 0) {
    return res.status(400).json({ error: 'Interview history transcript is required' });
  }

  // --- DEMO MODE FALLBACK ---
  if (!hasApiKey) {
    return res.json({
      overall_score: 88,
      technical_depth: "A-",
      communication_clarity: "A",
      strengths: [
        "Demonstrated solid understanding of backend replication design principles.",
        "Used structured metrics-oriented phrasing when explaining conflict resolution."
      ],
      improvements: [
        "Could elaborate more on specific latency metrics and scale boundaries of database indexes."
      ],
      qa_review: [
        {
          question: "Could you tell me about a challenging technical project you worked on recently and what role you played in it?",
          answer: history[1] ? history[1].parts[0].text : "I worked on a student dashboard app and led backend replication logic.",
          score: 82,
          critique: "Solid role description, though adding more technical details about the replication protocols used would strengthen the response.",
          model_answer: "In my recent project, a collaborative student portal, I designed the backend syncing schema. I used PostgreSQL replication slots to keep data consistent across nodes, which reduced system downtime by 15%."
        },
        {
          question: "How did you decide on the technical stack and what database architecture did you choose?",
          answer: history[3] ? history[3].parts[0].text : "We chose Node.js and MongoDB because it is fast and supports JSON objects.",
          score: 85,
          critique: "Correct stack selection rationale. Good awareness of document database schemas.",
          model_answer: "We selected a Node/MongoDB stack due to the unstructured format of student telemetry logs. This document schema cut schema migration cycles down to zero."
        },
        {
          question: "Tell me about a time when you had a disagreement with a team member or class partner. How did you resolve it?",
          answer: history[5] ? history[5].parts[0].text : "We disagreed on using React vs Vue. I proposed a benchmark test and we went with Vue based on performance data.",
          score: 92,
          critique: "Excellent use of objective benchmarking data to resolve disputes. Displays strong professionalism.",
          model_answer: "When my partner disagreed on the framework, I organized a 1-day proof-of-concept benchmark measuring initial render latencies. This objective performance review allowed us to align on Vue unanimously."
        },
        {
          question: "Where do you see your technical skills growing over the next 12 months, and what is your strategy for learning them?",
          answer: history[7] ? history[7].parts[0].text : "I want to learn cloud systems like AWS by building real projects.",
          score: 90,
          critique: "Ambitious and realistic learning roadmap. Projects are indeed the best way to grasp AWS concepts.",
          model_answer: "I aim to earn the AWS Developer certification. My strategy includes migrating our student portal to a serverless AWS Lambda backend to gain production experience with IAM and DynamoDB."
        }
      ]
    });
  }
  // --------------------------

  try {
    const transcript = history.map(h => {
      const speaker = h.role === 'user' ? 'Candidate' : 'Interviewer';
      const text = h.parts && h.parts[0] ? h.parts[0].text : '';
      return `${speaker}: ${text}`;
    }).join('\n\n');

    const userPrompt = `Review and grade the following mock interview transcript:\n\n${transcript}\n\nGenerate the structured evaluation report now.`;

    const result = await queryGemini(
      MOCK_EVALUATION_SYSTEM_PROMPT,
      userPrompt,
      MOCK_EVALUATION_RESPONSE_SCHEMA
    );

    res.json(result);
  } catch (error) {
    console.error('Error in /api/simulator/evaluate:', error);
    res.status(500).json({
      error: 'Failed to evaluate interview performance using Gemini API',
      details: error.message
    });
  }
});

/**
 * Route: Feature 7 - Skill-Gap Micro-Lessons
 */
app.post('/api/skill-lesson', async (req, res) => {
  const { skillName } = req.body;

  if (!skillName || skillName.trim() === '') {
    return res.status(400).json({ error: 'Skill name is required' });
  }

  // --- DEMO MODE FALLBACK ---
  if (!hasApiKey) {
    return res.json({
      isDemo: true,
      skill_name: skillName,
      explainer: `Demo Mode: ${skillName} is a critical skill for tech candidates. It involves understanding syntax, design patterns, and application integrations in modern development pipelines.`,
      practice_exercises: [
        { title: "Exercise 1: Basic sandbox setup", description: "Configure a basic local project sandbox to test features of this skill.", difficulty: "beginner" },
        { title: "Exercise 2: Integration script", description: "Design a simple script linking this skill with a backend JSON API.", difficulty: "intermediate" }
      ],
      resources: [
        { title: "Official Documentation Guide", type: "docs", note: "Search for official documentation to learn syntax basics." },
        { title: "Introduction Crash Course", type: "video", note: "Search for top video tutorials covering core concepts." }
      ]
    });
  }
  // --------------------------

  try {
    const userPrompt = `Generate a learning micro-lesson for the skill: ${skillName}`;
    let responseText;

    try {
      // Try search grounding first
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: SKILL_LESSON_SYSTEM_PROMPT,
      });

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: SKILL_LESSON_RESPONSE_SCHEMA,
          temperature: 0.2,
        },
        tools: [{ googleSearch: {} }]
      });

      responseText = result.response.text();
    } catch (e) {
      console.warn('Search grounding failed or restricted, falling back to standard query:', e.message);
      // Fallback: regular query
      const data = await queryGemini(
        SKILL_LESSON_SYSTEM_PROMPT,
        userPrompt,
        SKILL_LESSON_RESPONSE_SCHEMA
      );
      return res.json(data);
    }

    res.json(JSON.parse(responseText));
  } catch (error) {
    console.error('Error in /api/skill-lesson:', error);
    res.status(500).json({
      error: 'Failed to generate micro-lesson using Gemini API',
      details: error.message
    });
  }
});

/**
 * Route: Feature 8 - Cover Letter Generator
 */
app.post('/api/generate-cover-letter', async (req, res) => {
  const { backgroundText, jobDescription, format } = req.body;

  if (!jobDescription || jobDescription.trim() === '') {
    return res.status(400).json({ error: 'Job description content is required' });
  }

  // --- DEMO MODE FALLBACK ---
  if (!hasApiKey) {
    return res.json({
      isDemo: true,
      draft: `Dear Hiring Team,\n\nI am writing to express my strong interest in the role based on the job description you posted. Given my background in software engineering, UI design, and problem solving, I am confident I can contribute effectively.\n\nThank you for your consideration,\n[Your Name]`,
      key_points_highlighted: [
        "Emphasized core programming experience.",
        "Matched projects to standard requirements."
      ],
      tone: format === 'short' ? 'Concise Networking' : 'Formal Cover Letter'
    });
  }
  // --------------------------

  try {
    const userPrompt = `Format/Tone Mode: ${format || 'formal'}\n\nCandidate Background:\n${backgroundText || 'No background supplied.'}\n\nJob Description:\n${jobDescription}`;
    const result = await queryGemini(
      COVER_LETTER_SYSTEM_PROMPT,
      userPrompt,
      COVER_LETTER_RESPONSE_SCHEMA
    );
    res.json(result);
  } catch (error) {
    console.error('Error in /api/generate-cover-letter:', error);
    res.status(500).json({
      error: 'Failed to generate cover letter using Gemini API',
      details: error.message
    });
  }
});

/**
 * Route: Feature 9 - LinkedIn/Profile Optimizer
 */
app.post('/api/optimize-profile', async (req, res) => {
  const { headline, bio } = req.body;

  if ((!headline || headline.trim() === '') && (!bio || bio.trim() === '')) {
    return res.status(400).json({ error: 'At least one profile section (headline or bio) is required' });
  }

  // --- DEMO MODE FALLBACK ---
  if (!hasApiKey) {
    return res.json({
      isDemo: true,
      headline_score: 75,
      headline_feedback: [
        "Add specific target roles.",
        "Avoid generic taglines like 'Passionate software student'."
      ],
      headline_rewrite_suggestions: [
        "Software Engineering Student | React, Node.js, Python",
        "Aspiring Frontend Developer | UI/UX & Web Intern"
      ],
      bio_score: 68,
      bio_feedback: [
        "Detail key backend or frontend projects.",
        "Add direct contact call-to-actions."
      ],
      bio_rewrite_suggestions: [
        "I am a tech student focused on building responsive web apps with React. Experienced with project pipelines and Git workflows. Let's connect!"
      ],
      ratings: {
        recruiter_appeal: 72,
        clarity: 80,
        professional_branding: 70,
        keyword_optimization: 65,
        internship_readiness: 75,
        interview_worthiness: 68
      },
      suggested_post: `🔥 Rethinking web database pipelines...\n\nI used to think MongoDB was always the best fit. Recently, building a multi-turn simulator made me rethink that database tradeoffs are real.\n\n💻 What I Worked On\n🔹 Integrated Firestore real-time listeners\n🔹 Configured Email/Password auth providers\n🔹 Optimized local caching state loops\n🔹 Measured query latencies\n\n💡 Biggest Takeaway: Cache locally first to provide instant UI feedback.\n\n🚀 What's Next: Adding audio playback support!\n\n💬 How do you manage real-time databases? Let me know below!\n\n#SoftwareDevelopment #WebDesign #Firebase #Programming`
    });
  }
  // --------------------------

  try {
    const userPrompt = `LinkedIn Headline:\n${headline || 'Empty'}\n\nLinkedIn About/Bio:\n${bio || 'Empty'}`;
    const result = await queryGemini(
      PROFILE_OPTIMIZER_SYSTEM_PROMPT,
      userPrompt,
      PROFILE_OPTIMIZER_RESPONSE_SCHEMA
    );
    res.json(result);
  } catch (error) {
    console.error('Error in /api/optimize-profile:', error);
    res.status(500).json({
      error: 'Failed to optimize LinkedIn profile using Gemini API',
      details: error.message
    });
  }
});

/**
 * Route: Feature 9b - LinkedIn Post Optimizer
 */
app.post('/api/optimize-post', async (req, res) => {
  const { draft, context } = req.body;

  if ((!draft || draft.trim() === '') && (!context || context.trim() === '')) {
    return res.status(400).json({ error: 'Provide either an existing post draft or a topic/context to write from.' });
  }

  // --- DEMO MODE FALLBACK ---
  if (!hasApiKey) {
    return res.json({
      isDemo: true,
      optimized_post: `I used to think "just build projects" was enough to get noticed on LinkedIn.\n\nIt's not.\n\nAfter 3 months of posting and getting minimal engagement, I realized the issue — my hooks were soft.\n\n💻 What I Changed\n🔹 Rewrote every opening line to lead with a counterintuitive statement\n🔹 Replaced passive summaries with specific tool names and metrics\n🔹 Cut every post by 30% — short sentences, hard stops\n🔹 Added a sharp discussion question instead of generic CTAs\n\n💡 Biggest Takeaway: Recruiters scan. They don't read. Write for 3 seconds of attention.\n\n🚀 What's Next: Testing carousel posts with code screenshots.\n\n💬 What's the biggest mistake you see student devs make on LinkedIn?\n\n#LinkedInTips #StudentDeveloper #TechInterns #SoftwareEngineering #CareerGrowth #WebDev #Coding`,
      hook_analysis: "The hook 'I used to think...' triggers curiosity and positions the author as someone who learned something — readers want to know the lesson.",
      improvements_made: [
        "Replaced vague opener with a specific counterintuitive claim.",
        "Added 4 specific technical bullet points instead of generic summaries.",
        "Discussion question is specific and invites real answers.",
        "Removed all corporate fluff phrases."
      ],
      post_type: "Growth/Curriculum Story",
      word_count: 142
    });
  }
  // --------------------------

  try {
    let userPrompt = '';
    if (draft && draft.trim().length > 0) {
      userPrompt = `Optimize this existing LinkedIn post draft using the Full Post Framework.\n\nExisting Draft:\n${draft}`;
      if (context && context.trim().length > 0) {
        userPrompt += `\n\nAdditional context about the author/topic:\n${context}`;
      }
    } else {
      userPrompt = `Create a high-converting LinkedIn post from scratch using the Full Post Framework.\n\nTopic/Context:\n${context}`;
    }

    const result = await queryGemini(
      POST_OPTIMIZER_SYSTEM_PROMPT,
      userPrompt,
      POST_OPTIMIZER_RESPONSE_SCHEMA
    );
    res.json(result);
  } catch (error) {
    console.error('Error in /api/optimize-post:', error);
    res.status(500).json({
      error: 'Failed to optimize post using Gemini API',
      details: error.message
    });
  }
});


// ============================================================
// LINKEDIN INTELLIGENCE SUITE — 8 ORIGINAL ROUTES
// ============================================================

/**
 * Route: LinkedIn Intelligence — Tool 1: Brand Voice Forge
 */
app.post('/api/linkedin/brand-voice', async (req, res) => {
  const { writingSample, topic } = req.body;
  if (!writingSample || writingSample.trim().length < 30) {
    return res.status(400).json({ error: 'Please provide a writing sample of at least 30 characters.' });
  }

  if (!hasApiKey) {
    return res.json({
      isDemo: true,
      voice_dna: {
        tone: 'Conversational with technical precision',
        style_archetype: 'Builder / Teacher',
        energy_level: 'Energetic & Bold',
        signature_traits: [
          'Opens statements with direct, confident assertions',
          'Uses specific tool names and metrics instead of vague descriptions',
          'Favors short punchy sentences followed by longer explanatory ones'
        ],
        voice_summary: 'This writer communicates like a practitioner who loves teaching — grounded in specifics, energetic, and refreshingly direct without being arrogant.'
      },
      post_short: `I spent 3 weeks learning Docker. Then deleted everything and started over.\n\nNot because I failed — because I finally understood what I was actually building.\n\n🔹 Containerized a Node.js app from scratch\n🔹 Debugged port binding issues at 2am (twice)\n🔹 Shipped it. It worked. Finally.\n\nSometimes the second build teaches you more than the first ever could.\n\n#Docker #StudentDeveloper #TechInterns`,
      post_long: `Nobody warned me that "learning Docker" actually means learning 5 other things first.\n\nI picked up Docker in Week 1 of my internship prep. Six hours in, I had a running container. I was thrilled.\n\nWeek 3: I deleted every file and started over from scratch.\n\nNot because I broke something. Because I realized I'd copy-pasted my way through the whole thing and understood almost nothing.\n\n💻 What I Rebuilt\n🔹 Wrote every Dockerfile line manually — no boilerplate\n🔹 Debugged volume mounts until I could explain them to a friend\n🔹 Learned why containers ≠ VMs (this one changed how I think)\n🔹 Built a small Node.js app and containerized it end-to-end\n\n💡 Biggest Takeaway: Speed is a trap early on. Understanding compounds. Speed comes later.\n\n🚀 What's Next: Kubernetes basics. Apparently containers were just the warmup.\n\n💬 What's the hardest Docker concept you had to unlearn before it clicked?\n\n#Docker #DevOps #StudentDeveloper #TechInterns #SoftwareEngineering`,
      authenticity_notes: [
        'Used your natural "then I restarted" narrative pattern — your sample showed you favor honesty about false starts over polished success stories.',
        'Short punchy opener matches your detected blunt assertion style — no softening phrases.',
        'Specific time references ("Week 1", "2am") match your observed habit of grounding stories in concrete details.'
      ]
    });
  }

  try {
    const userPrompt = `Writing Sample:\n${writingSample}\n\nTopic to write posts about:\n${topic || 'A recent technical project or learning experience'}`;
    const result = await queryGemini(BRAND_VOICE_FORGE_SYSTEM_PROMPT, userPrompt, BRAND_VOICE_FORGE_RESPONSE_SCHEMA);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/linkedin/brand-voice:', error);
    res.status(500).json({ error: 'Failed to analyze voice using Gemini API', details: error.message });
  }
});

/**
 * Route: LinkedIn Intelligence — Tool 2: Recruiter Radar
 */
app.post('/api/linkedin/recruiter-radar', async (req, res) => {
  const { headline, about } = req.body;
  if (!headline && !about) {
    return res.status(400).json({ error: 'Provide at least a LinkedIn headline or About section.' });
  }

  if (!hasApiKey) {
    return res.json({
      isDemo: true,
      first_impression_verdict: 'Generic student profile — sounds like every other CS junior I see today.',
      hire_probability: 38,
      instant_deal_breakers: [
        'Headline uses "Aspiring" — signals lack of confidence and current contribution',
        'No specific technologies or tools mentioned in first scan',
        'About section reads like a resume objective, not a story'
      ],
      instant_green_flags: [
        'Mentions a specific university project with a real outcome',
        'Profile photo appears professional (inferred from structured formatting)'
      ],
      the_one_phrase: '"Aspiring Software Developer"',
      next_action: 'Close tab — nothing here differentiates this candidate from 200 others in the same pool.',
      improvement_priority: 'Replace "Aspiring" with your actual current role/activity: "CS Junior building full-stack apps | Seeking Summer 2025 SWE Internship"'
    });
  }

  try {
    const userPrompt = `LinkedIn Headline: ${headline || 'Not provided'}\n\nLinkedIn About Section:\n${about || 'Not provided'}`;
    const result = await queryGemini(RECRUITER_RADAR_SYSTEM_PROMPT, userPrompt, RECRUITER_RADAR_RESPONSE_SCHEMA);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/linkedin/recruiter-radar:', error);
    res.status(500).json({ error: 'Failed to run recruiter simulation using Gemini API', details: error.message });
  }
});

/**
 * Route: LinkedIn Intelligence — Tool 3: LinkedIn Scam Shield
 */
app.post('/api/linkedin/scam-shield', async (req, res) => {
  const { message } = req.body;
  if (!message || message.trim().length < 10) {
    return res.status(400).json({ error: 'Please paste the LinkedIn message to analyze.' });
  }

  if (!hasApiKey) {
    const msgLower = message.toLowerCase();
    let platform_threat_level = 'SAFE';
    let threat_score = 10;
    let linkedin_specific_red_flags = [];
    let scam_mechanic = 'Message appears to be a legitimate recruiter outreach based on standard patterns.';
    let safe_response_template = 'Thank you for reaching out! I am currently exploring opportunities. Could you share more details about the role, the team structure, and the interview process? I would also like to confirm the official company careers page listing for this position.';
    let report_action = 'Safe to reply — verify recruiter profile manually on LinkedIn before sharing your resume.';

    if (msgLower.includes('whatsapp') || msgLower.includes('telegram')) {
      platform_threat_level = 'HIGH_RISK';
      threat_score = 88;
      linkedin_specific_red_flags.push('Requests to move conversation off LinkedIn to WhatsApp/Telegram');
      linkedin_specific_red_flags.push('Legitimate recruiters almost never redirect to encrypted messaging apps');
      scam_mechanic = 'Moving you off LinkedIn removes the platform\'s scam reporting and evidence trail — a common tactic to avoid accountability.';
      safe_response_template = 'Thank you, but I prefer to keep professional conversations on LinkedIn for record-keeping purposes. Please send any further details here.';
      report_action = 'Do NOT move to WhatsApp. If they insist, block and report as "Suspicious Content" on LinkedIn.';
    } else if (msgLower.includes('fee') || msgLower.includes('training cost') || msgLower.includes('upfront')) {
      platform_threat_level = 'CONFIRMED_SCAM_PATTERN';
      threat_score = 97;
      linkedin_specific_red_flags.push('Mentions fees, training costs, or upfront payments');
      scam_mechanic = 'Pay-to-train scheme: scammer profits from your "onboarding fee" with no real job on the other end.';
      report_action = 'Block immediately. Report to LinkedIn as "Job Scam". Real employers never charge candidates.';
    } else if (msgLower.includes('urgent') || msgLower.includes('selected you') || msgLower.includes('exactly what we')) {
      platform_threat_level = 'SUSPICIOUS';
      threat_score = 55;
      linkedin_specific_red_flags.push('Excessive flattery combined with urgency ("you\'re exactly what we need")');
      linkedin_specific_red_flags.push('No mention of specific skills that matched — generic praise');
      scam_mechanic = 'Creates false urgency and inflated ego to bypass your critical thinking. Real recruiters describe why you specifically fit.';
      report_action = 'Proceed with extreme caution. Request a video call with their official company email before sharing any documents.';
    }

    return res.json({ isDemo: true, platform_threat_level, threat_score, linkedin_specific_red_flags, scam_mechanic, safe_response_template, report_action });
  }

  try {
    const result = await queryGemini(LINKEDIN_SCAM_SHIELD_SYSTEM_PROMPT, message, LINKEDIN_SCAM_SHIELD_RESPONSE_SCHEMA);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/linkedin/scam-shield:', error);
    res.status(500).json({ error: 'Failed to analyze LinkedIn message using Gemini API', details: error.message });
  }
});

/**
 * Route: LinkedIn Intelligence — Tool 4: Post Momentum Predictor
 */
app.post('/api/linkedin/momentum', async (req, res) => {
  const { draft } = req.body;
  if (!draft || draft.trim().length < 20) {
    return res.status(400).json({ error: 'Please paste a draft post to analyze.' });
  }

  if (!hasApiKey) {
    return res.json({
      isDemo: true,
      momentum_score: 61,
      scroll_stop_rating: 5,
      best_format: 'Text Only — your post is narrative-driven; adding an image would distract from the story flow.',
      best_posting_windows: ['Tuesday 8:00–9:30am', 'Thursday 5:00–6:30pm'],
      micro_optimizations: [
        { original_phrase: 'I learned a lot from this experience', suggested_replacement: 'This taught me one thing I wish someone had told me on day one.', reason: 'Vague learning statements get skipped — reframe as a specific witheld insight to create curiosity.' },
        { original_phrase: 'It was really challenging', suggested_replacement: 'Three things broke before it worked.', reason: 'Concrete specifics are scannable and relatable — "challenging" is abstract and forgettable.' },
        { original_phrase: 'Feel free to share your thoughts below!', suggested_replacement: 'What\'s the hardest part of X you\'ve hit? (I\'ll reply to every comment this week)', reason: 'A specific question + commitment to reply dramatically increases comment rate.' }
      ],
      power_move: 'Split your current single-block paragraph into 6-8 punchy single-line statements. LinkedIn rewards white space — walls of text get scrolled past.',
      predicted_audience: 'CS students, junior developers, and early-career engineers who are currently in or preparing for their first internship.'
    });
  }

  try {
    const result = await queryGemini(POST_MOMENTUM_PREDICTOR_SYSTEM_PROMPT, draft, POST_MOMENTUM_PREDICTOR_RESPONSE_SCHEMA);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/linkedin/momentum:', error);
    res.status(500).json({ error: 'Failed to predict post momentum using Gemini API', details: error.message });
  }
});

/**
 * Route: LinkedIn Intelligence — Tool 5: Outreach Forge
 */
app.post('/api/linkedin/outreach-forge', async (req, res) => {
  const { targetPerson, background, goal } = req.body;
  if (!targetPerson || !goal) {
    return res.status(400).json({ error: 'Target person description and outreach goal are required.' });
  }

  if (!hasApiKey) {
    return res.json({
      isDemo: true,
      variants: [
        {
          variant_name: 'Concise & Direct',
          message: `Hi [Name] — I'm a CS junior building ML pipelines at my uni's research lab. I'm targeting ${targetPerson.split(' ')[0]}-type roles for Summer 2025 and noticed your trajectory. Would you be open to a 15-min call? No prep needed — just your honest experience.`,
          character_count: 248,
          response_likelihood: 32,
          personalization_tip: 'Replace "your trajectory" with a specific career move of theirs you found interesting — it proves you actually looked at their profile.',
          best_for: 'Senior ICs and busy hiring managers who value directness over small talk.'
        },
        {
          variant_name: 'Value-First',
          message: `Hi [Name] — I read your post on [specific topic] and tried applying your [specific tip] to my current project. Genuinely changed how I approached [specific problem]. I'm a CS student targeting roles like yours for 2025 — would love to ask you 2 questions about the transition from [their previous role] to [current role].`,
          character_count: 352,
          response_likelihood: 48,
          personalization_tip: 'Fill in the post details specifically — generic "I found your content helpful" gets ignored. Reference the actual post title.',
          best_for: 'Thought leaders and content creators who post regularly on LinkedIn.'
        },
        {
          variant_name: 'Story-Driven',
          message: `Hi [Name] — Six months ago I almost dropped my CS degree because I couldn't see a path forward. Then I found your talk on [topic]. Now I'm building [specific thing]. I'm applying for roles like yours this summer and would genuinely value 10 minutes of your time — not for advice, just to understand how you think about [specific aspect of their work].`,
          character_count: 398,
          response_likelihood: 41,
          personalization_tip: 'The story must be real and specific — manufactured vulnerability is easy to detect and will kill your credibility instantly.',
          best_for: 'Mentors, educators, and people who clearly enjoy sharing their journey in their own posts.'
        }
      ],
      goal_strategy: `For a ${goal} goal, lead with the Value-First variant as your primary attempt. If no reply in 10 days, follow up with the Concise variant referencing your first message. Never send the same message twice.`
    });
  }

  try {
    const userPrompt = `Target Person: ${targetPerson}\nMy Background: ${background || 'Not specified'}\nOutreach Goal: ${goal}`;
    const result = await queryGemini(OUTREACH_FORGE_SYSTEM_PROMPT, userPrompt, OUTREACH_FORGE_RESPONSE_SCHEMA);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/linkedin/outreach-forge:', error);
    res.status(500).json({ error: 'Failed to generate outreach messages using Gemini API', details: error.message });
  }
});

/**
 * Route: LinkedIn Intelligence — Tool 6: Comment Intelligence Engine
 */
app.post('/api/linkedin/comment-intel', async (req, res) => {
  const { post } = req.body;
  if (!post || post.trim().length < 20) {
    return res.status(400).json({ error: 'Please paste the LinkedIn post you want to comment on.' });
  }

  if (!hasApiKey) {
    return res.json({
      isDemo: true,
      post_topic_detected: 'Career lessons from a technical project or internship experience',
      comments: [
        {
          angle: 'Authority Builder',
          comment_text: 'The restarting instinct is underrated. Studies on deliberate practice show that "desirable difficulties" — making learning harder on purpose — lead to 40% better retention. What you called wasted time is actually the mechanism of real learning.',
          profile_view_probability: 68,
          why_it_works: 'Adds a specific credible claim (research reference) that positions the commenter as someone who thinks rigorously — invites both agreement and debate.'
        },
        {
          angle: 'Conversation Starter',
          comment_text: 'Curious — at what point did you realize the copy-paste approach wasn\'t going to hold? Was there a specific moment that broke the illusion, or was it a slow creep?',
          profile_view_probability: 52,
          why_it_works: 'Asks about a specific emotional moment the author hasn\'t yet described — they\'ll almost always want to answer because it gives them a chance to elaborate on their own story.'
        },
        {
          angle: 'Relatability Bridge',
          comment_text: 'Did the same thing with Kubernetes last semester. Got it "working" in week 2. Understood it in week 6 after everything broke in production. The second build is always the real one.',
          profile_view_probability: 44,
          why_it_works: 'Mirrors the post\'s exact narrative arc (false start → real learning) with a different example — creates instant kinship without parroting the original post.'
        }
      ],
      engagement_tip: 'Comment within the first 30-60 minutes of a post going live — LinkedIn\'s algorithm shows comments posted early to a wider secondary audience. Set a notification for creators you want to engage with consistently.'
    });
  }

  try {
    const result = await queryGemini(COMMENT_INTELLIGENCE_SYSTEM_PROMPT, post, COMMENT_INTELLIGENCE_RESPONSE_SCHEMA);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/linkedin/comment-intel:', error);
    res.status(500).json({ error: 'Failed to generate comment intelligence using Gemini API', details: error.message });
  }
});

/**
 * Route: LinkedIn Intelligence — Tool 7: 30-Day Content Runway
 */
app.post('/api/linkedin/content-runway', async (req, res) => {
  const { industry, goal, frequency } = req.body;
  if (!industry || !goal) {
    return res.status(400).json({ error: 'Industry and career goal are required.' });
  }

  if (!hasApiKey) {
    return res.json({
      isDemo: true,
      content_pillars: [
        'Technical Learning & Project Deep-Dives',
        'Honest Career Journey & Lessons Learned',
        'Industry Insights & Skill Building Tips'
      ],
      calendar: [
        { day: 1, topic: 'The one thing I wish I knew before starting my first coding project', angle: 'Underdog lesson', format: 'Text Only', hook_idea: 'Nobody told me the most important skill in coding isn\'t writing code.', posting_day_label: 'Tuesday' },
        { day: 4, topic: `Why I chose ${industry} over [alternative] — and what I got wrong`, angle: 'Counterintuitive insight', format: 'Text Only', hook_idea: `I used to think ${industry} was the safe choice. It\'s not.`, posting_day_label: 'Thursday' },
        { day: 8, topic: 'Behind the scenes: how my latest project actually got built', angle: 'Behind-the-scenes', format: 'Text + Image', hook_idea: 'Here\'s what my project looked like at 11pm vs. the polished version I submitted.', posting_day_label: 'Tuesday' },
        { day: 11, topic: '3 free resources that taught me more than my classes did this semester', angle: 'Tutorial/Value', format: 'Document Carousel', hook_idea: 'My professor assigned 400 pages. These 3 free resources taught me the same thing in 3 hours.', posting_day_label: 'Thursday' },
        { day: 15, topic: 'I failed my first technical interview. Here\'s the exact question that broke me.', angle: 'Career milestone / Failure story', format: 'Text Only', hook_idea: 'I blanked on a question I\'d practiced 20 times. Completely froze.', posting_day_label: 'Tuesday' }
      ],
      brand_consistency_tip: 'Every post should pass the "would a friend text this to me?" test. If it sounds like a press release, rewrite the first sentence until it sounds like a real person talking.',
      total_posts_scheduled: 5
    });
  }

  try {
    const userPrompt = `Industry/Field: ${industry}\nCareer Goal: ${goal}\nPosting Frequency: ${frequency || '2-3 times per week'}`;
    const result = await queryGemini(CONTENT_RUNWAY_SYSTEM_PROMPT, userPrompt, CONTENT_RUNWAY_RESPONSE_SCHEMA);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/linkedin/content-runway:', error);
    res.status(500).json({ error: 'Failed to generate content runway using Gemini API', details: error.message });
  }
});

/**
 * Route: LinkedIn Intelligence — Tool 8: Bio Story Builder
 */
app.post('/api/linkedin/bio-story', async (req, res) => {
  const { facts } = req.body;
  if (!facts || facts.trim().length < 30) {
    return res.status(400).json({ error: 'Please provide your career facts (at least 30 characters).' });
  }

  if (!hasApiKey) {
    return res.json({
      isDemo: true,
      version_punchy: `I build things that work, then figure out why they work.\n\nCurrently a CS junior at [University], spending most of my time on full-stack projects — lately a real-time chat app using React and Firebase that 40+ people in my department actually use.\n\nI care about writing code that's readable, not just functional. And I\'m getting better at the difference.\n\nLooking for a Summer 2025 software engineering internship where I can contribute on day one — and learn things my courses don\'t cover.\n\nOpen to connect with engineers, recruiters, and anyone building something interesting.`,
      version_narrative: `Two years ago I failed my first coding project so badly that my professor suggested I "reconsider the major."\n\nI didn't reconsider. I rebuilt the project from scratch — twice.\n\nThat stubbornness turned out to be the most useful thing I brought to computer science. I'm now a CS junior at [University], and instead of struggling to get things running, I'm building tools people in my department actually use. My current project — a real-time collaboration app built with React, Node.js, and Firebase — has 40+ active users. It started as a homework assignment. It grew because I kept fixing the next problem.\n\nMy approach hasn\'t changed: build something real, break it, understand why it broke, build it better.\n\nI'm looking for a Summer 2025 SWE internship where the problems are hard enough to be interesting. I want to work with engineers who care about the craft, not just the shipping.\n\nIf that sounds like your team, let's talk.`,
      opening_line_analysis: 'Punchy version opens with a paradox ("build things that work, then figure out why") — creates intrigue by subverting the expected order. Narrative version opens with a failure moment — immediately establishes authenticity and creates forward momentum to see how it resolved.',
      facts_used: [
        'CS junior at university',
        'Full-stack development focus',
        'React and Firebase project with 40+ users',
        'Seeking Summer 2025 SWE internship'
      ],
      cta_suggestion: "If you're building something that needs someone who figures things out — I'd like to hear about it."
    });
  }

  try {
    const result = await queryGemini(BIO_STORY_BUILDER_SYSTEM_PROMPT, facts, BIO_STORY_BUILDER_RESPONSE_SCHEMA);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/linkedin/bio-story:', error);
    res.status(500).json({ error: 'Failed to build bio story using Gemini API', details: error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log('\x1b[32m%s\x1b[0m', `🚀 CareerShield AI Server is running on http://localhost:${port}`);
  console.log('\x1b[36m%s\x1b[0m', `👉 Access the application in your browser at http://localhost:${port}`);
});

