const grid = document.getElementById("grid");
const countEl = document.getElementById("count");
const statusSummary = document.getElementById("statusSummary");
const toast = document.getElementById("toast");
const filters = Array.from(document.querySelectorAll(".chip"));
const toggleComing = document.getElementById("toggleComing");

let games = [];
let activeFilter = "all";

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

  setStats(list);

  list.forEach((game, index) => {
    const tile = document.createElement("article");
    tile.className = "tile";
    tile.style.animationDelay = `${index * 40}ms`;

    const badge = `<span class="badge ${game.status}">${game.status}</span>`;
    const tags = game.tags.map(tag => `<span class="tag">${tag}</span>`).join("");

    let action = "";
    if (game.status === "ready" || game.status === "prototype") {
      action = `<a href="${game.link}">Oeffnen</a>`;
    } else {
      action = `<button class="secondary" data-id="${game.id}">Merken</button>`;
    }

    tile.innerHTML = `
      ${badge}
      <h3>${game.title}</h3>
      <p>${game.description}</p>
      <div class="tags">${tags}</div>
      ${action}
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
  const button = event.target.closest("button");
  if (!button) return;
  const game = games.find(g => g.id === button.dataset.id);
  if (game) showToast(`${game.title} ist auf der Liste.`);
});

toggleComing.addEventListener("change", render);

fetch("data/games.json")
  .then(res => res.json())
  .then(data => {
    games = data;
    render();
  })
  .catch(() => {
    grid.innerHTML = "<p>Fehler beim Laden der Spieleliste.</p>";
  });
