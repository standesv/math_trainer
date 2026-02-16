/* Math Trainer PWA - V3
   + Sons (WebAudio: pas de fichiers)
   + Confettis (canvas)
   + Profils multiples avec progression + historique séparés
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
  maxValue: $("#maxValue"),
  allowNegative: $("#allowNegative"),
  questionsCount: $("#questionsCount"),
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

  // Results
  finalOk: $("#finalOk"),
  finalErr: $("#finalErr"),
  finalScore: $("#finalScore"),
  reviewList: $("#reviewList"),
  playAgainBtn: $("#playAgainBtn"),
  backHomeBtn: $("#backHomeBtn"),

  // History
  historyBody: $("#historyBody"),

  // Install
  installBtn: $("#installBtn"),
};

const PROFILES_KEY = "math_trainer_profiles_v3";
const ACTIVE_PROFILE_KEY = "math_trainer_active_profile_v3";

// Progression
const LEVEL_STEP = 10;        // paliers: 10, 20, 30...
const LEVEL_MAX_CAP = 200;    // plafond dur
const PASS_SCORE_MIN = 80;    // % mini pour "valider" un niveau
const PASS_MIN_QUESTIONS = 10;

// -------------------- UI: inject Profils + Tables + Progress --------------------
(function injectHomeUI() {
  const home = $("#screen-home");
  const grid = home.querySelector(".grid");

  // Profils
  const profilesField = document.createElement("div");
  profilesField.className = "field";
  profilesField.innerHTML = `
    <label>Profil</label>
    <div style="display:flex; gap:10px; align-items:center; margin-top:8px; flex-wrap:wrap;">
      <select id="profileSelect"
        style="min-width:220px; padding:10px 12px; border-radius:12px; border:1px solid var(--border); background: rgba(0,0,0,.20); color: var(--text);">
      </select>
      <button type="button" id="addProfileBtn" class="btn btn-ghost">Ajouter</button>
      <button type="button" id="renameProfileBtn" class="btn btn-ghost">Renommer</button>
      <button type="button" id="deleteProfileBtn" class="btn btn-danger">Supprimer</button>
    </div>
    <small>Chaque profil a son historique et sa progression.</small>
  `;
  grid.prepend(profilesField);

  // Bloc sons / confettis
  const fxField = document.createElement("div");
  fxField.className = "field";
  fxField.innerHTML = `
    <label>Effets</label>
    <div style="display:flex; gap:14px; align-items:center; margin-top:8px; flex-wrap:wrap;">
      <label style="display:flex; gap:8px; align-items:center; color: var(--muted); font-weight:700;">
        <input id="soundEnabled" type="checkbox" checked />
        Sons
      </label>
      <label style="display:flex; gap:8px; align-items:center; color: var(--muted); font-weight:700;">
        <input id="confettiEnabled" type="checkbox" checked />
        Confettis
      </label>
    </div>
    <small>Les sons utilisent le synthé du navigateur (aucun fichier audio).</small>
  `;
  grid.appendChild(fxField);

  // Bloc mode tables
  const tablesField = document.createElement("div");
  tablesField.className = "field";
  tablesField.innerHTML = `
    <label>Mode Tables</label>
    <div style="display:flex; gap:10px; align-items:center; margin-top:8px; flex-wrap:wrap;">
      <label style="display:flex; gap:8px; align-items:center; color: var(--muted); font-weight:700;">
        <input id="tablesEnabled" type="checkbox" />
        Activer
      </label>

      <div style="display:flex; gap:8px; align-items:center;">
        <span class="muted" style="font-size:12px; font-weight:800;">Table :</span>
        <input id="tableNumber" type="number" min="1" max="20" step="1" value="7"
               style="width:90px;" />
      </div>

      <div style="display:flex; gap:8px; align-items:center;">
        <span class="muted" style="font-size:12px; font-weight:800;">Opération :</span>
        <select id="tablesOp"
                style="padding:10px 12px; border-radius:12px; border:1px solid var(--border); background: rgba(0,0,0,.20); color: var(--text);">
          <option value="add">Addition</option>
          <option value="sub">Soustraction</option>
        </select>
      </div>
    </div>
    <small>Ex : table 7 en addition ⇒ 7 + n. En soustraction ⇒ (7 + n) − 7.</small>
  `;
  grid.appendChild(tablesField);

  // Bloc progression
  const progressField = document.createElement("div");
  progressField.className = "field";
  progressField.innerHTML = `
    <label>Progression par niveau</label>
    <div style="display:flex; gap:10px; align-items:center; margin-top:8px; flex-wrap:wrap;">
      <label style="display:flex; gap:8px; align-items:center; color: var(--muted); font-weight:700;">
        <input id="progressEnabled" type="checkbox" checked />
        Activer
      </label>
      <div class="pill" style="font-family: var(--mono);">
        Niveau max débloqué : <span id="unlockedMax">10</span>
      </div>
      <button type="button" id="resetProgressBtn" class="btn btn-ghost">Réinitialiser</button>
    </div>
    <small>Si activé, le “Niveau (0 → max)” est plafonné au niveau débloqué.</small>
  `;
  grid.appendChild(progressField);
})();

// -------------------- UI chrono (inject dans écran jeu) --------------------
(function injectGameTimerUI() {
  const gameCard = $("#screen-game");
  const headerRow = gameCard.querySelector(".row-between");

  const timerPill = document.createElement("div");
  timerPill.className = "pill";
  timerPill.style.fontFamily = "var(--mono)";
  timerPill.innerHTML = `⏱️ <span id="timer">00:00</span>`;
  headerRow.appendChild(timerPill);

  const hint = document.createElement("p");
  hint.className = "muted";
  hint.style.margin = "6px 0 0 0";
  hint.innerHTML = `Moyenne : <span id="avgPerQ">0.0</span> s / question`;
  headerRow.parentElement.insertBefore(hint, headerRow.nextSibling);
})();

const ui = {
  // profils
  profileSelect: $("#profileSelect"),
  addProfileBtn: $("#addProfileBtn"),
  renameProfileBtn: $("#renameProfileBtn"),
  deleteProfileBtn: $("#deleteProfileBtn"),

  // FX
  soundEnabled: $("#soundEnabled"),
  confettiEnabled: $("#confettiEnabled"),

  // tables
  tablesEnabled: $("#tablesEnabled"),
  tableNumber: $("#tableNumber"),
  tablesOp: $("#tablesOp"),

  // progress
  progressEnabled: $("#progressEnabled"),
  unlockedMax: $("#unlockedMax"),
  resetProgressBtn: $("#resetProgressBtn"),
};

const chronoEls = {
  timer: $("#timer"),
  avgPerQ: $("#avgPerQ"),
};

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

// -------------------- Profiles storage --------------------
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

// per-profile keys
function historyKeyFor(profile) { return `math_trainer_history_v3::${profile}`; }
function progressKeyFor(profile) { return `math_trainer_progress_v3::${profile}`; }

// -------------------- Progress per profile --------------------
function clampInt(v, min, max) {
  const n = Math.round(Number(v));
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}
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

// -------------------- Populate profiles UI --------------------
function renderProfiles() {
  ui.profileSelect.innerHTML = "";
  profiles.forEach((p) => {
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
  const name = (prompt("Nom du nouveau profil (ex: Livia) :") || "").trim();
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

ui.renameProfileBtn.addEventListener("click", () => {
  const oldName = activeProfile;
  const newName = (prompt(`Renommer "${oldName}" en :`) || "").trim();
  if (!newName || newName === oldName) return;
  if (profiles.includes(newName)) return alert("Ce nom existe déjà.");

  // migrate data keys
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
  const ok = confirm(`Supprimer le profil "${activeProfile}" ? (historique + progression seront perdus)`);
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

ui.resetProgressBtn.addEventListener("click", () => {
  progress = { unlockedMax: 10 };
  saveProgress(activeProfile, progress);
  ui.unlockedMax.textContent = String(progress.unlockedMax);
  els.maxValue.value = String(Math.min(clampInt(els.maxValue.value, 5, 200), progress.unlockedMax));
});

// -------------------- Game config/state --------------------
function showScreen(name) {
  Object.values(screens).forEach(s => (s.hidden = true));
  screens[name].hidden = false;
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

function modeLabel(mode) {
  if (mode === "add") return "Addition";
  if (mode === "sub") return "Soustraction";
  return "Mix";
}
function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleString("fr-FR", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
}

let config = {
  mode: "mix",          // mix | add | sub
  maxValue: 20,
  allowNegative: false,
  totalQuestions: 10,

  tablesEnabled: false,
  tableNumber: 7,
  tablesOp: "add",

  soundEnabled: true,
  confettiEnabled: true,
};

let state = {
  currentIndex: 0,
  ok: 0,
  questions: [],
  current: null,

  timerId: null,
  elapsedMs: 0,
};

// -------------------- Confetti (canvas overlay) --------------------
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
      shape: Math.random() < 0.5 ? "rect" : "circle"
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

    confettiCtx.fillStyle = `hsl(${Math.floor(Math.random() * 360)}, 90%, 60%)`;

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

// -------------------- Sound (WebAudio) --------------------
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

// -------------------- Modes --------------------
function setMode(mode) {
  config.mode = mode;
  els.segButtons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
}
els.segButtons.forEach(btn => btn.addEventListener("click", () => setMode(btn.dataset.mode)));

// -------------------- Chrono --------------------
function formatMMSS(ms) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}
function startTimer() {
  stopTimer();
  const start = Date.now();
  state.elapsedMs = 0;
  chronoEls.timer.textContent = "00:00";
  chronoEls.avgPerQ.textContent = "0.0";

  state.timerId = setInterval(() => {
    state.elapsedMs = Date.now() - start;
    chronoEls.timer.textContent = formatMMSS(state.elapsedMs);
    const answered = Math.max(1, state.currentIndex + 1);
    chronoEls.avgPerQ.textContent = (state.elapsedMs / 1000 / answered).toFixed(1);
  }, 200);
}
function stopTimer() {
  if (state.timerId) clearInterval(state.timerId);
  state.timerId = null;
}

// -------------------- Question generation --------------------
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
  const t = clampInt(config.tableNumber, 1, 20);
  const max = config.maxValue;
  const n = randInt(0, max);

  if (config.tablesOp === "add") {
    return { a: t, b: n, op: "+", answer: t + n, userAnswer: null, correct: null, skipped: false, table: t };
  } else {
    const a = t + n;
    const b = t;
    return { a, b, op: "−", answer: a - b, userAnswer: null, correct: null, skipped: false, table: t };
  }
}

// -------------------- Render question --------------------
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

// -------------------- Game flow --------------------
function startGame() {
  config.tablesEnabled = !!ui.tablesEnabled.checked;
  config.tableNumber = clampInt(ui.tableNumber.value, 1, 20);
  config.tablesOp = ui.tablesOp.value === "sub" ? "sub" : "add";

  config.soundEnabled = !!ui.soundEnabled.checked;
  config.confettiEnabled = !!ui.confettiEnabled.checked;

  const progressOn = !!ui.progressEnabled.checked;
  const requestedMax = clampInt(els.maxValue.value, 5, 200);
  config.maxValue = progressOn ? Math.min(requestedMax, progress.unlockedMax) : requestedMax;
  if (progressOn) els.maxValue.value = String(config.maxValue);

  config.allowNegative = !!els.allowNegative.checked;
  config.totalQuestions = clampInt(els.questionsCount.value, 5, 50);

  state = {
    currentIndex: 0,
    ok: 0,
    questions: [],
    current: null,
    timerId: null,
    elapsedMs: 0,
  };

  for (let i = 0; i < config.totalQuestions; i++) {
    state.questions.push(config.tablesEnabled ? generateQuestionTables() : generateQuestionStandard());
  }
  state.current = state.questions[0];

  showScreen("game");
  startTimer();
  renderCurrentQuestion();

  ensureAudio();
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
    els.feedback.textContent = "Réponse invalide (nombre attendu).";
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
    spawnConfetti({ count: 28, x: window.innerWidth / 2, y: window.innerHeight / 2, spread: 120, power: 8 });
  } else {
    els.feedback.textContent = `❌ Oups… la bonne réponse était ${expected}`;
    soundWrong();
  }

  setTimeout(nextQuestion, 600);
}

function skipQuestion() {
  state.current.skipped = true;
  state.current.userAnswer = null;
  state.current.correct = false;
  els.feedback.textContent = `⏭️ Passé — réponse : ${state.current.answer}`;
  soundWrong();
  setTimeout(nextQuestion, 450);
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

  const timeSec = Math.round(state.elapsedMs / 1000);
  const avg = total > 0 ? (state.elapsedMs / 1000 / total) : 0;

  addHistory({
    profile: activeProfile,
    ts: Date.now(),
    mode: config.tablesEnabled
      ? `Tables (${config.tableNumber}) ${config.tablesOp === "add" ? "Addition" : "Soustraction"}`
      : modeLabel(config.mode),
    maxValue: config.maxValue,
    total,
    ok,
    err,
    score,
    timeSec,
    avgSec: Number(avg.toFixed(1)),
    progressionOn: !!ui.progressEnabled.checked
  });

  maybeUnlockNextLevel({ score, total });

  renderHistory();
  showScreen("results");
  injectTimeSummary(timeSec, avg);

  if (config.confettiEnabled && total >= PASS_MIN_QUESTIONS && score >= PASS_SCORE_MIN) {
    spawnConfetti({ count: 140, x: window.innerWidth / 2, y: window.innerHeight / 4, spread: 160, power: 11 });
  }
}

function injectTimeSummary(timeSec, avg) {
  let existing = $("#timeSummary");
  if (!existing) {
    existing = document.createElement("p");
    existing.id = "timeSummary";
    existing.className = "muted";
    existing.style.marginTop = "10px";
    $("#screen-results").querySelector(".summary").after(existing);
  }
  existing.textContent = `👤 Profil : ${activeProfile} — ⏱️ Temps : ${timeSec}s — Moyenne : ${avg.toFixed(1)}s / question`;
}

function maybeUnlockNextLevel({ score, total }) {
  const enabled = !!ui.progressEnabled.checked;
  if (!enabled) return;

  const okToUnlock = (total >= PASS_MIN_QUESTIONS) && (score >= PASS_SCORE_MIN);
  if (!okToUnlock) return;

  const next = Math.min(progress.unlockedMax + LEVEL_STEP, LEVEL_MAX_CAP);
  if (next > progress.unlockedMax) {
    progress.unlockedMax = next;
    saveProgress(activeProfile, progress);
    ui.unlockedMax.textContent = String(progress.unlockedMax);
  }
}

// -------------------- History per profile --------------------
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
    tr.innerHTML = `<td colspan="7" class="muted">Aucune partie enregistrée pour ${escapeHtml(activeProfile)}.</td>`;
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
