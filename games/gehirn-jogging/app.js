const levelEl = document.getElementById("level");
const streakEl = document.getElementById("streak");
const accuracyEl = document.getElementById("accuracy");
const tempoEl = document.getElementById("tempo");
const exerciseSelect = document.getElementById("exercise");
const modeSelect = document.getElementById("mode");
const startBtn = document.getElementById("start");
const promptEl = document.getElementById("prompt");
const inputArea = document.getElementById("inputArea");
const feedbackEl = document.getElementById("feedback");
const resetAllBtn = document.getElementById("resetAll");

const exercises = [
  { id: "math", name: "Schnelle Mathe", desc: "Addieren und Subtrahieren" },
  { id: "memory", name: "Zahlen merken", desc: "Zahlenfolge wiederholen" },
  { id: "stroop", name: "Stroop", desc: "Wortfarbe erkennen" }
];

const state = {
  level: 1,
  streak: 0,
  correct: 0,
  total: 0,
  lastTime: null,
  currentExercise: null,
  roundStart: 0,
  memorySequence: [],
  lastPrompt: null
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

function endRound(correct) {
  const timeMs = state.roundStart ? Math.round(performance.now() - state.roundStart) : null;
  state.total += 1;
  if (correct) {
    state.correct += 1;
    state.streak += 1;
    setFeedback("Richtig!");
  } else {
    state.streak = 0;
    setFeedback("Nicht ganz. Weiter.");
  }
  state.lastTime = timeMs;
  adjustDifficulty(correct, timeMs);
  updateHUD();
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
  const mode = modeSelect.value;
  if (mode === "mix" || !state.currentExercise) {
    state.currentExercise = randomChoice(exercises).id;
  }
  const exerciseId = state.currentExercise || exerciseSelect.value;

  clearStage();

  if (exerciseId === "math") return roundMath();
  if (exerciseId === "memory") return roundMemory();
  if (exerciseId === "stroop") return roundStroop();
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
  btn.textContent = "Pruefen";
  btn.addEventListener("click", () => {
    const value = Number(input.value);
    endRound(value === result);
  });

  inputArea.appendChild(btn);
  input.focus();
}

function roundMemory() {
  const length = Math.min(3 + Math.floor(state.level / 2), 9);
  const sequence = Array.from({ length }, () => Math.floor(Math.random() * 9) + 1).join("");
  state.memorySequence = sequence;

  promptEl.textContent = `Merke: ${sequence}`;

  setTimeout(() => {
    promptEl.textContent = "Gib die Folge ein";
    inputArea.innerHTML = "";
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "z. B. 123";
    inputArea.appendChild(input);

    const btn = document.createElement("button");
    btn.className = "primary";
    btn.textContent = "Pruefen";
    btn.addEventListener("click", () => {
      endRound(input.value.trim() === state.memorySequence);
    });

    inputArea.appendChild(btn);
    input.focus();
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

exerciseSelect.addEventListener("change", () => {
  state.currentExercise = exerciseSelect.value;
});

startBtn.addEventListener("click", () => {
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
  setFeedback("Reset.");
  updateHUD();
  promptEl.textContent = "Waehle eine Uebung und starte.";
  inputArea.innerHTML = "";
});

populateExercises();
updateHUD();
