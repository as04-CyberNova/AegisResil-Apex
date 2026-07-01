# CareerShield AI 🛡️

> **An AI-powered career protection suite for students and entry-level candidates.**  
> Fight job scams, optimize your resume, land internships, and build your professional brand — all in one premium dashboard.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Gemini API](https://img.shields.io/badge/Gemini-2.5%20Flash-blue?style=flat-square&logo=google)](https://aistudio.google.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-orange?style=flat-square&logo=firebase)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-ISC-lightgrey?style=flat-square)](./LICENSE)

---

## ✨ Features (10 AI-Powered Tools)

### 🔐 Security & Fraud Protection
| # | Feature | What it does |
|---|---|---|
| 1 | **Scam & Fraud Message Analyzer** | Scrutinizes job offers, recruiter emails, Telegram/WhatsApp messages for red flags. Returns a risk score (0–100), risk level, detailed breakdown, and red flags list. |
| 2 | **Company Trust Analyzer** | Evaluates whether a hiring company is legitimate using Google Search grounding + AI pattern-matching. Returns trust score, warning signals, and a hiring verdict. |

### 📄 Resume & Skills
| # | Feature | What it does |
|---|---|---|
| 3 | **ATS Resume Scorer** | Upload PDF or TXT resume — extracts text client-side (PDF.js), grades ATS formatting, detects missing keywords, and gives high-impact optimization suggestions. |
| 4 | **Career Roadmap Generator** | Creates a custom month-by-month study curriculum (milestones + resources) for any target role. Integrates your resume context to personalize the plan. |
| 5 | **Internship Match Score** | Calculates % alignment between your skills and a job description. Highlights matched skills, skill gaps, and gives a strategic recommendation. |

### 🎯 Interview Preparation
| # | Feature | What it does |
|---|---|---|
| 6 | **Interview Prep Workspace** | Generates role-tailored technical + behavioral questions. Type your answers and get detailed, constructive AI feedback with scoring. |
| 7 | **Voice Mock Interview Simulator** | Multi-turn voice-based interview simulator using Web Speech API (TTS + STT). Speaks questions aloud, records your spoken answer, then evaluates performance across communication, technical accuracy, and confidence. |

### 🚀 Career Growth & Personal Brand
| # | Feature | What it does |
|---|---|---|
| 8 | **Skill Gap Micro-Lessons** | Click any skill gap tag (in Match or Roadmap results) to open a popup with a beginner explainer, 2–3 practice exercises, and curated resources. Cached in localStorage. |
| 9 | **Cover Letter & Application Message Generator** | Generates tailored formal cover letters or short cold-email messages from your resume + job description. Editable draft textarea with one-click copy. |
| 10 | **LinkedIn Profile Optimizer + Post Generator** | Two tools in one: **(a)** Audit your headline & About bio — get 6 recruiter-dimension scores, weaknesses, and rewrite suggestions. **(b)** Post Optimizer: paste an existing post or describe a topic → Gemini rewrites it using the Full Post Framework (Hook → Story → Worked On → Takeaway → Next → CTA → Hashtags). |

---

## 📊 Dashboard

- **Activity Counters**: Total scam checks, resume scores, trust audits, roadmaps, match runs, lessons viewed, cover letters drafted, profile audits run.
- **Chart.js Visualizations**: Line charts for scam risk history, resume score history, trust score trends, internship match trends.
- **Activity History Table**: Last 10 operations with type badges, result summaries, and timestamps.
- **Live Demo Mode**: If no Gemini API key is set, the app runs in Demo Mode with realistic mock data — so the UI is always testable.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, Vanilla CSS3 (glassmorphism, CSS custom properties), Vanilla JS (SPA tab-router) |
| **Backend** | Node.js + Express (API proxy — Gemini key never exposed client-side) |
| **AI Engine** | Google Gemini API (`gemini-2.5-flash`) with structured JSON schema enforcement + Google Search grounding |
| **Authentication** | Firebase Authentication (Email/Password) |
| **Database** | Firebase Firestore (cloud sync) + browser `localStorage` (local fallback) |
| **PDF Parsing** | PDF.js (client-side, zero server upload) |
| **Charts** | Chart.js |
| **Voice** | Web Speech API (SpeechSynthesis + SpeechRecognition) |

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- A free Gemini API key from [Google AI Studio](https://aistudio.google.com/)
- *(Optional)* A Firebase project for Auth + Firestore cloud sync

### 1. Clone the repo
```bash
git clone https://github.com/as04-CyberNova/CareerShield-AI.git
cd CareerShield-AI
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Create a `.env` file in the root directory:
```ini
PORT=3000
GEMINI_API_KEY=AIzaSy-YOUR-GEMINI-KEY-HERE

# Optional — Firebase (for Auth + cloud sync)
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your-sender-id
FIREBASE_APP_ID=your-app-id
```

> **No key? No problem.** Leave `GEMINI_API_KEY` blank and the app starts in **Demo Mode** — all features work with mock data so you can test the UI immediately.

### 4. Run the app
```bash
# Development (auto-restart on file changes)
npm run dev

# Production
npm start
```

### 5. Open in browser
Navigate to **[http://localhost:3000](http://localhost:3000)**

---

## ☁️ Deploying to Render

1. Push your repo to GitHub
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your `CareerShield-AI` repo
4. Settings:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
5. Add all your `.env` variables under **Environment**
6. Click **Deploy** — Render gives you a live URL
7. Add your Render domain to **Firebase Console → Authentication → Authorized Domains**

---

## 🔒 Security Architecture

- **Gemini API key lives only on the server** — never sent to the browser
- **Firebase credentials** are fetched at runtime via `/api/firebase-config` (served server-side from env vars)
- **`.env` is gitignored** — credentials never reach the repository
- All AI outputs carry visible **"AI-generated"** disclaimers in the UI

---

## ⚠️ AI Disclaimer

CareerShield AI uses **Large Language Model (LLM) reasoning** — not verified databases or official registries.

- Results are **advisory**, not legal or financial advice
- Company Trust scores are based on AI pattern-matching + web search signals, not official corporate registries
- Resume scores reflect ATS formatting best practices, not guaranteed hiring outcomes
- Cover letters, LinkedIn posts, and profile rewrites should be **personalized before use**
- Always verify opportunities independently before sharing personal or financial information

---

## 📁 Project Structure

```
CareerShield-AI/
├── server.js              # Express backend — all API routes
├── prompts.js             # All Gemini system prompts & JSON schemas
├── package.json
├── .env                   # Local secrets (gitignored)
├── PROJECT_SPEC.md        # Full feature specification
└── public/
    ├── index.html         # Single-page application shell
    ├── css/
    │   └── style.css      # Full design system
    └── js/
        ├── app.js         # SPA router & tab coordinator
        ├── storage.js     # Unified localStorage + Firestore manager
        ├── dashboard.js   # Metrics, charts, history table
        ├── analyzer.js    # Scam analyzer handler
        ├── scorer.js      # ATS resume scorer handler
        ├── trust.js       # Company trust analyzer handler
        ├── roadmap.js     # Career roadmap handler
        ├── match.js       # Internship match handler
        ├── interview.js   # Interview prep handler
        ├── simulator.js   # Voice mock interview simulator
        ├── lessons.js     # Skill gap micro-lessons modal
        ├── coverletter.js # Cover letter generator handler
        └── profile.js     # LinkedIn profile + post optimizer handler
```

---

## 🗺️ Phases Completed

| Phase | Features |
|---|---|
| **Phase 1** | Scam Analyzer, ATS Resume Scorer, Company Trust Analyzer, Dashboard |
| **Phase 2** | Career Roadmap Generator, Internship Match Score, Interview Prep Workspace |
| **Phase 3** | Firebase Auth + Firestore sync, Voice Mock Interview Simulator |
| **Phase 4** | Skill Gap Micro-Lessons, Cover Letter Generator, LinkedIn Profile Optimizer, LinkedIn Post Optimizer |

---

Made with 💜 for students navigating an increasingly complex hiring landscape.
