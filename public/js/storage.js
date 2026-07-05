/**
 * AegisResil Apex — Unified Storage Manager
 * Uses browser LocalStorage as default MVP database.
 * Easily upgradable to Firebase Firestore by changing these API methods.
 */

const STORAGE_KEY = 'aegisresil_scans_v1';

window.StorageManager = {
  /**
   * Save a scan result (either scam analysis or resume score)
   * @param {string} type - 'scam' or 'resume'
   * @param {object} result - JSON returned from Gemini API
   * @param {string} summaryTitle - Short label or description (e.g. truncated email body or filename)
   */
  saveScan(type, result, summaryTitle) {
    const history = this.getHistory();
    
    let defaultTitle = 'Analysis Check';
    if (type === 'scam') defaultTitle = 'Job Message Analysis';
    else if (type === 'resume') defaultTitle = 'Resume Scoring';
    else if (type === 'trust') defaultTitle = 'Company Trust Check';
    else if (type === 'roadmap') defaultTitle = 'Career Roadmap';
    else if (type === 'match') defaultTitle = 'Internship Match';
    else if (type === 'interview') defaultTitle = 'Interview Prep';
    else if (type === 'lesson') defaultTitle = 'Skill Gap Lesson';
    else if (type === 'coverletter') defaultTitle = 'Cover Letter Draft';
    else if (type === 'profile') defaultTitle = 'Profile Optimization';

    const entry = {
      id: 'scan_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      type,
      timestamp: Date.now(),
      summaryTitle: summaryTitle || defaultTitle,
      result
    };
    
    // Save to local cache first
    history.push(entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));

    // If authenticated user is present, save to Firestore asynchronously
    if (window.firebase && firebase.apps && firebase.apps.length > 0) {
      const user = firebase.auth().currentUser;
      if (user) {
        firebase.firestore().collection('users').doc(user.uid).collection('scans').doc(entry.id).set(entry)
          .catch(err => console.error('Error writing scan to Firestore:', err));
      }
    }

    return entry;
  },

  /**
   * Get all scan entries, sorted newest first
   * @returns {Array}
   */
  getHistory() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      
      // Sort history items so that the latest scans are first
      const parsed = JSON.parse(data);
      return parsed.sort((a, b) => b.timestamp - a.timestamp);
    } catch (e) {
      console.error('Error parsing storage history:', e);
      return [];
    }
  },

  /**
   * Compute aggregated statistics for the dashboard
   */
  getStats() {
    const history = this.getHistory();
    
    const scamScans = history.filter(item => item.type === 'scam');
    const resumeScans = history.filter(item => item.type === 'resume');
    const trustScans = history.filter(item => item.type === 'trust');
    const roadmapScans = history.filter(item => item.type === 'roadmap');
    const matchScans = history.filter(item => item.type === 'match');
    const lessonScans = history.filter(item => item.type === 'lesson');
    const coverletterScans = history.filter(item => item.type === 'coverletter');
    const profileScans = history.filter(item => item.type === 'profile');

    // Total scam checks
    const totalScamScans = scamScans.length;

    // Average scam risk calculation
    let avgScamRisk = 0;
    if (totalScamScans > 0) {
      const totalRisk = scamScans.reduce((sum, item) => sum + (item.result.risk_score || 0), 0);
      avgScamRisk = Math.round(totalRisk / totalScamScans);
    }

    // Best resume quality score
    let bestResumeScore = 0;
    if (resumeScans.length > 0) {
      bestResumeScore = Math.max(...resumeScans.map(item => item.result.overall_score || 0));
    }

    // Average trust score
    let avgTrustScore = 0;
    if (trustScans.length > 0) {
      const totalTrust = trustScans.reduce((sum, item) => sum + (item.result.trust_score || 0), 0);
      avgTrustScore = Math.round(totalTrust / trustScans.length);
    }

    // Total roadmaps
    const totalRoadmaps = roadmapScans.length;

    // Average match score
    let avgMatchScore = 0;
    if (matchScans.length > 0) {
      const totalMatch = matchScans.reduce((sum, item) => sum + (item.result.match_score || 0), 0);
      avgMatchScore = Math.round(totalMatch / matchScans.length);
    }

    const totalLessons = lessonScans.length;
    const totalCoverLetters = coverletterScans.length;
    const totalProfileOpts = profileScans.length;

    return {
      totalScamScans,
      avgScamRisk,
      bestResumeScore,
      avgTrustScore,
      totalRoadmaps,
      avgMatchScore,
      totalLessons,
      totalCoverLetters,
      totalProfileOpts
    };
  },

  /**
   * Retrieve timeline chart datasets
   */
  getChartData() {
    // Get history in chronological order (oldest to newest for plotting)
    const chronologicalHistory = [...this.getHistory()].reverse();
    
    const scamData = chronologicalHistory
      .filter(item => item.type === 'scam')
      .map(item => ({
        timestamp: item.timestamp,
        score: item.result.risk_score
      }));

    const resumeData = chronologicalHistory
      .filter(item => item.type === 'resume')
      .map(item => ({
        timestamp: item.timestamp,
        score: item.result.overall_score
      }));

    const trustData = chronologicalHistory
      .filter(item => item.type === 'trust')
      .map(item => ({
        timestamp: item.timestamp,
        score: item.result.trust_score
      }));

    const matchData = chronologicalHistory
      .filter(item => item.type === 'match')
      .map(item => ({
        timestamp: item.timestamp,
        score: item.result.match_score
      }));

    return {
      scamData,
      resumeData,
      trustData,
      matchData
    };
  },

  /**
   * Reset all storage logs
   */
  clearAll() {
    localStorage.removeItem(STORAGE_KEY);
  },

  /**
   * Syncs existing localStorage database list to Firestore database
   */
  async syncLocalToFirestore() {
    if (!window.firebase || firebase.apps.length === 0) return;
    const user = firebase.auth().currentUser;
    if (!user) return;

    try {
      const localHistory = this.getHistory();
      if (localHistory.length === 0) return;

      const db = firebase.firestore();
      const userScansRef = db.collection('users').doc(user.uid).collection('scans');

      const promises = localHistory.map(entry => {
        return userScansRef.doc(entry.id).set(entry);
      });

      await Promise.all(promises);
      console.log('Synced local scans history to Firestore successfully.');
    } catch (e) {
      console.error('Error syncing local scans to Firestore:', e);
    }
  },

  /**
   * Sets up real-time listener for Firestore collection changes
   */
  setupFirestoreListener(user, onSyncCallback) {
    if (!window.firebase || firebase.apps.length === 0) return null;
    if (!user) return null;

    console.log('Configuring real-time Firestore listener for user:', user.email);

    return firebase.firestore().collection('users').doc(user.uid).collection('scans')
      .onSnapshot(snapshot => {
        const firestoreScans = [];
        snapshot.forEach(doc => {
          firestoreScans.push(doc.data());
        });

        // Sort chronological newest first
        firestoreScans.sort((a, b) => b.timestamp - a.timestamp);

        // Update local cache
        localStorage.setItem(STORAGE_KEY, JSON.stringify(firestoreScans));
        
        console.log(`Synced ${firestoreScans.length} scans from Firestore cloud storage.`);

        if (onSyncCallback) {
          onSyncCallback();
        }
      }, err => {
        console.error('Firestore listener encounter error:', err);
      });
  }
};
