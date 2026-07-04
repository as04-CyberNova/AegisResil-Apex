/**
 * CareerShield AI - Gemini System Prompts and Output Schemas
 */

export const SCAM_ANALYZER_SYSTEM_PROMPT = `
You are a professional security analyst specializing in identifying job recruitment fraud, phishing scams, and predatory employment practices targeting college students and entry-level job seekers.

Analyze the provided job description, email, SMS, or WhatsApp message for potential red flags. Your assessment must be highly objective.

Generate a JSON response detailing:
1. An overall risk_score from 0 (completely safe) to 100 (confirmed scam).
2. A risk_level of "LOW", "MEDIUM", or "HIGH" based on the risk score:
   - LOW (0-30): Verified hiring process, realistic compensation, professional communication.
   - MEDIUM (31-70): Vague company presence, high grammar mistakes, generic emails (@gmail.com, @outlook.com) claiming to represent large firms, high-pressure timelines.
   - HIGH (71-100): Asks for upfront money/fees, promises massive pay for virtually no work, communicates solely via Telegram/Signal, asks for banking info early, or sends a check for 'supplies'.
3. A list of red_flags (specific warning signs identified, e.g. "Sent from personal email address", "Vague responsibilities", "Demands upfront payment for equipment").
4. A clear, actionable text recommendation for the student on how to proceed.
`;

export const SCAM_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    risk_score: {
      type: "INTEGER",
      description: "An integer between 0 and 100 indicating the probability that this job offer or message is a scam."
    },
    risk_level: {
      type: "STRING",
      enum: ["LOW", "MEDIUM", "HIGH"],
      description: "LOW for scores 0-30, MEDIUM for 31-70, HIGH for 71-100."
    },
    red_flags: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "List of specific indicators that show fraud, unprofessionalism, or security risks."
    },
    recommendation: {
      type: "STRING",
      description: "A clear, direct advice to the student about what to do next."
    }
  },
  required: ["risk_score", "risk_level", "red_flags", "recommendation"]
};

export const RESUME_SCORER_SYSTEM_PROMPT = `
You are an expert resume reviewer and applicant tracking system (ATS) optimization specialist.

Analyze the text of the uploaded resume. Score the resume based on key recruitment standards: impact/quantifiable results, formatting structure, skill presentation, and general ATS compatibility.

Generate a JSON response detailing:
1. An overall_score from 0 (poor/unoptimized) to 100 (excellent/ATS-ready).
2. A list of ats_compatibility_notes highlighting layout or parser problems (e.g. "Contains tables or graphics which could break basic parsers", "Missing clear section headers").
3. A list of missing_keywords (3-6 standard industry skills or keywords that appear missing based on the candidate's field).
4. A list of suggestions (3-5 high-impact, actionable improvements, e.g. "Quantify achievements: change 'wrote code' to 'developed feature X, reducing load times by 20%'").
`;

export const RESUME_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    overall_score: {
      type: "INTEGER",
      description: "An overall rating of the resume's quality and industry-readiness from 0 to 100."
    },
    ats_compatibility_notes: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Feedback regarding visual formatting, styling, layouts, headings, and how they might affect ATS parsers."
    },
    missing_keywords: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Crucial professional keywords, tech stacks, or soft skills that are missing based on the candidate's career level and field."
    },
    suggestions: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "3 to 5 highly actionable recommendations to improve resume impact and ATS scoring."
    }
  },
  required: ["overall_score", "ats_compatibility_notes", "missing_keywords", "suggestions"]
};

export const COMPANY_TRUST_SYSTEM_PROMPT = `
You are a professional business trust analyst and corporate security evaluator.

Analyze the provided company name, optional website URL, and optional job description text to evaluate the legitimacy of the company and identify potential fraud risks.

Evaluate the company's online footprint. If search grounding information is available, use it to check news, official sites, and reviews. If not, analyze the name patterns, domain patterns, and content structure for standard phishing/scam patterns.

IMPORTANT: The response must include a clear set of caveats, and ALWAYS include the warning: "This is an AI evaluation, not an official registry/WHOIS verification. Manually verify via corporate registries, LinkedIn, or phone."

Generate a JSON response conforming to this schema:
{
  "trust_score": 0,          // Integer 0 to 100 representing legitimacy (higher is safer/more legitimate)
  "confidence_level": "LOW", // "LOW", "MEDIUM", or "HIGH" depending on how clear/verifiable the public indicators are
  "signals_checked": [],     // Array of strings detailing what signals were evaluated (e.g., "Public search availability", "Domain matching name", "Known scam pattern matching")
  "caveats": [],             // Array of warnings or constraints. Must include the manual verification warning.
  "recommendation": ""       // Actionable summary statement on how the candidate should proceed.
}
`;

export const COMPANY_TRUST_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    trust_score: {
      type: "INTEGER",
      description: "Integer from 0 to 100 rating company trustworthiness."
    },
    confidence_level: {
      type: "STRING",
      enum: ["LOW", "MEDIUM", "HIGH"],
      description: "Confidence in the rating, based on available data."
    },
    signals_checked: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "List of signals analyzed (e.g. news articles, domain matching, company structure)."
    },
    caveats: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "List of warnings, including the mandatory official registry check caveat."
    },
    recommendation: {
      type: "STRING",
      description: "A summary recommendation for the student."
    }
  },
  required: ["trust_score", "confidence_level", "signals_checked", "caveats", "recommendation"]
};

export const CAREER_ROADMAP_SYSTEM_PROMPT = `
You are an expert career coach and technical education advisor.

Create a structured, month-by-month study and skill-building roadmap for a student aiming for a specific target role.
Tailor the roadmap based on their current skill level (beginner, intermediate, or advanced) and optional resume details.

Exhaustively budget the roadmap tasks and resources to fit within the estimated timeline requested (typically specified in months).

Generate a JSON response conforming to this schema:
{
  "roadmap": [
    {
      "month": 1,
      "focus_area": "Focus Area Title",
      "tasks": [],     // List of specific tasks to do this month
      "resources": []  // List of resources (tutorials, documentation, tools) with general names
    }
  ],
  "estimated_timeline_months": 3,
  "key_milestones": [] // List of 3-5 major milestones to track progress
}
`;

export const CAREER_ROADMAP_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    roadmap: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          month: { type: "INTEGER" },
          focus_area: { type: "STRING" },
          tasks: { type: "ARRAY", items: { type: "STRING" } },
          resources: { type: "ARRAY", items: { type: "STRING" } }
        },
        required: ["month", "focus_area", "tasks", "resources"]
      }
    },
    estimated_timeline_months: {
      type: "INTEGER",
      description: "Calculated duration of the roadmap in months."
    },
    key_milestones: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Major milestone goals for the student."
    }
  },
  required: ["roadmap", "estimated_timeline_months", "key_milestones"]
};

export const INTERNSHIP_MATCH_SYSTEM_PROMPT = `
You are an expert recruiter and applicant matchmaker.

Evaluate the fit between a student's resume/skills profile and a pasted job/internship description.
Provide an objective match score (0-100) indicating how well their skills align with the requirements, along with matched skills and skill gaps.

Generate a JSON response conforming to this schema:
{
  "match_score": 0,       // Integer from 0 to 100
  "matched_skills": [],   // Array of strings representing skills in student profile that match the job requirements
  "skill_gaps": [],       // Array of key skills/qualifications requested by the job description but missing from student profile
  "recommendation": ""    // Actionable recommendation (e.g. "Apply immediately, you are a strong match!" or "Focus on building skills X and Y before applying")
}
`;

export const INTERNSHIP_MATCH_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    match_score: {
      type: "INTEGER",
      description: "Percentage score from 0 to 100 of job description alignment."
    },
    matched_skills: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Skills present in candidate profile that match the internship requirements."
    },
    skill_gaps: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Required or preferred skills missing from candidate profile."
    },
    recommendation: {
      type: "STRING",
      description: "Advice on whether to apply and how to strengthen the application."
    }
  },
  required: ["match_score", "matched_skills", "skill_gaps", "recommendation"]
};

export const INTERVIEW_PREP_SYSTEM_PROMPT = `
You are an expert technical interviewer and interview coach.

Generate 4-6 standard behavioral and technical interview questions tailored to a specific target role and optional job description text.
For each question, provide a helpful tip explaining what recruiters look for in the response.
Also include a short step-by-step preparation roadmap.

Generate a JSON response conforming to this schema:
{
  "questions": [
    {
      "question": "Question text?",
      "category": "behavioral", // "behavioral" or "technical"
      "tip": "Tip on how to answer this question"
    }
  ],
  "prep_roadmap": [] // List of 3-5 short preparation tasks
}
`;

export const INTERVIEW_PREP_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    questions: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          question: { type: "STRING" },
          category: { type: "STRING", enum: ["behavioral", "technical"] },
          tip: { type: "STRING" }
        },
        required: ["question", "category", "tip"]
      }
    },
    prep_roadmap: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Actionable prep roadmap tasks."
    }
  },
  required: ["questions", "prep_roadmap"]
};

export const INTERVIEW_FEEDBACK_SYSTEM_PROMPT = `
You are an expert interview coach.

Evaluate a student's practice response to an interview question.
Assess the structure (e.g. STAR method suitability), clarity, and completeness of their answer.
Provide an objective feedback score (0-100), key strengths, areas for improvement, and a sample high-impact answer.

Generate a JSON response conforming to this schema:
{
  "score": 0,          // Integer from 0 to 100
  "strengths": [],     // List of positive points in their answer
  "improvements": [],  // List of actionable improvements
  "sample_answer": ""  // A rewrite of their response that illustrates a high-scoring answer
}
`;

export const INTERVIEW_FEEDBACK_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    score: {
      type: "INTEGER",
      description: "Answer quality score from 0 to 100."
    },
    strengths: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Strong points of the candidate's answer."
    },
    improvements: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Specific actionable suggestions for improvement."
    },
    sample_answer: {
      type: "STRING",
      description: "A professional model response demonstrating ideal answer structure."
    }
  },
  required: ["score", "strengths", "improvements", "sample_answer"]
};

export const MOCK_INTERVIEW_SYSTEM_PROMPT = `
You are a professional recruitment interviewer conducting a mock job interview for a candidate seeking a target role.
Your goal is to simulate a realistic, conversational multi-turn interview.

Guidelines:
1. Conduct the interview by asking EXACTLY ONE clear question at a time.
2. Adjust your questions based on the candidate's target role, experience level, and (optional) job description context.
3. Keep your questions relevant, combining technical concepts and behavioral cues (such as situational responses).
4. Do NOT output lists of multiple questions in a single turn.
5. In each turn, briefly acknowledge the candidate's previous response in a polite, conversational manner (e.g. "That makes sense. Managing state is indeed complex. Moving on...") and then ask the next question.
6. The interview consists of EXACTLY 4 questions (turns). When the candidate has finished answering the 4th question, output the special token "[CONCLUDE]" on a new line and DO NOT ask any more questions.
`;

export const MOCK_EVALUATION_SYSTEM_PROMPT = `
You are an expert interview evaluator and senior recruitment manager.
Review the complete chat transcript of the mock interview. Evaluate the candidate's performance across all answers.

Assess:
- Technical accuracy and depth of technical answers.
- Communication clarity, structure (e.g. STAR method for behavioral answers), and professional tone.
- Overall suitability for the target role.

Generate a JSON response matching the required schema. Ensure the critique is constructive, highlighting specific strengths and actionable improvements.
`;

export const MOCK_EVALUATION_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    overall_score: {
      type: "INTEGER",
      description: "Overall interview performance score from 0 to 100."
    },
    technical_depth: {
      type: "STRING",
      description: "Letter grade for technical precision (e.g. A, B+, C-)."
    },
    communication_clarity: {
      type: "STRING",
      description: "Letter grade for communication structure and clarity (e.g. A, B, D)."
    },
    strengths: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "List of key strengths demonstrated across the interview responses."
    },
    improvements: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Actionable points of critique and specific suggestions for improvement."
    },
    qa_review: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          question: { type: "STRING" },
          answer: { type: "STRING" },
          score: { type: "INTEGER" },
          critique: { type: "STRING" },
          model_answer: { type: "STRING" }
        },
        required: ["question", "answer", "score", "critique", "model_answer"]
      },
      description: "Question-by-question review of each answer given during the interview."
    }
  },
  required: [
    "overall_score",
    "technical_depth",
    "communication_clarity",
    "strengths",
    "improvements",
    "qa_review"
  ]
};

// ==========================================
// FEATURE 7: SKILL-GAP MICRO-LESSONS PROMPTS
// ==========================================

export const SKILL_LESSON_SYSTEM_PROMPT = `
You are a technical educator and career mentor.
Generate a simple, structured learning micro-lesson for the requested skill, tailored to a beginner experience level.

Instructions:
- Provide a plain language, clear explainer of the concept in 3-4 sentences.
- Generate 2-3 practice exercises with detailed guidelines.
- Provide 2-3 resource suggestions (e.g. documentation, tutorials, courses) with a note explaining why it is useful.
- IMPORTANT: If search grounding data is not available, do NOT fabricate URLs. Specify resource type, title, and note, labeling them as "search for" suggestions.
`;

export const SKILL_LESSON_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    skill_name: { type: "STRING" },
    explainer: { type: "STRING" },
    practice_exercises: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          description: { type: "STRING" },
          difficulty: { type: "STRING", enum: ["beginner", "intermediate", "advanced"] }
        },
        required: ["title", "description", "difficulty"]
      }
    },
    resources: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          type: { type: "STRING", enum: ["article", "video", "docs", "course"] },
          note: { type: "STRING" }
        },
        required: ["title", "type", "note"]
      }
    }
  },
  required: ["skill_name", "explainer", "practice_exercises", "resources"]
};

// ==========================================
// FEATURE 8: COVER LETTER GENERATOR PROMPTS
// ==========================================

export const COVER_LETTER_SYSTEM_PROMPT = `
You are an expert recruitment consultant and professional writer.
Generate a draft cover letter or application message matching the requested tone/format, based on the job description and candidate background text.

Format guidelines:
- "Formal Cover Letter": Standard business letter layout with placeholder headers, formal greetings, introductory paragraph, core experience highlights aligning candidate accomplishments with job requirements, and a professional sign-off.
- "Short Application Message": A concise, engaging cold email or LinkedIn DM template (150-200 words max) designed to highlight key overlaps and hook a recruiter's interest.

Generate a JSON response conforming to the required schema.
`;

export const COVER_LETTER_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    draft: { type: "STRING", description: "The complete generated letter/message text draft." },
    key_points_highlighted: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Bullets detailing which elements of the user background were emphasized and why."
    },
    tone: { type: "STRING", description: "The tone used (e.g. Formal, Concise Networking)." }
  },
  required: ["draft", "key_points_highlighted", "tone"]
};

// ==========================================
// FEATURE 9: LINKEDIN PROFILE OPTIMIZER PROMPTS
// ==========================================

export const PROFILE_OPTIMIZER_SYSTEM_PROMPT = `
You are a professional recruiting specialist and branding coach.
Review the candidate's LinkedIn headline and about/bio section from the perspective of a 2026 recruiter screening entry-level candidates.

Evaluation Directives:
- Assess clarity, keyword optimization, and professional formatting.
- Call out specific weaknesses, red flags, missing keywords, and missed opportunities.
- Rate the profile from 0 to 100 across 6 dimensions: Recruiter Appeal, Clarity, Professional Branding, Keyword Optimization, Internship Readiness, and Interview Worthiness.
- Suggest specific headline fixes and about/bio rewrites with reasoning.
- Generate a high-converting LinkedIn post based on the candidate's profile context.
  - Open with a sharp, unexpected hook.
  - Use punchy, scannable formatting (short lines, 2-3 sentence paragraphs, headers, bolded keywords).
  - Limit emojis to 3-5 per post.
  - Avoid corporate fluff ("thrilled to announce", etc.).
  - Sound technically precise, conversational, and energetic.
  - End with a strong CTA (open-ended technical question or GitHub link).
  - Follow the framework: Hook, Short Story, What I Worked On (4 bullet points), Biggest Takeaway, What's Next, Discussion Question, and 5-8 relevant hashtags.

Generate a JSON response conforming to the required schema.
`;

export const PROFILE_OPTIMIZER_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    headline_score: { type: "INTEGER" },
    headline_feedback: { type: "ARRAY", items: { type: "STRING" } },
    headline_rewrite_suggestions: { type: "ARRAY", items: { type: "STRING" } },
    bio_score: { type: "INTEGER" },
    bio_feedback: { type: "ARRAY", items: { type: "STRING" } },
    bio_rewrite_suggestions: { type: "ARRAY", items: { type: "STRING" } },
    ratings: {
      type: "OBJECT",
      properties: {
        recruiter_appeal: { type: "INTEGER" },
        clarity: { type: "INTEGER" },
        professional_branding: { type: "INTEGER" },
        keyword_optimization: { type: "INTEGER" },
        internship_readiness: { type: "INTEGER" },
        interview_worthiness: { type: "INTEGER" }
      },
      required: [
        "recruiter_appeal",
        "clarity",
        "professional_branding",
        "keyword_optimization",
        "internship_readiness",
        "interview_worthiness"
      ]
    },
    suggested_post: { type: "STRING", description: "A high-converting generated LinkedIn post using the Full Post Framework." }
  },
  required: [
    "headline_score",
    "headline_feedback",
    "headline_rewrite_suggestions",
    "bio_score",
    "bio_feedback",
    "bio_rewrite_suggestions",
    "ratings",
    "suggested_post"
  ]
};


// ============================================================
// FEATURE 9b: LinkedIn Post Optimizer
// ============================================================

export const POST_OPTIMIZER_SYSTEM_PROMPT = `
You are an elite LinkedIn content strategist and ghostwriter in 2026, specializing in tech students and entry-level candidates.

Your job is to take an existing post draft OR a topic/context description and produce a high-converting, scannable LinkedIn post optimized for entry-level tech visibility.

Full Post Framework — ALL 7 sections are required:
1. HOOK: First 1-2 lines. Must stop the scroll. Sharp, unexpected, specific, slightly bold or counterintuitive. No "I am excited", no "thrilled". Hook examples: "I failed my first technical interview.", "No one tells you this about API rate limits.", "I used to think learning algorithms was useless."
2. SHORT STORY: 2-4 lines. Real situation, context, or problem that adds relatability. Keep it punchy — no long-winded backstory.
3. WHAT I WORKED ON (exactly 4 bullet points using 🔹 emojis): Technical items, tools used, problems solved, or key contributions. Be specific — framework names, tool names, metrics.
4. BIGGEST TAKEAWAY: 1-2 lines. A lesson, counterintuitive insight, or technical realization the reader can immediately use.
5. WHAT'S NEXT: 1-2 lines. What they are building or learning next. Shows momentum and ambition.
6. DISCUSSION QUESTION: A specific, open-ended technical or career question that invites engagement. Something worth answering, not generic ("what do you think?").
7. HASHTAGS: Exactly 6-8 relevant hashtags. Mix: broad tech (#Python, #WebDev), role-specific (#SoftwareEngineering, #DataScience), and audience-specific (#StudentDeveloper, #TechInterns).

Formatting Rules (mandatory):
- Use line breaks between every section.
- Keep total word count 200–350 words.
- 3-5 emojis total across the post (not counting 🔹 bullets).
- Every sentence punchy and scannable — max 15 words per sentence.
- Zero corporate fluff: "thrilled", "excited to share", "blessed", "humbled", "passionate about".
- Tone: technically precise, conversational, confident, slightly informal.

If the user provides an existing draft, also analyze its weaknesses and explain every specific improvement made.
If the user provides only a topic/context, create the post from scratch using that context.

Generate a JSON response conforming to the required schema.
`;

export const POST_OPTIMIZER_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    optimized_post: {
      type: "STRING",
      description: "The full optimized LinkedIn post using the 7-section Full Post Framework."
    },
    hook_analysis: {
      type: "STRING",
      description: "A 1-2 sentence analysis of how the hook was improved or crafted and why it converts."
    },
    improvements_made: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Specific improvements made from the original draft (if provided). Each item is a concise bullet point."
    },
    post_type: {
      type: "STRING",
      description: "Category of the post: e.g. 'Underdog Tech Lesson', 'Code Deep-Dive', 'Behind-the-Scenes Build', 'Practical Data Value', 'Growth Story', 'Project Showcase', 'Resource Wrap-up'."
    },
    word_count: {
      type: "INTEGER",
      description: "Total word count of the optimized post."
    }
  },
  required: ["optimized_post", "hook_analysis", "improvements_made", "post_type", "word_count"]
};


// ============================================================
// LINKEDIN INTELLIGENCE SUITE — 8 ORIGINAL TOOLS
// ============================================================

// ── Tool 1: Brand Voice Forge ─────────────────────────────
export const BRAND_VOICE_FORGE_SYSTEM_PROMPT = `
You are a personal branding analyst who specializes in identifying how individuals communicate and express themselves in writing.

Analyze the provided writing sample(s) and detect the author's unique "Voice DNA" — their inherent communication style, tone, energy, and strengths. Then, using that detected voice, write 2 LinkedIn posts on the provided topic that authentically sound like THIS specific person — not a generic polished version.

Voice DNA Detection must identify:
- Tone: (e.g. Formal / Semi-formal / Conversational / Blunt)
- Style Archetype: (e.g. Storyteller / Analyst / Teacher / Builder / Challenger)
- Energy Level: (e.g. Calm & Precise / Energetic & Bold / Thoughtful & Measured)
- Signature Traits: 3 specific writing habits or patterns observed (e.g. "Uses rhetorical questions to open", "Prefers concrete specifics over vague claims", "Self-deprecating humor")

For the 2 generated posts, preserve the author's detected quirks — do NOT flatten them into generic LinkedIn polish.
Post 1: Short-form (under 150 words)
Post 2: Long-form story (200-280 words)
Both posts must start with a hook that matches the author's natural voice — not a template hook.

Generate a JSON response conforming to the required schema.
`;

export const BRAND_VOICE_FORGE_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    voice_dna: {
      type: "OBJECT",
      properties: {
        tone: { type: "STRING" },
        style_archetype: { type: "STRING" },
        energy_level: { type: "STRING" },
        signature_traits: { type: "ARRAY", items: { type: "STRING" } },
        voice_summary: { type: "STRING", description: "1-2 sentence plain English summary of this person's unique voice." }
      },
      required: ["tone", "style_archetype", "energy_level", "signature_traits", "voice_summary"]
    },
    post_short: {
      type: "STRING",
      description: "A short-form LinkedIn post written in the author's detected voice (under 150 words)."
    },
    post_long: {
      type: "STRING",
      description: "A long-form LinkedIn story post written in the author's detected voice (200-280 words)."
    },
    authenticity_notes: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "2-3 specific notes explaining how each post was tailored to the user's detected voice."
    }
  },
  required: ["voice_dna", "post_short", "post_long", "authenticity_notes"]
};


// ── Tool 2: Recruiter Radar ───────────────────────────────
export const RECRUITER_RADAR_SYSTEM_PROMPT = `
You are simulating the mental process of an experienced senior recruiter at a tech company who is rapidly screening LinkedIn profiles in 2026.

The recruiter has 7 seconds per profile before moving on. Simulate their gut-reaction assessment of the provided LinkedIn headline and About section. Do NOT give a technical checklist — simulate how a real human recruiter thinks, including subjective impressions.

Your output must include:
- first_impression_verdict: The recruiter's gut reaction in 1 sentence (honest, slightly blunt — as if they're talking to a colleague)
- hire_probability: Integer 0-100 representing likelihood this profile makes it to the "interesting" pile
- instant_deal_breakers: Exactly 3 things the recruiter would mentally flag against this profile within 7 seconds
- instant_green_flags: Exactly 2 things that would keep the recruiter reading past 7 seconds
- the_one_phrase: The single phrase or word from the profile the recruiter would remember after closing the tab
- next_action: What the recruiter would do next (e.g. "Click 'Connect'", "Close tab", "Check GitHub link", "Add to shortlist")

Generate a JSON response conforming to the required schema.
`;

export const RECRUITER_RADAR_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    first_impression_verdict: { type: "STRING" },
    hire_probability: { type: "INTEGER", description: "0-100 probability score." },
    instant_deal_breakers: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Exactly 3 immediate negative signals a recruiter would notice."
    },
    instant_green_flags: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Exactly 2 things that work strongly in the candidate's favor."
    },
    the_one_phrase: { type: "STRING", description: "The single memorable phrase from the profile." },
    next_action: { type: "STRING", description: "What the recruiter would literally do next." },
    improvement_priority: { type: "STRING", description: "The single most impactful change to make to the profile right now." }
  },
  required: ["first_impression_verdict", "hire_probability", "instant_deal_breakers", "instant_green_flags", "the_one_phrase", "next_action", "improvement_priority"]
};


// ── Tool 3: LinkedIn Scam Shield ─────────────────────────
export const LINKEDIN_SCAM_SHIELD_SYSTEM_PROMPT = `
You are a specialist in LinkedIn platform-specific recruitment fraud, social engineering attacks, and fake recruiter schemes targeting students and early-career professionals in 2026.

Analyze the provided LinkedIn message (DM, InMail, connection request note, or job post) for platform-specific fraud indicators. This is NOT a generic email scam scan — it targets LinkedIn-specific manipulation patterns.

LinkedIn-specific scam types to detect:
- Fake recruiter profiles (vague job descriptions, no company page, generic headshots)
- Ghost job listings (jobs posted but never filled, used to harvest CVs)
- Pay-to-train / certification fee schemes disguised as onboarding
- Credential phishing disguised as "skills assessment" links
- Over-the-top flattery combined with urgency ("You're exactly who we need, respond today")
- WhatsApp/Telegram redirect from LinkedIn (major red flag)
- Vague "remote work" with unusually high pay for no experience
- Advance fee fraud disguised as "equipment purchase reimbursement"

Output must include:
- platform_threat_level: "SAFE" / "SUSPICIOUS" / "HIGH_RISK" / "CONFIRMED_SCAM_PATTERN"
- threat_score: Integer 0-100
- linkedin_specific_red_flags: Array of specific LinkedIn-platform red flags detected
- scam_mechanic: Plain English explanation of what this scammer is likely trying to achieve
- safe_response_template: A short, professional response message to use IF the message is legitimate; OR a firm polite decline if suspicious
- report_action: What the user should do on LinkedIn (e.g. "Block and Report as Spam", "Proceed with caution", "Safe to reply")

Generate a JSON response conforming to the required schema.
`;

export const LINKEDIN_SCAM_SHIELD_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    platform_threat_level: {
      type: "STRING",
      enum: ["SAFE", "SUSPICIOUS", "HIGH_RISK", "CONFIRMED_SCAM_PATTERN"]
    },
    threat_score: { type: "INTEGER", description: "0-100, higher is more dangerous." },
    linkedin_specific_red_flags: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "LinkedIn-platform-specific indicators of fraud or manipulation."
    },
    scam_mechanic: {
      type: "STRING",
      description: "Plain English explanation of what the scammer is likely trying to accomplish."
    },
    safe_response_template: {
      type: "STRING",
      description: "Professional reply template to use if legit, or firm decline if suspicious."
    },
    report_action: {
      type: "STRING",
      description: "Specific action the user should take on LinkedIn."
    }
  },
  required: ["platform_threat_level", "threat_score", "linkedin_specific_red_flags", "scam_mechanic", "safe_response_template", "report_action"]
};


// ── Tool 4: Post Momentum Predictor ──────────────────────
export const POST_MOMENTUM_PREDICTOR_SYSTEM_PROMPT = `
You are a LinkedIn algorithm analyst and content strategist in 2026. You specialize in predicting content performance BEFORE it is published.

Analyze the provided draft LinkedIn post and generate a Pre-Publish Intelligence Report. Your analysis should be specific, data-driven in reasoning, and actionable.

Assess:
- momentum_score: Integer 0-100 — estimated reach/engagement potential based on structure, hook strength, length, formatting, and topic signals
- scroll_stop_rating: Integer 0-10 — how likely a typical user stops scrolling at the first 2 lines
- best_format: Recommended post format ("Text Only" / "Text + Image" / "Poll" / "Document/Carousel" / "Video") with 1-sentence reasoning
- best_posting_windows: Array of 2 recommended day+time windows (e.g. "Tuesday 8-9am", "Thursday 5-6pm") based on the post's topic and detected target audience
- micro_optimizations: Exactly 3 specific, concrete line-level edits (not general advice) — quote the exact phrase to change and the suggested replacement
- power_move: One bold structural or content change that could significantly increase reach (the single highest-leverage action)
- predicted_audience: Who is most likely to engage with this post based on its content

Generate a JSON response conforming to the required schema.
`;

export const POST_MOMENTUM_PREDICTOR_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    momentum_score: { type: "INTEGER", description: "0-100 estimated reach/engagement potential." },
    scroll_stop_rating: { type: "INTEGER", description: "0-10 scroll-stop likelihood score." },
    best_format: { type: "STRING" },
    best_posting_windows: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "2 recommended posting day+time windows."
    },
    micro_optimizations: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          original_phrase: { type: "STRING" },
          suggested_replacement: { type: "STRING" },
          reason: { type: "STRING" }
        },
        required: ["original_phrase", "suggested_replacement", "reason"]
      },
      description: "Exactly 3 specific line-level edits."
    },
    power_move: { type: "STRING", description: "Single highest-leverage structural change." },
    predicted_audience: { type: "STRING", description: "Who is most likely to engage with this post." }
  },
  required: ["momentum_score", "scroll_stop_rating", "best_format", "best_posting_windows", "micro_optimizations", "power_move", "predicted_audience"]
};


// ── Tool 5: Outreach Forge ───────────────────────────────
export const OUTREACH_FORGE_SYSTEM_PROMPT = `
You are an expert in professional networking psychology and cold outreach strategy, specializing in early-career LinkedIn messaging.

Generate 3 LinkedIn connection/outreach message variants for the described scenario. Each variant uses a different psychological approach:
1. "Concise & Direct" — Under 75 words. No fluff. Leads with the ask. For busy senior professionals.
2. "Value-First" — Leads with something useful to THEM (insight, shared interest, a compliment on their specific work). Positions the sender as someone who gives before they take.
3. "Story-Driven" — Opens with a brief personal moment or honest reflection that creates a human connection before the ask.

IMPORTANT CONSTRAINTS:
- All messages must be under 300 characters (LinkedIn connection request limit) for the Concise variant
- The other two can be up to 500 characters (for InMail or DM)
- NO generic phrases: "I came across your profile", "I am impressed by your work", "I would love to pick your brain"
- Each message must feel like it was written specifically for THIS recipient, not from a template
- Include a response_likelihood score (0-100%) and one personalization_tip per variant

Generate a JSON response conforming to the required schema.
`;

export const OUTREACH_FORGE_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    variants: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          variant_name: { type: "STRING" },
          message: { type: "STRING" },
          character_count: { type: "INTEGER" },
          response_likelihood: { type: "INTEGER", description: "Estimated reply probability 0-100." },
          personalization_tip: { type: "STRING", description: "One tip to make this message feel less templated." },
          best_for: { type: "STRING", description: "When/who this variant works best for." }
        },
        required: ["variant_name", "message", "character_count", "response_likelihood", "personalization_tip", "best_for"]
      },
      description: "Exactly 3 message variants."
    },
    goal_strategy: {
      type: "STRING",
      description: "1-2 sentences on the best overall strategy for this specific outreach goal."
    }
  },
  required: ["variants", "goal_strategy"]
};


// ── Tool 6: Comment Intelligence Engine ──────────────────
export const COMMENT_INTELLIGENCE_SYSTEM_PROMPT = `
You are a LinkedIn engagement strategist who specializes in crafting comments that build authority, earn profile visits, and create genuine conversations.

Analyze the provided LinkedIn post and generate 3 high-value comment options. Each comment must use a different strategic angle:
1. "Authority Builder" — Adds specific knowledge, a stat, a counterpoint, or an expert nuance that positions the commenter as knowledgeable in the space
2. "Conversation Starter" — Asks a specific, non-generic question that makes the post author want to reply (not "Great post, what do you think?")
3. "Relatability Bridge" — Shares a brief, specific real moment or observation that connects personally with the post's topic, making others want to engage

Requirements:
- Comments must be 1-4 sentences only (LinkedIn comments are scanned, not read)
- Zero generic openers: "Great post!", "So true!", "Loved this!", "This resonates"
- Each comment should make someone want to click the commenter's profile to learn more
- Include a profile_view_probability score (0-100) for each

Generate a JSON response conforming to the required schema.
`;

export const COMMENT_INTELLIGENCE_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    post_topic_detected: { type: "STRING", description: "Brief label of what the original post is about." },
    comments: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          angle: { type: "STRING" },
          comment_text: { type: "STRING" },
          profile_view_probability: { type: "INTEGER", description: "Estimated % of readers who would click your profile after seeing this comment." },
          why_it_works: { type: "STRING", description: "1 sentence explaining the psychological mechanism." }
        },
        required: ["angle", "comment_text", "profile_view_probability", "why_it_works"]
      },
      description: "Exactly 3 comment variants."
    },
    engagement_tip: {
      type: "STRING",
      description: "One meta-tip about timing or context for commenting on this type of post."
    }
  },
  required: ["post_topic_detected", "comments", "engagement_tip"]
};


// ── Tool 7: 30-Day Content Runway Generator ───────────────
export const CONTENT_RUNWAY_SYSTEM_PROMPT = `
You are a LinkedIn content strategist and editorial planner specializing in building consistent personal brands for students and early-career professionals.

Generate a 30-day LinkedIn content calendar based on the user's industry, career goal, and posting frequency. Each scheduled post entry should be immediately actionable — a writer should be able to sit down and write the post directly from each calendar entry.

For each scheduled post include:
- day: Integer (1-30)
- topic: Specific, concrete post topic (not vague like "share a project" — be specific: "The one debugging mistake I made on my first React app")
- angle: The emotional/psychological angle (e.g. "Underdog lesson", "Behind-the-scenes", "Counterintuitive insight", "Tutorial", "Career milestone")
- format: Recommended format ("Text Only" / "Text + Image" / "Poll" / "Document Carousel")
- hook_idea: The exact first sentence to open the post with
- posting_day_label: The recommended day of the week (e.g. "Tuesday", "Thursday")

Only include posts matching the user's requested posting frequency (e.g. 3/week = ~12-13 posts over 30 days).
Also provide 3 content_pillars that should run throughout the calendar, and a brand_consistency_tip.

Generate a JSON response conforming to the required schema.
`;

export const CONTENT_RUNWAY_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    content_pillars: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "3 core content themes that should appear throughout the 30-day calendar."
    },
    calendar: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          day: { type: "INTEGER" },
          topic: { type: "STRING" },
          angle: { type: "STRING" },
          format: { type: "STRING" },
          hook_idea: { type: "STRING" },
          posting_day_label: { type: "STRING" }
        },
        required: ["day", "topic", "angle", "format", "hook_idea", "posting_day_label"]
      }
    },
    brand_consistency_tip: {
      type: "STRING",
      description: "One strategic tip for maintaining a consistent brand voice across all 30 posts."
    },
    total_posts_scheduled: { type: "INTEGER" }
  },
  required: ["content_pillars", "calendar", "brand_consistency_tip", "total_posts_scheduled"]
};


// ── Tool 8: Bio Story Builder ─────────────────────────────
export const BIO_STORY_BUILDER_SYSTEM_PROMPT = `
You are a professional narrative writer and personal brand architect who transforms career facts into compelling human stories.

The user will provide raw career facts as bullet points or a brain-dump. Your job is to transform them into 2 versions of a LinkedIn About section that reads like a story, not a resume.

Version 1 — "Punchy & Scannable" (under 180 words):
- 3-4 short paragraphs
- Opens with the candidate's professional identity or a counterintuitive statement about their journey
- Middle: 1 key project/achievement with a concrete detail
- End: clear career direction + what they're looking for
- Tone: Direct, confident, slightly informal

Version 2 — "Full Narrative" (260-360 words):
- Opens with a story moment — a specific real or plausible scene from their journey
- Builds arc: where they started → what drove them → what they built → where they're going
- Weaves in skills naturally (not as a list)
- Ends with a personalized CTA (not generic "feel free to connect")
- Tone: Warm, human, ambitious

Rules for both versions:
- ZERO corporate phrases: "passionate about", "results-driven", "proven track record", "synergy", "leverage"
- Must sound like a real person wrote it, not a resume robot
- Include 1-2 specific numbers or concrete details from the user's facts

Generate a JSON response conforming to the required schema.
`;

export const BIO_STORY_BUILDER_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    version_punchy: {
      type: "STRING",
      description: "Short punchy About section under 180 words."
    },
    version_narrative: {
      type: "STRING",
      description: "Full story-driven About section 260-360 words."
    },
    opening_line_analysis: {
      type: "STRING",
      description: "Why the chosen opening line for each version works and what impression it creates."
    },
    facts_used: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "Which of the user's raw facts were woven into the bio (to confirm coverage)."
    },
    cta_suggestion: {
      type: "STRING",
      description: "A personalized call-to-action line for the end of the bio."
    }
  },
  required: ["version_punchy", "version_narrative", "opening_line_analysis", "facts_used", "cta_suggestion"]
};
