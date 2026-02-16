/* Math Trainer PWA - V4 (mobile-first)
   - Accueil simplifié (Start + Mode + Profil)
   - Réglages dans une modale (sous-menus via <details>)
   - Gros boutons / inputs adaptés enfants
   - Profils multiples + progression + historique séparés
   - Sons + confettis
*/

const $ = (sel) => document.querySelector(sel);

const screens = {
  home: $("#screen-home"),
  game: $("#screen-game"),
  results: $("#screen-results"),
};

const els = {
  // Home
  startBtn: $("#startBtn"),
  resetHistoryBtn: $("#resetHistoryBtn"),
  openSettingsBtn: $("#openSettingsBtn"),
  modeHint: $("#modeHint"),
  segButtons: Array.from(document.querySelectorAll(".seg")),

  // Game
  qIndex: $("#qIndex"),
  qTotal: $("#qTotal"),
  okCount: $("#okCount"),
  errCount: $("#errCount"),
  a: $("#a"),
  b: $("#b"),
  op: $("#op"),
  answerInput: $("#answerInput"),
  feedback: $("#feedback"),
  validateBtn: $("#validateBtn"),
  skipBtn: $("#skipBtn"),
  stopBtn: $("#stopBtn"),

  timer: $("#timer"),
  avgPerQ: $("#avgPerQ"),

  // Results
  finalOk: $("#finalOk"),
  finalErr: $("#finalErr"),
  finalScore: $("#finalScore"),
  reviewList: $("#reviewList"),
  timeSummary: $("#timeSummary"),
  playAgainBtn: $("#playAgainBtn"),
  backHomeBtn: $("#backHomeBtn"),

  // History
  historyBody: $("#historyBody"),

  // Install
  installBtn: $("#installBtn"),
};

const ui = {
  // profiles
  profileSelect: $("#profileSelect"),
  addProfileBtn: $("#addProfileBtn"),
  renameProfileBtn: $("#renameProfileBtn"),
  deleteProfileBtn: $("#deleteProfileBtn"),

  // settings modal
  settingsModal: $("#settingsModal"),
  closeSettingsBtn: $("#closeSettingsBtn"),
  saveSettingsBtn: $("#saveSettingsBtn"),

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
};

// Storage keys
const PROFILES_KEY = "math_trainer_profiles_v4";
const ACTIVE_PROFILE_KEY = "math_trainer_active_profile_v4";

// Progression thresholds
const LEVEL_STEP = 10;
const LEVEL_MAX_CAP = 200;
const PASS_SCORE_MIN = 80;
const PASS_MIN_QUESTIONS = 10;

// -------------------- PWA install prompt --------------------
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

// -------------------- Service Worker --------------------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js");
  });
}

// -------------------- Helpers --------------------
function showScreen(name) {
  Object.values(screens).forEach(s => (s.hidden = true));
  screens[name].hidden = false;
}

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

// -------------------- Profiles --------------------
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
  ui.profileSelect.innerHTML = "";
  profiles.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = p;
    if (p === activeProfile) opt.selected = true;
    ui.profileSelect.appendChild(opt);
  });
}
renderProfiles();

ui.profileSelect.addEventListener("change", () => {
  activeProfile = ui.profileSelect.value;
  setActiveProfile(activeProfile);
  progress = loadProgress(activeProfile);
  ui.unlockedMax.textContent = String(progress.unlockedMax);
  renderHistory();
});

ui.addProfileBtn.addEventListener("click", () => {
  const name = (prompt("Nom du nouveau profil :") || "").trim();
  if (!name) return;
  if (profiles.includes(name)) return alert("Ce profil existe déjà.");
  profiles.push(name);
  saveProfiles(profiles);

  activeProfile = name;
  setActiveProfile(activeProfile);

  progress = { unlockedMax: 10 };
  saveProgress(activeProfile, progress);
  ui.unlockedMax.textContent = String(progress.unlockedMax);

  renderProfiles();
  renderHistory();
});

// per-profile keys
function historyKeyFor(profile) { return `math_trainer_history_v4::${profile}`; }
function progressKeyFor(profile) { return `math_trainer_progress_v4::${profile}`; }

// -------------------- Progress per profile --------------------
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
ui.unlockedMax.textContent = String(progress.unlockedMax);

ui.resetProgressBtn.addEventListener("click", () => {
  progress = { unlockedMax: 10 };
  saveProgress(activeProfile, progress);
  ui.unlockedMax.textContent = String(progress.unlockedMax);
  ui.maxValue.value = String(Math.min(clampInt(ui.maxValue.value, 5, 200), progress.unlockedMax));
});

// Profile management in settings
ui.renameProfileBtn.addEventListener("click", () => {
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
  ui.unlockedMax.textContent = String(progress.unlockedMax);

  renderProfiles();
  renderHistory();
});

ui.deleteProfileBtn.addEventListener("click", () => {
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
  ui.unlockedMax.textContent = String(progress.unlockedMax);

  renderProfiles();
  renderHistory();
});

// -------------------- Modal settings --------------------
function openSettings() {
  ui.settingsModal.classList.add("open");
  ui.settingsModal.setAttribute("aria-hidden", "false");
}
function closeSettings() {
  ui.settingsModal.classList.remove("open");
  ui.settingsModal.setAttribute("aria-hidden", "true");
}

els.openSettingsBtn.addEventListener("click", openSettings);
ui.closeSettingsBtn.addEventListener("click", closeSettings);
ui.settingsModal.addEventListener("click", (e) => {
  const t = e.target;
  if (t && t.dataset && "close" in t.dataset) closeSettings();
});

ui.saveSettingsBtn.addEventListener("click", closeSettings);

// -------------------- Game configuration --------------------
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
  syncStartLabel();
}

els.segButtons.forEach(btn => btn.addEventListener("click", () => setMode(btn.dataset.mode)));

function syncStartLabel() {
  const q = clampInt(ui.questionsCount.value, 5, 50);
  els.startBtn.textContent = `▶️ Démarrer (${q} questions)`;
}
ui.questionsCount.addEventListener("input", syncStartLabel);
syncStartLabel();

// -------------------- Chrono --------------------
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

// -------------------- Confetti --------------------
let confettiCanvas, confettiCtx, confettiParticles = [], confettiAnimId = null;

function ensureConfettiCanvas() {
  if (confettiCanvas) return;
  confettiCanvas = document.createElement("canvas");
  confettiCanvas.id = "confettiCanvas";
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

    if (p.shape === "rect") {
      confettiCtx.fillRect(-p.size/2, -p.size/2, p.size, p.size * 0.7);
    } else {
      confettiCtx.beginPath();
      confettiCtx.arc(0, 0, p.size/2, 0, Math.PI * 2);
      confettiCtx.fill();
    }
    confettiCtx.restore();
  }

  if (confettiParticles.length === 0) {
    cancelAnimationFrame(confettiAnimId);
    confettiAnimId = null;
    confettiCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  }
}

// -------------------- Sounds --------------------
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

  o.connect(g);
  g.connect(ctx.destination);

  o.start();
  o.stop(ctx.currentTime + dur + 0.02);
}

function soundCorrect() {
  beep({ freq: 660, dur: 0.08, type: "triangle", gain: 0.06 });
  setTimeout(() => beep({ freq: 880, dur: 0.10, type: "triangle", gain: 0.055 }), 85);
}
function soundWrong() {
  beep({ freq: 220, dur: 0.14, type: "sawtooth", gain: 0.05 });
  setTimeout(() => beep({ freq: 180, dur: 0.14, type: "sawtooth", gain: 0.045 }), 90);
}

// -------------------- Questions --------------------
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

  if (op === "−" && !config.allowNegative) {
    if (b > a) [a, b] = [b, a];
  }
  const answer = (op === "+") ? (a + b) : (a - b);
  return { a, b, op, answer, userAnswer: null, correct: null, skipped: false };
}

function generateQuestionTables() {
  const t = clampInt(ui.tableNumber.value, 1, 20);
  const max = config.maxValue;
  const n = randInt(0, max);

  if (ui.tablesOp.value === "add") {
    return { a: t, b: n, op: "+", answer: t + n, userAnswer: null, correct: null, skipped: false, table: t };
  } else {
    const a = t + n;
    const b = t;
    return { a, b, op: "−", answer: a - b, userAnswer: null, correct: null, skipped: false, table: t };
  }
}

// -------------------- Game state --------------------
let state = {
  currentIndex: 0,
  ok: 0,
  questions: [],
  current: null,
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
  els.answerInput.focus();
  els.feedback.textContent = "";
}

function readSettingsIntoConfig() {
  config.totalQuestions = clampInt(ui.questionsCount.value, 5, 50);
  config.allowNegative = !!ui.allowNegative.checked;

  config.soundEnabled = !!ui.soundEnabled.checked;
  config.confettiEnabled = !!ui.confettiEnabled.checked;

  config.progressEnabled = !!ui.progressEnabled.checked;

  const requestedMax = clampInt(ui.maxValue.value, 5, 200);
  config.maxValue = config.progressEnabled ? Math.min(requestedMax, progress.unlockedMax) : requestedMax;
  if (config.progressEnabled) ui.maxValue.value = String(config.maxValue);
}

function startGame() {
  readSettingsIntoConfig();

  state = { currentIndex: 0, ok: 0, questions: [], current: null };

  const useTables = (config.mode === "tables") || !!ui.tablesEnabled.checked;

  for (let i = 0; i < config.totalQuestions; i++) {
    state.questions.push(useTables ? generateQuestionTables() : generateQuestionStandard());
  }
  state.current = state.questions[0];

  showScreen("game");
  startTimer();
  renderCurrentQuestion();
  ensureAudio();
}

function nextQuestion() {
  state.currentIndex += 1;

  if (state.currentIndex >= config.totalQuestions) {
    finishGame();
    return;
  }

  state.current = state.questions[state.currentIndex];
  renderCurrentQuestion();
}

function validateAnswer() {
  const raw = els.answerInput.value.trim().replace(",", ".");
  if (raw.length === 0) {
    els.feedback.textContent = "Entre une réponse 🙂";
    els.answerInput.focus();
    return;
  }
  const user = Number(raw);
  if (Number.isNaN(user)) {
    els.feedback.textContent = "Réponse invalide.";
    els.answerInput.focus();
    return;
  }

  const expected = state.current.answer;
  state.current.userAnswer = user;

  const correct = user === expected;
  state.current.correct = correct;

  if (correct) {
    state.ok += 1;
    els.feedback.textContent = "✅ Bravo !";
    soundCorrect();
    spawnConfetti({ count: 26, x: window.innerWidth / 2, y: window.innerHeight / 2, spread: 120, power: 8 });
  } else {
    els.feedback.textContent = `❌ C’était ${expected}`;
    soundWrong();
  }

  setTimeout(nextQuestion, 550);
}

function skipQuestion() {
  state.current.skipped = true;
  state.current.userAnswer = null;
  state.current.correct = false;
  els.feedback.textContent = `⏭️ Réponse : ${state.current.answer}`;
  soundWrong();
  setTimeout(nextQuestion, 420);
}

function stopGameNow() {
  if (state.current && state.current.userAnswer === null) {
    state.current.skipped = true;
    state.current.correct = false;
  }
  for (let i = state.currentIndex; i < config.totalQuestions; i++) {
    const q = state.questions[i];
    if (q.correct === null) {
      q.skipped = true;
      q.correct = false;
    }
  }
  finishGame();
}

// -------------------- History (per profile) --------------------
const HISTORY_MAX = 12;

function loadHistory() {
  try {
    const raw = localStorage.getItem(historyKeyFor(activeProfile));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
  renderHistory();
}
function renderHistory() {
  const history = loadHistory();
  els.historyBody.innerHTML = "";

  if (history.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td colspan="7" class="muted">Aucun score pour ${escapeHtml(activeProfile)}.</td>`;
    els.historyBody.appendChild(tr);
    return;
  }

  history.forEach(h => {
    const tr = document.createElement("tr");
    const dateCell = `${formatDate(h.ts)}<br><span class="muted" style="font-size:12px;">${h.timeSec ?? 0}s • ${h.avgSec ?? 0}s/q</span>`;
    const scoreCell = `${h.score}%${h.progressionOn ? `<br><span class="muted" style="font-size:12px;">progression</span>` : ""}`;

    tr.innerHTML = `
      <td>${dateCell}</td>
      <td>${escapeHtml(String(h.mode))}</td>
      <td>${escapeHtml(String(h.maxValue))}</td>
      <td>${escapeHtml(String(h.total))}</td>
      <td>${escapeHtml(String(h.ok))}</td>
      <td>${escapeHtml(String(h.err))}</td>
      <td>${scoreCell}</td>
    `;
    els.historyBody.appendChild(tr);
  });
}

// -------------------- Finish + progression --------------------
function maybeUnlockNextLevel({ score, total }) {
  if (!config.progressEnabled) return;
  const okToUnlock = (total >= PASS_MIN_QUESTIONS) && (score >= PASS_SCORE_MIN);
  if (!okToUnlock) return;

  const next = Math.min(progress.unlockedMax + LEVEL_STEP, LEVEL_MAX_CAP);
  if (next > progress.unlockedMax) {
    progress.unlockedMax = next;
    saveProgress(activeProfile, progress);
    ui.unlockedMax.textContent = String(progress.unlockedMax);
  }
}

function finishGame() {
  stopTimer();

  const total = config.totalQuestions;
  const ok = state.ok;
  const err = total - ok;
  const score = total > 0 ? Math.round((ok / total) * 100) : 0;

  els.finalOk.textContent = String(ok);
  els.finalErr.textContent = String(err);
  els.finalScore.textContent = `${score}%`;

  els.reviewList.innerHTML = "";
  state.questions.forEach((q, idx) => {
    const left = `${idx + 1}. ${q.a} ${q.op} ${q.b} = ${q.userAnswer === null ? "…" : q.userAnswer}`;
    const right = `→ ${q.answer}`;
    const div = document.createElement("div");
    div.className = `item ${q.correct ? "ok" : "err"}`;
    div.innerHTML = `<span>${escapeHtml(left)}</span><span class="right">${escapeHtml(right)}</span>`;
    els.reviewList.appendChild(div);
  });

  const timeSec = Math.round(elapsedMs / 1000);
  const avg = total > 0 ? (elapsedMs / 1000 / total) : 0;

  const modeLabel = (config.mode === "tables")
    ? `Tables (${clampInt(ui.tableNumber.value,1,20)}) ${ui.tablesOp.value === "add" ? "Addition" : "Soustraction"}`
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

  renderHistory();
  showScreen("results");
  els.timeSummary.textContent = `👤 ${activeProfile} — ⏱️ ${timeSec}s — ${avg.toFixed(1)}s/question`;

  if (config.confettiEnabled && total >= PASS_MIN_QUESTIONS && score >= PASS_SCORE_MIN) {
    spawnConfetti({ count: 140, x: window.innerWidth / 2, y: window.innerHeight / 4, spread: 160, power: 11 });
  }
}

// -------------------- Events --------------------
els.startBtn.addEventListener("click", startGame);
els.resetHistoryBtn.addEventListener("click", resetHistory);

els.validateBtn.addEventListener("click", validateAnswer);
els.skipBtn.addEventListener("click", skipQuestion);
els.stopBtn.addEventListener("click", stopGameNow);

els.playAgainBtn.addEventListener("click", startGame);
els.backHomeBtn.addEventListener("click", () => showScreen("home"));

els.answerInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") validateAnswer();
});

// init
setMode("mix");
renderHistory();
showScreen("home");
