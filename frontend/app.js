/* ============================================================
   API URL — auto-detects local vs deployed
   ============================================================ */
const API_URL = 
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:5000"
    : "https://contra-backend-t1fu.onrender.com";

/* ============================================================
   GAMES + 7-MAP POOLS
   ============================================================ */
const GAMES = [
  { key: "cs2",  tag: "CS2",    name: "Counter-Strike 2",   color: "#DE9B35",
    maps: ["Mirage", "Inferno", "Dust2", "Nuke", "Ancient", "Anubis", "Vertigo"] },
  { key: "cs16", tag: "CS 1.6", name: "Counter-Strike 1.6", color: "#B07A2A",
    maps: ["Dust2", "Inferno", "Nuke", "Train", "Tuscan", "Cbble", "Mill"] },
  { key: "cod",  tag: "COD",    name: "Call of Duty",       color: "#4ADE80",
    maps: ["Terminal", "Nuketown", "Rust", "Shipment", "Crash", "Vacant", "Highrise"] },
  { key: "apex", tag: "APEX",   name: "Apex Legends",       color: "#EF4444",
    maps: ["World's Edge", "King's Canyon", "Olympus", "Storm Point", "Broken Moon", "E-District", "Fragment"] },
  { key: "r6",   tag: "R6",     name: "Rainbow Six Siege",  color: "#5EEAD4",
    maps: ["Clubhouse", "Oregon", "Coastline", "Bank", "Border", "Chalet", "Kafe"] },
  { key: "halo", tag: "HALO",   name: "Halo Infinite",      color: "#A855F7",
    maps: ["Live Fire", "Recharge", "Streets", "Aquarius", "Bazaar", "Catalyst", "Forbidden"] },
  { key: "valorant", tag: "VALORANT", name: "Valorant",     color: "#FF4655",
    maps: ["Ascent", "Bind", "Haven", "Split", "Icebox", "Breeze", "Sunset"] }
];

const BAN_TIMER_SEC = 30;
const COIN_TOSS_DURATION_MS = 3000;
const COIN_RESULT_PAUSE_MS = 1800;
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const TAG_MAP = {
  cs2: "CS2", cs16: "CS 1.6", cod: "COD",
  apex: "APEX", r6: "R6", halo: "HALO", valorant: "VALORANT"
};

/* Demo matches shown when the user hasn't played any real matches yet */
const DEMO_MATCHES = [
  { game: "cs2",      map: "Mirage",       result: "win",  score: "16 - 12",   eloDelta: +25 },
  { game: "valorant", map: "Ascent",       result: "win",  score: "13 - 8",    eloDelta: +22 },
  { game: "cod",      map: "Terminal",     result: "loss", score: "250 - 210", eloDelta: -18 },
  { game: "apex",     map: "World's Edge", result: "win",  score: "#2 of 20",  eloDelta: +19 },
  { game: "r6",       map: "Clubhouse",    result: "loss", score: "4 - 7",     eloDelta: -21 }
];

/* ============================================================
   AUTH HELPERS
   ============================================================ */
function getToken() { return localStorage.getItem("token") || ""; }
function setToken(t) {
  if (t) localStorage.setItem("token", t);
  else localStorage.removeItem("token");
}

async function api(path, options = {}) {
  const headers = Object.assign(
    { "Content-Type": "application/json" },
    options.headers || {}
  );
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, Object.assign({}, options, { headers }));
  let data = {};
  try { data = await res.json(); } catch { /* ignore */ }

  if (!res.ok) {
    const err = new Error(data.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/* ============================================================
   AVATAR HELPERS
   ============================================================ */
function applyAvatarToEl(el, initials, avatarUrl) {
  if (!el) return;
  if (avatarUrl) {
    el.style.backgroundImage = `url(${avatarUrl})`;
    el.style.backgroundSize = "cover";
    el.style.backgroundPosition = "center";
    el.style.color = "transparent";
    el.textContent = "";
  } else {
    el.style.backgroundImage = "";
    el.style.color = "";
    el.textContent = initials;
  }
}

let currentAvatar = "";
function refreshAllAvatars(initials) {
  applyAvatarToEl(document.getElementById("topAvatar"), initials, currentAvatar);
  applyAvatarToEl(document.getElementById("sideAvatar"), initials, currentAvatar);
  applyAvatarToEl(document.getElementById("settingsAvatar"), initials, currentAvatar);
}

/* ============================================================
   MATCH ROW RENDERER (shared)
   ============================================================ */
function renderMatchRows(matches, emptyText) {
  if (!matches || !matches.length) {
    return `<li class="match-row empty"><div class="match-info">
      <span class="match-map">${emptyText || "No matches yet"}</span>
      <span class="match-meta">Play a game to see your history here</span>
    </div></li>`;
  }
  return matches.map(m => {
    const tag = TAG_MAP[m.game] || m.game.toUpperCase();
    const eloStr = (m.eloDelta >= 0 ? "+" : "") + m.eloDelta;
    return `
      <li class="match-row ${m.result}">
        <span class="match-indicator"></span>
        <div class="match-info">
          <span class="match-map"><span class="game-tag">${tag}</span> ${m.map}</span>
          <span class="match-meta">Competitive · ${m.result === "win" ? "Victory" : "Defeat"}</span>
        </div>
        <span class="match-score">${m.score || "—"}</span>
        <span class="match-elo">${eloStr}</span>
      </li>
    `;
  }).join("");
}

/* ============================================================
   AUTH PAGE
   ============================================================ */
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const showRegister = document.getElementById("showRegister");
const showLogin = document.getElementById("showLogin");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const messageEl = document.getElementById("message");

    messageEl.textContent = "Logging in...";
    try {
      const data = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setToken(data.token);
      window.location.href = "dashboard.html";
    } catch (err) {
      messageEl.textContent = err.message || "Login failed.";
    }
  });
}

if (showRegister) {
  showRegister.addEventListener("click", (e) => {
    e.preventDefault();
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
  });
}
if (showLogin) {
  showLogin.addEventListener("click", (e) => {
    e.preventDefault();
    registerForm.classList.add("hidden");
    loginForm.classList.remove("hidden");
  });
}

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value;
    const email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPassword").value;
    const messageEl = document.getElementById("registerMessage");

    messageEl.textContent = "Creating account...";
    try {
      await api("/api/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password })
      });
      messageEl.textContent = "Registration successful! You can now log in.";
      setTimeout(() => {
        registerForm.classList.add("hidden");
        loginForm.classList.remove("hidden");
        document.getElementById("message").textContent = "";
        messageEl.textContent = "";
      }, 1500);
    } catch (err) {
      messageEl.textContent = err.message || "Registration failed.";
    }
  });
}

/* ============================================================
   SHARED SHELL
   ============================================================ */
const logoutBtn = document.getElementById("logout");

if (logoutBtn) {
  const token = getToken();
  if (!token) window.location.href = "index.html";

  /* Rank ladder */
  const TIERS = [
    { key: "bronze",     name: "BRONZE",     color: "#A97142", elo: 0    },
    { key: "silver",     name: "SILVER",     color: "#C0C0C0", elo: 900  },
    { key: "gold",       name: "GOLD",       color: "#DE9B35", elo: 1500 },
    { key: "amethyst",   name: "AMETHYST",   color: "#A855F7", elo: 2100 },
    { key: "ruby",       name: "RUBY",       color: "#E0115F", elo: 2600 },
    { key: "diamond",    name: "DIAMOND",    color: "#5EEAD4", elo: 3000 },
    { key: "challenger", name: "CHALLENGER", color: "#FF2D55", elo: 3500 }
  ];
  const ROMAN = ["I", "II", "III", "IV", "V"];

  function resolveRank(elo) {
    let tierIndex = 0;
    for (let i = 0; i < TIERS.length; i++) {
      if (elo >= TIERS[i].elo) tierIndex = i;
    }
    const tier = TIERS[tierIndex];
    const nextTier = TIERS[tierIndex + 1];
    const tierFloor = tier.elo;
    const tierCeil = nextTier ? nextTier.elo : tier.elo + 500;
    const span = tierCeil - tierFloor;
    const progress = Math.min(1, Math.max(0, (elo - tierFloor) / span));
    const sub = Math.max(1, Math.min(5, 5 - Math.floor(progress * 5)));
    return {
      key: tier.key, name: tier.name, color: tier.color, sub,
      label: `${tier.name} ${ROMAN[sub - 1]}`,
      progress,
      nextTierElo: nextTier ? nextTier.elo : null
    };
  }

  let userRanks = {
    cs2:  { elo: 1000 }, cs16: { elo: 1000 }, cod:  { elo: 1000 },
    apex: { elo: 1000 }, r6:   { elo: 1000 }, halo: { elo: 1000 },
    valorant: { elo: 1000 }
  };

  let selectedGame = localStorage.getItem("selectedGame") || "cs2";

  function getEloForGame(gameKey) {
    return userRanks[gameKey]?.elo ?? 1000;
  }

  function applySelectedGame() {
    const elo = getEloForGame(selectedGame);
    const rank = resolveRank(elo);
    const game = GAMES.find(g => g.key === selectedGame);

    const heroRankEl = document.getElementById("heroRank");
    if (heroRankEl) {
      heroRankEl.textContent = rank.label;
      heroRankEl.dataset.tier = rank.key;
      heroRankEl.style.color = rank.color;
      heroRankEl.style.borderColor = rank.color + "88";
      heroRankEl.style.background = rank.color + "22";
    }
    const heroEloEl = document.getElementById("heroElo");
    if (heroEloEl) {
      heroEloEl.textContent = elo.toLocaleString();
      heroEloEl.style.color = rank.color;
      heroEloEl.style.textShadow = `0 0 24px ${rank.color}66`;
    }
    const levelNumEl = document.getElementById("levelNum");
    if (levelNumEl) {
      levelNumEl.textContent = rank.label;
      levelNumEl.style.color = rank.color;
    }
    const heroLevelEl = document.getElementById("heroLevel");
    if (heroLevelEl) {
      heroLevelEl.textContent = rank.label;
      heroLevelEl.style.color = rank.color;
    }
    const eloFillEl = document.getElementById("eloFill");
    if (eloFillEl) {
      eloFillEl.style.width = `${Math.round(rank.progress * 100)}%`;
      eloFillEl.style.background = `linear-gradient(90deg, ${rank.color}, ${rank.color}bb)`;
      eloFillEl.style.boxShadow = `0 0 10px ${rank.color}55`;
    }
    const eloValueEl = document.getElementById("eloValue");
    if (eloValueEl) eloValueEl.textContent = `${elo.toLocaleString()} ELO`;

    const eloNextEl = document.getElementById("eloNext");
    if (eloNextEl && rank.nextTierElo) {
      eloNextEl.textContent = `→ ${rank.nextTierElo.toLocaleString()}`;
    }

    const gameBadge = document.getElementById("currentGame");
    if (gameBadge && game) {
      gameBadge.textContent = game.tag;
      gameBadge.style.color = game.color;
      gameBadge.style.borderColor = game.color + "88";
      gameBadge.style.background = game.color + "22";
    }

    const heroEyebrow = document.querySelector(".hero-eyebrow");
    if (heroEyebrow && game) {
      heroEyebrow.textContent = `CURRENT RANK · ${game.tag}`;
    }
  }

  applySelectedGame();

  const matchList = document.getElementById("matchList");
  if (matchList) {
    matchList.innerHTML = `<li class="match-row"><div class="match-info"><span class="match-meta">Loading matches…</span></div></li>`;
  }

  let myName = "You";
  let myInitials = "?";
  let myEmail = "";

  api("/api/profile")
    .then(data => {
      const user = data.user;
      myName = user.name;
      myEmail = user.email;
      myInitials = myName.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
      currentAvatar = user.avatar || "";

      if (user.ranks) userRanks = user.ranks;
      applySelectedGame();

      const nameEl = document.getElementById("playerName");
      if (nameEl) nameEl.textContent = myName;
      const emailEl = document.getElementById("playerEmail");
      if (emailEl) emailEl.textContent = myEmail;
      const welcomeEl = document.getElementById("welcome");
      if (welcomeEl) welcomeEl.textContent = `Welcome back, ${myName}. Ready to climb?`;

      const sName = document.getElementById("settingsName");
      if (sName) sName.textContent = myName;
      const sEmail = document.getElementById("settingsEmail");
      if (sEmail) sEmail.textContent = myEmail;

      refreshAllAvatars(myInitials);

      if (window.__hydrateSettings) window.__hydrateSettings(user);

      if (matchList) {
        let recent = (user.matches || []).slice(-5).reverse();
        /* If no real matches yet, show demo matches so the dashboard isn't empty */
        if (!recent.length) recent = DEMO_MATCHES;
        matchList.innerHTML = renderMatchRows(recent);
      }
    })
    .catch(err => {
      console.error("Profile fetch failed:", err);
      setToken("");
      window.location.href = "index.html";
    });

  /* ============================================================
     AVATAR UPLOAD
     ============================================================ */
  const avatarInput = document.getElementById("avatarInput");
  const removeAvatarBtn = document.getElementById("removeAvatar");

  if (avatarInput) {
    avatarInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) { showToast("Please choose an image file.", "error"); return; }
      if (file.size > AVATAR_MAX_BYTES) { showToast("Image must be under 2 MB.", "error"); return; }

      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target.result;
        currentAvatar = dataUrl;
        refreshAllAvatars(myInitials);
        try {
          await api("/api/avatar", { method: "PUT", body: JSON.stringify({ avatar: dataUrl }) });
          showToast("Profile picture saved.", "success");
        } catch (err) {
          showToast(err.message || "Failed to save avatar.", "error");
        }
      };
      reader.readAsDataURL(file);
    });
  }

  if (removeAvatarBtn) {
    removeAvatarBtn.addEventListener("click", async () => {
      currentAvatar = "";
      refreshAllAvatars(myInitials);
      try {
        await api("/api/avatar", { method: "DELETE" });
        showToast("Profile picture removed.", "info");
      } catch (err) {
        showToast(err.message || "Failed to remove avatar.", "error");
      }
    });
  }

  /* ============================================================
     SETTINGS
     ============================================================ */
  function hydrateSettingsFromProfile(user) {
    const s = user.settings || {};
    if (s.region) {
      const regionEl = document.getElementById("settingsRegion");
      if (regionEl) regionEl.textContent = s.region;
    }
    applyPreferredGames(s.preferredGames || []);
    applyNotificationToggles(s.notifications || {});
  }
  window.__hydrateSettings = hydrateSettingsFromProfile;

  function showInput(row) {
    const wrap = row.querySelector(".setting-input-wrap");
    const value = row.querySelector(".setting-value");
    if (wrap) wrap.classList.remove("hidden");
    if (value) value.classList.add("hidden");
  }
  function hideInput(row) {
    const wrap = row.querySelector(".setting-input-wrap");
    const value = row.querySelector(".setting-value");
    if (wrap) wrap.classList.add("hidden");
    if (value) value.classList.remove("hidden");
  }

  const editNameBtn = document.getElementById("editNameBtn");
  const saveNameBtn = document.getElementById("saveNameBtn");
  const cancelNameBtn = document.getElementById("cancelNameBtn");
  const inputName = document.getElementById("inputName");

  if (editNameBtn) {
    const row = editNameBtn.closest(".setting-row");
    editNameBtn.addEventListener("click", () => {
      inputName.value = myName;
      showInput(row);
      editNameBtn.classList.add("hidden");
      saveNameBtn.classList.remove("hidden");
      cancelNameBtn.classList.remove("hidden");
      inputName.focus();
    });
    cancelNameBtn.addEventListener("click", () => {
      hideInput(row);
      editNameBtn.classList.remove("hidden");
      saveNameBtn.classList.add("hidden");
      cancelNameBtn.classList.add("hidden");
    });
    saveNameBtn.addEventListener("click", async () => {
      const v = inputName.value.trim();
      if (!v) { showToast("Name cannot be empty.", "error"); return; }
      try {
        const data = await api("/api/profile", { method: "PUT", body: JSON.stringify({ name: v }) });
        myName = data.user.name;
        myInitials = myName.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
        document.getElementById("settingsName").textContent = myName;
        document.getElementById("playerName").textContent = myName;
        refreshAllAvatars(myInitials);
        hideInput(row);
        editNameBtn.classList.remove("hidden");
        saveNameBtn.classList.add("hidden");
        cancelNameBtn.classList.add("hidden");
        showToast("Display name updated.", "success");
      } catch (err) {
        showToast(err.message || "Failed to update name.", "error");
      }
    });
  }

  const editEmailBtn = document.getElementById("editEmailBtn");
  const saveEmailBtn = document.getElementById("saveEmailBtn");
  const cancelEmailBtn = document.getElementById("cancelEmailBtn");
  const inputEmail = document.getElementById("inputEmail");

  if (editEmailBtn) {
    const row = editEmailBtn.closest(".setting-row");
    editEmailBtn.addEventListener("click", () => {
      inputEmail.value = myEmail;
      showInput(row);
      editEmailBtn.classList.add("hidden");
      saveEmailBtn.classList.remove("hidden");
      cancelEmailBtn.classList.remove("hidden");
      inputEmail.focus();
    });
    cancelEmailBtn.addEventListener("click", () => {
      hideInput(row);
      editEmailBtn.classList.remove("hidden");
      saveEmailBtn.classList.add("hidden");
      cancelEmailBtn.classList.add("hidden");
    });
    saveEmailBtn.addEventListener("click", async () => {
      const v = inputEmail.value.trim();
      if (!v || !v.includes("@")) { showToast("Enter a valid email.", "error"); return; }
      try {
        const data = await api("/api/profile", { method: "PUT", body: JSON.stringify({ email: v }) });
        myEmail = data.user.email;
        document.getElementById("settingsEmail").textContent = myEmail;
        document.getElementById("playerEmail").textContent = myEmail;
        hideInput(row);
        editEmailBtn.classList.remove("hidden");
        saveEmailBtn.classList.add("hidden");
        cancelEmailBtn.classList.add("hidden");
        showToast("Email updated.", "success");
      } catch (err) {
        showToast(err.message || "Failed to update email.", "error");
      }
    });
  }

  const editRegionBtn = document.getElementById("editRegionBtn");
  const saveRegionBtn = document.getElementById("saveRegionBtn");
  const cancelRegionBtn = document.getElementById("cancelRegionBtn");
  const inputRegion = document.getElementById("inputRegion");

  if (editRegionBtn) {
    const row = editRegionBtn.closest(".setting-row");
    editRegionBtn.addEventListener("click", () => {
      const cur = document.getElementById("settingsRegion").textContent;
      inputRegion.value = cur;
      showInput(row);
      editRegionBtn.classList.add("hidden");
      saveRegionBtn.classList.remove("hidden");
      cancelRegionBtn.classList.remove("hidden");
    });
    cancelRegionBtn.addEventListener("click", () => {
      hideInput(row);
      editRegionBtn.classList.remove("hidden");
      saveRegionBtn.classList.add("hidden");
      cancelRegionBtn.classList.add("hidden");
    });
    saveRegionBtn.addEventListener("click", async () => {
      try {
        await api("/api/settings", { method: "PUT", body: JSON.stringify({ region: inputRegion.value }) });
        document.getElementById("settingsRegion").textContent = inputRegion.value;
        hideInput(row);
        editRegionBtn.classList.remove("hidden");
        saveRegionBtn.classList.add("hidden");
        cancelRegionBtn.classList.add("hidden");
        showToast("Region updated.", "success");
      } catch (err) {
        showToast(err.message || "Failed to update region.", "error");
      }
    });
  }

  function applyNotificationToggles(notifications) {
    const map = {
      matchInvites: notifications.matchInvites ?? true,
      rankChanges: notifications.rankChanges ?? true,
      friendRequests: notifications.friendRequests ?? false,
      weeklyRecap: notifications.weeklyRecap ?? false
    };
    document.querySelectorAll("[data-notif]").forEach(input => {
      input.checked = !!map[input.dataset.notif];
    });
  }
  document.querySelectorAll("[data-notif]").forEach(input => {
    input.addEventListener("change", async () => {
      const key = input.dataset.notif;
      const payload = { notifications: {} };
      payload.notifications[key] = input.checked;
      try {
        await api("/api/settings", { method: "PUT", body: JSON.stringify(payload) });
        showToast("Preferences saved.", "success");
      } catch (err) {
        showToast(err.message || "Failed to save.", "error");
      }
    });
  });

  function applyPreferredGames(list) {
    document.querySelectorAll(".pref-chip").forEach(chip => {
      if (list.includes(chip.dataset.game)) chip.classList.add("active");
      else chip.classList.remove("active");
    });
  }
  document.querySelectorAll(".pref-chip").forEach(chip => {
    chip.addEventListener("click", async () => {
      const key = chip.dataset.game;
      const active = [];
      document.querySelectorAll(".pref-chip.active").forEach(c => active.push(c.dataset.game));
      const idx = active.indexOf(key);
      if (idx >= 0) active.splice(idx, 1);
      else active.push(key);

      try {
        await api("/api/settings", { method: "PUT", body: JSON.stringify({ preferredGames: active }) });
        applyPreferredGames(active);
      } catch (err) {
        showToast(err.message || "Failed to save.", "error");
      }
    });
  });

  const openPasswordBtn = document.getElementById("openPasswordBtn");
  if (openPasswordBtn) {
    openPasswordBtn.addEventListener("click", () => {
      let modal = document.getElementById("passwordModal");
      if (!modal) {
        modal = document.createElement("div");
        modal.id = "passwordModal";
        modal.className = "logout-modal";
        modal.innerHTML = `
          <div class="logout-modal-card" role="dialog" aria-modal="true">
            <div class="logout-modal-head">
              <span class="logout-modal-icon" style="color:var(--accent);filter:drop-shadow(0 0 8px var(--accent-glow));">🔒</span>
              <span class="logout-modal-title" style="color:var(--accent);">Change Password</span>
            </div>
            <div class="pw-field"><label>Current Password</label><input type="password" id="pwCurrent" placeholder="••••••••"></div>
            <div class="pw-field"><label>New Password</label><input type="password" id="pwNew" placeholder="At least 6 characters"></div>
            <div class="pw-field"><label>Confirm New Password</label><input type="password" id="pwConfirm" placeholder="Repeat new password"></div>
            <div class="logout-modal-actions" style="margin-top:18px;">
              <button class="logout-modal-btn" id="cancelPw" type="button">Cancel</button>
              <button class="logout-modal-btn danger" id="savePw" type="button" style="background:linear-gradient(135deg,var(--accent),var(--accent-dim));color:#1a1206;">Save</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector("#cancelPw").addEventListener("click", () => modal.classList.remove("show"));
        modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("show"); });
        modal.querySelector("#savePw").addEventListener("click", async () => {
          const cur = modal.querySelector("#pwCurrent").value;
          const nw  = modal.querySelector("#pwNew").value;
          const cf  = modal.querySelector("#pwConfirm").value;
          if (!cur) { showToast("Enter your current password.", "error"); return; }
          if (nw.length < 6) { showToast("New password must be 6+ characters.", "error"); return; }
          if (nw !== cf) { showToast("Passwords do not match.", "error"); return; }
          try {
            await api("/api/password", { method: "PUT", body: JSON.stringify({ currentPassword: cur, newPassword: nw }) });
            modal.querySelector("#pwCurrent").value = "";
            modal.querySelector("#pwNew").value = "";
            modal.querySelector("#pwConfirm").value = "";
            modal.classList.remove("show");
            showToast("Password updated.", "success");
          } catch (err) {
            showToast(err.message || "Failed to update password.", "error");
          }
        });
      }
      modal.classList.add("show");
    });
  }

  const openSignOutAllBtn = document.getElementById("openSignOutAllBtn");
  if (openSignOutAllBtn) {
    openSignOutAllBtn.addEventListener("click", () => {
      if (confirm("Sign out of all devices? This will log you out everywhere.")) {
        setToken("");
        window.location.href = "index.html";
      }
    });
  }

  /* ============================================================
     GAME SELECT MODAL
     ============================================================ */
  function buildGameSelectModal() {
    if (document.getElementById("gameSelectModal")) return;
    const modal = document.createElement("div");
    modal.id = "gameSelectModal";
    modal.className = "game-modal";
    modal.innerHTML = `
      <div class="game-modal-card" role="dialog" aria-modal="true">
        <div class="game-modal-head">
          <span class="game-modal-title">Select Game</span>
          <button class="game-modal-close" id="closeGameModal" type="button">✕</button>
        </div>
        <p class="game-modal-sub">Choose which title to queue for. All matches are 5v5 · Single map.</p>
        <div class="game-grid" id="gameGrid"></div>
        <div class="game-modal-actions">
          <button class="game-modal-btn" id="cancelGameSelect" type="button">Cancel</button>
          <button class="game-modal-btn primary" id="queueBtn" type="button" disabled>Queue</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const grid = modal.querySelector("#gameGrid");
    grid.innerHTML = GAMES.map(g => `
      <button class="game-card" data-game="${g.key}" style="--game-color:${g.color}">
        <span class="game-card-tag">${g.tag}</span>
        <span class="game-card-name">${g.name}</span>
        <span class="game-card-rank" id="rank-${g.key}">—</span>
      </button>
    `).join("");

    GAMES.forEach(g => {
      const el = document.getElementById(`rank-${g.key}`);
      if (!el) return;
      const r = resolveRank(getEloForGame(g.key));
      el.textContent = r.label;
      el.style.color = r.color;
    });
  }
  buildGameSelectModal();

  const gameModal = document.getElementById("gameSelectModal");
  const gameGrid = document.getElementById("gameGrid");
  const queueBtn = document.getElementById("queueBtn");
  const closeGameModalBtn = document.getElementById("closeGameModal");
  const cancelGameSelect = document.getElementById("cancelGameSelect");

  let pendingGame = null;

  function openGameModal() {
    pendingGame = null;
    queueBtn.disabled = true;
    gameGrid.querySelectorAll(".game-card").forEach(c => c.classList.remove("selected"));
    gameModal.classList.add("show");
    document.body.style.overflow = "hidden";
  }
  function closeGameModal() {
    gameModal.classList.remove("show");
    document.body.style.overflow = "";
  }

  gameGrid.addEventListener("click", (e) => {
    const card = e.target.closest(".game-card");
    if (!card) return;
    gameGrid.querySelectorAll(".game-card").forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");
    pendingGame = card.dataset.game;
    queueBtn.disabled = false;
  });

  closeGameModalBtn.addEventListener("click", closeGameModal);
  cancelGameSelect.addEventListener("click", closeGameModal);
  gameModal.addEventListener("click", (e) => { if (e.target === gameModal) closeGameModal(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && gameModal.classList.contains("show")) closeGameModal();
  });

  /* ============================================================
     SEARCHING MODAL
     ============================================================ */
  function buildSearchModal() {
    if (document.getElementById("searchModal")) return;
    const modal = document.createElement("div");
    modal.id = "searchModal";
    modal.className = "search-modal";
    modal.innerHTML = `
      <div class="search-card">
        <div class="search-game" id="searchGameTag">CS2</div>
        <div class="search-ring"></div>
        <div class="search-status" id="searchStatus">Searching for match…</div>
        <div class="search-time" id="searchTime">00:00</div>
        <button class="search-cancel" id="cancelQueue" type="button">Cancel Search</button>
      </div>
    `;
    document.body.appendChild(modal);
  }
  buildSearchModal();

  const searchModal = document.getElementById("searchModal");
  const searchGameTag = document.getElementById("searchGameTag");
  const searchStatus = document.getElementById("searchStatus");
  const searchTime = document.getElementById("searchTime");
  const cancelQueue = document.getElementById("cancelQueue");

  let searchInterval = null, searchElapsed = 0, searchTimeout = null;

  function startQueue(gameKey) {
    const game = GAMES.find(g => g.key === gameKey);
    if (!game) return;

    closeGameModal();
    selectedGame = gameKey;
    localStorage.setItem("selectedGame", gameKey);
    applySelectedGame();

    searchGameTag.textContent = game.tag;
    searchGameTag.style.color = game.color;
    searchGameTag.style.borderColor = game.color + "88";
    searchGameTag.style.background = game.color + "22";
    searchStatus.textContent = `Searching for 5v5 ${game.tag} match…`;
    searchTime.textContent = "00:00";
    searchElapsed = 0;

    searchModal.classList.add("show");
    document.body.style.overflow = "hidden";

    searchInterval = setInterval(() => {
      searchElapsed++;
      const m = String(Math.floor(searchElapsed / 60)).padStart(2, "0");
      const s = String(searchElapsed % 60).padStart(2, "0");
      searchTime.textContent = `${m}:${s}`;
    }, 1000);

    searchTimeout = setTimeout(() => {
      clearInterval(searchInterval);
      searchStatus.textContent = "Match found!";
      searchStatus.style.color = "var(--win)";
      setTimeout(() => {
        searchModal.classList.remove("show");
        openMatchFoundModal(game);
      }, 1000);
    }, 5000);
  }

  function endQueue() {
    clearInterval(searchInterval);
    clearTimeout(searchTimeout);
    searchModal.classList.remove("show");
    document.body.style.overflow = "";
    searchStatus.style.color = "";
    searchElapsed = 0;
  }

  cancelQueue.addEventListener("click", endQueue);

  /* ============================================================
     VETO STEPS
     ============================================================ */
  function buildVetoSteps(starter) {
    const opp = starter === "you" ? "opp" : "you";
    return [
      { step: 1, turn: starter, action: "ban" },
      { step: 2, turn: opp,     action: "ban" },
      { step: 3, turn: starter, action: "ban" },
      { step: 4, turn: opp,     action: "ban" },
      { step: 5, turn: starter, action: "ban" },
      { step: 6, turn: opp,     action: "ban" }
    ];
  }

  const FAKE_NAMES = [
    "ViperX", "GhostByte", "NightHawk", "ShadowStrike", "IronWolf",
    "FrostByte", "RogueZero", "CobraOps", "RaptorZ", "SteelFang",
    "NeonDrift", "BlitzKrieg", "CrimsonAce", "HexaVenom", "WraithEcho",
    "PhantomRay", "ZeroCool", "ToxicKing", "AlphaBeta", "QuantumFox",
    "DarkPulse", "SilentShot", "NovaBurst", "OmegaX", "DeltaOne"
  ];

  function pickPlayer(exclude = []) {
    const pool = FAKE_NAMES.filter(n => !exclude.includes(n));
    const name = pool[Math.floor(Math.random() * pool.length)];
    const elo = 900 + Math.floor(Math.random() * 1400);
    return { name, elo, rank: resolveRank(elo) };
  }

  let matchState = null;

  function buildMatchFlowModals() {
    if (!document.getElementById("matchFoundModal")) {
      const mf = document.createElement("div");
      mf.id = "matchFoundModal";
      mf.className = "search-modal";
      mf.innerHTML = `
        <div class="search-card match-found-card">
          <div class="match-found-label">MATCH FOUND · 5 v 5 · SINGLE MAP</div>
          <div class="team-layout">
            <div class="team-col">
              <div class="team-header team-header-you">YOUR TEAM</div>
              <ul class="team-list" id="teamYou"></ul>
            </div>
            <div class="team-col">
              <div class="team-header team-header-opp">ENEMY TEAM</div>
              <ul class="team-list" id="teamOpp"></ul>
            </div>
          </div>
          <div class="search-status" style="color:var(--win);margin:14px 0 6px;">Preparing coin toss…</div>
          <div class="search-time" id="mfCountdown">3</div>
        </div>
      `;
      document.body.appendChild(mf);
    }

    if (!document.getElementById("coinTossModal")) {
      const ct = document.createElement("div");
      ct.id = "coinTossModal";
      ct.className = "search-modal";
      ct.innerHTML = `
        <div class="search-card coin-card">
          <div class="match-found-label">COIN TOSS</div>
          <div class="coin-stage">
            <div class="coin" id="coinEl">
              <div class="coin-face coin-heads"><span class="coin-symbol">H</span><span class="coin-label">HEADS</span></div>
              <div class="coin-face coin-tails"><span class="coin-symbol">T</span><span class="coin-label">TAILS</span></div>
            </div>
          </div>
          <div class="coin-result" id="coinResult">Flipping…</div>
          <div class="coin-sub" id="coinSub">Deciding who starts the veto</div>
        </div>
      `;
      document.body.appendChild(ct);
    }

    if (!document.getElementById("vetoModal")) {
      const vm = document.createElement("div");
      vm.id = "vetoModal";
      vm.className = "search-modal";
      vm.innerHTML = `
        <div class="search-card veto-card">
          <div class="match-found-label">MAP VETO · SINGLE MAP · 30s PER TURN</div>
          <div class="veto-teams">
            <div class="veto-team">
              <div class="veto-team-header veto-team-header-you">YOUR TEAM</div>
              <ul class="veto-team-list" id="vetoTeamYou"></ul>
            </div>
            <div class="veto-team">
              <div class="veto-team-header veto-team-header-opp">ENEMY TEAM</div>
              <ul class="veto-team-list" id="vetoTeamOpp"></ul>
            </div>
          </div>
          <div class="veto-ban-cols">
            <div class="veto-ban-col">
              <div class="veto-ban-col-label">YOUR BANS</div>
              <ul class="veto-ban-list" id="actionListYou"></ul>
            </div>
            <div class="veto-ban-col">
              <div class="veto-ban-col-label">ENEMY BANS</div>
              <ul class="veto-ban-list" id="actionListOpp"></ul>
            </div>
          </div>
          <div class="veto-timer-row">
            <div class="veto-timer" id="vetoTimer">30</div>
            <div class="veto-timer-info">
              <div class="veto-turn" id="vetoStatus">Step 1 — Ban a map</div>
              <div class="veto-count" id="vetoCount">Your turn</div>
            </div>
          </div>
          <div class="veto-remaining-label">AVAILABLE MAPS</div>
          <div class="veto-maps" id="vetoMaps"></div>
          <div class="bo3-summary">
            <div class="bo3-title">MATCH MAP</div>
            <div class="bo3-slots single">
              <div class="bo3-slot final">
                <span class="bo3-slot-label">WILL BE PLAYED</span>
                <span class="bo3-slot-value" id="finalMap">7 maps left</span>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(vm);
    }

    if (!document.getElementById("matchReadyModal")) {
      const rm = document.createElement("div");
      rm.id = "matchReadyModal";
      rm.className = "search-modal";
      rm.innerHTML = `
        <div class="search-card countdown-card">
          <div class="match-found-label">MATCH READY · SINGLE MAP</div>
          <div class="bo3-ready">
            <div class="bo3-ready-row decider">
              <span class="bo3-ready-tag">THE MAP</span>
              <span class="bo3-ready-name" id="readyMap">—</span>
            </div>
          </div>
          <div class="search-time countdown-num" id="readyCountdown">5</div>
          <div class="search-status" style="color:var(--accent);">Get ready…</div>
        </div>
      `;
      document.body.appendChild(rm);
    }
  }
  buildMatchFlowModals();

  const matchFoundModal = document.getElementById("matchFoundModal");
  const coinTossModal = document.getElementById("coinTossModal");
  const coinEl = document.getElementById("coinEl");
  const coinResult = document.getElementById("coinResult");
  const coinSub = document.getElementById("coinSub");
  const vetoModal = document.getElementById("vetoModal");
  const matchReadyModal = document.getElementById("matchReadyModal");

  function openMatchFoundModal(game) {
    const myElo = getEloForGame(game.key);
    const myRank = resolveRank(myElo);

    const usedNames = [myName];
    const teammates = [];
    for (let i = 0; i < 4; i++) {
      const p = pickPlayer(usedNames);
      usedNames.push(p.name);
      teammates.push(p);
    }

    const enemies = [];
    for (let i = 0; i < 5; i++) {
      const p = pickPlayer(usedNames);
      usedNames.push(p.name);
      enemies.push(p);
    }

    matchState = {
      game, myElo, myRank, teammates, enemies,
      remaining: [...game.maps],
      stepIndex: 0,
      myActions: [],
      oppActions: [],
      banTimer: null,
      banSecondsLeft: BAN_TIMER_SEC,
      starter: "you",
      steps: []
    };

    const myInitials = myName.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();

    document.getElementById("teamYou").innerHTML = `
      <li class="team-row team-row-you">
        <span class="team-avatar">${myInitials}</span>
        <span class="team-name">${myName} <span class="team-you-tag">YOU</span></span>
        <span class="team-rank" style="color:${myRank.color}">${myRank.label}</span>
      </li>
    ` + teammates.map(p => `
      <li class="team-row">
        <span class="team-avatar">${p.name.slice(0, 2).toUpperCase()}</span>
        <span class="team-name">${p.name}</span>
        <span class="team-rank" style="color:${p.rank.color}">${p.rank.label}</span>
      </li>
    `).join("");

    document.getElementById("teamOpp").innerHTML = enemies.map(p => `
      <li class="team-row team-row-enemy">
        <span class="team-avatar">${p.name.slice(0, 2).toUpperCase()}</span>
        <span class="team-name">${p.name}</span>
        <span class="team-rank" style="color:${p.rank.color}">${p.rank.label}</span>
      </li>
    `).join("");

    let cd = 3;
    document.getElementById("mfCountdown").textContent = cd;
    matchFoundModal.classList.add("show");
    document.body.style.overflow = "hidden";

    const iv = setInterval(() => {
      cd--;
      if (cd <= 0) {
        clearInterval(iv);
        matchFoundModal.classList.remove("show");
        openCoinToss();
      } else {
        document.getElementById("mfCountdown").textContent = cd;
      }
    }, 1000);
  }

  function openCoinToss() {
    if (!matchState) return;
    coinResult.textContent = "Flipping…";
    coinResult.className = "coin-result";
    coinSub.textContent = "Deciding who starts the veto";
    coinEl.classList.remove("flipping", "heads", "tails");
    void coinEl.offsetWidth;

    coinTossModal.classList.add("show");
    document.body.style.overflow = "hidden";
    coinEl.classList.add("flipping");

    const isHeads = Math.random() < 0.5;
    matchState.starter = isHeads ? "you" : "opp";

    setTimeout(() => {
      coinEl.classList.remove("flipping");
      coinEl.classList.add(isHeads ? "heads" : "tails");
      coinResult.textContent = isHeads ? "HEADS — YOU WIN" : "TAILS — ENEMY WINS";
      coinResult.className = `coin-result ${isHeads ? "you" : "opp"}`;
      coinSub.textContent = isHeads ? "YOU START THE VETO" : "ENEMY STARTS THE VETO";

      setTimeout(() => {
        coinTossModal.classList.remove("show");
        openVetoRoom();
      }, COIN_RESULT_PAUSE_MS);
    }, COIN_TOSS_DURATION_MS);
  }

  function openVetoRoom() {
    if (!matchState) return;

    matchState.steps = buildVetoSteps(matchState.starter || "you");
    matchState.stepIndex = 0;
    matchState.myActions = [];
    matchState.oppActions = [];

    const myInitials = myName.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();

    document.getElementById("vetoTeamYou").innerHTML = `
      <li class="veto-team-row veto-team-row-you">
        <span class="veto-team-avatar">${myInitials}</span>
        <span class="veto-team-name">${myName} <span class="veto-captain">★ CAPTAIN</span></span>
      </li>
    ` + matchState.teammates.map(p => `
      <li class="veto-team-row">
        <span class="veto-team-avatar">${p.name.slice(0, 2).toUpperCase()}</span>
        <span class="veto-team-name">${p.name}</span>
      </li>
    `).join("");

    document.getElementById("vetoTeamOpp").innerHTML = matchState.enemies.map((p, i) => `
      <li class="veto-team-row veto-team-row-opp">
        <span class="veto-team-avatar">${p.name.slice(0, 2).toUpperCase()}</span>
        <span class="veto-team-name">${p.name}${i === 0 ? ' <span class="veto-captain opp">★ CAPTAIN</span>' : ""}</span>
      </li>
    `).join("");

    renderActionColumns();
    renderVetoMaps();
    renderFinalMap();
    startVetoTurn();

    vetoModal.classList.add("show");
    document.body.style.overflow = "hidden";
  }

  function currentStep() { return matchState.steps[matchState.stepIndex]; }

  function renderActionColumns() {
    document.getElementById("actionListYou").innerHTML = matchState.myActions.length
      ? matchState.myActions.map(a => `<li class="veto-ban-item filled">✖ BAN · ${a.map}</li>`).join("")
      : `<li class="veto-ban-item">—</li>`;

    document.getElementById("actionListOpp").innerHTML = matchState.oppActions.length
      ? matchState.oppActions.map(a => `<li class="veto-ban-item filled enemy">✖ BAN · ${a.map}</li>`).join("")
      : `<li class="veto-ban-item">—</li>`;
  }

  function renderVetoMaps() {
    const mapsEl = document.getElementById("vetoMaps");
    mapsEl.innerHTML = matchState.remaining.map(m => `
      <button class="veto-map-btn" data-map="${m}" type="button">
        <span class="veto-map-name">${m}</span>
      </button>
    `).join("");

    const step = currentStep();
    if (step && step.turn === "you") {
      mapsEl.querySelectorAll(".veto-map-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          if (!matchState) return;
          const s = currentStep();
          if (!s || s.turn !== "you") return;
          takeAction("you", s.action, btn.dataset.map);
        });
      });
    } else {
      mapsEl.querySelectorAll(".veto-map-btn").forEach(b => b.disabled = true);
    }
  }

  function renderFinalMap() {
    const el = document.getElementById("finalMap");
    if (!el) return;
    if (matchState.remaining.length === 1) el.textContent = matchState.remaining[0];
    else el.textContent = `${matchState.remaining.length} maps left`;
  }

  function updateVetoUI() {
    const statusEl = document.getElementById("vetoStatus");
    const countEl = document.getElementById("vetoCount");
    const step = currentStep();

    if (!step) {
      statusEl.textContent = "Veto complete";
      countEl.textContent = "";
      return;
    }

    if (step.turn === "you") {
      statusEl.textContent = `Step ${step.step}/6 — BAN a map`;
      statusEl.style.color = "var(--accent)";
      countEl.textContent = "Your turn";
    } else {
      statusEl.textContent = `Step ${step.step}/6 — Enemy is banning…`;
      statusEl.style.color = "var(--danger)";
      countEl.textContent = "Enemy turn";
    }
  }

  function takeAction(side, action, mapName) {
    if (!matchState) return;
    if (!matchState.remaining.includes(mapName)) return;

    if (side === "you") matchState.myActions.push({ action, map: mapName });
    else matchState.oppActions.push({ action, map: mapName });

    matchState.remaining = matchState.remaining.filter(m => m !== mapName);
    matchState.stepIndex++;
    renderActionColumns();
    renderVetoMaps();
    renderFinalMap();
    stopBanTimer();

    if (matchState.stepIndex >= matchState.steps.length) {
      updateVetoUI();
      setTimeout(() => {
        vetoModal.classList.remove("show");
        openMatchReady();
      }, 1200);
      return;
    }

    startVetoTurn();
  }

  function startVetoTurn() {
    const step = currentStep();
    if (!step) return;

    if (step.turn === "you") {
      startBanTimer();
      renderVetoMaps();
      updateVetoUI();
    } else {
      stopBanTimer();
      updateVetoUI();
      document.getElementById("vetoMaps").querySelectorAll(".veto-map-btn").forEach(b => b.disabled = true);
      setTimeout(() => {
        if (!matchState) return;
        const s = currentStep();
        if (!s || s.turn !== "opp") return;
        const pick = matchState.remaining[Math.floor(Math.random() * matchState.remaining.length)];
        takeAction("opp", s.action, pick);
      }, 1500);
    }
  }

  function startBanTimer() {
    stopBanTimer();
    matchState.banSecondsLeft = BAN_TIMER_SEC;
    updateTimerUI();

    matchState.banTimer = setInterval(() => {
      matchState.banSecondsLeft--;
      updateTimerUI();

      if (matchState.banSecondsLeft <= 0) {
        stopBanTimer();
        const s = currentStep();
        if (s && s.turn === "you" && matchState.remaining.length > 1) {
          const pick = matchState.remaining[Math.floor(Math.random() * matchState.remaining.length)];
          takeAction("you", s.action, pick);
        }
      }
    }, 1000);
  }

  function stopBanTimer() {
    if (matchState && matchState.banTimer) {
      clearInterval(matchState.banTimer);
      matchState.banTimer = null;
    }
  }

  function updateTimerUI() {
    const timerEl = document.getElementById("vetoTimer");
    if (!timerEl || !matchState) return;
    timerEl.textContent = matchState.banSecondsLeft;
    if (matchState.banSecondsLeft <= 5) {
      timerEl.style.color = "var(--danger)";
      timerEl.style.textShadow = "0 0 20px var(--danger-glow)";
    } else {
      timerEl.style.color = "";
      timerEl.style.textShadow = "";
    }
  }

  function openMatchReady() {
    if (!matchState) return;

    const finalMap = matchState.remaining[0];
    document.getElementById("readyMap").textContent = finalMap;

    let cd = 5;
    document.getElementById("readyCountdown").textContent = cd;

    matchReadyModal.classList.add("show");
    document.body.style.overflow = "hidden";

    const iv = setInterval(async () => {
      cd--;
      document.getElementById("readyCountdown").textContent = cd;
      if (cd <= 0) {
        clearInterval(iv);
        matchReadyModal.classList.remove("show");
        document.body.style.overflow = "";

        try {
          const gameKey = matchState.game.key;
          const opponentName = matchState.enemies[0]?.name || "Enemy";
          const won = Math.random() < 0.5;
          const scoreOptions = ["16 - 12", "16 - 14", "13 - 16", "14 - 16", "16 - 8", "9 - 16"];
          const score = scoreOptions[Math.floor(Math.random() * scoreOptions.length)];
          const eloDelta = won ? 20 + Math.floor(Math.random() * 10) : -(15 + Math.floor(Math.random() * 8));

          const data = await api("/api/match", {
            method: "POST",
            body: JSON.stringify({ game: gameKey, map: finalMap, result: won ? "win" : "loss", score, eloDelta, opponent: opponentName })
          });

          if (data.user && data.user.ranks) {
            userRanks = data.user.ranks;
            applySelectedGame();
          }
          if (matchList) {
            const recent = (data.user.matches || []).slice(-5).reverse();
            matchList.innerHTML = renderMatchRows(recent);
          }

          showToast(`Match recorded on ${finalMap}! ${won ? "+" : ""}${eloDelta} ELO`, "success");
        } catch (err) {
          console.error("Failed to save match:", err);
          showToast("Match ready, but failed to save to DB.", "error");
        }

        matchState = null;
      }
    }, 1000);
  }

  const playBtn = document.getElementById("playBtn");
  if (playBtn) playBtn.addEventListener("click", openGameModal);
  if (queueBtn) queueBtn.addEventListener("click", () => { if (pendingGame) startQueue(pendingGame); });

  function showToast(message, type = "info") {
    let host = document.getElementById("toastHost");
    if (!host) {
      host = document.createElement("div");
      host.id = "toastHost";
      host.className = "toast-host";
      document.body.appendChild(host);
    }
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    host.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  if (!document.getElementById("logoutModal")) {
    const modal = document.createElement("div");
    modal.id = "logoutModal";
    modal.className = "logout-modal";
    modal.innerHTML = `
      <div class="logout-modal-card" role="dialog" aria-modal="true">
        <div class="logout-modal-head">
          <span class="logout-modal-icon">⚠</span>
          <span class="logout-modal-title">Logout</span>
        </div>
        <p class="logout-modal-text">
          Are you sure you want to sign out of Contra? You'll need to log in again to access your dashboard.
        </p>
        <div class="logout-modal-actions">
          <button class="logout-modal-btn" id="cancelLogout" type="button">Cancel</button>
          <button class="logout-modal-btn danger" id="confirmLogout" type="button">Yes, Logout</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const logoutModal = document.getElementById("logoutModal");
  const cancelLogoutBtn = document.getElementById("cancelLogout");
  const confirmLogout = document.getElementById("confirmLogout");

  function openLogoutModal() {
    logoutModal.classList.add("show");
    document.body.style.overflow = "hidden";
  }
  function closeLogoutModal() {
    logoutModal.classList.remove("show");
    document.body.style.overflow = "";
  }

  logoutBtn.addEventListener("click", openLogoutModal);
  cancelLogoutBtn.addEventListener("click", closeLogoutModal);
  logoutModal.addEventListener("click", (e) => { if (e.target === logoutModal) closeLogoutModal(); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && logoutModal.classList.contains("show")) closeLogoutModal();
  });
  confirmLogout.addEventListener("click", () => {
    setToken("");
    window.location.href = "index.html";
  });
}