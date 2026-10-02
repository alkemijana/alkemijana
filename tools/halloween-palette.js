/* ============================================================
   Generator: css/halloween-palette.css  (Halloween tjedan, paleta „Krv i kost")
   ------------------------------------------------------------
   Stilovi stranice imaju puno IZRAVNO upisanih ljubičastih boja (sjaj,
   sjene, pozadine gumba...) koje varijable iz css/halloween.css ne
   pokrivaju. Ovaj alat prođe kroz sve stilove, nađe svaku deklaraciju
   s ljubičastom/lavender bojom i zapiše njezinu verziju u paleti
   „krv i kost" pod `html.hw-on` (veća specifičnost → nadjača original).

   Pravilo preslikavanja (HSL): boje s nijansom 215°-330° i zasićenjem > 10 %:
     - skoro bijele (L > 80 %)   → kost   (topla, blijedo-bež)
     - lavanda i srednje (L > 24 %) → krv (tamnocrvena, naglasak)
     - tamne   (L ≤ 24 %)       → crno-crvena
     - sivkasto-ljubičaste (zasićenje < 28 %) → siva kost
   Neutralne boje (crna, bijela, sive) se ne diraju.

   Preskače: :root blokove (varijable su ručno u halloween.css), pravila
   za svijetlu temu (taj tjedan je isključena), @keyframes, @font-face.

   POKRETANJE (nakon svake promjene boja u CSS-u):
     node tools/halloween-palette.js
   Nije dio stranice; izlaz css/halloween-palette.css JEST.
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SOURCES = ['css/loader.css', 'css/style.css', 'css/nav-drawer.css', 'css/home-slides.css', 'tarot/tarot.css'];
const OUT = 'css/halloween-palette.css';

/* ---------- boje ---------- */
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
// vrati novu [r,g,b] ili null ako boju ne treba dirati
function remap(r, g, b) {
  const [h, s, l] = rgbToHsl(r, g, b);
  if (s <= 0.10 || h < 215 || h > 330) return null;
  if (l > 0.8) return hslToRgb(40, 0.24, Math.min(0.84, l * 0.94));         // skoro bijela lavanda (tekst) → kost
  if (s < 0.28) return hslToRgb(38, 0.14, Math.min(0.8, l * 0.92));         // siva lavanda → siva kost
  if (l > 0.24) return hslToRgb(357, 0.62, Math.min(0.42, Math.max(0.24, l * 0.6)));  // lavanda (naglasak) → krv
  return hslToRgb(357, 0.45, l * 0.85);                                     // tamna ljubičasta → crno-crvena
}
const hex2 = n => n.toString(16).padStart(2, '0');
const COLOR_RE = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b|rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/g;
function remapValue(v) {
  let changed = false;
  const out = v.replace(COLOR_RE, (m, hex, R, G, B, A) => {
    let r, g, b;
    if (hex) {
      const x = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex;
      r = parseInt(x.slice(0, 2), 16); g = parseInt(x.slice(2, 4), 16); b = parseInt(x.slice(4, 6), 16);
    } else { r = +R; g = +G; b = +B; }
    const n = remap(r, g, b);
    if (!n) return m;
    changed = true;
    if (hex) return '#' + n.map(hex2).join('');
    return A !== undefined ? `rgba(${n[0]}, ${n[1]}, ${n[2]}, ${A})` : `rgb(${n[0]}, ${n[1]}, ${n[2]})`;
  });
  return changed ? out : null;
}

/* ---------- vrlo jednostavan CSS parser (dovoljan za naše datoteke) ---------- */
function stripComments(css) { return css.replace(/\/\*[\s\S]*?\*\//g, ''); }
// vrati listu čvorova: {type:'rule', sel, body} | {type:'at', prelude, children} | {type:'skip'}
function parse(css) {
  const nodes = []; let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    if (open < 0) break;
    const head = css.slice(i, open).trim();
    // nađi pripadnu zatvorenu zagradu
    let depth = 1, j = open + 1;
    while (j < css.length && depth) { if (css[j] === '{') depth++; else if (css[j] === '}') depth--; j++; }
    const inner = css.slice(open + 1, j - 1);
    if (head.startsWith('@media') || head.startsWith('@supports')) nodes.push({ type: 'at', prelude: head, children: parse(inner) });
    else if (head.startsWith('@')) nodes.push({ type: 'skip' });
    else nodes.push({ type: 'rule', sel: head.replace(/^[;\s]+/, ''), body: inner });
    i = j;
  }
  return nodes;
}
function prefixSel(sel) {
  return sel.split(',').map(s => s.trim()).filter(Boolean).map(s => {
    if (/^:root/.test(s)) return s.replace(/^:root/, ':root.hw-on');
    if (/^html\b/.test(s)) return s.replace(/^html/, 'html.hw-on');
    return 'html.hw-on ' + s;
  }).join(',\n');
}
function emit(nodes, indent) {
  let out = '';
  for (const n of nodes) {
    if (n.type === 'at') {
      const inner = emit(n.children, indent + '  ');
      if (inner.trim()) out += `${indent}${n.prelude} {\n${inner}${indent}}\n`;
    } else if (n.type === 'rule') {
      if (n.sel.trim() === ':root') continue;
      if (/data-theme\s*=\s*["']?light/.test(n.sel)) continue;
      const decls = [];
      for (const d of n.body.split(';')) {
        const k = d.indexOf(':');
        if (k < 0) continue;
        const prop = d.slice(0, k).trim(), val = d.slice(k + 1).trim();
        if (!prop || !val) continue;
        const nv = remapValue(val);
        if (nv) decls.push(`${indent}  ${prop}: ${nv};`);
      }
      if (decls.length) out += `${indent}${prefixSel(n.sel).replace(/\n/g, '\n' + indent)} {\n${decls.join('\n')}\n${indent}}\n`;
    }
  }
  return out;
}

let result = '/* GENERIRANO - ne uređivati ručno. Izvor: tools/halloween-palette.js\n' +
  '   (node tools/halloween-palette.js). Halloween tjedan, paleta „Krv i kost":\n' +
  '   izravno upisane ljubičaste boje iz ostalih stilova, preslikane pod html.hw-on. */\n';
let count = 0;
for (const f of SOURCES) {
  const css = stripComments(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  const body = emit(parse(css), '');
  count += (body.match(/\{\n/g) || []).length;
  if (body.trim()) result += `\n/* ---- ${f} ---- */\n` + body;
}
fs.writeFileSync(path.join(ROOT, OUT), result);
console.log(`${OUT}: ${count} pravila, ${(result.length / 1024).toFixed(1)} KB`);
