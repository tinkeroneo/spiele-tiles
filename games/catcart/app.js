const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const lapsEl = document.getElementById("laps");
const timeEl = document.getElementById("time");
const bestEl = document.getElementById("best");
const speedEl = document.getElementById("speed");
const resetBtn = document.getElementById("reset");

const track = {
  outer: { x: 40, y: 40, w: 700, h: 440 },
  inner: { x: 180, y: 140, w: 420, h: 240 }
};

const checkpoints = [
  { x: 390, y: 70, r: 24 },
  { x: 680, y: 260, r: 24 },
  { x: 390, y: 450, r: 24 },
  { x: 120, y: 260, r: 24 }
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
  finished: false
};

function reset() {
  state.kart = { x: 360, y: 100, angle: Math.PI / 2, speed: 0 };
  state.lap = 0;
  state.startTime = performance.now();
  state.lastTime = null;
  state.hitCheckpoints = new Set();
  state.finished = false;
  updateHud();
}

function updateHud() {
  lapsEl.textContent = state.lap;
  const now = performance.now();
  const timeSec = state.startTime ? ((now - state.startTime) / 1000) : 0;
  timeEl.textContent = `${timeSec.toFixed(1)} s`;
  bestEl.textContent = state.bestLap ? `${state.bestLap.toFixed(2)} s` : "-";
  speedEl.textContent = Math.round(state.kart.speed * 60);
}

function insideOuter(x, y) {
  return x > track.outer.x && x < track.outer.x + track.outer.w && y > track.outer.y && y < track.outer.y + track.outer.h;
}

function insideInner(x, y) {
  return x > track.inner.x && x < track.inner.x + track.inner.w && y > track.inner.y && y < track.inner.y + track.inner.h;
}

function onTrack(x, y) {
  return insideOuter(x, y) && !insideInner(x, y);
}

function clampKart() {
  const k = state.kart;
  if (!onTrack(k.x, k.y)) {
    k.speed *= 0.4;
    k.x = Math.min(Math.max(k.x, track.outer.x + 10), track.outer.x + track.outer.w - 10);
    k.y = Math.min(Math.max(k.y, track.outer.y + 10), track.outer.y + track.outer.h - 10);
  }
}

function updateKart(dt) {
  const k = state.kart;
  const accel = state.keys["ArrowUp"] || state.keys["KeyW"] ? 0.02 : 0;
  const brake = state.keys["ArrowDown"] || state.keys["KeyS"] ? 0.03 : 0;
  const turn = (state.keys["ArrowLeft"] || state.keys["KeyA"]) ? -0.035 : (state.keys["ArrowRight"] || state.keys["KeyD"]) ? 0.035 : 0;

  k.speed += accel - brake;
  k.speed *= 0.985;
  k.speed = Math.max(Math.min(k.speed, 4.2), -1.6);

  if (Math.abs(k.speed) > 0.05) {
    k.angle += turn * (0.6 + Math.abs(k.speed) / 4);
  }

  k.x += Math.cos(k.angle) * k.speed * dt;
  k.y += Math.sin(k.angle) * k.speed * dt;

  clampKart();
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

function checkLap() {
  const k = state.kart;
  if (k.x > startLine.x && k.x < startLine.x + startLine.w && k.y > startLine.y && k.y < startLine.y + startLine.h) {
    if (state.hitCheckpoints.size === checkpoints.length) {
      const now = performance.now();
      const lapTime = (now - state.startTime) / 1000;
      state.lap += 1;
      state.startTime = now;
      state.hitCheckpoints = new Set();
      if (!state.bestLap || lapTime < state.bestLap) state.bestLap = lapTime;
    }
  }
}

function drawTrack() {
  ctx.fillStyle = "#0b1015";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#3b4c5e";
  ctx.lineWidth = 8;
  ctx.strokeRect(track.outer.x, track.outer.y, track.outer.w, track.outer.h);
  ctx.strokeRect(track.inner.x, track.inner.y, track.inner.w, track.inner.h);

  ctx.strokeStyle = "#2b3947";
  ctx.lineWidth = 3;
  ctx.strokeRect(track.outer.x + 16, track.outer.y + 16, track.outer.w - 32, track.outer.h - 32);

  ctx.fillStyle = "#202a36";
  checkpoints.forEach((cp, idx) => {
    ctx.beginPath();
    ctx.arc(cp.x, cp.y, cp.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = state.hitCheckpoints.has(idx) ? "#58e07d" : "#3b4c5e";
    ctx.lineWidth = 3;
    ctx.stroke();
  });

  ctx.fillStyle = "#ffb347";
  ctx.fillRect(startLine.x, startLine.y, startLine.w, startLine.h);
}

function drawKart() {
  const k = state.kart;
  ctx.save();
  ctx.translate(k.x, k.y);
  ctx.rotate(k.angle);

  ctx.fillStyle = "#ffb347";
  ctx.fillRect(-10, -6, 20, 12);
  ctx.fillStyle = "#0c1014";
  ctx.fillRect(-4, -5, 8, 10);

  ctx.fillStyle = "#f2f5f7";
  ctx.beginPath();
  ctx.arc(10, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(20, now - last);
  last = now;
  updateKart(dt);
  checkCheckpoints();
  checkLap();
  drawTrack();
  drawKart();
  updateHud();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (e) => {
  state.keys[e.code] = true;
});

window.addEventListener("keyup", (e) => {
  state.keys[e.code] = false;
});

resetBtn.addEventListener("click", reset);

reset();
requestAnimationFrame(loop);
