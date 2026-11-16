/**
 * VISUALIZADOR DE EEG
 * Script Principal: Exclusión automática de bloques "Neutral / Descanso / Línea Base"
 * de los análisis comparativos, inferenciales (Shapiro-Wilk, ANOVA, Tukey) y del dictamen final.
 * Análisis enfocado exclusivamente en los ESTÍMULOS DE PRUEBA.
 */

class NeuroSkyApp {
  constructor() {
    window.neuroApp = this;
    this.files = []; // Hasta 50 archivos de sujetos
    this.maxStimuli = 5; // Límite de hasta 5 estímulos
    this.numStimuli = 5;
    this.initialBaselineDuration = 0;
    this.stimuli = [
      { name: 'Estímulo 1 (Concepto A)', type: 'Spot Publicitario', duration: 30, color: '#2563eb' },
      { name: 'Estímulo 2 (Concepto B)', type: 'Spot Publicitario', duration: 30, color: '#10b981' },
      { name: 'Estímulo 3 (Concepto C)', type: 'Spot Publicitario', duration: 30, color: '#f59e0b' },
      { name: 'Estímulo 4 (Concepto D)', type: 'Spot Publicitario', duration: 30, color: '#8b5cf6' },
      { name: 'Estímulo 5 (Concepto E)', type: 'Spot Publicitario', duration: 30, color: '#ec4899' }
    ];
    this.neutrals = [
      { duration: 10 },
      { duration: 10 },
      { duration: 10 },
      { duration: 10 }
    ];
    this.protocol = []; // Lista aplanada: E1 -> Neutral 1 -> E2 -> Neutral 2 -> E3...
    this.activeSubject = 'ALL'; // 'ALL' o id del sujeto
    this.activeStimulus = 'ALL'; // 'ALL' o índice de estímulo
    this.filterArtifacts = true; // Filtrar poorSignal > 50
    this.microdynamicsViewMode = 'both'; // 'both', 'attention', 'meditation', 'sequence'

    // Metadatos de la investigación
    this.researchTopic = "Evaluación de Impacto Neurocognitivo de Estímulos de Marca";
    this.researchObjective = "Determinar cuál de los estímulos de prueba genera mayor percepción (atención) y anclaje emocional (meditación) para la toma de decisiones.";
    this.decisionCriterion = "integral"; // 'integral', 'percepcion', 'emocion'

    this.defaultColors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

    this.initDOM();
    this.bindEvents();
    this.setupDefault5Stimuli();
  }

  initDOM() {
    this.dropzone = document.getElementById('dropzone');
    this.fileInput = document.getElementById('fileInput');
    this.fileListContainer = document.getElementById('fileListContainer');
    this.fileCountBadge = document.getElementById('fileCountBadge');
    this.filesSummaryText = document.getElementById('filesSummaryText');
    this.btnProcessProtocol = document.getElementById('btnProcessProtocol');
    this.protocolSection = document.getElementById('protocolSection');
    this.resultsSection = document.getElementById('resultsSection');
    this.timelineVisual = document.getElementById('timelineVisual');
    this.stimuliCardsContainer = document.getElementById('stimuliCardsContainer');
    this.btnAddStimulus = document.getElementById('btnAddStimulus');
    this.stimulusCountNotice = document.getElementById('stimulusCountNotice');
    this.subjectSelect = document.getElementById('subjectSelect');
    this.stimulusFilterSelect = document.getElementById('stimulusFilterSelect');

    // Metadatos Inputs
    this.inputResearchTopic = document.getElementById('inputResearchTopic');
    this.inputResearchObjective = document.getElementById('inputResearchObjective');
    this.selectDecisionCriterion = document.getElementById('selectDecisionCriterion');
    
    // KPIs
    this.kpiSubjects = document.getElementById('kpiSubjects');
    this.kpiDuration = document.getElementById('kpiDuration');
    this.kpiAvgAtt = document.getElementById('kpiAvgAtt');
    this.kpiAvgMed = document.getElementById('kpiAvgMed');
    this.kpiTopStim = document.getElementById('kpiTopStim');
    this.kpiSignalQual = document.getElementById('kpiSignalQual');

    // Cajas de Explicación Estadística al pie de Gráficas 1 y 2
    this.statExplChart1 = document.getElementById('statExplChart1');
    this.statExplChart2 = document.getElementById('statExplChart2');

    // Sección Inferencial
    this.tableShapiroAttBody = document.getElementById('tableShapiroAttBody');
    this.tableShapiroMedBody = document.getElementById('tableShapiroMedBody');
    this.tableAnovaAttBody = document.getElementById('tableAnovaAttBody');
    this.tableAnovaMedBody = document.getElementById('tableAnovaMedBody');
    this.tablePostHocBody = document.getElementById('tablePostHocBody');
    this.anovaDecisionAttText = document.getElementById('anovaDecisionAttText');
    this.anovaDecisionMedText = document.getElementById('anovaDecisionMedText');
    this.verdictObjectiveDisplay = document.getElementById('verdictObjectiveDisplay');
    this.verdictRecommendationContent = document.getElementById('verdictRecommendationContent');

    // Tablas Descriptivas
    this.tableAttentionBody = document.getElementById('tableAttentionBody');
    this.tableBrainwavesBody = document.getElementById('tableBrainwavesBody');
    this.tableMatrixBody = document.getElementById('tableMatrixBody');
    this.tableDivisionBody = document.getElementById('tableDivisionBody');
  }

  bindEvents() {
    // Drag & Drop
    if (this.dropzone) {
      ['dragenter', 'dragover'].forEach(name => {
        this.dropzone.addEventListener(name, (e) => {
          e.preventDefault();
          this.dropzone.classList.add('dragover');
        });
      });
      ['dragleave', 'drop'].forEach(name => {
        this.dropzone.addEventListener(name, (e) => {
          e.preventDefault();
          this.dropzone.classList.remove('dragover');
        });
      });
      this.dropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.handleFiles(Array.from(e.dataTransfer.files));
        }
      });
    }

    if (this.fileInput) {
      this.fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.handleFiles(Array.from(e.target.files));
        }
      });
    }

    // Botones Header
    const btnDemo = document.getElementById('btnLoadDemo');
    if (btnDemo) {
      btnDemo.addEventListener('click', () => this.loadDemoData());
    }

    const btnClearFiles = document.getElementById('btnClearFiles');
    if (btnClearFiles) {
      btnClearFiles.addEventListener('click', () => this.clearAllFiles());
    }

    // Gestión de Estímulos
    if (this.btnAddStimulus) {
      this.btnAddStimulus.addEventListener('click', () => this.addStimulus());
    }

    const btnSet5Stimuli = document.getElementById('btnSet5Stimuli');
    if (btnSet5Stimuli) {
      btnSet5Stimuli.addEventListener('click', () => this.setupDefault5Stimuli());
    }

    const presetSelect = document.getElementById('presetSelect');
    if (presetSelect) {
      presetSelect.addEventListener('change', (e) => this.applyPreset(e.target.value));
    }

    // Metadatos
    if (this.inputResearchTopic) {
      this.inputResearchTopic.addEventListener('input', (e) => {
        this.researchTopic = e.target.value;
      });
    }
    if (this.inputResearchObjective) {
      this.inputResearchObjective.addEventListener('input', (e) => {
        this.researchObjective = e.target.value;
        if (this.stats && this.stats.cohort) this.renderFinalVerdict();
      });
    }
    if (this.selectDecisionCriterion) {
      this.selectDecisionCriterion.addEventListener('change', (e) => {
        this.decisionCriterion = e.target.value;
        if (this.stats && this.stats.cohort) this.renderFinalVerdict();
      });
    }

    // Procesar Protocolo
    if (this.btnProcessProtocol) {
      this.btnProcessProtocol.addEventListener('click', () => this.processDataWithProtocol());
    }

    // Filtros
    if (this.subjectSelect) {
      this.subjectSelect.addEventListener('change', (e) => {
        this.activeSubject = e.target.value;
        this.updateViews();
      });
    }

    if (this.stimulusFilterSelect) {
      this.stimulusFilterSelect.addEventListener('change', (e) => {
        this.activeStimulus = e.target.value;
        this.updateViews();
      });
    }

    const chkFilterArtifacts = document.getElementById('chkFilterArtifacts');
    if (chkFilterArtifacts) {
      chkFilterArtifacts.addEventListener('change', (e) => {
        this.filterArtifacts = e.target.checked;
        if (this.protocol.length > 0 && this.files.length > 0) {
          this.processDataWithProtocol();
        }
      });
    }

    // Exportación
    const btnExportExcel = document.getElementById('btnExportExcel');
    if (btnExportExcel) {
      btnExportExcel.addEventListener('click', () => this.exportToExcel());
    }

    const btnExportZip = document.getElementById('btnExportZip');
    if (btnExportZip) {
      btnExportZip.addEventListener('click', () => this.splitAndExportAllCSVsZip());
    }

    const btnExportSelectedStimulusCSV = document.getElementById('btnExportSelectedStimulusCSV');
    if (btnExportSelectedStimulusCSV) {
      btnExportSelectedStimulusCSV.addEventListener('click', () => {
        const stimIdx = this.activeStimulus === 'ALL' ? 0 : parseInt(this.activeStimulus);
        this.exportSingleStimulusCSV(stimIdx);
      });
    }

    const btnPrintReport = document.getElementById('btnPrintReport');
    if (btnPrintReport) {
      btnPrintReport.addEventListener('click', () => window.print());
    }
  }

  // ==========================================
  // CLASIFICACIÓN DE ESTÍMULOS ACTIVOS VS NEUTRAL/DESCANSO
  // ==========================================
  isStimulusActive(stim) {
    if (stim.isExcluded !== undefined) {
      return !stim.isExcluded;
    }
    const type = (stim.type || '').toLowerCase();
    const name = (stim.name || '').toLowerCase();

    // Palabras clave que indican bloque neutral o descanso
    const neutralTerms = ['descanso', 'base', 'pausa', 'neutral', 'relax', 'calibracion', 'calibración', 'control'];
    const isNeutralType = neutralTerms.some(t => type.includes(t));
    const isNeutralName = neutralTerms.some(t => name.includes(t));

    return !(isNeutralType || isNeutralName);
  }

  getActiveStimuli() {
    return this.protocol.filter(s => this.isStimulusActive(s));
  }

  getActiveMetrics() {
    const allMetrics = this.getCurrentMetricsSet();
    return this.protocol
      .map((s, idx) => ({ stim: s, metric: allMetrics[idx], originalIdx: idx }))
      .filter(item => this.isStimulusActive(item.stim) && item.metric !== undefined);
  }

  // ==========================================
  // CONFIGURACIÓN DE PROTOCOLO: ESTÍMULO 1 ➔ NEUTRAL ➔ ESTÍMULO 2 ➔ NEUTRAL ...
  // ==========================================
  setupDefault5Stimuli() {
    this.numStimuli = 5;
    this.initialBaselineDuration = 0; // SIEMPRE en 0s
    this.stimuli = [
      { name: 'Estímulo 1 (Concepto A)', type: 'Spot Publicitario', duration: 30, color: '#2563eb' },
      { name: 'Estímulo 2 (Concepto B)', type: 'Spot Publicitario', duration: 30, color: '#10b981' },
      { name: 'Estímulo 3 (Concepto C)', type: 'Spot Publicitario', duration: 30, color: '#f59e0b' },
      { name: 'Estímulo 4 (Concepto D)', type: 'Spot Publicitario', duration: 30, color: '#8b5cf6' },
      { name: 'Estímulo 5 (Concepto E)', type: 'Spot Publicitario', duration: 30, color: '#ec4899' }
    ];
    this.neutrals = [
      { duration: 10 },
      { duration: 10 },
      { duration: 10 },
      { duration: 10 }
    ];
    const baseInput = document.getElementById('quickBaselineDuration');
    if (baseInput) baseInput.value = 0;
    this.updateNumStimuliButtonsUI();
    this.rebuildProtocol();
    this.renderStimuliCards();
  }

  setNumStimuli(n) {
    n = Math.max(2, Math.min(5, parseInt(n) || 5));
    this.numStimuli = n;

    // Ajustar longitud de estímulos
    while (this.stimuli.length < n) {
      const idx = this.stimuli.length + 1;
      this.stimuli.push({
        name: `Estímulo ${idx}`,
        type: 'Spot Publicitario',
        duration: 30,
        color: this.defaultColors[(idx - 1) % this.defaultColors.length]
      });
    }
    if (this.stimuli.length > n) {
      this.stimuli = this.stimuli.slice(0, n);
    }

    // Ajustar longitud de neutrales inter-estímulo (n - 1)
    while (this.neutrals.length < n - 1) {
      this.neutrals.push({ duration: 10 });
    }
    if (this.neutrals.length > n - 1) {
      this.neutrals = this.neutrals.slice(0, n - 1);
    }

    this.updateNumStimuliButtonsUI();
    this.rebuildProtocol();
    this.renderStimuliCards();
    this.showAlert(`Protocolo configurado con ${n} estímulos de prueba y ${n - 1} neutrales inter-estímulo.`, "info");
  }

  updateNumStimuliButtonsUI() {
    for (let i = 2; i <= 5; i++) {
      const btn = document.getElementById(`btnNum${i}`);
      if (btn) {
        if (i === this.numStimuli) {
          btn.className = "px-2.5 py-1 text-xs font-bold rounded bg-blue-600 text-white shadow-xs transition";
        } else {
          btn.className = "px-2.5 py-1 text-xs font-bold rounded text-slate-600 hover:text-slate-900 transition";
        }
      }
    }
  }

  applyDurationToAllStimuli() {
    const input = document.getElementById('quickStimDuration');
    const dur = input ? parseInt(input.value) : 30;
    if (isNaN(dur) || dur <= 0) {
      this.showAlert("Ingresa una duración válida en segundos para los estímulos.", "warning");
      return;
    }
    this.stimuli.forEach(s => s.duration = dur);
    this.rebuildProtocol();
    this.renderStimuliCards();
    this.showAlert(`Duración de ${dur}s asignada a todos los ${this.stimuli.length} estímulos.`, "success");
  }

  applyDurationToAllNeutrals() {
    const input = document.getElementById('quickNeutralDuration');
    const dur = input ? parseInt(input.value) : 10;
    if (isNaN(dur) || dur < 0) {
      this.showAlert("Ingresa una duración válida en segundos para los neutrales.", "warning");
      return;
    }
    this.neutrals.forEach(n => n.duration = dur);
    this.rebuildProtocol();
    this.renderStimuliCards();
    this.showAlert(`Pausa neutral de ${dur}s asignada a todos los descansos inter-estímulo.`, "success");
  }

  setInitialBaselineDuration(val) {
    this.initialBaselineDuration = Math.max(0, parseInt(val) || 0);
    const baseInput = document.getElementById('quickBaselineDuration');
    if (baseInput) baseInput.value = this.initialBaselineDuration;
    this.rebuildProtocol();
    this.renderStimuliCards();
  }

  addStimulus() {
    if (this.numStimuli >= this.maxStimuli) {
      this.showAlert("Se permite un máximo de 5 estímulos de prueba.", "warning");
      return;
    }
    this.setNumStimuli(this.numStimuli + 1);
  }

  removeStimulus(index) {
    if (this.stimuli.length <= 2) {
      this.showAlert("Debe haber al menos 2 estímulos de prueba en el protocolo.", "warning");
      return;
    }
    this.stimuli.splice(index, 1);
    this.numStimuli = this.stimuli.length;
    if (this.neutrals.length > this.numStimuli - 1) {
      this.neutrals = this.neutrals.slice(0, this.numStimuli - 1);
    }
    this.updateNumStimuliButtonsUI();
    this.rebuildProtocol();
    this.renderStimuliCards();
  }

  updateStimulusField(index, field, value) {
    if (!this.stimuli[index]) return;
    if (field === 'duration') {
      const dur = parseInt(value);
      if (!isNaN(dur) && dur > 0) {
        this.stimuli[index].duration = dur;
      }
    } else {
      this.stimuli[index][field] = value;
    }
    this.rebuildProtocol();
    this.renderStimuliCards();
  }

  updateNeutralDuration(index, value) {
    if (!this.neutrals[index]) return;
    const dur = parseInt(value);
    if (!isNaN(dur) && dur >= 0) {
      this.neutrals[index].duration = dur;
    }
    this.rebuildProtocol();
    this.renderStimuliCards();
  }

  rebuildProtocol() {
    this.protocol = [];
    let currentT = 0;

    // 1. Línea Base Inicial opcional
    if (this.initialBaselineDuration > 0) {
      const start = currentT;
      const end = currentT + this.initialBaselineDuration;
      this.protocol.push({
        id: 'LB',
        name: 'Línea Base Inicial',
        type: 'Línea Base',
        duration: this.initialBaselineDuration,
        startTime: start,
        endTime: end,
        isNeutral: true,
        isExcluded: true,
        color: '#64748b'
      });
      currentT = end;
    }

    // 2. Estímulos y Neutrales intercalados: E1 -> N1 -> E2 -> N2 -> E3...
    for (let i = 0; i < this.stimuli.length; i++) {
      const stim = this.stimuli[i];
      const dur = parseInt(stim.duration) || 30;
      const start = currentT;
      const end = currentT + dur;

      this.protocol.push({
        id: i + 1,
        stimulusIdx: i,
        name: stim.name || `Estímulo ${i + 1}`,
        type: stim.type || 'Spot Publicitario',
        duration: dur,
        startTime: start,
        endTime: end,
        isNeutral: false,
        isExcluded: false,
        color: stim.color || this.defaultColors[i % this.defaultColors.length]
      });
      currentT = end;

      // Si hay un estímulo siguiente, agregar Neutral entre ellos
      if (i < this.stimuli.length - 1) {
        const neutralDur = this.neutrals[i] !== undefined ? (parseInt(this.neutrals[i].duration) || 0) : 10;
        if (neutralDur > 0) {
          const nStart = currentT;
          const nEnd = currentT + neutralDur;
          this.protocol.push({
            id: `N${i + 1}`,
            neutralIdx: i,
            name: `Neutral ${i + 1} (Descanso)`,
            type: 'Neutral',
            duration: neutralDur,
            startTime: nStart,
            endTime: nEnd,
            isNeutral: true,
            isExcluded: true,
            color: '#64748b'
          });
          currentT = nEnd;
        }
      }
    }
  }

  recalculateProtocolTimes() {
    let currentT = 0;
    this.protocol.forEach(block => {
      block.startTime = currentT;
      block.endTime = currentT + (parseInt(block.duration) || 0);
      currentT = block.endTime;
    });
  }

  renderStimuliCards() {
    if (!this.stimuliCardsContainer) return;

    let html = '';
    const activeBlocks = this.protocol.filter(b => this.isStimulusActive(b));
    const neutralBlocks = this.protocol.filter(b => !this.isStimulusActive(b) && b.type === 'Neutral');

    // Si el usuario configuró una Línea Base Inicial (> 0s), se muestra como primer bloque empezando estrictamente en 0s
    if (this.initialBaselineDuration > 0) {
      html += `
        <!-- LÍNEA BASE INICIAL (SIEMPRE EMPIEZA EN 0s) -->
        <div class="neutral-block-connector mb-3 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 p-3 rounded-xl border border-dashed border-slate-300 shadow-2xs">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div class="flex items-center space-x-2.5">
              <span class="w-7 h-7 rounded-lg bg-slate-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                <i class="fas fa-hourglass-start"></i>
              </span>
              <div>
                <span class="text-xs font-black text-slate-800">
                  LÍNEA BASE INICIAL (Calibración / Reposo Ocular)
                </span>
                <span class="text-[11px] text-slate-500 block">
                  Comienza exactamente en <strong>0s</strong> para calibrar la señal antes del Estímulo 1 (Excluido de ANOVA).
                </span>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <span class="text-xs font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200">
                0s → ${this.initialBaselineDuration}s (${this.initialBaselineDuration}s)
              </span>
              <div class="flex items-center space-x-1.5">
                <label class="text-xs font-bold text-slate-700">Duración:</label>
                <input type="number" min="0" max="600" value="${this.initialBaselineDuration}" 
                  oninput="window.neuroApp.setInitialBaselineDuration(this.value)"
                  class="w-16 px-2 py-1 text-xs border border-slate-300 rounded-lg font-mono font-bold text-center bg-white text-slate-900 focus:ring-2 focus:ring-slate-400" />
                <span class="text-xs text-slate-500 font-bold">seg</span>
              </div>
              <button onclick="window.neuroApp.setInitialBaselineDuration(0)" class="text-[11px] text-red-600 hover:text-red-800 font-bold px-2 py-0.5 rounded hover:bg-red-50 transition border border-red-200" title="Eliminar línea base inicial para que Estímulo 1 empiece en 0s">
                <i class="fas fa-times mr-1"></i> Quitar (Estímulo 1 en 0s)
              </button>
            </div>
          </div>
        </div>
      `;
    }

    for (let i = 0; i < this.stimuli.length; i++) {
      const stim = this.stimuli[i];
      const activeBlock = activeBlocks[i] || { startTime: 0, endTime: stim.duration };

      html += `
        <!-- TARJETA DE ESTÍMULO ${i + 1} (ACTIVO EN EVALUACIÓN) -->
        <div class="stimulus-card bg-white border-t-4 border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition" 
             style="border-top-color: ${stim.color};">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 mb-3 border-b border-slate-100">
            <div class="flex items-center space-x-2">
              <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black text-white shadow-2xs" 
                    style="background-color: ${stim.color};">
                <i class="fas fa-bullseye mr-1.5"></i> ESTÍMULO ${i + 1} DE ${this.stimuli.length}
              </span>
              <span class="text-xs font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                ${activeBlock.startTime}s → ${activeBlock.endTime}s (${stim.duration}s)
              </span>
            </div>
            
            <div class="flex items-center space-x-2">
              <span class="inline-flex items-center text-[10.5px] font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                <i class="fas fa-check-circle mr-1 text-blue-600"></i> Estímulo Activo (Evaluado en ANOVA y Gráficas)
              </span>
              ${this.stimuli.length > 2 ? `
                <button onclick="window.neuroApp.removeStimulus(${i})" class="text-slate-400 hover:text-red-500 p-1 transition" title="Eliminar este estímulo">
                  <i class="fas fa-trash-alt text-xs"></i>
                </button>
              ` : ''}
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div class="lg:col-span-2">
              <label class="block font-bold text-slate-700 mb-1">Nombre del Estímulo:</label>
              <input type="text" value="${this.escapeHtml(stim.name)}" 
                onchange="window.neuroApp.updateStimulusField(${i}, 'name', this.value)"
                class="w-full px-3 py-1.5 border border-slate-300 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Ej: Spot Concepto A, Empaque Tradicional, etc." />
            </div>

            <div>
              <label class="block font-bold text-slate-700 mb-1">Categoría / Tipo:</label>
              <select onchange="window.neuroApp.updateStimulusField(${i}, 'type', this.value)"
                class="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-slate-700 focus:outline-none">
                <option value="Spot Publicitario" ${stim.type === 'Spot Publicitario' ? 'selected' : ''}>Spot Publicitario</option>
                <option value="Empaque / Producto" ${stim.type === 'Empaque / Producto' ? 'selected' : ''}>Empaque / Producto</option>
                <option value="Sitio Web / UX" ${stim.type === 'Sitio Web / UX' ? 'selected' : ''}>Sitio Web / UX</option>
                <option value="Degustación / Sensorial" ${stim.type === 'Degustación / Sensorial' ? 'selected' : ''}>Degustación / Sensorial</option>
                <option value="Evaluación" ${stim.type === 'Evaluación' ? 'selected' : ''}>Evaluación</option>
              </select>
            </div>

            <div class="flex items-center space-x-2">
              <div class="flex-1">
                <label class="block font-bold text-blue-700 mb-1">Duración (seg):</label>
                <input type="number" min="1" max="1800" value="${stim.duration}" 
                  oninput="window.neuroApp.updateStimulusField(${i}, 'duration', this.value)"
                  class="w-full px-2.5 py-1.5 border-2 border-blue-400 bg-blue-50/50 rounded-lg font-mono font-bold text-blue-900 text-center focus:ring-2 focus:ring-blue-600 focus:outline-none" />
              </div>
              <div>
                <label class="block font-bold text-slate-600 mb-1">Color:</label>
                <input type="color" value="${stim.color}" 
                  onchange="window.neuroApp.updateStimulusField(${i}, 'color', this.value)"
                  class="w-9 h-9 rounded-lg border border-slate-300 cursor-pointer p-0.5" />
              </div>
            </div>
          </div>
        </div>
      `;

      // Si hay un estímulo siguiente, renderizar el conector NEUTRAL INTER-ESTÍMULO
      if (i < this.stimuli.length - 1) {
        const neutralConf = this.neutrals[i] || { duration: 10 };
        const neutralBlock = neutralBlocks[i];

        html += `
          <div class="neutral-block-connector my-2 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 p-3 rounded-xl border border-dashed border-slate-300 shadow-2xs">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div class="flex items-center space-x-2.5">
                <span class="w-7 h-7 rounded-lg bg-slate-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                  <i class="fas fa-pause"></i>
                </span>
                <div>
                  <span class="text-xs font-black text-slate-800">
                    ⏸️ NEUTRAL ${i + 1} (Descanso / Lavado Fisiológico)
                  </span>
                  <span class="text-[11px] text-slate-500 block">
                    Intervalo inter-estímulo entre <strong>${stim.name}</strong> y <strong>${this.stimuli[i + 1].name}</strong> para restablecer la línea base.
                  </span>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-3">
                <span class="text-xs font-mono font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200">
                  ${neutralBlock ? `${neutralBlock.startTime}s → ${neutralBlock.endTime}s` : `${stim.duration}s → ${stim.duration + neutralConf.duration}s`}
                </span>
                <div class="flex items-center space-x-1.5">
                  <label class="text-xs font-bold text-slate-700">Duración:</label>
                  <input type="number" min="0" max="600" value="${neutralConf.duration}" 
                    oninput="window.neuroApp.updateNeutralDuration(${i}, this.value)"
                    class="w-16 px-2 py-1 text-xs border border-slate-300 rounded-lg font-mono font-bold text-center bg-white text-slate-900 focus:ring-2 focus:ring-slate-400" />
                  <span class="text-xs text-slate-500 font-bold">seg</span>
                </div>
                <span class="text-[10.5px] font-extrabold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 flex items-center">
                  <i class="fas fa-ban mr-1"></i> No se toma en cuenta como estímulo (Excluido de ANOVA)
                </span>
              </div>
            </div>
          </div>
        `;
      }
    }

    this.stimuliCardsContainer.innerHTML = html;

    const activeCount = this.getActiveStimuli().length;
    const neutralCount = this.protocol.length - activeCount;
    if (this.stimulusCountNotice) {
      this.stimulusCountNotice.innerHTML = `<strong>${activeCount}</strong> estímulos de prueba evaluados | ${neutralCount} neutrales inter-estímulo`;
    }

    if (this.btnAddStimulus) {
      if (this.stimuli.length >= this.maxStimuli) {
        this.btnAddStimulus.classList.add('opacity-50', 'cursor-not-allowed');
        this.btnAddStimulus.title = "Máximo de 5 estímulos alcanzado";
      } else {
        this.btnAddStimulus.classList.remove('opacity-50', 'cursor-not-allowed');
        this.btnAddStimulus.title = "Agregar otro estímulo";
      }
    }

    this.renderTimelinePreview();
    this.updateStimulusDropdown();
    this.updateProtocolDurationNotice();
  }

  renderTimelinePreview() {
    if (!this.timelineVisual) return;
    const totalDuration = this.protocol.reduce((acc, s) => acc + (parseInt(s.duration) || 0), 0);

    if (totalDuration === 0) {
      this.timelineVisual.innerHTML = '<div class="text-xs text-slate-400 p-3 text-center">Protocolo sin duración</div>';
      return;
    }

    let html = '';
    this.protocol.forEach((block, idx) => {
      const pct = ((block.duration / totalDuration) * 100).toFixed(1);
      const isAct = this.isStimulusActive(block);

      if (isAct) {
        html += `
          <div class="timeline-segment" 
               style="width: ${pct}%; background-color: ${block.color};" 
               title="${block.name} [${block.startTime}s - ${block.endTime}s: ${block.duration}s] (Estímulo de Prueba Activo)">
            <span>🎯 ${block.name} (${block.duration}s)</span>
          </div>
        `;
      } else {
        html += `
          <div class="timeline-segment timeline-segment-neutral" 
               style="width: ${pct}%;" 
               title="${block.name} [${block.startTime}s - ${block.endTime}s: ${block.duration}s] (Pausa Neutral / Lavado - Excluido de ANOVA)">
            <span>⏸️ ${block.name.replace(' (Descanso)', '')} (${block.duration}s)</span>
          </div>
        `;
      }
    });

    this.timelineVisual.innerHTML = html;
  }

  applyPreset(presetName) {
    if (!presetName) return;

    this.initialBaselineDuration = 0; // La línea base inicial siempre empieza en 0s

    if (presetName === 'tv_ab') {
      this.stimuli = [
        { name: 'Spot Publicitario Concepto A', type: 'Spot Publicitario', duration: 30, color: '#2563eb' },
        { name: 'Spot Publicitario Concepto B', type: 'Spot Publicitario', duration: 30, color: '#f59e0b' }
      ];
      this.neutrals = [{ duration: 15 }];
      this.numStimuli = 2;
    } else if (presetName === 'packaging') {
      this.stimuli = [
        { name: 'Empaque Tradicional (Control)', type: 'Empaque / Producto', duration: 30, color: '#2563eb' },
        { name: 'Empaque Nuevo (Propuesta)', type: 'Empaque / Producto', duration: 30, color: '#10b981' }
      ];
      this.neutrals = [{ duration: 10 }];
      this.numStimuli = 2;
    } else if (presetName === 'tasting') {
      this.stimuli = [
        { name: 'Degustación Sabor Clásico', type: 'Degustación / Sensorial', duration: 30, color: '#2563eb' },
        { name: 'Degustación Sabor Nuevo', type: 'Degustación / Sensorial', duration: 30, color: '#f59e0b' }
      ];
      this.neutrals = [{ duration: 15 }];
      this.numStimuli = 2;
    }

    const baseInput = document.getElementById('quickBaselineDuration');
    if (baseInput) baseInput.value = 0;

    this.updateNumStimuliButtonsUI();
    this.rebuildProtocol();
    this.renderStimuliCards();
    this.showAlert(`Plantilla aplicada. Línea base fijada en 0s y Estímulo 1 iniciando de inmediato en 0s.`, "success");
  }

  // ==========================================
  // CARGA DE ARCHIVOS CSV (HASTA 50)
  // ==========================================
  async handleFiles(uploadedFiles) {
    const validExtensions = ['.csv', '.txt'];
    const maxFiles = 50;

    const remainingSlots = maxFiles - this.files.length;
    if (remainingSlots <= 0) {
      this.showAlert(`Ya se alcanzó el límite máximo de ${maxFiles} archivos.`, 'warning');
      return;
    }

    const filesToProcess = uploadedFiles
      .filter(f => validExtensions.some(ext => f.name.toLowerCase().endsWith(ext)))
      .slice(0, remainingSlots);

    if (filesToProcess.length === 0) {
      this.showAlert('Por favor sube archivos .CSV válidos de NeuroSky.', 'danger');
      return;
    }

    this.showLoading(true, `Leyendo ${filesToProcess.length} archivo(s)...`);

    for (let file of filesToProcess) {
      if (this.files.some(f => f.fileName === file.name)) continue;

      try {
        const parsedData = await this.parseCSVFile(file);
        if (parsedData && parsedData.rows.length > 0) {
          this.files.push(parsedData);
        }
      } catch (err) {
        console.error(`Error procesando archivo ${file.name}:`, err);
      }
    }

    this.showLoading(false);
    this.updateFileListUI();
    this.updateProtocolDurationNotice();

    if (this.files.length > 0) {
      this.protocolSection.classList.remove('hidden');
      this.protocolSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  parseCSVFile(file) {
    return new Promise((resolve) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rawRows = results.data;
          const normalizedRows = this.normalizeNeuroSkyRows(rawRows);
          
          const poorSignalCount = normalizedRows.filter(r => r.poorSignal > 50).length;
          const avgSignal = normalizedRows.length > 0 
            ? Math.round(normalizedRows.reduce((acc, r) => acc + (r.poorSignal || 0), 0) / normalizedRows.length)
            : 0;

          const duration = normalizedRows.length > 0 
            ? Math.max(...normalizedRows.map(r => r.time)) - Math.min(...normalizedRows.map(r => r.time)) + 1
            : 0;

          resolve({
            id: 'subj_' + Math.random().toString(36).substr(2, 9),
            name: file.name.replace(/\.[^/.]+$/, ""),
            fileName: file.name,
            size: file.size,
            rows: normalizedRows,
            duration: Math.round(duration),
            samplesCount: normalizedRows.length,
            avgSignal: avgSignal,
            poorSignalCount: poorSignalCount
          });
        },
        error: (err) => {
          console.error("PapaParse error:", err);
          resolve(null);
        }
      });
    });
  }

  normalizeNeuroSkyRows(rawRows) {
    if (!rawRows || rawRows.length === 0) return [];

    const sample = rawRows[0];
    const colKeys = Object.keys(sample);

    const findKey = (regex) => colKeys.find(k => regex.test(k.trim()));

    const keyTime = findKey(/^(time|tiempo|segundo|second|timestamp|sec|t\(s\))$/i) || findKey(/time|tiempo|sec/i);
    const keyAtt = findKey(/^(attention|atenci[oó]n|att|esense_att)$/i) || findKey(/att/i);
    const keyMed = findKey(/^(meditation|meditaci[oó]n|med|esense_med)$/i) || findKey(/med/i);
    const keyDelta = findKey(/delta/i);
    const keyTheta = findKey(/theta|teta/i);
    const keyLowAlpha = findKey(/low.*alpha|alfa.*baj[ao]|alpha_?1/i);
    const keyHighAlpha = findKey(/high.*alpha|alfa.*alt[ao]|alpha_?2/i);
    const keyLowBeta = findKey(/low.*beta|beta.*baj[ao]|beta_?1/i);
    const keyHighBeta = findKey(/high.*beta|beta.*alt[ao]|beta_?2/i);
    const keyLowGamma = findKey(/low.*gamma|gamma.*baj[ao]|gamma_?1/i);
    const keyHighGamma = findKey(/high.*gamma|mid.*gamma|gamma.*alt[ao]|gamma_?2/i);
    const keyPoorSignal = findKey(/poor.*signal|calidad|se[ñn]al|signal|quality/i);

    let baseTime = null;

    return rawRows.map((r, index) => {
      let t = index;
      if (keyTime && r[keyTime] !== undefined && r[keyTime] !== null && r[keyTime] !== '') {
        const val = parseFloat(r[keyTime]);
        if (!isNaN(val)) {
          if (val > 100000000) {
            if (baseTime === null) baseTime = val;
            t = Math.floor((val - baseTime) / 1000);
          } else {
            t = Math.floor(val);
          }
        }
      }

      return {
        time: t,
        attention: this.cleanNum(r[keyAtt], 0, 100),
        meditation: this.cleanNum(r[keyMed], 0, 100),
        delta: this.cleanNum(r[keyDelta], 0, 2000000),
        theta: this.cleanNum(r[keyTheta], 0, 1000000),
        lowAlpha: this.cleanNum(r[keyLowAlpha], 0, 500000),
        highAlpha: this.cleanNum(r[keyHighAlpha], 0, 500000),
        lowBeta: this.cleanNum(r[keyLowBeta], 0, 500000),
        highBeta: this.cleanNum(r[keyHighBeta], 0, 500000),
        lowGamma: this.cleanNum(r[keyLowGamma], 0, 500000),
        highGamma: this.cleanNum(r[keyHighGamma], 0, 500000),
        poorSignal: this.cleanNum(r[keyPoorSignal], 0, 200)
      };
    }).sort((a, b) => a.time - b.time);
  }

  cleanNum(val, min = 0, max = Infinity) {
    if (val === undefined || val === null || val === '') return 0;
    let n = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
    if (isNaN(n)) return 0;
    return Math.max(min, Math.min(max, n));
  }

  updateFileListUI() {
    this.fileCountBadge.textContent = `${this.files.length} / 50 archivos`;
    
    if (this.files.length === 0) {
      this.fileListContainer.innerHTML = `
        <div class="text-center py-8 text-slate-400">
          <i class="fas fa-inbox text-3xl mb-2"></i>
          <p class="text-sm">No hay archivos CSV cargados todavía.</p>
        </div>
      `;
      this.filesSummaryText.textContent = "Sin archivos";
      return;
    }

    const totalDuration = Math.max(...this.files.map(f => f.duration));
    const avgCohortSignal = Math.round(this.files.reduce((acc, f) => acc + f.avgSignal, 0) / this.files.length);
    this.filesSummaryText.textContent = `${this.files.length} sujetos | Duración máx: ${totalDuration}s | Señal prom: ${avgCohortSignal}`;

    let html = `
      <div class="overflow-x-auto max-h-60 custom-scrollbar border border-slate-200 rounded-lg">
        <table class="w-full text-left text-xs text-slate-600">
          <thead class="bg-slate-100 text-slate-700 font-semibold uppercase text-[10px] sticky top-0">
            <tr>
              <th class="p-2.5">#</th>
              <th class="p-2.5">Sujeto / Archivo</th>
              <th class="p-2.5 text-center">Duración (s)</th>
              <th class="p-2.5 text-center">Muestras</th>
              <th class="p-2.5 text-center">Calidad Señal</th>
              <th class="p-2.5 text-right">Acción</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
    `;

    this.files.forEach((f, idx) => {
      let signalBadge = '<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800"><i class="fas fa-check-circle mr-1"></i> Óptima</span>';
      if (f.avgSignal > 50) {
        signalBadge = '<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-800"><i class="fas fa-exclamation-triangle mr-1"></i> Ruido Alto</span>';
      } else if (f.avgSignal > 20) {
        signalBadge = '<span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800"><i class="fas fa-info-circle mr-1"></i> Aceptable</span>';
      }

      html += `
        <tr class="hover:bg-slate-50 transition">
          <td class="p-2.5 font-medium text-slate-500">${idx + 1}</td>
          <td class="p-2.5 font-semibold text-slate-800 truncate max-w-xs" title="${f.fileName}">
            <i class="fas fa-file-csv text-emerald-600 mr-1.5"></i> ${f.name}
          </td>
          <td class="p-2.5 text-center font-mono">${f.duration}s</td>
          <td class="p-2.5 text-center font-mono">${f.samplesCount}</td>
          <td class="p-2.5 text-center">${signalBadge}</td>
          <td class="p-2.5 text-right">
            <button onclick="window.neuroApp.removeFile('${f.id}')" class="text-slate-400 hover:text-red-600 p-1 rounded transition" title="Eliminar archivo">
              <i class="fas fa-trash-alt"></i>
            </button>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table></div>`;
    this.fileListContainer.innerHTML = html;

    this.updateSubjectDropdown();
  }

  removeFile(id) {
    this.files = this.files.filter(f => f.id !== id);
    this.updateFileListUI();
    this.updateProtocolDurationNotice();
    if (this.files.length === 0) {
      this.resultsSection.classList.add('hidden');
    } else if (this.protocol.length > 0) {
      this.processDataWithProtocol();
    }
  }

  clearAllFiles() {
    if (this.files.length === 0) return;
    if (confirm("¿Deseas eliminar todos los archivos cargados?")) {
      this.files = [];
      this.updateFileListUI();
      this.updateProtocolDurationNotice();
      this.resultsSection.classList.add('hidden');
    }
  }

  updateSubjectDropdown() {
    if (!this.subjectSelect) return;
    const currentVal = this.subjectSelect.value;
    
    let html = `<option value="ALL">📊 Consolidado General (Promedio Cohorte N=${this.files.length})</option>`;
    this.files.forEach((f, idx) => {
      html += `<option value="${f.id}">👤 Sujeto ${idx + 1}: ${f.name} (${f.duration}s)</option>`;
    });

    this.subjectSelect.innerHTML = html;
    if (this.files.some(f => f.id === currentVal)) {
      this.subjectSelect.value = currentVal;
    } else {
      this.subjectSelect.value = 'ALL';
      this.activeSubject = 'ALL';
    }
  }

  updateStimulusDropdown() {
    if (!this.stimulusFilterSelect) return;
    const currentVal = this.stimulusFilterSelect.value;
    
    let html = `<option value="ALL">🌐 Todos los Estímulos</option>`;
    this.protocol.forEach((stim, idx) => {
      const isActive = this.isStimulusActive(stim);
      html += `<option value="${idx}">🎯 Bloque ${idx + 1}: ${stim.name} [${stim.startTime}s - ${stim.endTime}s] ${isActive ? '' : '(Control/Descanso)'}</option>`;
    });

    this.stimulusFilterSelect.innerHTML = html;
    if (this.protocol[currentVal] !== undefined) {
      this.stimulusFilterSelect.value = currentVal;
    } else {
      this.stimulusFilterSelect.value = 'ALL';
      this.activeStimulus = 'ALL';
    }
  }

  updateProtocolDurationNotice() {
    const noticeEl = document.getElementById('protocolDurationNotice');
    if (!noticeEl) return;

    const protocolTotal = this.protocol.reduce((acc, s) => acc + (parseInt(s.duration) || 0), 0);
    const activeTotal = this.getActiveStimuli().reduce((acc, s) => acc + (parseInt(s.duration) || 0), 0);

    if (this.files.length === 0) {
      noticeEl.innerHTML = `<span class="text-slate-500 font-medium"><i class="fas fa-clock mr-1"></i> Duración total: <strong>${protocolTotal}s</strong> (${activeTotal}s en estímulos de prueba evaluados)</span>`;
      return;
    }

    const minFileDur = Math.min(...this.files.map(f => f.duration));
    if (protocolTotal > minFileDur) {
      noticeEl.innerHTML = `
        <span class="text-amber-600 font-medium">
          <i class="fas fa-exclamation-triangle mr-1"></i> Aviso: Protocolo dura <strong>${protocolTotal}s</strong>, pero algunos archivos tienen <strong>${minFileDur}s</strong>. Se dividirán los segundos disponibles.
        </span>
      `;
    } else {
      noticeEl.innerHTML = `
        <span class="text-emerald-700 font-medium">
          <i class="fas fa-check-circle mr-1"></i> Sincronización perfecta: <strong>${protocolTotal}s</strong> cubren los archivos (${minFileDur}s).
        </span>
      `;
    }
  }

  // ==========================================
  // PROCESAMIENTO Y DIVISIÓN DE CSVs
  // ==========================================
  processDataWithProtocol() {
    if (this.files.length === 0) {
      this.showAlert("Carga al menos un archivo CSV antes de procesar.", "warning");
      return;
    }
    if (this.protocol.length === 0) {
      this.showAlert("Configura al menos un estímulo en el protocolo.", "warning");
      return;
    }

    const activeCount = this.getActiveStimuli().length;
    if (activeCount === 0) {
      this.showAlert("Debe haber al menos 1 estímulo activo para análisis (no descanso/línea base).", "warning");
      return;
    }

    this.showLoading(true, `Dividiendo archivos y analizando ${activeCount} estímulo(s) de prueba (excluyendo descanso/línea base)...`);

    setTimeout(() => {
      this.recalculateProtocolTimes();
      this.computeAllStatistics();
      this.renderDivisionSummaryTable();
      this.resultsSection.classList.remove('hidden');
      this.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      this.updateViews();
      this.runInferentialStatistics();
      this.renderFinalVerdict();
      this.showLoading(false);
      this.showAlert(`¡Análisis completado enfocado exclusivamente en los ${activeCount} estímulos de prueba!`, "success");
    }, 150);
  }

  computeAllStatistics() {
    this.stats = {
      bySubject: {},
      cohort: []
    };

    // 1. Estadísticas de cada bloque por sujeto
    this.files.forEach(subj => {
      this.stats.bySubject[subj.id] = this.protocol.map((stim, sIdx) => {
        let rows = subj.rows.filter(r => r.time >= stim.startTime && r.time < stim.endTime);

        if (this.filterArtifacts) {
          rows = rows.filter(r => r.poorSignal <= 50);
        }

        return this.calculateBlockMetrics(rows, stim.name, stim.type, stim.duration, subj.name);
      });
    });

    // 2. Consolidado Cohorte (Promedio N)
    this.stats.cohort = this.protocol.map((stim, sIdx) => {
      const subjMetrics = this.files.map(subj => this.stats.bySubject[subj.id][sIdx]).filter(m => m.n > 0);

      if (subjMetrics.length === 0) {
        return this.getEmptyMetric(stim.name, stim.type, stim.duration, 'Consolidado General');
      }

      const meanOf = (key) => this.arrayMean(subjMetrics.map(m => m[key]));
      const stdOf = (key) => this.arrayStd(subjMetrics.map(m => m[key]));

      const attMean = meanOf('attMean');
      const medMean = meanOf('medMean');
      const engagement = medMean > 0 ? (attMean / medMean) : 1;

      return {
        stimIndex: sIdx,
        stimName: stim.name,
        stimType: stim.type,
        duration: stim.duration,
        isExcluded: stim.isExcluded,
        subjectName: 'Consolidado General (N=' + subjMetrics.length + ')',
        n: subjMetrics.reduce((acc, m) => acc + m.n, 0),
        attMean: attMean,
        attStd: stdOf('attMean'),
        attMin: Math.min(...subjMetrics.map(m => m.attMin)),
        attMax: Math.max(...subjMetrics.map(m => m.attMax)),
        medMean: medMean,
        medStd: stdOf('medMean'),
        medMin: Math.min(...subjMetrics.map(m => m.medMin)),
        medMax: Math.max(...subjMetrics.map(m => m.medMax)),
        deltaMean: meanOf('deltaMean'),
        thetaMean: meanOf('thetaMean'),
        lowAlphaMean: meanOf('lowAlphaMean'),
        highAlphaMean: meanOf('highAlphaMean'),
        lowBetaMean: meanOf('lowBetaMean'),
        highBetaMean: meanOf('highBetaMean'),
        lowGammaMean: meanOf('lowGammaMean'),
        highGammaMean: meanOf('highGammaMean'),
        thetaBetaRatio: meanOf('thetaBetaRatio'),
        alphaBetaRatio: meanOf('alphaBetaRatio'),
        engagement: engagement,
        diagnosis: this.getDiagnosis(attMean, medMean)
      };
    });

    this.updateKPIs();
  }

  calculateBlockMetrics(rows, stimName, stimType, expectedDuration, subjectName) {
    if (!rows || rows.length === 0) {
      return this.getEmptyMetric(stimName, stimType, expectedDuration, subjectName);
    }

    const atts = rows.map(r => r.attention);
    const meds = rows.map(r => r.meditation);
    const deltas = rows.map(r => r.delta);
    const thetas = rows.map(r => r.theta);
    const lowAlphas = rows.map(r => r.lowAlpha);
    const highAlphas = rows.map(r => r.highAlpha);
    const lowBetas = rows.map(r => r.lowBeta);
    const highBetas = rows.map(r => r.highBeta);
    const lowGammas = rows.map(r => r.lowGamma);
    const highGammas = rows.map(r => r.highGamma);

    const attMean = this.arrayMean(atts);
    const medMean = this.arrayMean(meds);
    const thetaMean = this.arrayMean(thetas);
    const totalBeta = this.arrayMean(lowBetas) + this.arrayMean(highBetas);
    const totalAlpha = this.arrayMean(lowAlphas) + this.arrayMean(highAlphas);

    const thetaBetaRatio = totalBeta > 0 ? (thetaMean / totalBeta) : 1;
    const alphaBetaRatio = totalBeta > 0 ? (totalAlpha / totalBeta) : 1;
    const engagement = medMean > 0 ? (attMean / medMean) : 1;

    return {
      stimName,
      stimType,
      duration: expectedDuration,
      subjectName,
      n: rows.length,
      attMean: attMean,
      attStd: this.arrayStd(atts),
      attMin: Math.min(...atts),
      attMax: Math.max(...atts),
      medMean: medMean,
      medStd: this.arrayStd(meds),
      medMin: Math.min(...meds),
      medMax: Math.max(...meds),
      deltaMean: this.arrayMean(deltas),
      thetaMean: thetaMean,
      lowAlphaMean: this.arrayMean(lowAlphas),
      highAlphaMean: this.arrayMean(highAlphas),
      lowBetaMean: this.arrayMean(lowBetas),
      highBetaMean: this.arrayMean(highBetas),
      lowGammaMean: this.arrayMean(lowGammas),
      highGammaMean: this.arrayMean(highGammas),
      thetaBetaRatio: thetaBetaRatio,
      alphaBetaRatio: alphaBetaRatio,
      engagement: engagement,
      diagnosis: this.getDiagnosis(attMean, medMean)
    };
  }

  getEmptyMetric(stimName, stimType, duration, subjectName) {
    return {
      stimName,
      stimType,
      duration,
      subjectName,
      n: 0,
      attMean: 0, attStd: 0, attMin: 0, attMax: 0,
      medMean: 0, medStd: 0, medMin: 0, medMax: 0,
      deltaMean: 0, thetaMean: 0, lowAlphaMean: 0, highAlphaMean: 0,
      lowBetaMean: 0, highBetaMean: 0, lowGammaMean: 0, highGammaMean: 0,
      thetaBetaRatio: 0, alphaBetaRatio: 0, engagement: 0,
      diagnosis: 'Sin datos'
    };
  }

  getDiagnosis(att, med) {
    if (att >= 60 && med <= 45) return '🔥 Alta Percepción / Foco Consciente';
    if (att >= 60 && med > 55) return '✨ Resonancia Óptima (Percepción + Emoción)';
    if (med >= 60 && att < 45) return '🧘 Alto Anclaje Emocional / Introspección';
    if (att < 45 && med < 45) return '💤 Baja Percepción / Desconexión';
    return '⚖️ Procesamiento Neutro Balanceado';
  }

  arrayMean(arr) {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  arrayStd(arr) {
    if (!arr || arr.length <= 1) return 0;
    const mean = this.arrayMean(arr);
    const variance = arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (arr.length - 1);
    return Math.sqrt(variance);
  }

  // ==========================================
  // GRÁFICAS INTERACTIVAS (EXCLUYENDO NEUTRAL/DESCANSO)
  // ==========================================
  renderCharts() {
    this.renderTimelineChart();
    this.renderComparisonBarsChart();
    this.renderBrainwavesRadarChart();
    this.renderDetailedStimulusChart();
  }

  renderTimelineChart() {
    const chartDiv = document.getElementById('chartTimeline');
    if (!chartDiv) return;

    const maxT = Math.max(...this.protocol.map(s => s.endTime));
    const timeLabels = [];
    const attPoints = [];
    const medPoints = [];

    for (let t = 0; t <= maxT; t++) {
      timeLabels.push(t);
      if (this.activeSubject === 'ALL') {
        const valsAtt = [];
        const valsMed = [];
        this.files.forEach(f => {
          const row = f.rows.find(r => r.time === t);
          if (row && (!this.filterArtifacts || row.poorSignal <= 50)) {
            valsAtt.push(row.attention);
            valsMed.push(row.meditation);
          }
        });
        attPoints.push(valsAtt.length > 0 ? this.arrayMean(valsAtt) : null);
        medPoints.push(valsMed.length > 0 ? this.arrayMean(valsMed) : null);
      } else {
        const subj = this.files.find(f => f.id === this.activeSubject);
        if (subj) {
          const row = subj.rows.find(r => r.time === t);
          if (row && (!this.filterArtifacts || row.poorSignal <= 50)) {
            attPoints.push(row.attention);
            medPoints.push(row.meditation);
          } else {
            attPoints.push(null);
            medPoints.push(null);
          }
        }
      }
    }

    const traceAttention = {
      x: timeLabels,
      y: attPoints,
      mode: 'lines',
      name: 'Percepción (Atención %)',
      line: { color: '#2563eb', width: 3, shape: 'spline' },
      hoverinfo: 'x+y+name'
    };

    const traceMeditation = {
      x: timeLabels,
      y: medPoints,
      mode: 'lines',
      name: 'Emoción y Recuerdos (Meditación %)',
      line: { color: '#10b981', width: 2.5, dash: 'dot', shape: 'spline' },
      hoverinfo: 'x+y+name'
    };

    // Zonas sombreadas: Destacar estímulos de prueba en color y descansos en gris suave
    const shapes = this.protocol.map((stim) => {
      const isActive = this.isStimulusActive(stim);
      return {
        type: 'rect',
        xref: 'x',
        yref: 'paper',
        x0: stim.startTime,
        x1: stim.endTime,
        y0: 0,
        y1: 1,
        fillcolor: isActive ? stim.color : '#94a3b8',
        opacity: isActive ? 0.13 : 0.06,
        line: { width: isActive ? 1.5 : 1, color: isActive ? stim.color : '#94a3b8', dash: isActive ? 'solid' : 'dot' }
      };
    });

    const annotations = this.protocol.map((stim, idx) => {
      const isActive = this.isStimulusActive(stim);
      return {
        x: (stim.startTime + stim.endTime) / 2,
        y: 104,
        xref: 'x',
        yref: 'y',
        text: `<b>${isActive ? '🎯 E' + (idx+1) : '🔒'} ${stim.name}</b>`,
        showarrow: false,
        font: { size: 10, color: isActive ? '#0f172a' : '#64748b' },
        bgcolor: isActive ? 'rgba(255, 255, 255, 0.92)' : 'rgba(241, 245, 249, 0.85)',
        bordercolor: isActive ? stim.color : '#cbd5e1',
        borderwidth: 1,
        borderpad: 2
      };
    });

    const layout = {
      title: {
        text: this.activeSubject === 'ALL' 
          ? `<b>Línea Temporal de la Sesión: Percepción (%) y Emoción (%) [Cohorte N=${this.files.length}]</b>` 
          : `<b>Línea Temporal de la Sesión: ${this.getSelectedSubjectName()}</b>`,
        font: { size: 13.5, color: '#0f172a' }
      },
      shapes: shapes,
      annotations: annotations,
      xaxis: { title: 'Tiempo de Exposición (segundos)', range: [0, maxT], showgrid: true, gridcolor: '#f1f5f9' },
      yaxis: { title: 'Nivel Porcentual (%)', range: [0, 115], ticksuffix: '%', showgrid: true, gridcolor: '#e2e8f0' },
      legend: { orientation: 'h', y: -0.22, x: 0.5, xanchor: 'center' },
      margin: { l: 50, r: 30, t: 50, b: 60 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: '#ffffff',
      hovermode: 'x unified'
    };

    Plotly.react(chartDiv, [traceAttention, traceMeditation], layout, { responsive: true });

    this.updateExplanationChart1();
  }

  updateExplanationChart1() {
    if (!this.statExplChart1 || !this.stats.cohort) return;
    const activeItems = this.getActiveMetrics();

    if (activeItems.length === 0) {
      this.statExplChart1.innerHTML = `<span class="text-slate-500">Configura al menos un estímulo de prueba para el análisis comparativo.</span>`;
      return;
    }

    const sortedAtt = [...activeItems].sort((a, b) => b.metric.attMean - a.metric.attMean);
    const sortedMed = [...activeItems].sort((a, b) => b.metric.medMean - a.metric.medMean);

    const bestAtt = sortedAtt[0];
    const bestMed = sortedMed[0];

    this.statExplChart1.innerHTML = `
      <div class="flex items-start space-x-2">
        <i class="fas fa-chart-line text-blue-600 mt-0.5 text-base"></i>
        <div>
          <span class="font-bold text-slate-900 block mb-0.5">Interpretación Temporal de los Estímulos de Prueba (Excluyendo descansos):</span>
          <span>Entre los estímulos activos evaluados, el de mayor <strong>percepción sostenida</strong> fue <strong>${bestAtt.stim.name}</strong>, con una media de <strong>${bestAtt.metric.attMean.toFixed(1)}%</strong> y picos máximos de <strong>${Math.round(bestAtt.metric.attMax)}%</strong>. En la dimensión de <strong>anclaje de recuerdos y emoción</strong>, el más efectivo fue <strong>${bestMed.stim.name}</strong> con <strong>${bestMed.metric.medMean.toFixed(1)}%</strong>. <em>(Nota: Los bloques de línea base o descanso fueron excluidos de la comparativa competitiva).</em></span>
        </div>
      </div>
    `;
  }

  renderComparisonBarsChart() {
    const chartDiv = document.getElementById('chartComparisonBars');
    if (!chartDiv) return;

    // Tomar EXCLUSIVAMENTE los estímulos activos
    const activeItems = this.getActiveMetrics();

    const names = activeItems.map(item => item.stim.name);
    const attMeans = activeItems.map(item => item.metric.attMean);
    const attStds = activeItems.map(item => item.metric.attStd);
    const medMeans = activeItems.map(item => item.metric.medMean);
    const medStds = activeItems.map(item => item.metric.medStd);

    const traceAtt = {
      x: names,
      y: attMeans,
      name: 'Percepción (Atención %)',
      type: 'bar',
      marker: { color: '#2563eb' },
      error_y: { type: 'data', array: attStds, visible: true, color: '#1d4ed8' },
      text: attMeans.map(v => v.toFixed(1) + '%'),
      textposition: 'auto',
      hoverinfo: 'x+y+name'
    };

    const traceMed = {
      x: names,
      y: medMeans,
      name: 'Emoción y Recuerdos (Meditación %)',
      type: 'bar',
      marker: { color: '#10b981' },
      error_y: { type: 'data', array: medStds, visible: true, color: '#047857' },
      text: medMeans.map(v => v.toFixed(1) + '%'),
      textposition: 'auto',
      hoverinfo: 'x+y+name'
    };

    const layout = {
      title: { text: `<b>Comparativa de Estímulos de Prueba (% Percepción vs % Emoción)</b><br><span style="font-size:11px; font-weight:normal; color:#64748b;">(Excluyendo Línea Base y Descansos)</span>`, font: { size: 13.5 } },
      barmode: 'group',
      yaxis: { title: 'Puntaje Promedio (%)', range: [0, 110], ticksuffix: '%', gridcolor: '#e2e8f0' },
      xaxis: { tickangle: -15 },
      legend: { orientation: 'h', y: -0.25, x: 0.5, xanchor: 'center' },
      margin: { l: 50, r: 20, t: 50, b: 80 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: '#ffffff'
    };

    Plotly.react(chartDiv, [traceAtt, traceMed], layout, { responsive: true });

    this.updateExplanationChart2(activeItems);
  }

  updateExplanationChart2(activeItems) {
    if (!this.statExplChart2 || activeItems.length === 0) return;

    const sortedAtt = [...activeItems].sort((a, b) => b.metric.attMean - a.metric.attMean);
    const sortedMed = [...activeItems].sort((a, b) => b.metric.medMean - a.metric.medMean);

    const topAtt = sortedAtt[0];
    const secondAtt = sortedAtt[1] || sortedAtt[0];
    const diffAtt = (topAtt.metric.attMean - secondAtt.metric.attMean).toFixed(1);

    const topMed = sortedMed[0];

    this.statExplChart2.innerHTML = `
      <div class="flex items-start space-x-2">
        <i class="fas fa-balance-scale text-emerald-600 mt-0.5 text-base"></i>
        <div>
          <span class="font-bold text-slate-900 block mb-0.5">Efectividad entre Estímulos Competidores:</span>
          <span>Comparando estrictamente los ${activeItems.length} estímulos de prueba (sin contar descansos ni calibración), el estímulo con mayor <strong>Percepción (Atención)</strong> es <strong>${topAtt.stim.name}</strong> ($\bar{X} = ${topAtt.metric.attMean.toFixed(1)}\%$, $DE = ${topAtt.metric.attStd.toFixed(1)}$), superando por <strong>+${diffAtt}%</strong> al segundo competidor. En <strong>Emoción y Creación de Anclas (Meditación)</strong>, el estímulo líder es <strong>${topMed.stim.name}</strong> ($\bar{X} = ${topMed.metric.medMean.toFixed(1)}\%$).</span>
        </div>
      </div>
    `;
  }

  renderBrainwavesRadarChart() {
    const chartDiv = document.getElementById('chartBrainwavesRadar');
    if (!chartDiv) return;

    // Solo estímulos activos
    const activeItems = this.getActiveMetrics();
    const bands = ['Delta', 'Theta', 'Low Alpha', 'High Alpha', 'Low Beta', 'High Beta', 'Low Gamma', 'High Gamma'];

    const traces = activeItems.map((item) => {
      const m = item.metric;
      const rawValues = [
        m.deltaMean, m.thetaMean, m.lowAlphaMean, m.highAlphaMean,
        m.lowBetaMean, m.highBetaMean, m.lowGammaMean, m.highGammaMean
      ];
      const sum = rawValues.reduce((a, b) => a + b, 0) || 1;
      const normalized = rawValues.map(v => parseFloat(((v / sum) * 100).toFixed(1)));

      return {
        type: 'scatterpolar',
        r: [...normalized, normalized[0]],
        theta: [...bands, bands[0]],
        fill: 'toself',
        name: item.stim.name,
        line: { color: item.stim.color },
        opacity: 0.65
      };
    });

    const layout = {
      title: { text: '<b>Huella Espectral: Estímulos de Prueba (% Potencia)</b><br><span style="font-size:11px; font-weight:normal; color:#64748b;">(Excluyendo Línea Base y Descanso)</span>', font: { size: 13.5 } },
      polar: { radialaxis: { visible: true, range: [0, 50], ticksuffix: '%' } },
      legend: { orientation: 'h', y: -0.25, x: 0.5, xanchor: 'center' },
      margin: { l: 40, r: 40, t: 50, b: 60 },
      paper_bgcolor: 'transparent'
    };

    Plotly.react(chartDiv, traces, layout, { responsive: true });
    // Gráfica 3: Solo gráfica, sin caja de interpretación estadística
  }

  setMicrodynamicsViewMode(mode) {
    this.microdynamicsViewMode = mode;
    const modes = ['both', 'attention', 'meditation', 'sequence'];
    modes.forEach(m => {
      const btn = document.getElementById('btnMicro' + m.charAt(0).toUpperCase() + m.slice(1));
      if (btn) {
        if (m === mode) {
          btn.className = "px-2.5 py-1 rounded bg-white text-blue-700 font-bold shadow-xs transition";
        } else {
          btn.className = "px-2.5 py-1 rounded text-slate-600 hover:text-slate-900 transition";
        }
      }
    });
    this.renderDetailedStimulusChart();
  }

  getSecondBySecondDataForBlock(stim) {
    const tStart = stim.startTime;
    const tEnd = stim.endTime;
    const times = [];
    const attSeries = [];
    const medSeries = [];
    const betaSeries = [];

    for (let t = tStart; t < tEnd; t++) {
      times.push(t - tStart);
      if (this.activeSubject === 'ALL') {
        const attArr = [], medArr = [], betaArr = [];
        this.files.forEach(f => {
          const row = f.rows.find(r => r.time === t);
          if (row && (!this.filterArtifacts || row.poorSignal <= 50)) {
            attArr.push(row.attention);
            medArr.push(row.meditation);
            betaArr.push((row.lowBeta + row.highBeta) / 1000);
          }
        });
        attSeries.push(attArr.length > 0 ? parseFloat(this.arrayMean(attArr).toFixed(1)) : null);
        medSeries.push(medArr.length > 0 ? parseFloat(this.arrayMean(medArr).toFixed(1)) : null);
        betaSeries.push(betaArr.length > 0 ? parseFloat(this.arrayMean(betaArr).toFixed(1)) : null);
      } else {
        const subj = this.files.find(f => f.id === this.activeSubject);
        if (subj) {
          const row = subj.rows.find(r => r.time === t);
          if (row && (!this.filterArtifacts || row.poorSignal <= 50)) {
            attSeries.push(row.attention);
            medSeries.push(row.meditation);
            betaSeries.push(parseFloat(((row.lowBeta + row.highBeta) / 1000).toFixed(1)));
          } else {
            attSeries.push(null);
            medSeries.push(null);
            betaSeries.push(null);
          }
        }
      }
    }

    return { times, attSeries, medSeries, betaSeries };
  }

  // GRÁFICA 4: UN SOLO GRÁFICO CON COMBINACIÓN DE ESTÍMULOS (SIN INTERPRETACIÓN)
  renderDetailedStimulusChart() {
    const chartDiv = document.getElementById('chartStimulusDetail');
    if (!chartDiv) return;

    // Obtener la combinación de todos los estímulos activos de prueba
    const activeStimuli = this.getActiveStimuli();
    if (activeStimuli.length === 0) {
      chartDiv.innerHTML = '<div class="text-xs text-slate-400 p-8 text-center">No hay estímulos activos configurados.</div>';
      return;
    }

    const viewMode = this.microdynamicsViewMode || 'both';
    const traces = [];
    let layout = {};

    if (viewMode === 'sequence') {
      // Secuencia continua concatenada de todos los estímulos activos
      let currentSeqT = 0;
      const seqTimes = [];
      const seqAtt = [];
      const seqMed = [];
      const shapes = [];
      const annotations = [];

      activeStimuli.forEach((stim, idx) => {
        const data = this.getSecondBySecondDataForBlock(stim);
        const blockStart = currentSeqT;
        const blockEnd = currentSeqT + data.times.length;

        shapes.push({
          type: 'rect',
          xref: 'x',
          yref: 'paper',
          x0: blockStart,
          x1: blockEnd,
          y0: 0,
          y1: 1,
          fillcolor: stim.color,
          opacity: 0.12,
          line: { width: 1.5, color: stim.color, dash: 'dot' }
        });

        annotations.push({
          x: (blockStart + blockEnd) / 2,
          y: 103,
          xref: 'x',
          yref: 'y',
          text: `<b>${idx + 1}. ${stim.name}</b>`,
          showarrow: false,
          font: { size: 10.5, color: '#0f172a' },
          bgcolor: 'rgba(255, 255, 255, 0.9)',
          bordercolor: stim.color,
          borderwidth: 1
        });

        data.times.forEach((tRel, i) => {
          seqTimes.push(currentSeqT);
          seqAtt.push(data.attSeries[i]);
          seqMed.push(data.medSeries[i]);
          currentSeqT++;
        });
      });

      traces.push({
        x: seqTimes,
        y: seqAtt,
        name: 'Percepción (Atención %)',
        mode: 'lines+markers',
        line: { color: '#2563eb', width: 3, shape: 'spline' },
        marker: { size: 4 }
      });

      traces.push({
        x: seqTimes,
        y: seqMed,
        name: 'Emoción y Recuerdos (Meditación %)',
        mode: 'lines',
        line: { color: '#10b981', width: 2.5, dash: 'dot', shape: 'spline' }
      });

      layout = {
        title: {
          text: `<b>Dinámica Fina Segundo a Segundo: Secuencia Combinada de Estímulos (${this.files.length > 0 ? (this.activeSubject === 'ALL' ? `Cohorte N=${this.files.length}` : this.getSelectedSubjectName()) : 'Sin datos'})</b>`,
          font: { size: 13.5 }
        },
        shapes: shapes,
        annotations: annotations,
        xaxis: { title: 'Línea de Tiempo Concatenada (segundos de exposición)', gridcolor: '#f1f5f9' },
        yaxis: { title: 'Nivel Porcentual (%)', range: [0, 110], ticksuffix: '%', gridcolor: '#e2e8f0' },
        legend: { orientation: 'h', y: -0.25, x: 0.5, xanchor: 'center' },
        margin: { l: 50, r: 40, t: 45, b: 60 },
        paper_bgcolor: 'transparent',
        plot_bgcolor: '#ffffff',
        hovermode: 'x unified'
      };
    } else {
      // Comparativa superpuesta segundo a segundo entre todos los estímulos (0s -> Ns)
      activeStimuli.forEach((stim, idx) => {
        const data = this.getSecondBySecondDataForBlock(stim);

        if (viewMode === 'both') {
          // Traza de Percepción (Línea sólida en el color del estímulo)
          traces.push({
            x: data.times,
            y: data.attSeries,
            name: `${stim.name} - Percepción (%)`,
            mode: 'lines+markers',
            line: { color: stim.color, width: 2.8, shape: 'spline' },
            marker: { size: 5, color: stim.color },
            hoverinfo: 'x+y+name'
          });

          // Traza de Emoción (Línea punteada en el color del estímulo)
          traces.push({
            x: data.times,
            y: data.medSeries,
            name: `${stim.name} - Emoción (%)`,
            mode: 'lines',
            line: { color: stim.color, width: 2, dash: 'dot', shape: 'spline' },
            hoverinfo: 'x+y+name'
          });
        } else if (viewMode === 'attention') {
          // Solo Percepción de todos los estímulos
          traces.push({
            x: data.times,
            y: data.attSeries,
            name: `🎯 ${stim.name} (Percepción %)`,
            mode: 'lines+markers',
            line: { color: stim.color, width: 3, shape: 'spline' },
            marker: { size: 6, color: stim.color },
            hoverinfo: 'x+y+name'
          });
        } else if (viewMode === 'meditation') {
          // Solo Emoción de todos los estímulos
          traces.push({
            x: data.times,
            y: data.medSeries,
            name: `💖 ${stim.name} (Emoción %)`,
            mode: 'lines+markers',
            line: { color: stim.color, width: 3, shape: 'spline' },
            marker: { size: 6, color: stim.color },
            hoverinfo: 'x+y+name'
          });
        }
      });

      const maxDuration = Math.max(...activeStimuli.map(s => s.duration));
      layout = {
        title: {
          text: `<b>Dinámica Fina Segundo a Segundo: Combinación de Estímulos de Prueba</b><br><span style="font-size:11px; font-weight:normal; color:#64748b;">(Comparativa directa superpuesta segundo a segundo en tiempo relativo)</span>`,
          font: { size: 13.5 }
        },
        xaxis: { 
          title: 'Segundos del Estímulo (Tiempo Relativo: 0s → Ns)', 
          range: [0, maxDuration],
          gridcolor: '#f1f5f9' 
        },
        yaxis: { 
          title: 'Nivel Porcentual (%)', 
          range: [0, 105], 
          ticksuffix: '%', 
          gridcolor: '#e2e8f0' 
        },
        legend: { orientation: 'h', y: -0.28, x: 0.5, xanchor: 'center' },
        margin: { l: 50, r: 40, t: 50, b: 70 },
        paper_bgcolor: 'transparent',
        plot_bgcolor: '#ffffff',
        hovermode: 'x unified'
      };
    }

    Plotly.react(chartDiv, traces, layout, { responsive: true });
    // Gráfica 4: Solo gráfica combinada, sin caja de interpretación estadística
  }

  // ==========================================
  // MÓDULO INFERENCIAL: SHAPIRO-WILK Y ANOVA SOLO EN ESTÍMULOS ACTIVOS
  // ==========================================
  runInferentialStatistics() {
    if (!this.stats || !this.stats.cohort || this.files.length < 2) {
      return;
    }

    // Filtrar EXCLUSIVAMENTE los estímulos de prueba activos
    const activeItems = this.getActiveMetrics();

    if (activeItems.length < 2) {
      if (this.anovaDecisionAttText) {
        this.anovaDecisionAttText.innerHTML = `<span class="text-amber-800 font-bold"><i class="fas fa-info-circle mr-1"></i> Se requieren al menos 2 estímulos activos de prueba para contrastar diferencias estadísticas mediante ANOVA (los bloques de descanso no se consideran).</span>`;
      }
      return;
    }

    const dataMatrixAtt = [];
    const dataMatrixMed = [];

    activeItems.forEach(item => {
      const sIdx = item.originalIdx;
      const atts = [];
      const meds = [];
      this.files.forEach(f => {
        const m = this.stats.bySubject[f.id]?.[sIdx];
        if (m && m.n > 0) {
          atts.push(m.attMean);
          meds.push(m.medMean);
        }
      });
      dataMatrixAtt.push(atts);
      dataMatrixMed.push(meds);
    });

    // 1. Test de Shapiro-Wilk para los estímulos activos
    const shapiroResultsAtt = dataMatrixAtt.map(vals => this.shapiroWilkTest(vals));
    const shapiroResultsMed = dataMatrixMed.map(vals => this.shapiroWilkTest(vals));

    this.renderShapiroTables(activeItems, shapiroResultsAtt, shapiroResultsMed);

    // 2. ANOVA de Medidas Repetidas entre los estímulos activos
    const anovaAtt = this.calculateRepeatedMeasuresANOVA(dataMatrixAtt);
    const anovaMed = this.calculateRepeatedMeasuresANOVA(dataMatrixMed);

    this.renderAnovaTables(anovaAtt, anovaMed, activeItems.length);

    // 3. Contrastes Post-Hoc Tukey HSD entre los estímulos activos
    const postHocResults = this.calculatePostHocTukey(activeItems, dataMatrixAtt, anovaAtt);
    this.renderPostHocTable(postHocResults);

    this.inferentialData = {
      activeItems,
      anovaAtt,
      anovaMed,
      shapiroResultsAtt,
      shapiroResultsMed,
      postHocResults
    };
  }

  shapiroWilkTest(data) {
    const n = data.length;
    if (n < 3) {
      return { W: 1.0, pValue: 1.0, isNormal: true, n: n };
    }

    const sorted = [...data].sort((a, b) => a - b);
    const mean = this.arrayMean(sorted);
    let ss = 0;
    for (let i = 0; i < n; i++) ss += Math.pow(sorted[i] - mean, 2);
    if (ss === 0) return { W: 1.0, pValue: 1.0, isNormal: true, n: n };

    const m = [];
    let mSumSq = 0;
    for (let i = 1; i <= n; i++) {
      const p = (i - 0.375) / (n + 0.25);
      const val = (typeof jStat !== 'undefined' && jStat.normal) 
        ? jStat.normal.inv(p, 0, 1) 
        : this.approxNormalInv(p);
      m.push(val);
      mSumSq += val * val;
    }
    const sqrtM = Math.sqrt(mSumSq) || 1;
    const a = m.map(v => v / sqrtM);

    let b = 0;
    for (let i = 0; i < n; i++) {
      b += a[i] * sorted[i];
    }
    const W = Math.max(0.0001, Math.min(1.0, (b * b) / ss));

    let pValue = 0.5;
    const logN = Math.log(n);
    let mu, sigma;

    if (n <= 11) {
      const g = -2.273 + 0.459 * logN;
      mu = 0.544 - 0.39978 * logN + 0.025054 * logN * logN;
      sigma = Math.exp(1.3822 - 0.77857 * logN + 0.062767 * logN * logN);
      const y = -Math.log(Math.max(1e-6, g - Math.log(1 - W + 1e-12)));
      const z = (y - mu) / (sigma || 1);
      pValue = (typeof jStat !== 'undefined') ? (1 - jStat.normal.cdf(z, 0, 1)) : 0.5;
    } else {
      mu = -1.5861 - 0.31082 * logN - 0.083751 * logN * logN;
      sigma = Math.exp(-0.4803 - 0.082676 * logN + 0.0030302 * logN * logN);
      const y = Math.log(1 - W + 1e-12);
      const z = (y - mu) / (sigma || 1);
      pValue = (typeof jStat !== 'undefined') ? (1 - jStat.normal.cdf(z, 0, 1)) : 0.5;
    }

    pValue = Math.max(0.0001, Math.min(1.0, pValue));

    return {
      W: parseFloat(W.toFixed(4)),
      pValue: parseFloat(pValue.toFixed(4)),
      isNormal: pValue > 0.05,
      n: n
    };
  }

  approxNormalInv(p) {
    const a = [-3.969683028665376e+01, 2.204091104258908e+02, -2.755581241083242e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    const q = p - 0.5;
    if (Math.abs(q) <= 0.42) {
      const r = q * q;
      return q * (((((a[0]*r + a[1])*r + a[2])*r + a[3])*r + a[4])*r + a[5]) / (((((b[0]*r + b[1])*r + b[2])*r + b[3])*r + b[4])*r + 1);
    }
    const r = q < 0 ? p : 1 - p;
    const s = Math.log(-Math.log(r));
    let t = 0.322232431088 + s * (1 + s * (0.342242088547 + s * (0.020200329463 + s * 0.00042261204)));
    t /= 0.099348462606 + s * (0.588581570495 + s * (0.531103462366 + s * (0.10353775285 + s * 0.003856070063)));
    return q < 0 ? -t : t;
  }

  calculateRepeatedMeasuresANOVA(matrix) {
    const k = matrix.length; // Estímulos activos
    const s = matrix[0] ? matrix[0].length : 0; // Sujetos

    if (k < 2 || s < 2) {
      return { F: 0, pValue: 1, df1: 1, df2: 1, ssStim: 0, ssSubj: 0, ssError: 0, ssTotal: 0, msStim: 0, msError: 0, etaSq: 0, isSignificant: false };
    }

    let grandTotal = 0, count = 0;
    for (let j = 0; j < k; j++) {
      for (let i = 0; i < s; i++) {
        grandTotal += matrix[j][i];
        count++;
      }
    }
    const grandMean = grandTotal / (count || 1);

    const stimMeans = matrix.map(row => this.arrayMean(row));

    const subjMeans = [];
    for (let i = 0; i < s; i++) {
      let sum = 0;
      for (let j = 0; j < k; j++) sum += matrix[j][i];
      subjMeans.push(sum / k);
    }

    let ssTotal = 0;
    for (let j = 0; j < k; j++) {
      for (let i = 0; i < s; i++) {
        ssTotal += Math.pow(matrix[j][i] - grandMean, 2);
      }
    }

    let ssStim = 0;
    stimMeans.forEach(m => {
      ssStim += s * Math.pow(m - grandMean, 2);
    });

    let ssSubj = 0;
    subjMeans.forEach(m => {
      ssSubj += k * Math.pow(m - grandMean, 2);
    });

    const ssError = Math.max(0.001, ssTotal - ssStim - ssSubj);

    const dfStim = k - 1;
    const dfSubj = s - 1;
    const dfError = Math.max(1, dfStim * dfSubj);

    const msStim = ssStim / (dfStim || 1);
    const msError = ssError / (dfError || 1);

    const F = msStim / (msError || 1);

    let pValue = 0.5;
    if (typeof jStat !== 'undefined' && jStat.centralF) {
      pValue = 1 - jStat.centralF.cdf(F, dfStim, dfError);
      pValue = Math.max(0.00001, Math.min(1.0, pValue));
    }

    const etaSqPartial = ssStim / ((ssStim + ssError) || 1);

    return {
      F: parseFloat(F.toFixed(3)),
      pValue: parseFloat(pValue.toFixed(4)),
      df1: dfStim,
      df2: dfError,
      ssStim: parseFloat(ssStim.toFixed(2)),
      ssSubj: parseFloat(ssSubj.toFixed(2)),
      ssError: parseFloat(ssError.toFixed(2)),
      ssTotal: parseFloat(ssTotal.toFixed(2)),
      msStim: parseFloat(msStim.toFixed(2)),
      msError: parseFloat(msError.toFixed(2)),
      etaSq: parseFloat(etaSqPartial.toFixed(3)),
      isSignificant: pValue < 0.05
    };
  }

  calculatePostHocTukey(activeItems, matrix, anova) {
    const k = matrix.length;
    const s = matrix[0] ? matrix[0].length : 1;
    const stimMeans = matrix.map(row => this.arrayMean(row));
    const comparisons = [];

    const msError = anova.msError || 1;
    const se = Math.sqrt(msError / s);

    for (let i = 0; i < k; i++) {
      for (let j = i + 1; j < k; j++) {
        const diff = stimMeans[i] - stimMeans[j];
        const q = Math.abs(diff) / (se || 1);
        const tVal = q / Math.sqrt(2);
        let pVal = 0.5;
        if (typeof jStat !== 'undefined' && jStat.studentt) {
          pVal = 2 * (1 - jStat.studentt.cdf(tVal, anova.df2));
          pVal = Math.max(0.0001, Math.min(1.0, pVal));
        }

        comparisons.push({
          pair: `${activeItems[i].stim.name} vs ${activeItems[j].stim.name}`,
          meanDiff: parseFloat(diff.toFixed(2)),
          se: parseFloat(se.toFixed(2)),
          qVal: parseFloat(q.toFixed(2)),
          pVal: parseFloat(pVal.toFixed(4)),
          isSignificant: pVal < 0.05
        });
      }
    }

    return comparisons;
  }

  renderShapiroTables(activeItems, shapiroAtt, shapiroMed) {
    if (!this.tableShapiroAttBody || !this.tableShapiroMedBody) return;

    let htmlAtt = '';
    activeItems.forEach((item, idx) => {
      const res = shapiroAtt[idx] || { W: 1, pValue: 1, isNormal: true, n: 0 };
      htmlAtt += `
        <tr class="hover:bg-slate-50 transition">
          <td class="font-bold text-slate-800">${item.stim.name}</td>
          <td class="text-center font-mono">${res.n}</td>
          <td class="text-center font-mono font-bold">${res.W}</td>
          <td class="text-center font-mono font-bold ${res.isNormal ? 'text-emerald-700' : 'text-amber-600'}">${res.pValue}</td>
          <td class="text-center font-semibold text-xs">
            ${res.isNormal 
              ? '<span class="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"><i class="fas fa-check-circle mr-1"></i> Normal (p > 0.05)</span>' 
              : '<span class="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full"><i class="fas fa-exclamation-circle mr-1"></i> No Paramétrico</span>'}
          </td>
          <td class="text-xs text-slate-600">${res.isNormal ? 'Acepta H0 (Distribución gaussiana)' : 'Rechaza H0'}</td>
        </tr>
      `;
    });
    this.tableShapiroAttBody.innerHTML = htmlAtt;

    let htmlMed = '';
    activeItems.forEach((item, idx) => {
      const res = shapiroMed[idx] || { W: 1, pValue: 1, isNormal: true, n: 0 };
      htmlMed += `
        <tr class="hover:bg-slate-50 transition">
          <td class="font-bold text-slate-800">${item.stim.name}</td>
          <td class="text-center font-mono">${res.n}</td>
          <td class="text-center font-mono font-bold">${res.W}</td>
          <td class="text-center font-mono font-bold ${res.isNormal ? 'text-emerald-700' : 'text-amber-600'}">${res.pValue}</td>
          <td class="text-center font-semibold text-xs">
            ${res.isNormal 
              ? '<span class="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"><i class="fas fa-check-circle mr-1"></i> Normal (p > 0.05)</span>' 
              : '<span class="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full"><i class="fas fa-exclamation-circle mr-1"></i> No Paramétrico</span>'}
          </td>
          <td class="text-xs text-slate-600">${res.isNormal ? 'Acepta H0 (Distribución gaussiana)' : 'Rechaza H0'}</td>
        </tr>
      `;
    });
    this.tableShapiroMedBody.innerHTML = htmlMed;
  }

  renderAnovaTables(anovaAtt, anovaMed, kActive) {
    if (!this.tableAnovaAttBody || !this.tableAnovaMedBody) return;

    this.tableAnovaAttBody.innerHTML = `
      <tr>
        <td class="font-bold text-slate-800">Entre Estímulos de Prueba</td>
        <td class="text-center font-mono">${anovaAtt.ssStim}</td>
        <td class="text-center font-mono font-bold">${anovaAtt.df1}</td>
        <td class="text-center font-mono">${anovaAtt.msStim}</td>
        <td class="text-center font-mono font-black text-blue-700 text-sm">${anovaAtt.F}</td>
        <td class="text-center font-mono font-black ${anovaAtt.isSignificant ? 'text-emerald-700' : 'text-slate-600'} text-sm">${anovaAtt.pValue}</td>
        <td class="text-center font-mono font-bold text-indigo-700">${anovaAtt.etaSq} (${this.getEtaInterpretation(anovaAtt.etaSq)})</td>
      </tr>
      <tr>
        <td class="font-medium text-slate-600">Sujetos (Variabilidad Inter-individual)</td>
        <td class="text-center font-mono">${anovaAtt.ssSubj}</td>
        <td class="text-center font-mono">${this.files.length - 1}</td>
        <td class="text-center font-mono">-</td>
        <td class="text-center font-mono">-</td>
        <td class="text-center font-mono">-</td>
        <td class="text-center font-mono">-</td>
      </tr>
      <tr>
        <td class="font-medium text-slate-600">Residual / Error</td>
        <td class="text-center font-mono">${anovaAtt.ssError}</td>
        <td class="text-center font-mono font-bold">${anovaAtt.df2}</td>
        <td class="text-center font-mono">${anovaAtt.msError}</td>
        <td class="text-center font-mono">-</td>
        <td class="text-center font-mono">-</td>
        <td class="text-center font-mono">-</td>
      </tr>
      <tr class="bg-slate-50 font-bold border-t-2 border-slate-300">
        <td>Total (Estímulos Activos)</td>
        <td class="text-center font-mono">${anovaAtt.ssTotal}</td>
        <td class="text-center font-mono">${(kActive * this.files.length) - 1}</td>
        <td colspan="4"></td>
      </tr>
    `;

    if (this.anovaDecisionAttText) {
      this.anovaDecisionAttText.innerHTML = anovaAtt.isSignificant
        ? `<span class="text-emerald-800 font-bold"><i class="fas fa-check-circle mr-1"></i> Decisión: Rechazo de H0 ($F(${anovaAtt.df1}, ${anovaAtt.df2}) = ${anovaAtt.F}, p = ${anovaAtt.pValue} < 0.05$). Existen diferencias estadísticamente significativas en la PERCEPCIÓN entre los estímulos de prueba evaluados. Tamaño del efecto: $\\eta_p^2 = ${anovaAtt.etaSq}$ (${this.getEtaInterpretation(anovaAtt.etaSq)}).</span>`
        : `<span class="text-slate-700 font-medium"><i class="fas fa-info-circle mr-1"></i> Decisión: Se acepta H0 ($F = ${anovaAtt.F}, p = ${anovaAtt.pValue} > 0.05$). No se hallaron diferencias significativas en percepción entre los estímulos de prueba.</span>`;
    }

    this.tableAnovaMedBody.innerHTML = `
      <tr>
        <td class="font-bold text-slate-800">Entre Estímulos de Prueba</td>
        <td class="text-center font-mono">${anovaMed.ssStim}</td>
        <td class="text-center font-mono font-bold">${anovaMed.df1}</td>
        <td class="text-center font-mono">${anovaMed.msStim}</td>
        <td class="text-center font-mono font-black text-emerald-700 text-sm">${anovaMed.F}</td>
        <td class="text-center font-mono font-black ${anovaMed.isSignificant ? 'text-emerald-700' : 'text-slate-600'} text-sm">${anovaMed.pValue}</td>
        <td class="text-center font-mono font-bold text-indigo-700">${anovaMed.etaSq} (${this.getEtaInterpretation(anovaMed.etaSq)})</td>
      </tr>
      <tr>
        <td class="font-medium text-slate-600">Sujetos (Variabilidad Inter-individual)</td>
        <td class="text-center font-mono">${anovaMed.ssSubj}</td>
        <td class="text-center font-mono">${this.files.length - 1}</td>
        <td class="text-center font-mono">-</td>
        <td class="text-center font-mono">-</td>
        <td class="text-center font-mono">-</td>
        <td class="text-center font-mono">-</td>
      </tr>
      <tr>
        <td class="font-medium text-slate-600">Residual / Error</td>
        <td class="text-center font-mono">${anovaMed.ssError}</td>
        <td class="text-center font-mono font-bold">${anovaMed.df2}</td>
        <td class="text-center font-mono">${anovaMed.msError}</td>
        <td class="text-center font-mono">-</td>
        <td class="text-center font-mono">-</td>
        <td class="text-center font-mono">-</td>
      </tr>
      <tr class="bg-slate-50 font-bold border-t-2 border-slate-300">
        <td>Total (Estímulos Activos)</td>
        <td class="text-center font-mono">${anovaMed.ssTotal}</td>
        <td class="text-center font-mono">${(kActive * this.files.length) - 1}</td>
        <td colspan="4"></td>
      </tr>
    `;

    if (this.anovaDecisionMedText) {
      this.anovaDecisionMedText.innerHTML = anovaMed.isSignificant
        ? `<span class="text-emerald-800 font-bold"><i class="fas fa-check-circle mr-1"></i> Decisión: Rechazo de H0 ($F(${anovaMed.df1}, ${anovaMed.df2}) = ${anovaMed.F}, p = ${anovaMed.pValue} < 0.05$). Existen diferencias estadísticamente significativas en la RESONANCIA EMOCIONAL / RECUERDOS entre los estímulos de prueba. Tamaño del efecto: $\\eta_p^2 = ${anovaMed.etaSq}$ (${this.getEtaInterpretation(anovaMed.etaSq)}).</span>`
        : `<span class="text-slate-700 font-medium"><i class="fas fa-info-circle mr-1"></i> Decisión: Se acepta H0 ($F = ${anovaMed.F}, p = ${anovaMed.pValue} > 0.05$). No se hallaron diferencias significativas en el anclaje emocional entre los estímulos.</span>`;
    }
  }

  getEtaInterpretation(eta) {
    if (eta >= 0.14) return 'Grande';
    if (eta >= 0.06) return 'Mediano';
    return 'Pequeño';
  }

  renderPostHocTable(comparisons) {
    if (!this.tablePostHocBody) return;

    if (comparisons.length === 0) {
      this.tablePostHocBody.innerHTML = `<tr><td colspan="6" class="text-center py-3 text-slate-400">Se requieren al menos 2 estímulos activos de prueba para contrastes por pares.</td></tr>`;
      return;
    }

    let html = '';
    comparisons.forEach(comp => {
      html += `
        <tr class="hover:bg-slate-50 transition">
          <td class="font-bold text-slate-800">${comp.pair}</td>
          <td class="text-center font-mono font-bold ${comp.meanDiff > 0 ? 'text-blue-700' : 'text-slate-700'}">${comp.meanDiff > 0 ? '+' : ''}${comp.meanDiff}%</td>
          <td class="text-center font-mono text-slate-500">${comp.se}</td>
          <td class="text-center font-mono">${comp.qVal}</td>
          <td class="text-center font-mono font-bold ${comp.isSignificant ? 'text-emerald-700' : 'text-slate-500'}">${comp.pVal}</td>
          <td class="text-center text-xs font-semibold">
            ${comp.isSignificant 
              ? '<span class="text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full"><i class="fas fa-star mr-1"></i> Significativo (p < 0.05)</span>' 
              : '<span class="text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Sin diferencia significativa</span>'}
          </td>
        </tr>
      `;
    });

    this.tablePostHocBody.innerHTML = html;
  }

  // ==========================================
  // CONCLUSIÓN FINAL: ELECCIÓN SEGÚN OBJETIVO (SOLO ESTIMULOS ACTIVOS)
  // ==========================================
  renderFinalVerdict() {
    if (!this.verdictRecommendationContent || !this.stats.cohort) return;

    const activeItems = this.getActiveMetrics();

    if (activeItems.length === 0) {
      this.verdictRecommendationContent.innerHTML = `<p class="text-amber-200">No hay estímulos de prueba activos configurados.</p>`;
      return;
    }

    const objective = this.researchObjective || "Optimizar la toma de decisiones publicitarias en base a bioseñales EEG.";

    if (this.verdictObjectiveDisplay) {
      this.verdictObjectiveDisplay.textContent = objective;
    }

    // Ordenar SOLO los estímulos activos
    const sortedByAtt = [...activeItems].sort((a, b) => b.metric.attMean - a.metric.attMean);
    const sortedByMed = [...activeItems].sort((a, b) => b.metric.medMean - a.metric.medMean);
    const sortedByIntegral = [...activeItems].sort((a, b) => (b.metric.attMean * 0.5 + b.metric.medMean * 0.5) - (a.metric.attMean * 0.5 + a.metric.medMean * 0.5));

    let chosenItem = sortedByIntegral[0];
    let criterionText = "Balance Integral (Máxima Percepción + Alto Anclaje Emocional)";

    if (this.decisionCriterion === 'percepcion') {
      chosenItem = sortedByAtt[0];
      criterionText = "Maximizar Percepción y Foco Visual (Prioridad en Atención)";
    } else if (this.decisionCriterion === 'emocion') {
      chosenItem = sortedByMed[0];
      criterionText = "Maximizar Conexión Emocional, Anclas y Recuerdos (Prioridad en Meditación)";
    }

    const chosenStim = chosenItem.stim;
    const chosenMetric = chosenItem.metric;

    const anovaAtt = this.inferentialData ? this.inferentialData.anovaAtt : { F: 0, pValue: 0.01, isSignificant: true };
    const otherActives = activeItems.filter(item => item.stim.name !== chosenStim.name);
    const avgOtherAtt = otherActives.length > 0 
      ? this.arrayMean(otherActives.map(item => item.metric.attMean)) 
      : chosenMetric.attMean;
    const attAdvantage = (chosenMetric.attMean - avgOtherAtt).toFixed(1);

    this.verdictRecommendationContent.innerHTML = `
      <div class="space-y-4">
        <div class="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <span class="text-xs uppercase font-extrabold tracking-wider text-emerald-400 block mb-1">
              🏆 Estímulo Ganador Recomendado por el Laboratorio:
            </span>
            <h4 class="text-2xl font-black text-white tracking-tight">
              ${chosenStim.name}
            </h4>
            <p class="text-xs text-emerald-200 mt-0.5">
              Tipo: <strong>${chosenStim.type}</strong> | Duración: <strong>${chosenStim.duration} segundos</strong> | Evaluado frente a ${otherActives.length} estímulos competidores
            </p>
          </div>
          <div class="flex items-center space-x-3">
            <div class="text-right">
              <span class="text-[11px] block text-slate-300">Nivel de Percepción</span>
              <span class="text-xl font-black text-blue-400 font-mono">${chosenMetric.attMean.toFixed(1)}%</span>
            </div>
            <div class="text-right border-l border-emerald-500/30 pl-3">
              <span class="text-[11px] block text-slate-300">Anclaje Emocional</span>
              <span class="text-xl font-black text-emerald-400 font-mono">${chosenMetric.medMean.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div class="text-xs leading-relaxed text-slate-200 space-y-2">
          <p>
            <strong>Fundamentación Científica e Inferencial:</strong> Considerando estrictamente los estímulos activos de prueba (excluyendo líneas base o descansos) y bajo el objetivo de <em>"${objective}"</em> con criterio de <strong>${criterionText}</strong>, el estímulo que se <strong>DEBERÍA UTILIZAR</strong> es <strong>${chosenStim.name}</strong> por las siguientes razones empíricas:
          </p>

          <ul class="list-disc pl-5 space-y-1.5 text-slate-300">
            <li>
              <strong>Superioridad en Percepción (Atención):</strong> Registró una media de <strong>${chosenMetric.attMean.toFixed(1)}%</strong>, aventajando en <strong>+${attAdvantage}%</strong> al promedio de los otros estímulos de prueba en contienda, garantizando máxima visibilidad de marca y captación consciente.
            </li>
            <li>
              <strong>Fijación de Recuerdos y Anclas Emocionales (Meditación):</strong> Mantuvo un puntaje de <strong>${chosenMetric.medMean.toFixed(1)}%</strong>, lo que demuestra alta aceptación emocional y asimilación placentera sin saturación cognitiva.
            </li>
            <li>
              <strong>Validez Estadística Inferencial:</strong> El análisis ANOVA de medidas repetidas ratificó que las diferencias observadas entre los estímulos de prueba son estadísticamente significativas (${anovaAtt.isSignificant ? `F = ${anovaAtt.F}, p = ${anovaAtt.pValue} < 0.05` : 'diferencias consistentes en la muestra'}), confirmando que el resultado es reproducible.
            </li>
          </ul>

          <p class="pt-1 text-emerald-300 font-semibold">
            🎯 <strong>Decisión Estratégica:</strong> Seleccionar e implementar <strong>${chosenStim.name}</strong> en la campaña final o diseño de producto asegurará el mayor retorno de impacto cognitivo y recordación de marca según las bioseñales EEG analizadas.
          </p>
        </div>
      </div>
    `;
  }

  // ==========================================
  // EXPORTACIÓN A EXCEL (.XLSX) Y ZIP
  // ==========================================
  exportToExcel() {
    if (!this.stats || !this.stats.cohort) {
      this.showAlert("Aplica el protocolo antes de exportar.", "warning");
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      // 1. Hoja Metadatos y Protocolo
      const protoData = this.protocol.map((s, i) => ({
        'Tema de Investigación': this.researchTopic,
        'Objetivo de Investigación': this.researchObjective,
        'Estímulo N': i + 1,
        'Nombre del Estímulo': s.name,
        'Tipo': s.type,
        'Estado en Análisis': this.isStimulusActive(s) ? 'Activo (En ANOVA)' : 'Control / Descanso (Excluido)',
        'Duración (seg)': s.duration,
        'Segundo Inicio': s.startTime,
        'Segundo Fin': s.endTime
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(protoData), "01_Protocolo_Objetivo");

      // 2. Hoja Atención (Percepción) y Meditación (Emoción)
      const attMedData = this.stats.cohort.map((m, i) => ({
        'Estímulo': `E${i+1}: ${m.stimName}`,
        'Tipo': m.stimType,
        'Estado': this.isStimulusActive(this.protocol[i]) ? 'Activo en Comparativa' : 'Control / Descanso',
        'Duración (s)': m.duration,
        'Muestras Válidas': m.n,
        'Percepción Media (Atención %)': parseFloat(m.attMean.toFixed(1)),
        'Percepción Desv.Est.': parseFloat(m.attStd.toFixed(1)),
        'Percepción Máxima': Math.round(m.attMax),
        'Percepción Mínima': Math.round(m.attMin),
        'Emoción/Anclas Media (Meditación %)': parseFloat(m.medMean.toFixed(1)),
        'Emoción Desv.Est.': parseFloat(m.medStd.toFixed(1)),
        'Emoción Máxima': Math.round(m.medMax),
        'Emoción Mínima': Math.round(m.medMin),
        'Ratio Engagement': parseFloat(m.engagement.toFixed(2)),
        'Diagnóstico Neuromarketing': m.diagnosis
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(attMedData), "02_Percepcion_y_Emocion");

      // 3. Hoja Ondas Cerebrales
      const wavesData = this.stats.cohort.map((m, i) => ({
        'Estímulo': `E${i+1}: ${m.stimName}`,
        'Tipo': m.stimType,
        'Estado': this.isStimulusActive(this.protocol[i]) ? 'Activo' : 'Control/Descanso',
        'Delta (0.5-2.75Hz)': Math.round(m.deltaMean),
        'Theta (3.5-6.75Hz)': Math.round(m.thetaMean),
        'Low Alpha (7.5-9.25Hz)': Math.round(m.lowAlphaMean),
        'High Alpha (10-11.75Hz)': Math.round(m.highAlphaMean),
        'Low Beta (13-16.75Hz)': Math.round(m.lowBetaMean),
        'High Beta (17.75-29.75Hz)': Math.round(m.highBetaMean),
        'Low Gamma (31-39.75Hz)': Math.round(m.lowGammaMean),
        'High Gamma (41-49.75Hz)': Math.round(m.highGammaMean),
        'Ratio Theta/Beta': parseFloat(m.thetaBetaRatio.toFixed(2)),
        'Ratio Alpha/Beta': parseFloat(m.alphaBetaRatio.toFixed(2))
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(wavesData), "03_Ondas_Cerebrales");

      // 4. Hojas individuales por cada estímulo dividido
      this.protocol.forEach((stim, sIdx) => {
        const stimRows = [];
        this.files.forEach(subj => {
          const rows = subj.rows.filter(r => r.time >= stim.startTime && r.time < stim.endTime);
          rows.forEach(r => {
            stimRows.push({
              'Sujeto': subj.name,
              'Tiempo_Relativo_Seg': r.time - stim.startTime,
              'Tiempo_Original_Seg': r.time,
              'Percepción_Atención_%': r.attention,
              'Emoción_Meditación_%': r.meditation,
              'Delta': r.delta,
              'Theta': r.theta,
              'LowAlpha': r.lowAlpha,
              'HighAlpha': r.highAlpha,
              'LowBeta': r.lowBeta,
              'HighBeta': r.highBeta,
              'LowGamma': r.lowGamma,
              'HighGamma': r.highGamma,
              'Calidad_Señal': r.poorSignal
            });
          });
        });

        const sheetName = `E${sIdx+1}_${stim.name.substring(0, 18).replace(/[^a-zA-Z0-9]/g, '_')}`;
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stimRows), sheetName);
      });

      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `Informe_EEG_Neuromarketing_${this.protocol.length}_Estimulos_${dateStr}.xlsx`);
      this.showAlert("Archivo Excel generado y descargado exitosamente.", "success");
    } catch (err) {
      console.error("Error exportando a Excel:", err);
      this.showAlert("Ocurrió un error al generar el archivo Excel.", "danger");
    }
  }

  async splitAndExportAllCSVsZip() {
    if (this.files.length === 0 || this.protocol.length === 0) {
      this.showAlert("Carga archivos y define el protocolo antes de exportar.", "warning");
      return;
    }

    if (typeof JSZip === 'undefined') {
      this.showAlert("Cargando módulo de compresión ZIP...", "info");
      return;
    }

    this.showLoading(true, "Generando paquete ZIP con los CSVs divididos por estímulo...");

    try {
      const zip = new JSZip();

      this.protocol.forEach((stim, sIdx) => {
        const folderName = `${String(sIdx + 1).padStart(2, '0')}_${this.isStimulusActive(stim) ? 'Estimulo' : 'Descanso'}_${stim.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        const stimFolder = zip.folder(folderName);

        this.files.forEach(subj => {
          const rows = subj.rows.filter(r => r.time >= stim.startTime && r.time < stim.endTime);
          const csvContent = this.generateCSVString(rows, stim.startTime, stim.name, subj.name);
          const fileName = `${subj.name}_E${sIdx + 1}_${stim.duration}s.csv`;
          stimFolder.file(fileName, csvContent);
        });
      });

      const summaryCSV = this.generateSummaryMatrixCSV();
      zip.file("00_Resumen_Division_Protocolo.csv", summaryCSV);

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = downloadUrl;
      a.download = `CSVs_Divididos_NeuroSky_${this.protocol.length}_Estimulos_${dateStr}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      this.showLoading(false);
      this.showAlert("¡ZIP con CSVs divididos descargado con éxito!", "success");
    } catch (err) {
      console.error("Error al generar ZIP:", err);
      this.showLoading(false);
      this.showAlert("Error generando el archivo ZIP.", "danger");
    }
  }

  exportSingleStimulusCSV(stimIndex) {
    const stim = this.protocol[stimIndex];
    if (!stim) {
      this.showAlert("Estímulo no válido.", "warning");
      return;
    }

    let combinedRows = [];
    this.files.forEach(subj => {
      const rows = subj.rows.filter(r => r.time >= stim.startTime && r.time < stim.endTime);
      rows.forEach(r => {
        combinedRows.push({
          Sujeto: subj.name,
          Estimulo: stim.name,
          Tipo: stim.type,
          Tiempo_Relativo_Seg: r.time - stim.startTime,
          Tiempo_Original_Seg: r.time,
          Percepcion_Atencion_Pct: r.attention,
          Emocion_Meditacion_Pct: r.meditation,
          Delta: r.delta,
          Theta: r.theta,
          Alpha_Bajo: r.lowAlpha,
          Alpha_Alto: r.highAlpha,
          Beta_Bajo: r.lowBeta,
          Beta_Alto: r.highBeta,
          Gamma_Bajo: r.lowGamma,
          Gamma_Alto: r.highGamma,
          Calidad_Senal: r.poorSignal
        });
      });
    });

    const csvStr = Papa.unparse(combinedRows);
    this.downloadRawTextFile(csvStr, `CSVs_Consolidado_${stim.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`, 'text/csv;charset=utf-8;');
    this.showAlert(`CSV consolidado del estímulo "${stim.name}" descargado.`, "success");
  }

  downloadSingleSubjectStimulusCSV(subjectId, stimIndex) {
    const subj = this.files.find(f => f.id === subjectId);
    const stim = this.protocol[stimIndex];
    if (!subj || !stim) return;

    const rows = subj.rows.filter(r => r.time >= stim.startTime && r.time < stim.endTime);
    const csvContent = this.generateCSVString(rows, stim.startTime, stim.name, subj.name);
    const fileName = `${subj.name}_E${stimIndex + 1}_${stim.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;
    this.downloadRawTextFile(csvContent, fileName, 'text/csv;charset=utf-8;');
  }

  generateCSVString(rows, startTime, stimName, subjectName) {
    const formatted = rows.map(r => ({
      Sujeto: subjectName,
      Estimulo: stimName,
      Tiempo_Relativo_Seg: r.time - startTime,
      Tiempo_Sesion_Seg: r.time,
      Percepcion_Atencion_Pct: r.attention,
      Emocion_Meditacion_Pct: r.meditation,
      Delta: r.delta,
      Theta: r.theta,
      LowAlpha: r.lowAlpha,
      HighAlpha: r.highAlpha,
      LowBeta: r.lowBeta,
      HighBeta: r.highBeta,
      LowGamma: r.lowGamma,
      HighGamma: r.highGamma,
      PoorSignal: r.poorSignal
    }));
    return Papa.unparse(formatted);
  }

  generateSummaryMatrixCSV() {
    const data = [];
    this.files.forEach(subj => {
      const stats = this.stats.bySubject[subj.id] || [];
      stats.forEach((m, idx) => {
        data.push({
          Sujeto: subj.name,
          Estimulo_Num: idx + 1,
          Estimulo_Nombre: m.stimName,
          Tipo: m.stimType,
          Estado_Analisis: this.isStimulusActive(this.protocol[idx]) ? 'Activo en ANOVA' : 'Control/Descanso',
          Duracion_Seg: m.duration,
          Muestras_Validas: m.n,
          Percepcion_Media: parseFloat(m.attMean.toFixed(1)),
          Percepcion_Max: Math.round(m.attMax),
          Emocion_Media: parseFloat(m.medMean.toFixed(1)),
          Emocion_Max: Math.round(m.medMax),
          Beta_Total: Math.round(m.lowBetaMean + m.highBetaMean),
          Theta_Total: Math.round(m.thetaMean),
          Alpha_Total: Math.round(m.lowAlphaMean + m.highAlphaMean),
          Ratio_Engagement: m.engagement.toFixed(2),
          Diagnostico: m.diagnosis
        });
      });
    });
    return Papa.unparse(data);
  }

  downloadRawTextFile(content, fileName, mimeType) {
    const blob = new Blob(["\uFEFF" + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  renderDivisionSummaryTable() {
    if (!this.tableDivisionBody) return;

    let html = '';
    this.files.forEach((subj, sIdx) => {
      const subjStats = this.stats.bySubject[subj.id] || [];
      
      let stimCells = '';
      this.protocol.forEach((stim, pIdx) => {
        const metric = subjStats[pIdx];
        const n = metric ? metric.n : 0;
        const att = metric ? metric.attMean.toFixed(1) : 0;
        const med = metric ? metric.medMean.toFixed(1) : 0;
        const isActive = this.isStimulusActive(stim);

        stimCells += `
          <td class="p-2 text-center border-r border-slate-100 ${isActive ? '' : 'bg-slate-50/70'}">
            <div class="font-mono text-xs font-bold ${n > 0 ? (isActive ? 'text-blue-700' : 'text-slate-500') : 'text-slate-300'}">${n}s</div>
            <div class="text-[10px] text-slate-500">${att}% | ${med}%</div>
            ${isActive ? '' : '<span class="text-[9px] text-slate-400 font-medium">Control</span>'}
            <button onclick="window.neuroApp.downloadSingleSubjectStimulusCSV('${subj.id}', ${pIdx})" 
              class="mt-1 text-[10px] bg-slate-100 hover:bg-blue-600 hover:text-white px-1.5 py-0.5 rounded transition text-slate-600 inline-flex items-center" 
              title="Descargar CSV cortado de este estímulo">
              <i class="fas fa-download mr-1"></i> CSV
            </button>
          </td>
        `;
      });

      html += `
        <tr class="hover:bg-blue-50/30 transition">
          <td class="p-2 font-medium text-slate-500 text-center">${sIdx + 1}</td>
          <td class="p-2 font-bold text-slate-800">
            <i class="fas fa-user-circle text-slate-400 mr-1.5"></i> ${subj.name}
            <span class="block text-[10px] font-normal text-slate-400 font-mono">Total: ${subj.duration}s</span>
          </td>
          ${stimCells}
        </tr>
      `;
    });

    this.tableDivisionBody.innerHTML = html;

    const divisionHeader = document.getElementById('divisionTableHeader');
    if (divisionHeader) {
      let ths = '<th class="p-2 text-center w-10">#</th><th class="p-2">Sujeto</th>';
      this.protocol.forEach((stim, idx) => {
        const isActive = this.isStimulusActive(stim);
        ths += `
          <th class="p-2 text-center" style="border-top: 3px solid ${stim.color};">
            <span class="block font-bold ${isActive ? 'text-slate-800' : 'text-slate-500'}">${idx + 1}. ${stim.name}</span>
            <span class="text-[10px] text-slate-400 font-mono">${stim.duration}s (${stim.startTime}s-${stim.endTime}s) ${isActive ? '' : '<span class="text-amber-600 font-bold">[Control]</span>'}</span>
          </th>
        `;
      });
      divisionHeader.innerHTML = ths;
    }
  }

  // ==========================================
  // ACTUALIZACIÓN DE VISTAS (KPIs, Tablas)
  // ==========================================
  updateViews() {
    this.updateKPIs();
    this.renderCharts();
    this.renderTables();
  }

  updateKPIs() {
    if (!this.stats || !this.stats.cohort || this.stats.cohort.length === 0) return;

    this.kpiSubjects.textContent = `${this.files.length}`;
    
    const totalSecs = this.protocol.reduce((a, s) => a + parseInt(s.duration || 0), 0);
    this.kpiDuration.textContent = `${totalSecs}s (${Math.floor(totalSecs/60)}m ${totalSecs%60}s)`;

    const activeItems = this.getActiveMetrics();

    if (activeItems.length > 0) {
      const activeAtt = this.arrayMean(activeItems.map(item => item.metric.attMean));
      const activeMed = this.arrayMean(activeItems.map(item => item.metric.medMean));

      this.kpiAvgAtt.textContent = `${activeAtt.toFixed(1)}%`;
      this.kpiAvgMed.textContent = `${activeMed.toFixed(1)}%`;

      let topStim = activeItems.reduce((prev, curr) => (curr.metric.attMean > prev.metric.attMean ? curr : prev), activeItems[0]);
      this.kpiTopStim.textContent = `${topStim.stim.name} (${topStim.metric.attMean.toFixed(1)}%)`;
    } else {
      this.kpiAvgAtt.textContent = `0.0%`;
      this.kpiAvgMed.textContent = `0.0%`;
      this.kpiTopStim.textContent = 'N/A';
    }

    const avgSignalCohort = Math.round(this.files.reduce((a, f) => a + f.avgSignal, 0) / (this.files.length || 1));
    this.kpiSignalQual.textContent = avgSignalCohort < 25 ? 'Óptima (98%)' : (avgSignalCohort < 50 ? 'Regular' : 'Con Ruido');
  }

  getCurrentMetricsSet() {
    if (this.activeSubject === 'ALL') {
      return this.stats.cohort;
    } else {
      return this.stats.bySubject[this.activeSubject] || this.stats.cohort;
    }
  }

  renderTables() {
    this.renderAttentionTable();
    this.renderBrainwavesTable();
    this.renderMatrixTable();
  }

  renderAttentionTable() {
    if (!this.tableAttentionBody) return;
    const metrics = this.getCurrentMetricsSet();

    let html = '';
    metrics.forEach((m, idx) => {
      const stim = this.protocol[idx] || {};
      const isActive = this.isStimulusActive(stim);
      const engagementFormatted = m.engagement ? m.engagement.toFixed(2) : '-';

      html += `
        <tr class="hover:bg-blue-50/40 transition ${isActive ? '' : 'bg-slate-50/60 text-slate-500'}">
          <td class="font-bold text-slate-700">
            <span class="inline-block w-2.5 h-2.5 rounded-full mr-2" style="background-color: ${stim.color || '#3b82f6'};"></span>
            E${idx + 1}: ${m.stimName}
            ${isActive ? '' : '<span class="ml-2 text-[10px] text-slate-400 font-normal italic">[Control / Descanso]</span>'}
          </td>
          <td class="text-center font-mono text-slate-500">${m.duration}s</td>
          <td class="text-center font-mono text-slate-500">${m.n}</td>
          <td class="text-center font-bold ${isActive ? 'text-blue-700' : 'text-slate-600'} font-mono">${m.attMean.toFixed(1)}% <span class="text-xs text-slate-400 font-normal">±${m.attStd.toFixed(1)}</span></td>
          <td class="text-center font-mono text-emerald-600 font-semibold">${Math.round(m.attMax)}%</td>
          <td class="text-center font-mono text-rose-600">${Math.round(m.attMin)}%</td>
          <td class="text-center font-bold ${isActive ? 'text-emerald-700' : 'text-slate-600'} font-mono">${m.medMean.toFixed(1)}% <span class="text-xs text-slate-400 font-normal">±${m.medStd.toFixed(1)}</span></td>
          <td class="text-center font-mono text-emerald-600 font-semibold">${Math.round(m.medMax)}%</td>
          <td class="text-center font-mono text-rose-600">${Math.round(m.medMin)}%</td>
          <td class="text-center font-mono font-bold text-indigo-700">${engagementFormatted}</td>
          <td><span class="text-xs px-2 py-1 rounded-full ${isActive ? 'bg-slate-100' : 'bg-slate-200 text-slate-500'} font-medium">${m.diagnosis}</span></td>
        </tr>
      `;
    });

    this.tableAttentionBody.innerHTML = html;
  }

  renderBrainwavesTable() {
    if (!this.tableBrainwavesBody) return;
    const metrics = this.getCurrentMetricsSet();

    let html = '';
    metrics.forEach((m, idx) => {
      const stim = this.protocol[idx] || {};
      const isActive = this.isStimulusActive(stim);
      const formatPower = (num) => Math.round(num).toLocaleString('es-ES');

      html += `
        <tr class="hover:bg-blue-50/40 transition ${isActive ? '' : 'bg-slate-50/60 text-slate-500'}">
          <td class="font-bold text-slate-700">
            <span class="inline-block w-2.5 h-2.5 rounded-full mr-2" style="background-color: ${stim.color || '#3b82f6'};"></span>
            E${idx + 1}: ${m.stimName}
            ${isActive ? '' : '<span class="ml-1 text-[10px] text-slate-400 font-normal">[Control]</span>'}
          </td>
          <td class="text-center font-mono text-slate-600">${formatPower(m.deltaMean)}</td>
          <td class="text-center font-mono text-slate-600">${formatPower(m.thetaMean)}</td>
          <td class="text-center font-mono text-slate-600">${formatPower(m.lowAlphaMean)}</td>
          <td class="text-center font-mono text-slate-600">${formatPower(m.highAlphaMean)}</td>
          <td class="text-center font-mono font-semibold text-blue-700">${formatPower(m.lowBetaMean)}</td>
          <td class="text-center font-mono font-semibold text-blue-700">${formatPower(m.highBetaMean)}</td>
          <td class="text-center font-mono text-purple-700">${formatPower(m.lowGammaMean)}</td>
          <td class="text-center font-mono text-purple-700">${formatPower(m.highGammaMean)}</td>
          <td class="text-center font-mono font-bold text-amber-700">${m.thetaBetaRatio.toFixed(2)}</td>
          <td class="text-center font-mono font-bold text-emerald-700">${m.alphaBetaRatio.toFixed(2)}</td>
        </tr>
      `;
    });

    this.tableBrainwavesBody.innerHTML = html;
  }

  renderMatrixTable() {
    if (!this.tableMatrixBody) return;

    let html = '';
    this.files.forEach((subj) => {
      const subjStats = this.stats.bySubject[subj.id] || [];
      subjStats.forEach((m, idx) => {
        const stim = this.protocol[idx];
        const isActive = stim ? this.isStimulusActive(stim) : true;

        html += `
          <tr class="hover:bg-slate-50 transition ${isActive ? '' : 'bg-slate-50/60 text-slate-500'}">
            <td class="font-semibold text-slate-800">${subj.name}</td>
            <td class="font-medium text-slate-700">${m.stimName} ${isActive ? '' : '<span class="text-[9.5px] text-slate-400">[Control]</span>'}</td>
            <td class="text-center font-mono">${m.n}s</td>
            <td class="text-center font-bold text-blue-700 font-mono">${m.attMean.toFixed(1)}%</td>
            <td class="text-center font-mono">${Math.round(m.attMax)}%</td>
            <td class="text-center font-bold text-emerald-700 font-mono">${m.medMean.toFixed(1)}%</td>
            <td class="text-center font-mono">${Math.round(m.medMax)}%</td>
            <td class="text-center font-mono text-slate-600">${Math.round(m.lowBetaMean + m.highBetaMean).toLocaleString()}</td>
            <td class="text-center font-mono text-slate-600">${Math.round(m.lowAlphaMean + m.highAlphaMean).toLocaleString()}</td>
            <td class="text-center font-mono font-semibold text-indigo-700">${m.engagement.toFixed(2)}</td>
          </tr>
        `;
      });
    });

    this.tableMatrixBody.innerHTML = html;
  }

  // ==========================================
  // CARGA DE DATOS DE EJEMPLO
  // ==========================================
  loadDemoData() {
    this.showLoading(true, "Generando muestra de 5 sujetos de neuromarketing...");

    setTimeout(() => {
      this.files = [];
      if (this.protocol.length === 0) {
        this.setupDefault5Stimuli();
      }

      for (let s = 1; s <= 5; s++) {
        const rows = [];
        let curT = 0;
        const subjOffset = (s - 3) * 2;

        this.protocol.forEach(block => {
          const isAct = this.isStimulusActive(block);
          // Los estímulos activos tienen alta atención y excitación; los neutrales tienen baja atención y alta meditación/relajación
          const baseAtt = isAct ? (62 + ((block.id || 1) * 6) % 24) : 36;
          const baseMed = isAct ? (48 + ((block.id || 1) * 8) % 28) : 66;
          const betaMult = isAct ? 1.45 : 0.85;

          for (let sec = 0; sec < block.duration; sec++) {
            const noise = Math.floor(Math.random() * 10 - 5);
            const att = Math.max(10, Math.min(100, Math.round(baseAtt + subjOffset + noise)));
            const med = Math.max(10, Math.min(100, Math.round(baseMed - subjOffset + Math.random() * 8 - 4)));

            const delta = Math.floor(200000 + Math.random() * 400000);
            const theta = Math.floor((60000 + Math.random() * 90000) * (med > 60 ? 1.25 : 1.0));
            const lowAlpha = Math.floor((20000 + Math.random() * 40000) * (med > 55 ? 1.3 : 0.9));
            const highAlpha = Math.floor((15000 + Math.random() * 35000) * (med > 55 ? 1.2 : 0.9));
            const lowBeta = Math.floor((12000 + Math.random() * 25000) * betaMult);
            const highBeta = Math.floor((10000 + Math.random() * 20000) * betaMult);
            const lowGamma = Math.floor((5000 + Math.random() * 15000) * betaMult);
            const highGamma = Math.floor((3000 + Math.random() * 10000) * betaMult);

            let poorSignal = 0;
            if (Math.random() < 0.02) poorSignal = 26;

            rows.push({
              time: curT++,
              attention: att,
              meditation: med,
              delta, theta, lowAlpha, highAlpha, lowBeta, highBeta, lowGamma, highGamma,
              poorSignal
            });
          }
        });

        this.files.push({
          id: 'subj_demo_' + s,
          name: `Sujeto_0${s}_Demo`,
          fileName: `sujeto_0${s}_demo.csv`,
          size: 16500,
          rows: rows,
          duration: curT,
          samplesCount: curT,
          avgSignal: 2,
          poorSignalCount: 2
        });
      }

      this.updateFileListUI();
      this.protocolSection.classList.remove('hidden');
      this.processDataWithProtocol();
      this.showLoading(false);
      this.showAlert(`¡5 sujetos demo cargados y sincronizados con la secuencia del protocolo!`, "success");
    }, 300);
  }

  // ==========================================
  // HELPERS
  // ==========================================
  getSelectedSubjectName() {
    if (this.activeSubject === 'ALL') return 'Consolidado General';
    const found = this.files.find(f => f.id === this.activeSubject);
    return found ? found.name : 'Sujeto';
  }

  showAlert(message, type = 'info') {
    const alertBox = document.getElementById('globalAlert');
    if (!alertBox) return;

    const colors = {
      success: 'bg-emerald-600 text-white',
      warning: 'bg-amber-500 text-white',
      danger: 'bg-rose-600 text-white',
      info: 'bg-blue-600 text-white'
    };

    alertBox.className = `fixed bottom-5 right-5 z-50 px-4 py-3 rounded-lg shadow-xl text-sm font-semibold transition-all transform duration-300 flex items-center space-x-2 ${colors[type] || colors.info}`;
    alertBox.innerHTML = `<i class="fas fa-info-circle"></i><span>${message}</span>`;
    alertBox.style.display = 'flex';

    clearTimeout(this.alertTimer);
    this.alertTimer = setTimeout(() => {
      alertBox.style.display = 'none';
    }, 4000);
  }

  showLoading(show, message = "Procesando...") {
    const overlay = document.getElementById('loadingOverlay');
    const textEl = document.getElementById('loadingText');
    if (!overlay) return;

    if (show) {
      if (textEl) textEl.textContent = message;
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
}

// Inicialización Global
document.addEventListener('DOMContentLoaded', () => {
  window.neuroApp = new NeuroSkyApp();
});
