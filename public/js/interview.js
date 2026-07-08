/**
 * aegisresil-apex — Interview Prep, Sandbox, and HR Simulator Coordinator
 */

document.addEventListener('DOMContentLoaded', () => {

  // =========================================================================
  // SUB-TAB ROUTING
  // =========================================================================
  const subtabSandbox = document.getElementById('subtab-btn-sandbox');
  const subtabSimulator = document.getElementById('subtab-btn-simulator');
  const subtabHrSimulator = document.getElementById('subtab-btn-hr-simulator');

  const panelSandbox = document.getElementById('interview-sandbox-panel');
  const panelSimulator = document.getElementById('interview-simulator-panel');
  const panelHrSimulator = document.getElementById('interview-hr-simulator-panel');

  function switchSubTab(activeTab) {
    // Reset tabs
    [subtabSandbox, subtabSimulator, subtabHrSimulator].forEach(btn => {
      if (btn) {
        btn.classList.remove('active');
        btn.style.color = 'var(--text-secondary)';
        btn.style.borderBottom = 'none';
      }
    });
    // Hide panels
    [panelSandbox, panelSimulator, panelHrSimulator].forEach(panel => {
      if (panel) panel.style.display = 'none';
    });

    // Cancel speech syntheses to prevent overlapping readouts
    cancelSpeechReadout();

    if (activeTab === 'sandbox' && subtabSandbox && panelSandbox) {
      subtabSandbox.classList.add('active');
      subtabSandbox.style.color = 'var(--primary)';
      subtabSandbox.style.borderBottom = '2px solid var(--primary)';
      panelSandbox.style.display = 'block';
    } else if (activeTab === 'simulator' && subtabSimulator && panelSimulator) {
      subtabSimulator.classList.add('active');
      subtabSimulator.style.color = 'var(--primary)';
      subtabSimulator.style.borderBottom = '2px solid var(--primary)';
      panelSimulator.style.display = 'block';
    } else if (activeTab === 'hr-simulator' && subtabHrSimulator && panelHrSimulator) {
      subtabHrSimulator.classList.add('active');
      subtabHrSimulator.style.color = 'var(--primary)';
      subtabHrSimulator.style.borderBottom = '2px solid var(--primary)';
      panelHrSimulator.style.display = 'block';
    }
  }

  if (subtabSandbox) subtabSandbox.addEventListener('click', () => switchSubTab('sandbox'));
  if (subtabSimulator) subtabSimulator.addEventListener('click', () => switchSubTab('simulator'));
  if (subtabHrSimulator) subtabHrSimulator.addEventListener('click', () => switchSubTab('hr-simulator'));


  // =========================================================================
  // GLOBAL SPEECH SYNTHESIS ENGINE (TTS)
  // =========================================================================
  let activeUtterance = null;

  function speakText(text, useTts) {
    if (!useTts) return;
    if (!window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    const cleanedText = text.replace(/\[CONCLUDE\]/g, '').trim();
    activeUtterance = new SpeechSynthesisUtterance(cleanedText);
    
    const voices = window.speechSynthesis.getVoices();
    const premiumVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Zira')));
    if (premiumVoice) {
      activeUtterance.voice = premiumVoice;
    }

    window.speechSynthesis.speak(activeUtterance);
  }

  function cancelSpeechReadout() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }


  // =========================================================================
  // PART 1: Q&A ATS SANDBOX
  // =========================================================================
  const roleInput = document.getElementById('interview-target-role');
  const descTextarea = document.getElementById('interview-job-desc');
  const btnGenerate = document.getElementById('btn-generate-interview');
  const btnClear = document.getElementById('btn-clear-interview');
  const loadingSection = document.getElementById('interview-loading');
  const resultsSection = document.getElementById('interview-results');
  const tasksList = document.getElementById('interview-prep-roadmap');
  const accordionContainer = document.getElementById('interview-questions-accordion');

  const sandboxSection = document.getElementById('practice-sandbox-container');
  const sandboxQuestionTitle = document.getElementById('sandbox-active-question-title');
  const answerInput = document.getElementById('interview-answer-input');
  const btnSubmitAnswer = document.getElementById('btn-submit-answer');
  const gradingLoading = document.getElementById('interview-grade-loading');
  const feedbackCard = document.getElementById('interview-feedback-card');
  const scoreBadge = document.getElementById('sandbox-score-badge');
  const strengthsList = document.getElementById('sandbox-strengths-list');
  const improvementsList = document.getElementById('sandbox-improvements-list');
  const modelAnswerText = document.getElementById('sandbox-model-answer');

  let activeQuestionText = '';
  let activeQuestionsArray = [];

  if (roleInput && btnGenerate) {
    const checkInputs = () => { btnGenerate.disabled = roleInput.value.trim().length < 2; };
    roleInput.addEventListener('input', checkInputs);
    checkInputs();

    btnClear.addEventListener('click', () => {
      roleInput.value = '';
      descTextarea.value = '';
      roleInput.disabled = false;
      descTextarea.disabled = false;
      btnGenerate.disabled = true;
      resultsSection.style.display = 'none';
      loadingSection.style.display = 'none';
      sandboxSection.style.display = 'none';
    });

    btnGenerate.addEventListener('click', async () => {
      const targetRole = roleInput.value.trim();
      if (targetRole.length < 2) return;
      const jobDescription = descTextarea.value.trim();

      roleInput.disabled = true;
      descTextarea.disabled = true;
      btnGenerate.disabled = true;
      btnClear.disabled = true;
      resultsSection.style.display = 'none';
      sandboxSection.style.display = 'none';
      loadingSection.style.display = 'flex';

      try {
        const response = await fetch('/api/prep-interview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetRole, jobDescription })
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Server error during interview generation');
        }
        const result = await response.json();
        activeQuestionsArray = result.questions || [];
        window.StorageManager.saveScan('interview', result, `Prep: ${targetRole}`);
        renderQuestions(result);
      } catch (error) {
        console.error(error);
        alert(`Generation Failed: ${error.message}`);
      } finally {
        roleInput.disabled = false;
        descTextarea.disabled = false;
        btnGenerate.disabled = false;
        btnClear.disabled = false;
        loadingSection.style.display = 'none';
      }
    });

    btnSubmitAnswer.addEventListener('click', async () => {
      const typedAnswer = answerInput.value.trim();
      if (typedAnswer.length < 5) {
        alert('Please write a slightly longer answer to grade.');
        return;
      }
      answerInput.disabled = true;
      btnSubmitAnswer.disabled = true;
      feedbackCard.style.display = 'none';
      gradingLoading.style.display = 'flex';

      try {
        const response = await fetch('/api/grade-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: activeQuestionText,
            targetRole: roleInput.value.trim(),
            jobDescription: descTextarea.value.trim(),
            answer: typedAnswer
          })
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Server error');
        }
        const feedback = await response.json();
        renderFeedback(feedback);
      } catch (error) {
        alert(`Grading Failed: ${error.message}`);
        answerInput.disabled = false;
        btnSubmitAnswer.disabled = false;
      } finally {
        gradingLoading.style.display = 'none';
      }
    });
  }

  function renderQuestions(data) {
    tasksList.innerHTML = '';
    if (data.prep_roadmap && data.prep_roadmap.length > 0) {
      data.prep_roadmap.forEach(task => {
        const li = document.createElement('li');
        li.textContent = task;
        tasksList.appendChild(li);
      });
    } else {
      tasksList.innerHTML = '<li>Review company mission details.</li>';
    }

    accordionContainer.innerHTML = '';
    if (data.questions && data.questions.length > 0) {
      accordionContainer.innerHTML = data.questions.map((q, idx) => {
        const catBadge = q.category === 'technical' ? 'badge-tech' : 'badge-behavioral';
        return `
          <div class="accordion-item" id="accordion-item-${idx}">
            <div class="accordion-header" style="display: flex; justify-content: space-between; align-items: center;">
              <div class="accordion-title-container">
                <span class="accordion-category-badge ${catBadge}">${q.category}</span>
                <span class="accordion-title">${escapeHtml(q.question)}</span>
              </div>
              <svg class="accordion-icon" viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2" style="margin-left: 1rem; flex-shrink:0;">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            <div class="accordion-body">
              <div class="accordion-content">
                <p style="color: var(--text-secondary); font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.25rem; border-left: 2.5px solid var(--border-glow); padding-left: 0.75rem;">
                  <strong>Recruiter Tip:</strong> ${escapeHtml(q.tip)}
                </p>
                <button class="btn btn-primary btn-practice-this" data-index="${idx}" style="font-size: 0.85rem; padding: 0.5rem 1.25rem; font-weight: 500;">
                  Practice This Question
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      const items = accordionContainer.querySelectorAll('.accordion-item');
      items.forEach(item => {
        item.querySelector('.accordion-header').addEventListener('click', () => {
          const isActive = item.classList.contains('active');
          items.forEach(otherItem => {
            if (otherItem !== item) {
              otherItem.classList.remove('active');
              otherItem.querySelector('.accordion-body').style.maxHeight = null;
            }
          });
          if (isActive) {
            item.classList.remove('active');
            item.querySelector('.accordion-body').style.maxHeight = null;
          } else {
            item.classList.add('active');
            const body = item.querySelector('.accordion-body');
            body.style.maxHeight = body.scrollHeight + 'px';
          }
        });
      });

      accordionContainer.querySelectorAll('.btn-practice-this').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.getAttribute('data-index'), 10);
          const activeQ = activeQuestionsArray[idx];
          if (activeQ) openSandbox(activeQ.question);
        });
      });
    } else {
      accordionContainer.innerHTML = '<p style="color: var(--text-muted);">No questions generated.</p>';
    }
    resultsSection.style.display = 'grid';
  }

  function openSandbox(questionText) {
    activeQuestionText = questionText;
    sandboxQuestionTitle.innerHTML = `<strong>Question:</strong> "${escapeHtml(questionText)}"`;
    answerInput.value = '';
    answerInput.disabled = false;
    btnSubmitAnswer.disabled = false;
    feedbackCard.style.display = 'none';
    gradingLoading.style.display = 'none';
    sandboxSection.style.display = 'block';
    sandboxSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderFeedback(data) {
    const score = data.score || 0;
    scoreBadge.textContent = `Score: ${score}%`;
    scoreBadge.className = 'badge-level';
    let colorClass = 'level-high';
    if (score >= 75) colorClass = 'level-low';
    else if (score >= 50) colorClass = 'level-medium';
    scoreBadge.classList.add(colorClass);

    strengthsList.innerHTML = '';
    if (data.strengths && data.strengths.length > 0) {
      data.strengths.forEach(s => {
        const li = document.createElement('li');
        li.textContent = s;
        strengthsList.appendChild(li);
      });
    } else {
      strengthsList.innerHTML = '<li>Good attempt. Continue practice.</li>';
    }

    improvementsList.innerHTML = '';
    if (data.improvements && data.improvements.length > 0) {
      data.improvements.forEach(imp => {
        const li = document.createElement('li');
        li.textContent = imp;
        improvementsList.appendChild(li);
      });
    } else {
      improvementsList.innerHTML = '<li>No major improvements suggested.</li>';
    }

    modelAnswerText.textContent = data.sample_answer || 'No sample answer provided.';
    feedbackCard.style.display = 'block';
    answerInput.disabled = false;
    btnSubmitAnswer.disabled = false;
    feedbackCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }


  // =========================================================================
  // GLOBAL SPEECH RECOGNITION CONFIG (STT)
  // =========================================================================
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let isListening = false;
  let activeMicInputEl = null;
  let activeMicVisualizer = null;
  let activeMicButton = null;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isListening = true;
      if (activeMicVisualizer) activeMicVisualizer.style.display = 'flex';
      if (activeMicButton) {
        activeMicButton.style.background = 'rgba(0, 242, 254, 0.15)';
        activeMicButton.style.borderColor = 'var(--primary)';
      }
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (activeMicInputEl) {
        if (activeMicInputEl.value.trim().length > 0) {
          activeMicInputEl.value = activeMicInputEl.value.trim() + ' ' + transcript;
        } else {
          activeMicInputEl.value = transcript;
        }
      }
    };

    recognition.onend = () => {
      isListening = false;
      if (activeMicVisualizer) activeMicVisualizer.style.display = 'none';
      if (activeMicButton) {
        activeMicButton.style.background = 'rgba(255,255,255,0.03)';
        activeMicButton.style.borderColor = 'var(--border-light)';
      }
    };
  }

  function handleVoiceInputToggle(inputEl, visualizerEl, btnEl) {
    if (!recognition) return;
    activeMicInputEl = inputEl;
    activeMicVisualizer = visualizerEl;
    activeMicButton = btnEl;

    if (isListening) {
      recognition.stop();
    } else {
      cancelSpeechReadout();
      recognition.start();
    }
  }


  // =========================================================================
  // PART 2: TECHNICAL / BEHAVIORAL MOCK SIMULATOR
  // =========================================================================
  const simRoleInput = document.getElementById('sim-target-role');
  const simLevelSelect = document.getElementById('sim-skill-level');
  const simFocusSelect = document.getElementById('sim-focus-type');
  const simDescTextarea = document.getElementById('sim-job-desc');
  const simTtsCheckbox = document.getElementById('sim-voice-tts-toggle');
  const simSttCheckbox = document.getElementById('sim-voice-stt-toggle');
  const btnSimStart = document.getElementById('btn-start-simulation');
  const btnSimSend = document.getElementById('btn-sim-send');
  const btnSimVoiceToggle = document.getElementById('btn-sim-voice-toggle');
  const btnSimConclude = document.getElementById('btn-sim-conclude');
  const btnSimRestart = document.getElementById('btn-sim-restart');

  const simSetupCard = document.getElementById('simulator-setup-card');
  const simActiveCard = document.getElementById('simulator-active-card');
  const simReportCard = document.getElementById('simulator-report-card');
  const simLoadingOverlay = document.getElementById('simulator-loading');
  const simLoadingText = document.getElementById('sim-loading-text');

  const simChatStream = document.getElementById('sim-chat-stream');
  const simChatInput = document.getElementById('sim-chat-input');
  const simTurnIndicator = document.getElementById('sim-turn-indicator');
  const simVoiceVisualizer = document.getElementById('sim-voice-visualizer');

  // Report elements
  const simReportOverallScore = document.getElementById('sim-report-overall-score');
  const simReportGaugeFill = document.getElementById('sim-report-gauge-fill');
  const simReportFitBadge = document.getElementById('sim-report-fit-badge');
  const simReportTechGrade = document.getElementById('sim-report-tech-grade');
  const simReportCommGrade = document.getElementById('sim-report-comm-grade');
  const simReportStrengths = document.getElementById('sim-report-strengths');
  const simReportImprovements = document.getElementById('sim-report-improvements');
  const simReportQaContainer = document.getElementById('sim-report-qa-review-container');

  let simHistory = [];
  let simQuestionCount = 0;
  let simTargetRole = '';
  let isSimConcluded = false;

  if (simRoleInput && btnSimStart) {
    const validateSimInputs = () => { btnSimStart.disabled = simRoleInput.value.trim().length < 2; };
    simRoleInput.addEventListener('input', validateSimInputs);
    validateSimInputs();

    if (!recognition && btnSimVoiceToggle) btnSimVoiceToggle.style.display = 'none';

    btnSimVoiceToggle.addEventListener('click', () => {
      handleVoiceInputToggle(simChatInput, simVoiceVisualizer, btnSimVoiceToggle);
    });

    btnSimStart.addEventListener('click', async () => {
      simTargetRole = simRoleInput.value.trim();
      if (simTargetRole.length < 2) return;

      simSetupCard.style.display = 'none';
      simActiveCard.style.display = 'none';
      simReportCard.style.display = 'none';
      simLoadingText.textContent = 'Calibrating Interviewer Questions';
      simLoadingOverlay.style.display = 'flex';

      simHistory = [];
      simQuestionCount = 1;
      isSimConcluded = false;
      simChatStream.innerHTML = '';
      simTurnIndicator.textContent = `Question ${simQuestionCount} of 4`;
      simChatInput.value = '';

      const initMessage = `Hi! I am ready to start my mock interview for the role of ${simTargetRole} (Experience Level: ${simLevelSelect.value}) focusing primarily on ${simFocusSelect.value} parameters. Please ask me the first question.`;

      try {
        const response = await fetch('/api/simulator/turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ history: [], message: initMessage })
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Server error starting interview');
        }
        const data = await response.json();
        
        simHistory.push({ role: 'user', parts: [{ text: initMessage }] });
        simHistory.push({ role: 'model', parts: [{ text: data.reply }] });

        simLoadingOverlay.style.display = 'none';
        simActiveCard.style.display = 'block';

        appendSimMessage('ai', data.reply);
        speakText(data.reply, simTtsCheckbox.checked);

        if (simSttCheckbox.checked && recognition) {
          setTimeout(() => {
            if (!window.speechSynthesis.speaking) {
              recognition.start();
            } else {
              activeUtterance.onend = () => { recognition.start(); };
            }
          }, 800);
        }
      } catch (err) {
        alert(`Simulation failed: ${err.message}`);
        simSetupCard.style.display = 'block';
        simLoadingOverlay.style.display = 'none';
      }
    });

    btnSimSend.addEventListener('click', submitSimUserResponse);
    simChatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitSimUserResponse();
      }
    });

    async function submitSimUserResponse() {
      if (isSimConcluded) return;
      const answer = simChatInput.value.trim();
      if (answer.length < 3) return;

      appendSimMessage('user', answer);
      simChatInput.value = '';
      cancelSpeechReadout();

      simChatInput.disabled = true;
      btnSimSend.disabled = true;
      if (btnSimVoiceToggle) btnSimVoiceToggle.disabled = true;

      simHistory.push({ role: 'user', parts: [{ text: answer }] });
      simQuestionCount++;

      if (simQuestionCount > 4) {
        isSimConcluded = true;
        simTurnIndicator.textContent = 'Assessment Finished';
        appendSimSystemBubble('Interview questions complete. Evaluating performance metrics...');
        evaluateSimSession();
        return;
      }

      simTurnIndicator.textContent = `Question ${simQuestionCount} of 4`;

      try {
        const response = await fetch('/api/simulator/turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ history: simHistory.slice(0, -1), message: answer })
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Server error');
        }
        const data = await response.json();
        let reply = data.reply;

        if (reply.includes('[CONCLUDE]')) {
          isSimConcluded = true;
          reply = reply.replace('[CONCLUDE]', '').trim();
        }

        simHistory.push({ role: 'model', parts: [{ text: reply }] });
        appendSimMessage('ai', reply);
        speakText(reply, simTtsCheckbox.checked);

        simChatInput.disabled = false;
        btnSimSend.disabled = false;
        if (btnSimVoiceToggle) btnSimVoiceToggle.disabled = false;

        if (isSimConcluded) {
          simTurnIndicator.textContent = 'Assessment Finished';
          appendSimSystemBubble('Interview questions complete. Evaluating performance metrics...');
          evaluateSimSession();
        } else if (simSttCheckbox.checked && recognition) {
          if (!window.speechSynthesis.speaking) {
            recognition.start();
          } else {
            activeUtterance.onend = () => { recognition.start(); };
          }
        }
      } catch (err) {
        appendSimSystemBubble(`Network error: ${err.message}. Conclude to view report.`);
        simChatInput.disabled = false;
        btnSimSend.disabled = false;
        if (btnSimVoiceToggle) btnSimVoiceToggle.disabled = false;
      }
    }

    btnSimConclude.addEventListener('click', () => {
      cancelSpeechReadout();
      isSimConcluded = true;
      evaluateSimSession();
    });

    async function evaluateSimSession() {
      simActiveCard.style.display = 'none';
      simLoadingText.textContent = 'Analyzing Performance Transcripts';
      simLoadingOverlay.style.display = 'flex';

      try {
        const response = await fetch('/api/simulator/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ history: simHistory })
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Server error evaluating');
        }
        const data = await response.json();
        window.StorageManager.saveScan('interview', data, `Mock Simulator: ${simTargetRole}`);
        renderSimReport(data);
      } catch (err) {
        alert(`Evaluation failed: ${err.message}`);
        simActiveCard.style.display = 'block';
      } finally {
        simLoadingOverlay.style.display = 'none';
      }
    }

    function renderSimReport(data) {
      const score = data.overall_score || 0;
      simReportOverallScore.textContent = score;

      const offset = 251.2 - (score / 100) * 251.2;
      simReportGaugeFill.style.strokeDashoffset = offset;

      simReportFitBadge.className = 'badge-level';
      if (score >= 80) {
        simReportFitBadge.classList.add('level-low');
        simReportFitBadge.textContent = 'Excellent Role Fit';
        simReportGaugeFill.style.stroke = 'var(--color-safe)';
      } else if (score >= 50) {
        simReportFitBadge.classList.add('level-medium');
        simReportFitBadge.textContent = 'Moderate Role Fit';
        simReportGaugeFill.style.stroke = 'var(--color-warning)';
      } else {
        simReportFitBadge.classList.add('level-high');
        simReportFitBadge.textContent = 'Needs Development';
        simReportGaugeFill.style.stroke = 'var(--color-danger)';
      }

      simReportTechGrade.textContent = data.technical_depth || 'N/A';
      simReportCommGrade.textContent = data.communication_clarity || 'N/A';

      simReportStrengths.innerHTML = (data.strengths || []).map(s => `<li>${escapeHtml(s)}</li>`).join('') || '<li>Acceptable.</li>';
      simReportImprovements.innerHTML = (data.improvements || []).map(s => `<li>${escapeHtml(s)}</li>`).join('') || '<li>No critical feedback.</li>';

      simReportQaContainer.innerHTML = (data.qa_review || []).map((item, idx) => `
        <div style="border-left: 3px solid var(--border-glow); padding-left: 1rem; margin-bottom: 2rem;">
          <h5 style="color: var(--primary); font-size: 0.95rem; font-weight: 700; margin-bottom: 0.5rem;">Q${idx + 1}: ${escapeHtml(item.question)}</h5>
          <p style="font-size: 0.88rem; color: var(--text-secondary); margin-bottom: 0.5rem; line-height: 1.4;">
            <strong>Your Response:</strong> "${escapeHtml(item.answer)}"
          </p>
          <div class="sim-card-critique" style="margin-bottom: 0.75rem;">
            <p style="font-size: 0.85rem; color: var(--color-warning); margin-bottom: 0.25rem; font-weight: 600;">Critique (Score: ${item.score}%):</p>
            <p style="font-size: 0.85rem; color: var(--text-secondary);">${escapeHtml(item.critique)}</p>
          </div>
          <p style="font-size: 0.85rem; color: var(--color-safe); line-height: 1.4;">
            <strong>Ideal Response Blueprint:</strong> "${escapeHtml(item.model_answer)}"
          </p>
        </div>
      `).join('');

      simReportCard.style.display = 'block';
    }

    btnSimRestart.addEventListener('click', () => {
      simReportCard.style.display = 'none';
      simSetupCard.style.display = 'block';
      validateSimInputs();
    });

    function appendSimMessage(sender, text) {
      const row = document.createElement('div');
      row.className = `sim-message-row ${sender === 'ai' ? 'ai-row' : 'user-row'}`;
      const bubble = document.createElement('div');
      bubble.className = `sim-bubble ${sender === 'ai' ? 'sim-bubble-ai' : 'sim-bubble-user'}`;
      bubble.textContent = text;
      row.appendChild(bubble);
      simChatStream.appendChild(row);
      simChatStream.scrollTop = simChatStream.scrollHeight;
    }

    function appendSimSystemBubble(text) {
      const bubble = document.createElement('div');
      bubble.style.textAlign = 'center';
      bubble.style.color = 'var(--text-secondary)';
      bubble.style.fontSize = '0.78rem';
      bubble.style.margin = '0.5rem 0';
      bubble.style.fontStyle = 'italic';
      bubble.textContent = `• ${text} •`;
      simChatStream.appendChild(bubble);
      simChatStream.scrollTop = simChatStream.scrollHeight;
    }
  }


  // =========================================================================
  // PART 3: PERSONALIZED HR INTERVIEW SIMULATOR
  // =========================================================================
  const hrRoleInput = document.getElementById('hr-sim-target-role');
  const hrCompanyInput = document.getElementById('hr-sim-company-name');
  const hrExpSelect = document.getElementById('hr-sim-exp-level');
  const hrProfileTextarea = document.getElementById('hr-sim-profile');
  const hrIndustryInput = document.getElementById('hr-sim-industry');
  const hrLanguageInput = document.getElementById('hr-sim-language');
  const hrStyleSelect = document.getElementById('hr-sim-style');
  const hrDiffSelect = document.getElementById('hr-sim-difficulty');
  const hrTtsCheckbox = document.getElementById('hr-sim-tts-toggle');
  const hrSttCheckbox = document.getElementById('hr-sim-stt-toggle');

  const btnHrSetup = document.getElementById('btn-hr-start-setup');
  const btnHrReady = document.getElementById('btn-hr-ready-begin');
  const btnHrVoiceToggle = document.getElementById('btn-hr-sim-voice-toggle');
  const btnHrSend = document.getElementById('btn-hr-sim-send');
  const btnHrConclude = document.getElementById('btn-hr-sim-conclude');
  const btnHrRestart = document.getElementById('btn-hr-sim-restart');

  const hrSetupCard = document.getElementById('hr-sim-setup-card');
  const hrActivationCard = document.getElementById('hr-sim-activation-card');
  const hrActiveCard = document.getElementById('hr-sim-active-card');
  const hrReportCard = document.getElementById('hr-sim-report-card');
  const hrLoadingOverlay = document.getElementById('hr-sim-loading');
  const hrLoadingText = document.getElementById('hr-sim-loading-text');

  const hrChatStream = document.getElementById('hr-sim-chat-stream');
  const hrChatInput = document.getElementById('hr-sim-chat-input');
  const hrTurnIndicator = document.getElementById('hr-sim-turn-indicator');
  const hrVoiceVisualizer = document.getElementById('hr-sim-voice-visualizer');

  // Report elements
  const hrReportOverallScore = document.getElementById('hr-sim-report-overall-score');
  const hrReportGaugeFill = document.getElementById('hr-sim-report-gauge-fill');
  const hrReportFitBadge = document.getElementById('hr-sim-report-fit-badge');
  const hrReportComm = document.getElementById('hr-sim-report-comm');
  const hrReportConfidence = document.getElementById('hr-sim-report-confidence');
  const hrReportStar = document.getElementById('hr-sim-report-star');
  const hrReportFit = document.getElementById('hr-sim-report-fit');
  const hrBarComm = document.getElementById('hr-sim-bar-comm');
  const hrBarConfidence = document.getElementById('hr-sim-bar-confidence');
  const hrBarStar = document.getElementById('hr-sim-bar-star');
  const hrBarFit = document.getElementById('hr-sim-bar-fit');
  const hrReportStrengths = document.getElementById('hr-sim-report-strengths');
  const hrReportImprovements = document.getElementById('hr-sim-report-improvements');
  const hrReportQaContainer = document.getElementById('hr-sim-report-qa-review-container');

  let hrHistory = [];
  let hrQuestionCount = 0;
  let isHrConcluded = false;
  let hrInitialQuestion = '';

  if (hrRoleInput && btnHrSetup) {
    const validateHrInputs = () => {
      btnHrSetup.disabled = (hrRoleInput.value.trim().length < 2 || hrCompanyInput.value.trim().length < 2 || hrProfileTextarea.value.trim().length < 10);
    };
    [hrRoleInput, hrCompanyInput, hrProfileTextarea].forEach(el => el.addEventListener('input', validateHrInputs));
    validateHrInputs();

    if (!recognition && btnHrVoiceToggle) btnHrVoiceToggle.style.display = 'none';

    btnHrVoiceToggle.addEventListener('click', () => {
      handleVoiceInputToggle(hrChatInput, hrVoiceVisualizer, btnHrVoiceToggle);
    });

    btnHrSetup.addEventListener('click', async () => {
      hrSetupCard.style.display = 'none';
      hrLoadingOverlay.style.display = 'flex';
      hrLoadingText.textContent = 'Calibrating HR Interviewer...';

      hrHistory = [];
      hrQuestionCount = 1;
      isHrConcluded = false;
      hrChatStream.innerHTML = '';
      hrTurnIndicator.textContent = `HR Round Screening — Question ${hrQuestionCount}`;
      hrChatInput.value = '';

      const initMessage = `Setup initiated. Candidate Profile: ${hrProfileTextarea.value.trim()}. Job Role: ${hrRoleInput.value.trim()}. Company Name: ${hrCompanyInput.value.trim()}. Style: ${hrStyleSelect.value}. Language: ${hrLanguageInput.value}. Please initiate the HR screening interview with Question 1.`;

      try {
        const response = await fetch('/api/hr-simulator/turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            history: [],
            message: initMessage,
            targetRole: hrRoleInput.value.trim(),
            companyName: hrCompanyInput.value.trim(),
            expLevel: hrExpSelect.value,
            profile: hrProfileTextarea.value.trim(),
            industry: hrIndustryInput.value.trim(),
            language: hrLanguageInput.value.trim(),
            style: hrStyleSelect.value,
            difficulty: hrDiffSelect.value
          })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Server error initiating HR simulation');
        }

        const data = await response.json();
        hrInitialQuestion = data.reply;

        hrHistory.push({ role: 'user', parts: [{ text: initMessage }] });
        hrHistory.push({ role: 'model', parts: [{ text: hrInitialQuestion }] });

        hrLoadingOverlay.style.display = 'none';
        hrActivationCard.style.display = 'block';

      } catch (err) {
        alert(`HR setup failed: ${err.message}`);
        hrSetupCard.style.display = 'block';
        hrLoadingOverlay.style.display = 'none';
      }
    });

    btnHrReady.addEventListener('click', () => {
      hrActivationCard.style.display = 'none';
      hrActiveCard.style.display = 'block';

      appendHrMessage('ai', hrInitialQuestion);
      speakText(hrInitialQuestion, hrTtsCheckbox.checked);

      if (hrSttCheckbox.checked && recognition) {
        setTimeout(() => {
          if (!window.speechSynthesis.speaking) {
            recognition.start();
          } else {
            activeUtterance.onend = () => { recognition.start(); };
          }
        }, 800);
      }
    });

    btnHrSend.addEventListener('click', submitHrUserResponse);
    hrChatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitHrUserResponse();
      }
    });

    async function submitHrUserResponse() {
      if (isHrConcluded) return;
      const answer = hrChatInput.value.trim();
      if (answer.length < 3) return;

      appendHrMessage('user', answer);
      hrChatInput.value = '';
      cancelSpeechReadout();

      hrChatInput.disabled = true;
      btnHrSend.disabled = true;
      if (btnHrVoiceToggle) btnHrVoiceToggle.disabled = true;

      hrHistory.push({ role: 'user', parts: [{ text: answer }] });
      hrQuestionCount++;

      if (hrQuestionCount > 4) {
        isHrConcluded = true;
        hrTurnIndicator.textContent = 'Interview Concluded';
        appendHrSystemBubble('HR Interview complete. Compiling behavioral evaluation report...');
        evaluateHrSession();
        return;
      }

      hrTurnIndicator.textContent = `HR Round Screening — Question ${hrQuestionCount}`;

      try {
        const response = await fetch('/api/hr-simulator/turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            history: hrHistory.slice(0, -1),
            message: answer,
            targetRole: hrRoleInput.value.trim(),
            companyName: hrCompanyInput.value.trim(),
            expLevel: hrExpSelect.value,
            profile: hrProfileTextarea.value.trim(),
            industry: hrIndustryInput.value.trim(),
            language: hrLanguageInput.value.trim(),
            style: hrStyleSelect.value,
            difficulty: hrDiffSelect.value
          })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Server error');
        }

        const data = await response.json();
        let reply = data.reply;

        if (reply.includes('[CONCLUDE]')) {
          isHrConcluded = true;
          reply = reply.replace('[CONCLUDE]', '').trim();
        }

        hrHistory.push({ role: 'model', parts: [{ text: reply }] });
        appendHrMessage('ai', reply);
        speakText(reply, hrTtsCheckbox.checked);

        hrChatInput.disabled = false;
        btnHrSend.disabled = false;
        if (btnHrVoiceToggle) btnHrVoiceToggle.disabled = false;

        if (isHrConcluded) {
          hrTurnIndicator.textContent = 'Interview Concluded';
          appendHrSystemBubble('HR Interview complete. Compiling behavioral evaluation report...');
          evaluateHrSession();
        } else if (hrSttCheckbox.checked && recognition) {
          if (!window.speechSynthesis.speaking) {
            recognition.start();
          } else {
            activeUtterance.onend = () => { recognition.start(); };
          }
        }

      } catch (err) {
        appendHrSystemBubble(`Network error: ${err.message}. Click Conclude to view report.`);
        hrChatInput.disabled = false;
        btnHrSend.disabled = false;
        if (btnHrVoiceToggle) btnHrVoiceToggle.disabled = false;
      }
    }

    btnHrConclude.addEventListener('click', () => {
      cancelSpeechReadout();
      isHrConcluded = true;
      evaluateHrSession();
    });

    async function evaluateHrSession() {
      hrActiveCard.style.display = 'none';
      hrLoadingOverlay.style.display = 'flex';
      hrLoadingText.textContent = 'Analyzing HR Transcript & Core Competencies...';

      try {
        const response = await fetch('/api/hr-simulator/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            history: hrHistory,
            targetRole: hrRoleInput.value.trim(),
            companyName: hrCompanyInput.value.trim()
          })
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Server error evaluating');
        }

        const data = await response.json();
        window.StorageManager.saveScan('interview', data, `HR Simulator: ${hrCompanyInput.value.trim()} - ${hrRoleInput.value.trim()}`);
        renderHrAnalysisReport(data);

      } catch (err) {
        alert(`HR Evaluation failed: ${err.message}`);
        hrActiveCard.style.display = 'block';
      } finally {
        hrLoadingOverlay.style.display = 'none';
      }
    }

    function renderHrAnalysisReport(data) {
      const container = document.getElementById('hr-sim-analysis-report-container');
      if (!container) return;

      const score = data.overall_score || 0;
      const rec = data.hiring_recommendation || 'BORDERLINE';
      const reason = data.hiring_reason || '';
      const scores = data.category_scores || {};
      const strengths = data.strengths || [];
      const improvements = data.improvements || [];
      const wellList = data.questions_answered_well || [];
      const needList = data.questions_needing_improvement || [];
      const samples = data.improved_sample_answers || [];
      const realQuestions = data.real_hr_questions || [];
      const plan = data.personalized_improvement_plan || {};

      let recClass = 'level-medium';
      let recText = 'Borderline';
      if (rec === 'STRONG_HIRE') {
        recClass = 'level-low';
        recText = 'Strong Hire 🌟';
      } else if (rec === 'HIRE') {
        recClass = 'level-low';
        recText = 'Hire ✓';
      } else if (rec === 'NO_HIRE') {
        recClass = 'level-high';
        recText = 'No Hire 🚫';
      }

      const offset = 251.2 - (score / 100) * 251.2;

      const categoryMap = [
        { label: 'Communication Skills', value: scores.communication_skills || 0, color: 'var(--primary)' },
        { label: 'Confidence', value: scores.confidence || 0, color: '#a855f7' },
        { label: 'Professionalism', value: scores.professionalism || 0, color: 'var(--color-safe)' },
        { label: 'Clarity of Thought', value: scores.clarity_of_thought || 0, color: 'var(--color-warning)' },
        { label: 'Leadership Potential', value: scores.leadership_potential || 0, color: '#e2e8f0' },
        { label: 'Teamwork', value: scores.teamwork || 0, color: '#38bdf8' },
        { label: 'Emotional Intelligence', value: scores.emotional_intelligence || 0, color: '#ec4899' },
        { label: 'Cultural Fit', value: scores.cultural_fit || 0, color: '#10b981' },
        { label: 'Career Motivation', value: scores.career_motivation || 0, color: '#f59e0b' },
        { label: 'Overall Role Fit', value: scores.overall_role_fit || 0, color: '#6366f1' }
      ];

      let html = `
        <div class="card" style="border-color: var(--border-glow); background: rgba(0, 242, 254, 0.01); padding: 2rem;">
          <h3 style="font-family: var(--font-header); font-weight: 800; font-size: 1.5rem; color: var(--primary); text-align: center; margin-bottom: 2rem;">
            🏆 Comprehensive HR Interview Analysis Report
          </h3>

          <!-- Score Card Grid -->
          <div class="results-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; margin-bottom: 2.5rem;">
            <!-- Score Gauge -->
            <div class="card" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1.75rem; background: rgba(15,23,42,0.4);">
              <div class="gauge-wrapper">
                <svg class="gauge-svg" viewBox="0 0 100 100">
                  <circle class="gauge-bg" cx="50" cy="50" r="40"></circle>
                  <circle class="gauge-fill" cx="50" cy="50" r="40" stroke-dasharray="251.2" stroke-dashoffset="${offset}" style="stroke: ${score >= 80 ? 'var(--color-safe)' : (score >= 50 ? 'var(--color-warning)' : 'var(--color-danger)')};"></circle>
                </svg>
                <div class="gauge-text">
                  <span class="gauge-number" style="font-size: 2.2rem; font-weight: 900; font-family: var(--font-header);">${score}</span>
                  <span class="gauge-label" style="font-size: 0.65rem; letter-spacing: 0.05em; color: var(--text-secondary); text-transform: uppercase;">HR Score</span>
                </div>
              </div>
              <div style="margin-top: 1.25rem; text-align: center;">
                <span class="badge-level ${recClass}" style="font-size: 0.9rem; padding: 0.4rem 1.2rem; font-weight: 700; border-radius: 20px;">
                  Recommendation: ${recText}
                </span>
              </div>
            </div>

            <!-- Recommendation Reason block -->
            <div class="card" style="display: flex; flex-direction: column; justify-content: center; padding: 1.75rem; background: rgba(15,23,42,0.4);">
              <h4 style="font-family: var(--font-header); font-weight: 800; font-size: 1.05rem; color: var(--primary); margin-bottom: 0.75rem;">
                Hiring Justification Reason
              </h4>
              <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; font-style: italic; border-left: 3px solid var(--border-glow); padding-left: 0.85rem;">
                "${escapeHtml(reason)}"
              </p>
            </div>
          </div>

          <!-- Category Scores -->
          <div class="card" style="padding: 1.75rem; margin-bottom: 2.5rem; background: rgba(10,13,22,0.3);">
            <h4 style="font-family: var(--font-header); font-weight: 800; font-size: 1.15rem; color: var(--text-primary); margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-light); padding-bottom: 0.5rem;">
              📊 Core Category Scorecards
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem;">
              ${categoryMap.map(cat => `
                <div>
                  <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 0.35rem;">
                    <span style="color: var(--text-secondary); font-weight: 600;">${cat.label}</span>
                    <strong style="color: var(--text-primary);">${cat.value}%</strong>
                  </div>
                  <div style="background: rgba(255,255,255,0.03); height: 6px; border-radius: 3px; overflow: hidden;">
                    <div style="background: ${cat.color}; height: 100%; width: ${cat.value}%; transition: width 0.8s ease;"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Strengths & Areas to Improve lists -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; margin-bottom: 2.5rem;">
            <div class="card" style="border-color: rgba(46, 204, 113, 0.15); background: rgba(46, 204, 113, 0.01); padding: 1.5rem;">
              <h4 style="color: var(--color-safe); font-family: var(--font-header); font-weight: 800; font-size: 1.05rem; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.35rem;">
                <span>✓</span> Demonstrated Strengths
              </h4>
              <ul class="bullet-list" style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5; padding-left: 1.2rem; list-style-type: disc;">
                ${strengths.map(s => `<li>${escapeHtml(s)}</li>`).join('') || '<li>Consistent delivery observed.</li>'}
              </ul>
            </div>

            <div class="card" style="border-color: rgba(231, 76, 60, 0.15); background: rgba(231, 76, 60, 0.01); padding: 1.5rem;">
              <h4 style="color: var(--color-danger); font-family: var(--font-header); font-weight: 800; font-size: 1.05rem; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.35rem;">
                <span>⚠</span> Niche Areas for Improvement
              </h4>
              <ul class="bullet-list" style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5; padding-left: 1.2rem; list-style-type: disc;">
                ${improvements.map(imp => `<li>${escapeHtml(imp)}</li>`).join('') || '<li>No major issues flagged.</li>'}
              </ul>
            </div>
          </div>

          <!-- Questions review sections -->
          <div class="card" style="padding: 1.75rem; margin-bottom: 2.5rem; background: rgba(10,13,22,0.3);">
            <h4 style="font-family: var(--font-header); font-weight: 800; font-size: 1.15rem; color: var(--text-primary); margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-light); padding-bottom: 0.5rem;">
              🔎 Performance Breakdown By Response
            </h4>
            
            <div style="display: flex; flex-direction: column; gap: 1.5rem;">
              <div>
                <h5 style="color: var(--color-safe); font-size: 0.95rem; font-weight: 700; margin-bottom: 0.75rem;">🌟 Strongest Responses</h5>
                ${wellList.map(item => `
                  <div style="margin-bottom: 1rem; padding: 0.85rem; background: rgba(46, 204, 113, 0.02); border-left: 3px solid var(--color-safe); border-radius: 0 8px 8px 0;">
                    <p style="font-size: 0.88rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">Q: ${escapeHtml(item.question)}</p>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); font-style: italic; margin-bottom: 0.35rem;">"A: ${escapeHtml(item.answer)}"</p>
                    <p style="font-size: 0.82rem; color: var(--text-muted);"><strong>Why it worked:</strong> ${escapeHtml(item.reason)}</p>
                  </div>
                `).join('') || '<p style="font-size: 0.85rem; color: var(--text-muted);">No answers specifically highlighted as exceptionally strong.</p>'}
              </div>

              <div style="margin-top: 1rem;">
                <h5 style="color: var(--color-warning); font-size: 0.95rem; font-weight: 700; margin-bottom: 0.75rem;">⚡ Responses Needing Improvement</h5>
                ${needList.map(item => `
                  <div style="margin-bottom: 1rem; padding: 0.85rem; background: rgba(245, 158, 11, 0.02); border-left: 3px solid var(--color-warning); border-radius: 0 8px 8px 0;">
                    <p style="font-size: 0.88rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">Q: ${escapeHtml(item.question)}</p>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); font-style: italic; margin-bottom: 0.35rem;">"A: ${escapeHtml(item.answer)}"</p>
                    <p style="font-size: 0.82rem; color: var(--text-muted);"><strong>Analysis critique:</strong> ${escapeHtml(item.reason)}</p>
                  </div>
                `).join('') || '<p style="font-size: 0.85rem; color: var(--text-muted);">No responses critically needed adjustments.</p>'}
              </div>
            </div>
          </div>

          <!-- Improved Sample Answers -->
          <div class="card" style="padding: 1.75rem; margin-bottom: 2.5rem; background: rgba(10,13,22,0.3);">
            <h4 style="font-family: var(--font-header); font-weight: 800; font-size: 1.15rem; color: var(--text-primary); margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-light); padding-bottom: 0.5rem;">
              ✍️ Interview-Ready STAR Rewrite Comparisons
            </h4>
            ${samples.map((item, idx) => `
              <div style="margin-bottom: 1.75rem; border-bottom: 1px dashed var(--border-light); padding-bottom: 1.5rem; ${idx === samples.length - 1 ? 'border-bottom: none; padding-bottom: 0;' : ''}">
                <h5 style="color: var(--primary); font-size: 0.95rem; font-weight: 700; margin-bottom: 0.75rem;">Question: ${escapeHtml(item.question)}</h5>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.25rem;">
                  <div style="padding: 0.85rem; background: rgba(255, 45, 85, 0.02); border: 1px solid rgba(255, 45, 85, 0.1); border-radius: 8px;">
                    <p style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-danger); font-weight: 700; margin-bottom: 0.35rem;">Your Original Response</p>
                    <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">"${escapeHtml(item.original_answer)}"</p>
                  </div>
                  <div style="padding: 0.85rem; background: rgba(46, 204, 113, 0.02); border: 1px solid rgba(46, 204, 113, 0.1); border-radius: 8px;">
                    <p style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-safe); font-weight: 700; margin-bottom: 0.35rem;">Ideal STAR Rewrite Blueprint</p>
                    <p style="font-size: 0.85rem; color: var(--text-primary); line-height: 1.45; font-weight: 500;">"${escapeHtml(item.improved_answer)}"</p>
                  </div>
                </div>
              </div>
            `).join('') || '<p style="font-size: 0.85rem; color: var(--text-muted);">No before-after STAR rewrites provided.</p>'}
          </div>

          <!-- Real HR Questions -->
          <div class="card" style="padding: 1.75rem; margin-bottom: 2.5rem; background: rgba(10,13,22,0.3);">
            <h4 style="font-family: var(--font-header); font-weight: 800; font-size: 1.15rem; color: var(--text-primary); margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-light); padding-bottom: 0.5rem;">
              🎯 Real HR Questions Likely To Appear Next
            </h4>
            <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 1rem;">Based on your candidate details, target role, and target company, practice these additional questions prior to the actual round:</p>
            <div style="display: grid; grid-template-columns: 1fr; gap: 0.75rem;">
              ${realQuestions.map((q, idx) => `
                <div style="display: flex; gap: 0.75rem; font-size: 0.88rem; color: var(--text-secondary); border-left: 2px solid var(--border-glow); padding-left: 0.75rem;">
                  <strong style="color: var(--primary); min-width: 20px;">#${idx + 1}</strong>
                  <span>${escapeHtml(q)}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Personalized Improvement Plan -->
          <div class="card" style="padding: 1.75rem; margin-bottom: 2.5rem; background: rgba(10, 13, 22, 0.3);">
            <h4 style="font-family: var(--font-header); font-weight: 800; font-size: 1.15rem; color: var(--text-primary); margin-bottom: 1.25rem; border-bottom: 1px solid var(--border-light); padding-bottom: 0.5rem;">
              📅 Personalized Preparation Roadmap
            </h4>
            <div style="display: flex; flex-direction: column; gap: 1.5rem;">
              <div style="display: grid; grid-template-columns: 100px 1fr; gap: 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 1rem;">
                <div style="font-family: var(--font-header); font-weight: 800; font-size: 0.82rem; color: var(--primary); text-transform: uppercase;">Immediate</div>
                <div style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5;">${escapeHtml(plan.immediate_improvements || '')}</div>
              </div>
              <div style="display: grid; grid-template-columns: 100px 1fr; gap: 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 1rem;">
                <div style="font-family: var(--font-header); font-weight: 800; font-size: 0.82rem; color: #a855f7; text-transform: uppercase;">24 Hours</div>
                <div style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5;">${escapeHtml(plan.preparation_plan_24h || '')}</div>
              </div>
              <div style="display: grid; grid-template-columns: 100px 1fr; gap: 1.25rem; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 1rem;">
                <div style="font-family: var(--font-header); font-weight: 800; font-size: 0.82rem; color: var(--color-safe); text-transform: uppercase;">7 Days</div>
                <div style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5;">${escapeHtml(plan.preparation_plan_7d || '')}</div>
              </div>
              <div style="display: grid; grid-template-columns: 100px 1fr; gap: 1.25rem; padding-bottom: 0.5rem;">
                <div style="font-family: var(--font-header); font-weight: 800; font-size: 0.82rem; color: var(--color-warning); text-transform: uppercase;">Interview Day</div>
                <div style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.5;">${escapeHtml(plan.interview_day_tips || '')}</div>
              </div>
            </div>
          </div>

          <!-- Restart Button -->
          <div style="margin-top: 2rem; border-top: 1px solid var(--border-light); padding-top: 1.5rem; text-align: center;">
            <button id="btn-hr-sim-restart-report" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 700;">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
              Restart HR Simulator Session
            </button>
          </div>
        </div>
      `;

      container.innerHTML = html;

      // Bind restart action to report restart button
      const btnRestartReport = document.getElementById('btn-hr-sim-restart-report');
      if (btnRestartReport) {
        btnRestartReport.addEventListener('click', () => {
          document.getElementById('hr-sim-report-card').style.display = 'none';
          document.getElementById('hr-sim-setup-card').style.display = 'block';
          if (hrRoleInput) {
            hrRoleInput.dispatchEvent(new Event('input'));
          }
        });
      }

      document.getElementById('hr-sim-report-card').style.display = 'block';
    }

    function appendHrMessage(sender, text) {
      const row = document.createElement('div');
      row.className = `sim-message-row ${sender === 'ai' ? 'ai-row' : 'user-row'}`;
      const bubble = document.createElement('div');
      bubble.className = `sim-bubble ${sender === 'ai' ? 'sim-bubble-ai' : 'sim-bubble-user'}`;
      bubble.textContent = text;
      row.appendChild(bubble);
      hrChatStream.appendChild(row);
      hrChatStream.scrollTop = hrChatStream.scrollHeight;
    }

    function appendHrSystemBubble(text) {
      const bubble = document.createElement('div');
      bubble.style.textAlign = 'center';
      bubble.style.color = 'var(--text-secondary)';
      bubble.style.fontSize = '0.78rem';
      bubble.style.margin = '0.5rem 0';
      bubble.style.fontStyle = 'italic';
      bubble.textContent = `• ${text} •`;
      hrChatStream.appendChild(bubble);
      hrChatStream.scrollTop = hrChatStream.scrollHeight;
    }
  }


  // =========================================================================
  // UTILITY HELPERS
  // =========================================================================
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

});
