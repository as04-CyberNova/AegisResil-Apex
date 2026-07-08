/**
 * aegisresil-apex — Dashboard Manager
 * Manages statistics, history listing, and Chart.js integrations.
 */

let scamChartInstance = null;
let resumeChartInstance = null;
let trustChartInstance = null;
let matchChartInstance = null;

window.initializeDashboard = function() {
  updateDashboardStats();
  renderHistoryTable();
  renderDashboardCharts();
};

/**
 * Updates top metrics counters
 */
function updateDashboardStats() {
  const stats = window.StorageManager.getStats();

  const totalScansEl = document.getElementById('stat-total-scans');
  const avgRiskEl = document.getElementById('stat-avg-risk');
  const bestResumeEl = document.getElementById('stat-best-resume');
  const avgTrustEl = document.getElementById('stat-avg-trust');
  const totalRoadmapsEl = document.getElementById('stat-total-roadmaps');
  const avgMatchEl = document.getElementById('stat-avg-match');
  const totalLessonsEl = document.getElementById('stat-total-lessons');
  const totalCoverLettersEl = document.getElementById('stat-total-coverletters');
  const totalProfilesEl = document.getElementById('stat-total-profiles');

  if (totalScansEl) totalScansEl.textContent = stats.totalScamScans;
  if (avgRiskEl) avgRiskEl.textContent = stats.totalScamScans > 0 ? `${stats.avgScamRisk}%` : '0%';
  if (bestResumeEl) bestResumeEl.textContent = stats.bestResumeScore > 0 ? `${stats.bestResumeScore}/100` : '0/100';
  if (avgTrustEl) avgTrustEl.textContent = stats.avgTrustScore > 0 ? `${stats.avgTrustScore}%` : '0%';
  if (totalRoadmapsEl) totalRoadmapsEl.textContent = stats.totalRoadmaps;
  if (avgMatchEl) avgMatchEl.textContent = stats.avgMatchScore > 0 ? `${stats.avgMatchScore}%` : '0%';
  if (totalLessonsEl) totalLessonsEl.textContent = stats.totalLessons || 0;
  if (totalCoverLettersEl) totalCoverLettersEl.textContent = stats.totalCoverLetters || 0;
  if (totalProfilesEl) totalProfilesEl.textContent = stats.totalProfileOpts || 0;
}

/**
 * Renders recent operations list in table
 */
function renderHistoryTable() {
  const historyRowsEl = document.getElementById('history-rows');
  if (!historyRowsEl) return;

  const history = window.StorageManager.getHistory();

  if (history.length === 0) {
    historyRowsEl.innerHTML = `
      <tr>
        <td class="empty-history-cell" colspan="4" style="display: block; text-align: center; color: var(--text-muted); padding: 2.5rem 0; justify-content: center;">
          No scans registered yet. Switch to one of the analyzer or scanner tabs to start!
        </td>
      </tr>
    `;
    return;
  }

  historyRowsEl.innerHTML = history.slice(0, 10).map(item => {
    // Formatting date
    const dateStr = new Date(item.timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Formatting badges and outcomes dynamically by type
    let typeBadge = '';
    let resultMarkup = '';
    
    if (item.type === 'scam') {
      typeBadge = `<span class="history-badge" style="background: rgba(0, 242, 254, 0.1); border: 1px solid rgba(0, 242, 254, 0.3); color: var(--primary);">Scam Audit</span>`;
      const level = item.result.risk_level.toLowerCase();
      let colorClass = 'level-low';
      if (level === 'medium') colorClass = 'level-medium';
      if (level === 'high') colorClass = 'level-high';
      resultMarkup = `<span class="history-badge ${colorClass}">${item.result.risk_score}% Risk (${item.result.risk_level})</span>`;
    } else if (item.type === 'resume') {
      typeBadge = `<span class="history-badge" style="background: rgba(79, 172, 254, 0.1); border: 1px solid rgba(79, 172, 254, 0.3); color: var(--secondary);">Resume Score</span>`;
      const score = item.result.overall_score;
      let colorClass = 'level-low'; 
      if (score < 60) colorClass = 'level-high'; 
      else if (score < 80) colorClass = 'level-medium'; 
      resultMarkup = `<span class="history-badge ${colorClass}">${score}/100 Score</span>`;
    } else if (item.type === 'trust') {
      typeBadge = `<span class="history-badge" style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); color: var(--color-safe);">Trust Audit</span>`;
      const score = item.result.trust_score;
      let colorClass = 'level-high'; 
      if (score >= 80) colorClass = 'level-low'; 
      else if (score >= 40) colorClass = 'level-medium'; 
      resultMarkup = `<span class="history-badge ${colorClass}">${score}% Trust</span>`;
    } else if (item.type === 'roadmap') {
      typeBadge = `<span class="history-badge" style="background: rgba(255, 255, 255, 0.05); border: 1px solid var(--border-light); color: var(--text-primary);">Roadmap</span>`;
      resultMarkup = `<span class="history-badge level-low">${item.result.roadmap?.length || 0} Months</span>`;
    } else if (item.type === 'match') {
      typeBadge = `<span class="history-badge" style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); color: var(--color-warning);">Job Fit</span>`;
      const score = item.result.match_score;
      let colorClass = 'level-high'; 
      if (score >= 70) colorClass = 'level-low'; 
      else if (score >= 45) colorClass = 'level-medium'; 
      resultMarkup = `<span class="history-badge ${colorClass}">${score}% Match</span>`;
    } else if (item.type === 'interview') {
      typeBadge = `<span class="history-badge" style="background: rgba(79, 172, 254, 0.1); border: 1px solid rgba(79, 172, 254, 0.3); color: var(--secondary);">Interview</span>`;
      resultMarkup = `<span class="history-badge level-low">${item.result.questions?.length || 0} Questions</span>`;
    } else if (item.type === 'lesson') {
      typeBadge = `<span class="history-badge" style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.3); color: #8b5cf6;">Micro Lesson</span>`;
      resultMarkup = `<span class="history-badge level-low">Lesson Viewed</span>`;
    } else if (item.type === 'coverletter') {
      typeBadge = `<span class="history-badge" style="background: rgba(236, 72, 153, 0.1); border: 1px solid rgba(236, 72, 153, 0.3); color: #ec4899;">Cover Letter</span>`;
      resultMarkup = `<span class="history-badge level-low">${item.result.tone || 'Generated'}</span>`;
    } else if (item.type === 'profile') {
      typeBadge = `<span class="history-badge" style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); color: #3b82f6;">Social Audit</span>`;
      const avgScore = Math.round(((item.result.headline_score || 0) + (item.result.bio_score || 0)) / 2);
      let colorClass = 'level-medium';
      if (avgScore >= 80) colorClass = 'level-low';
      else if (avgScore < 50) colorClass = 'level-high';
      resultMarkup = `<span class="history-badge ${colorClass}">Score: ${avgScore}</span>`;
    }

    // Title truncation
    let displayTitle = item.summaryTitle;
    if (displayTitle.length > 50) {
      displayTitle = displayTitle.substring(0, 47) + '...';
    }

    return `
      <tr>
        <td data-label="Type">${typeBadge}</td>
        <td data-label="Date & Time">${dateStr}</td>
        <td data-label="Details" style="color: var(--text-primary); font-weight: 500;">${escapeHtml(displayTitle)}</td>
        <td data-label="Result">${resultMarkup}</td>
      </tr>
    `;
  }).join('');
}

/**
 * Builds ChartJS Line Charts
 */
function renderDashboardCharts() {
  const chartData = window.StorageManager.getChartData();

  // Draw Scam Risk Chart
  const scamCtx = document.getElementById('scamChart');
  if (scamCtx) {
    if (scamChartInstance) scamChartInstance.destroy();
    
    const labels = chartData.scamData.map((_, i) => `Check ${i + 1}`);
    const dataPoints = chartData.scamData.map(d => d.score);

    // If no data points, display empty visual
    const displayData = dataPoints.length > 0 ? dataPoints : [0];
    const displayLabels = labels.length > 0 ? labels : ['No Data'];

    scamChartInstance = new Chart(scamCtx.getContext('2d'), {
      type: 'line',
      data: {
        labels: displayLabels,
        datasets: [{
          label: 'Risk Score (%)',
          data: displayData,
          borderColor: '#00f2fe',
          backgroundColor: createChartGradient(scamCtx.getContext('2d'), 'rgba(0, 242, 254, 0.25)', 'rgba(0, 242, 254, 0)'),
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#00f2fe',
          pointHoverRadius: 6
        }]
      },
      options: getCommonChartOptions(100)
    });
  }

  // Draw Resume Quality Chart
  const resumeCtx = document.getElementById('resumeChart');
  if (resumeCtx) {
    if (resumeChartInstance) resumeChartInstance.destroy();

    const labels = chartData.resumeData.map((_, i) => `Upload ${i + 1}`);
    const dataPoints = chartData.resumeData.map(d => d.score);

    const displayData = dataPoints.length > 0 ? dataPoints : [0];
    const displayLabels = labels.length > 0 ? labels : ['No Data'];

    resumeChartInstance = new Chart(resumeCtx.getContext('2d'), {
      type: 'line',
      data: {
        labels: displayLabels,
        datasets: [{
          label: 'Quality Score (/100)',
          data: displayData,
          borderColor: '#4facfe',
          backgroundColor: createChartGradient(resumeCtx.getContext('2d'), 'rgba(79, 172, 254, 0.25)', 'rgba(79, 172, 254, 0)'),
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#4facfe',
          pointHoverRadius: 6
        }]
      },
      options: getCommonChartOptions(100)
    });
  }

  // Draw Company Trust Chart
  const trustCtx = document.getElementById('trustChart');
  if (trustCtx) {
    if (trustChartInstance) trustChartInstance.destroy();

    const labels = chartData.trustData.map((_, i) => `Check ${i + 1}`);
    const dataPoints = chartData.trustData.map(d => d.score);

    const displayData = dataPoints.length > 0 ? dataPoints : [0];
    const displayLabels = labels.length > 0 ? labels : ['No Data'];

    trustChartInstance = new Chart(trustCtx.getContext('2d'), {
      type: 'line',
      data: {
        labels: displayLabels,
        datasets: [{
          label: 'Trust Score (%)',
          data: displayData,
          borderColor: '#10b981',
          backgroundColor: createChartGradient(trustCtx.getContext('2d'), 'rgba(16, 185, 129, 0.25)', 'rgba(16, 185, 129, 0)'),
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#10b981',
          pointHoverRadius: 6
        }]
      },
      options: getCommonChartOptions(100)
    });
  }

  // Draw Internship Match Fit Chart
  const matchCtx = document.getElementById('matchChart');
  if (matchCtx) {
    if (matchChartInstance) matchChartInstance.destroy();

    const labels = chartData.matchData.map((_, i) => `Check ${i + 1}`);
    const dataPoints = chartData.matchData.map(d => d.score);

    const displayData = dataPoints.length > 0 ? dataPoints : [0];
    const displayLabels = labels.length > 0 ? labels : ['No Data'];

    matchChartInstance = new Chart(matchCtx.getContext('2d'), {
      type: 'line',
      data: {
        labels: displayLabels,
        datasets: [{
          label: 'Match Score (%)',
          data: displayData,
          borderColor: '#f59e0b',
          backgroundColor: createChartGradient(matchCtx.getContext('2d'), 'rgba(245, 158, 11, 0.25)', 'rgba(245, 158, 11, 0)'),
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: '#f59e0b',
          pointHoverRadius: 6
        }]
      },
      options: getCommonChartOptions(100)
    });
  }
}

/**
 * Shared gradient builder
 */
function createChartGradient(ctx, colorStart, colorEnd) {
  const gradient = ctx.createLinearGradient(0, 0, 0, 220);
  gradient.addColorStop(0, colorStart);
  gradient.addColorStop(1, colorEnd);
  return gradient;
}

/**
 * Standard configuration templates for dashboard charts
 */
function getCommonChartOptions(maxLimit) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: '#111827',
        titleFont: { family: 'Outfit', size: 12 },
        bodyFont: { family: 'Inter', size: 12 },
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1
      }
    },
    scales: {
      y: {
        min: 0,
        max: maxLimit,
        grid: {
          color: 'rgba(255, 255, 255, 0.04)',
          drawBorder: false
        },
        ticks: {
          color: '#94a3b8',
          font: { family: 'Inter', size: 10 }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#94a3b8',
          font: { family: 'Inter', size: 10 }
        }
      }
    }
  };
}

/**
 * XSS prevention helper
 */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
