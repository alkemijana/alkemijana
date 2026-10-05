/* ============================================================
   Generator: tarot/assets/decks/<špil>/back-halloween.svg
   (Halloween tjedan - tamnocrvene, sablasne poleđine karata)
   ------------------------------------------------------------
   Uzme postojeći back.svg svakog špila i:
     1. prebojа SVAKU boju po svjetlini (nijansa se zanemaruje, pa i
        zeleni Marseille i plavi Oracle postanu crveni):
          svijetle (L > 72 %) → kost, srednje → tamna krv, tamne → crno-crvena
     2. doda tamnu vinjetu po rubovima.
   (Do 5. 10. 2026. su se dodavala i dva crna šišmiša gore desno - izbačeni na zahtjev.)
   Motiv svakog špila ostaje prepoznatljiv - mijenja se samo raspoloženje.
   css/halloween.css ih pod html.hw-on stavi umjesto back.svg.

   POKRETANJE (nakon promjene nekog back.svg):  node tools/halloween-backs.js
   Nije dio stranice; izlazne back-halloween.svg JESU.
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const DECKS = ['rws', 'marseille', 'lenormand', 'oracle'];
const DIR = path.join(__dirname, '..', 'tarot', 'assets', 'decks');

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslToRgb(h, s, l) {
  h /= 360;
  if (s === 0) return [l, l, l].map(v => Math.round(v * 255));
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const t = x => { x = (x + 1) % 1; return x < 1 / 6 ? p + (q - p) * 6 * x : x < 1 / 2 ? q : x < 2 / 3 ? p + (q - p) * (2 / 3 - x) * 6 : p; };
  return [t(h + 1 / 3), t(h), t(h - 1 / 3)].map(v => Math.round(v * 255));
}
function spooky(r, g, b) {
  const l = rgbToHsl(r, g, b)[2];
  if (l > 0.72) return hslToRgb(38, 0.22, Math.min(0.8, l * 0.86));           // kost
  if (l > 0.22) return hslToRgb(357, 0.66, Math.min(0.36, Math.max(0.2, l * 0.55)));  // tamna krv
  return hslToRgb(357, 0.55, Math.max(0.02, l * 0.55));                      // crno-crvena
}
const hex2 = n => n.toString(16).padStart(2, '0');
function recolor(svg) {
  return svg.replace(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, (m, hex) => {
    const x = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
    const n = spooky(parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16));
    return '#' + n.map(hex2).join('');
  }).replace(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*[\d.]+\s*)?\)/g, (m, R, G, B, A) => {
    const n = spooky(+R, +G, +B);
    return A ? `rgba(${n[0]},${n[1]},${n[2]}${A})` : `rgb(${n[0]},${n[1]},${n[2]})`;
  });
}

/* Šišmiša na poleđinama VIŠE NEMA (izbačeni 5. 10. 2026. na zahtjev vlasnika):
   poleđina je ostala samo prebojani motiv špila + vinjeta. */
const VIGNETTE =
  '<defs><radialGradient id="hwVig" cx="50%" cy="48%" r="70%">' +
  '<stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.72"/>' +
  '</radialGradient></defs><rect x="0" y="0" width="260" height="442" fill="url(#hwVig)"/>';

for (const d of DECKS) {
  const src = path.join(DIR, d, 'back.svg');
  if (!fs.existsSync(src)) continue;
  let svg = recolor(fs.readFileSync(src, 'utf8'));
  svg = svg.replace(/<\/svg>\s*$/, `  <!-- Halloween: vinjeta (tools/halloween-backs.js) -->\n  ${VIGNETTE}\n</svg>\n`);
  svg = '<!-- GENERIRANO iz back.svg - ne uređivati ručno (node tools/halloween-backs.js) -->\n' + svg;
  fs.writeFileSync(path.join(DIR, d, 'back-halloween.svg'), svg);
  console.log(d + '/back-halloween.svg');
}
