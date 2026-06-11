/* ============================================================
   Alkemijana — Natalna karta · ASTRONOMSKI IZRAČUN
   Ovisi o: natal-data.js (norm360, D2R, R2D, SIGN/ASPECT defs)
           astronomy-engine (lazy-load preko loadScript)
           natal-chiron.js (CHIRON_EPH efemerida)
   Izvozi: computeChart, placidusCusps, computeAscMc, chironLongitude
   ============================================================ */

'use strict';

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
