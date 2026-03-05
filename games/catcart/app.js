const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const lapsEl = document.getElementById("laps");
const timeEl = document.getElementById("time");
const bestEl = document.getElementById("best");
const speedEl = document.getElementById("speed");
const resetBtn = document.getElementById("reset");
const countdownEl = document.getElementById("countdown");
const soundToggle = document.getElementById("soundToggle");
const touchButtons = Array.from(document.querySelectorAll(".touch-btn"));

const track = {
  outer: { x: 40, y: 40, w: 700, h: 440 },
  inner: { x: 190, y: 150, w: 400, h: 220 }
};

const walls = [
  { x: 120, y: 120, w: 120, h: 60 },
  { x: 520, y: 120, w: 120, h: 60 },
  { x: 520, y: 340, w: 120, h: 60 },
  { x: 120, y: 340, w: 120, h: 60 },
  { x: 310, y: 220, w: 160, h: 80 }
];

const checkpoints = [
  { x: 390, y: 70, r: 24 },
  { x: 680, y: 260, r: 24 },
  { x: 390, y: 450, r: 24 },
  { x: 120, y: 260, r: 24 }
];

const boostPads = [
  { x: 300, y: 86, w: 80, h: 18, lastHit: 0 },
  { x: 400, y: 416, w: 80, h: 18, lastHit: 0 },
  { x: 652, y: 230, w: 18, h: 60, lastHit: 0 }
];

const startLine = { x: 380, y: 40, w: 40, h: 8 };

const state = {
  kart: { x: 360, y: 100, angle: Math.PI / 2, speed: 0 },
  keys: {},
  lap: 0,
  startTime: null,
  lastTime: null,
  bestLap: null,
  hitCheckpoints: new Set(),
  startCrossed: false,
  bestGhost: [],
  ghostIndex: 0,
  currentPath: [],
  boostUntil: 0,
  raceStarted: false,
  awaitingStart: true,
  countdownTimer: null,
  audioOn: false
};

let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playBeep(freq, duration = 0.12, volume = 0.08) {
  if (!state.audioOn) return;
  ensureAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.value = freq;
  osc.type = "sine";
  gain.gain.value = volume;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

function playBoost() { playBeep(660, 0.08, 0.12); }
function playLap() { playBeep(520, 0.16, 0.1); }
function playTick() { playBeep(300, 0.08, 0.08); }
function playGo() { playBeep(880, 0.18, 0.12); }

function reset() {
  state.kart = { x: 360, y: 100, angle: Math.PI / 2, speed: 0 };
  state.lap = 0;
  state.startTime = null;
  state.lastTime = null;
  state.hitCheckpoints = new Set();
  state.startCrossed = false;
  state.currentPath = [];
  state.ghostIndex = 0;
  state.boostUntil = 0;
  state.raceStarted = false;
  state.awaitingStart = true;
  updateHud();
  countdownEl.textContent = "START";
  countdownEl.classList.add("show");
}

function updateHud() {
  lapsEl.textContent = state.lap;
  const now = performance.now();
  const timeSec = state.startTime ? ((now - state.startTime) / 1000) : 0;
  timeEl.textContent = `${timeSec.toFixed(1)} s`;
  bestEl.textContent = state.bestLap ? `${state.bestLap.toFixed(2)} s` : "-";
  speedEl.textContent = Math.round(state.kart.speed * 60);
}

function requestStart() {
  if (!state.awaitingStart) return;
  state.awaitingStart = false;
  startCountdown();
}

function startCountdown() {
  clearInterval(state.countdownTimer);
  let count = 3;
  countdownEl.textContent = String(count);
  countdownEl.classList.add("show");
  playTick();

  state.countdownTimer = setInterval(() => {
    count -= 1;
    if (count > 0) {
      countdownEl.textContent = String(count);
      playTick();
      return;
    }
    countdownEl.textContent = "GO";
    playGo();
    clearInterval(state.countdownTimer);
    setTimeout(() => {
      countdownEl.classList.remove("show");
      state.raceStarted = true;
      state.startTime = performance.now();
      state.currentPath = [];
    }, 400);
  }, 800);
}

function insideRect(x, y, rect) {
  return x > rect.x && x < rect.x + rect.w && y > rect.y && y < rect.y + rect.h;
}

function insideOuter(x, y) {
  return insideRect(x, y, track.outer);
}

function insideInner(x, y) {
  return insideRect(x, y, track.inner);
}

function insideWall(x, y) {
  return walls.some(w => insideRect(x, y, w));
}

function onTrack(x, y) {
  return insideOuter(x, y) && !insideInner(x, y) && !insideWall(x, y);
}

function updateKart(dt) {
  if (!state.raceStarted) return;
  const k = state.kart;
  const accel = state.keys["ArrowUp"] || state.keys["KeyW"] ? 0.18 : 0;
  const brake = state.keys["ArrowDown"] || state.keys["KeyS"] ? 0.26 : 0;
  const turn = (state.keys["ArrowLeft"] || state.keys["KeyA"]) ? -0.06 : (state.keys["ArrowRight"] || state.keys["KeyD"]) ? 0.06 : 0;
  const dtScale = dt / 16.67;

  const boostActive = performance.now() < state.boostUntil;
  const topSpeed = boostActive ? 3.2 : 2.6;

  k.speed += (accel - brake) * dtScale;
  k.speed *= 0.96;
  k.speed = Math.max(Math.min(k.speed, topSpeed), -1.2);

  if (Math.abs(k.speed) > 0.05) {
    k.angle += turn * (0.6 + Math.abs(k.speed) / 4);
  }

  const prev = { x: k.x, y: k.y };
  k.x += Math.cos(k.angle) * k.speed * 16 * dtScale;
  k.y += Math.sin(k.angle) * k.speed * 16 * dtScale;

  if (!onTrack(k.x, k.y)) {
    k.x = prev.x;
    k.y = prev.y;
    k.speed *= 0.4;
  }
}

function checkCheckpoints() {
  const k = state.kart;
  checkpoints.forEach((cp, idx) => {
    const dx = k.x - cp.x;
    const dy = k.y - cp.y;
    if (Math.hypot(dx, dy) < cp.r) {
      state.hitCheckpoints.add(idx);
    }
  });
}

function checkBoostPads() {
  const now = performance.now();
  const k = state.kart;
  boostPads.forEach(pad => {
    if (insideRect(k.x, k.y, pad) && now - pad.lastHit > 800) {
      pad.lastHit = now;
      state.boostUntil = now + 900;
      playBoost();
    }
  });
}

function checkLap() {
  if (!state.raceStarted) return;
  const k = state.kart;
  const onLine = k.x > startLine.x && k.x < startLine.x + startLine.w && k.y > startLine.y && k.y < startLine.y + startLine.h;

  if (!onLine) {
    state.startCrossed = false;
    return;
  }

  if (state.startCrossed) return;
  state.startCrossed = true;

  if (state.hitCheckpoints.size === checkpoints.length) {
    const now = performance.now();
    const lapTime = (now - state.startTime) / 1000;
    state.lap += 1;
    state.startTime = now;
    state.hitCheckpoints = new Set();

    if (!state.bestLap || lapTime < state.bestLap) {
      state.bestLap = lapTime;
      state.bestGhost = [...state.currentPath];
    }
    state.currentPath = [];
    state.ghostIndex = 0;
    playLap();
  }
}

function recordPath(now) {
  if (!state.raceStarted || !state.startTime) return;
  const k = state.kart;
  const t = (now - state.startTime) / 1000;
  state.currentPath.push({ x: k.x, y: k.y, t });
  if (state.currentPath.length > 2000) state.currentPath.shift();
}

function drawTrack() {
  ctx.fillStyle = "#0a0f14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#0f1a12";
  ctx.fillRect(20, 20, canvas.width - 40, canvas.height - 40);

  ctx.fillStyle = "#1a232c";
  ctx.fillRect(track.outer.x, track.outer.y, track.outer.w, track.outer.h);
  ctx.fillStyle = "#0f1a12";
  ctx.fillRect(track.inner.x, track.inner.y, track.inner.w, track.inner.h);

  ctx.fillStyle = "#131b24";
  walls.forEach(w => ctx.fillRect(w.x, w.y, w.w, w.h));

  ctx.strokeStyle = "#2b3947";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 10]);
  ctx.strokeRect(track.outer.x + 26, track.outer.y + 26, track.outer.w - 52, track.outer.h - 52);
  ctx.setLineDash([]);

  checkpoints.forEach((cp, idx) => {
    ctx.beginPath();
    ctx.arc(cp.x, cp.y, cp.r, 0, Math.PI * 2);
    ctx.fillStyle = "#1c2732";
    ctx.fill();
    ctx.strokeStyle = state.hitCheckpoints.has(idx) ? "#58e07d" : "#3b4c5e";
    ctx.lineWidth = 3;
    ctx.stroke();
  });

  boostPads.forEach(pad => {
    ctx.fillStyle = "rgba(97, 210, 255, 0.3)";
    ctx.fillRect(pad.x, pad.y, pad.w, pad.h);
    ctx.strokeStyle = "#61d2ff";
    ctx.strokeRect(pad.x, pad.y, pad.w, pad.h);
  });

  ctx.fillStyle = "#ffb347";
  ctx.fillRect(startLine.x, startLine.y, startLine.w, startLine.h);
}

function drawKart(k, ghost = false) {
  ctx.save();
  ctx.translate(k.x, k.y);
  ctx.rotate(k.angle || 0);

  ctx.globalAlpha = ghost ? 0.45 : 1;
  ctx.fillStyle = ghost ? "#61d2ff" : "#ffb347";
  ctx.fillRect(-14, -8, 28, 16);
  ctx.fillStyle = "#0c1014";
  ctx.fillRect(-6, -7, 12, 14);

  ctx.fillStyle = "#2b3947";
  ctx.fillRect(-12, -10, 6, 4);
  ctx.fillRect(6, -10, 6, 4);
  ctx.fillRect(-12, 6, 6, 4);
  ctx.fillRect(6, 6, 6, 4);

  ctx.fillStyle = "#f2f5f7";
  ctx.beginPath();
  ctx.arc(12, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawGhost(now) {
  if (!state.bestGhost.length || !state.raceStarted) return;
  const lapTime = (now - state.startTime) / 1000;
  while (state.ghostIndex < state.bestGhost.length - 1 && state.bestGhost[state.ghostIndex].t < lapTime) {
    state.ghostIndex += 1;
  }
  const ghost = state.bestGhost[state.ghostIndex];
  if (ghost) drawKart({ x: ghost.x, y: ghost.y, angle: 0 }, true);
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(20, now - last);
  last = now;
  updateKart(dt);
  checkCheckpoints();
  checkBoostPads();
  checkLap();
  recordPath(now);
  drawTrack();
  drawGhost(now);
  drawKart(state.kart, false);
  updateHud();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (e) => {
  state.keys[e.code] = true;
  requestStart();
});

window.addEventListener("keyup", (e) => {
  state.keys[e.code] = false;
});

touchButtons.forEach(btn => {
  const key = btn.dataset.key;
  btn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    state.keys[key] = true;
    requestStart();
  });
  btn.addEventListener("pointerup", () => { state.keys[key] = false; });
  btn.addEventListener("pointerleave", () => { state.keys[key] = false; });
});

soundToggle.addEventListener("click", () => {
  state.audioOn = !state.audioOn;
  if (state.audioOn) {
    ensureAudio();
    if (audioCtx.state === "suspended") audioCtx.resume();
  }
  soundToggle.textContent = state.audioOn ? "Sound: An" : "Sound: Aus";
});

resetBtn.addEventListener("click", reset);

reset();
requestAnimationFrame(loop);
