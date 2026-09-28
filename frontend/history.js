/* ============================================================
   CONTRA — Match History Page
   ============================================================ */

const historyEl = document.getElementById("matchHistory");

const API_BASE = 
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:5000"
    : "https://login-system-r1ax.onrender.com";

function authHeader() {
  const token = localStorage.getItem("token") || "";
  return { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
}

const TAG_MAP = {
  cs2: "CS2", cs16: "CS 1.6", cod: "COD",
  apex: "APEX", r6: "R6", halo: "HALO", valorant: "VALORANT"
};

/* Demo matches shown if the user hasn't played any real matches yet */
const DEMO_HISTORY = [
  { game: "cs2",      map: "Mirage",       result: "win",  score: "16 - 12",   eloDelta: +25, playedAt: new Date(Date.now() - 1000 * 60 * 60 * 2) },
  { game: "valorant", map: "Ascent",       result: "win",  score: "13 - 8",    eloDelta: +22, playedAt: new Date(Date.now() - 1000 * 60 * 60 * 5) },
  { game: "cs16",     map: "Dust2",        result: "loss", score: "13 - 16",   eloDelta: -18, playedAt: new Date(Date.now() - 1000 * 60 * 60 * 24) },
  { game: "cod",      map: "Terminal",     result: "win",  score: "250 - 210", eloDelta: +22, playedAt: new Date(Date.now() - 1000 * 60 * 60 * 30) },
  { game: "apex",     map: "World's Edge", result: "win",  score: "#2 of 20",  eloDelta: +19, playedAt: new Date(Date.now() - 1000 * 60 * 60 * 36) },
  { game: "r6",       map: "Clubhouse",    result: "loss", score: "4 - 7",     eloDelta: -21, playedAt: new Date(Date.now() - 1000 * 60 * 60 * 48) },
  { game: "halo",     map: "Live Fire",    result: "win",  score: "50 - 44",   eloDelta: +17, playedAt: new Date(Date.now() - 1000 * 60 * 60 * 72) }
];

function timeAgo(date) {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return date.toLocaleDateString();
}

function renderHistory(matches) {
  if (!matches || !matches.length) {
    historyEl.innerHTML = `<li class="match-row empty"><div class="match-info">
      <span class="match-map">No matches yet</span>
      <span class="match-meta">Play a game to see your history here</span>
    </div></li>`;
    return;
  }

  historyEl.innerHTML = matches.map(m => {
    const tag = TAG_MAP[m.game] || m.game.toUpperCase();
    const eloStr = (m.eloDelta >= 0 ? "+" : "") + m.eloDelta;
    const when = timeAgo(new Date(m.playedAt));
    return `
      <li class="match-row ${m.result}">
        <span class="match-indicator"></span>
        <div class="match-info">
          <span class="match-map"><span class="game-tag">${tag}</span> ${m.map}</span>
          <span class="match-meta">Competitive · ${m.result === "win" ? "Victory" : "Defeat"} · ${when}</span>
        </div>
        <span class="match-score">${m.score || "—"}</span>
        <span class="match-elo">${eloStr}</span>
      </li>
    `;
  }).join("");
}

if (historyEl) {
  historyEl.innerHTML = `<li class="match-row"><div class="match-info"><span class="match-meta">Loading…</span></div></li>`;

  fetch(`${API_BASE}/api/matches`, { headers: authHeader() })
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(data => {
      const real = data.matches || [];
      renderHistory(real.length ? real : DEMO_HISTORY);
    })
    .catch(err => {
      console.error("Failed to load history:", err);
      /* Fallback to demo so the page isn't blank */
      renderHistory(DEMO_HISTORY);
    });
}