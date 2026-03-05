const keyboard = document.getElementById("keyboard");
const soundToggle = document.getElementById("soundToggle");

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

function render() {
  keyboard.innerHTML = "";
  whiteKeys.forEach((item, idx) => {
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
}

function release(note, el) {
  stop(note);
  if (el) el.classList.remove("active");
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

render();
