/* ============================================================
   Alkemijana — Živi natalni kotač na početnoj stranici
   Ovisi o: natal-data.js (PALETTES, loadScript), natal-calc.js (computeChart),
            natal-render.js (buildChartSVG)
   Lazy-load astronomy-engine pri prvom ulasku sekcije u viewport.
   ============================================================ */

'use strict';

(function () {
  let started = false;
  let timer = null;

  function mysticalPalette() {
    const base = (typeof PALETTES !== 'undefined') ? PALETTES.dark : null;
    if (!base) return null;
    return Object.assign({}, base, {
      ring:     'rgba(196,180,232,0.42)',
      ringSoft: 'rgba(168,144,208,0.22)',
      bandA:    'rgba(168,144,208,0.07)',
      bandB:    'rgba(168,144,208,0.015)',
      sign:     '#c4b0e8',
      tick:     'rgba(196,192,216,0.32)',
      planet:   '#f0eaff',
      degText:  'rgba(196,188,222,0.78)',
      houseNum: 'rgba(168,156,200,0.7)',
      conj:     '#b0a8ce',
      harm:     '#8fc5a4',
      tense:    '#d098a8'
    });
  }

  async function renderOnce() {
    const wrap = document.getElementById('home-live-natal-svg');
    if (!wrap) return;
    try {
      if (typeof Astronomy === 'undefined') {
        await loadScript('js/lib/astronomy.browser.min.js');
      }
      if (typeof computeChart !== 'function' || typeof buildChartSVG !== 'function') return;

      const chart = computeChart({
        utcDate: new Date(),
        lat: 0,
        lon: 0,
        noTime: true,
        nodeType: 'true'
      });

      const pal = mysticalPalette();
      if (!pal) return;
      const svg = buildChartSVG(chart, pal, {
        showAspects: true,
        aspectsEnabled: { conjunction: false, sextile: true, square: true, trine: true, opposition: true }
      });
      wrap.innerHTML = svg;
    } catch (e) {
      // tiho ignoriraj — sekcija ostane prazna ako ne uspije (npr. offline)
      console.warn('[natal-live] render greška:', e && e.message);
    }
  }

  async function startLive() {
    if (started) return;
    started = true;
    await renderOnce();
    const wrap = document.getElementById('home-natal-section') &&
                 document.querySelector('.home-live-natal-wrap');
    if (wrap) {
      // mali timeout da CSS transition uhvati promjenu klase nakon mount-a
      requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.add('lt-loaded')));
    }
    // Tiho ažuriranje svakih 60 sekundi — gibanje je gotovo nevidljivo,
    // ali pozicije ostaju "sad". Pauziramo kad tab nije aktivan.
    timer = setInterval(() => {
      if (!document.hidden) renderOnce();
    }, 60000);
  }

  function setupObserver() {
    const sect = document.getElementById('home-natal-section');
    if (!sect) return;
    if (!('IntersectionObserver' in window)) { startLive(); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          startLive();
          io.disconnect();
          break;
        }
      }
    }, { rootMargin: '180px' });
    io.observe(sect);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupObserver);
  } else {
    setupObserver();
  }
})();
