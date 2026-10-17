import { commonWords, quotes } from './words.js';
import { soundEngine } from './audio.js';
import { TypingChart } from './chart.js';

// Application State
const state = {
  mode: localStorage.getItem('monkey_mode') || 'time', // time, words, quote, zen
  modeVal: parseInt(localStorage.getItem('monkey_mode_val'), 10) || 30,
  punctuation: localStorage.getItem('monkey_punctuation') === 'true',
  numbers: localStorage.getItem('monkey_numbers') === 'true',
  theme: localStorage.getItem('monkey_theme') || 'serika-dark',
  sound: localStorage.getItem('monkey_sound') || 'off',

  // Active Test State
  words: [],
  currentWordIndex: 0,
  currentLetterIndex: 0,
  wordInputs: [], // Array of string typed for each word
  isTestRunning: false,
  isTestFinished: false,
  startTime: null,
  elapsedSeconds: 0,
  timerInterval: null,
  hudInterval: null,

  // Stats Counters
  historyPoints: [], // { second, wpm, rawWpm, errors }
  totalKeystrokes: 0,
  correctKeystrokes: 0,
  incorrectKeystrokes: 0,
  extraKeystrokes: 0,
  missedKeystrokes: 0,
  errorsThisSecond: 0,

  // Smooth scroll
  activeLine: 0
};

// DOM References
const elements = {
  app: document.getElementById('app'),
  wordsContainer: document.getElementById('words-container'),
  typingArena: document.getElementById('typing-arena'),
  hiddenInput: document.getElementById('hidden-input'),
  caret: document.getElementById('caret'),
  focusOverlay: document.getElementById('focus-overlay'),
  capsWarning: document.getElementById('caps-warning'),

  // HUD
  liveHud: document.getElementById('live-hud'),
  hudTimer: document.getElementById('hud-timer'),
  hudTimerLabel: document.getElementById('hud-timer-label'),
  hudLiveWpm: document.getElementById('hud-live-wpm'),
  hudLiveAcc: document.getElementById('hud-live-acc'),

  // Results
  resultsSection: document.getElementById('results-section'),
  arenaWrapper: document.getElementById('arena-wrapper'),
  resWpm: document.getElementById('res-wpm'),
  resAcc: document.getElementById('res-acc'),
  resRaw: document.getElementById('res-raw'),
  resChars: document.getElementById('res-chars'),
  resConsistency: document.getElementById('res-consistency'),
  resTime: document.getElementById('res-time'),
  resTestType: document.getElementById('res-test-type'),
  pbBadge: document.getElementById('pb-badge'),
  resultChartCanvas: document.getElementById('result-chart'),

  // Config Bar
  configBar: document.getElementById('config-bar'),
  cfgModifiers: document.getElementById('cfg-modifiers'),
  cfgMode: document.getElementById('cfg-mode'),
  cfgSubValues: document.getElementById('cfg-sub-values'),
  cfgSubDivider: document.getElementById('cfg-sub-divider'),
  optPunctuation: document.getElementById('cfg-opt-punctuation'),
  optNumbers: document.getElementById('cfg-opt-numbers'),

  // Buttons
  btnQuickRestart: document.getElementById('btn-quick-restart'),
  btnNextTest: document.getElementById('btn-next-test'),
  btnRepeatTest: document.getElementById('btn-repeat-test'),
  btnSound: document.getElementById('btn-sound'),
  soundLabel: document.getElementById('sound-label'),
  btnThemeModal: document.getElementById('btn-theme-modal'),
  themeLabel: document.getElementById('theme-label'),
  linkThemeName: document.getElementById('link-theme-name'),

  // Modals
  modalPalette: document.getElementById('modal-palette'),
  paletteSearch: document.getElementById('palette-search'),
  paletteResults: document.getElementById('palette-results'),
  btnCmdPalette: document.getElementById('btn-cmd-palette'),

  modalHistory: document.getElementById('modal-history'),
  btnHistoryModal: document.getElementById('btn-history-modal'),
  btnCloseHistory: document.getElementById('btn-close-history'),
  historyTableBody: document.getElementById('history-table-body'),
  pbTime15: document.getElementById('pb-time-15'),
  pbTime30: document.getElementById('pb-time-30'),
  pbTime60: document.getElementById('pb-time-60')
};

// Initialize Chart
const chart = new TypingChart(elements.resultChartCanvas);

/* ==========================================================================
   THEME & SOUND MANAGEMENT
   ========================================================================== */

const THEMES = [
  { id: 'serika-dark', name: 'Serika Dark' },
  { id: 'carbon', name: 'Carbon' },
  { id: 'dracula', name: 'Dracula' },
  { id: 'nord', name: 'Nord' },
  { id: 'matrix', name: 'Matrix' },
  { id: 'cyberpunk', name: 'Cyberpunk' },
  { id: 'chalk', name: 'Chalk' },
  { id: 'coffee', name: 'Coffee' }
];

function applyTheme(themeId) {
  state.theme = themeId;
  document.documentElement.setAttribute('data-theme', themeId);
  localStorage.setItem('monkey_theme', themeId);
  const found = THEMES.find(t => t.id === themeId);
  const themeName = found ? found.name : themeId;
  elements.themeLabel.textContent = `Theme: ${themeName}`;
  elements.linkThemeName.textContent = `theme: ${themeName.toLowerCase()}`;
  if (state.isTestFinished) {
    chart.render();
  }
}

const SOUNDS = [
  { id: 'off', label: 'Sound: Off' },
  { id: 'cherry', label: 'Sound: Cherry MX' },
  { id: 'thock', label: 'Sound: Thock (Linear)' },
  { id: 'typewriter', label: 'Sound: Typewriter' },
  { id: 'pop', label: 'Sound: Bubble Pop' }
];

function cycleSound() {
  const currentIdx = SOUNDS.findIndex(s => s.id === state.sound);
  const nextIdx = (currentIdx + 1) % SOUNDS.length;
  const nextSound = SOUNDS[nextIdx];
  state.sound = nextSound.id;
  soundEngine.setMode(nextSound.id);
  elements.soundLabel.textContent = nextSound.label;
  elements.btnSound.classList.toggle('active', nextSound.id !== 'off');
  soundEngine.playKey(false, false, false);
}

/* ==========================================================================
   WORD GENERATION & TEST PREPARATION
   ========================================================================== */

function generateWordsList() {
  let count = 100;
  if (state.mode === 'words') {
    count = state.modeVal;
  } else if (state.mode === 'time') {
    count = Math.max(80, Math.ceil(state.modeVal * 3.5));
  } else if (state.mode === 'zen') {
    count = 150;
  }

  if (state.mode === 'quote') {
    const q = quotes[Math.floor(Math.random() * quotes.length)];
    return q.text.split(' ');
  }

  const generated = [];
  const wordsPool = [...commonWords];

  for (let i = 0; i < count; i++) {
    let word = wordsPool[Math.floor(Math.random() * wordsPool.length)];

    if (state.numbers && Math.random() < 0.15) {
      word = String(Math.floor(Math.random() * 9000) + 10);
    }

    if (state.punctuation && state.mode !== 'quote') {
      const punctRand = Math.random();
      if (punctRand < 0.08) word = `${word},`;
      else if (punctRand < 0.15) word = `${word}.`;
      else if (punctRand < 0.18) word = `"${word}"`;
      else if (punctRand < 0.20) word = `${word}?`;
      else if (punctRand < 0.23) word = `${word}!`;
      else if (punctRand < 0.26) word = `${word};`;

      if (i === 0 || (i > 0 && generated[i - 1]?.endsWith('.'))) {
        word = word.charAt(0).toUpperCase() + word.slice(1);
      }
    }

    generated.push(word);
  }

  return generated;
}

function renderWordsDOM() {
  elements.wordsContainer.innerHTML = '';
  state.words.forEach((wordText, wIdx) => {
    const wordEl = document.createElement('div');
    wordEl.className = 'word';
    wordEl.dataset.wordIndex = wIdx;

    for (let lIdx = 0; lIdx < wordText.length; lIdx++) {
      const letterEl = document.createElement('span');
      letterEl.className = 'letter';
      letterEl.textContent = wordText[lIdx];
      wordEl.appendChild(letterEl);
    }
    elements.wordsContainer.appendChild(wordEl);
  });
  elements.wordsContainer.style.transform = 'translateY(0px)';
  state.activeLine = 0;
  updateCaretPosition();
}

/* ==========================================================================
   CARET & SCROLL POSITIONING
   ========================================================================== */

function updateCaretPosition() {
  const currentWordEl = elements.wordsContainer.children[state.currentWordIndex];
  if (!currentWordEl) return;

  const arenaRect = elements.typingArena.getBoundingClientRect();
  const letterEls = currentWordEl.querySelectorAll('.letter');

  let targetRect;
  if (state.currentLetterIndex < letterEls.length) {
    targetRect = letterEls[state.currentLetterIndex].getBoundingClientRect();
  } else if (letterEls.length > 0) {
    const lastLetter = letterEls[letterEls.length - 1];
    const lastRect = lastLetter.getBoundingClientRect();
    targetRect = {
      left: lastRect.right,
      top: lastRect.top,
      height: lastRect.height
    };
  } else {
    targetRect = currentWordEl.getBoundingClientRect();
  }

  const left = targetRect.left - arenaRect.left;
  const top = targetRect.top - arenaRect.top;

  elements.caret.style.left = `${left}px`;
  elements.caret.style.top = `${top}px`;

  // Auto-scroll when moving to line 2 or 3
  const firstWordRect = elements.wordsContainer.children[0]?.getBoundingClientRect();
  if (firstWordRect && targetRect.top) {
    const lineHeight = firstWordRect.height * 1.6;
    const lineIndex = Math.floor((targetRect.top - firstWordRect.top) / (firstWordRect.height || 35));
    if (lineIndex > 1) {
      const scrollOffset = (lineIndex - 1) * 44;
      elements.wordsContainer.style.transform = `translateY(-${scrollOffset}px)`;
    }
  }
}

/* ==========================================================================
   KEYSTROKE PROCESSING
   ========================================================================== */

function handleInput(e) {
  if (state.isTestFinished) return;

  const key = e.key;

  // Ignore navigation / modifier keys
  if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'].includes(key)) {
    return;
  }

  // Handle Tab for quick restart
  if (key === 'Tab') {
    e.preventDefault();
    restartTest();
    return;
  }

  // Handle Esc for command palette
  if (key === 'Escape') {
    e.preventDefault();
    toggleCommandPalette();
    return;
  }

  // Start test on first valid keystroke
  if (!state.isTestRunning) {
    startTest();
  }

  elements.caret.classList.remove('blink');

  const currentWordText = state.words[state.currentWordIndex];
  const currentWordEl = elements.wordsContainer.children[state.currentWordIndex];
  let currentInput = state.wordInputs[state.currentWordIndex] || '';

  // 1. BACKSPACE
  if (key === 'Backspace') {
    e.preventDefault();
    soundEngine.playKey(false, true, false);

    if (e.ctrlKey) {
      // Clear entire word
      currentInput = '';
      state.wordInputs[state.currentWordIndex] = '';
      state.currentLetterIndex = 0;
      refreshCurrentWordDOM(currentWordEl, currentWordText, currentInput);
      updateCaretPosition();
      return;
    }

    if (currentInput.length > 0) {
      currentInput = currentInput.slice(0, -1);
      state.wordInputs[state.currentWordIndex] = currentInput;
      state.currentLetterIndex = currentInput.length;
      refreshCurrentWordDOM(currentWordEl, currentWordText, currentInput);
      updateCaretPosition();
    } else if (state.currentWordIndex > 0) {
      // Jump back to previous word if it had errors
      const prevWordEl = elements.wordsContainer.children[state.currentWordIndex - 1];
      if (prevWordEl && prevWordEl.classList.contains('error-word')) {
        state.currentWordIndex--;
        const prevInput = state.wordInputs[state.currentWordIndex] || '';
        state.currentLetterIndex = prevInput.length;
        updateCaretPosition();
      }
    }
    return;
  }

  // 2. SPACE (Word completion)
  if (key === ' ') {
    e.preventDefault();
    if (currentInput.length === 0) return; // Don't allow multiple spaces

    soundEngine.playKey(true, false, false);
    state.totalKeystrokes++;

    // Check if current word was correct
    const isCorrect = currentInput === currentWordText;
    if (isCorrect) {
      state.correctKeystrokes++;
      currentWordEl.classList.remove('error-word');
    } else {
      state.incorrectKeystrokes++;
      currentWordEl.classList.add('error-word');
      state.errorsThisSecond++;

      // Count missed letters
      if (currentInput.length < currentWordText.length) {
        state.missedKeystrokes += (currentWordText.length - currentInput.length);
      }
    }

    state.currentWordIndex++;
    state.currentLetterIndex = 0;

    // Check completion condition
    if (state.currentWordIndex >= state.words.length) {
      if (state.mode === 'words' || state.mode === 'quote') {
        finishTest();
        return;
      } else {
        // In time or zen mode, append more words dynamically
        appendMoreWords();
      }
    }

    updateCaretPosition();
    return;
  }

  // 3. REGULAR CHARACTER
  if (key.length === 1) {
    e.preventDefault();
    state.totalKeystrokes++;

    const targetChar = currentWordText[state.currentLetterIndex];
    const isCharCorrect = key === targetChar;

    if (isCharCorrect) {
      state.correctKeystrokes++;
      soundEngine.playKey(false, false, false);
    } else {
      state.incorrectKeystrokes++;
      state.errorsThisSecond++;
      soundEngine.playKey(false, false, true);
    }

    // Limit extra characters beyond word length to 10
    if (currentInput.length < currentWordText.length + 10) {
      currentInput += key;
      state.wordInputs[state.currentWordIndex] = currentInput;
      state.currentLetterIndex = currentInput.length;
      refreshCurrentWordDOM(currentWordEl, currentWordText, currentInput);
      updateCaretPosition();
    }

    // If typing last character of last word in quote or words mode
    if (state.currentWordIndex === state.words.length - 1 &&
        currentInput.length >= currentWordText.length &&
        (state.mode === 'words' || state.mode === 'quote')) {
      finishTest();
    }
  }
}

function refreshCurrentWordDOM(wordEl, targetText, typedText) {
  wordEl.innerHTML = '';

  for (let i = 0; i < targetText.length; i++) {
    const letterEl = document.createElement('span');
    letterEl.className = 'letter';
    letterEl.textContent = targetText[i];

    if (i < typedText.length) {
      if (typedText[i] === targetText[i]) {
        letterEl.classList.add('correct');
      } else {
        letterEl.classList.add('incorrect');
      }
    }
    wordEl.appendChild(letterEl);
  }

  // Extra letters
  if (typedText.length > targetText.length) {
    for (let i = targetText.length; i < typedText.length; i++) {
      const extraEl = document.createElement('span');
      extraEl.className = 'letter extra';
      extraEl.textContent = typedText[i];
      wordEl.appendChild(extraEl);
    }
  }
}

function appendMoreWords() {
  const newBatch = generateWordsList().slice(0, 50);
  state.words.push(...newBatch);
  newBatch.forEach((wordText, offset) => {
    const wIdx = state.words.length - 50 + offset;
    const wordEl = document.createElement('div');
    wordEl.className = 'word';
    wordEl.dataset.wordIndex = wIdx;

    for (let lIdx = 0; lIdx < wordText.length; lIdx++) {
      const letterEl = document.createElement('span');
      letterEl.className = 'letter';
      letterEl.textContent = wordText[lIdx];
      wordEl.appendChild(letterEl);
    }
    elements.wordsContainer.appendChild(wordEl);
  });
}

/* ==========================================================================
   TEST LIFECYCLE & LIVE STATS
   ========================================================================== */

function startTest() {
  state.isTestRunning = true;
  state.isTestFinished = false;
  state.startTime = performance.now();
  state.elapsedSeconds = 0;
  state.historyPoints = [];
  state.totalKeystrokes = 0;
  state.correctKeystrokes = 0;
  state.incorrectKeystrokes = 0;
  state.extraKeystrokes = 0;
  state.missedKeystrokes = 0;
  state.errorsThisSecond = 0;

  elements.resultsSection.classList.remove('visible');
  elements.resultsSection.style.display = 'none';
  elements.arenaWrapper.style.display = 'flex';

  // 1-Second Master Tick
  state.timerInterval = setInterval(() => {
    state.elapsedSeconds++;

    // Calculate second-by-second WPM for chart
    const currentWpm = computeWpm(state.correctKeystrokes, state.elapsedSeconds);
    const currentRaw = computeWpm(state.totalKeystrokes, state.elapsedSeconds);

    state.historyPoints.push({
      second: state.elapsedSeconds,
      wpm: currentWpm,
      rawWpm: currentRaw,
      errors: state.errorsThisSecond
    });

    state.errorsThisSecond = 0;

    // Time mode countdown
    if (state.mode === 'time') {
      const remaining = state.modeVal - state.elapsedSeconds;
      elements.hudTimer.textContent = Math.max(0, remaining);
      if (remaining <= 0) {
        finishTest();
        return;
      }
    } else {
      // Words / Zen mode: show count or elapsed
      if (state.mode === 'words') {
        elements.hudTimer.textContent = `${state.currentWordIndex}/${state.modeVal}`;
      } else {
        elements.hudTimer.textContent = state.elapsedSeconds;
      }
    }
  }, 1000);

  // 100ms Live HUD Update (Smooth Live WPM & Accuracy)
  state.hudInterval = setInterval(() => {
    if (!state.isTestRunning) return;
    const now = (performance.now() - state.startTime) / 1000;
    if (now > 0.5) {
      const liveWpm = computeWpm(state.correctKeystrokes, now);
      const liveAcc = state.totalKeystrokes > 0
        ? Math.round((state.correctKeystrokes / state.totalKeystrokes) * 100)
        : 100;

      elements.hudLiveWpm.textContent = Math.round(liveWpm);
      elements.hudLiveAcc.textContent = `${liveAcc}%`;
    }
  }, 100);
}

function finishTest() {
  if (state.isTestFinished) return;
  state.isTestFinished = true;
  state.isTestRunning = false;

  clearInterval(state.timerInterval);
  clearInterval(state.hudInterval);

  const durationSec = Math.max(1, (performance.now() - state.startTime) / 1000);
  const finalWpm = Math.round(computeWpm(state.correctKeystrokes, durationSec));
  const finalRaw = Math.round(computeWpm(state.totalKeystrokes, durationSec));
  const finalAcc = state.totalKeystrokes > 0
    ? Math.round((state.correctKeystrokes / state.totalKeystrokes) * 100)
    : 100;

  // Calculate consistency
  const consistency = computeConsistency(state.historyPoints);

  // Populate Result Screen
  elements.resWpm.textContent = finalWpm;
  elements.resAcc.textContent = `${finalAcc}%`;
  elements.resRaw.textContent = finalRaw;
  elements.resConsistency.textContent = `${consistency}%`;
  elements.resChars.textContent = `${state.correctKeystrokes} / ${state.incorrectKeystrokes} / ${state.extraKeystrokes} / ${state.missedKeystrokes}`;
  elements.resTime.textContent = `${Math.round(durationSec)}s`;
  elements.resTestType.textContent = `${state.mode} ${state.mode === 'time' || state.mode === 'words' ? state.modeVal : ''}`;

  // Hide Arena & Reveal Results
  elements.arenaWrapper.style.display = 'none';
  elements.resultsSection.style.display = 'block';
  elements.resultsSection.classList.add('visible');

  // Personal Best Check
  const isPb = saveHistoryAndCheckPB({
    mode: state.mode,
    modeVal: state.modeVal,
    wpm: finalWpm,
    raw: finalRaw,
    acc: finalAcc,
    consistency,
    date: new Date().toLocaleDateString()
  });

  elements.pbBadge.style.display = isPb ? 'inline-flex' : 'none';

  // Render chart
  if (state.historyPoints.length === 0) {
    state.historyPoints.push({ second: 1, wpm: finalWpm, rawWpm: finalRaw, errors: 0 });
  }
  setTimeout(() => {
    chart.setData(state.historyPoints);
  }, 50);
}

function computeWpm(characters, seconds) {
  if (seconds <= 0) return 0;
  // Standard typing calculation: (chars / 5) / (seconds / 60)
  return (characters / 5) * (60 / seconds);
}

function computeConsistency(history) {
  if (history.length < 2) return 100;
  const wpms = history.map(h => h.rawWpm);
  const mean = wpms.reduce((a, b) => a + b, 0) / wpms.length;
  if (mean === 0) return 100;

  const variance = wpms.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / wpms.length;
  const stdDev = Math.sqrt(variance);
  const cv = (stdDev / mean) * 100; // Coefficient of variation
  const consistency = Math.max(0, Math.min(100, Math.round(100 - cv)));
  return consistency;
}

function restartTest() {
  clearInterval(state.timerInterval);
  clearInterval(state.hudInterval);

  state.isTestRunning = false;
  state.isTestFinished = false;
  state.currentWordIndex = 0;
  state.currentLetterIndex = 0;
  state.wordInputs = [];
  state.historyPoints = [];
  state.totalKeystrokes = 0;
  state.correctKeystrokes = 0;
  state.incorrectKeystrokes = 0;
  state.extraKeystrokes = 0;
  state.missedKeystrokes = 0;

  // Reset HUD
  if (state.mode === 'time') {
    elements.hudTimer.textContent = state.modeVal;
    elements.hudTimerLabel.textContent = 'seconds';
  } else if (state.mode === 'words') {
    elements.hudTimer.textContent = `0/${state.modeVal}`;
    elements.hudTimerLabel.textContent = 'words';
  } else {
    elements.hudTimer.textContent = '0';
    elements.hudTimerLabel.textContent = state.mode;
  }
  elements.hudLiveWpm.textContent = '0';
  elements.hudLiveAcc.textContent = '100%';

  // Reset view
  elements.resultsSection.classList.remove('visible');
  elements.resultsSection.style.display = 'none';
  elements.arenaWrapper.style.display = 'flex';
  elements.caret.classList.add('blink');

  // Regenerate words
  state.words = generateWordsList();
  renderWordsDOM();
  elements.hiddenInput.value = '';
  elements.hiddenInput.focus();
}

/* ==========================================================================
   HISTORY & PERSONAL BESTS
   ========================================================================== */

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem('monkey_history')) || [];
  } catch {
    return [];
  }
}

function saveHistoryAndCheckPB(record) {
  const history = getHistory();
  history.unshift(record);
  if (history.length > 50) history.pop();
  localStorage.setItem('monkey_history', JSON.stringify(history));

  // Check personal best for this specific mode & val
  const sameModeRecords = history.filter(h => h.mode === record.mode && h.modeVal === record.modeVal);
  const bestWpm = Math.max(...sameModeRecords.map(h => h.wpm));
  return record.wpm >= bestWpm;
}

function renderHistoryModal() {
  const history = getHistory();

  // Populate PBs
  const best15 = Math.max(0, ...history.filter(h => h.mode === 'time' && h.modeVal === 15).map(h => h.wpm));
  const best30 = Math.max(0, ...history.filter(h => h.mode === 'time' && h.modeVal === 30).map(h => h.wpm));
  const best60 = Math.max(0, ...history.filter(h => h.mode === 'time' && h.modeVal === 60).map(h => h.wpm));

  elements.pbTime15.textContent = best15 > 0 ? `${best15} wpm` : '-';
  elements.pbTime30.textContent = best30 > 0 ? `${best30} wpm` : '-';
  elements.pbTime60.textContent = best60 > 0 ? `${best60} wpm` : '-';

  // Table
  elements.historyTableBody.innerHTML = '';
  if (history.length === 0) {
    elements.historyTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--sub-color); padding: 1.5rem;">No test history yet. Complete a test to see records!</td></tr>';
    return;
  }

  history.slice(0, 15).forEach(h => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${h.mode} ${h.mode === 'time' || h.mode === 'words' ? h.modeVal : ''}</td>
      <td style="color:var(--main-color); font-weight:700;">${h.wpm}</td>
      <td>${h.acc}%</td>
      <td>${h.consistency}%</td>
      <td style="color:var(--sub-color);">${h.date}</td>
    `;
    elements.historyTableBody.appendChild(tr);
  });
}

/* ==========================================================================
   COMMAND PALETTE
   ========================================================================== */

const COMMANDS = [
  { name: 'Theme: Serika Dark', category: 'Theme', action: () => applyTheme('serika-dark') },
  { name: 'Theme: Carbon', category: 'Theme', action: () => applyTheme('carbon') },
  { name: 'Theme: Dracula', category: 'Theme', action: () => applyTheme('dracula') },
  { name: 'Theme: Nord', category: 'Theme', action: () => applyTheme('nord') },
  { name: 'Theme: Matrix', category: 'Theme', action: () => applyTheme('matrix') },
  { name: 'Theme: Cyberpunk', category: 'Theme', action: () => applyTheme('cyberpunk') },
  { name: 'Theme: Chalk', category: 'Theme', action: () => applyTheme('chalk') },
  { name: 'Theme: Coffee', category: 'Theme', action: () => applyTheme('coffee') },
  { name: 'Mode: Time 15s', category: 'Mode', action: () => setMode('time', 15) },
  { name: 'Mode: Time 30s', category: 'Mode', action: () => setMode('time', 30) },
  { name: 'Mode: Time 60s', category: 'Mode', action: () => setMode('time', 60) },
  { name: 'Mode: Time 120s', category: 'Mode', action: () => setMode('time', 120) },
  { name: 'Mode: Words 10', category: 'Mode', action: () => setMode('words', 10) },
  { name: 'Mode: Words 25', category: 'Mode', action: () => setMode('words', 25) },
  { name: 'Mode: Words 50', category: 'Mode', action: () => setMode('words', 50) },
  { name: 'Mode: Quote Mode', category: 'Mode', action: () => setMode('quote', 'quote') },
  { name: 'Mode: Zen Mode', category: 'Mode', action: () => setMode('zen', 'zen') },
  { name: 'Toggle Punctuation', category: 'Modifier', action: togglePunctuation },
  { name: 'Toggle Numbers', category: 'Modifier', action: toggleNumbers },
  { name: 'Sound: Cherry MX Blue', category: 'Sound', action: () => setSound('cherry') },
  { name: 'Sound: Thock (Linear)', category: 'Sound', action: () => setSound('thock') },
  { name: 'Sound: Typewriter', category: 'Sound', action: () => setSound('typewriter') },
  { name: 'Sound: Bubble Pop', category: 'Sound', action: () => setSound('pop') },
  { name: 'Sound: Mute (Off)', category: 'Sound', action: () => setSound('off') },
  { name: 'Restart Test', category: 'Action', action: restartTest }
];

function toggleCommandPalette() {
  const isOpen = elements.modalPalette.classList.contains('open');
  if (isOpen) {
    elements.modalPalette.classList.remove('open');
    elements.hiddenInput.focus();
  } else {
    elements.modalPalette.classList.add('open');
    elements.paletteSearch.value = '';
    renderPaletteResults('');
    elements.paletteSearch.focus();
  }
}

function renderPaletteResults(query) {
  elements.paletteResults.innerHTML = '';
  const filtered = COMMANDS.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  filtered.forEach((cmd, idx) => {
    const item = document.createElement('div');
    item.className = `palette-item ${idx === 0 ? 'active' : ''}`;
    item.innerHTML = `
      <span>${cmd.name}</span>
      <span class="palette-tag">${cmd.category}</span>
    `;
    item.addEventListener('click', () => {
      cmd.action();
      elements.modalPalette.classList.remove('open');
      elements.hiddenInput.focus();
    });
    elements.paletteResults.appendChild(item);
  });
}

function setSound(mode) {
  state.sound = mode;
  soundEngine.setMode(mode);
  const found = SOUNDS.find(s => s.id === mode);
  elements.soundLabel.textContent = found ? found.label : 'Sound: Off';
  elements.btnSound.classList.toggle('active', mode !== 'off');
}

function togglePunctuation() {
  state.punctuation = !state.punctuation;
  localStorage.setItem('monkey_punctuation', state.punctuation);
  elements.optPunctuation.classList.toggle('active', state.punctuation);
  restartTest();
}

function toggleNumbers() {
  state.numbers = !state.numbers;
  localStorage.setItem('monkey_numbers', state.numbers);
  elements.optNumbers.classList.toggle('active', state.numbers);
  restartTest();
}

function setMode(newMode, val) {
  state.mode = newMode;
  state.modeVal = val;
  localStorage.setItem('monkey_mode', newMode);
  localStorage.setItem('monkey_mode_val', val);

  // Update mode buttons
  elements.cfgMode.querySelectorAll('.config-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === newMode);
  });

  updateSubValuesBar();
  restartTest();
}

function updateSubValuesBar() {
  elements.cfgSubValues.innerHTML = '';

  if (state.mode === 'time') {
    elements.cfgSubDivider.style.display = 'block';
    elements.cfgSubValues.style.display = 'flex';
    [15, 30, 60, 120].forEach(val => {
      const btn = document.createElement('button');
      btn.className = `config-btn ${state.modeVal === val ? 'active' : ''}`;
      btn.textContent = val;
      btn.addEventListener('click', () => setMode('time', val));
      elements.cfgSubValues.appendChild(btn);
    });
  } else if (state.mode === 'words') {
    elements.cfgSubDivider.style.display = 'block';
    elements.cfgSubValues.style.display = 'flex';
    [10, 25, 50, 100].forEach(val => {
      const btn = document.createElement('button');
      btn.className = `config-btn ${state.modeVal === val ? 'active' : ''}`;
      btn.textContent = val;
      btn.addEventListener('click', () => setMode('words', val));
      elements.cfgSubValues.appendChild(btn);
    });
  } else {
    elements.cfgSubDivider.style.display = 'none';
    elements.cfgSubValues.style.display = 'none';
  }
}

/* ==========================================================================
   EVENT LISTENERS & SETUP
   ========================================================================== */

function setupEventListeners() {
  // Global typing focus handling
  window.addEventListener('keydown', (e) => {
    // Check CapsLock state
    const isCaps = e.getModifierState && e.getModifierState('CapsLock');
    elements.capsWarning.classList.toggle('visible', !!isCaps);

    // Modal navigation
    if (elements.modalPalette.classList.contains('open')) {
      if (e.key === 'Escape') {
        toggleCommandPalette();
      } else if (e.key === 'Enter') {
        const active = elements.paletteResults.querySelector('.palette-item.active');
        if (active) active.click();
      }
      return;
    }

    if (elements.modalHistory.classList.contains('open')) {
      if (e.key === 'Escape') {
        elements.modalHistory.classList.remove('open');
        elements.hiddenInput.focus();
      }
      return;
    }

    // Direct typing
    handleInput(e);
  });

  // Focus blur management
  elements.hiddenInput.addEventListener('blur', () => {
    if (!elements.modalPalette.classList.contains('open') &&
        !elements.modalHistory.classList.contains('open') &&
        !state.isTestFinished) {
      elements.focusOverlay.classList.add('active');
    }
  });

  elements.hiddenInput.addEventListener('focus', () => {
    elements.focusOverlay.classList.remove('active');
  });

  elements.focusOverlay.addEventListener('click', () => {
    elements.hiddenInput.focus();
  });

  elements.arenaWrapper.addEventListener('click', () => {
    elements.hiddenInput.focus();
  });

  // Action Buttons
  elements.btnQuickRestart.addEventListener('click', restartTest);
  elements.btnNextTest.addEventListener('click', restartTest);
  elements.btnRepeatTest.addEventListener('click', () => {
    // Repeat with identical words
    state.currentWordIndex = 0;
    state.currentLetterIndex = 0;
    state.wordInputs = [];
    state.isTestRunning = false;
    state.isTestFinished = false;
    renderWordsDOM();
    elements.resultsSection.classList.remove('visible');
    elements.resultsSection.style.display = 'none';
    elements.arenaWrapper.style.display = 'flex';
    elements.hiddenInput.focus();
  });

  // Sound Button
  elements.btnSound.addEventListener('click', cycleSound);

  // Theme Button
  elements.btnThemeModal.addEventListener('click', () => {
    const currentIdx = THEMES.findIndex(t => t.id === state.theme);
    const nextIdx = (currentIdx + 1) % THEMES.length;
    applyTheme(THEMES[nextIdx].id);
  });

  // History Modal
  elements.btnHistoryModal.addEventListener('click', () => {
    renderHistoryModal();
    elements.modalHistory.classList.add('open');
  });

  elements.btnCloseHistory.addEventListener('click', () => {
    elements.modalHistory.classList.remove('open');
    elements.hiddenInput.focus();
  });

  // Command Palette
  elements.btnCmdPalette.addEventListener('click', toggleCommandPalette);
  elements.paletteSearch.addEventListener('input', (e) => {
    renderPaletteResults(e.target.value);
  });

  // Mode Buttons
  elements.cfgMode.querySelectorAll('.config-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      const defaultVal = mode === 'time' ? 30 : (mode === 'words' ? 25 : mode);
      setMode(mode, defaultVal);
    });
  });

  // Modifier Buttons
  elements.optPunctuation.addEventListener('click', togglePunctuation);
  elements.optNumbers.addEventListener('click', toggleNumbers);

  // Window resize chart re-render
  window.addEventListener('resize', () => {
    updateCaretPosition();
    if (state.isTestFinished) {
      chart.render();
    }
  });
}

// Initial Boot
function init() {
  applyTheme(state.theme);
  setSound(state.sound);
  elements.optPunctuation.classList.toggle('active', state.punctuation);
  elements.optNumbers.classList.toggle('active', state.numbers);

  elements.cfgMode.querySelectorAll('.config-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === state.mode);
  });

  updateSubValuesBar();
  setupEventListeners();
  restartTest();
}

window.addEventListener('DOMContentLoaded', init);
