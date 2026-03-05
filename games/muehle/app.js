const pointsEl = document.getElementById("points");
const turnEl = document.getElementById("turn");
const phaseEl = document.getElementById("phase");
const inHandEl = document.getElementById("inHand");
const onBoardEl = document.getElementById("onBoard");
const statusEl = document.getElementById("status");
const resetBtn = document.getElementById("reset");
const undoBtn = document.getElementById("undo");
const aiToggle = document.getElementById("aiToggle");
const aiLevel = document.getElementById("aiLevel");
const aiMoveBtn = document.getElementById("aiMove");

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

const aiPlayer = "B";
let aiBusy = false;

const state = {
  board: Array(24).fill(null),
  current: "W",
  selected: null,
  captureMode: false,
  totalPlaced: 0,
  inHand: { W: 9, B: 9 },
  message: "",
  gameOver: false,
  lastMoveBy: null
};

const history = [];
const names = { W: "Weiss", B: "Schwarz" };

function other(player) {
  return player === "W" ? "B" : "W";
}

function phase() {
  return state.totalPlaced < 18 ? "Setzen" : "Schieben";
}

function piecesOnBoard(player, board = state.board) {
  return board.reduce((acc, value, index) => {
    if (value === player) acc.push(index);
    return acc;
  }, []);
}

function isMillAt(index, player, board) {
  return mills.some(group =>
    group.includes(index) && group.every(pos => board[pos] === player)
  );
}

function collectMillPoints(player, board) {
  const result = new Set();
  mills.forEach(group => {
    if (group.every(pos => board[pos] === player)) {
      group.forEach(pos => result.add(pos));
    }
  });
  return result;
}

function allPiecesInMill(player, board) {
  const pieces = piecesOnBoard(player, board);
  return pieces.length > 0 && pieces.every(pos => isMillAt(pos, player, board));
}

function isCapturable(index, opponent) {
  if (state.board[index] !== opponent) return false;
  if (!isMillAt(index, opponent, state.board)) return true;
  return allPiecesInMill(opponent, state.board);
}

function legalMovesFrom(index, player, board = state.board) {
  if (phase() === "Setzen") return [];
  const empty = board.map((value, i) => (value ? null : i)).filter(i => i !== null);
  const flying = piecesOnBoard(player, board).length === 3;
  if (flying) return empty;
  return neighbors[index].filter(n => board[n] === null);
}

function hasAnyMoves(player, board = state.board) {
  if (phase() === "Setzen") return true;
  const pieces = piecesOnBoard(player, board);
  return pieces.some(pos => legalMovesFrom(pos, player, board).length > 0);
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
  if (state.captureMode) return `M?hle! ${names[state.current]} schl?gt eine Figur von ${names[other(state.current)]}.`;
  if (phase() === "Setzen") return "Setzen: W?hle ein freies Feld.";
  if (state.selected !== null) return "Bewegen: W?hle das Ziel.";
  const flying = piecesOnBoard(state.current).length === 3;
  return flying ? "Fliegen erlaubt: W?hle eine Figur." : "Bewegen: W?hle eine Figur.";
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
  const millsW = collectMillPoints("W", state.board);
  const millsB = collectMillPoints("B", state.board);

  points.forEach(point => {
    const index = Number(point.dataset.index);
    const value = state.board[index];
    point.className = "point";
    if (value === "W") point.classList.add("white");
    if (value === "B") point.classList.add("black");
    if (millsW.has(index)) point.classList.add("mill-white");
    if (millsB.has(index)) point.classList.add("mill-black");

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

function snapshot() {
  return {
    board: [...state.board],
    current: state.current,
    selected: state.selected,
    captureMode: state.captureMode,
    totalPlaced: state.totalPlaced,
    inHand: { ...state.inHand },
    message: state.message,
    gameOver: state.gameOver,
    lastMoveBy: state.lastMoveBy
  };
}

function restore(saved) {
  state.board = [...saved.board];
  state.current = saved.current;
  state.selected = saved.selected;
  state.captureMode = saved.captureMode;
  state.totalPlaced = saved.totalPlaced;
  state.inHand = { ...saved.inHand };
  state.message = saved.message;
  state.gameOver = saved.gameOver;
  state.lastMoveBy = saved.lastMoveBy;
}

function pushHistory() {
  history.push(snapshot());
  if (history.length > 200) history.shift();
}

function switchTurn() {
  state.current = other(state.current);
  state.selected = null;
  state.message = "";
}

function handlePlace(index) {
  if (state.board[index] !== null) return;
  pushHistory();
  state.board[index] = state.current;
  state.inHand[state.current] -= 1;
  state.totalPlaced += 1;
  state.lastMoveBy = state.current;

  if (isMillAt(index, state.current, state.board)) {
    state.captureMode = true;
    setMessage(`M?hle! ${names[state.current]} schl?gt eine Figur.`);
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

  pushHistory();
  state.board[index] = state.current;
  state.board[state.selected] = null;
  state.selected = null;
  state.lastMoveBy = state.current;

  if (isMillAt(index, state.current, state.board)) {
    state.captureMode = true;
    setMessage(`M?hle! ${names[state.current]} schl?gt eine Figur.`);
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
  pushHistory();
  state.board[index] = null;
  state.captureMode = false;
  state.lastMoveBy = state.current;

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
    maybeRunAi();
    return;
  }

  if (phase() === "Setzen") {
    handlePlace(index);
    render();
    maybeRunAi();
    return;
  }

  handleMove(index);
  render();
  maybeRunAi();
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
  state.lastMoveBy = null;
  history.length = 0;
  render();
}

function undo() {
  if (!history.length) return;
  const saved = history.pop();
  restore(saved);
  setMessage("Undo.");
  render();
}

function findThreats(player, board) {
  const threats = new Set();
  mills.forEach(group => {
    const pieces = group.filter(pos => board[pos] === player).length;
    const empties = group.filter(pos => board[pos] === null);
    if (pieces === 2 && empties.length === 1) {
      threats.add(empties[0]);
    }
  });
  return threats;
}

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function countMills(player, board) {
  let total = 0;
  mills.forEach(group => {
    if (group.every(pos => board[pos] === player)) total += 1;
  });
  return total;
}

function countTwoInRow(player, board) {
  let total = 0;
  mills.forEach(group => {
    const pieces = group.filter(pos => board[pos] === player).length;
    const empties = group.filter(pos => board[pos] === null).length;
    if (pieces === 2 && empties === 1) total += 1;
  });
  return total;
}

function mobility(player, board) {
  if (phase() === "Setzen") return 0;
  const pieces = piecesOnBoard(player, board);
  return pieces.reduce((acc, pos) => acc + legalMovesFrom(pos, player, board).length, 0);
}

function evaluateBoard(player, board) {
  const opp = other(player);
  const score =
    countMills(player, board) * 50 +
    countTwoInRow(player, board) * 8 +
    mobility(player, board) * 2 +
    piecesOnBoard(player, board).length * 3;
  const oppScore =
    countMills(opp, board) * 50 +
    countTwoInRow(opp, board) * 8 +
    mobility(opp, board) * 2 +
    piecesOnBoard(opp, board).length * 3;
  return score - oppScore;
}

function getLevel() {
  return aiLevel ? aiLevel.value : "normal";
}

function chooseCapture(opponent, level) {
  const candidates = state.board
    .map((value, index) => ({ value, index }))
    .filter(item => item.value === opponent && isCapturable(item.index, opponent));
  if (!candidates.length) return null;
  if (level === "easy") return randomFrom(candidates).index;
  if (level === "hard") {
    let best = candidates[0];
    let bestScore = -Infinity;
    candidates.forEach(item => {
      const boardCopy = [...state.board];
      boardCopy[item.index] = null;
      const score = evaluateBoard(aiPlayer, boardCopy);
      if (score > bestScore) {
        best = item;
        bestScore = score;
      }
    });
    return best.index;
  }

  let best = candidates[0];
  let bestScore = -1;
  candidates.forEach(item => {
    let score = 0;
    if (isMillAt(item.index, opponent, state.board)) score += 2;
    if (piecesOnBoard(opponent).length <= 3) score += 3;
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  });
  return best.index;
}

function choosePlacement(player, level) {
  const empty = state.board.map((value, i) => (value ? null : i)).filter(i => i !== null);
  const opponent = other(player);
  if (level === "easy") return randomFrom(empty);

  if (level === "hard") {
    let best = empty[0];
    let bestScore = -Infinity;
    empty.forEach(pos => {
      const boardCopy = [...state.board];
      boardCopy[pos] = player;
      const score = evaluateBoard(player, boardCopy);
      if (score > bestScore) {
        bestScore = score;
        best = pos;
      }
    });
    return best;
  }

  for (const pos of empty) {
    const boardCopy = [...state.board];
    boardCopy[pos] = player;
    if (isMillAt(pos, player, boardCopy)) return pos;
  }

  const threats = findThreats(opponent, state.board);
  if (threats.size) return Array.from(threats)[0];

  return randomFrom(empty);
}

function chooseMove(player, level) {
  const opponent = other(player);
  const threats = findThreats(opponent, state.board);
  const pieces = piecesOnBoard(player);
  let best = null;
  let bestScore = -Infinity;

  pieces.forEach(from => {
    const moves = legalMovesFrom(from, player);
    moves.forEach(to => {
      const boardCopy = [...state.board];
      boardCopy[from] = null;
      boardCopy[to] = player;
      let score = 0;
      if (level === "easy") {
        if (!best) best = { from, to };
        return;
      }
      if (level === "hard") {
        score = evaluateBoard(player, boardCopy);
      } else {
        if (isMillAt(to, player, boardCopy)) score += 3;
        if (threats.has(to)) score += 2;
      }
      if (score > bestScore) {
        bestScore = score;
        best = { from, to };
      }
    });
  });

  if (!best) return null;
  if (level === "easy") {
    const moves = [];
    pieces.forEach(from => {
      legalMovesFrom(from, player).forEach(to => moves.push({ from, to }));
    });
    return moves.length ? randomFrom(moves) : null;
  }
  return best;
}

function runAiTurn() {
  if (state.gameOver) return;
  if (state.current !== aiPlayer) return;

  const level = getLevel();

  if (state.captureMode) {
    const target = chooseCapture(other(aiPlayer), level);
    if (target !== null) handleCapture(target);
    return;
  }

  if (phase() === "Setzen") {
    const pos = choosePlacement(aiPlayer, level);
    if (pos !== null) handlePlace(pos);
    return;
  }

  const move = chooseMove(aiPlayer, level);
  if (move) {
    state.selected = move.from;
    handleMove(move.to);
  }
}

function maybeRunAi() {
  if (!aiToggle.checked) return;
  if (aiBusy) return;
  if (state.current !== aiPlayer) return;
  if (state.gameOver) return;

  aiBusy = true;
  setTimeout(() => {
    runAiTurn();
    render();
    aiBusy = false;
    if (state.captureMode && state.current === aiPlayer) {
      maybeRunAi();
    }
  }, 350);
}

pointsEl.addEventListener("click", handleClick);
resetBtn.addEventListener("click", reset);
undoBtn.addEventListener("click", undo);
aiMoveBtn.addEventListener("click", () => {
  if (!state.gameOver && state.current === aiPlayer) {
    runAiTurn();
    render();
    if (state.captureMode && state.current === aiPlayer) {
      runAiTurn();
      render();
    }
  }
});
aiToggle.addEventListener("change", () => {
  if (aiToggle.checked) maybeRunAi();
});

setupPoints();
reset();
