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
  function tarotCardText(deckId, cardId) {
    return (typeof TAROT_CARD_TEXTS !== 'undefined' && TAROT_CARD_TEXTS[deckId] && TAROT_CARD_TEXTS[deckId][cardId]) || null;
  }

  function renderCardOfDay() {
    const root = document.getElementById('vtar-cotd-root');
    if (!root || typeof TAROT_CARD_DEFS === 'undefined') return;
    const def = tarotDailyCardDef();
    const text = tarotCardText('rws', def.id);
    const name = (text && text.name) || def.name;
    const desc = (text && text.upright) || '';
    const img = tarotCardImage('rws', def.id);
    root.innerHTML = `
      <a class="vtar-cotd" href="#tarot" onclick="showPage('tarot'); return false;" aria-label="Karta dana — otvori virtualni tarot i izvuci vlastite karte">
        <div class="vtar-cotd-visual"><img class="vtar-cotd-img" src="${img}" alt="Karta dana: ${name}" loading="lazy"></div>
        <div class="vtar-cotd-text">
          <span class="vtar-cotd-eyebrow">✦ Karta dana</span>
          <h3 class="vtar-cotd-name">${name}</h3>
          <p class="vtar-cotd-desc">${desc}</p>
          <span class="vtar-cotd-cta">Otvori virtualni tarot i izvuci vlastite karte →</span>
        </div>
      </a>
    `;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
