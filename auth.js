(() => {
  const AUTH_KEY = "tiles_auth_ok_v1";
  const PASSWORD_HASH = "43ca9a97895bc5a7fa3f3132076ed485dcea5a0292db67327d3726bcacfbfda3";
  const PASSMSG = "The Default!"  
  const MAX_ATTEMPTS = 3;
  const MESSAGE = "Passwortgeschuetzter Bereich";
  const BLOCKED_HTML = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Zugriff gesperrt</title>
  <style>
    html, body { height: 100%; margin: 0; font-family: Arial, sans-serif; }
    body { display: grid; place-items: center; background: #10151f; color: #f3f5f8; padding: 20px; box-sizing: border-box; }
    .card { max-width: 680px; width: 100%; text-align: center; padding: 24px; border: 1px solid #3b4659; border-radius: 12px; background: #1a2230; }
    h1 { margin: 0 0 8px 0; font-size: 42px; line-height: 1.1; }
    .hint { opacity: 0.85; margin-top: 8px; font-size: 26px; line-height: 1.35; }
    @media (max-width: 900px) { h1 { font-size: 34px; } .hint { font-size: 21px; } }
  </style>
</head>
<body>
  <div class="card">
    <h1>Zugriff gesperrt</h1>
    <div class="hint">Bitte Seite neu laden und korrektes Passwort eingeben.</div>
  </div>
</body>
</html>`;

  function isAuthorized() {
    try {
      return localStorage.getItem(AUTH_KEY) === "1" || sessionStorage.getItem(AUTH_KEY) === "1";
    } catch {
      try {
        return sessionStorage.getItem(AUTH_KEY) === "1";
      } catch {
        return false;
      }
    }
  }

  function setAuthorized() {
    try {
      localStorage.setItem(AUTH_KEY, "1");
    } catch {
      // Ignore storage errors and continue with session storage fallback.
    }

    try {
      sessionStorage.setItem(AUTH_KEY, "1");
    } catch {
      // Ignore storage errors and continue for current page view.
    }
  }

  function blockPage() {
    document.open();
    document.write(BLOCKED_HTML);
    document.close();

    if (typeof window.stop === "function") {
      window.stop();
    }

    throw new Error("AUTH_BLOCKED");
  }

  async function sha256Hex(value) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(value);
    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  async function verifyPassword(input) {
    if (!window.crypto || !window.crypto.subtle) {
      return false;
    }

    const inputHash = await sha256Hex(input);
    return inputHash === PASSWORD_HASH;
  }

  (async () => {
    if (isAuthorized()) {
      return;
    }

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const input = window.prompt(`${MESSAGE}\nBitte Passwort eingeben:`);

      if (input === null) {
        break;
      }

      if (await verifyPassword(input)) {
        setAuthorized();
        return;
      }

      if (attempt < MAX_ATTEMPTS) {
        window.alert("Falsches Passwort. Bitte erneut versuchen.");
      }
    }

    blockPage();
  })().catch((error) => {
    if (!error || error.message !== "AUTH_BLOCKED") {
      blockPage();
    }
  });
})();
