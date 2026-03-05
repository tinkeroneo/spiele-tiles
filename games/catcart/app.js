const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const lapsEl = document.getElementById("laps");
const timeEl = document.getElementById("time");
const bestEl = document.getElementById("best");
const speedEl = document.getElementById("speed");
const resetBtn = document.getElementById("reset");
const countdownEl = document.getElementById("countdown");
const soundToggle = document.getElementById("soundToggle");
const fullscreenToggle = document.getElementById("fullscreenToggle");
const touchButtons = Array.from(document.querySelectorAll(".touch-btn"));

let viewWidth = canvas.width;
let viewHeight = canvas.height;
let dpr = window.devicePixelRatio || 1;

const road = {
  segmentLength: 200,
  roadWidth: 2000,
  rumbleLength: 3,
  lanes: 2,
  cameraHeight: 1000,
  drawDistance: 180,
  fieldOfView: 90
};

const colors = {
  sky: "#0a0f14",
  grass1: "#0f1a12",
  grass2: "#0c1510",
  rumble1: "#2b3947",
  rumble2: "#202a36",
  road: "#1a232c",
  lane: "#c2ccd4"
};

const state = {
  position: 0,
  speed: 0,
  playerX: 0,
  lap: 0,
  startTime: null,
  bestLap: null,
  awaitingStart: true,
  raceStarted: false,
  countdownTimer: null,
  keys: {},
  audioOn: false
};

let segments = [];
let trackLength = 0;
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

function playTick() { playBeep(300, 0.08, 0.08); }
function playGo() { playBeep(880, 0.18, 0.12); }

function resizeCanvas() {
  const stage = canvas.parentElement;
  const maxW = stage.clientWidth;
  const maxH = Math.max(360, window.innerHeight * 0.6);
  const width = Math.min(980, maxW);
  const height = Math.min(maxH, width * 0.62);
  viewWidth = Math.round(width);
  viewHeight = Math.round(height);
  dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${Math.round(width)}px`;
  canvas.style.height = `${Math.round(height)}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function reset() {
  state.position = 0;
  state.speed = 0;
  state.playerX = 0;
  state.lap = 0;
  state.startTime = null;
  state.awaitingStart = true;
  state.raceStarted = false;
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
  speedEl.textContent = Math.round(state.speed * 120);
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
    }, 400);
  }, 800);
}

function requestStart() {
  if (!state.awaitingStart) return;
  state.awaitingStart = false;
  startCountdown();
}

function addSegment(curve = 0, y = 0) {
  const n = segments.length;
  segments.push({
    index: n,
    p1: { world: { x: 0, y: y, z: n * road.segmentLength } },
    p2: { world: { x: 0, y: y, z: (n + 1) * road.segmentLength } },
    curve
  });
}

function addRoad(enter, hold, leave, curve, hill) {
  const startY = segments.length ? segments[segments.length - 1].p2.world.y : 0;
  const endY = startY + hill * road.segmentLength;
  const total = enter + hold + leave;

  for (let i = 0; i < enter; i += 1) {
    addSegment(curve * (i / enter), startY + (endY - startY) * (i / total));
  }
  for (let i = 0; i < hold; i += 1) {
    addSegment(curve, startY + (endY - startY) * ((enter + i) / total));
  }
  for (let i = 0; i < leave; i += 1) {
    addSegment(curve * (1 - i / leave), startY + (endY - startY) * ((enter + hold + i) / total));
  }
}

function buildTrack() {
  segments = [];
  addRoad(20, 80, 20, 0, 0);
  addRoad(20, 50, 20, 0.8, 0);
  addRoad(20, 60, 20, -0.6, 0.3);
  addRoad(20, 40, 20, 1.0, -0.2);
  addRoad(20, 70, 20, -0.8, -0.3);
  addRoad(20, 60, 20, 0.4, 0.2);
  addRoad(20, 90, 20, 0, -0.4);

  trackLength = segments.length * road.segmentLength;
}

function findSegment(z) {
  return segments[Math.floor(z / road.segmentLength) % segments.length];
}

function project(p, cameraX, cameraY, cameraZ) {
  const cameraDepth = 1 / Math.tan((road.fieldOfView / 2) * Math.PI / 180);
  const transX = p.world.x - cameraX;
  const transY = p.world.y - cameraY;
  const transZ = p.world.z - cameraZ;
  if (transZ <= 1) return false;

  p.screen = p.screen || {};
  p.screen.scale = cameraDepth / transZ;
  p.screen.x = Math.round((1 + p.screen.scale * transX / road.roadWidth) * viewWidth / 2);
  p.screen.y = Math.round((1 - p.screen.scale * transY / road.roadWidth) * viewHeight / 2);
  p.screen.w = Math.round(p.screen.scale * viewWidth * road.roadWidth / 2);
  return true;
}

function drawSegment(p1, p2, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(p1.x - p1.w, p1.y);
  ctx.lineTo(p2.x - p2.w, p2.y);
  ctx.lineTo(p2.x + p2.w, p2.y);
  ctx.lineTo(p1.x + p1.w, p1.y);
  ctx.closePath();
  ctx.fill();
}

function render() {
  ctx.fillStyle = colors.sky;
  ctx.fillRect(0, 0, viewWidth, viewHeight);

  const baseSegment = findSegment(state.position);
  const baseIndex = baseSegment.index;
  const basePercent = (state.position % road.segmentLength) / road.segmentLength;

  let dx = -baseSegment.curve * basePercent;
  let x = 0;
  const projected = [];

  for (let n = 0; n < road.drawDistance; n += 1) {
    const segment = segments[(baseIndex + n) % segments.length];
    segment.looped = segment.index < baseIndex;

    const p1 = segment.p1;
    const p2 = segment.p2;

    p1.world.x = x;
    p2.world.x = x + dx;

    const camZ = state.position - (segment.looped ? trackLength : 0);
    if (!project(p1, state.playerX * road.roadWidth, road.cameraHeight, camZ)) {
      x += dx;
      dx += segment.curve;
      continue;
    }
    if (!project(p2, state.playerX * road.roadWidth, road.cameraHeight, camZ)) {
      x += dx;
      dx += segment.curve;
      continue;
    }

    projected.push({ segment, p1: p1.screen, p2: p2.screen });

    x += dx;
    dx += segment.curve;
  }

  let maxY = viewHeight;
  for (let i = projected.length - 1; i >= 0; i -= 1) {
    const { segment, p1, p2 } = projected[i];
    if (p1.y >= maxY || p2.y >= maxY) continue;

    const grass = (Math.floor(segment.index / road.rumbleLength) % 2) ? colors.grass1 : colors.grass2;
    drawSegment(
      { x: viewWidth / 2, y: p2.y, w: viewWidth },
      { x: viewWidth / 2, y: p1.y, w: viewWidth },
      grass
    );

    const rumble = (Math.floor(segment.index / road.rumbleLength) % 2) ? colors.rumble1 : colors.rumble2;
    drawSegment(
      { x: p2.x, y: p2.y, w: p2.w * 1.15 },
      { x: p1.x, y: p1.y, w: p1.w * 1.15 },
      rumble
    );

    drawSegment(
      { x: p2.x, y: p2.y, w: p2.w },
      { x: p1.x, y: p1.y, w: p1.w },
      colors.road
    );

    if (road.lanes > 1) {
      for (let lane = 1; lane < road.lanes; lane += 1) {
        const laneX1 = p1.x - p1.w + (p1.w * 2 * lane / road.lanes);
        const laneX2 = p2.x - p2.w + (p2.w * 2 * lane / road.lanes);
        ctx.strokeStyle = colors.lane;
        ctx.lineWidth = Math.max(1, p2.w / 140);
        ctx.beginPath();
        ctx.moveTo(laneX1, p1.y);
        ctx.lineTo(laneX2, p2.y);
        ctx.stroke();
      }
    }

    maxY = p1.y;
  }

  drawCar();
}

function drawCar() {
  const carW = 50;
  const carH = 90;
  const x = viewWidth / 2 + state.playerX * viewWidth * 0.25;
  const y = viewHeight - 140;

  ctx.fillStyle = "#ffb347";
  ctx.fillRect(x - carW / 2, y - carH / 2, carW, carH);
  ctx.fillStyle = "#0c1014";
  ctx.fillRect(x - 12, y - carH / 2 + 8, 24, carH - 16);
  ctx.fillStyle = "#f2f5f7";
  ctx.beginPath();
  ctx.arc(x + carW / 2 - 6, y - 10, 6, 0, Math.PI * 2);
  ctx.fill();
}

function update(dt) {
  if (!state.raceStarted) return;
  const accel = (state.keys["ArrowUp"] || state.keys["KeyW"]) ? 0.04 : 0;
  const brake = (state.keys["ArrowDown"] || state.keys["KeyS"]) ? 0.06 : 0;
  const turnLeft = state.keys["ArrowLeft"] || state.keys["KeyA"];
  const turnRight = state.keys["ArrowRight"] || state.keys["KeyD"];

  const maxSpeed = 2.6;
  state.speed += accel - brake;
  state.speed = Math.max(0, Math.min(maxSpeed, state.speed));
  state.speed *= 0.985;

  const segment = findSegment(state.position);
  state.playerX -= segment.curve * 0.003 * state.speed;
  if (turnLeft) state.playerX -= 0.03 * state.speed;
  if (turnRight) state.playerX += 0.03 * state.speed;
  state.playerX = Math.max(-1.1, Math.min(1.1, state.playerX));

  if (Math.abs(state.playerX) > 1) {
    state.speed *= 0.95;
  }

  state.position += state.speed * dt * 60 * road.segmentLength;
  if (state.position >= trackLength) {
    state.position -= trackLength;
    state.lap += 1;
    const now = performance.now();
    const lapTime = (now - state.startTime) / 1000;
    if (!state.bestLap || lapTime < state.bestLap) state.bestLap = lapTime;
    state.startTime = now;
  }
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(32, now - last) / 1000;
  last = now;
  update(dt);
  render();
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

fullscreenToggle.addEventListener("click", async () => {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }
  resizeCanvas();
});

document.addEventListener("fullscreenchange", () => {
  fullscreenToggle.textContent = document.fullscreenElement ? "Exit Fullscreen" : "Fullscreen";
  resizeCanvas();
});

window.addEventListener("resize", resizeCanvas);
resetBtn.addEventListener("click", reset);

buildTrack();
resizeCanvas();
reset();
requestAnimationFrame(loop);
