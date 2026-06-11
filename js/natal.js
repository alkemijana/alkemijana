/* ============================================================
   Alkemijana — Natalna karta
   Izračun: astronomy-engine (lazy-load) + Chiron efemerida (JPL)
   Prikaz: SVG kotač s vlastitim glifovima (path-evi, bez fontova)
   Export: jsPDF + svg2pdf (lazy-load) — poster A4–A0 i radna A4
   ============================================================ */

(function () {
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
  pisces:      { s:'M7.2,3.4 C9.9,6.5 9.9,17.5 7.2,20.6 M16.8,3.4 C14.1,6.5 14.1,17.5 16.8,20.6 M9.8,12 L14.2,12' }
};

/* ============ MALE POMOĆNE ============ */

const D2R = Math.PI / 180, R2D = 180 / Math.PI;
function norm360(x) { x = x % 360; return x < 0 ? x + 360 : x; }
function pad2(n) { return (n < 10 ? '0' : '') + n; }

function fmtDegMin(lon) {
  const inSign = norm360(lon) % 30;
  let d = Math.floor(inSign);
  let m = Math.round((inSign - d) * 60);
  if (m === 60) { m = 0; d += 1; }
  return d + '°' + pad2(m) + "'";
}
function signIndex(lon) { return Math.floor(norm360(lon) / 30) % 12; }
function signName(lon)  { return SIGNS[signIndex(lon)]; }
function signKey(lon)   { return SIGN_KEYS[signIndex(lon)]; }

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

/* ============ CHIRON (interpolacija JPL efemeride) ============ */

let chironLons = null; // Float64Array kumulativnih (unwrapped) stupnjeva

function chironInit() {
  if (chironLons || typeof CHIRON_EPH === 'undefined') return;
  const d = CHIRON_EPH.d;
  const arr = new Float64Array(d.length + 1);
  let acc = CHIRON_EPH.base;
  arr[0] = acc / 1000;
  for (let i = 0; i < d.length; i++) { acc += d[i]; arr[i + 1] = acc / 1000; }
  chironLons = arr;
}

function chironLongitude(jdUt) {
  chironInit();
  if (!chironLons) return null;
  const f = (jdUt - CHIRON_EPH.jd0) / CHIRON_EPH.step;
  const i = Math.floor(f);
  if (i < 1 || i > chironLons.length - 3) return null;
  const t = f - i;
  const p0 = chironLons[i - 1], p1 = chironLons[i], p2 = chironLons[i + 1], p3 = chironLons[i + 2];
  // Catmull-Rom kubična interpolacija
  const v = 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
  return norm360(v);
}

/* ============ ASTRONOMSKI IZRAČUN ============ */

function eclLonOfDate(body, time) {
  const vec = Astronomy.GeoVector(body, time, true);
  const rot = Astronomy.Rotation_EQJ_ECT(time);
  const sph = Astronomy.SphereFromVector(Astronomy.RotateVector(rot, vec));
  return sph.lon;
}

function meanLunarNode(T) {
  return norm360(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T * T * T / 467441 - T * T * T * T / 60616000);
}
function meanLilith(T) {
  // srednji lunarni apogej = srednji perigej + 180°
  const per = 83.3532465 + 4069.0137287 * T - 0.0103200 * T * T - T * T * T / 80053 + T * T * T * T / 18999000;
  return norm360(per + 180);
}

/* Pravi (oskulirajući) Mjesečev čvor iz state vektora */
function trueLunarNode(time) {
  const st = Astronomy.GeoMoonState(time);
  const rot = Astronomy.Rotation_EQJ_ECT(time);
  const r = Astronomy.RotateVector(rot, new Astronomy.Vector(st.x, st.y, st.z, time));
  const v = Astronomy.RotateVector(rot, new Astronomy.Vector(st.vx, st.vy, st.vz, time));
  // h = r × v ; smjer uzlaznog čvora n = ẑ × h
  const hx = r.y * v.z - r.z * v.y;
  const hy = r.z * v.x - r.x * v.z;
  return norm360(Math.atan2(hx, -hy) * R2D);
}

function trueObliquity(time) {
  const rot = Astronomy.Rotation_EQD_ECT(time);
  const v = Astronomy.RotateVector(rot, new Astronomy.Vector(0, 0, 1, time));
  return Math.acos(Math.max(-1, Math.min(1, v.z))) * R2D;
}

/* Ekliptička longituda točke na ekliptici s danom rektascenzijom */
function eclFromRa(raDeg, epsDeg) {
  return norm360(Math.atan2(Math.sin(raDeg * D2R), Math.cos(raDeg * D2R) * Math.cos(epsDeg * D2R)) * R2D);
}

function computeAscMc(ramc, eps, latDeg) {
  const mc = eclFromRa(ramc, eps);
  const y = -Math.cos(ramc * D2R);
  const x = Math.sin(ramc * D2R) * Math.cos(eps * D2R) + Math.tan(latDeg * D2R) * Math.sin(eps * D2R);
  let asc = norm360(Math.atan2(y, x) * R2D);
  // ASC mora biti 0–180° iza MC-a u zodijačkom redoslijedu
  if (norm360(asc - mc) >= 180) asc = norm360(asc + 180);
  return { asc, mc };
}

/* Placidus kuće — iterativno (vrijedi za |lat| < ~66°) */
function placidusCusps(ramc, eps, latDeg, asc, mc) {
  const tanLat = Math.tan(latDeg * D2R);

  function iterate(offsetDeg, frac, nocturnal) {
    let ra = norm360(ramc + offsetDeg);
    for (let k = 0; k < 30; k++) {
      const lam = eclFromRa(ra, eps);
      const dec = Math.asin(Math.sin(eps * D2R) * Math.sin(lam * D2R));
      let cosArg = -tanLat * Math.tan(dec);
      cosArg = Math.max(-1, Math.min(1, cosArg));
      const sa = Math.acos(cosArg) * R2D;           // poludnevni luk
      const sn = 180 - sa;                           // polunoćni luk
      const target = nocturnal ? norm360(ramc + 180 - frac * sn)
                               : norm360(ramc + frac * sa);
      if (Math.abs(norm360(target - ra + 180) - 180) < 1e-7) { ra = target; break; }
      ra = target;
    }
    return eclFromRa(ra, eps);
  }

  const c11 = iterate(30,  1 / 3, false);
  const c12 = iterate(60,  2 / 3, false);
  const c2  = iterate(120, 2 / 3, true);
  const c3  = iterate(150, 1 / 3, true);

  const cusps = new Array(13);
  cusps[1] = asc;  cusps[2] = c2;  cusps[3] = c3;
  cusps[4] = norm360(mc + 180);  cusps[5] = norm360(c11 + 180);  cusps[6] = norm360(c12 + 180);
  cusps[7] = norm360(asc + 180); cusps[8] = norm360(c2 + 180);   cusps[9] = norm360(c3 + 180);
  cusps[10] = mc; cusps[11] = c11; cusps[12] = c12;
  return cusps;
}

function houseOf(lon, cusps) {
  for (let i = 1; i <= 12; i++) {
    const a = cusps[i], b = cusps[i === 12 ? 1 : i + 1];
    const span = norm360(b - a);
    if (norm360(lon - a) < span) return i;
  }
  return 12;
}

function computeAspects(points) {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const a = points[i], b = points[j];
      if (a.isAngle && b.isAngle) continue;
      const diff = Math.abs(norm360(a.lon - b.lon + 180) - 180);
      for (const asp of ASPECT_DEFS) {
        const orb = Math.abs(diff - asp.angle);
        if (orb <= asp.orb) {
          out.push({ a: a.id, b: b.id, aspect: asp.id, aspectName: asp.name, angle: asp.angle, orb });
          break;
        }
      }
    }
  }
  out.sort((x, y) => x.orb - y.orb);
  return out;
}

/* Glavni izračun karte */
function computeChart(input) {
  // input: { utcDate, lat, lon, ... }
  const time = Astronomy.MakeTime(input.utcDate);
  const T = time.tt / 36525;
  const jdUt = 2451545.0 + time.ut;

  const planets = [];
  for (const def of PLANET_DEFS) {
    let lon = null, retro = false;
    if (def.body) {
      lon = eclLonOfDate(Astronomy.Body[def.body], time);
      if (def.id !== 'sun' && def.id !== 'moon') {
        const dt = 0.04; // ± ~1 h
        const l1 = eclLonOfDate(Astronomy.Body[def.body], time.AddDays(-dt));
        const l2 = eclLonOfDate(Astronomy.Body[def.body], time.AddDays(dt));
        retro = (norm360(l2 - l1 + 180) - 180) < 0;
      }
    } else if (def.id === 'node') {
      lon = trueLunarNode(time);
      retro = true; // čvor se pretežno kreće retrogradno — standardna oznaka
    } else if (def.id === 'lilith') {
      lon = meanLilith(T);
    } else if (def.id === 'chiron') {
      lon = chironLongitude(jdUt);
      if (lon != null) {
        const l1 = chironLongitude(jdUt - 1), l2 = chironLongitude(jdUt + 1);
        if (l1 != null && l2 != null) retro = (norm360(l2 - l1 + 180) - 180) < 0;
      }
    }
    if (lon == null) continue;
    planets.push({ id: def.id, name: def.name, lon: norm360(lon), retro });
  }

  const eps  = trueObliquity(time);
  const gast = Astronomy.SiderealTime(time);
  const ramc = norm360(gast * 15 + input.lon);
  const { asc, mc } = computeAscMc(ramc, eps, input.lat);
  const cusps = placidusCusps(ramc, eps, input.lat, asc, mc);

  for (const p of planets) p.house = houseOf(p.lon, cusps);

  const aspectPoints = planets.map(p => ({ id: p.id, lon: p.lon }))
    .concat([{ id: 'asc', lon: asc, isAngle: true }, { id: 'mc', lon: mc, isAngle: true }]);
  const aspects = computeAspects(aspectPoints);

  return { input, planets, asc, mc, cusps, aspects, eps, ramc, jdUt };
}

/* ============ PALETE BOJA ============ */

const PALETTES = {
  dark: {
    ring: 'rgba(196,192,216,0.55)', ringSoft: 'rgba(168,144,208,0.3)',
    bandA: 'rgba(168,144,208,0.10)', bandB: 'rgba(168,144,208,0.03)',
    sign: '#a890d0', tick: 'rgba(196,192,216,0.4)',
    planet: '#e4e0f4', degText: '#9d97b8', houseNum: '#8a84a8',
    cusp: 'rgba(168,144,208,0.4)', axis: '#a890d0', axisText: '#c4c0d8',
    conj: '#9b95b5', harm: '#7fae90', tense: '#c08090', bg: 'none'
  },
  light: {
    ring: 'rgba(74,63,110,0.6)', ringSoft: 'rgba(106,78,160,0.35)',
    bandA: 'rgba(106,78,160,0.10)', bandB: 'rgba(106,78,160,0.03)',
    sign: '#6a4ea0', tick: 'rgba(74,63,110,0.45)',
    planet: '#2e2752', degText: '#6a5d8c', houseNum: '#8a7dac',
    cusp: 'rgba(106,78,160,0.45)', axis: '#6a4ea0', axisText: '#4a3f6e',
    conj: '#7a7494', harm: '#4f8a64', tense: '#b06478', bg: 'none'
  },
  poster: {
    ring: 'rgba(216,210,238,0.75)', ringSoft: 'rgba(168,144,208,0.45)',
    bandA: 'rgba(168,144,208,0.13)', bandB: 'rgba(168,144,208,0.04)',
    sign: '#b8a2dd', tick: 'rgba(206,200,228,0.5)',
    planet: '#efeaff', degText: '#a89fc8', houseNum: '#968ebb',
    cusp: 'rgba(178,156,215,0.5)', axis: '#b8a2dd', axisText: '#d4cdec',
    conj: '#a59ec2', harm: '#8fbe9f', tense: '#cf8fa0', bg: 'none'
  },
  ink: {
    ring: '#5a4d85', ringSoft: '#9a8fc0',
    bandA: 'rgba(106,78,160,0.09)', bandB: 'rgba(106,78,160,0.02)',
    sign: '#5a4090', tick: '#8a80ab',
    planet: '#2a2348', degText: '#6a5d8c', houseNum: '#8a7dac',
    cusp: '#a99fd0', axis: '#5a4090', axisText: '#4a3f6e',
    conj: '#7a7494', harm: '#3f7a54', tense: '#a05468', bg: 'none'
  }
};

function aspectColor(aspId, pal) {
  if (aspId === 'conjunction') return pal.conj;
  if (aspId === 'trine' || aspId === 'sextile') return pal.harm;
  return pal.tense;
}

/* ============ SVG KOTAČ ============ */

function buildChartSVG(chart, pal, opts) {
  opts = opts || {};
  const C = 500;
  const R_OUT = 458, R_ZOD = 396, R_TICK = 386, R_HOUT = 306, R_HIN = 286;
  const R_GLYPH = 348, R_DEG = 318, R_PTICK = R_ZOD, R_SIGN = 427;
  const asc = chart.asc;

  // kut na ekranu: ASC lijevo, longitude rastu suprotno od kazaljke
  function pt(lonDeg, r) {
    const a = (180 + (lonDeg - asc)) * D2R;
    return [C + r * Math.cos(a), C - r * Math.sin(a)];
  }
  function line(lon, r1, r2, color, w, dash) {
    const [x1, y1] = pt(lon, r1), [x2, y2] = pt(lon, r2);
    return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) +
      '" stroke="' + color + '" stroke-width="' + w + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>';
  }
  function circle(r, color, w, fill) {
    return '<circle cx="' + C + '" cy="' + C + '" r="' + r + '" fill="' + (fill || 'none') + '" stroke="' + color + '" stroke-width="' + w + '"/>';
  }
  function arcBand(lonFrom, lonTo, rIn, rOut, fill) {
    const [x1, y1] = pt(lonFrom, rOut), [x2, y2] = pt(lonTo, rOut);
    const [x3, y3] = pt(lonTo, rIn), [x4, y4] = pt(lonFrom, rIn);
    return '<path d="M' + x1.toFixed(1) + ',' + y1.toFixed(1) +
      ' A' + rOut + ',' + rOut + ' 0 0,0 ' + x2.toFixed(1) + ',' + y2.toFixed(1) +
      ' L' + x3.toFixed(1) + ',' + y3.toFixed(1) +
      ' A' + rIn + ',' + rIn + ' 0 0,1 ' + x4.toFixed(1) + ',' + y4.toFixed(1) + ' Z" fill="' + fill + '" stroke="none"/>';
  }

  let s = '';

  // zodijački pojas
  for (let k = 0; k < 12; k++) {
    s += arcBand(k * 30, k * 30 + 30, R_ZOD, R_OUT, (k % 2 === 0) ? pal.bandA : pal.bandB);
  }
  s += circle(R_OUT, pal.ring, 1.6) + circle(R_ZOD, pal.ring, 1.2);
  for (let k = 0; k < 12; k++) {
    s += line(k * 30, R_ZOD, R_OUT, pal.ringSoft, 1);
    const [gx, gy] = pt(k * 30 + 15, R_SIGN);
    s += glyphSvgEl(SIGN_KEYS[k], gx, gy, 34, pal.sign, 1.9);
  }

  // stupanjske crtice
  for (let d = 0; d < 360; d++) {
    const len = (d % 10 === 0) ? 10 : (d % 5 === 0) ? 7 : 4;
    s += line(d, R_ZOD, R_ZOD - len, pal.tick, d % 10 === 0 ? 1.1 : 0.6);
  }
  s += circle(R_TICK, pal.ringSoft, 0.8);

  // kuće — vrhovi
  for (let i = 1; i <= 12; i++) {
    if (i === 1 || i === 4 || i === 7 || i === 10) continue;
    s += line(chart.cusps[i], R_HIN, R_ZOD, pal.cusp, 1.1);
  }
  // osi (ASC/DSC/MC/IC) — naglašene, sa strelicom i oznakom
  const axes = [
    { lon: chart.asc, label: 'ASC' }, { lon: norm360(chart.asc + 180), label: 'DSC' },
    { lon: chart.mc, label: 'MC' },   { lon: norm360(chart.mc + 180), label: 'IC' }
  ];
  for (const ax of axes) {
    s += line(ax.lon, R_HIN, 474, pal.axis, 2.4);
    const [tx, ty] = pt(ax.lon, 488);
    s += '<text x="' + tx.toFixed(1) + '" y="' + ty.toFixed(1) + '" fill="' + pal.axisText +
      '" font-size="20" font-family="Quicksand, sans-serif" font-weight="600" text-anchor="middle" dominant-baseline="middle">' + ax.label + '</text>';
    // strelica
    const [hx, hy] = pt(ax.lon, 474);
    const aRad = (180 + (ax.lon - asc)) * D2R;
    const ux = Math.cos(aRad), uy = -Math.sin(aRad);
    const px = -uy, py = ux;
    s += '<path d="M' + (hx + ux * 9).toFixed(1) + ',' + (hy + uy * 9).toFixed(1) +
      ' L' + (hx + px * 5).toFixed(1) + ',' + (hy + py * 5).toFixed(1) +
      ' L' + (hx - px * 5).toFixed(1) + ',' + (hy - py * 5).toFixed(1) + ' Z" fill="' + pal.axis + '"/>';
  }

  // prsten brojeva kuća
  s += circle(R_HOUT, pal.ringSoft, 1) + circle(R_HIN, pal.ring, 1.2);
  for (let i = 1; i <= 12; i++) {
    const a = chart.cusps[i], b = chart.cusps[i === 12 ? 1 : i + 1];
    const mid = norm360(a + norm360(b - a) / 2);
    const [nx, ny] = pt(mid, (R_HOUT + R_HIN) / 2);
    s += '<text x="' + nx.toFixed(1) + '" y="' + ny.toFixed(1) + '" fill="' + pal.houseNum +
      '" font-size="17" font-family="Quicksand, sans-serif" text-anchor="middle" dominant-baseline="middle">' + i + '</text>';
  }

  // aspektne linije
  if (opts.showAspects !== false) {
    const lonOf = {};
    for (const p of chart.planets) lonOf[p.id] = p.lon;
    lonOf.asc = chart.asc; lonOf.mc = chart.mc;
    for (const a of chart.aspects) {
      if (a.aspect === 'conjunction') continue;
      const [x1, y1] = pt(lonOf[a.a], R_HIN - 4), [x2, y2] = pt(lonOf[a.b], R_HIN - 4);
      const op = Math.max(0.25, 1 - a.orb / 9).toFixed(2);
      s += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) +
        '" stroke="' + aspectColor(a.aspect, pal) + '" stroke-width="1.5" opacity="' + op + '"/>';
    }
  }

  // planeti — razmicanje preklapanja
  const sorted = chart.planets.slice().sort((p, q) => norm360(p.lon - asc) - norm360(q.lon - asc));
  const MIN_SEP = 10.5;
  const adj = sorted.map(p => norm360(p.lon - asc));
  for (let it = 0; it < 120; it++) {
    let moved = false;
    for (let i = 0; i < adj.length; i++) {
      const j = (i + 1) % adj.length;
      let gap = adj[j] - adj[i];
      if (j === 0) gap += 360;
      if (gap < MIN_SEP) {
        const push = (MIN_SEP - gap) / 2 + 0.05;
        adj[i] -= push; adj[j] += push;
        if (j === 0) adj[j] = adj[j] % 360;
        moved = true;
      }
    }
    if (!moved) break;
  }

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const dispLon = norm360(asc + adj[i]);
    // crtica na stvarnoj poziciji + spojnica do prikazane
    s += line(p.lon, R_PTICK, R_PTICK - 12, pal.planet, 1.6);
    const [cx1, cy1] = pt(p.lon, R_PTICK - 12), [cx2, cy2] = pt(dispLon, R_GLYPH + 22);
    s += '<line x1="' + cx1.toFixed(1) + '" y1="' + cy1.toFixed(1) + '" x2="' + cx2.toFixed(1) + '" y2="' + cy2.toFixed(1) +
      '" stroke="' + pal.tick + '" stroke-width="0.7"/>';
    const [gx, gy] = pt(dispLon, R_GLYPH);
    s += glyphSvgEl(p.id, gx, gy, 36, pal.planet, 1.8);
    const [dx, dy] = pt(dispLon, R_DEG);
    s += '<text x="' + dx.toFixed(1) + '" y="' + dy.toFixed(1) + '" fill="' + pal.degText +
      '" font-size="15.5" font-family="Quicksand, sans-serif" text-anchor="middle" dominant-baseline="middle">' +
      fmtDegMin(p.lon) + (p.retro ? ' <tspan font-size="12">R</tspan>' : '') + '</text>';
  }

  return '<svg viewBox="-30 -30 1060 1060" xmlns="http://www.w3.org/2000/svg" font-family="Quicksand, sans-serif">' +
    (pal.bg && pal.bg !== 'none' ? '<rect x="-30" y="-30" width="1060" height="1060" fill="' + pal.bg + '"/>' : '') +
    s + '</svg>';
}

/* ============ GEOCODING (Open-Meteo) ============ */

let geoTimer = null;
let selectedPlace = null;

function initPlaceAutocomplete() {
  const inp = document.getElementById('natal-place');
  const dd  = document.getElementById('natal-place-dd');
  if (!inp) return;

  inp.addEventListener('input', () => {
    selectedPlace = null;
    document.getElementById('natal-place-ok').style.display = 'none';
    clearTimeout(geoTimer);
    const q = inp.value.trim();
    if (q.length < 2) { dd.style.display = 'none'; return; }
    geoTimer = setTimeout(async () => {
      try {
        const r = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=' +
          encodeURIComponent(q) + '&count=6&language=hr&format=json');
        const j = await r.json();
        const res = (j.results || []);
        if (!res.length) { dd.innerHTML = '<div class="nt-dd-empty">Mjesto nije pronađeno…</div>'; dd.style.display = 'block'; return; }
        dd.innerHTML = res.map((p, i) => {
          const parts = [p.name, p.admin1, p.country].filter(Boolean);
          return '<div class="nt-dd-item" data-i="' + i + '">' + escHtml(parts.join(', ')) + '</div>';
        }).join('');
        dd.style.display = 'block';
        dd.querySelectorAll('.nt-dd-item').forEach(el => {
          el.addEventListener('mousedown', (ev) => {
            ev.preventDefault();
            const p = res[+el.dataset.i];
            selectedPlace = {
              label: [p.name, p.admin1, p.country].filter(Boolean).join(', '),
              shortLabel: [p.name, p.country].filter(Boolean).join(', '),
              lat: p.latitude, lon: p.longitude, tz: p.timezone
            };
            inp.value = selectedPlace.label;
            dd.style.display = 'none';
            document.getElementById('natal-place-ok').style.display = 'inline';
          });
        });
      } catch (e) {
        dd.innerHTML = '<div class="nt-dd-empty">Greška pri pretrazi — provjeri internet vezu.</div>';
        dd.style.display = 'block';
      }
    }, 350);
  });
  inp.addEventListener('blur', () => setTimeout(() => { dd.style.display = 'none'; }, 200));
}

function escHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

/* ============ FORMA I PRIKAZ ============ */

let currentChart = null;

function currentScreenPalette() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? PALETTES.light : PALETTES.dark;
}

async function natalSubmit(ev) {
  ev.preventDefault();
  const err = document.getElementById('natal-error');
  err.style.display = 'none';

  const name = document.getElementById('natal-name').value.trim();
  const dateV = document.getElementById('natal-date').value;
  const timeV = document.getElementById('natal-time').value;

  if (!dateV || !timeV) { return showNatalError('Upiši datum i vrijeme rođenja.'); }
  if (!selectedPlace)   { return showNatalError('Upiši mjesto rođenja i odaberi ga s popisa.'); }

  const [y, mo, d] = dateV.split('-').map(Number);
  const [h, mi] = timeV.split(':').map(Number);
  if (y < 1900 || y > 2099) return showNatalError('Podržane su godine rođenja od 1900. do 2099.');
  if (Math.abs(selectedPlace.lat) > 66) return showNatalError('Placidus sustav kuća nije definiran za polarne širine (>66°).');

  const btn = document.getElementById('natal-submit');
  const origTxt = btn.textContent;
  btn.disabled = true; btn.textContent = 'Računam…';

  try {
    await loadScript('js/lib/astronomy.browser.min.js');

    const { date: utcDate, offsetMin } = localToUtc(y, mo, d, h, mi, selectedPlace.tz);
    const chart = computeChart({
      utcDate, lat: selectedPlace.lat, lon: selectedPlace.lon,
      name, y, mo, d, h, mi, offsetMin,
      place: selectedPlace
    });
    currentChart = chart;
    renderNatalResult(chart);
    try { localStorage.setItem('aj_natal_form', JSON.stringify({ name, dateV, timeV, place: selectedPlace })); } catch (e) {}
    document.getElementById('natal-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    showNatalError('Došlo je do greške pri izračunu: ' + e.message);
  } finally {
    btn.disabled = false; btn.textContent = origTxt;
  }
}

function showNatalError(msg) {
  const err = document.getElementById('natal-error');
  err.textContent = msg;
  err.style.display = 'block';
}

function birthDataLine(chart) {
  const i = chart.input;
  const off = i.offsetMin;
  const offStr = 'UTC' + (off >= 0 ? '+' : '−') + Math.floor(Math.abs(off) / 60) + (Math.abs(off) % 60 ? ':' + pad2(Math.abs(off) % 60) : '');
  return i.d + '. ' + i.mo + '. ' + i.y + '. u ' + i.h + ':' + pad2(i.mi) + ' (' + offStr + ') · ' + i.place.label;
}

function renderNatalResult(chart) {
  const wrap = document.getElementById('natal-result');
  wrap.style.display = 'block';

  const title = chart.input.name ? escHtml(chart.input.name) : 'Natalna karta';
  document.getElementById('natal-chart-title').textContent = title;
  document.getElementById('natal-chart-sub').textContent = birthDataLine(chart);

  document.getElementById('natal-wheel').innerHTML =
    buildChartSVG(chart, currentScreenPalette(), { showAspects: true });

  // Tablica planeta
  const pal = currentScreenPalette();
  let rows = '';
  for (const p of chart.planets) {
    rows += '<tr><td>' + glyphSvgHtml(p.id, 19, pal.sign) + ' ' + p.name + '</td>' +
      '<td>' + glyphSvgHtml(signKey(p.lon), 17, pal.sign) + ' ' + signName(p.lon) + '</td>' +
      '<td class="nt-num">' + fmtDegMin(p.lon) + (p.retro ? ' <span class="nt-retro">R</span>' : '') + '</td>' +
      '<td class="nt-num">' + p.house + '. kuća</td></tr>';
  }
  rows += '<tr class="nt-angle-row"><td>ASC (podznak)</td><td>' + glyphSvgHtml(signKey(chart.asc), 17, pal.sign) + ' ' + signName(chart.asc) + '</td><td class="nt-num">' + fmtDegMin(chart.asc) + '</td><td></td></tr>';
  rows += '<tr class="nt-angle-row"><td>MC (sredina neba)</td><td>' + glyphSvgHtml(signKey(chart.mc), 17, pal.sign) + ' ' + signName(chart.mc) + '</td><td class="nt-num">' + fmtDegMin(chart.mc) + '</td><td></td></tr>';
  document.getElementById('natal-planets-tbody').innerHTML = rows;

  // Tablica kuća
  let hrows = '';
  for (let i = 1; i <= 12; i++) {
    hrows += '<tr><td class="nt-num">' + i + '.</td><td>' +
      glyphSvgHtml(signKey(chart.cusps[i]), 17, pal.sign) + ' ' + signName(chart.cusps[i]) +
      '</td><td class="nt-num">' + fmtDegMin(chart.cusps[i]) + '</td></tr>';
  }
  document.getElementById('natal-houses-tbody').innerHTML = hrows;

  // Aspekti
  const nameOf = {};
  for (const p of chart.planets) nameOf[p.id] = p.name;
  nameOf.asc = 'ASC'; nameOf.mc = 'MC';
  let arows = '';
  for (const a of chart.aspects) {
    arows += '<tr><td>' + (GLYPHS[a.a] ? glyphSvgHtml(a.a, 17, pal.sign) + ' ' : '') + nameOf[a.a] + '</td>' +
      '<td class="nt-asp nt-asp-' + a.aspect + '">' + a.aspectName + '</td>' +
      '<td>' + (GLYPHS[a.b] ? glyphSvgHtml(a.b, 17, pal.sign) + ' ' : '') + nameOf[a.b] + '</td>' +
      '<td class="nt-num">' + a.orb.toFixed(1) + '°</td></tr>';
  }
  document.getElementById('natal-aspects-tbody').innerHTML = arows;
}

/* Ponovno iscrtaj kotač kad se promijeni tema */
new MutationObserver(() => {
  if (currentChart && document.getElementById('natal-result').style.display !== 'none') {
    renderNatalResult(currentChart);
  }
}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

/* ============ PDF EXPORT ============ */

const FONT_FILES = [
  { file: 'assets/fonts/Tangerine-Bold.ttf',        name: 'Tangerine',        style: 'bold' },
  { file: 'assets/fonts/PlayfairDisplay-Regular.ttf', name: 'PlayfairDisplay', style: 'normal' },
  { file: 'assets/fonts/Quicksand-Medium.ttf',      name: 'Quicksand',        style: 'normal' }
];
let fontsB64 = null;

async function ensurePdfLibs() {
  await loadScript('js/lib/jspdf.umd.min.js');
  await loadScript('js/lib/svg2pdf.umd.min.js');
  if (!fontsB64) {
    fontsB64 = {};
    for (const f of FONT_FILES) {
      const buf = await (await fetch(f.file)).arrayBuffer();
      let bin = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i += 8192) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
      }
      fontsB64[f.name] = btoa(bin);
    }
  }
}

function registerFonts(doc) {
  for (const f of FONT_FILES) {
    const vfsName = f.name + '.ttf';
    doc.addFileToVFS(vfsName, fontsB64[f.name]);
    doc.addFont(vfsName, f.name, f.style);
  }
}

/* SVG string → element (za svg2pdf) */
function svgToElement(svgStr) {
  const div = document.createElement('div');
  div.innerHTML = svgStr;
  return div.firstElementChild;
}

const PAGE_MM = { A4: [210, 297], A3: [297, 420], A2: [420, 594], A1: [594, 841], A0: [841, 1189] };

/* Zvjezdano nebo za poster (deterministički pseudo-random).
   avoid = {x, y, r} — krug kotača u kojem ne crtamo veće ✦ iskre. */
function posterStars(w, h, seed, avoid) {
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  let out = '';
  const n = Math.round(w * h / 350);
  for (let i = 0; i < n; i++) {
    const x = (rnd() * w).toFixed(1), y = (rnd() * h).toFixed(1);
    const r = (0.2 + rnd() * 0.7).toFixed(2);
    const op = (0.25 + rnd() * 0.6).toFixed(2);
    out += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#cfc8e8" opacity="' + op + '"/>';
  }
  // nekoliko ✦ iskri — izvan kotača da ne smetaju karti
  let placed = 0, guard = 0;
  const want = Math.round(n / 40);
  while (placed < want && guard++ < want * 30) {
    const x = +(rnd() * w).toFixed(1), y = +(rnd() * h).toFixed(1);
    const sc = 1.2 + rnd() * 2.2;
    const op = (0.4 + rnd() * 0.4).toFixed(2);
    if (avoid && Math.hypot(x - avoid.x, y - avoid.y) < avoid.r + sc * 3.5) continue;
    out += '<path transform="translate(' + x + ',' + y + ') scale(' + sc.toFixed(2) + ')" d="M0,-3 C0.4,-1 1,-0.4 3,0 C1,0.4 0.4,1 0,3 C-0.4,1 -1,0.4 -3,0 C-1,-0.4 -0.4,-1 0,-3 Z" fill="#d8d2ee" opacity="' + op + '"/>';
    placed++;
  }
  return out;
}

/* Poster SVG — dizajn u mm jedinicama (1 user unit = 1 mm na A-formatu) */
function buildPosterSVG(chart, w, h) {
  const pal = PALETTES.poster;
  const cx = w / 2;
  const chartSize = w * 0.86;
  const chartX = (w - chartSize) / 2;
  const chartY = h * 0.205;

  const name = chart.input.name || 'Natalna karta';
  const dataLine = birthDataLine(chart);
  const sun = chart.planets.find(p => p.id === 'sun');
  const moon = chart.planets.find(p => p.id === 'moon');
  const trio = 'Sunce ' + signName(sun.lon) + '  ·  Mjesec ' + signName(moon.lon) + '  ·  Podznak ' + signName(chart.asc);

  const inner = buildChartSVG(chart, pal, { showAspects: true })
    .replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');

  let s = '<svg viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg">';
  // pozadina — duboko ljubičasti gradijent
  s += '<defs><radialGradient id="pgrad" cx="50%" cy="32%" r="85%">' +
       '<stop offset="0%" stop-color="#1a1538"/><stop offset="55%" stop-color="#0e0c24"/><stop offset="100%" stop-color="#06080f"/>' +
       '</radialGradient></defs>';
  s += '<rect width="' + w + '" height="' + h + '" fill="url(#pgrad)"/>';
  s += posterStars(w, h, 977, { x: cx, y: chartY + chartSize / 2, r: chartSize / 2 });

  // tanki ukrasni okvir
  const m = w * 0.045;
  s += '<rect x="' + m + '" y="' + m + '" width="' + (w - 2 * m) + '" height="' + (h - 2 * m) +
       '" fill="none" stroke="rgba(168,144,208,0.4)" stroke-width="' + (w * 0.0012) + '"/>';
  s += '<rect x="' + (m + w * 0.008) + '" y="' + (m + w * 0.008) + '" width="' + (w - 2 * m - w * 0.016) + '" height="' + (h - 2 * m - w * 0.016) +
       '" fill="none" stroke="rgba(168,144,208,0.18)" stroke-width="' + (w * 0.0007) + '"/>';

  // naslov
  const f1 = w * 0.105; // Tangerine ime
  s += '<text x="' + cx + '" y="' + (h * 0.105) + '" fill="#e4e0f4" font-family="Tangerine" font-weight="bold" font-size="' + f1 +
       '" text-anchor="middle">' + escHtml(name) + '</text>';
  // linija s zvjezdicom
  const ly = h * 0.125, lw = w * 0.3;
  s += '<line x1="' + (cx - lw) + '" y1="' + ly + '" x2="' + (cx - w * 0.022) + '" y2="' + ly + '" stroke="rgba(168,144,208,0.55)" stroke-width="' + (w * 0.0011) + '"/>';
  s += '<line x1="' + (cx + w * 0.022) + '" y1="' + ly + '" x2="' + (cx + lw) + '" y2="' + ly + '" stroke="rgba(168,144,208,0.55)" stroke-width="' + (w * 0.0011) + '"/>';
  s += '<path transform="translate(' + cx + ',' + ly + ') scale(' + (w * 0.0042) + ')" d="M0,-3 C0.4,-1 1,-0.4 3,0 C1,0.4 0.4,1 0,3 C-0.4,1 -1,0.4 -3,0 C-1,-0.4 -0.4,-1 0,-3 Z" fill="#b8a2dd"/>';
  // podaci rođenja
  s += '<text x="' + cx + '" y="' + (h * 0.152) + '" fill="#c4c0d8" font-family="PlayfairDisplay" font-size="' + (w * 0.0235) +
       '" text-anchor="middle">' + escHtml(dataLine) + '</text>';
  s += '<text x="' + cx + '" y="' + (h * 0.175) + '" fill="#9d95c0" font-family="Quicksand" font-size="' + (w * 0.0185) +
       '" text-anchor="middle">' + escHtml(trio) + '</text>';

  // kotač (unutarnje koordinate -30..1030 → 1060 jedinica)
  s += '<g transform="translate(' + chartX + ',' + chartY + ') scale(' + (chartSize / 1060) + ') translate(30,30)">' + inner + '</g>';

  // podnožje
  s += '<text x="' + cx + '" y="' + (h * 0.925) + '" fill="#d8d2ee" font-family="Tangerine" font-weight="bold" font-size="' + (w * 0.052) +
       '" text-anchor="middle">Alkemijana</text>';
  s += '<text x="' + cx + '" y="' + (h * 0.945) + '" fill="#8a82ac" font-family="Quicksand" font-size="' + (w * 0.016) +
       '" text-anchor="middle">alkemijana.com · Placidus · tropski zodijak</text>';
  s += '</svg>';
  return s;
}

async function downloadPoster() {
  const size = document.getElementById('natal-poster-size').value || 'A2';
  const btn = document.getElementById('natal-poster-btn');
  await withBtnSpinner(btn, async () => {
    await ensurePdfLibs();
    const [w, h] = PAGE_MM[size];
    const doc = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: size.toLowerCase() });
    registerFonts(doc);
    const el = svgToElement(buildPosterSVG(currentChart, w, h));
    document.body.appendChild(el); el.style.position = 'absolute'; el.style.left = '-99999px';
    try {
      await doc.svg(el, { x: 0, y: 0, width: w, height: h });
    } finally { el.remove(); }
    doc.save(pdfFileName('poster-' + size));
  });
}

/* Radna A4 verzija — karta + tablice za iščitavanje */
async function downloadWorking() {
  const btn = document.getElementById('natal-working-btn');
  await withBtnSpinner(btn, async () => {
    await ensurePdfLibs();
    const chart = currentChart;
    const doc = new window.jspdf.jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    registerFonts(doc);
    const W = 210, H = 297;

    // — Stranica 1: zaglavlje + kotač —
    doc.setFont('PlayfairDisplay', 'normal'); doc.setFontSize(20); doc.setTextColor(42, 35, 72);
    doc.text(chart.input.name || 'Natalna karta', W / 2, 18, { align: 'center' });
    doc.setFont('Quicksand', 'normal'); doc.setFontSize(10.5); doc.setTextColor(90, 80, 130);
    doc.text(birthDataLine(chart), W / 2, 25.5, { align: 'center' });
    doc.setDrawColor(154, 143, 192); doc.setLineWidth(0.25);
    doc.line(25, 29.5, W - 25, 29.5);

    const chartSize = 175;
    const el = svgToElement(buildChartSVG(chart, PALETTES.ink, { showAspects: true }));
    document.body.appendChild(el); el.style.position = 'absolute'; el.style.left = '-99999px';
    try {
      await doc.svg(el, { x: (W - chartSize) / 2, y: 33, width: chartSize, height: chartSize });
    } finally { el.remove(); }

    // legenda aspekata ispod karte
    let ly = 33 + chartSize + 8;
    doc.setFontSize(8.5);
    const leg = [
      ['Konjunkcija 0°', [122, 116, 148]], ['Sekstil 60°', [63, 122, 84]], ['Kvadrat 90°', [160, 84, 104]],
      ['Trigon 120°', [63, 122, 84]], ['Opozicija 180°', [160, 84, 104]]
    ];
    let lx = 22;
    for (const [t, c] of leg) {
      doc.setDrawColor(c[0], c[1], c[2]); doc.setLineWidth(0.8);
      doc.line(lx, ly - 1.2, lx + 5, ly - 1.2);
      doc.setTextColor(74, 63, 110);
      doc.text(t, lx + 6.5, ly);
      lx += doc.getTextWidth(t) + 13.5;
    }
    doc.setFontSize(8); doc.setTextColor(138, 130, 172);
    doc.text('Alkemijana · alkemijana.com · Placidus · tropski zodijak', W / 2, H - 10, { align: 'center' });

    // — Stranica 2: tablice —
    doc.addPage();
    doc.setFont('PlayfairDisplay', 'normal'); doc.setFontSize(14); doc.setTextColor(42, 35, 72);
    doc.text('Pozicije planeta', 20, 20);

    doc.setFont('Quicksand', 'normal'); doc.setFontSize(9.5);
    let y = 28;
    const nameOf = {};
    for (const p of chart.planets) nameOf[p.id] = p.name;
    nameOf.asc = 'ASC'; nameOf.mc = 'MC';

    for (const p of chart.planets) {
      doc.setTextColor(46, 39, 82);
      doc.text(p.name, 20, y);
      doc.text(signName(p.lon), 62, y);
      doc.text(fmtDegMin(p.lon) + (p.retro ? '  R' : ''), 95, y);
      doc.text(p.house + '. kuća', 125, y);
      y += 6.2;
    }
    doc.setTextColor(90, 64, 144);
    doc.text('ASC (podznak)', 20, y); doc.text(signName(chart.asc), 62, y); doc.text(fmtDegMin(chart.asc), 95, y); y += 6.2;
    doc.text('MC (sredina neba)', 20, y); doc.text(signName(chart.mc), 62, y); doc.text(fmtDegMin(chart.mc), 95, y);

    doc.setFont('PlayfairDisplay', 'normal'); doc.setFontSize(14); doc.setTextColor(42, 35, 72);
    doc.text('Kuće (Placidus)', 20, y + 14);
    doc.setFont('Quicksand', 'normal'); doc.setFontSize(9.5);
    let hy = y + 22;
    for (let i = 1; i <= 12; i++) {
      const col = i <= 6 ? 0 : 1;
      const yy = hy + ((i - 1) % 6) * 6.2;
      doc.setTextColor(46, 39, 82);
      doc.text(i + '.', 20 + col * 90, yy);
      doc.text(signName(chart.cusps[i]), 30 + col * 90, yy);
      doc.text(fmtDegMin(chart.cusps[i]), 62 + col * 90, yy);
    }

    let ay = hy + 6 * 6.2 + 14;
    doc.setFont('PlayfairDisplay', 'normal'); doc.setFontSize(14); doc.setTextColor(42, 35, 72);
    doc.text('Aspekti', 20, ay);
    doc.setFont('Quicksand', 'normal'); doc.setFontSize(9);
    ay += 8;
    const half = Math.ceil(chart.aspects.length / 2);
    for (let i = 0; i < chart.aspects.length; i++) {
      const a = chart.aspects[i];
      const col = i < half ? 0 : 1;
      const yy = ay + (i % half) * 5.6;
      if (yy > H - 15) continue;
      doc.setTextColor(46, 39, 82);
      doc.text(nameOf[a.a] + ' – ' + nameOf[a.b], 20 + col * 95, yy);
      doc.setTextColor(110, 100, 150);
      doc.text(a.aspectName + ' (' + a.orb.toFixed(1) + '°)', 60 + col * 95, yy);
    }
    doc.setFontSize(8); doc.setTextColor(138, 130, 172);
    doc.text('Alkemijana · alkemijana.com', W / 2, H - 10, { align: 'center' });

    doc.save(pdfFileName('radna-A4'));
  });
}

function pdfFileName(suffix) {
  const base = (currentChart.input.name || 'natalna-karta')
    .toLowerCase().replace(/[čć]/g, 'c').replace(/š/g, 's').replace(/ž/g, 'z').replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'natalna-karta';
  return base + '-' + suffix + '.pdf';
}

async function withBtnSpinner(btn, fn) {
  if (!currentChart) return;
  const orig = btn.textContent;
  btn.disabled = true; btn.textContent = 'Pripremam PDF…';
  try { await fn(); }
  catch (e) { showNatalError('Greška pri izradi PDF-a: ' + e.message); }
  finally { btn.disabled = false; btn.textContent = orig; }
}

/* ============ INIT ============ */

window.addEventListener('load', () => {
  const form = document.getElementById('natal-form');
  if (!form) return;
  form.addEventListener('submit', natalSubmit);
  initPlaceAutocomplete();
  document.getElementById('natal-poster-btn').addEventListener('click', downloadPoster);
  document.getElementById('natal-working-btn').addEventListener('click', downloadWorking);

  // vrati zadnji unos
  try {
    const saved = JSON.parse(localStorage.getItem('aj_natal_form') || 'null');
    if (saved) {
      document.getElementById('natal-name').value = saved.name || '';
      document.getElementById('natal-date').value = saved.dateV || '';
      document.getElementById('natal-time').value = saved.timeV || '';
      if (saved.place) {
        selectedPlace = saved.place;
        document.getElementById('natal-place').value = saved.place.label;
        document.getElementById('natal-place-ok').style.display = 'inline';
      }
    }
  } catch (e) {}

  if (window.location.hash === '#natal') showPage('natal');
});

/* javno za testiranje */
window.NATAL = { computeChart, localToUtc, chironLongitude, buildChartSVG, buildPosterSVG, placidusCusps, computeAscMc, PALETTES };

})();
