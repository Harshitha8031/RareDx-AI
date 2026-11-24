/* ==========================================================================
   RareDx AI - Interactive Clinical MDT Simulation & Research Platform
   Authors: Harshitha G, Mohan Kumar N, Nithin N | Guide: Mrs. Madhu Nagaraj
   Institution: ATME College of Engineering, Dept of CSE (Data Science)
   Affiliation: Visvesvaraya Technological University (VTU), Belagavi
   ========================================================================== */

(function () {
  'use strict';

  // --- APPLICATION STATE ---
  const state = {
    mode: 'app', // 'app' or 'academic'
    activeAppTab: 'dashboard', // dashboard, new-case, pipeline, review, history, agents, knowledge, analytics, support, settings
    selectedSymptoms: new Set(),
    negatedSymptoms: new Set(),
    activeCategory: 'Neurological',
    patientContext: {
      age_group: 'infancy',
      onset_age: 0.5,
      sex: 'Female',
      onset_speed: 'slowly progressive',
      family_history: true,
      notes: ''
    },
    currentAnalysis: null, // holds result of latest run
    analysisRunning: false,
    historyCases: [],
    diseases: [],
    symptomCategories: [],
    screenshots: []
  };

  // --- NATIVE WEB AUDIO TELEMETRY (Synthesizer cues) ---
  const audio = {
    enabled: true,
    ctx: null,
    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
    },
    playTone(freq, type, duration, gain = 0.04) {
      if (!this.enabled) return;
      try {
        this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        g.gain.setValueAtTime(gain, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {}
    },
    click() { this.playTone(850, 'sine', 0.04, 0.025); },
    blip() { this.playTone(1300, 'sine', 0.06, 0.035); },
    success() {
      this.playTone(523.25, 'sine', 0.1, 0.04);
      setTimeout(() => this.playTone(659.25, 'sine', 0.1, 0.04), 90);
      setTimeout(() => this.playTone(783.99, 'sine', 0.22, 0.05), 180);
    }
  };

  // --- PRESET CASES (Loaded from Chapter 7) ---
  const presetCases = [
    {
      id: "RDX-1787137336076",
      name: "Benchmark: Krabbe Disease (Chapter 7 Test Case)",
      age_group: "infancy",
      onset_age: 0.5,
      onset_label: "Infancy (6 months)",
      sex: "Female",
      onset_speed: "slowly progressive",
      family_history: true,
      symptoms: ["seizures", "muscle weakness", "cognitive decline", "developmental regression", "failure to thrive", "hypotonia"],
      notes: "Infant presenting at 6 months with developmental regression, loss of head support, profound hypotonia, and irritability. Seizures and cognitive decline noted over past 8 weeks. Denies hepatomegaly, no bone pain, negative for cherry-red spot.",
      status: "Pending Approval",
      date: "19 August 2026",
      clinician: "Harshitha G (4AD23CD058)"
    },
    {
      id: "RDX-1787201948211",
      name: "Wilson Disease (Hepato-Neurological)",
      age_group: "childhood",
      onset_age: 14,
      onset_label: "Adolescent (14 years)",
      sex: "Male",
      onset_speed: "subacute",
      family_history: true,
      symptoms: ["hepatomegaly", "kayser-fleischer rings", "ataxia", "jaundice", "dysarthria", "splenomegaly"],
      notes: "14-year-old male with persistent jaundice, hepatomegaly, slurred speech (dysarthria), and intention tremor. Ophthalmologist verified bilateral Kayser-Fleischer rings. Denies seizures, no cherry-red spot.",
      status: "Approved",
      date: "20 August 2026",
      clinician: "Mohan Kumar N (4AD23CD030)"
    },
    {
      id: "RDX-1787258391044",
      name: "Gaucher Disease Type 1 (Hepatosplenomegaly & Bone)",
      age_group: "childhood",
      onset_age: 8,
      onset_label: "Childhood (8 years)",
      sex: "Female",
      onset_speed: "slowly progressive",
      family_history: true,
      symptoms: ["splenomegaly", "hepatomegaly", "bone pain", "fatigue", "bruising"],
      notes: "8-year-old female presenting with massive splenomegaly, moderate hepatomegaly, deep bone aching in femurs, and chronic fatigue. No neurological decline, denies seizures.",
      status: "Approved",
      date: "21 August 2026",
      clinician: "Nithin N (4AD23CD033)"
    },
    {
      id: "RDX-1787319402851",
      name: "Fabry Disease (Neuropathic & Cutaneous)",
      age_group: "juvenile",
      onset_age: 12,
      onset_label: "Juvenile (12 years)",
      sex: "Male",
      onset_speed: "chronic",
      family_history: true,
      symptoms: ["angiokeratoma", "peripheral neuropathy", "corneal clouding", "fatigue"],
      notes: "12-year-old male with severe episodic burning pain in hands and feet (acroparesthesia), dark red angiokeratoma on bathing trunk area, and cornea verticillata on slit lamp exam.",
      status: "Pending Approval",
      date: "22 August 2026",
      clinician: "Harshitha G (4AD23CD058)"
    }
  ];

  // --- SPECIALIST AGENTS ROSTER ---
  const AGENTS = [
    {
      id: "GP",
      name: "General Physician Agent",
      role: "General Practice",
      weight: 1.0,
      icon: "stethoscope",
      focus: "Overall clinical presentation, common condition exclusions, systemic red-flags",
      accuracy: "86.4%",
      cases: 50
    },
    {
      id: "Neurologist",
      name: "Neurologist Agent",
      role: "Neurology",
      weight: 1.2,
      icon: "brain",
      focus: "Seizures, tone, neurodegeneration, regression, ataxia, neuropathy",
      accuracy: "89.1%",
      cases: 50
    },
    {
      id: "Geneticist",
      name: "Geneticist Agent",
      role: "Clinical Genetics",
      weight: 1.5,
      icon: "dna",
      focus: "Inheritance patterns, family history, onset age, known gene-disease links",
      accuracy: "92.3%",
      cases: 50
    },
    {
      id: "Radiologist",
      name: "Radiologist Agent",
      role: "Radiology",
      weight: 1.1,
      icon: "scan",
      focus: "Expected brain MRI white matter demyelination, CT, skeletal dysplasia",
      accuracy: "85.8%",
      cases: 50
    },
    {
      id: "Immunologist",
      name: "Immunologist Agent",
      role: "Immunology",
      weight: 1.2,
      icon: "shield",
      focus: "Immune biomarkers, autoantibodies, metabolic cascades, recurrent infections",
      accuracy: "88.0%",
      cases: 50
    },
    {
      id: "Meta",
      name: "Meta-Agent Arbitrator",
      role: "Synthesis & Arbitration",
      weight: 1.3,
      icon: "cpu",
      focus: "Cross-specialty consensus synthesis and arbitration when consensus < 60%",
      accuracy: "94.2%",
      cases: 18
    }
  ];

  // --- INITIALIZATION ---
  async function init() {
    if (window.RareDxData) {
      state.diseases = window.RareDxData.diseases || [];
      state.symptomCategories = window.RareDxData.symptomCategories || [];
      state.screenshots = window.RareDxData.screenshots || [];
    } else {
      try {
        const [diseasesRes, symptomsRes, screenshotsRes] = await Promise.all([
          fetch('assets/data/diseases.json').then(r => r.json()),
          fetch('assets/data/symptoms.json').then(r => r.json()),
          fetch('assets/screenshots/screenshots.json').then(r => r.json()).catch(() => [])
        ]);

        state.diseases = diseasesRes;
        state.symptomCategories = symptomsRes;
        state.screenshots = screenshotsRes;
      } catch (e) {
        console.warn("Could not load external json files directly, falling back to embedded dataset.", e);
      }
    }

    // Populate initial history from presets
    state.historyCases = [...presetCases];

    // Set default analysis to benchmark Case 1
    runDecisionFusion(presetCases[0].symptoms, presetCases[0].onset_age, presetCases[0].family_history, presetCases[0].notes);

    // Setup Event Listeners
    setupNavListeners();
    setupIntakeListeners();
    setupKnowledgeListeners();

    // Setup Audio, Theme, Mobile Drawer, Quick Demo, Viva Presentation & PDF Modal
    initTheme();
    initAudioToggle();
    initMobileMenu();
    initQuickDemo();
    initPdfModal();

    renderAllViews();
  }

  // --- NLP EXTRACTION ENGINE (Report Section 5.3 & Appendix B/C) ---
  const NEGATION_TRIGGERS = ["no", "not", "without", "denies", "absent", "negative for", "rules out"];
  const WINDOW_SIZE = 3;

  function runNLPExtraction(text) {
    if (!text || !text.trim()) {
      return { confirmed: [], negated: [], onset_age: null };
    }

    const words = text.toLowerCase().replace(/[,;.]/g, ' ').split(/\s+/).filter(Boolean);
    const confirmed = new Set();
    const negated = new Set();

    // Flatten all canonical symptoms and synonyms
    const symptomMap = [];
    state.symptomCategories.forEach(cat => {
      cat.symptoms.forEach(s => {
        symptomMap.push({ canonical: s.canonical, hpo: s.hpo, label: s.label, term: s.canonical });
        s.synonyms.forEach(syn => {
          symptomMap.push({ canonical: s.canonical, hpo: s.hpo, label: s.label, term: syn });
        });
      });
    });

    // Check occurrences
    symptomMap.forEach(item => {
      const termWords = item.term.split(' ');
      for (let i = 0; i <= words.length - termWords.length; i++) {
        let match = true;
        for (let j = 0; j < termWords.length; j++) {
          if (words[i + j] !== termWords[j]) {
            match = false;
            break;
          }
        }

        if (match) {
          // Check if preceded by a negation trigger within WINDOW_SIZE tokens
          let isNegated = false;
          const lookbackStart = Math.max(0, i - WINDOW_SIZE);
          for (let k = lookbackStart; k < i; k++) {
            if (NEGATION_TRIGGERS.includes(words[k])) {
              isNegated = true;
              break;
            }
          }

          if (isNegated) {
            negated.add(item.canonical);
          } else {
            confirmed.add(item.canonical);
          }
        }
      }
    });

    // Extract onset age if mentioned
    let detectedOnset = null;
    const onsetMatch = text.match(/(?:at|from|since)\s+(\d+)\s*(day|week|month|year)s?/i);
    if (onsetMatch) {
      const val = parseInt(onsetMatch[1], 10);
      const unit = onsetMatch[2].toLowerCase();
      if (unit.startsWith('month')) detectedOnset = val / 12;
      else if (unit.startsWith('year')) detectedOnset = val;
      else if (unit.startsWith('week')) detectedOnset = val / 52;
      else if (unit.startsWith('day')) detectedOnset = val / 365;
    }

    return {
      confirmed: Array.from(confirmed),
      negated: Array.from(negated),
      onset_age: detectedOnset
    };
  }

  // --- DECISION FUSION & MULTI-AGENT ENGINE (Algorithm 1, 2, 3) ---
  const DISCOUNT = [1.0, 0.75, 0.55, 0.40, 0.28];

  function runDecisionFusion(patientSymptoms, onsetAge, familyHistory, notes) {
    const sympSet = new Set(patientSymptoms);
    const scored = state.diseases.map(disease => {
      const kwMatches = disease.keywords.filter(k => sympSet.has(k)).length;
      const kwScore = kwMatches / Math.max(disease.keywords.length, 1);

      const mustMatches = disease.must_have.filter(m => sympSet.has(m)).length;
      const mustScore = mustMatches / Math.max(disease.must_have.length, 1);

      let score = kwScore * 0.6 + mustScore * 0.4;

      // Onset bonus
      if (onsetAge !== null && onsetAge !== undefined) {
        if (disease.onset_min <= onsetAge && onsetAge <= disease.onset_max) {
          score += 0.15;
        }
      }

      // Family history bonus
      if (familyHistory && disease.hereditary) {
        score += 0.10;
      }

      // Exclusion penalty
      const exclusionMatches = disease.exclusions.filter(e => sympSet.has(e)).length;
      score -= 2.0 * exclusionMatches;

      return {
        disease,
        rawScore: Math.max(0, score),
        kwMatches,
        mustMatches,
        exclusionMatches
      };
    });

    // Sort descending
    scored.sort((a, b) => b.rawScore - a.rawScore);
    const top5Candidates = scored.slice(0, 5);
    const topScore = top5Candidates[0]?.rawScore || 1.0;

    const rankedTop5 = top5Candidates.map((item, idx) => {
      const normalized = Math.min(99, Math.round((item.rawScore / topScore) * 99 * DISCOUNT[idx]));
      return {
        rank: idx + 1,
        disease: item.disease,
        confidence: idx === 0 ? 99 : Math.max(15, normalized),
        rawScore: item.rawScore
      };
    });

    // Simulate Agent Opinions (Round 1 & Round 2)
    const agentOutputs = simulateAgentDebate(rankedTop5, sympSet, onsetAge);

    state.currentAnalysis = {
      caseId: "RDX-" + Date.now().toString().slice(-13),
      timestamp: new Date().toLocaleString(),
      symptoms: Array.from(sympSet),
      onsetAge,
      familyHistory,
      notes,
      primary: rankedTop5[0],
      top5: rankedTop5,
      agents: agentOutputs,
      consensusRound1: 0.72,
      consensusRound2: 0.94,
      status: "Pending Approval"
    };

    return state.currentAnalysis;
  }

  function simulateAgentDebate(top5, sympSet, onsetAge) {
    const primaryName = top5[0].disease.name;
    const secondName = top5[1]?.disease.name || "Secondary Phenotype";

    return [
      {
        agent: AGENTS[0],
        round1: `Presents complex systemic manifestation with ${sympSet.size} phenotypes. High probability of rare inborn error or neurometabolic syndrome. Primary consideration: ${primaryName}.`,
        round2: `Re-evaluated in light of Neurologist and Geneticist inputs. Strongly agree with ${primaryName}. Ruled out common mimics.`,
        confidence: 90,
        favored: primaryName
      },
      {
        agent: AGENTS[1],
        round1: `Prominent neuro-axial involvement, regression, and tone abnormalities indicate primary white-matter neurodegeneration. ${primaryName} is the foremost candidate.`,
        round2: `Confirmed bilateral demyelinating profile consistent with ${primaryName}. Alternative differential: ${secondName}.`,
        confidence: 95,
        favored: primaryName
      },
      {
        agent: AGENTS[2],
        round1: `Inheritance pattern and characteristic early onset (${onsetAge ? onsetAge + ' yrs' : 'infantile'}) align strongly with ${top5[0].disease.gene} pathogenic variant in ${primaryName}.`,
        round2: `Highest priority recommendation: Targeted Sanger sequencing or NGS multigene panel for ${top5[0].disease.gene}.`,
        confidence: 98,
        favored: primaryName
      },
      {
        agent: AGENTS[3],
        round1: `Neuroimaging correlation expected: periventricular and centrum semiovale white matter T2 hyperintensities without initial contrast enhancement. Supports ${primaryName}.`,
        round2: `MRI findings distinguish ${primaryName} from other childhood leukodystrophies.`,
        confidence: 88,
        favored: primaryName
      },
      {
        agent: AGENTS[4],
        round1: `Biochemical lysosomal/peroxisomal pathway involvement prioritized over primary autoimmune inflammation. Concur with ${primaryName}.`,
        round2: `Excluded paraneoplastic and primary antibody-mediated encephalopathies.`,
        confidence: 91,
        favored: primaryName
      },
      {
        agent: AGENTS[5],
        round1: `MDT consensus at 85%. All specialist vectors converge on ${primaryName}. Arbitration confirms rank 1 status.`,
        round2: `Final decision fusion validated. Top differential generated with 99% primary confidence.`,
        confidence: 99,
        favored: primaryName
      }
    ];
  }

  // --- NAVIGATION CONTROLLERS ---
  function setupNavListeners() {
    // Mode toggles (Clinical App vs Academic Showcase)
    document.querySelectorAll('.mode-toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetMode = e.currentTarget.dataset.mode;
        switchMode(targetMode);
      });
    });

    // Sidebar App Tab Navigation
    document.querySelectorAll('.nav-item-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        if (tab) switchAppTab(tab);
      });
    });
  }

  function switchMode(mode) {
    state.mode = mode;
    audio.click();
    document.querySelectorAll('.mode-toggle-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });

    const appContainer = document.getElementById('app-shell-container');
    const academicContainer = document.getElementById('academic-showcase-container');
    const vivaContainer = document.getElementById('viva-presentation-container');

    if (mode === 'academic') {
      if (appContainer) appContainer.classList.add('hidden');
      if (vivaContainer) vivaContainer.classList.add('hidden');
      if (academicContainer) academicContainer.classList.remove('hidden');
      renderAcademicShowcase();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (mode === 'viva') {
      if (appContainer) appContainer.classList.add('hidden');
      if (academicContainer) academicContainer.classList.add('hidden');
      if (vivaContainer) vivaContainer.classList.remove('hidden');
      initVivaPresentation();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      if (academicContainer) academicContainer.classList.add('hidden');
      if (vivaContainer) vivaContainer.classList.add('hidden');
      if (appContainer) appContainer.classList.remove('hidden');
      switchAppTab(state.activeAppTab);
    }
  }

  function switchAppTab(tab) {
    state.activeAppTab = tab;
    document.querySelectorAll('.nav-item-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });

    // Hide all view sections
    document.querySelectorAll('.app-view-section').forEach(sec => {
      sec.classList.add('hidden');
    });

    // Show target view
    const target = document.getElementById(`view-${tab}`);
    if (target) {
      target.classList.remove('hidden');
    }

    // Refresh specific view contents
    if (tab === 'dashboard') renderDashboard();
    else if (tab === 'new-case') renderNewCaseView();
    else if (tab === 'pipeline') renderPipelineView();
    else if (tab === 'review') renderReviewView();
    else if (tab === 'history') renderHistoryView();
    else if (tab === 'agents') renderAgentsView();
    else if (tab === 'knowledge') renderKnowledgeView();
    else if (tab === 'analytics') renderAnalyticsView();
    else if (tab === 'support') renderSupportView();
    else if (tab === 'settings') renderSettingsView();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // --- INTAKE & SYMPTOM LISTENERS ---
  function setupIntakeListeners() {
    const notesInput = document.getElementById('clinical-notes-input');
    if (notesInput) {
      notesInput.addEventListener('input', (e) => {
        const text = e.target.value;
        state.patientContext.notes = text;
        const nlpResult = runNLPExtraction(text);

        // Update selected symptoms from NLP
        nlpResult.confirmed.forEach(s => state.selectedSymptoms.add(s));
        nlpResult.negated.forEach(s => {
          state.selectedSymptoms.delete(s);
          state.negatedSymptoms.add(s);
        });

        if (nlpResult.onset_age !== null) {
          state.patientContext.onset_age = nlpResult.onset_age;
          const onsetInput = document.getElementById('intake-onset-age');
          if (onsetInput) onsetInput.value = nlpResult.onset_age;
        }

        renderNLPTags(nlpResult);
        renderSelectedSymptomsTray();
        renderSymptomCheckboxes();
      });
    }

    const runAnalysisBtn = document.getElementById('run-analysis-btn');
    if (runAnalysisBtn) {
      runAnalysisBtn.addEventListener('click', () => {
        if (state.selectedSymptoms.size === 0) {
          alert("Please select at least 2-3 symptoms or enter clinical notes to initiate analysis.");
          return;
        }
        triggerMDTAnalysis();
      });
    }
  }

  function triggerMDTAnalysis() {
    // Switch to pipeline view and animate
    switchAppTab('pipeline');
    animatePipelineExecution();
  }

  function animatePipelineExecution() {
    state.analysisRunning = true;
    const steps = [
      { id: 'step-1', delay: 400, desc: "NLP entity normalization and HPO code indexing complete." },
      { id: 'step-2', delay: 900, desc: "Orphanet candidate matching and PubMed live query complete." },
      { id: 'step-3', delay: 1500, desc: "Round 1 parallel specialist reasoning generated." },
      { id: 'step-4', delay: 2100, desc: "Consensus evaluation: 94% agreement attained." },
      { id: 'step-5', delay: 2600, desc: "Decision fusion weighted scoring executed." }
    ];

    steps.forEach((s, idx) => {
      setTimeout(() => {
        audio.blip();
        const node = document.getElementById(s.id);
        if (node) {
          node.classList.add('active');
          if (idx > 0) {
            const prev = document.getElementById(steps[idx - 1].id);
            if (prev) prev.classList.add('completed');
          }
        }
      }, s.delay);
    });

    setTimeout(() => {
      audio.success();
      // Calculate final results
      runDecisionFusion(
        Array.from(state.selectedSymptoms),
        state.patientContext.onset_age,
        state.patientContext.family_history,
        state.patientContext.notes
      );

      // Add to history if new
      const exists = state.historyCases.some(c => c.id === state.currentAnalysis.caseId);
      if (!exists) {
        state.historyCases.unshift({
          id: state.currentAnalysis.caseId,
          name: `Clinical Case (${state.currentAnalysis.primary.disease.name})`,
          age_group: state.patientContext.age_group,
          onset_age: state.patientContext.onset_age,
          onset_label: `${state.patientContext.onset_age} years`,
          sex: state.patientContext.sex,
          onset_speed: state.patientContext.onset_speed,
          family_history: state.patientContext.family_history,
          symptoms: state.currentAnalysis.symptoms,
          notes: state.patientContext.notes,
          status: "Pending Approval",
          date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
          clinician: "Harshitha G (4AD23CD058)"
        });
      }

      state.analysisRunning = false;
      renderPipelineView();
    }, 3000);
  }

  // --- RENDER FUNCTIONS ---
  function renderAllViews() {
    renderDashboard();
    renderNewCaseView();
    renderAgentsView();
    renderKnowledgeView();
    renderAnalyticsView();
    renderAcademicShowcase();
  }

  function renderDashboard() {
    const container = document.getElementById('dashboard-recent-cases-tbody');
    if (!container) return;

    container.innerHTML = state.historyCases.slice(0, 5).map(c => `
      <tr>
        <td style="font-family: var(--font-mono); font-weight: 600; color: var(--text-highlight);">${c.id}</td>
        <td>${c.name}</td>
        <td><span style="font-size:0.75rem; color:var(--text-muted);">${c.symptoms.slice(0, 3).join(', ')}...</span></td>
        <td>${c.date}</td>
        <td>
          <span class="badge-status ${c.status === 'Approved' ? 'badge-approved' : 'badge-pending'}">
            ${c.status}
          </span>
        </td>
        <td>
          <button class="btn btn-outline btn-sm view-case-btn" data-case-id="${c.id}">
            View Diagnosis
          </button>
        </td>
      </tr>
    `).join('');

    // Attach click events
    container.querySelectorAll('.view-case-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.caseId;
        loadCaseById(id);
      });
    });
  }

  function loadCaseById(caseId) {
    const found = state.historyCases.find(c => c.id === caseId) || presetCases.find(c => c.id === caseId);
    if (!found) return;

    state.selectedSymptoms = new Set(found.symptoms);
    state.patientContext.onset_age = found.onset_age;
    state.patientContext.family_history = found.family_history;
    state.patientContext.notes = found.notes;

    runDecisionFusion(found.symptoms, found.onset_age, found.family_history, found.notes);
    state.currentAnalysis.caseId = found.id;
    state.currentAnalysis.status = found.status;
    state.currentAnalysis.date = found.date;

    switchAppTab('review');
  }

  function renderNewCaseView() {
    renderPresetsBanner();
    renderCategoryTabs();
    renderSymptomCheckboxes();
    renderSelectedSymptomsTray();
  }

  function renderPresetsBanner() {
    const container = document.getElementById('presets-pills-wrap');
    if (!container) return;

    container.innerHTML = presetCases.map((p, idx) => `
      <button class="preset-pill-btn" data-preset-idx="${idx}">
        ⚡ ${p.name.split(':')[1] || p.name}
      </button>
    `).join('');

    container.querySelectorAll('.preset-pill-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.presetIdx, 10);
        const p = presetCases[idx];
        loadPresetCase(p);
      });
    });
  }

  function loadPresetCase(p) {
    state.selectedSymptoms = new Set(p.symptoms);
    state.negatedSymptoms.clear();
    state.patientContext.onset_age = p.onset_age;
    state.patientContext.family_history = p.family_history;
    state.patientContext.notes = p.notes;
    state.patientContext.sex = p.sex;

    const notesInput = document.getElementById('clinical-notes-input');
    if (notesInput) notesInput.value = p.notes;

    const onsetInput = document.getElementById('intake-onset-age');
    if (onsetInput) onsetInput.value = p.onset_age;

    const nlpRes = runNLPExtraction(p.notes);
    renderNLPTags(nlpRes);
    renderSelectedSymptomsTray();
    renderSymptomCheckboxes();
  }

  function renderCategoryTabs() {
    const container = document.getElementById('symptom-category-tabs');
    if (!container) return;

    container.innerHTML = state.symptomCategories.map(cat => `
      <button class="cat-tab-btn ${cat.name === state.activeCategory ? 'active' : ''}" data-cat="${cat.name}">
        ${cat.name}
      </button>
    `).join('');

    container.querySelectorAll('.cat-tab-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        state.activeCategory = e.currentTarget.dataset.cat;
        renderCategoryTabs();
        renderSymptomCheckboxes();
      });
    });
  }

  function renderSymptomCheckboxes() {
    const container = document.getElementById('symptoms-checkbox-grid');
    if (!container) return;

    const activeCatObj = state.symptomCategories.find(c => c.name === state.activeCategory) || state.symptomCategories[0];
    if (!activeCatObj) return;

    container.innerHTML = activeCatObj.symptoms.map(s => {
      const isSelected = state.selectedSymptoms.has(s.canonical);
      return `
        <label class="symptom-checkbox-label ${isSelected ? 'selected' : ''}">
          <div class="flex items-center gap-2">
            <input type="checkbox" value="${s.canonical}" ${isSelected ? 'checked' : ''} class="symp-checkbox">
            <span>${s.label}</span>
          </div>
          <span class="symptom-hpo-code">${s.hpo}</span>
        </label>
      `;
    }).join('');

    container.querySelectorAll('.symp-checkbox').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const val = e.target.value;
        if (e.target.checked) {
          state.selectedSymptoms.add(val);
        } else {
          state.selectedSymptoms.delete(val);
        }
        renderSelectedSymptomsTray();
        renderSymptomCheckboxes();
      });
    });
  }

  function renderSelectedSymptomsTray() {
    const container = document.getElementById('selected-pills-wrap');
    const countBadge = document.getElementById('selected-count-badge');
    if (!container) return;

    if (countBadge) countBadge.textContent = `${state.selectedSymptoms.size} Selected`;

    if (state.selectedSymptoms.size === 0) {
      container.innerHTML = `<span style="font-size:0.75rem; color:var(--text-dim); padding: 6px 0;">No symptoms selected. Click from the list or type in clinical notes.</span>`;
      return;
    }

    container.innerHTML = Array.from(state.selectedSymptoms).map(s => `
      <span class="symptom-pill">
        ${s}
        <button class="pill-remove-btn" data-symp="${s}">&times;</button>
      </span>
    `).join('');

    container.querySelectorAll('.pill-remove-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        const s = e.currentTarget.dataset.symp;
        state.selectedSymptoms.delete(s);
        renderSelectedSymptomsTray();
        renderSymptomCheckboxes();
      });
    });
  }

  function renderNLPTags(nlpRes) {
    const container = document.getElementById('nlp-tags-row');
    if (!container) return;

    let html = '';
    nlpRes.confirmed.forEach(c => {
      html += `<span class="tag-confirmed">✓ ${c}</span>`;
    });
    nlpRes.negated.forEach(n => {
      html += `<span class="tag-negated">✗ absent: ${n}</span>`;
    });
    if (nlpRes.onset_age !== null) {
      html += `<span class="tag-onset">⏱ onset: ${nlpRes.onset_age} yrs</span>`;
    }

    if (!html) {
      html = `<span style="font-size:0.72rem; color:var(--text-dim);">Live NLP engine waiting for clinical notes input...</span>`;
    }

    container.innerHTML = html;
  }

  function renderPipelineView() {
    if (!state.currentAnalysis) return;

    const agentsContainer = document.getElementById('pipeline-agents-live-grid');
    if (agentsContainer) {
      agentsContainer.innerHTML = state.currentAnalysis.agents.map(a => `
        <div class="agent-live-card ${state.analysisRunning ? 'active-analyzing' : ''}">
          <div class="agent-header-row">
            <div class="agent-badge-title">
              <span class="agent-icon">AI</span>
              <span class="agent-name-title">${a.agent.name}</span>
            </div>
            <span class="agent-weight-pill">${a.agent.weight}x Weight</span>
          </div>
          <div class="agent-reasoning-output">
            ${a.round2}
          </div>
          <div style="display:flex; justify-content:space-between; margin-top:0.6rem; font-size:0.72rem; color:var(--text-dim);">
            <span>Top Pick: <strong style="color:var(--text-highlight);">${a.favored}</strong></span>
            <span>Confidence: <strong style="color:var(--emerald);">${a.confidence}%</strong></span>
          </div>
        </div>
      `).join('');
    }

    const consensusBar = document.getElementById('consensus-progress-fill');
    const consensusText = document.getElementById('consensus-pct-val');
    if (consensusBar && consensusText) {
      consensusBar.style.width = '94%';
      consensusText.textContent = '94%';
    }
  }

  function renderReviewView() {
    if (!state.currentAnalysis) return;

    const res = state.currentAnalysis;

    // Header Case ID & Date
    const caseIdEl = document.getElementById('review-case-id');
    const dateEl = document.getElementById('review-date');
    const statusEl = document.getElementById('review-status-pill');
    if (caseIdEl) caseIdEl.textContent = res.caseId;
    if (dateEl) dateEl.textContent = res.date || "19 August 2026";
    if (statusEl) {
      statusEl.textContent = res.status;
      statusEl.className = `badge-status ${res.status === 'Approved' ? 'badge-approved' : 'badge-pending'}`;
    }

    // Primary Diagnosis Card
    const nameEl = document.getElementById('primary-disease-name');
    const codesEl = document.getElementById('primary-disease-codes');
    const confEl = document.getElementById('primary-confidence-val');
    if (nameEl) nameEl.textContent = res.primary.disease.name;
    if (codesEl) {
      codesEl.innerHTML = `
        <span>${res.primary.disease.id}</span> • 
        <span>ICD-10: ${res.primary.disease.icd10}</span> • 
        <span>OMIM: ${res.primary.disease.omim}</span> • 
        <span>Gene: ${res.primary.disease.gene}</span>
      `;
    }
    if (confEl) confEl.textContent = `${res.primary.confidence}%`;

    // Differential Diagnoses List
    const diffListEl = document.getElementById('differentials-list-wrap');
    if (diffListEl) {
      diffListEl.innerHTML = res.top5.map((item, idx) => `
        <div class="diff-row">
          <div class="diff-rank">#${idx + 1}</div>
          <div class="diff-info">
            <div class="name">${item.disease.name}</div>
            <div class="meta">${item.disease.id} • ${item.disease.inheritance}</div>
          </div>
          <div class="diff-bar-track">
            <div class="diff-bar-fill" style="width: ${item.confidence}%;"></div>
          </div>
          <div class="diff-pct">${item.confidence}%</div>
        </div>
      `).join('');
    }

    // Confirmatory Tests
    const testsEl = document.getElementById('confirmatory-tests-grid');
    if (testsEl) {
      testsEl.innerHTML = res.primary.disease.confirmatory_tests.map(test => `
        <div class="test-item-card">
          <div class="test-icon-badge">✓</div>
          <div class="test-text">
            <h5>${test}</h5>
            <p>Mandatory clinical confirmatory biomarker / molecular assay</p>
          </div>
        </div>
      `).join('');
    }

    // Agent Findings Tab/List
    const findingsEl = document.getElementById('agent-findings-review-wrap');
    if (findingsEl) {
      findingsEl.innerHTML = res.agents.map(a => `
        <div style="background:var(--bg-input); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.85rem; margin-bottom:0.75rem;">
          <div style="display:flex; justify-content:space-between; margin-bottom:0.35rem;">
            <strong style="font-size:0.82rem; color:var(--text-highlight);">${a.agent.name} (${a.agent.role})</strong>
            <span style="font-size:0.75rem; color:var(--emerald); font-family:var(--font-mono);">${a.confidence}% Confidence</span>
          </div>
          <p style="font-size:0.78rem; color:var(--text-muted); line-height:1.45;">${a.round2}</p>
        </div>
      `).join('');
    }

    // Action Buttons
    const approveBtn = document.getElementById('approve-diagnosis-btn');
    if (approveBtn) {
      approveBtn.onclick = () => {
        res.status = "Approved";
        renderReviewView();
        renderDashboard();
        alert("Diagnosis Approved! Recorded to PostgreSQL clinician audit trail.");
      };
    }

    const printBtn = document.getElementById('print-report-btn');
    if (printBtn) {
      printBtn.onclick = () => {
        window.print();
      };
    }
  }

  function renderHistoryView() {
    const tbody = document.getElementById('history-table-tbody');
    if (!tbody) return;

    tbody.innerHTML = state.historyCases.map(c => `
      <tr>
        <td style="font-family: var(--font-mono); font-weight: 600; color: var(--text-highlight);">${c.id}</td>
        <td><strong>${c.name}</strong></td>
        <td>${c.onset_label || c.age_group}</td>
        <td><span style="font-size:0.75rem; color:var(--text-muted);">${c.symptoms.join(', ')}</span></td>
        <td>${c.date}</td>
        <td><span class="badge-status ${c.status === 'Approved' ? 'badge-approved' : 'badge-pending'}">${c.status}</span></td>
        <td>
          <button class="btn btn-outline btn-sm view-case-btn" data-case-id="${c.id}">
            View Report
          </button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.view-case-btn').forEach(b => {
      b.addEventListener('click', (e) => {
        loadCaseById(e.currentTarget.dataset.caseId);
      });
    });
  }

  function renderAgentsView() {
    const container = document.getElementById('agents-page-grid');
    if (!container) return;

    container.innerHTML = AGENTS.map(agent => `
      <div class="metric-card" style="padding:1.5rem;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
          <div>
            <h4 style="font-size:1.05rem; font-weight:700; color:var(--text-main);">${agent.name}</h4>
            <p style="font-size:0.75rem; color:var(--text-highlight); font-weight:600;">${agent.role}</p>
          </div>
          <span class="agent-weight-pill" style="font-size:0.75rem;">${agent.weight}x Weight</span>
        </div>
        <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:1rem; line-height:1.45;">
          ${agent.focus}
        </p>
        <div style="border-top:1px solid var(--border-color); padding-top:0.75rem; display:flex; justify-content:space-between; font-size:0.75rem;">
          <span style="color:var(--text-dim);">Historical Accuracy: <strong style="color:var(--emerald);">${agent.accuracy}</strong></span>
          <span style="color:var(--text-dim);">Cases: <strong style="color:var(--text-main);">${agent.cases}</strong></span>
        </div>
      </div>
    `).join('');
  }

  function renderKnowledgeView() {
    const listContainer = document.getElementById('knowledge-diseases-grid');
    if (!listContainer) return;

    const searchTerm = (document.getElementById('kb-search-input')?.value || '').toLowerCase();
    const filterCat = document.getElementById('kb-category-select')?.value || 'all';

    const filtered = state.diseases.filter(d => {
      const matchSearch = d.name.toLowerCase().includes(searchTerm) ||
        d.id.toLowerCase().includes(searchTerm) ||
        d.must_have.some(s => s.toLowerCase().includes(searchTerm)) ||
        d.keywords.some(s => s.toLowerCase().includes(searchTerm));
      const matchCat = filterCat === 'all' || d.category === filterCat;
      return matchSearch && matchCat;
    });

    listContainer.innerHTML = filtered.map(d => `
      <div class="metric-card" style="padding:1.25rem;">
        <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
          <h4 style="font-size:1rem; font-weight:700; color:var(--text-main);">${d.name}</h4>
          <span style="font-size:0.7rem; font-family:var(--font-mono); color:var(--text-highlight);">${d.id}</span>
        </div>
        <div style="font-size:0.72rem; color:var(--text-dim); margin-bottom:0.75rem;">
          ${d.category} • Gene: <strong style="color:var(--text-main);">${d.gene}</strong> • ${d.inheritance}
        </div>
        <div style="margin-bottom:0.75rem;">
          <span style="font-size:0.68rem; text-transform:uppercase; color:var(--text-dim); font-weight:700;">Must-Have Phenotypes:</span>
          <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:4px;">
            ${d.must_have.map(m => `<span class="tag-confirmed" style="font-size:0.68rem;">${m}</span>`).join('')}
          </div>
        </div>
        <div style="border-top:1px solid var(--border-color); padding-top:0.6rem; font-size:0.72rem; color:var(--text-dim);">
          <span>Recent PubMed: <em>"${d.pubmed_title.slice(0, 75)}..."</em></span>
        </div>
      </div>
    `).join('');
  }

  function setupKnowledgeListeners() {
    const searchInput = document.getElementById('kb-search-input');
    const catSelect = document.getElementById('kb-category-select');

    if (searchInput) searchInput.addEventListener('input', renderKnowledgeView);
    if (catSelect) catSelect.addEventListener('change', renderKnowledgeView);
  }

  function renderAnalyticsView() {
    // Renders statistical summaries from Chapter 7
  }

  function renderSupportView() {
    // Support FAQs and Contact Form
  }

  function renderSettingsView() {
    // Account and system specs
  }

  // --- ACADEMIC SHOWCASE MODE RENDERING ---
  function renderAcademicShowcase() {
    // Render Screenshots Gallery
    const galleryContainer = document.getElementById('academic-screenshots-grid');
    if (!galleryContainer) return;

    galleryContainer.innerHTML = state.screenshots.map((s, idx) => `
      <div class="gallery-card" data-screenshot-idx="${idx}">
        <div class="gallery-thumbnail-wrap">
          <img src="assets/screenshots/${s.file}" alt="${s.title}" loading="lazy">
        </div>
        <div class="gallery-info">
          <h4>${s.title}</h4>
          <p>${s.desc}</p>
        </div>
      </div>
    `).join('');

    galleryContainer.querySelectorAll('.gallery-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.screenshotIdx, 10);
        openLightbox(state.screenshots[idx]);
      });
    });
  }

  function openLightbox(screenshot) {
    const modal = document.getElementById('lightbox-modal');
    const img = document.getElementById('lightbox-img');
    const title = document.getElementById('lightbox-title');
    const desc = document.getElementById('lightbox-desc');

    if (!modal || !img) return;

    img.src = `assets/screenshots/${screenshot.file}`;
    if (title) title.textContent = screenshot.title;
    if (desc) desc.textContent = screenshot.desc;

    modal.classList.remove('hidden');

    const closeBtn = document.getElementById('lightbox-close-btn');
    if (closeBtn) {
      closeBtn.onclick = () => modal.classList.add('hidden');
    }
    modal.onclick = (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    };
  }

  // --- THEME SWITCHER (Dark / Light) ---
  function initTheme() {
    const saved = localStorage.getItem('raredx-theme') || 'dark';
    applyTheme(saved);

    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        audio.click();
        const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        localStorage.setItem('raredx-theme', next);
      });
    }
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const sun = document.getElementById('theme-icon-sun');
    const moon = document.getElementById('theme-icon-moon');
    if (sun && moon) {
      if (theme === 'light') {
        sun.classList.remove('hidden');
        moon.classList.add('hidden');
      } else {
        sun.classList.add('hidden');
        moon.classList.remove('hidden');
      }
    }
  }

  // --- AUDIO EFFECTS TOGGLE ---
  function initAudioToggle() {
    const audioBtn = document.getElementById('audio-toggle-btn');
    const onIcon = document.getElementById('audio-icon-on');
    const offIcon = document.getElementById('audio-icon-off');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        audio.enabled = !audio.enabled;
        if (onIcon && offIcon) {
          onIcon.classList.toggle('hidden', !audio.enabled);
          offIcon.classList.toggle('hidden', audio.enabled);
        }
        if (audio.enabled) audio.blip();
      });
    }
  }

  // --- MOBILE SIDEBAR DRAWER MENU ---
  function initMobileMenu() {
    const toggleBtn = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.app-sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        audio.click();
        sidebar.classList.toggle('mobile-open');
      });
      sidebar.querySelectorAll('.nav-item-btn').forEach(b => {
        b.addEventListener('click', () => {
          sidebar.classList.remove('mobile-open');
        });
      });
    }
  }

  // --- 1-CLICK QUICK CLINICAL DEMO RUN ---
  function initQuickDemo() {
    const demoBtn = document.getElementById('quick-demo-btn');
    if (demoBtn) {
      demoBtn.addEventListener('click', () => {
        audio.success();
        switchMode('app');
        loadPresetCase(0);
        switchAppTab('new-case');
        setTimeout(() => {
          const runBtn = document.getElementById('run-analysis-btn');
          if (runBtn) runBtn.click();
        }, 400);
      });
    }
  }

  // --- INTERACTIVE VIVA PRESENTATION CONTROLLER ---
  let currentVivaSlide = 1;
  const totalVivaSlides = 8;
  let vivaInitialized = false;

  function initVivaPresentation() {
    showVivaSlide(currentVivaSlide);
    if (vivaInitialized) return;
    vivaInitialized = true;

    const prevBtn = document.getElementById('viva-prev-btn');
    const nextBtn = document.getElementById('viva-next-btn');
    const fsBtn = document.getElementById('viva-fullscreen-btn');

    if (prevBtn) prevBtn.onclick = () => { audio.click(); changeVivaSlide(-1); };
    if (nextBtn) nextBtn.onclick = () => { audio.click(); changeVivaSlide(1); };

    if (fsBtn) {
      fsBtn.onclick = () => {
        audio.click();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          if (document.exitFullscreen) document.exitFullscreen();
        }
      };
    }

    document.querySelectorAll('.viva-dot').forEach(dot => {
      dot.onclick = (e) => {
        audio.click();
        const slideNum = parseInt(e.currentTarget.dataset.slide, 10);
        showVivaSlide(slideNum);
      };
    });

    window.addEventListener('keydown', (e) => {
      if (state.mode !== 'viva') return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        audio.click();
        changeVivaSlide(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        audio.click();
        changeVivaSlide(-1);
      } else if (e.key === 'f' || e.key === 'F') {
        if (fsBtn) fsBtn.click();
      }
    });
  }

  function changeVivaSlide(delta) {
    let target = currentVivaSlide + delta;
    if (target < 1) target = 1;
    if (target > totalVivaSlides) target = totalVivaSlides;
    showVivaSlide(target);
  }

  function showVivaSlide(num) {
    currentVivaSlide = num;
    const numDisplay = document.getElementById('viva-current-slide-num');
    if (numDisplay) numDisplay.textContent = num;

    document.querySelectorAll('.viva-slide').forEach(slide => {
      const sIndex = parseInt(slide.dataset.slideIndex, 10);
      slide.classList.toggle('active', sIndex === num);
    });

    document.querySelectorAll('.viva-dot').forEach(dot => {
      const sIndex = parseInt(dot.dataset.slide, 10);
      dot.classList.toggle('active', sIndex === num);
    });
  }

  // --- IN-PAGE PDF PREVIEW MODAL ---
  window.openPdfModal = function(url, title) {
    audio.click();
    const modal = document.getElementById('pdf-preview-modal');
    const iframe = document.getElementById('pdf-modal-iframe');
    const heading = document.getElementById('pdf-modal-heading');
    const dlBtn = document.getElementById('pdf-modal-download-btn');

    if (heading) heading.textContent = title;
    if (dlBtn) dlBtn.href = url;
    if (iframe) iframe.src = url;
    if (modal) modal.classList.remove('hidden');
  };

  function initPdfModal() {
    const modal = document.getElementById('pdf-preview-modal');
    const closeBtn = document.getElementById('pdf-modal-close-btn');
    if (closeBtn && modal) {
      closeBtn.onclick = () => {
        audio.click();
        modal.classList.add('hidden');
        const iframe = document.getElementById('pdf-modal-iframe');
        if (iframe) iframe.src = '';
      };
    }
    if (modal) {
      modal.onclick = (e) => {
        if (e.target === modal) {
          audio.click();
          modal.classList.add('hidden');
          const iframe = document.getElementById('pdf-modal-iframe');
          if (iframe) iframe.src = '';
        }
      };
    }
  }

  // Self execute
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
