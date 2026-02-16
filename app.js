/* Math Trainer PWA - V5
   Fix boutons + navigation bas (grosses icônes)
   + Affichage mobile plein écran (100dvh, safe-area, plus de table large)
*/

const $ = (sel) => document.querySelector(sel);

const screens = {
  home: $("#screen-home"),
  game: $("#screen-game"),
  scores: $("#screen-scores"),
  results: $("#screen-results"),
};

const els = {
  // header
  subtitle: $("#subtitle"),
  installBtn: $("#installBtn"),
  appMain: $("#appMain"),

  // home
  profileSelect: $("#profileSelect"),
  addProfileBtn: $("#addProfileBtn"),
  startBtn: $("#startBtn"),
  modeHint: $("#modeHint"),
  segButtons: Array.from(document.querySelectorAll(".seg")),

  // game
  qIndex: $("#qIndex"),
  qTotal: $("#qTotal"),
  okCount: $("#okCount"),
  errCount: $("#errCount"),
  a: $("#a"),
  op: $("#op"),
  b: $("#b"),
  answerInput: $("#answerInput"),
  feedback: $("#feedback"),
  validateBtn: $("#validateBtn"),
  skipBtn: $("#skipBtn"),
  stopBtn: $("#stopBtn"),
  timer: $("#timer"),
  avgPerQ: $("#avgPerQ"),

  // scores
  profileLabel: $("#profileLabel"),
  scoresList: $("#scoresList"),
  resetHistoryBtn: $("#resetHistoryBtn"),

  // results
  finalOk: $("#finalOk"),
  finalErr: $("#finalErr"),
  finalScore: $("#finalScore"),
  timeSummary: $("#timeSummary"),
  reviewList: $("#reviewList"),
  playAgainBtn: $("#playAgainBtn"),
  backHomeBtn: $("#backHomeBtn"),

  // nav
  navHome: $("#navHome"),
  navPlay: $("#navPlay"),
  navScores: $("#navScores"),
  navSettings: $("#navSettings"),
  navButtons: Array.from(document.querySelectorAll(".nav-btn")),

  // settings modal
  settingsModal: $("#settingsModal"),
  closeSettingsBtn: $("#closeSettingsBtn"),
  saveSettingsBtn: $("#saveSettingsBtn"),

  // settings inputs
  questionsCount: $("#questionsCount"),
  maxValue: $("#maxValue"),
  allowNegative: $("#allowNegative"),

  tablesEnabled: $("#tablesEnabled"),
  tableNumber: $("#tableNumber"),
  tablesOp: $("#tablesOp"),

  progressEnabled: $("#progressEnabled"),
  unlockedMax: $("#unlockedMax"),
  resetProgressBtn: $("#resetProgressBtn"),

  soundEnabled: $("#soundEnabled"),
  confettiEnabled: $("#confettiEnabled"),

  renameProfileBtn: $("#renameProfileBtn"),
  deleteProfileBtn: $("#deleteProfileBtn"),
};

// ---------- PWA ----------
let deferredPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  els.installBtn.hidden = false;
});
els.installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  els.installBtn.hidden = true;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
}

// ---------- Storage ----------
const PROFILES_KEY = "math_trainer_profiles_v10";
const ACTIVE_PROFILE_KEY = "math_trainer_active_profile_v10";
const HISTORY_MAX = 12;

const LEVEL_STEP = 10;
const LEVEL_MAX_CAP = 200;
const PASS_SCORE_MIN = 80;
const PASS_MIN_QUESTIONS = 10;

function historyKeyFor(profile) { return `math_trainer_history_v10::${profile}`; }
function progressKeyFor(profile) { return `math_trainer_progress_v10::${profile}`; }

// ---------- Helpers ----------
function clampInt(v, min, max) {
  const n = Math.round(Number(v));
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}
function randInt(min, maxInclusive) {
  return Math.floor(Math.random() * (maxInclusive - min + 1)) + min;
}
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleString("fr-FR", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
}

// ---------- Screens / Nav ----------
let currentScreen = "home";

function showScreen(name) {
  Object.entries(screens).forEach(([k, el]) => { el.hidden = (k !== name); });
  currentScreen = name;
  // reset scroll (important on mobile)
  if (els.appMain) els.appMain.scrollTop = 0;
  // close settings if open
  if (els.settingsModal && els.settingsModal.classList.contains('open')) {
    els.settingsModal.classList.remove('open');
    els.settingsModal.setAttribute('aria-hidden', 'true');
  }

  // nav highlight
  els.navButtons.forEach(b => b.classList.remove("active"));
  if (name === "home") els.navHome.classList.add("active");
  else if (name === "scores") els.navScores.classList.add("active");
  else if (name === "game" || name === "results") els.navPlay.classList.add("active");
}

els.navHome.addEventListener("click", () => showScreen("home"));
els.navScores.addEventListener("click", () => { renderScores(); showScreen("scores"); });
els.navPlay.addEventListener("click", () => {
  // If in a game, just show it; otherwise go home (start button)
  if (!screens.game.hidden) showScreen("game");
  else if (!screens.results.hidden) showScreen("results");
  else showScreen("home");
});
els.navSettings.addEventListener("click", () => openSettings());

// ---------- Profiles ----------
function loadProfiles() {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (!raw) return ["Édouard"];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length === 0) return ["Édouard"];
    return arr.map(String).filter(Boolean);
  } catch {
    return ["Édouard"];
  }
}
function saveProfiles(arr) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(arr));
}
function loadActiveProfile(profiles) {
  const saved = localStorage.getItem(ACTIVE_PROFILE_KEY);
  if (saved && profiles.includes(saved)) return saved;
  return profiles[0];
}
function setActiveProfile(name) {
  localStorage.setItem(ACTIVE_PROFILE_KEY, name);
}

let profiles = loadProfiles();
let activeProfile = loadActiveProfile(profiles);

function renderProfiles() {
  els.profileSelect.innerHTML = "";
  profiles.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    if (p === activeProfile) opt.selected = true;
    els.profileSelect.appendChild(opt);
  });
  els.profileLabel.textContent = activeProfile;
}
renderProfiles();

els.profileSelect.addEventListener("change", () => {
  activeProfile = els.profileSelect.value;
  setActiveProfile(activeProfile);
  progress = loadProgress(activeProfile);
  els.unlockedMax.textContent = String(progress.unlockedMax);
  renderScores();
});

els.addProfileBtn.addEventListener("click", () => {
  const name = (prompt("Nom du nouveau profil :") || "").trim();
  if (!name) return;
  if (profiles.includes(name)) return alert("Ce profil existe déjà.");
  profiles.push(name);
  saveProfiles(profiles);

  activeProfile = name;
  setActiveProfile(activeProfile);

  progress = { unlockedMax: 10 };
  saveProgress(activeProfile, progress);
  els.unlockedMax.textContent = String(progress.unlockedMax);

  renderProfiles();
  renderScores();
});

// ---------- Progress ----------
function loadProgress(profile) {
  try {
    const raw = localStorage.getItem(progressKeyFor(profile));
    if (!raw) return { unlockedMax: 10 };
    const p = JSON.parse(raw);
    return { unlockedMax: clampInt(p.unlockedMax ?? 10, LEVEL_STEP, LEVEL_MAX_CAP) };
  } catch {
    return { unlockedMax: 10 };
  }
}
function saveProgress(profile, p) {
  localStorage.setItem(progressKeyFor(profile), JSON.stringify(p));
}
let progress = loadProgress(activeProfile);
els.unlockedMax.textContent = String(progress.unlockedMax);

els.resetProgressBtn.addEventListener("click", () => {
  progress = { unlockedMax: 10 };
  saveProgress(activeProfile, progress);
  els.unlockedMax.textContent = String(progress.unlockedMax);
  els.maxValue.value = String(Math.min(clampInt(els.maxValue.value, 5, 200), progress.unlockedMax));
});

// ---------- Settings Modal ----------
function openSettings() {
  els.settingsModal.classList.add("open");
  els.settingsModal.setAttribute("aria-hidden", "false");
}
function closeSettings() {
  els.settingsModal.classList.remove("open");
  els.settingsModal.setAttribute("aria-hidden", "true");
}
els.closeSettingsBtn.addEventListener("click", closeSettings);
els.saveSettingsBtn.addEventListener("click", closeSettings);
els.settingsModal.addEventListener("click", (e) => {
  const t = e.target;
  if (t && t.dataset && "close" in t.dataset) closeSettings();
});

// ---------- Mode selection ----------
let config = {
  mode: "mix", // mix|add|sub|tables
  maxValue: 20,
  totalQuestions: 10,
  allowNegative: false,
  soundEnabled: true,
  confettiEnabled: true,
  progressEnabled: true,
};

function setMode(mode) {
  config.mode = mode;
  els.segButtons.forEach(btn => btn.classList.toggle("active", btn.dataset.mode === mode));

  const map = {
    mix: "Mix = additions et soustractions",
    add: "Addition uniquement",
    sub: "Soustraction uniquement",
    tables: "Tables = une table au choix",
  };
  els.modeHint.textContent = map[mode] ?? "";
  els.subtitle.textContent = map[mode] ?? "Additions & soustractions";
}
els.segButtons.forEach(btn => btn.addEventListener("click", () => setMode(btn.dataset.mode)));
setMode("mix");

// ---------- Timer ----------
let timerId = null;
let elapsedMs = 0;

function formatMMSS(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}
function startTimer() {
  stopTimer();
  const start = Date.now();
  elapsedMs = 0;
  els.timer.textContent = "00:00";
  els.avgPerQ.textContent = "0.0";

  timerId = setInterval(() => {
    elapsedMs = Date.now() - start;
    els.timer.textContent = formatMMSS(elapsedMs);
    const answered = Math.max(1, state.currentIndex + 1);
    els.avgPerQ.textContent = (elapsedMs / 1000 / answered).toFixed(1);
  }, 200);
}
function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}

// ---------- Confetti ----------
let confettiCanvas, confettiCtx, confettiParticles = [], confettiAnimId = null;

function ensureConfettiCanvas() {
  if (confettiCanvas) return;
  confettiCanvas = document.createElement("canvas");
  confettiCanvas.style.position = "fixed";
  confettiCanvas.style.inset = "0";
  confettiCanvas.style.pointerEvents = "none";
  confettiCanvas.style.zIndex = "9999";
  document.body.appendChild(confettiCanvas);
  confettiCtx = confettiCanvas.getContext("2d");

  const resize = () => {
    confettiCanvas.width = window.innerWidth * devicePixelRatio;
    confettiCanvas.height = window.innerHeight * devicePixelRatio;
    confettiCtx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  };
  window.addEventListener("resize", resize);
  resize();
}

function spawnConfetti({ count = 40, x = window.innerWidth / 2, y = window.innerHeight / 3, spread = 110, power = 9 } = {}) {
  if (!config.confettiEnabled) return;
  ensureConfettiCanvas();

  for (let i = 0; i < count; i++) {
    const angle = (Math.random() * spread - spread / 2) * (Math.PI / 180);
    const speed = power * (0.6 + Math.random() * 0.8);

    confettiParticles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - power,
      g: 0.25 + Math.random() * 0.2,
      size: 4 + Math.random() * 4,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.25,
      life: 70 + Math.random() * 35,
      shape: Math.random() < 0.5 ? "rect" : "circle",
      hue: Math.floor(Math.random() * 360),
    });
  }

  if (!confettiAnimId) animateConfetti();
}

function animateConfetti() {
  confettiAnimId = requestAnimationFrame(animateConfetti);
  if (!confettiCtx) return;

  confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  confettiParticles = confettiParticles.filter(p => p.life > 0);
  for (const p of confettiParticles) {
    p.life -= 1;
    p.vy += p.g;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;

    confettiCtx.save();
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate(p.rot);
    confettiCtx.globalAlpha = Math.max(0, p.life / 110);
    confettiCtx.fillStyle = `hsl(${p.hue}, 90%, 60%)`;

    if (p.shape === "rect") confettiCtx.fillRect(-p.size/2, -p.size/2, p.size, p.size * 0.7);
    else { confettiCtx.beginPath(); confettiCtx.arc(0, 0, p.size/2, 0, Math.PI * 2); confettiCtx.fill(); }
    confettiCtx.restore();
  }

  if (confettiParticles.length === 0) {
    cancelAnimationFrame(confettiAnimId);
    confettiAnimId = null;
    confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
}

// ---------- Sound ----------
let audioCtx = null;
function ensureAudio() {
  if (!config.soundEnabled) return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}
function beep({ freq = 440, dur = 0.09, type = "sine", gain = 0.06 } = {}) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  o.connect(g); g.connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime + dur + 0.02);
}
function soundCorrect() { beep({ freq: 660, dur: 0.08, type: "triangle", gain: 0.06 }); setTimeout(() => beep({ freq: 880, dur: 0.10, type: "triangle", gain: 0.055 }), 85); }
function soundWrong() { beep({ freq: 220, dur: 0.14, type: "sawtooth", gain: 0.05 }); setTimeout(() => beep({ freq: 180, dur: 0.14, type: "sawtooth", gain: 0.045 }), 90); }

// ---------- Game generation ----------
function readSettingsIntoConfig() {
  config.totalQuestions = clampInt(els.questionsCount.value, 5, 50);
  config.allowNegative = !!els.allowNegative.checked;
  config.soundEnabled = !!els.soundEnabled.checked;
  config.confettiEnabled = !!els.confettiEnabled.checked;
  config.progressEnabled = !!els.progressEnabled.checked;

  // max range
  const requestedMax = clampInt(els.maxValue.value, 5, 200);
  config.maxValue = config.progressEnabled ? Math.min(requestedMax, progress.unlockedMax) : requestedMax;
  if (config.progressEnabled) els.maxValue.value = String(config.maxValue);

  // tables mode defaults
  if (config.mode === "tables") els.tablesEnabled.checked = true;
}

function pickOp() {
  if (config.mode === "add") return "+";
  if (config.mode === "sub") return "−";
  return Math.random() < 0.5 ? "+" : "−";
}

function generateQuestionStandard() {
  const max = config.maxValue;
  const op = pickOp();
  let a = randInt(0, max);
  let b = randInt(0, max);
  if (op === "−" && !config.allowNegative && b > a) [a, b] = [b, a];
  const answer = (op === "+") ? (a + b) : (a - b);
  return { a, b, op, answer, userAnswer: null, correct: null, skipped: false };
}

function generateQuestionTables() {
  const t = clampInt(els.tableNumber.value, 1, 20);
  const max = config.maxValue;
  const n = randInt(0, max);
  if (els.tablesOp.value === "add") return { a: t, b: n, op: "+", answer: t + n, userAnswer: null, correct: null, skipped: false, table: t };
  const a = t + n; const b = t;
  return { a, b, op: "−", answer: a - b, userAnswer: null, correct: null, skipped: false, table: t };
}

// ---------- Safe helpers (avoid freezes if audio/confetti fails) ----------
function safeCall(fn) {
  try { fn(); } catch (e) { /* ignore */ }
}
function scheduleAfterAnswer(ms, fn) {
  try { return setTimeout(fn, ms); } catch (e) { /* ignore */ }
}

// ---------- Game state ----------
let state = {
  currentIndex: 0,
  ok: 0,
  questions: [],
  current: null,
  locked: false,
};

function renderCurrentQuestion() {
  const q = state.current;
  els.a.textContent = q.a;
  els.b.textContent = q.b;
  els.op.textContent = q.op;

  els.qIndex.textContent = String(state.currentIndex + 1);
  els.qTotal.textContent = String(config.totalQuestions);

  els.okCount.textContent = String(state.ok);
  els.errCount.textContent = String(Math.max(0, state.currentIndex - state.ok));

  els.answerInput.value = "";
  els.feedback.textContent = "";
  // Update validate label on last question
  try {
    const isLastQ = (state.currentIndex === config.totalQuestions - 1);
    els.validateBtn.textContent = isLastQ ? "🏁 Terminer" : "✅ Valider";
  } catch (e) {}
  // focus with tiny delay for iOS reliability
  setTimeout(() => els.answerInput.focus(), 50);
}

function startGame() {
  readSettingsIntoConfig();
  ensureAudio();

  state = { currentIndex: 0, ok: 0, questions: [], current: null, locked: false };

  const useTables = (config.mode === "tables") || !!els.tablesEnabled.checked;
  for (let i = 0; i < config.totalQuestions; i++) {
    state.questions.push(useTables ? generateQuestionTables() : generateQuestionStandard());
  }
  state.current = state.questions[0];

  showScreen("game");
  startTimer();
  renderCurrentQuestion();
}

function nextQuestion() {
  state.locked = false;
  state.currentIndex += 1;
  if (state.currentIndex >= config.totalQuestions) return finishGame();
  state.current = state.questions[state.currentIndex];
  renderCurrentQuestion();
}

function validateAnswer() {
  if (state.locked) return;
  const raw = els.answerInput.value.trim().replace(",", ".");
  if (!raw) { els.feedback.textContent = "Entre une réponse 🙂"; return; }
  const user = Number(raw);
  if (Number.isNaN(user)) { els.feedback.textContent = "Réponse invalide."; return; }

  state.locked = true;
  const expected = state.current.answer;
  state.current.userAnswer = user;
  const correct = (user === expected);
  state.current.correct = correct;

  // Effects must never prevent navigation to next screen
  if (correct) {
    state.ok += 1;
    els.feedback.textContent = "✅ Bravo !";
    safeCall(() => soundCorrect());
    safeCall(() => spawnConfetti({ count: 26, x: window.innerWidth / 2, y: window.innerHeight / 2, spread: 120, power: 8 }));
  } else {
    els.feedback.textContent = `❌ C’était ${expected}`;
    safeCall(() => soundWrong());
  }

  const isLast = (state.currentIndex === config.totalQuestions - 1);
  scheduleAfterAnswer(isLast ? 650 : 520, isLast ? finishGame : nextQuestion);
  if (isLast) {
    // Watchdog: if something prevented transition, force it
    scheduleAfterAnswer(1200, () => { try { if (currentScreen === "game") finishGame(); } catch (e) { try { finishGame(); } catch {} } });
  }
}

function skipQuestion() {
  if (state.locked) return;
  state.locked = true;
  state.current.skipped = true;
  state.current.userAnswer = null;
  state.current.correct = false;
  els.feedback.textContent = `⏭️ Réponse : ${state.current.answer}`;
  safeCall(() => soundWrong());

  const isLast = (state.currentIndex === config.totalQuestions - 1);
  scheduleAfterAnswer(isLast ? 520 : 420, isLast ? finishGame : nextQuestion);
  if (isLast) {
    scheduleAfterAnswer(1100, () => { try { if (currentScreen === "game") finishGame(); } catch (e) { try { finishGame(); } catch {} } });
  }
}

function stopGameNow() {
  if (state.locked) return;
  state.locked = true;
  if (state.current && state.current.userAnswer === null) {
    state.current.skipped = true;
    state.current.correct = false;
  }
  for (let i = state.currentIndex; i < config.totalQuestions; i++) {
    const q = state.questions[i];
    if (q.correct === null) { q.skipped = true; q.correct = false; }
  }
  finishGame();
}

// ---------- History ----------
function loadHistory() {
  try {
    const raw = localStorage.getItem(historyKeyFor(activeProfile));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}
function saveHistory(arr) {
  localStorage.setItem(historyKeyFor(activeProfile), JSON.stringify(arr));
}
function addHistory(entry) {
  const history = loadHistory();
  history.unshift(entry);
  saveHistory(history.slice(0, HISTORY_MAX));
}
function resetHistory() {
  localStorage.removeItem(historyKeyFor(activeProfile));
  renderScores();
}

els.resetHistoryBtn.addEventListener("click", resetHistory);

// ---------- Scores render ----------
function renderScores() {
  els.profileLabel.textContent = activeProfile;
  const history = loadHistory();
  els.scoresList.innerHTML = "";

  if (history.length === 0) {
    const div = document.createElement("div");
    div.className = "score-card";
    div.innerHTML = `<div class="score-mode">Aucun score</div><div class="score-date">Joue une partie pour commencer 🙂</div>`;
    els.scoresList.appendChild(div);
    return;
  }

  history.forEach(h => {
    const div = document.createElement("div");
    div.className = "score-card";
    div.innerHTML = `
      <div class="score-top">
        <div>
          <div class="score-mode">${escapeHtml(String(h.mode))}</div>
          <div class="score-date">${escapeHtml(formatDate(h.ts))}</div>
        </div>
        <div class="pill pill-mono">${escapeHtml(String(h.score))}%</div>
      </div>

      <div class="score-grid">
        <div class="score-pill"><span class="k">Niveau</span><span class="v">${escapeHtml(String(h.maxValue))}</span></div>
        <div class="score-pill"><span class="k">Questions</span><span class="v">${escapeHtml(String(h.total))}</span></div>
        <div class="score-pill"><span class="k">✅</span><span class="v">${escapeHtml(String(h.ok))}</span></div>
        <div class="score-pill"><span class="k">⏱️</span><span class="v">${escapeHtml(String(h.avgSec ?? 0))}s/q</span></div>
      </div>
    `;
    els.scoresList.appendChild(div);
  });
}

// ---------- Finish game + progression ----------
function maybeUnlockNextLevel({ score, total }) {
  if (!config.progressEnabled) return;
  const okToUnlock = (total >= PASS_MIN_QUESTIONS) && (score >= PASS_SCORE_MIN);
  if (!okToUnlock) return;
  const next = Math.min(progress.unlockedMax + LEVEL_STEP, LEVEL_MAX_CAP);
  if (next > progress.unlockedMax) {
    progress.unlockedMax = next;
    saveProgress(activeProfile, progress);
    els.unlockedMax.textContent = String(progress.unlockedMax);
  }
}

function finishGame() {
  // Always navigate to Results, even if a rendering error happens
  state.locked = false;
  try { stopTimer(); } catch (e) {}
  try { showScreen("results"); } catch (e) {}

  const total = config.totalQuestions;
  const ok = state.ok;
  const err = total - ok;
  const score = total > 0 ? Math.round((ok / total) * 100) : 0;

  els.finalOk.textContent = String(ok);
  els.finalErr.textContent = String(err);
  els.finalScore.textContent = `${score}%`;

  // review (safe)
  try {
    els.reviewList.innerHTML = "";
    state.questions.forEach((q, idx) => {
    const left = `${idx + 1}. ${q.a} ${q.op} ${q.b} = ${q.userAnswer === null ? "…" : q.userAnswer}`;
    const right = `→ ${q.answer}`;
    const item = document.createElement("div");
    item.className = `item ${q.correct ? "ok" : "err"}`;
    item.innerHTML = `<span>${escapeHtml(left)}</span><span class="right">${escapeHtml(right)}</span>`;
      els.reviewList.appendChild(item);
    });
  } catch (e) {
    try { els.reviewList.innerHTML = "<div class=\"muted\">Corrigé indisponible.</div>"; } catch {}
  }

  const timeSec = Math.round(elapsedMs / 1000);
  const avg = total > 0 ? (elapsedMs / 1000 / total) : 0;

  const modeLabel = (config.mode === "tables")
    ? `Tables (${clampInt(els.tableNumber.value,1,20)}) ${els.tablesOp.value === "add" ? "Addition" : "Soustraction"}`
    : (config.mode === "add" ? "Addition" : config.mode === "sub" ? "Soustraction" : "Mix");

  addHistory({
    profile: activeProfile,
    ts: Date.now(),
    mode: modeLabel,
    maxValue: config.maxValue,
    total,
    ok,
    err,
    score,
    timeSec,
    avgSec: Number(avg.toFixed(1)),
    progressionOn: config.progressEnabled
  });

  maybeUnlockNextLevel({ score, total });

  els.timeSummary.textContent = `👤 ${activeProfile} — ⏱️ ${timeSec}s — ${avg.toFixed(1)}s/question`;

  // already on results screen

  if (config.confettiEnabled && total >= PASS_MIN_QUESTIONS && score >= PASS_SCORE_MIN) {
    spawnConfetti({ count: 140, x: window.innerWidth / 2, y: window.innerHeight / 4, spread: 160, power: 11 });
  }
}

// ---------- Profile management (settings) ----------
els.renameProfileBtn.addEventListener("click", () => {
  const oldName = activeProfile;
  const newName = (prompt(`Renommer "${oldName}" en :`) || "").trim();
  if (!newName || newName === oldName) return;
  if (profiles.includes(newName)) return alert("Ce nom existe déjà.");

  const oldHist = localStorage.getItem(historyKeyFor(oldName));
  const oldProg = localStorage.getItem(progressKeyFor(oldName));
  if (oldHist !== null) localStorage.setItem(historyKeyFor(newName), oldHist);
  if (oldProg !== null) localStorage.setItem(progressKeyFor(newName), oldProg);
  localStorage.removeItem(historyKeyFor(oldName));
  localStorage.removeItem(progressKeyFor(oldName));

  profiles = profiles.map(p => (p === oldName ? newName : p));
  saveProfiles(profiles);

  activeProfile = newName;
  setActiveProfile(activeProfile);

  progress = loadProgress(activeProfile);
  els.unlockedMax.textContent = String(progress.unlockedMax);

  renderProfiles();
  renderScores();
});

els.deleteProfileBtn.addEventListener("click", () => {
  if (profiles.length <= 1) return alert("Il faut conserver au moins 1 profil.");
  const ok = confirm(`Supprimer le profil "${activeProfile}" ? (scores + progression seront perdus)`);
  if (!ok) return;

  localStorage.removeItem(historyKeyFor(activeProfile));
  localStorage.removeItem(progressKeyFor(activeProfile));

  profiles = profiles.filter(p => p !== activeProfile);
  saveProfiles(profiles);

  activeProfile = profiles[0];
  setActiveProfile(activeProfile);

  progress = loadProgress(activeProfile);
  els.unlockedMax.textContent = String(progress.unlockedMax);

  renderProfiles();
  renderScores();
});

// ---------- UI Events ----------
els.startBtn.addEventListener("click", startGame);
els.validateBtn.addEventListener("click", validateAnswer);
els.skipBtn.addEventListener("click", skipQuestion);
els.stopBtn.addEventListener("click", stopGameNow);

els.answerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") validateAnswer();
});

els.playAgainBtn.addEventListener("click", startGame);
els.backHomeBtn.addEventListener("click", () => showScreen("home"));

// init
renderScores();
showScreen("home");


// Safety: avoid "blocked" state on unexpected errors
window.addEventListener("error", () => {
  try { state.locked = false; } catch {}
});
