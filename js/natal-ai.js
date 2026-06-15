/* ============================================================================
   AI TUMAČENJE NATALNE KARTE — klijentska strana (samostalan modul)
   ----------------------------------------------------------------------------
   Cijela AI logika izdvojena je iz natal.js. Ovaj modul:
   - serijalizira kartu u tekstualni opis BEZ imena i ikakvih osobnih podataka
   - šalje POST /interpret-natal (server bira AI provajdera — vidi functions/ai/)
   - prikazuje tumačenje u kartici #natal-ai-card
   - ako je Jana ulogirana u admin (sessionStorage aj_pass), šalje X-Admin-Pass
     pa server zaobilazi dnevni IP-limit
   Ovisi o globalnim helperima iz natal-data.js / natal-calc.js
   (signName, fmtDegMin, computeDominants, detectShape) — učitava se nakon njih.
   ========================================================================== */
(function () {
  'use strict';

  let chart = null;

  // natal.js pri izradi karte poziva window.AInatal.setChart(chart)
  window.AInatal = {
    setChart(c) { chart = c; resetUI(); },
    reset: resetUI
  };

  function resetUI() {
    const out = document.getElementById('natal-ai-output');
    const disc = document.getElementById('natal-ai-disclaimer');
    if (out) { out.style.display = 'none'; out.innerHTML = ''; out.className = 'nt-ai-output'; }
    if (disc) disc.style.display = 'none';
  }

  /* Tekstualni opis karte za AI — BEZ imena i bez ikakvih osobnih podataka. */
  function serializeChartForAI(c) {
    const L = [];
    L.push(c.noTime
      ? 'Karta je izrađena BEZ vremena rođenja — nema kuća, Ascendenta ni MC-a; Mjesec je približan.'
      : 'Karta uključuje vrijeme rođenja (kuće po Placidusu, Ascendent i MC).');

    L.push('\nPOZICIJE PLANETA (planet — znak, stupanj' + (c.noTime ? '' : ', kuća') + '):');
    for (const p of c.planets) {
      let line = '- ' + p.name + ': ' + signName(p.lon) + ' ' + fmtDegMin(p.lon);
      if (!c.noTime && p.house) line += ', ' + p.house + '. kuća';
      if (p.retro) line += ' (retrogradno)';
      L.push(line);
    }

    if (!c.noTime) {
      L.push('\nOSI:');
      L.push('- Ascendent (ASC): ' + signName(c.asc) + ' ' + fmtDegMin(c.asc));
      L.push('- Medium Coeli (MC): ' + signName(c.mc) + ' ' + fmtDegMin(c.mc));
    }

    const nameOf = {};
    for (const p of c.planets) nameOf[p.id] = p.name;
    nameOf.asc = 'Ascendent'; nameOf.mc = 'MC';
    if (c.aspects && c.aspects.length) {
      L.push('\nASPEKTI:');
      for (const a of c.aspects) {
        L.push('- ' + (nameOf[a.a] || a.a) + ' ' + a.aspectName + ' ' + (nameOf[a.b] || a.b) +
          ' (orb ' + a.orb.toFixed(1) + '°)');
      }
    }

    try {
      const dom = computeDominants(c);
      const els = ['Vatra', 'Zemlja', 'Zrak', 'Voda'];
      const quals = ['Kardinalno', 'Fiksno', 'Promjenjivo'];
      L.push('\nDOMINANTE:');
      L.push('- Elementi: ' + els.map((e, i) => e + ' ' + dom.elements[i] + '%').join(', '));
      L.push('- Kvalitete: ' + quals.map((q, i) => q + ' ' + dom.qualities[i] + '%').join(', '));
      if (dom.aspectCounts && dom.aspectCounts.length) {
        L.push('- Najaspektiraniji: ' + dom.aspectCounts.slice(0, 4).map(x => x.name + ' (' + x.count + ')').join(', '));
      }
      const sh = detectShape(c);
      if (sh) L.push('- Oblik karte: ' + sh.name);
    } catch (e) { /* dominante nisu nužne */ }

    return L.join('\n');
  }

  /* Hash unosa (BEZ imena) — isti kao brojač karata; omogućuje cache na serveru. */
  async function chartHash(c) {
    const i = c.input;
    const norm = [
      i.y, i.mo, i.d,
      c.noTime ? 'NT' : (i.h + ':' + i.mi),
      (typeof i.lat === 'number' ? i.lat.toFixed(4) : ''),
      (typeof i.lon === 'number' ? i.lon.toFixed(4) : ''),
      i.nodeType || ''
    ].join('|');
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(norm));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function requestInterpretation() {
    if (!chart) return;
    const btn = document.getElementById('natal-ai-btn');
    const out = document.getElementById('natal-ai-output');
    const disc = document.getElementById('natal-ai-disclaimer');
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Tumačim…';
    out.style.display = 'block';
    out.className = 'nt-ai-output nt-ai-loading';
    out.textContent = 'AI čita tvoju kartu… ovo može potrajati nekoliko sekundi.';

    try {
      const summary = serializeChartForAI(chart);
      const h = await chartHash(chart);

      const headers = { 'Content-Type': 'application/json' };
      // ako je Jana ulogirana u admin → server zaobilazi dnevni IP-limit
      const pass = sessionStorage.getItem('aj_pass');
      if (pass) headers['X-Admin-Pass'] = pass;

      const r = await fetch('/interpret-natal', {
        method: 'POST', headers, body: JSON.stringify({ h, summary })
      });
      const data = await r.json().catch(() => ({}));

      if (data && data.ok && data.text) {
        out.className = 'nt-ai-output';
        out.innerHTML = renderAiText(data.text);
        disc.style.display = 'block';
      } else {
        out.className = 'nt-ai-output nt-ai-error';
        out.textContent = (data && data.note) ||
          'Tumačenje trenutno nije dostupno. Pokušaj ponovno kasnije — karta i PDF rade normalno.';
      }
    } catch (e) {
      out.className = 'nt-ai-output nt-ai-error';
      out.textContent = 'Tumačenje trenutno nije dostupno. Pokušaj ponovno kasnije.';
    } finally {
      btn.disabled = false; btn.textContent = orig;
    }
  }

  /* Lagani render: odlomci + **bold** + _kurziv_, čisti markdown naslove. Bez biblioteka. */
  function renderAiText(text) {
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return text.split(/\n{2,}/).map(block => {
      const b = esc(block.trim())
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/(?:^|(?<=\s))_(.+?)_(?=\s|$|[.,!?])/g, '<em>$1</em>')
        .replace(/^#{1,4}\s*/gm, '')
        .replace(/\n/g, '<br>');
      return b ? '<p>' + b + '</p>' : '';
    }).join('');
  }

  window.addEventListener('load', () => {
    const btn = document.getElementById('natal-ai-btn');
    if (btn) btn.addEventListener('click', requestInterpretation);
  });
})();
