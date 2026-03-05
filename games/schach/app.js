const boardEl = document.getElementById("board");
const turnEl = document.getElementById("turn");
const statusEl = document.getElementById("status");
const resetBtn = document.getElementById("reset");
const aiToggle = document.getElementById("aiToggle");

const pieces = {
  w: { K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙" },
  b: { K: "♚", Q: "♛", R: "♜", B: "♝", N: "♞", P: "♟" }
};

let state = {};

function initialBoard() {
  return [
    ["bR","bN","bB","bQ","bK","bB","bN","bR"],
    ["bP","bP","bP","bP","bP","bP","bP","bP"],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    ["wP","wP","wP","wP","wP","wP","wP","wP"],
    ["wR","wN","wB","wQ","wK","wB","wN","wR"]
  ];
}

function reset() {
  state = {
    board: initialBoard(),
    turn: "w",
    selected: null,
    moves: [],
    message: "",
    gameOver: false
  };
  render();
}

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function pieceAt(r, c) {
  return state.board[r][c];
}

function colorOf(piece) {
  return piece ? piece[0] : null;
}

function typeOf(piece) {
  return piece ? piece[1] : null;
}

function addMove(moves, r, c) {
  if (!inBounds(r, c)) return false;
  const target = pieceAt(r, c);
  if (!target) {
    moves.push([r, c]);
    return true;
  }
  return false;
}

function addCapture(moves, r, c, color) {
  if (!inBounds(r, c)) return false;
  const target = pieceAt(r, c);
  if (target && colorOf(target) !== color) {
    moves.push([r, c]);
    return false;
  }
  return false;
}

function genMoves(r, c) {
  const piece = pieceAt(r, c);
  if (!piece) return [];
  const color = colorOf(piece);
  const type = typeOf(piece);
  const moves = [];

  if (type === "P") {
    const dir = color === "w" ? -1 : 1;
    const startRow = color === "w" ? 6 : 1;
    if (inBounds(r + dir, c) && !pieceAt(r + dir, c)) {
      moves.push([r + dir, c]);
      if (r === startRow && !pieceAt(r + 2 * dir, c)) {
        moves.push([r + 2 * dir, c]);
      }
    }
    [[r + dir, c - 1], [r + dir, c + 1]].forEach(([rr, cc]) => {
      if (inBounds(rr, cc)) {
        const target = pieceAt(rr, cc);
        if (target && colorOf(target) !== color) moves.push([rr, cc]);
      }
    });
  }

  if (type === "N") {
    [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]].forEach(([dr, dc]) => {
      const rr = r + dr, cc = c + dc;
      if (!inBounds(rr, cc)) return;
      const target = pieceAt(rr, cc);
      if (!target || colorOf(target) !== color) moves.push([rr, cc]);
    });
  }

  if (type === "B" || type === "R" || type === "Q") {
    const dirs = [];
    if (type === "B" || type === "Q") dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
    if (type === "R" || type === "Q") dirs.push([-1,0],[1,0],[0,-1],[0,1]);
    dirs.forEach(([dr, dc]) => {
      let rr = r + dr, cc = c + dc;
      while (inBounds(rr, cc)) {
        const target = pieceAt(rr, cc);
        if (!target) {
          moves.push([rr, cc]);
        } else {
          if (colorOf(target) !== color) moves.push([rr, cc]);
          break;
        }
        rr += dr; cc += dc;
      }
    });
  }

  if (type === "K") {
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        if (dr === 0 && dc === 0) continue;
        const rr = r + dr, cc = c + dc;
        if (!inBounds(rr, cc)) continue;
        const target = pieceAt(rr, cc);
        if (!target || colorOf(target) !== color) moves.push([rr, cc]);
      }
    }
  }

  return moves;
}

function render() {
  boardEl.innerHTML = "";
  turnEl.textContent = state.turn === "w" ? "Weiß" : "Schwarz";
  statusEl.textContent = state.message || (state.turn === "w" ? "Weiß ist am Zug" : "Schwarz ist am Zug");

  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      const cell = document.createElement("div");
      const isDark = (r + c) % 2 === 1;
      cell.className = `cell ${isDark ? "dark" : "light"}`;
      const piece = pieceAt(r, c);
      if (piece) {
        cell.textContent = pieces[colorOf(piece)][typeOf(piece)];
      }
      if (state.selected && state.selected[0] === r && state.selected[1] === c) {
        cell.classList.add("selected");
      }
      if (state.moves.some(m => m[0] === r && m[1] === c)) {
        cell.classList.add("move");
      }
      cell.dataset.r = r;
      cell.dataset.c = c;
      boardEl.appendChild(cell);
    }
  }
}

function movePiece(from, to) {
  const [fr, fc] = from;
  const [tr, tc] = to;
  const piece = pieceAt(fr, fc);
  state.board[tr][tc] = piece;
  state.board[fr][fc] = null;

  // Promotion
  if (piece[1] === "P" && (tr === 0 || tr === 7)) {
    state.board[tr][tc] = piece[0] + "Q";
  }

  state.selected = null;
  state.moves = [];
  state.turn = state.turn === "w" ? "b" : "w";
}

function onCellClick(r, c) {
  if (state.gameOver) return;
  const piece = pieceAt(r, c);

  if (state.selected) {
    const canMove = state.moves.some(m => m[0] === r && m[1] === c);
    if (canMove) {
      movePiece(state.selected, [r, c]);
      render();
      maybeAiMove();
      return;
    }
  }

  if (piece && colorOf(piece) === state.turn) {
    state.selected = [r, c];
    state.moves = genMoves(r, c);
  } else {
    state.selected = null;
    state.moves = [];
  }
  render();
}

function allMoves(color) {
  const moves = [];
  for (let r = 0; r < 8; r += 1) {
    for (let c = 0; c < 8; c += 1) {
      const piece = pieceAt(r, c);
      if (!piece || colorOf(piece) !== color) continue;
      const m = genMoves(r, c);
      m.forEach(to => moves.push({ from: [r, c], to }));
    }
  }
  return moves;
}

function maybeAiMove() {
  if (!aiToggle.checked) return;
  if (state.turn !== "b") return;
  setTimeout(() => {
    const moves = allMoves("b");
    if (!moves.length) {
      state.message = "Schwarz hat keine Züge.";
      state.gameOver = true;
      render();
      return;
    }
    const captures = moves.filter(m => {
      const target = pieceAt(m.to[0], m.to[1]);
      return target && colorOf(target) === "w";
    });
    const pick = (captures.length ? captures : moves)[Math.floor(Math.random() * (captures.length ? captures.length : moves.length))];
    movePiece(pick.from, pick.to);
    render();
  }, 300);
}

boardEl.addEventListener("click", (e) => {
  const cell = e.target.closest(".cell");
  if (!cell) return;
  onCellClick(Number(cell.dataset.r), Number(cell.dataset.c));
});

resetBtn.addEventListener("click", reset);

reset();
