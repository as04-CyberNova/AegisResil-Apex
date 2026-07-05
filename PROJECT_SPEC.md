# AegisResil Apex — Project Specification & Architecture (MVP)

AegisResil Apex is a student-focused web application designed to help students analyze potential job scams/fraudulent recruiter messages and score their resumes for quality and ATS compatibility.

This document outlines the architecture, file structure, API prompt designs, and task breakdown for the MVP implementation.

---

## 1. File Structure

We will use a clean, modular structure. A minimal Node/Express server will proxy the Gemini API calls securely and serve the static files.

```
/
├── .env                  # Port and API credentials (local/ignored)
├── .gitignore            # Ignore node_modules, .env, etc.
├── package.json          # Node dependencies (express, dotenv, @google/generative-ai)
├── server.js             # Minimal Express server (proxies Gemini API, serves /public)
├── prompts.js            # Gemini prompt templates (server-side, easy to edit)
└── public/               # Frontend static assets
    ├── index.html        # App layout (SPA with tab-based routing for dashboard, scam, resume, trust, roadmap, match, interview)
    ├── css/
    │   └── style.css     # Premium UI styling (dark/light glassmorphic UI, responsive layout)
    ├── js/
    │   ├── app.js        # Main coordinator, navigation, and page lifecycle management
    │   ├── storage.js    # Unified Storage Manager (abstracted storage layer)
    │   ├── analyzer.js   # Scam/Fraud analyzer page logic
    │   ├── scorer.js     # Resume scorer page logic (with pdf.js parsing)
    │   ├── trust.js      # Company Trust analyzer page logic
    │   ├── roadmap.js    # Career Roadmap generator page logic
    │   ├── match.js      # Internship Match score page logic
    │   ├── interview.js  # Interview Prep page logic (with practice answer grading)
    │   └── dashboard.js  # Dashboard page logic and Chart.js integration
    └── assets/
        └── logo.svg      # SVG Logo/branding
```

---

## 2. Gemini Prompt Templates (Server-Side)

To keep prompt engineering secure and maintainable, system prompts and instructions are defined in a backend-accessible file (`prompts.js`). Both prompts will enforce JSON mode from the Gemini model.

### 2.1. Scam/Message Analyzer Prompt
*   **Role**: Security Analyst & Recruiter Fraud Expert
*   **MIME Output**: `application/json`
*   **System Prompt & Instructions**:
    ```javascript
    const SCAM_ANALYZER_SYSTEM_PROMPT = `
    You are a professional security analyst specializing in identifying job recruitment fraud, phishing scams, and predatory employment practices targeting college students and entry-level job seekers.

    Analyze the provided job description, email, SMS, or WhatsApp message for potential red flags. Your assessment must be highly objective.

    Generate a JSON response that conforms to the following schema:
    {
      "risk_score": 0,       // Integer from 0 to 100 representing the likelihood of it being a scam.
      "risk_level": "LOW",   // "LOW" (0-30), "MEDIUM" (31-70), or "HIGH" (71-100)
      "red_flags": [],       // Array of strings detailing specific warning signs found (e.g. "Sent from personal email address", "Vague responsibilities", "Demands upfront payment for equipment").
      "recommendation": ""   // A clear, actionable text warning or recommendation for the student on how to proceed.
    }

    Scam Assessment Criteria:
    - High Risk (71-100): Asks for upfront money/fees, promises massive pay for virtually no work, communicates solely via Telegram/Signal, asks for banking info early, or sends check for 'supplies'.
    - Medium Risk (31-70): Vague company presence, high grammar mistakes, generic emails (@gmail.com, @outlook.com) claiming to represent large firms, high-pressure deadlines.
    - Low Risk (0-30): Verified company details, standard hiring process description, realistic wages, professional communication.
    `;
    ```

### 2.2. Resume Scorer Prompt
*   **Role**: Senior Technical Recruiter & ATS Optimization Specialist
*   **MIME Output**: `application/json`
*   **System Prompt & Instructions**:
    ```javascript
    const RESUME_SCORER_SYSTEM_PROMPT = `
    You are an expert resume reviewer and applicant tracking system (ATS) optimization specialist.

    Analyze the text of the uploaded resume. Score the resume based on key recruitment standards: impact/quantifiable results, formatting structure, skill presentation, and general ATS compatibility.

    Generate a JSON response that conforms to the following schema:
    {
      "overall_score": 0,             // Integer from 0 to 100
      "ats_compatibility_notes": [],  // Array of strings highlighting layout or parser problems (e.g., "Contains tables or graphics which could break basic parsers", "Missing clear section headers").
      "missing_keywords": [],         // Array of 3-6 standard industry skills or keywords that appear missing based on the candidate's career level and field.
      "suggestions": []               // Array of 3-5 high-impact, actionable improvements (e.g., "Quantify achievements: change 'wrote code' to 'developed feature X, reducing load times by 20%'").
    }
    `;
    ```

### 2.3. Company Trust Analyzer Prompt
*   **Role**: Business Legitimacy Analyst & Corporate Cybersecurity Evaluator
*   **MIME Output**: `application/json`
*   **System Prompt & Instructions**:
    ```javascript
    const COMPANY_TRUST_SYSTEM_PROMPT = `
    You are a professional business trust analyst and corporate security evaluator.
    
    Analyze the provided company name, optional website URL, and optional job description text to assess the company's legitimacy and trustworthiness.
    
    Identify signals such as domain formatting, public brand visibility, potential registry/presence patterns, and common scam indicators.
    
    IMPORTANT DISCLAIMER TO ENFORCE: You must explicitly call out that this analysis is based on AI pattern-matching and search grounding (if available), and not verified registry/WHOIS data. The confidence level must be carefully calibrated (e.g. LOW or MEDIUM if no verifiable public signals exist).
    
    Generate a JSON response that conforms to the following schema:
    {
      "trust_score": 0,          // Integer from 0 to 100 (higher means more trustworthy/legitimate)
      "confidence_level": "LOW", // "LOW", "MEDIUM", or "HIGH"
      "signals_checked": [],     // Array of strings detailing specific signals analyzed (e.g. "Website domain analysis", "Search presence", "News coverage found").
      "caveats": [],             // Array of strings listing concerns/warnings. Must ALWAYS include: "This is an AI evaluation, not a official registry/WHOIS verification. Manually verify via corporate registries, LinkedIn, or phone."
      "recommendation": ""       // Text summarizing recommendations on how the candidate should safely proceed.
    }
    `;
    ```

### 2.4. Career Roadmap Generator Prompt
*   **Role**: Career Coach & Technical Education Advisor
*   **MIME Output**: `application/json`
*   **System Prompt & Instructions**:
    ```javascript
    const CAREER_ROADMAP_SYSTEM_PROMPT = `
    You are an expert career coach and technical education advisor.
    
    Develop a structured, month-by-month study and skill-building roadmap for a student based on their current skill level, target role, and optional resume context.
    
    Generate a JSON response that conforms to the following schema:
    {
      "roadmap": [
        {
          "month": 1,
          "focus_area": "Focus Area Title",
          "tasks": ["Task 1", "Task 2"],
          "resources": ["Resource 1 with general descriptions"]
        }
      ],
      "estimated_timeline_months": 3, // Match user input timeline request if specified
      "key_milestones": []           // Array of 3-5 major milestones the student should achieve
    }
    `;
    ```

### 2.5. Internship Match Score Prompt
*   **Role**: Recruitment Matchmaker & ATS Parsing Expert
*   **MIME Output**: `application/json`
*   **System Prompt & Instructions**:
    ```javascript
    const INTERNSHIP_MATCH_SYSTEM_PROMPT = `
    You are an expert recruitment matchmaker and ATS parsing expert.
    
    Evaluate how well a student's resume/skills match a given internship description.
    
    Generate a JSON response that conforms to the following schema:
    {
      "match_score": 0,        // Integer from 0 to 100 representing job fit
      "matched_skills": [],    // Array of skills/technologies from the student's profile that match the job description
      "skill_gaps": [],        // Array of key skills/qualifications missing in the student's profile but required/preferred by the job
      "recommendation": ""     // Text summarizing actionable steps, e.g. "Apply now!" or "Focus on building skills X and Y before applying"
    }
    `;
    ```

### 2.6. Interview Preparation Prompt
*   **Role**: Technical Interviewer & Behavioral Coach
*   **MIME Output**: `application/json`
*   **System Prompt & Instructions**:
    ```javascript
    const INTERVIEW_PREP_SYSTEM_PROMPT = `
    You are a technical interviewer and behavioral coach.
    
    Generate 4-6 interview questions (behavioral and technical) customized to the student's target role and optional job description text, complete with preparation tips and an overall preparation roadmap.
    
    Generate a JSON response that conforms to the following schema:
    {
      "questions": [
        {
          "question": "Question text?",
          "category": "behavioral", // "behavioral" or "technical"
          "tip": "Tip on how to construct a strong response"
        }
      ],
      "prep_roadmap": [] // Array of short preparation steps
    }
    `;
    ```

---

## 3. Storage Tradeoff Decision

We will implement a **Unified Storage Manager (`public/js/storage.js`)** that abstracts storage interactions:
1.  **MVP Choice (LocalStorage)**: To keep deployment and local setup seamless (zero credentials needed), we will use browser `localStorage` as the default storage engine.
2.  **Tradeoff Details**:
    *   *LocalStorage*: Extremely fast, 100% client-side, zero configuration. Cons: Restricted to a single browser/device, data cleared if site data is wiped.
    *   *Firestore*: Allows sync across devices, persistent, professional database. Cons: Needs Firebase Console setup, credentials configuration, and SDK download, creating a higher initial friction for developers running the repo.
3.  **Clean Code Design**: The `storage.js` module will expose simple CRUD functions (`saveAnalysis`, `getScamHistory`, `getResumeHistory`, `getStats`). This keeps the app modular so it can be swapped to Firestore in Phase 2 with zero modifications to any other files.

---

## 4. Task Breakdown & Implementation Roadmap

### Phase 1: Environment & Server Setup
1.  Initialize Node.js project (`package.json`) and install core dependencies (`express`, `dotenv`, `@google/generative-ai`).
2.  Create `server.js` with port config, API routes (`/api/analyze-scam`, `/api/score-resume`), and secure environment variables loading.
3.  Create `prompts.js` storing system instructions and schema definitions.
4.  Configure static file sharing so Express serves the `/public` directory.

### Phase 2: Frontend Foundation & Navigation (SPA)
1.  Create `public/index.html` with a premium dark glassmorphic sidebar layout.
2.  Create CSS system variables (`public/css/style.css`) supporting a cohesive color scheme (Charcoal Black background, neon cyan/green accents, alert red/amber flags, clean Inter font).
3.  Implement tab-based routing in `public/js/app.js` to switch between views (Dashboard, Scam Analyzer, Resume Scorer) without reloading.

### Phase 3: Storage Layer & Dashboard Visualization
1.  Create `public/js/storage.js` to record timestamped analysis entries and compute aggregate metrics.
2.  Integrate Chart.js in `public/js/dashboard.js`. Render a line/bar chart displaying the trend of scam risk scores and resume scores over time.
3.  Design the dashboard metrics cards (Total Checks, Average Scam Risk, Best Resume Score).

### Phase 4: Scam/Message Analyzer Feature
1.  Design the inputs page layout: Textarea, character counter, and analyze button.
2.  Write `public/js/analyzer.js` to capture input, call `/api/analyze-scam` on the backend, display a premium loading state, and render the response card.
3.  Style the risk card dynamically based on output risk level (LOW = emerald green, MEDIUM = warning orange, HIGH = crimson red) listing red flags and suggestions.

### Phase 5: Resume Scorer Feature (PDF Parsing)
1.  Integrate PDF.js client-side parser CDN.
2.  Create input file upload container supporting PDF and TXT drops.
3.  Write `public/js/scorer.js` to handle file selection, parse PDF/TXT text directly in the browser, send the text payload to `/api/score-resume`, and process results.
4.  Render the dynamic resume score card with animated score circle, ATS compatibility warning list, missing keywords tags, and improvements cards.

### Phase 6: Final Polish, Security, and Documentation
1.  Add input validation checks (empty strings, excessively short text).
2.  Implement robust backend error-handling (model failures, API limits, bad JSON extraction) returning polite error payloads to the client.
3.  Write a professional `README.md` with:
    *   Explicit disclosure of LLM reasoning capabilities (not a trained static classifier).
    *   Setup instructions.
    *   "Phase 2" roadmap (e.g., Firestore sync, full auth, domain analysis).

### Phase 7: Company Trust Analyzer (Feature 3)
1. Expose server-side `/api/analyze-company` which enables Google Search grounding by passing `tools: [{ googleSearch: {} }]` to the model.
2. Gracefully handle fallback to non-grounded evaluation if search is unavailable or returns errors. Identify the mode used in the JSON response (`search_grounded: true/false`).
3. Create UI panel in `public/index.html` with Company Name, Website URL, and Job Posting Text inputs.
4. Implement a clear Disclaimer banner: "This analysis is based on AI reasoning, not verified domain/business registry data. Always independently confirm company legitimacy before applying or paying any fee."
5. Write `public/js/trust.js` to handle form submission, loading state, rendering trust scores, checked signals, caveats, and recommendations.

### Phase 8: Career Roadmap Generator (Feature 4)
1. Expose server-side `/api/generate-roadmap`.
2. Retrieve resume text from Session storage if available, and merge with inputs (Target role, skill level, and requested timeline).
3. Create UI panel in `public/index.html` with inputs for skill level (dropdown), target role, custom timeline (months), and a button.
4. Write `public/js/roadmap.js` to handle generation and rendering of month cards in a timeline/stepper layout. Implement a "Regenerate" trigger button.

### Phase 9: Internship Match Score (Feature 5)
1. Expose server-side `/api/match-internship`.
2. Retrieve resume/skills profile from local session data or allow manual skills input if not present.
3. Create UI panel in `public/index.html` to paste job/internship description.
4. Write `public/js/match.js` to manage the request and render the match scorecard (matching skills, skill gaps, recommendation).

### Phase 10: Interview Preparation (Feature 6)
1. Expose server-side `/api/prep-interview`.
2. Create UI panel in `public/index.html` listing generated questions in an accordion format (expand to see answer tip).
3. Implement a single-round response grader where the user types a practice response to a question, submits to `/api/grade-answer`, and gets constructive AI feedback.
4. Write `public/js/interview.js` to manage prep roadmap, practice questions display, and practice answer feedback.

### Phase 11: Extended Dashboard & Integration
1. Extend `public/js/storage.js` to log history for trust scores, roadmaps, and match scores.
2. Update `public/js/dashboard.js` to integrate these new metrics in the Chart.js visualizer and update the metrics display.
3. Modify client router `public/js/app.js` to route the 4 new views and sync session data.
4. Perform security checks, error validation, and update the README.md to catalog reasoning limits and future Phase 3 features.

### Phase 12: Skill-Gap Micro-Lessons (Feature 7)
1. Add backend route `/api/skill-lesson` to query Gemini for learning roadmaps, explainer text, exercises, and curated search resources.
2. Setup client-side event listeners in `public/js/match.js` and `public/js/roadmap.js` to make skill gaps tags clickable.
3. On click, display a modal pre-filled with the selected skill and fetch the micro-lesson analysis.
4. Implement localStorage caching for micro-lesson responses using the skill name as the lookup key to avoid redundant API requests.

### Phase 13: Cover Letter & Application Message Generator (Feature 8)
1. Add backend route `/api/generate-cover-letter` with option parameters for document format/tone ("Formal Cover Letter" vs "Short Application Message").
2. Create UI panel in `public/index.html` with job description inputs, format toggles, and manual background fallback textareas.
3. Expose the generated draft inside an editable textarea in the results tab alongside a copy to clipboard button and warning notices.

### Phase 14: LinkedIn/Profile Optimizer (Feature 9)
1. Add backend route `/api/optimize-profile` to grade headlines and bio sections against standard recruiting layouts.
2. Create UI panel in `public/index.html` with inputs for headlines and about/bio text.
3. Reuse the Resume Scorer overall quality gauge design to show headline and bio quality scores, rewrite recommendations, and warning notices.

