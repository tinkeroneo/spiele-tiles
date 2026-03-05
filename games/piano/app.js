const keyboard = document.getElementById("keyboard");
const soundToggle = document.getElementById("soundToggle");
const recordBtn = document.getElementById("recordBtn");
const stopBtn = document.getElementById("stopBtn");
const playBtn = document.getElementById("playBtn");
const clearBtn = document.getElementById("clearBtn");
const staffTrack = document.getElementById("staffTrack");
const playhead = document.getElementById("playhead");
const recordMeta = document.getElementById("recordMeta");

const whiteKeys = [
  { note: "C4", key: "A" },
  { note: "D4", key: "S" },
  { note: "E4", key: "D" },
  { note: "F4", key: "F" },
  { note: "G4", key: "G" },
  { note: "A4", key: "H" },
  { note: "B4", key: "J" }
];

const blackKeys = [
  { note: "C#4", key: "W", position: 0.7 },
  { note: "D#4", key: "E", position: 1.7 },
  { note: "F#4", key: "T", position: 3.7 },
  { note: "G#4", key: "Y", position: 4.7 },
  { note: "A#4", key: "U", position: 5.7 }
];

let audioCtx = null;
const active = new Map();
const keyDown = new Map();
let events = [];
let recording = false;
let recordStart = 0;
let playing = false;
let playStart = 0;
let playbackTimeouts = [];
const pxPerMs = 0.08;
const noteOrder = ["C4","C#4","D4","D#4","E4","F4","F#4","G4","G#4","A4","A#4","B4"];

function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function frequency(note) {
  const notes = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  const match = note.match(/([A-G])(#?)(\d)/);
  if (!match) return 440;
  const base = notes[match[1]] + (match[2] ? 1 : 0);
  const octave = Number(match[3]);
  const n = base + (octave - 4) * 12;
  return 440 * Math.pow(2, n / 12);
}

function play(note) {
  if (!soundToggle.checked) return;
  ensureAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency(note);
  gain.gain.value = 0.2;
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  active.set(note, { osc, gain });
}

function stop(note) {
  const node = active.get(note);
  if (!node) return;
  node.gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
  node.osc.stop(audioCtx.currentTime + 0.12);
  active.delete(note);
}

function clearPlayback() {
  playbackTimeouts.forEach(id => clearTimeout(id));
  playbackTimeouts = [];
}

function noteToY(note) {
  const idx = noteOrder.indexOf(note);
  const base = 115;
  const step = 8;
  return base - idx * step;
}

function updateMeta() {
  if (!events.length) {
    recordMeta.textContent = recording ? "Aufnahme läuft..." : "Keine Aufnahme";
    return;
  }
  const duration = Math.max(...events.map(e => e.start + e.duration));
  const sec = (duration / 1000).toFixed(1);
  recordMeta.textContent = `${events.length} Noten · ${sec}s`;
}

function renderStaff() {
  const lines = Array.from(staffTrack.querySelectorAll(".staff-line"));
  const head = staffTrack.querySelector(".playhead");
  staffTrack.innerHTML = "";
  lines.forEach(line => staffTrack.appendChild(line));
  if (head) staffTrack.appendChild(head);

  if (!events.length) {
    staffTrack.style.width = "480px";
    updateMeta();
    return;
  }

  const duration = Math.max(...events.map(e => e.start + e.duration));
  const width = Math.max(480, Math.ceil(duration * pxPerMs));
  staffTrack.style.width = `${width}px`;

  events.forEach((event) => {
    const left = event.start * pxPerMs;
    const top = noteToY(event.note);
    const noteEl = document.createElement("div");
    noteEl.className = `note ${event.note.includes("#") ? "sharp" : ""}`;
    noteEl.style.left = `${left}px`;
    noteEl.style.top = `${top}px`;
    staffTrack.appendChild(noteEl);

    const bar = document.createElement("div");
    bar.className = "note-bar";
    bar.style.left = `${left + 8}px`;
    bar.style.top = `${top + 4}px`;
    bar.style.width = `${Math.max(10, event.duration * pxPerMs)}px`;
    staffTrack.appendChild(bar);
  });

  updateMeta();
}

function startRecording() {
  if (playing) stopPlayback();
  recording = true;
  events = [];
  keyDown.clear();
  recordStart = performance.now();
  recordBtn.disabled = true;
  stopBtn.disabled = false;
  playBtn.disabled = true;
  clearBtn.disabled = true;
  renderStaff();
  recordMeta.textContent = "Aufnahme läuft...";
}

function stopRecording() {
  if (!recording) return;
  const now = performance.now();
  keyDown.forEach((start, note) => {
    const duration = Math.max(120, now - recordStart - start);
    events.push({ note, start, duration });
  });
  keyDown.clear();
  recording = false;
  recordBtn.disabled = false;
  stopBtn.disabled = true;
  playBtn.disabled = events.length === 0;
  clearBtn.disabled = events.length === 0;
  renderStaff();
}

function startPlayback() {
  if (!events.length || playing) return;
  if (recording) stopRecording();
  ensureAudio();
  playing = true;
  playStart = performance.now();
  playhead.classList.add("active");
  playhead.style.transform = "translateX(0)";
  recordBtn.disabled = true;
  playBtn.disabled = true;
  clearBtn.disabled = true;
  clearPlayback();

  const duration = Math.max(...events.map(e => e.start + e.duration));
  const noteEls = Array.from(staffTrack.querySelectorAll(".note"));

  events.forEach((event, index) => {
    const playId = setTimeout(() => {
      play(event.note);
      const keyEl = keyboard.querySelector(`.key[data-note="${event.note}"]`);
      if (keyEl) keyEl.classList.add("active");
      const noteEl = noteEls[index];
      if (noteEl) noteEl.classList.add("playing");
    }, event.start);
    const stopId = setTimeout(() => {
      stop(event.note);
      const keyEl = keyboard.querySelector(`.key[data-note="${event.note}"]`);
      if (keyEl) keyEl.classList.remove("active");
      const noteEl = noteEls[index];
      if (noteEl) noteEl.classList.remove("playing");
    }, event.start + event.duration);
    playbackTimeouts.push(playId, stopId);
  });

  const tick = () => {
    if (!playing) return;
    const t = performance.now() - playStart;
    playhead.style.transform = `translateX(${t * pxPerMs}px)`;
    if (t >= duration) {
      stopPlayback();
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function stopPlayback() {
  playing = false;
  clearPlayback();
  playhead.classList.remove("active");
  playhead.style.transform = "translateX(0)";
  recordBtn.disabled = false;
  playBtn.disabled = events.length === 0;
  clearBtn.disabled = events.length === 0;
}

function clearRecording() {
  events = [];
  keyDown.clear();
  playBtn.disabled = true;
  clearBtn.disabled = true;
  renderStaff();
}

function render() {
  keyboard.innerHTML = "";
  whiteKeys.forEach((item) => {
    const key = document.createElement("div");
    key.className = "key";
    key.dataset.note = item.note;
    key.dataset.key = item.key;
    key.textContent = item.key;
    keyboard.appendChild(key);
  });

  blackKeys.forEach(item => {
    const key = document.createElement("div");
    key.className = "key black";
    key.dataset.note = item.note;
    key.dataset.key = item.key;
    key.textContent = item.key;
    key.style.left = `calc(${item.position} * (100% / 7))`;
    keyboard.appendChild(key);
  });
}

function press(note, el) {
  play(note);
  if (el) el.classList.add("active");
  if (recording && !keyDown.has(note)) {
    keyDown.set(note, performance.now() - recordStart);
  }
}

function release(note, el) {
  stop(note);
  if (el) el.classList.remove("active");
  if (recording && keyDown.has(note)) {
    const start = keyDown.get(note);
    const duration = Math.max(120, performance.now() - recordStart - start);
    events.push({ note, start, duration });
    keyDown.delete(note);
    renderStaff();
  }
}

keyboard.addEventListener("pointerdown", (e) => {
  const key = e.target.closest(".key");
  if (!key) return;
  press(key.dataset.note, key);
});

keyboard.addEventListener("pointerup", (e) => {
  const key = e.target.closest(".key");
  if (!key) return;
  release(key.dataset.note, key);
});

window.addEventListener("keydown", (e) => {
  const key = e.key.toUpperCase();
  const el = keyboard.querySelector(`.key[data-key="${key}"]`);
  if (!el) return;
  if (el.classList.contains("active")) return;
  press(el.dataset.note, el);
});

window.addEventListener("keyup", (e) => {
  const key = e.key.toUpperCase();
  const el = keyboard.querySelector(`.key[data-key="${key}"]`);
  if (!el) return;
  release(el.dataset.note, el);
});

recordBtn.addEventListener("click", startRecording);
stopBtn.addEventListener("click", stopRecording);
playBtn.addEventListener("click", startPlayback);
clearBtn.addEventListener("click", clearRecording);

render();
renderStaff();
