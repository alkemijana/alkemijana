/* ============================================================
   Virtualni tarot — inicijalizacija (glue)
   Samostalan modul: čita samo #tarot-app / #vtar-cotd-root kontejnere,
   ne dira ostatak stranice.
   ============================================================ */

(function initTarot() {
  function start() {
    const root = document.getElementById('tarot-app');
    if (root) {
      const engine = createTarotEngine();
      const ui = createTarotUI(engine, root);
      window.Tarot = { engine, ui };
    }
    renderCardOfDay();
  }

  /* "Karta dana" na početnoj — deterministički odabir po datumu u
     hrvatskoj (Europe/Zagreb) vremenskoj zoni, mijenja se u ponoć.
     Izolirana iznimka od "bez tumačenja" pravila interaktivnog stola —
     v. CLAUDE.md. */
  function tarotZagrebDateString() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Zagreb', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
  }
  function tarotDailyCardDef() {
    const dateStr = tarotZagrebDateString();
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) { hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0; }
    return TAROT_CARD_DEFS[hash % TAROT_CARD_DEFS.length];
  }
  function renderCardOfDay() {
    const root = document.getElementById('vtar-cotd-root');
    if (!root || typeof TAROT_CARD_DEFS === 'undefined') return;
    const def = tarotDailyCardDef();
    const desc = (typeof TAROT_CARD_MEANINGS !== 'undefined' && TAROT_CARD_MEANINGS[def.id]) || '';
    const img = tarotCardImage('rws', def.id);
    root.innerHTML = `
      <div class="vtar-cotd">
        <img class="vtar-cotd-img" src="${img}" alt="Karta dana: ${def.name}" loading="lazy">
        <div class="vtar-cotd-text">
          <span class="vtar-cotd-eyebrow">✦ Karta dana</span>
          <h3 class="vtar-cotd-name">${def.name}</h3>
          <p class="vtar-cotd-desc">${desc}</p>
        </div>
      </div>
    `;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
