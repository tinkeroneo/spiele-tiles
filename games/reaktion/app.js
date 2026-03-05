const pad = document.getElementById("pad");
const result = document.getElementById("result");

let timeoutId = null;
let startTime = 0;
let waiting = false;

function reset() {
  if (timeoutId) clearTimeout(timeoutId);
  timeoutId = null;
  startTime = 0;
  waiting = false;
  pad.textContent = "Bereit";
  pad.className = "pad ready";
  result.textContent = "-";
}

function start() {
  pad.textContent = "Warte...";
  pad.className = "pad waiting";
  const delay = 900 + Math.random() * 2000;
  timeoutId = setTimeout(() => {
    startTime = performance.now();
    waiting = true;
    pad.textContent = "Jetzt!";
    pad.className = "pad go";
  }, delay);
}

pad.addEventListener("click", () => {
  if (!timeoutId && !waiting) {
    start();
    return;
  }

  if (!waiting) {
    // clicked too early
    result.textContent = "Zu frueh!";
    reset();
    return;
  }

  const reaction = Math.round(performance.now() - startTime);
  result.textContent = `${reaction} ms`;
  reset();
});

reset();
