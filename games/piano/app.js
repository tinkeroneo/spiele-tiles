const keyboard = document.getElementById("keyboard");
const soundToggle = document.getElementById("soundToggle");
const recordBtn = document.getElementById("recordBtn");
const stopBtn = document.getElementById("stopBtn");
const playBtn = document.getElementById("playBtn");
const clearBtn = document.getElementById("clearBtn");
const staffTrack = document.getElementById("staffTrack");
const playhead = document.getElementById("playhead");
const recordMeta = document.getElementById("recordMeta");
const recordNameInput = document.getElementById("recordName");
const saveBtn = document.getElementById("saveBtn");
const recordingsSelect = document.getElementById("recordingsSelect");
const deleteBtn = document.getElementById("deleteBtn");
const octaveDown = document.getElementById("octaveDown");
const octaveUp = document.getElementById("octaveUp");
const octaveLabel = document.getElementById("octaveLabel");
const tempoInput = document.getElementById("tempo");
const tempoValue = document.getElementById("tempoValue");
const metronomeToggle = document.getElementById("metronomeToggle");
const sustainToggle = document.getElementById("sustainToggle");

const baseWhiteKeys = ["C","D","E","F","G","A","B"];
const baseBlackKeys = ["C#","D#","F#","G#","A#"];
const blackOffsets = [0.7, 1.7, 3.7, 4.7, 5.7];
const whiteKeyLabels = "ASDFGHJ";
const blackKeyLabels = ["W", "E", "T", "Z", "U"];
const blackKeyAltLabels = [null, null, null, "Y", null];

let audioCtx = null;
const active = new Map();
const keyDown = new Map();
const sustained = new Set();
let events = [];
let recording = false;
let recordStart = 0;
let playing = false;
let playStart = 0;
let playbackTimeouts = [];
const pxPerMs = 0.08;
let currentOctave = 4;
let tempo = 100;
let metronomeTimer = null;
let recordings = [];
const storageKey = "piano-recordings-v1";

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

function play(note, velocity = 0.2, type = "sine") {
  if (!soundToggle.checked) return;
  ensureAudio();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = frequency(note);
  gain.gain.value = velocity;
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

function currentNotes() {
  const white = baseWhiteKeys.map((n, idx) => ({ note: `${n}${currentOctave}`, key: whiteKeyLabels[idx] }));
  const black = baseBlackKeys.map((n, idx) => ({
    note: `${n}${currentOctave}`,
    key: blackKeyLabels[idx],
    altKey: blackKeyAltLabels[idx],
    position: blackOffsets[idx]
  }));
  return { white, black };
}

function noteIndex(note) {
  const map = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const match = note.match(/([A-G])(#?)(\d)/);
  if (!match) return 0;
  const base = map[match[1]] + (match[2] ? 1 : 0);
  const octave = Number(match[3]);
  return base + octave * 12;
}

function noteToY(note) {
  const base = 115;
  const step = 4;
  const relative = noteIndex(note) - noteIndex(`C${currentOctave}`);
  return base - relative * step;
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

  const beatMs = 60000 / tempo;
  let beat = 0;
  for (let t = 0; t <= duration; t += beatMs) {
    const line = document.createElement("div");
    line.className = beat % 4 === 0 ? "barline" : "beatline";
    line.style.left = `${t * pxPerMs}px`;
    staffTrack.appendChild(line);
    beat += 1;
  }

  events.forEach((event) => {
    const left = event.start * pxPerMs;
    const top = noteToY(event.note);
    const noteEl = document.createElement("div");
    noteEl.className = `note ${event.note.includes("#") ? "sharp" : ""}`;
    noteEl.style.left = `${left}px`;
    noteEl.style.top = `${top}px`;
    staffTrack.appendChild(noteEl);

    const stem = document.createElement("div");
    stem.className = "note-stem";
    const up = noteIndex(event.note) < noteIndex(`G${currentOctave}`);
    stem.style.left = `${left + 12}px`;
    stem.style.top = up ? `${top - 26}px` : `${top + 2}px`;
    stem.style.height = "26px";
    staffTrack.appendChild(stem);

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
  saveBtn.disabled = true;
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
  saveBtn.disabled = events.length === 0;
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
  saveBtn.disabled = true;
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
  saveBtn.disabled = events.length === 0;
}

function clearRecording() {
  events = [];
  keyDown.clear();
  playBtn.disabled = true;
  clearBtn.disabled = true;
  saveBtn.disabled = true;
  renderStaff();
}

function render() {
  const { white, black } = currentNotes();
  keyboard.innerHTML = "";
  white.forEach((item) => {
    const key = document.createElement("div");
    key.className = "key";
    key.dataset.note = item.note;
    key.dataset.key = item.key;
    key.textContent = item.key;
    keyboard.appendChild(key);
  });

  black.forEach(item => {
    const key = document.createElement("div");
    key.className = "key black";
    key.dataset.note = item.note;
    key.dataset.key = item.key;
    if (item.altKey) key.dataset.altKey = item.altKey;
    key.textContent = item.key;
    key.style.left = `calc(${item.position} * (100% / 7))`;
    keyboard.appendChild(key);
  });
  octaveLabel.textContent = currentOctave;
}

function press(note, el) {
  if (sustainToggle.checked && active.has(note)) {
    stop(note);
    sustained.delete(note);
  }
  play(note);
  if (el) el.classList.add("active");
  if (recording && !keyDown.has(note)) {
    keyDown.set(note, performance.now() - recordStart);
  }
}

function release(note, el) {
  if (sustainToggle.checked) {
    sustained.add(note);
  } else {
    stop(note);
  }
  if (el) el.classList.remove("active");
  if (recording && keyDown.has(note)) {
    const start = keyDown.get(note);
    const duration = Math.max(120, performance.now() - recordStart - start);
    events.push({ note, start, duration });
    keyDown.delete(note);
    renderStaff();
  }
}

function saveRecording() {
  if (!events.length) return;
  const name = recordNameInput.value.trim() || `Aufnahme ${recordings.length + 1}`;
  const record = {
    id: `rec-${Date.now()}`,
    name,
    createdAt: Date.now(),
    octave: currentOctave,
    tempo,
    events
  };
  recordings.unshift(record);
  recordNameInput.value = "";
  persistRecordings();
  renderRecordings();
  recordingsSelect.value = record.id;
  deleteBtn.disabled = false;
}

function loadRecording(id) {
  const record = recordings.find(r => r.id === id);
  if (!record) return;
  currentOctave = record.octave ?? 4;
  tempo = record.tempo ?? 100;
  tempoInput.value = tempo;
  tempoValue.textContent = `${tempo} BPM`;
  events = record.events.map(e => ({ ...e }));
  render();
  renderStaff();
  playBtn.disabled = events.length === 0;
  clearBtn.disabled = events.length === 0;
  saveBtn.disabled = events.length === 0;
}

function deleteRecording(id) {
  const idx = recordings.findIndex(r => r.id === id);
  if (idx === -1) return;
  recordings.splice(idx, 1);
  persistRecordings();
  renderRecordings();
}

function persistRecordings() {
  localStorage.setItem(storageKey, JSON.stringify(recordings));
}

function renderRecordings() {
  recordingsSelect.innerHTML = "<option value=\"\">Gespeicherte Aufnahmen</option>";
  recordings.forEach(record => {
    const option = document.createElement("option");
    option.value = record.id;
    option.textContent = `${record.name} · ${new Date(record.createdAt).toLocaleDateString()}`;
    recordingsSelect.appendChild(option);
  });
  deleteBtn.disabled = !recordingsSelect.value;
}

function loadRecordingsFromStorage() {
  try {
    const raw = localStorage.getItem(storageKey);
    recordings = raw ? JSON.parse(raw) : [];
  } catch (err) {
    recordings = [];
  }
  renderRecordings();
}

function metronomeTick() {
  play("A4", 0.08, "square");
  setTimeout(() => stop("A4"), 80);
}

function startMetronome() {
  if (metronomeTimer) clearInterval(metronomeTimer);
  const interval = 60000 / tempo;
  metronomeTimer = setInterval(metronomeTick, interval);
}

function stopMetronome() {
  if (metronomeTimer) clearInterval(metronomeTimer);
  metronomeTimer = null;
}

function updateTempo(value) {
  tempo = Number(value);
  tempoValue.textContent = `${tempo} BPM`;
  renderStaff();
  if (metronomeToggle.checked) startMetronome();
}

function shiftOctave(delta) {
  currentOctave = Math.min(6, Math.max(2, currentOctave + delta));
  render();
  renderStaff();
}

function releaseSustain() {
  sustained.forEach(note => stop(note));
  sustained.clear();
}

function releaseAllActive() {
  active.forEach((_, note) => stop(note));
  document.querySelectorAll(".key.active").forEach(el => el.classList.remove("active"));
}

keyboard.addEventListener("pointerdown", (e) => {
  const key = e.target.closest(".key");
  if (!key) return;
  if (key.setPointerCapture) key.setPointerCapture(e.pointerId);
  press(key.dataset.note, key);
});

keyboard.addEventListener("pointerup", (e) => {
  const key = e.target.closest(".key");
  if (!key) return;
  release(key.dataset.note, key);
});

keyboard.addEventListener("pointercancel", (e) => {
  const key = e.target.closest(".key");
  if (!key) return;
  release(key.dataset.note, key);
});

keyboard.addEventListener("pointerleave", (e) => {
  const key = e.target.closest(".key");
  if (!key) return;
  release(key.dataset.note, key);
});

document.addEventListener("pointerup", () => releaseAllActive());
document.addEventListener("pointercancel", () => releaseAllActive());
document.addEventListener("touchend", () => releaseAllActive(), { passive: true });
document.addEventListener("touchcancel", () => releaseAllActive(), { passive: true });

window.addEventListener("keydown", (e) => {
  const key = e.key.toUpperCase();
  if (key === " " || key === "SPACE") {
    sustainToggle.checked = !sustainToggle.checked;
    if (!sustainToggle.checked) releaseSustain();
    return;
  }
  if (e.shiftKey && key === "Z") return shiftOctave(-1);
  if (e.shiftKey && key === "X") return shiftOctave(1);
  const el = keyboard.querySelector(`.key[data-key="${key}"]`) || keyboard.querySelector(`.key[data-alt-key="${key}"]`);
  if (!el) return;
  if (el.classList.contains("active")) return;
  press(el.dataset.note, el);
});

window.addEventListener("keyup", (e) => {
  const key = e.key.toUpperCase();
  const el = keyboard.querySelector(`.key[data-key="${key}"]`) || keyboard.querySelector(`.key[data-alt-key="${key}"]`);
  if (!el) return;
  release(el.dataset.note, el);
});

recordBtn.addEventListener("click", startRecording);
stopBtn.addEventListener("click", stopRecording);
playBtn.addEventListener("click", startPlayback);
clearBtn.addEventListener("click", clearRecording);
saveBtn.addEventListener("click", saveRecording);
recordingsSelect.addEventListener("change", (e) => {
  const id = e.target.value;
  deleteBtn.disabled = !id;
  if (id) loadRecording(id);
});

deleteBtn.addEventListener("click", () => {
  const id = recordingsSelect.value;
  if (!id) return;
  deleteRecording(id);
  recordingsSelect.value = "";
  deleteBtn.disabled = true;
});

octaveDown.addEventListener("click", () => shiftOctave(-1));
octaveUp.addEventListener("click", () => shiftOctave(1));

tempoInput.addEventListener("input", (e) => updateTempo(e.target.value));
metronomeToggle.addEventListener("change", (e) => {
  if (e.target.checked) startMetronome();
  else stopMetronome();
});

sustainToggle.addEventListener("change", (e) => {
  if (!e.target.checked) releaseSustain();
});

window.addEventListener("beforeunload", stopMetronome);
window.addEventListener("blur", releaseAllActive);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) releaseAllActive();
});

function init() {
  tempoInput.value = tempo;
  tempoValue.textContent = `${tempo} BPM`;
  render();
  renderStaff();
  loadRecordingsFromStorage();
}

init();
