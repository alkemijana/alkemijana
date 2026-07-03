/* ============================================================
   Virtualni tarot — inicijalizacija (glue)
   Samostalan modul: čita samo #tarot-app kontejner, ne dira ostatak stranice.
   ============================================================ */

(function initTarot() {
  function start() {
    const root = document.getElementById('tarot-app');
    if (!root) return;
    const engine = createTarotEngine();
    const ui = createTarotUI(engine, root);
    window.Tarot = { engine, ui };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
