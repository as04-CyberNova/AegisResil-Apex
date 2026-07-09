import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import https from 'node:https';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  SCAM_ANALYZER_SYSTEM_PROMPT,
  SCAM_RESPONSE_SCHEMA,
  RESUME_SCORER_SYSTEM_PROMPT,
  RESUME_RESPONSE_SCHEMA,
  buildResumeScorerPrompt,
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
  BIO_STORY_BUILDER_RESPONSE_SCHEMA,
  GROWTH_QUESTIONS_SYSTEM_PROMPT,
  GROWTH_QUESTIONS_RESPONSE_SCHEMA,
  GROWTH_STRATEGY_SYSTEM_PROMPT,
  GROWTH_STRATEGY_RESPONSE_SCHEMA,
  HR_INTERVIEW_SYSTEM_PROMPT,
  HR_INTERVIEW_EVALUATION_SCHEMA,
  JOB_FINDER_SYSTEM_PROMPT,
  JOB_FINDER_RESPONSE_SCHEMA
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
 * Helper: Companies House (UK) live company lookup.
 * Uses HTTP Basic Auth — API key as username, blank password.
 * @param {string} companyName
 * @returns {Promise<{ verified: boolean, companyNumber: string|null, status: string|null, companyType: string|null, dateOfCreation: string|null, error: string|null }>}
 */
function companiesHouseLookup(companyName) {
  return new Promise((resolve) => {
    const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
    if (!apiKey || apiKey === 'YOUR_COMPANIES_HOUSE_KEY_HERE') {
      return resolve({ verified: false, error: 'Companies House API key not configured' });
    }

    const encodedName = encodeURIComponent(companyName.trim());
    const options = {
      hostname: 'api.company-information.service.gov.uk',
      path: `/search/companies?q=${encodedName}&items_per_page=5`,
      method: 'GET',
      // Basic Auth: API key as username, empty password
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${apiKey}:`).toString('base64'),
        'Accept': 'application/json',
      },
      timeout: 6000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const items = parsed.items || [];

          if (items.length === 0) {
            return resolve({
              verified: false,
              companyNumber: null,
              status: null,
              companyType: null,
              dateOfCreation: null,
              error: 'No matching entity found in Companies House registry',
            });
          }

          // Take the first (most relevant) result
          const top = items[0];
          resolve({
            verified: true,
            companyNumber: top.company_number || null,
            status: top.company_status || null,
            companyType: top.company_type || null,
            dateOfCreation: top.date_of_creation || null,
            address: top.registered_office_address
              ? `${top.registered_office_address.address_line_1 || ''}, ${top.registered_office_address.postal_code || ''}`.trim()
              : null,
            error: null,
          });
        } catch (e) {
          resolve({ verified: false, error: 'Failed to parse Companies House response' });
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ verified: false, error: 'Companies House API request timed out' });
    });

    req.on('error', (e) => {
      resolve({ verified: false, error: `Companies House API error: ${e.message}` });
    });

    req.end();
  });
}

/**
 * Adds standard edge-compatible headers to API responses.
 * Makes routes deployable to Cloudflare Workers / Vercel Edge.
 * @param {object} res - Express response object
 * @param {string} [region] - Optional region code to echo in X-Region header
 */
function setEdgeHeaders(res, region) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Vary', 'Accept-Encoding, Accept-Language');
  res.set('X-Content-Type-Options', 'nosniff');
  if (region) {
    res.set('X-Region', region.toUpperCase());
  }
}

/**
 * Route: Scam / Message Analyzer
 */
app.post('/api/analyze-scam', async (req, res) => {
  const { text } = req.body;

  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Text input is required' });
  }

  setEdgeHeaders(res);

  // --- DEMO MODE FALLBACK ---
  if (!hasApiKey) {
    const textLower = text.toLowerCase();
    let risk_score = 15;
    let risk_level = 'LOW';
    let red_flags = [];
    let source_channel = 'Unknown';
    let international_scam_type = '';
    let recommendation = 'This message appears typical. However, always verify recruiter identities and cross-reference jobs on company sites before sharing sensitive information.';

    // Channel detection hints
    if (textLower.includes('[source_channel: whatsapp]') || textLower.includes('whatsapp')) source_channel = 'WhatsApp';
    else if (textLower.includes('[source_channel: telegram]') || textLower.includes('telegram') || textLower.includes('t.me/')) source_channel = 'Telegram';
    else if (textLower.includes('[source_channel: discord]')) source_channel = 'Discord';
    else if (textLower.includes('[source_channel: sms]')) source_channel = 'SMS';
    else if (textLower.includes('@')) source_channel = 'Email';

    if (textLower.includes('telegram') || textLower.includes('whatsapp') || textLower.includes('signal') || textLower.includes('chat') || textLower.includes('crypto')) {
      risk_score = 85;
      risk_level = 'HIGH';
      international_scam_type = textLower.includes('crypto') ? 'CRYPTO_PAYOUT_SCAM' : '';
      red_flags.push('Urgent communication requested via encrypted messaging apps (Telegram/WhatsApp)');
      red_flags.push('Lack of official recruiter email matching the company domain');
      recommendation = 'DO NOT proceed. Real companies rarely conduct recruitment or extend offers exclusively over Telegram or WhatsApp. Block the sender and report the listing.';
    } else if (textLower.includes('fee') || textLower.includes('payment') || textLower.includes('training cost') || textLower.includes('upfront') || textLower.includes('check')) {
      risk_score = 95;
      risk_level = 'HIGH';
      international_scam_type = 'FAKE_TRAINING_FEE';
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
      source_channel,
      international_scam_type,
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
  const { text, region = 'US' } = req.body;

  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Resume text content is required' });
  }

  // Validate region — fallback to US if unsupported value provided
  const validRegions = ['US', 'UK', 'DE', 'IN'];
  const resolvedRegion = validRegions.includes(region?.toUpperCase()) ? region.toUpperCase() : 'US';

  setEdgeHeaders(res, resolvedRegion);

  // --- DEMO MODE FALLBACK ---
  if (!hasApiKey) {
    const textLower = text.toLowerCase();
    let overall_score = 65;
    let ats_compatibility_notes = [
      `Demo Mode: Simulated ${resolvedRegion} region feedback based on text length.`,
    ];
    let missing_keywords = ['CI/CD', 'Unit Testing', 'System Design'];
    let suggestions = [
      'Quantify results: Replace descriptions like "helped build dashboard" with "Designed dashboard UI, improving client usage by 25%".',
      'Optimize layout: Standardize section headings (e.g. "Work Experience", "Education") to ensure ease of parsing.',
      'Add a summary: Insert a short profile summary at the top outlining your technical focus.'
    ];
    let compliance_violations = [];
    let regional_notes = [];

    // Region-specific demo hints
    if (resolvedRegion === 'DE') {
      compliance_violations.push('MISSING: Professional Bewerbungsfoto required for DACH market applications');
      compliance_violations.push('CEFR CHECK: Verify all language proficiencies use A1-C2 CEFR scale labels');
      regional_notes.push('German Lebenslauf format detected. Strict chronological order and exact month/year dates are expected.');
    } else if (resolvedRegion === 'UK') {
      regional_notes.push('UK CV standard: 2-page A4 format is expected. A Personal Profile at the top is strongly recommended.');
    } else if (resolvedRegion === 'US') {
      if (text.toLowerCase().includes('photo') || text.toLowerCase().includes('dob') || text.toLowerCase().includes('marital')) {
        compliance_violations.push('HIGH_RISK: Personal information (photo/DOB/marital status) detected — EEO Compliance Violation');
      }
    } else if (resolvedRegion === 'IN') {
      regional_notes.push('Indian market: Education and Projects sections carry significant weight for entry-level candidates.');
    }

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
      region: resolvedRegion,
      overall_score,
      ats_compatibility_notes,
      missing_keywords,
      suggestions,
      compliance_violations,
      regional_notes,
    });
  }
  // --------------------------

  try {
    // Build dynamic region-specific prompt via factory function
    const regionPrompt = buildResumeScorerPrompt(resolvedRegion);
    const result = await queryGemini(regionPrompt, text, RESUME_RESPONSE_SCHEMA);
    res.json({ ...result, region: resolvedRegion });
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
  const { companyName, websiteUrl, jobText, jurisdiction } = req.body;

  if (!companyName || companyName.trim() === '') {
    return res.status(400).json({ error: 'Company name is required' });
  }

  setEdgeHeaders(res);

  // --- COMPANIES HOUSE LIVE REGISTRY LOOKUP (UK jurisdiction) ---
  let registryData = null;
  let registrySource = 'AI Reasoning (No Registry Available)';
  let registryVerified = false;

  const isUkJurisdiction = jurisdiction === 'UK' ||
    (websiteUrl && (websiteUrl.includes('.co.uk') || websiteUrl.includes('.org.uk') || websiteUrl.includes('.uk'))) ||
    /\b(ltd|limited|plc|llp|cic)\b/i.test(companyName);

  if (isUkJurisdiction) {
    try {
      console.log(`[Registry] Running Companies House lookup for: "${companyName}"`);
      const chResult = await companiesHouseLookup(companyName);

      if (chResult.verified) {
        registryVerified = true;
        registrySource = 'UK Companies House (Live API)';
        registryData = {
          companyNumber: chResult.companyNumber,
          status: chResult.status,
          companyType: chResult.companyType,
          dateOfCreation: chResult.dateOfCreation,
          registeredAddress: chResult.address,
        };
        console.log(`[Registry] ✅ Verified: ${companyName} — CH# ${chResult.companyNumber}, Status: ${chResult.status}`);
      } else {
        registrySource = 'UK Companies House (Live API — Not Found)';
        console.warn(`[Registry] ❌ Not found in Companies House: ${companyName}. Reason: ${chResult.error}`);
      }
    } catch (err) {
      console.error('[Registry] Companies House lookup error:', err.message);
      registrySource = 'UK Companies House (API Error — Fallback Mode)';
    }
  }

  // Build the user prompt with registry grounding facts injected
  const registryBlock = registryVerified
    ? `
## REGISTRY VERIFICATION RESULT — UK Companies House (LIVE DATA)
- Status: VERIFIED ✅
- Company Number: ${registryData.companyNumber}
- Company Status: ${registryData.status}
- Company Type: ${registryData.companyType}
- Date of Creation: ${registryData.dateOfCreation}
- Registered Address: ${registryData.registeredAddress || 'Not available'}
Use this as strong positive grounding evidence. A verified Companies House entry is a significant legitimacy signal.
`
    : isUkJurisdiction
    ? `
## REGISTRY VERIFICATION RESULT — UK Companies House (LIVE DATA)
- Status: NOT FOUND ❌
- No matching entity was found in the official UK Companies House register for this company name.
- This is a HIGH RISK signal. Legitimate UK-registered companies MUST appear in Companies House.
- MANDATORY: Add "HIGH_RISK: Company not found in UK Companies House official registry" to caveats.
- MANDATORY: Cap trust_score at a maximum of 35.
`
    : '';

  const userPrompt = `
  Company Name: ${companyName}
  Website URL: ${websiteUrl || 'Not provided'}
  Job Description Text: ${jobText || 'Not provided'}
  Detected Jurisdiction: ${jurisdiction || 'Unknown'}
  ${registryBlock}
  `;

  // --- DEMO MODE FALLBACK ---
  if (!hasApiKey) {
    const nameLower = companyName.toLowerCase();
    const textLower = (jobText || '').toLowerCase();
    let trust_score = isUkJurisdiction && !registryVerified ? 30 : 88;
    let confidence_level = 'MEDIUM';
    let signals_checked = ['Company name query', 'Common phishing naming formats'];
    let caveats = [
      'Demo Mode notice: This is simulated data.',
      'This is an AI evaluation, not an official registry/WHOIS verification. Manually verify via corporate registries, LinkedIn, or phone.'
    ];
    let recommendation = registryVerified
      ? `Company verified in UK Companies House registry (No. ${registryData?.companyNumber}). Appears legitimate. Verify the specific job posting on the official careers page.`
      : 'This company name appears legitimate. Verify listings on LinkedIn or the official company careers page before submitting details.';

    if (isUkJurisdiction) {
      signals_checked.push('UK Companies House registry lookup');
      if (!registryVerified) {
        caveats.push('HIGH_RISK: Company not found in UK Companies House official registry. UK companies are legally required to register.');
        trust_score = 28;
        confidence_level = 'HIGH';
        recommendation = 'HIGH RISK: This entity cannot be verified in the UK Companies House official registry. Do not share personal data or apply until you can confirm legal registration.';
      } else {
        caveats.push(`Companies House verified. Company status: ${registryData?.status}. Always verify the specific job listing on the official company website.`);
        trust_score = 82;
        confidence_level = 'HIGH';
      }
    }

    if (nameLower.includes('virtual') || nameLower.includes('helper') || nameLower.includes('global pay') || nameLower.includes('easy income') || nameLower.includes('cash flow') || textLower.includes('telegram')) {
      trust_score = Math.min(trust_score, 22);
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
      search_citations: [],
      registry_verified: registryVerified,
      registry_source: registrySource,
      registry_record: registryData,
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
        search_citations: [],
        registry_verified: registryVerified,
        registry_source: registrySource,
        registry_record: registryData,
      });
    }

    const parsed = JSON.parse(responseText);

    // Enforce trust_score cap if UK company NOT found in registry
    if (isUkJurisdiction && !registryVerified && parsed.trust_score > 35) {
      parsed.trust_score = 35;
      parsed.caveats = parsed.caveats || [];
      parsed.caveats.unshift('HIGH_RISK: Company not found in UK Companies House official registry. Trust score capped.');
    }

    res.json({
      ...parsed,
      search_grounded: searchGrounded,
      search_citations: searchCitations,
      registry_verified: registryVerified,
      registry_source: registrySource,
      registry_record: registryData,
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
 * Route: Personalized HR Interview Simulator Turn
 */
app.post('/api/hr-simulator/turn', async (req, res) => {
  const { history, message, targetRole, companyName, expLevel, profile, industry, language, style, difficulty } = req.body;

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message payload is required' });
  }

  // --- DEMO MODE FALLBACK ---
  if (!hasApiKey) {
    const chatLength = history ? history.length : 0;
    let reply = '';

    if (chatLength === 0) {
      reply = `Hello! Thank you for coming in today. I am the Senior HR Recruiter here at ${companyName || 'the company'}. I've had a look at your background, especially your Google Data Analytics certification and Deloitte job simulation. Let's start with the basics: Tell me a bit about yourself and why you're interested in the ${targetRole || 'Data Analyst'} role with us.`;
    } else if (chatLength === 2) {
      reply = "That's a very clear overview. I noticed in your profile that you've done Deloitte Australia's Data Analytics Job Simulation. Can you share a specific situation during that or another project where you had to handle an urgent challenge, how you solved it, and what the final outcome was?";
    } else if (chatLength === 4) {
      reply = "Very interesting outcome. As an entry-level candidate, collaboration and communication are extremely important to us. Describe a situation where you had a disagreement or communication clash with a teammate, and how you resolved it to complete the project.";
    } else {
      reply = `Thank you. Lastly, since your dream path is to eventually grow to FAANG, why do you feel ${companyName || 'our company'} is the right next step for you now, and what are your salary expectations for this role?\n[CONCLUDE]`;
    }

    return res.json({ reply });
  }
  // --------------------------

  try {
    const systemPrompt = `${HR_INTERVIEW_SYSTEM_PROMPT}\n\nCandidate Setup Values:\n- Target Job Role: ${targetRole}\n- Company Name: ${companyName}\n- Experience Level: ${expLevel}\n- Resume Profile: ${profile}\n- Industry: ${industry}\n- Preferred Language: ${language}\n- Interview Style: ${style}\n- Difficulty Level: ${difficulty}`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt
    });

    const chat = model.startChat({
      history: history || []
    });

    const result = await chat.sendMessage(message);
    const reply = result.response.text();

    res.json({ reply });
  } catch (error) {
    console.error('Error in /api/hr-simulator/turn:', error);
    res.status(500).json({
      error: 'Failed to process HR interview turn using Gemini API',
      details: error.message
    });
  }
});

/**
 * Route: Evaluate Personalized HR Interview Transcript
 */
app.post('/api/hr-simulator/evaluate', async (req, res) => {
  const { history, targetRole, companyName } = req.body;

  if (!history || history.length === 0) {
    return res.status(400).json({ error: 'Interview history transcript is required' });
  }

  // --- DEMO MODE FALLBACK ---
  if (!hasApiKey) {
    return res.json({
      overall_score: 82,
      hiring_recommendation: "HIRE",
      hiring_reason: "The candidate demonstrates strong communication skills and clear motivation to grow their skills. They successfully used structured STAR format examples to describe their Deloitte job simulation project, demonstrating strong problem-solving capacity, although they need to upgrade their Python skills from beginner to intermediate to be fully ready for senior roles.",
      category_scores: {
        communication_skills: 85,
        confidence: 80,
        professionalism: 88,
        clarity_of_thought: 84,
        leadership_potential: 70,
        teamwork: 78,
        emotional_intelligence: 82,
        cultural_fit: 86,
        career_motivation: 90,
        overall_role_fit: 82
      },
      strengths: [
        "Strong structural flow when explaining your Deloitte project scenario.",
        "Excellent alignment with our company values regarding self-learning and proactive improvement.",
        "Clarity of career goals (dream path) shows high ambition and self-awareness."
      ],
      improvements: [
        "Use more quantifiable metrics (e.g. percentages, dashboard user counts) in your STAR responses.",
        "Your Python skills were noted as beginner; express more proactive urgency in how you are working to upgrade it.",
        "Try to soften explanations of team conflicts by emphasizing collaborative alignment earlier."
      ],
      questions_answered_well: [
        {
          question: "Tell me a bit about yourself and why you're interested in this role.",
          answer: history[2] ? history[2].parts[0].text : "I am a graduate looking for Data Analyst jobs.",
          reason: "Directly connected certification background with target consulting work at Deloitte."
        }
      ],
      questions_needing_improvement: [
        {
          question: "Can you share a specific situation during that or another project where you had to handle an urgent challenge?",
          answer: history[4] ? history[4].parts[0].text : "I worked on a Python EDA project and had to clean a lot of messy data before creating Power BI dashboards.",
          reason: "Too generic and lacked concrete business impact or STAR structuring details."
        }
      ],
      improved_sample_answers: [
        {
          question: "Can you share a specific situation during that or another project where you had to handle an urgent challenge?",
          original_answer: history[4] ? history[4].parts[0].text : "I worked on a Python EDA project and had to clean a lot of messy data before creating Power BI dashboards.",
          improved_answer: "During my Deloitte Australia Job Simulation, our client's source database had missing logs three days before the review. I took the lead, wrote a Python Pandas cleanup script to impute empty entries, and deployed the Power BI dashboard on time, achieving a 100% data integrity rating."
        }
      ],
      real_hr_questions: [
        "Why do you want to work for Deloitte Australia specifically?",
        "Where do you see yourself in five years?",
        "Tell me about a time you worked in a team and faced a major deadline constraint.",
        "How do you handle feedback when someone criticizes your data visualization choices?",
        "Describe a time you went above and beyond to solve a data anomaly.",
        "What are your salary expectations for this Data Analyst role?",
        "Why should we hire you over other candidates with similar certifications?",
        "How do you prioritize multiple analysis requests from different stakeholders?",
        "Tell me about a time you failed to meet a project goal and what you learned.",
        "What data analyst tool are you most passionate about, and why?"
      ],
      personalized_improvement_plan: {
        immediate_improvements: "Focus on formulating three distinct STAR-method stories emphasizing quantifiable metrics.",
        preparation_plan_24h: "Write out answers to Deloitte's core behavioral questions, practice them aloud in front of a mirror, and review key dashboard metrics.",
        preparation_plan_7d: "Perform 3 mock interviews daily, expand Python programming fundamentals to reach an intermediate level, and polish your LinkedIn profile summary.",
        interview_day_tips: "Take deep breaths to control vocal pace, dress professionally, and ensure your camera and microphone are optimized."
      },
      qa_review: [
        {
          question: "Tell me a bit about yourself and why you're interested in this role.",
          answer: history[2] ? history[2].parts[0].text : "I am a graduate looking for Data Analyst jobs.",
          score: 85,
          critique: "Clear and confident overview. Good mention of certification highlights. Could align the 'why this company' part more tightly with the target company values.",
          model_answer: "I am a certified Data Analyst with a Google certification and a Deloitte job simulation. I specialize in Python and SQL. I am excited to join your company because of your data-driven culture and focus on solving scaling challenges."
        },
        {
          question: "Can you share a specific situation during that or another project where you had to handle an urgent challenge?",
          answer: history[4] ? history[4].parts[0].text : "I worked on a Python EDA project and had to clean a lot of messy data before creating Power BI dashboards.",
          score: 78,
          critique: "Excellent technical outline of the data cleaning pipeline. To improve, apply the STAR framework more explicitly: what was the business impact or user count of the dashboards?",
          model_answer: "For our graduation dashboard, the client needed real-time charts within 3 days. I used Pandas to automate data cleaning, decreasing processing time by 40% and deploying the Power BI dashboard on time."
        }
      ]
    });
  }
  // --------------------------

  try {
    const userPrompt = `Evaluate the following transcript of an HR mock interview for the role of "${targetRole || 'Data Analyst'}" at "${companyName || 'Deloitte Australia'}".\n\nTranscript History:\n${JSON.stringify(history)}`;

    const result = await queryGemini(
      `You are an elite HR consultant evaluating interview transcripts. Grade the candidate response on STAR structure, confidence, cultural fit, and communication clarity. Return JSON matching the schema.`,
      userPrompt,
      HR_INTERVIEW_EVALUATION_SCHEMA
    );
    res.json(result);
  } catch (error) {
    console.error('Error in /api/hr-simulator/evaluate:', error);
    res.status(500).json({
      error: 'Failed to evaluate HR interview using Gemini API',
      details: error.message
    });
  }
});

/**
 * Route: Job Openings Finder Search
 */
app.post('/api/job-finder/search', async (req, res) => {
  const { role, location, experience, expectedSalary, employmentType, industryPreference } = req.body;

  // --- DEMO MODE FALLBACK ---
  if (!hasApiKey) {
    return res.json({
      jobs: [
        {
          title: "HR Manager",
          company: "TechNovus India",
          location: "Vadodara, Gujarat (Hybrid)",
          salary: "₹7.0 - 9.0 LPA",
          date_posted: "3 days ago",
          apply_link: "https://jobs.lever.co/technovus/hr-manager-340"
        },
        {
          title: "People Operations Generalist",
          company: "Mediaverse Corp",
          location: "Vadodara, Gujarat",
          salary: "₹6.0 - 8.0 LPA",
          date_posted: "5 days ago",
          apply_link: "https://boards.greenhouse.io/mediaverse/jobs/482019"
        },
        {
          title: "Human Resources Lead",
          company: "CyberNova Studios",
          location: "Remote (India)",
          salary: "₹8.0 - 10.0 LPA",
          date_posted: "10 days ago",
          apply_link: "https://careers.cybernova.com/jobs/hr-lead-231"
        },
        {
          title: "Assistant HR Manager",
          company: "InfraBuild Projects",
          location: "Vadodara, Gujarat",
          salary: "₹6.5 LPA",
          date_posted: "12 days ago",
          apply_link: "https://careers.infrabuild.com/listings/assistant-hr-manager"
        },
        {
          title: "HR Generalist",
          company: "Apex Solutions",
          location: "Vadodara, Gujarat",
          salary: "₹7.0 LPA",
          date_posted: "15 days ago",
          apply_link: "https://jobs.lever.co/apex-solutions/hr-generalist"
        },
        {
          title: "People Operations Manager",
          company: "Flicker Media",
          location: "Remote (India)",
          salary: "₹9.0 LPA",
          date_posted: "18 days ago",
          apply_link: "https://boards.greenhouse.io/flickermedia/jobs/59102"
        },
        {
          title: "Human Resources Manager",
          company: "TCS Vadodara",
          location: "Vadodara, Gujarat",
          salary: "₹8.5 LPA",
          date_posted: "20 days ago",
          apply_link: "https://www.tcs.com/careers/india/hr-manager-positions"
        },
        {
          title: "HR Manager",
          company: "StarHub Communications",
          location: "Vadodara, Gujarat",
          salary: "₹7.5 LPA",
          date_posted: "22 days ago",
          apply_link: "https://careers.starhub.com/job/hr-manager-gujarat"
        },
        {
          title: "Talent Operations Lead",
          company: "Wipro Digital",
          location: "Vadodara, Gujarat (Hybrid)",
          salary: "₹9.5 LPA",
          date_posted: "25 days ago",
          apply_link: "https://careers.wipro.com/jobs/talent-operations-lead"
        },
        {
          title: "HR Executive (Generalist)",
          company: "L&T Vadodara",
          location: "Vadodara, Gujarat",
          salary: "₹6.0 LPA",
          date_posted: "28 days ago",
          apply_link: "https://careers.lntecc.com/jobs/hr-executive-generalist"
        }
      ],
      top_matches: [
        {
          title: "HR Manager",
          company: "TechNovus India",
          reason: "Matches your salary range (7-9 LPA), is local in Vadodara, and is in your preferred tech/hybrid setting."
        },
        {
          title: "People Operations Generalist",
          company: "Mediaverse Corp",
          reason: "Directly aligns with your Media industry preference and matches your exact experience profile."
        },
        {
          title: "Human Resources Lead",
          company: "CyberNova Studios",
          reason: "Fully remote role that meets the high end of your salary expectation (up to 10 LPA)."
        }
      ],
      alternate_titles: [
        "People Operations Lead",
        "HR Business Partner (HRBP)",
        "Talent Acquisition & Operations Manager"
      ]
    });
  }

  try {
    const userPrompt = `Search criteria:\n- Job Title: ${role}\n- Location: ${location}\n- Experience: ${experience}\n- Expected Salary: ${expectedSalary}\n- Employment Type: ${employmentType}\n- Industry Preference: ${industryPreference}\n\nGenerate exactly 10 matching jobs, highlight top 3 matches, and provide alternate search titles.`;

    const result = await queryGemini(
      JOB_FINDER_SYSTEM_PROMPT,
      userPrompt,
      JOB_FINDER_RESPONSE_SCHEMA
    );
    res.json(result);
  } catch (error) {
    console.error('Error in /api/job-finder/search:', error);
    res.status(500).json({
      error: 'Failed to find job openings using Gemini API',
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
      optimized_post: `I spent 6 hours debugging a model that was "working perfectly."\n\nTurns out, it was too perfect.\n\nHere's what I learned about data leakage the hard way 👇\n\nWhile training a churn prediction model last week, my accuracy hit 99.2%. I should've been suspicious. I wasn't.\n\nThe leak:\n→ I scaled the entire dataset before splitting train/test\n→ Test data statistics quietly leaked into training\n→ My "great model" had just memorized the answer key\n\n3 checks I now run on every project before trusting a metric:\n1. Split BEFORE any preprocessing, not after\n2. Check if performance is "too good" for the problem's difficulty\n3. Look for features that wouldn't exist at prediction time\n\nThe scariest part? This is a mistake even experienced folks make occasionally — it's rarely caught by code review, only by asking "does this number make sense?"\n\nWhat's a mistake in ML/DS that took you way too long to catch?\n\n3rd year CSE-DS student. Data science by major, web dev by hobby — turns out debugging discipline transfers between both.\n\n#DataScience #MachineLearning #StudentProjects`,
      hook_analysis: "The hook sets up tension immediately: 'debugging 6 hours' combined with 'working perfectly' creates a clear question in the reader's mind: 'why was it perfect?'",
      improvements_made: [
        "Structured content according to the BTech CSE-DS Adaptable template.",
        "Created an immediate pattern break on line 3.",
        "Structured the 'meat' section with actionable takeaways.",
        "Ended with a relevant discussion question and soft credibility line."
      ],
      post_type: "Mistake/Failure Explainer",
      word_count: 198
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

/**
 * Route: LinkedIn Intelligence — Tool 9a: Growth Strategist Questions
 */
app.post('/api/linkedin/growth/questions', async (req, res) => {
  const { followers, connections } = req.body;
  if (followers === undefined || connections === undefined) {
    return res.status(400).json({ error: 'Please provide baseline followers and connections.' });
  }

  if (!hasApiKey) {
    return res.json({
      isDemo: true,
      questions: [
        "What industry are you in, and what is your primary niche or target domain (e.g. Software Engineering, FinTech, Product Management)?",
        "Who is your target audience on LinkedIn (e.g. recruiters at mid-sized startups, engineering directors at tech giants, fellow developers)?",
        "What specific expertise or key projects do you want to highlight as your primary value proposition?",
        "What is your preferred content style (e.g. text-only stories, image-based tutorials, step-by-step guides, or carousel slides)?",
        "How much time can you realistically dedicate to LinkedIn activity daily (e.g. 15 minutes, 30 minutes, 1 hour)?"
      ]
    });
  }

  try {
    const userPrompt = `Baseline metrics: Current Followers = ${followers}, Current Connections = ${connections}`;
    const result = await queryGemini(GROWTH_QUESTIONS_SYSTEM_PROMPT, userPrompt, GROWTH_QUESTIONS_RESPONSE_SCHEMA);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/linkedin/growth/questions:', error);
    res.status(500).json({ error: 'Failed to generate diagnostic questions using Gemini API', details: error.message });
  }
});

/**
 * Route: LinkedIn Intelligence — Tool 9b: Growth Strategist Strategy
 */
app.post('/api/linkedin/growth/strategy', async (req, res) => {
  const { followers, connections, qaPairs } = req.body;
  if (followers === undefined || connections === undefined || !qaPairs || !Array.isArray(qaPairs)) {
    return res.status(400).json({ error: 'Baseline metrics and diagnostic Q&A pairs are required.' });
  }

  if (!hasApiKey) {
    return res.json({
      isDemo: true,
      estimated_weekly_growth: "+180 connection/follower growth per week",
      profile_optimization: {
        headline_rewrite: "🚀 Aspiring SWE @ Google | building scalable Go backend microservices | 2x Hackathon Winner | React & Node.js developer",
        about_rewrite: "I spent 6 months building a real-time multiplayer board game engine. Not because I needed another portfolio piece, but because I wanted to understand web-sockets and race conditions.\n\nToday, I build backend pipelines and React interfaces. I'm focusing my next 6 months on cloud architectures (AWS) and looking for Summer 2025 internship opportunities.",
        featured_format: "Format: Link to GitHub/live demo of your top project as the 1st card. Link to a high-performing post sharing a failure-learned lesson as the 2nd card.",
        strategy_rationale: "Aligns your profile around high-value proof-of-work (Go & microservices) which appeals directly to senior engineering directors."
      },
      outbound_strategy: {
        weekly_system: "Send 20 highly targeted connection requests daily from Monday to Friday (~100/week). Target alumni or 2nd-degree connections in tech roles.",
        target_criteria: "Focus 70% on mid-to-senior software engineers (potential referrers) and 30% on tech recruiters at Series A/B startups.",
        connection_template: "Hi [Name] — I noticed your work building scalable microservices at [Company]. I'm a CS junior specializing in Go/distributed systems. Followed your profile to learn from your technical posts. Open to connecting!"
      },
      commenting_framework: {
        daily_routine: "Engage with 5 big creators in tech, 3 peers building active projects, and 2 target connections (recruiters/managers). Daily commitment: 25 mins.",
        creators_to_target: "Find creators posting about backend architecture, cloud infrastructure, or tech career development.",
        example_comment_approach: "Avoid saying 'Great post!'. Instead, share a micro-lesson: 'This reminds me of when I tried using REST instead of gRPC. The latency difference was night and day because...'"
      },
      content_blueprint: {
        weekly_posting_plan: "Post 3 times per week (Tuesday, Wednesday, Thursday morning).",
        templates_and_formats: [
          "Format 1 (Text Story): Share the story of a bug that took you 3 days to fix.",
          "Format 2 (Carousels): A visual breakdown of 'gRPC vs REST' for students.",
          "Format 3 (Document/PDF Guide): A cheat sheet of essential Git commands you use daily."
        ],
        content_themes: [
          "Theme 1: Behind-the-scenes of building backend microservices (Document, Educate, Inspire)",
          "Theme 2: Demystifying complex technical concepts for peers",
          "Theme 3: Sharing lessons learned from failures/debugging sessions"
        ]
      },
      weekly_checklist: [
        {
          week_label: "Week 1",
          focus: "Foundation & Profile Setup",
          tasks: [
            "Rewrite your LinkedIn headline using the recommended developer structure.",
            "Update your About section to highlight the multiplayer board game engine project.",
            "Add GitHub links and live demos to your Featured section."
          ]
        },
        {
          week_label: "Week 2",
          focus: "Commenting & Outbound Launch",
          tasks: [
            "Identify and follow 5 large technical creators to target for engagement.",
            "Write at least 3 high-value comments daily using the micro-lesson approach.",
            "Send 50 personalized connection requests to 2nd-degree developer networks."
          ]
        },
        {
          week_label: "Week 3",
          focus: "Content Kickoff",
          tasks: [
            "Publish your first 'Lesson Learned from a Debugging Fail' story post.",
            "Continue daily outbound connection requests (20/day).",
            "Engage with peer creators who are building active projects."
          ]
        },
        {
          week_label: "Week 4",
          focus: "Scale & Consistency",
          tasks: [
            "Create and publish a gRPC vs REST visual carousel post.",
            "Analyze which of your posts had the highest scroll-stop engagement.",
            "Ensure you reach your target of +180 connections this week."
          ]
        }
      ]
    });
  }

  try {
    const userPrompt = `Baseline metrics: Current Followers = ${followers}, Current Connections = ${connections}\n\nDiagnostic Q&A:\n${qaPairs.map(p => `Q: ${p.question}\nA: ${p.answer}`).join('\n')}`;
    const result = await queryGemini(GROWTH_STRATEGY_SYSTEM_PROMPT, userPrompt, GROWTH_STRATEGY_RESPONSE_SCHEMA);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/linkedin/growth/strategy:', error);
    res.status(500).json({ error: 'Failed to generate growth strategy using Gemini API', details: error.message });
  }
});

// Health-check endpoint — used by ConnectivityGuard for real connectivity probing
// Responds to both GET (debug) and HEAD (lightweight probe) requests
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});
app.head('/api/status', (req, res) => {
  res.status(200).end();
});

// Start the server
app.listen(port, () => {
  console.log('\x1b[32m%s\x1b[0m', `🚀 AegisResil Apex Server is running on http://localhost:${port}`);
  console.log('\x1b[36m%s\x1b[0m', `👉 Access the application in your browser at http://localhost:${port}`);
});

