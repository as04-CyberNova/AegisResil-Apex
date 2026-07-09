/**
 * AegisResil Apex — Region Configuration Module
 * Defines metadata, rules, and UI descriptors for each supported resume scoring region.
 * Consumed by scorer.js (UI dropdown) and passed to /api/score-resume as the `region` param.
 */

window.RegionConfig = {

  /**
   * Master map of all supported regions.
   * Each entry drives both the dropdown UI and the server-side prompt logic.
   */
  REGIONS: {
    US: {
      code: 'US',
      label: '🇺🇸 United States',
      shortLabel: 'US',
      description: 'ANSI/ATS standards — strict 1-page, no PII',
      rules: [
        'Strict 1-page limit enforced for most roles (2 pages only for 10+ years experience)',
        'Must use strong action verbs and quantifiable bullet points',
        'Profile photos, age, marital status, and nationality are HIGH RISK compliance violations',
        'Objective statements are outdated — use a Professional Summary instead',
        'Avoid tables, columns, headers/footers: they break common ATS parsers',
      ],
      pageLimit: 1,
      photoRequired: false,
      photoFlag: true, // flag as HIGH RISK if present
      cefrRequired: false,
      chronologyStrict: false,
    },

    UK: {
      code: 'UK',
      label: '🇬🇧 United Kingdom',
      shortLabel: 'UK',
      description: 'UK CV standards — 2 pages, personal profile required',
      rules: [
        'Standard CV length is 2 pages (A4 format preferred)',
        'A compelling "Personal Profile" executive summary at the top is strongly expected by UK recruiters',
        'References line ("References available on request") is common but optional',
        'British English spelling must be consistent throughout (e.g., "organised", "analysed")',
        'Including a photo is optional and generally discouraged but not a compliance violation',
        'Date of Birth and Nationality should NOT be included',
      ],
      pageLimit: 2,
      photoRequired: false,
      photoFlag: false,
      cefrRequired: false,
      chronologyStrict: false,
    },

    DE: {
      code: 'DE',
      label: '🇩🇪 Germany (DACH)',
      shortLabel: 'DE/DACH',
      description: 'German Lebenslauf — photo required, CEFR languages, strict chronology',
      rules: [
        'A professional "Bewerbungsfoto" (passport-style photo) in the top-right corner is REQUIRED and expected',
        'All positions must follow strict reverse-chronological order with exact month/year dates',
        'Language proficiencies MUST be mapped to the CEFR scale: A1 (Beginner) → C2 (Mastery)',
        'A "Hobbies and Interests" section is culturally common and accepted',
        'Personal details (date of birth, nationality, marital status) are traditionally included in German CVs',
        'Signatures at the end of the application letter (Anschreiben) are still conventional',
      ],
      pageLimit: 2,
      photoRequired: true,
      photoFlag: false,
      cefrRequired: true,
      chronologyStrict: true,
    },

    IN: {
      code: 'IN',
      label: '🇮🇳 India',
      shortLabel: 'IN',
      description: 'Indian market standards — skills-first, education prominence',
      rules: [
        'Education section should appear prominently, especially for fresh graduates and students',
        'CTC (Cost to Company) or expected salary range may be included in some contexts',
        'Technical skills and certifications sections should be detailed and specific',
        'Internships and academic projects carry significant weight for entry-level candidates',
        'Photo is culturally acceptable but not mandatory; avoid for international applications',
        'Career Objective statement is still widely expected by Indian recruiters for freshers',
      ],
      pageLimit: 2,
      photoRequired: false,
      photoFlag: false,
      cefrRequired: false,
      chronologyStrict: false,
    },
  },

  /**
   * Returns region metadata by code, defaults to US if not found.
   * @param {string} code - Region code: 'US' | 'UK' | 'DE' | 'IN'
   * @returns {object} Region metadata object
   */
  get(code) {
    return this.REGIONS[code] || this.REGIONS['US'];
  },

  /**
   * Returns all region codes as an array.
   * @returns {string[]}
   */
  getCodes() {
    return Object.keys(this.REGIONS);
  },

  /**
   * Returns the saved region preference from localStorage, defaulting to 'US'.
   * @returns {string}
   */
  getSavedPreference() {
    try {
      return localStorage.getItem('aegisresil_region_pref') || 'US';
    } catch {
      return 'US';
    }
  },

  /**
   * Saves the user's region preference to localStorage.
   * @param {string} code
   */
  savePreference(code) {
    try {
      if (this.REGIONS[code]) {
        localStorage.setItem('aegisresil_region_pref', code);
      }
    } catch (e) {
      console.warn('Could not save region preference:', e);
    }
  },

  /**
   * CEFR scale reference map for DE/DACH validation display.
   */
  CEFR_SCALE: {
    A1: 'Beginner — Basic words and phrases only',
    A2: 'Elementary — Simple conversations on familiar topics',
    B1: 'Intermediate — Can handle most travel situations',
    B2: 'Upper-Intermediate — Clear communication on complex topics',
    C1: 'Advanced — Fluent, flexible use in professional contexts',
    C2: 'Mastery / Proficiency — Near-native, nuanced command',
  },
};
