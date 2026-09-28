/* CONTRA — Rankings page */
const TIERS_INFO = [
  { key: "bronze",     name: "BRONZE",     icon: "🥉", color: "#A97142", min: 0,    max: 900,  blurb: "Where every climb begins. Learn the maps, learn the meta." },
  { key: "silver",     name: "SILVER",     icon: "🥈", color: "#C0C0C0", min: 900,  max: 1500, blurb: "Refining your aim. Consistency is the way out of Silver." },
  { key: "gold",       name: "GOLD",       icon: "🥇", color: "#DE9B35", min: 1500, max: 2100, blurb: "Solid mechanics, reading the game. The grind begins." },
  { key: "amethyst",   name: "AMETHYST",   icon: "💜", color: "#A855F7", min: 2100, max: 2600, blurb: "Above average. High game sense, clean utility usage." },
  { key: "ruby",       name: "RUBY",       icon: "❤️", color: "#E0115F", min: 2600, max: 3000, blurb: "Elite. Every round counts. Every mistake punished." },
  { key: "diamond",    name: "DIAMOND",    icon: "💎", color: "#5EEAD4", min: 3000, max: 3500, blurb: "Top 1% of Contra. You play with and against pros." },
  { key: "challenger", name: "CHALLENGER", icon: "👑", color: "#FF2D55", min: 3500, max: null, blurb: "The absolute peak. Reserved for the best in the region." }
];

const tierList = document.getElementById("tierList");

if (tierList) {
  tierList.innerHTML = TIERS_INFO.slice().reverse().map(t => {
    const rangeText = t.max
      ? `${t.min.toLocaleString()} – ${t.max.toLocaleString()} ELO`
      : `${t.min.toLocaleString()}+ ELO`;
    return `
      <div class="tier-row" style="--tier:${t.color}">
        <div class="tier-icon">${t.icon}</div>
        <div class="tier-info">
          <div class="tier-name" style="color:${t.color}">${t.name}</div>
          <div class="tier-range">${rangeText}</div>
          <div class="tier-blurb">${t.blurb}</div>
        </div>
        <div class="tier-subs">
          ${["V","IV","III","II","I"].map(s =>
            `<span class="sub-pill" style="--tier:${t.color}">${s}</span>`
          ).join("")}
        </div>
      </div>
    `;
  }).join("");
}