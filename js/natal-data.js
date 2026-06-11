/* ============================================================
   Alkemijana — Natalna karta · KONSTANTE I HELPERI
   Učitava se PRVO. Nema vanjskih ovisnosti.
   Definira: SIGNS, SIGN_KEYS, PLANET_DEFS, ASPECT_DEFS, GLYPHS,
   PALETTES, helpere (norm360, fmtDegMin, glyphSvgHtml, ...),
   konverziju vremena (localToUtc) i loadScript.
   ============================================================ */

'use strict';

/* ============ KONSTANTE ============ */

const SIGNS = ['Ovan','Bik','Blizanci','Rak','Lav','Djevica','Vaga','Škorpion','Strijelac','Jarac','Vodenjak','Ribe'];
const SIGN_KEYS = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];

const PLANET_DEFS = [
  { id:'sun',     name:'Sunce',         body:'Sun' },
  { id:'moon',    name:'Mjesec',        body:'Moon' },
  { id:'mercury', name:'Merkur',        body:'Mercury' },
  { id:'venus',   name:'Venera',        body:'Venus' },
  { id:'mars',    name:'Mars',          body:'Mars' },
  { id:'jupiter', name:'Jupiter',       body:'Jupiter' },
  { id:'saturn',  name:'Saturn',        body:'Saturn' },
  { id:'uranus',  name:'Uran',          body:'Uranus' },
  { id:'neptune', name:'Neptun',        body:'Neptune' },
  { id:'pluto',   name:'Pluton',        body:'Pluto' },
  { id:'node',    name:'Sjeverni čvor', body:null },
  { id:'lilith',  name:'Lilith',        body:null },
  { id:'chiron',  name:'Kiron',         body:null }
];

const ASPECT_DEFS = [
  { id:'conjunction', name:'Konjunkcija', angle:0,   orb:8 },
  { id:'sextile',     name:'Sekstil',     angle:60,  orb:5 },
  { id:'square',      name:'Kvadrat',     angle:90,  orb:7 },
  { id:'trine',       name:'Trigon',      angle:120, orb:7 },
  { id:'opposition',  name:'Opozicija',   angle:180, orb:8 }
];

/* ============ GLIFOVI (SVG path, viewBox 0 0 24 24) ============
   s = stroke path-evi, f = fill path-evi. Nacrtani ručno da ne
   ovise o fontovima — rade identično na ekranu i u PDF-u. */

const GLYPHS = {
  sun:     { s:'M12,5.2 A6.8,6.8 0 1,0 12,18.8 A6.8,6.8 0 1,0 12,5.2',
             f:'M12,10.4 A1.6,1.6 0 1,0 12,13.6 A1.6,1.6 0 1,0 12,10.4' },
  moon:    { s:'M13.8,3.6 A8.4,8.4 0 1,0 13.8,20.4 A6.6,6.6 0 1,1 13.8,3.6' },
  mercury: { s:'M12,6.4 A4.6,4.6 0 1,0 12,15.6 A4.6,4.6 0 1,0 12,6.4 M12,15.6 L12,21.2 M9.3,18.4 L14.7,18.4 M7.8,2.4 A4.4,4.4 0 0,0 16.2,2.4' },
  venus:   { s:'M12,3.4 A4.9,4.9 0 1,0 12,13.2 A4.9,4.9 0 1,0 12,3.4 M12,13.2 L12,21 M8.6,17.1 L15.4,17.1' },
  mars:    { s:'M10,8.8 A5.2,5.2 0 1,0 10,19.2 A5.2,5.2 0 1,0 10,8.8 M13.7,10.3 L19.5,4.5 M14.3,4.5 L19.5,4.5 L19.5,9.7' },
  jupiter: { s:'M4.6,7 A3.9,3.9 0 1,1 12.4,7.8 C12.4,10.8 9.4,13.6 4.2,15.6 L18.8,15.6 M15.2,10.2 L15.2,20.8' },
  saturn:  { s:'M8.2,3.4 L8.2,15.6 M5.4,6.6 L11,6.6 M8.2,10.6 C11.8,7.7 15.8,9.5 15.8,13.1 C15.8,15.9 14,17.9 12,19.3 C11.2,19.9 11.2,20.7 12,21.1' },
  uranus:  { s:'M7,3.6 L7,12.4 M17,3.6 L17,12.4 M7,8 L17,8 M12,8 L12,13.8 M12,13.8 A2.9,2.9 0 1,0 12,19.6 A2.9,2.9 0 1,0 12,13.8',
             f:'M12,15.7 A1,1 0 1,0 12,17.7 A1,1 0 1,0 12,15.7' },
  neptune: { s:'M5.4,4.8 C5.4,9.6 8.2,12.4 12,12.4 C15.8,12.4 18.6,9.6 18.6,4.8 M12,3.6 L12,21 M8.8,17.6 L15.2,17.6 M3.7,6.6 L5.4,4.2 L7.1,6.6 M10.3,6 L12,3.6 L13.7,6 M16.9,6.6 L18.6,4.2 L20.3,6.6' },
  pluto:   { s:'M7,4.8 A5,5 0 0,0 17,4.8 M12,9.8 L12,21 M8.6,17 L15.4,17 M12,2.1 A2.35,2.35 0 1,0 12,6.8 A2.35,2.35 0 1,0 12,2.1' },
  node:    { s:'M7.4,16.6 A6.2,6.6 0 1,1 16.6,16.6 M7.4,16.6 A2.1,2.1 0 1,0 7.4,20.8 A2.1,2.1 0 1,0 7.4,16.6 M16.6,16.6 A2.1,2.1 0 1,0 16.6,20.8 A2.1,2.1 0 1,0 16.6,16.6' },
  lilith:  { s:'M12,13.2 L12,21 M8.6,17.1 L15.4,17.1',
             f:'M13.6,3.6 A5.2,5.2 0 1,0 13.6,13 A4.1,4.1 0 1,1 13.6,3.6 Z' },
  chiron:  { s:'M12,3.2 L12,12.4 M16.8,3.6 L12,8.2 L16.8,12.4 M12,12.4 A4.1,4.1 0 1,0 12,20.6 A4.1,4.1 0 1,0 12,12.4' },
  fortune: { s:'M12,4 A8,8 0 1,0 12,20 A8,8 0 1,0 12,4 M6.4,6.4 L17.6,17.6 M17.6,6.4 L6.4,17.6' },
  vertex:  { s:'M3.6,5 L8.4,19 L13.2,5 M15.2,12.6 L21,19.4 M21,12.6 L15.2,19.4' },

  aries:       { s:'M12,21 L12,9.6 C12,5.4 10,3.1 7.6,3.1 C5.2,3.1 3.8,4.9 3.8,7.4 M12,9.6 C12,5.4 14,3.1 16.4,3.1 C18.8,3.1 20.2,4.9 20.2,7.4' },
  taurus:      { s:'M12,9.4 A5.8,5.8 0 1,0 12,21 A5.8,5.8 0 1,0 12,9.4 M5,3.2 A7,6.2 0 0,0 19,3.2' },
  gemini:      { s:'M8.4,5.6 L8.4,18.4 M15.6,5.6 L15.6,18.4 M4.2,3.2 C8.4,5.7 15.6,5.7 19.8,3.2 M4.2,20.8 C8.4,18.3 15.6,18.3 19.8,20.8' },
  cancer:      { s:'M3.6,9.4 C3.6,5.7 9.4,3.3 16.4,5 M20.4,14.6 C20.4,18.3 14.6,20.7 7.6,19 M7.3,6.9 A2.55,2.55 0 1,0 7.3,12 A2.55,2.55 0 1,0 7.3,6.9 M16.7,12 A2.55,2.55 0 1,0 16.7,17.1 A2.55,2.55 0 1,0 16.7,12' },
  leo:         { s:'M9.9,13.4 C9.2,8 11,3.9 14.2,3.9 C17,3.9 18.2,6.5 17.2,9.7 C16.2,12.8 14.8,15 14.8,17.4 C14.8,19.4 16.3,20.4 18.1,19.2 M9.9,13.4 A2.85,2.85 0 1,0 9.9,19.1 A2.85,2.85 0 1,0 9.9,13.4' },
  virgo:       { s:'M3.2,7 C4.4,5.6 6,6.2 6,8.5 L6,16.6 M6,8.5 C6,5.8 8.8,5.2 10.2,6.9 C10.7,7.5 10.9,8.2 10.9,9.1 L10.9,16.6 M10.9,9.1 C10.9,6.4 13.7,5.8 15.1,7.5 C15.6,8.1 15.8,8.8 15.8,9.7 L15.8,14.4 C15.8,18.2 13.8,20.6 10.6,21.6 M15.8,11.4 C18.2,12 19.7,13.6 19.1,16 C18.6,17.9 16.7,18.5 15.1,17.6' },
  libra:       { s:'M4,18.8 L20,18.8 M4,14.4 L8.6,14.4 M15.4,14.4 L20,14.4 M8.6,14.4 A3.4,4.2 0 0,1 15.4,14.4' },
  scorpio:     { s:'M3.2,7 C4.4,5.6 6,6.2 6,8.5 L6,16.2 M6,8.5 C6,5.8 8.8,5.2 10.2,6.9 C10.7,7.5 10.9,8.2 10.9,9.1 L10.9,16.2 M10.9,9.1 C10.9,6.4 13.7,5.8 15.1,7.5 C15.6,8.1 15.8,8.8 15.8,9.7 L15.8,15.2 C15.8,18.3 17.4,19.6 20.4,19.6 M20.4,19.6 L18.1,17.7 M20.4,19.6 L18.4,21.7' },
  sagittarius: { s:'M4.6,19.4 L19.4,4.6 M12.6,4.6 L19.4,4.6 L19.4,11.4 M7.5,11.3 L12.7,16.5' },
  capricorn:   { s:'M3.2,5.8 L6.8,13.4 L10.2,5.8 L10.2,14.6 C10.2,18.1 12.4,20.2 15.2,20.2 C18,20.2 19.5,18.3 19,16.1 C18.5,14.1 16.3,13.3 14.5,14.5 C13.1,15.5 12.7,17.4 13.7,18.8' },
  aquarius:    { s:'M3.6,8.8 L8,5.2 L12,8.8 L16,5.2 L20.4,8.8 M3.6,16.4 L8,12.8 L12,16.4 L16,12.8 L20.4,16.4' },
  pisces:      { s:'M7.2,3.4 C9.9,6.5 9.9,17.5 7.2,20.6 M16.8,3.4 C14.1,6.5 14.1,17.5 16.8,20.6 M9.8,12 L14.2,12' },

  conjunction: { s:'M14,12 A5,5 0 1,0 4,12 A5,5 0 1,0 14,12 M20,12 A5,5 0 1,0 10,12 A5,5 0 1,0 20,12' },
  sextile:     { s:'M12,4 L19,16 L5,16 Z M12,20 L5,8 L19,8 Z' },
  square:      { s:'M5,5 L19,5 L19,19 L5,19 Z' },
  trine:       { s:'M12,4 L20,18 L4,18 Z' },
  opposition:  { s:'M12,7 A5,5 0 1,0 12,17 A5,5 0 1,0 12,7 M1,12 L23,12' }
};

/* ============ MALE POMOĆNE ============ */

const D2R = Math.PI / 180, R2D = 180 / Math.PI;
function norm360(x) { x = x % 360; return x < 0 ? x + 360 : x; }
function pad2(n) { return (n < 10 ? '0' : '') + n; }

function degMinParts(lon) {
  const inSign = norm360(lon) % 30;
  let d = Math.floor(inSign);
  let m = Math.round((inSign - d) * 60);
  if (m === 60) { m = 0; d += 1; }
  return { d, m };
}
function fmtDegMin(lon) {
  const p = degMinParts(lon);
  return p.d + '°' + pad2(p.m) + "'";
}
function signIndex(lon) { return Math.floor(norm360(lon) / 30) % 12; }
function signName(lon)  { return SIGNS[signIndex(lon)]; }
function signKey(lon)   { return SIGN_KEYS[signIndex(lon)]; }

function escHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function glyphSvgHtml(key, size, color, cls) {
  const g = GLYPHS[key];
  if (!g) return '';
  let inner = '';
  if (g.s) inner += '<path d="' + g.s + '" fill="none" stroke="' + color + '" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>';
  if (g.f) inner += '<path d="' + g.f + '" fill="' + color + '" stroke="none"/>';
  return '<svg class="' + (cls || 'nt-glyph') + '" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" aria-hidden="true">' + inner + '</svg>';
}

/* SVG element-string glifa unutar kotača (s transformacijom) */
function glyphSvgEl(key, x, y, size, color, strokeW) {
  const g = GLYPHS[key];
  if (!g) return '';
  const sc = size / 24;
  let out = '<g transform="translate(' + (x - size / 2).toFixed(1) + ',' + (y - size / 2).toFixed(1) + ') scale(' + sc.toFixed(3) + ')">';
  if (g.s) out += '<path d="' + g.s + '" fill="none" stroke="' + color + '" stroke-width="' + (strokeW || 1.7) + '" stroke-linecap="round" stroke-linejoin="round"/>';
  if (g.f) out += '<path d="' + g.f + '" fill="' + color + '" stroke="none"/>';
  return out + '</g>';
}

/* ============ VREMENSKA ZONA (Intl, povijesna IANA baza) ============ */

function tzOffsetMinutes(epochMs, tz) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const parts = {};
  for (const p of dtf.formatToParts(epochMs)) parts[p.type] = p.value;
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day,
                         parts.hour === '24' ? 0 : +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUtc - epochMs) / 60000);
}

/* Lokalno vrijeme rođenja + IANA zona → UTC Date */
function localToUtc(y, mo, d, h, mi, tz) {
  const wall = Date.UTC(y, mo - 1, d, h, mi, 0);
  let guess = wall;
  for (let i = 0; i < 3; i++) {
    guess = wall - tzOffsetMinutes(guess, tz) * 60000;
  }
  return { date: new Date(guess), offsetMin: tzOffsetMinutes(guess, tz) };
}

/* ============ PALETE BOJA ============ */

const PALETTES = {
  dark: {
    ring: 'rgba(196,192,216,0.55)', ringSoft: 'rgba(168,144,208,0.3)',
    bandA: 'rgba(168,144,208,0.10)', bandB: 'rgba(168,144,208,0.03)',
    sign: '#a890d0', tick: 'rgba(196,192,216,0.4)',
    planet: '#e4e0f4', degText: '#9d97b8', houseNum: '#8a84a8',
    cusp: 'rgba(168,144,208,0.4)', axis: '#a890d0', axisText: '#c4c0d8',
    conj: '#9b95b5', harm: '#7fae90', tense: '#c08090', bg: 'none',
    fire: '#c98f9b', earth: '#8ab69b', air: '#b1a0d8', water: '#8fa7d4'
  },
  light: {
    ring: 'rgba(74,63,110,0.6)', ringSoft: 'rgba(106,78,160,0.35)',
    bandA: 'rgba(106,78,160,0.10)', bandB: 'rgba(106,78,160,0.03)',
    sign: '#6a4ea0', tick: 'rgba(74,63,110,0.45)',
    planet: '#2e2752', degText: '#6a5d8c', houseNum: '#8a7dac',
    cusp: 'rgba(106,78,160,0.45)', axis: '#6a4ea0', axisText: '#4a3f6e',
    conj: '#7a7494', harm: '#4f8a64', tense: '#b06478', bg: 'none',
    fire: '#b06478', earth: '#4f8a64', air: '#7a5ab0', water: '#4a6fa8'
  },
  poster: {
    ring: 'rgba(216,210,238,0.75)', ringSoft: 'rgba(168,144,208,0.45)',
    bandA: 'rgba(168,144,208,0.13)', bandB: 'rgba(168,144,208,0.04)',
    sign: '#b8a2dd', tick: 'rgba(206,200,228,0.5)',
    planet: '#efeaff', degText: '#a89fc8', houseNum: '#968ebb',
    cusp: 'rgba(178,156,215,0.5)', axis: '#b8a2dd', axisText: '#d4cdec',
    conj: '#a59ec2', harm: '#8fbe9f', tense: '#cf8fa0', bg: 'none',
    fire: '#cf8fa0', earth: '#8fbe9f', air: '#b8a2dd', water: '#8fa8d8'
  },
  ink: {
    ring: '#5a4d85', ringSoft: '#9a8fc0',
    bandA: 'rgba(106,78,160,0.09)', bandB: 'rgba(106,78,160,0.02)',
    sign: '#5a4090', tick: '#8a80ab',
    planet: '#2a2348', degText: '#6a5d8c', houseNum: '#8a7dac',
    cusp: '#a99fd0', axis: '#5a4090', axisText: '#4a3f6e',
    conj: '#7a7494', harm: '#3f7a54', tense: '#a05468', bg: 'none',
    fire: '#a05468', earth: '#3f7a54', air: '#6a4ea0', water: '#3f5e8e'
  }
};

function aspectColor(aspId, pal) {
  if (aspId === 'conjunction') return pal.conj;
  if (aspId === 'trine' || aspId === 'sextile') return pal.harm;
  return pal.tense;
}

/* Boja elementa znaka: vatra / zemlja / zrak / voda */
function elementColor(lon, pal) {
  return [pal.fire, pal.earth, pal.air, pal.water][signIndex(lon) % 4];
}

/* ============ LAZY LOAD SKRIPTI ============ */

const loadedScripts = {};
function loadScript(src) {
  if (loadedScripts[src]) return loadedScripts[src];
  loadedScripts[src] = new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.onload = resolve;
    el.onerror = () => reject(new Error('Ne mogu učitati ' + src));
    document.head.appendChild(el);
  });
  return loadedScripts[src];
}
