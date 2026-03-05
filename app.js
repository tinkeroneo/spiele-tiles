const grid = document.getElementById("grid");
const countEl = document.getElementById("count");
const statusSummary = document.getElementById("statusSummary");
const toast = document.getElementById("toast");
const filters = Array.from(document.querySelectorAll(".chip"));
const toggleComing = document.getElementById("toggleComing");
const searchInput = document.getElementById("searchInput");

let games = [];
let activeFilter = "all";
let searchTerm = "";

const statusOrder = { ready: 0, prototype: 1, coming: 2 };
const tagLabels = {
  board: "Brett",
  arcade: "Arcade",
  gadgets: "Gadget",
  experiment: "Experiment",
  tools: "Tool",
  puzzle: "Puzzle"
};
const tagIcons = {
  board: "♟",
  arcade: "🕹",
  gadgets: "⚙",
  experiment: "🧪",
  tools: "🧰",
  puzzle: "🧩"
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1800);
}

function setStats(list) {
  countEl.textContent = list.length;
  const ready = list.filter(g => g.status === "ready").length;
  const proto = list.filter(g => g.status === "prototype").length;
  const coming = list.filter(g => g.status === "coming").length;
  statusSummary.textContent = `${ready} ready · ${proto} proto · ${coming} coming`;
}

function render() {
  grid.innerHTML = "";

  let list = games;
  if (activeFilter !== "all") {
    list = list.filter(g => g.tags.includes(activeFilter));
  }
  if (!toggleComing.checked) {
    list = list.filter(g => g.status !== "coming");
  }
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    list = list.filter(g =>
      g.title.toLowerCase().includes(term) ||
      g.description.toLowerCase().includes(term) ||
      g.tags.some(tag => tag.toLowerCase().includes(term))
    );
  }

  list = [...list].sort((a, b) => {
    const sa = statusOrder[a.status] ?? 9;
    const sb = statusOrder[b.status] ?? 9;
    if (sa !== sb) return sa - sb;
    return a.title.localeCompare(b.title);
  });

  setStats(list);

  list.forEach((game, index) => {
    const tile = document.createElement("article");
    tile.className = "tile";
    if (game.status === "coming") tile.classList.add("coming");
    tile.style.animationDelay = `${index * 40}ms`;

    const badge = `<span class="badge ${game.status}">${game.status}</span>`;
    const tags = game.tags
      .map(tag => `<span class="tag ${tag}">${tagIcons[tag] || "•"} ${tagLabels[tag] || tag}</span>`)
      .join("");

    const hasLink = (game.status === "ready" || game.status === "prototype") && game.link;
    tile.dataset.link = hasLink ? game.link : "";
    tile.dataset.external = hasLink && /^https?:\/\//.test(game.link) ? "1" : "0";
    tile.tabIndex = hasLink ? 0 : -1;

    tile.innerHTML = `
      ${badge}
      ${game.icon ? `<div class="tile-icon">${game.icon}</div>` : ""}
      <h3>${game.title}</h3>
      <p>${game.description}</p>
      <div class="tags">${tags}</div>
    `;

    grid.appendChild(tile);
  });
}

function setActiveFilter(value) {
  activeFilter = value;
  filters.forEach(chip => chip.classList.toggle("active", chip.dataset.filter === value));
  render();
}

filters.forEach(chip => {
  chip.addEventListener("click", () => setActiveFilter(chip.dataset.filter));
});

grid.addEventListener("click", (event) => {
  const tile = event.target.closest(".tile");
  if (!tile) return;
  const link = tile.dataset.link;
  if (!link) {
    const title = tile.querySelector("h3")?.textContent || "Dieses Spiel";
    showToast(`${title} ist auf der Liste.`);
    return;
  }
  if (tile.dataset.external === "1") {
    window.open(link, "_blank", "noopener");
  } else {
    window.location.href = link;
  }
});

grid.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const tile = event.target.closest(".tile");
  if (!tile) return;
  tile.click();
});

toggleComing.addEventListener("change", render);
searchInput.addEventListener("input", (event) => {
  searchTerm = event.target.value.trim();
  render();
});

fetch("data/games.json")
  .then(res => res.json())
  .then(data => {
    games = data;
    render();
  })
  .catch(() => {
    grid.innerHTML = "<p>Fehler beim Laden der Spieleliste.</p>";
  });
