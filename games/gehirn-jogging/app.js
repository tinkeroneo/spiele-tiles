const levelEl = document.getElementById("level");
const streakEl = document.getElementById("streak");
const accuracyEl = document.getElementById("accuracy");
const tempoEl = document.getElementById("tempo");
const timeLeftEl = document.getElementById("timeLeft");
const exerciseSelect = document.getElementById("exercise");
const modeSelect = document.getElementById("mode");
const timePressureSelect = document.getElementById("timePressure");
const timeSecondsInput = document.getElementById("timeSeconds");
const startBtn = document.getElementById("start");
const promptEl = document.getElementById("prompt");
const inputArea = document.getElementById("inputArea");
const feedbackEl = document.getElementById("feedback");
const resetAllBtn = document.getElementById("resetAll");
const historyLabel = document.getElementById("historyLabel");
const historyList = document.getElementById("historyList");

const exercises = [
  { id: "math", name: "Schnelle Mathe", desc: "Addieren und Subtrahieren" },
  { id: "memory", name: "Zahlen merken", desc: "Zahlenfolge wiederholen" },
  { id: "stroop", name: "Stroop", desc: "Wortfarbe erkennen" },
  { id: "symbol", name: "Symbol-Suche", desc: "Wie oft kommt das Symbol vor?" }
];

const settings = {
  math: { timePressure: false, timeSeconds: 8 },
  memory: { timePressure: false, timeSeconds: 10 },
  stroop: { timePressure: false, timeSeconds: 6 },
  symbol: { timePressure: false, timeSeconds: 7 }
};

const state = {
  level: 1,
  streak: 0,
  correct: 0,
  total: 0,
  lastTime: null,
  currentExercise: null,
  roundStart: 0,
  roundActive: false,
  timerId: null,
  countdownId: null,
  memorySequence: "",
  history: {
    math: [],
    memory: [],
    stroop: [],
    symbol: []
  }
};

function updateHUD() {
  levelEl.textContent = state.level;
  streakEl.textContent = state.streak;
  accuracyEl.textContent = state.total ? `${Math.round((state.correct / state.total) * 100)}%` : "-";
  tempoEl.textContent = state.lastTime ? `${state.lastTime} ms` : "-";
}

function setFeedback(text) {
  feedbackEl.textContent = text;
}

function randomChoice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function adjustDifficulty(correct, timeMs) {
  const fast = timeMs !== null && timeMs < Math.max(700, 1600 - state.level * 70);
  if (correct && fast) {
    state.level += 1;
  } else if (!correct) {
    state.level = Math.max(1, state.level - 1);
  }
}

function clearTimers() {
  if (state.timerId) clearTimeout(state.timerId);
  if (state.countdownId) clearInterval(state.countdownId);
  state.timerId = null;
  state.countdownId = null;
  timeLeftEl.textContent = "-";
}

function startTimer(exerciseId) {
  clearTimers();
  const cfg = settings[exerciseId];
  if (!cfg || !cfg.timePressure) return;

  const baseMs = cfg.timeSeconds * 1000;
  const limitMs = Math.max(1200, baseMs - state.level * 80);
  const deadline = performance.now() + limitMs;
  timeLeftEl.textContent = `${(limitMs / 1000).toFixed(1)} s`;

  state.countdownId = setInterval(() => {
    const left = Math.max(0, deadline - performance.now());
    timeLeftEl.textContent = `${(left / 1000).toFixed(1)} s`;
  }, 100);

  state.timerId = setTimeout(() => {
    if (state.roundActive) {
      endRound(false, true);
    }
  }, limitMs);
}

function endRound(correct, timeout = false) {
  if (!state.roundActive) return;
  state.roundActive = false;

  const timeMs = state.roundStart ? Math.round(performance.now() - state.roundStart) : null;
  state.total += 1;
  if (correct) {
    state.correct += 1;
    state.streak += 1;
    setFeedback("Richtig!");
  } else {
    state.streak = 0;
    setFeedback(timeout ? "Zeit abgelaufen." : "Nicht ganz. Weiter.");
  }
  state.lastTime = timeMs;
  adjustDifficulty(correct, timeMs);

  const exerciseId = state.currentExercise || exerciseSelect.value;
  state.history[exerciseId].unshift({
    correct,
    timeMs,
    level: state.level,
    ts: new Date().toISOString()
  });
  if (state.history[exerciseId].length > 12) state.history[exerciseId].pop();

  clearTimers();
  updateHUD();
  updateHistoryUI(exerciseId);
  scheduleNext();
}

function scheduleNext() {
  setTimeout(() => startRound(), 500);
}

function clearStage() {
  promptEl.textContent = "";
  inputArea.innerHTML = "";
}

function startRound() {
  state.roundStart = performance.now();
  state.roundActive = true;

  const mode = modeSelect.value;
  if (mode === "mix" || !state.currentExercise) {
    state.currentExercise = randomChoice(exercises).id;
  } else {
    state.currentExercise = exerciseSelect.value;
  }

  clearStage();

  if (state.currentExercise === "math") return roundMath();
  if (state.currentExercise === "memory") return roundMemory();
  if (state.currentExercise === "stroop") return roundStroop();
  if (state.currentExercise === "symbol") return roundSymbol();
}

function roundMath() {
  const range = 6 + state.level * 2;
  const a = Math.floor(Math.random() * range) + 1;
  const b = Math.floor(Math.random() * range) + 1;
  const op = Math.random() > 0.5 ? "+" : "-";
  const result = op === "+" ? a + b : a - b;

  promptEl.textContent = `${a} ${op} ${b} = ?`;

  const input = document.createElement("input");
  input.type = "number";
  input.placeholder = "Antwort";
  inputArea.appendChild(input);

  const btn = document.createElement("button");
  btn.className = "primary";
  btn.textContent = "Pr?fen";
  btn.addEventListener("click", () => {
    const value = Number(input.value);
    endRound(value === result);
  });

  inputArea.appendChild(btn);
  input.focus();
  startTimer("math");
}

function roundMemory() {
  const length = Math.min(3 + Math.floor(state.level / 2), 9);
  const sequence = Array.from({ length }, () => Math.floor(Math.random() * 9) + 1).join("");
  state.memorySequence = sequence;

  promptEl.textContent = `Merke: ${sequence}`;

  setTimeout(() => {
    if (!state.roundActive) return;
    promptEl.textContent = "Gib die Folge ein";
    inputArea.innerHTML = "";
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "z. B. 123";
    inputArea.appendChild(input);

    const btn = document.createElement("button");
    btn.className = "primary";
    btn.textContent = "Pr?fen";
    btn.addEventListener("click", () => {
      endRound(input.value.trim() === state.memorySequence);
    });

    inputArea.appendChild(btn);
    input.focus();
    startTimer("memory");
  }, 800 + state.level * 80);
}

function roundStroop() {
  const colors = [
    { name: "ROT", value: "#ff7676" },
    { name: "GRUEN", value: "#58e07d" },
    { name: "BLAU", value: "#61d2ff" },
    { name: "GELB", value: "#ffda6a" }
  ];
  const word = randomChoice(colors);
  const ink = randomChoice(colors);

  promptEl.innerHTML = `<span class="stroop" style="color:${ink.value}">${word.name}</span>`;

  const row = document.createElement("div");
  row.className = "btn-row";
  colors.forEach(color => {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.textContent = color.name;
    btn.addEventListener("click", () => {
      endRound(color.name === ink.name);
    });
    row.appendChild(btn);
  });

  inputArea.appendChild(row);
  startTimer("stroop");
}

function roundSymbol() {
  const symbols = ["★", "◆", "●", "▲", "■", "✚"];
  const target = randomChoice(symbols);
  const total = 12;
  const targetCount = Math.max(2, Math.min(6, Math.round(2 + state.level / 2)));
  const actualCount = Math.max(1, Math.min(targetCount, 6));

  const grid = [];
  for (let i = 0; i < total; i += 1) {
    grid.push(i < actualCount ? target : randomChoice(symbols.filter(s => s !== target)));
  }
  grid.sort(() => Math.random() - 0.5);

  promptEl.textContent = `Wie oft siehst du ${target}?`;

  const gridEl = document.createElement("div");
  gridEl.className = "symbol-grid";
  grid.forEach(sym => {
    const cell = document.createElement("div");
    cell.className = "symbol-cell";
    cell.textContent = sym;
    gridEl.appendChild(cell);
  });
  inputArea.appendChild(gridEl);

  const row = document.createElement("div");
  row.className = "btn-row";
  for (let i = 0; i <= 6; i += 1) {
    const btn = document.createElement("button");
    btn.className = "choice";
    btn.textContent = String(i);
    btn.addEventListener("click", () => {
      endRound(i === actualCount);
    });
    row.appendChild(btn);
  }
  inputArea.appendChild(row);
  startTimer("symbol");
}

function populateExercises() {
  exerciseSelect.innerHTML = "";
  exercises.forEach(ex => {
    const option = document.createElement("option");
    option.value = ex.id;
    option.textContent = `${ex.name} - ${ex.desc}`;
    exerciseSelect.appendChild(option);
  });
  state.currentExercise = exercises[0].id;
}

function updateSettingsUI(exerciseId) {
  const cfg = settings[exerciseId];
  if (!cfg) return;
  timePressureSelect.value = cfg.timePressure ? "on" : "off";
  timeSecondsInput.value = cfg.timeSeconds;
}

function updateHistoryUI(exerciseId) {
  const ex = exercises.find(item => item.id === exerciseId);
  historyLabel.textContent = ex ? ex.name : "-";
  historyList.innerHTML = "";
  const items = state.history[exerciseId] || [];
  if (!items.length) {
    historyList.innerHTML = "<div class=\"history-item\"><span>Noch keine Eintr?ge.</span></div>";
    return;
  }
  items.forEach(item => {
    const row = document.createElement("div");
    row.className = "history-item";
    row.innerHTML = `
      <span>${item.timeMs ? item.timeMs + " ms" : "-"} · Level ${item.level}</span>
      <span class="pill ${item.correct ? "ok" : "no"}">${item.correct ? "OK" : "Fehler"}</span>
      <span>${new Date(item.ts).toLocaleTimeString()}</span>
    `;
    historyList.appendChild(row);
  });
}

exerciseSelect.addEventListener("change", () => {
  state.currentExercise = exerciseSelect.value;
  updateSettingsUI(state.currentExercise);
  updateHistoryUI(state.currentExercise);
});

timePressureSelect.addEventListener("change", () => {
  const cfg = settings[exerciseSelect.value];
  cfg.timePressure = timePressureSelect.value === "on";
});

timeSecondsInput.addEventListener("change", () => {
  const cfg = settings[exerciseSelect.value];
  const value = Math.max(2, Math.min(30, Number(timeSecondsInput.value || 8)));
  cfg.timeSeconds = value;
  timeSecondsInput.value = value;
});

startBtn.addEventListener("click", () => {
  clearTimers();
  state.roundStart = 0;
  startRound();
});

resetAllBtn.addEventListener("click", () => {
  state.level = 1;
  state.streak = 0;
  state.correct = 0;
  state.total = 0;
  state.lastTime = null;
  state.roundStart = 0;
  state.roundActive = false;
  clearTimers();
  setFeedback("Reset.");
  updateHUD();
  promptEl.textContent = "W?hle eine ?bung und starte.";
  inputArea.innerHTML = "";
});

populateExercises();
updateSettingsUI(state.currentExercise);
updateHistoryUI(state.currentExercise);
updateHUD();
