const pointsEl = document.getElementById("points");
const turnEl = document.getElementById("turn");
const phaseEl = document.getElementById("phase");
const inHandEl = document.getElementById("inHand");
const onBoardEl = document.getElementById("onBoard");
const statusEl = document.getElementById("status");
const resetBtn = document.getElementById("reset");

const positions = [
  { x: 5, y: 5 },
  { x: 50, y: 5 },
  { x: 95, y: 5 },
  { x: 95, y: 50 },
  { x: 95, y: 95 },
  { x: 50, y: 95 },
  { x: 5, y: 95 },
  { x: 5, y: 50 },
  { x: 20, y: 20 },
  { x: 50, y: 20 },
  { x: 80, y: 20 },
  { x: 80, y: 50 },
  { x: 80, y: 80 },
  { x: 50, y: 80 },
  { x: 20, y: 80 },
  { x: 20, y: 50 },
  { x: 35, y: 35 },
  { x: 50, y: 35 },
  { x: 65, y: 35 },
  { x: 65, y: 50 },
  { x: 65, y: 65 },
  { x: 50, y: 65 },
  { x: 35, y: 65 },
  { x: 35, y: 50 }
];

const neighbors = [
  [1, 7],
  [0, 2, 9],
  [1, 3],
  [2, 4, 11],
  [3, 5],
  [4, 6, 13],
  [5, 7],
  [6, 0, 15],
  [9, 15],
  [8, 10, 1, 17],
  [9, 11],
  [10, 12, 3, 19],
  [11, 13],
  [12, 14, 5, 21],
  [13, 15],
  [14, 8, 7, 23],
  [17, 23],
  [16, 18, 9],
  [17, 19],
  [18, 20, 11],
  [19, 21],
  [20, 22, 13],
  [21, 23],
  [22, 16, 15]
];

const mills = [
  [0, 1, 2], [2, 3, 4], [4, 5, 6], [6, 7, 0],
  [8, 9, 10], [10, 11, 12], [12, 13, 14], [14, 15, 8],
  [16, 17, 18], [18, 19, 20], [20, 21, 22], [22, 23, 16],
  [1, 9, 17], [3, 11, 19], [5, 13, 21], [7, 15, 23]
];

const state = {
  board: Array(24).fill(null),
  current: "W",
  selected: null,
  captureMode: false,
  totalPlaced: 0,
  inHand: { W: 9, B: 9 },
  message: "",
  gameOver: false
};

const names = { W: "Weiss", B: "Schwarz" };

function other(player) {
  return player === "W" ? "B" : "W";
}

function phase() {
  return state.totalPlaced < 18 ? "Setzen" : "Schieben";
}

function piecesOnBoard(player) {
  return state.board.reduce((acc, value, index) => {
    if (value === player) acc.push(index);
    return acc;
  }, []);
}

function isMillAt(index, player, board) {
  return mills.some(group =>
    group.includes(index) && group.every(pos => board[pos] === player)
  );
}

function allPiecesInMill(player, board) {
  const pieces = piecesOnBoard(player);
  return pieces.length > 0 && pieces.every(pos => isMillAt(pos, player, board));
}

function isCapturable(index, opponent) {
  if (state.board[index] !== opponent) return false;
  if (!isMillAt(index, opponent, state.board)) return true;
  return allPiecesInMill(opponent, state.board);
}

function legalMovesFrom(index, player) {
  if (phase() === "Setzen") return [];
  const empty = state.board.map((value, i) => (value ? null : i)).filter(i => i !== null);
  const flying = piecesOnBoard(player).length === 3;
  if (flying) return empty;
  return neighbors[index].filter(n => state.board[n] === null);
}

function hasAnyMoves(player) {
  if (phase() === "Setzen") return true;
  const pieces = piecesOnBoard(player);
  return pieces.some(pos => legalMovesFrom(pos, player).length > 0);
}

function checkWin(opponent) {
  if (state.totalPlaced < 18) return false;
  const oppPieces = piecesOnBoard(opponent).length;
  if (oppPieces < 3) return true;
  if (!hasAnyMoves(opponent)) return true;
  return false;
}

function setMessage(text) {
  state.message = text;
}

function baseMessage() {
  if (state.gameOver) return state.message;
  if (state.captureMode) return `Muehle! ${names[state.current]} schlaegt eine Figur von ${names[other(state.current)]}.`;
  if (phase() === "Setzen") return "Setzen: Waehle ein freies Feld.";
  if (state.selected !== null) return "Bewegen: Waehle das Ziel.";
  const flying = piecesOnBoard(state.current).length === 3;
  return flying ? "Fliegen erlaubt: Waehle eine Figur." : "Bewegen: Waehle eine Figur.";
}

function updateHUD() {
  turnEl.textContent = names[state.current];
  phaseEl.textContent = phase();
  inHandEl.textContent = `${names.W}: ${state.inHand.W} | ${names.B}: ${state.inHand.B}`;
  onBoardEl.textContent = `${names.W}: ${piecesOnBoard("W").length} | ${names.B}: ${piecesOnBoard("B").length}`;
  statusEl.textContent = state.message || baseMessage();
}

function render() {
  const points = pointsEl.querySelectorAll(".point");
  points.forEach(point => {
    const index = Number(point.dataset.index);
    const value = state.board[index];
    point.className = "point";
    if (value === "W") point.classList.add("white");
    if (value === "B") point.classList.add("black");

    if (state.gameOver) return;

    if (state.captureMode) {
      if (isCapturable(index, other(state.current))) {
        point.classList.add("capture");
      }
      return;
    }

    if (phase() === "Schieben") {
      if (value === state.current) point.classList.add("selectable");
      if (state.selected === index) point.classList.add("selected");
      if (state.selected !== null && value === null) {
        const moves = legalMovesFrom(state.selected, state.current);
        if (moves.includes(index)) point.classList.add("move");
      }
    }
  });

  updateHUD();
}

function switchTurn() {
  state.current = other(state.current);
  state.selected = null;
  state.message = "";
}

function handlePlace(index) {
  if (state.board[index] !== null) return;
  state.board[index] = state.current;
  state.inHand[state.current] -= 1;
  state.totalPlaced += 1;

  if (isMillAt(index, state.current, state.board)) {
    state.captureMode = true;
    setMessage(`Muehle! ${names[state.current]} schlaegt eine Figur.`);
  } else {
    switchTurn();
  }
}

function handleMove(index) {
  if (state.selected === null) {
    if (state.board[index] === state.current) {
      state.selected = index;
    }
    return;
  }

  if (state.board[index] === state.current) {
    state.selected = index;
    return;
  }

  if (state.board[index] !== null) return;
  const moves = legalMovesFrom(state.selected, state.current);
  if (!moves.includes(index)) return;

  state.board[index] = state.current;
  state.board[state.selected] = null;
  state.selected = null;

  if (isMillAt(index, state.current, state.board)) {
    state.captureMode = true;
    setMessage(`Muehle! ${names[state.current]} schlaegt eine Figur.`);
  } else {
    if (checkWin(other(state.current))) {
      state.gameOver = true;
      setMessage(`${names[state.current]} gewinnt.`);
    } else {
      switchTurn();
    }
  }
}

function handleCapture(index) {
  const opponent = other(state.current);
  if (!isCapturable(index, opponent)) return;
  state.board[index] = null;
  state.captureMode = false;

  if (checkWin(opponent)) {
    state.gameOver = true;
    setMessage(`${names[state.current]} gewinnt.`);
  } else {
    switchTurn();
  }
}

function handleClick(event) {
  const target = event.target.closest(".point");
  if (!target || state.gameOver) return;
  const index = Number(target.dataset.index);

  if (state.captureMode) {
    handleCapture(index);
    render();
    return;
  }

  if (phase() === "Setzen") {
    handlePlace(index);
    render();
    return;
  }

  handleMove(index);
  render();
}

function setupPoints() {
  positions.forEach((pos, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "point";
    btn.style.left = `${pos.x}%`;
    btn.style.top = `${pos.y}%`;
    btn.dataset.index = index;
    pointsEl.appendChild(btn);
  });
}

function reset() {
  state.board = Array(24).fill(null);
  state.current = "W";
  state.selected = null;
  state.captureMode = false;
  state.totalPlaced = 0;
  state.inHand = { W: 9, B: 9 };
  state.message = "";
  state.gameOver = false;
  render();
}

pointsEl.addEventListener("click", handleClick);
resetBtn.addEventListener("click", reset);

setupPoints();
reset();
