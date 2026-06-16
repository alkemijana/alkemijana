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

/* ============ SINASTRIJA (cross-aspekti dviju karata) ============ */

/* Uži orbisi nego u natalnoj karti — sinastrijska konvencija (manje, ali jasnijih veza). */
const SYN_ORBS = { conjunction: 7, sextile: 4, square: 6, trine: 6, opposition: 7 };
/* Tranziti: vrlo tijesan orb (kao Astro-Seek) — samo stvarno aktivni tranziti, svi aspekti do 2,5°. */
const TRANSIT_ORB = 2.5;

function synAspectPoints(chart) {
  const pts = chart.planets
    .filter(p => p.id !== 'fortune' && p.id !== 'vertex' && p.id !== 'snode')
    .map(p => ({ id: p.id, lon: p.lon }));
  if (!chart.noTime) {
    pts.push({ id: 'asc', lon: chart.asc });
    pts.push({ id: 'mc',  lon: chart.mc });
  }
  return pts;
}

/* Aspekti točaka karte A naspram karte B (sinastrija ili tranziti).
   orbs: broj (jedinstveni max orb za sve aspekte, npr. tranziti = TRANSIT_ORB),
         objekt {aspId: orb}, ili undefined (zadano SYN_ORBS).
   Rezultat: [{ a: idA, b: idB, aspect, aspectName, angle, orb }] sortirano po orbu. */
function computeSynastryAspects(chartA, chartB, orbs) {
  const A = synAspectPoints(chartA), B = synAspectPoints(chartB);
  const out = [];
  for (const a of A) {
    for (const b of B) {
      const diff = Math.abs(norm360(a.lon - b.lon + 180) - 180);
      for (const asp of ASPECT_DEFS) {
        const orb = Math.abs(diff - asp.angle);
        let maxOrb;
        if (typeof orbs === 'number') maxOrb = orbs;
        else if (orbs && orbs[asp.id] != null) maxOrb = orbs[asp.id];
        else maxOrb = (SYN_ORBS[asp.id] != null ? SYN_ORBS[asp.id] : asp.orb);
        if (orb <= maxOrb) {
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
  // input: { utcDate, lat, lon, noTime, ... }
  // noTime: vrijeme rođenja nepoznato → pozicije za podne, bez kuća/ASC/MC
  const noTime = !!input.noTime;
  const time = Astronomy.MakeTime(input.utcDate);
  const T = time.tt / 36525;
  const jdUt = 2451545.0 + time.ut;

  const eps  = trueObliquity(time);
  const gast = Astronomy.SiderealTime(time);
  const ramc = norm360(gast * 15 + input.lon);
  let asc = null, mc = null, cusps = null;
  if (!noTime) {
    const am = computeAscMc(ramc, eps, input.lat);
    asc = am.asc; mc = am.mc;
    cusps = placidusCusps(ramc, eps, input.lat, asc, mc);
  }

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
      lon = input.nodeType === 'mean' ? meanLunarNode(T) : trueLunarNode(time);
      retro = true; // čvor se pretežno kreće retrogradno — standardna oznaka
    } else if (def.id === 'snode') {
      lon = norm360((input.nodeType === 'mean' ? meanLunarNode(T) : trueLunarNode(time)) + 180);
      retro = true;
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

  // Fortuna i Vertex ovise o ASC/kućama — bez vremena rođenja ih nema
  if (!noTime) {
    // Fortuna (Pars Fortunae): dnevna karta = ASC + Mjesec − Sunce, noćna obratno
    const sunP = planets.find(p => p.id === 'sun');
    const moonP = planets.find(p => p.id === 'moon');
    const dayChart = houseOf(sunP.lon, cusps) >= 7; // Sunce iznad horizonta
    const fortuneLon = norm360(dayChart ? asc + moonP.lon - sunP.lon : asc + sunP.lon - moonP.lon);
    planets.push({ id: 'fortune', name: 'Fortuna', lon: fortuneLon, retro: false });

    // Vertex: presjek prvog vertikala i ekliptike na zapadu
    // = ascendent za ko-širinu (90° − lat) uz RAMC + 180°
    const colat = input.lat >= 0 ? 90 - input.lat : -90 - input.lat;
    const vertexLon = computeAscMc(norm360(ramc + 180), eps, colat).asc;
    planets.push({ id: 'vertex', name: 'Vertex', lon: norm360(vertexLon), retro: false });
  }

  for (const p of planets) p.house = noTime ? null : houseOf(p.lon, cusps);

  // Izvedene točke ne ulaze u aspekte (Južni čvor bi samo zrcalio aspekte Sjevernog)
  const aspectPoints = planets
    .filter(p => p.id !== 'fortune' && p.id !== 'vertex' && p.id !== 'snode')
    .map(p => ({ id: p.id, lon: p.lon }));
  if (!noTime) {
    aspectPoints.push({ id: 'asc', lon: asc, isAngle: true }, { id: 'mc', lon: mc, isAngle: true });
  }
  const aspects = computeAspects(aspectPoints);

  return { input, planets, asc, mc, cusps, aspects, eps, ramc, jdUt, noTime };
}

/* ============ DOMINANTE (elementi, kvalitete, najaspektiraniji) ============ */

/* Ponderirano: svjetla (Sunce, Mjesec) i ASC najjače, osobni planeti srednje,
   društveni i vanjski slabije. Kao Astro-Seek: 10 planeta + ASC + MC. */
function computeDominants(chart) {
  const W = { sun:3, moon:3, mercury:2, venus:2, mars:2, jupiter:1.5, saturn:1.5, uranus:1, neptune:1, pluto:1 };
  const pts = chart.planets.filter(p => W[p.id]).map(p => ({ lon: p.lon, w: W[p.id] }));
  if (!chart.noTime) pts.push({ lon: chart.asc, w: 3 }, { lon: chart.mc, w: 2 });

  const elements = [0, 0, 0, 0];   // vatra, zemlja, zrak, voda
  const qualities = [0, 0, 0];     // kardinalno, fiksno, promjenjivo
  let total = 0;
  for (const pt of pts) {
    const si = signIndex(pt.lon);
    elements[si % 4] += pt.w;
    qualities[si % 3] += pt.w;
    total += pt.w;
  }

  // broj aspekata po točki (konjunkcije i sve ostalo zajedno)
  const counts = {};
  for (const a of chart.aspects) {
    counts[a.a] = (counts[a.a] || 0) + 1;
    counts[a.b] = (counts[a.b] || 0) + 1;
  }
  const nameOf = {};
  for (const p of chart.planets) nameOf[p.id] = p.name;
  nameOf.asc = 'ASC'; nameOf.mc = 'MC';
  const aspectCounts = Object.keys(counts)
    .map(id => ({ id, name: nameOf[id] || id, count: counts[id] }))
    .sort((x, y) => y.count - x.count);

  const pct = arr => arr.map(v => Math.round(v / total * 100));
  return {
    elements: pct(elements),    // [vatra, zemlja, zrak, voda] u %
    qualities: pct(qualities),  // [kardinalno, fiksno, promjenjivo] u %
    aspectCounts
  };
}

/* ============ OBLIK KARTE (Jonesovi uzorci) ============ */

/* Klasičnih 10 planeta; raspored po kružnici određuje uzorak. */
function detectShape(chart) {
  const ids = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];
  const pl = chart.planets.filter(p => ids.indexOf(p.id) >= 0);
  const lons = pl.map(p => p.lon).sort((a, b) => a - b);
  const n = lons.length;

  const gaps = [];
  for (let i = 0; i < n; i++) {
    gaps.push({ size: norm360(lons[(i + 1) % n] - lons[i]), after: lons[i] });
  }
  const sorted = gaps.slice().sort((a, b) => b.size - a.size);
  const g1 = sorted[0], g2 = sorted[1];
  const span = 360 - g1.size; // luk u kojem su svi planeti

  // Vedro: svi osim jednog u polukrugu, a taj jedan izoliran nasuprot (ručka)
  let bucket = null;
  for (const p of pl) {
    const rest = lons.filter(l => l !== p.lon);
    const rgaps = [];
    for (let i = 0; i < rest.length; i++) rgaps.push(norm360(rest[(i + 1) % rest.length] - rest[i]));
    const rspan = 360 - Math.max.apply(null, rgaps);
    if (rspan <= 190) {
      let minDist = 360;
      for (const l of rest) minDist = Math.min(minDist, Math.abs(norm360(p.lon - l + 180) - 180));
      if (minDist >= 60) { bucket = p; break; }
    }
  }

  if (span <= 135) {
    return { name: 'Snop (Bundle)', desc: 'Svi planeti su zbijeni unutar trećine kruga — vrlo usredotočena osobnost s uskim, dubokim fokusom interesa i talenata.' };
  }
  if (span <= 190) {
    return { name: 'Zdjela (Bowl)', desc: 'Svi planeti zauzimaju polovicu kruga — samostalna, samodostatna osoba; prazna polovica karte pokazuje područje života koje privlači i motivira.' };
  }
  if (bucket) {
    return { name: 'Vedro (Bucket)', desc: 'Planeti u polukrugu s jednim izdvojenim planetom nasuprot — "ručkom". Sva se energija usmjerava kroz taj planet.', handle: bucket.name };
  }
  if (span <= 250) {
    return { name: 'Lokomotiva (Locomotive)', desc: 'Planeti zauzimaju dvije trećine kruga — snažan pokretački duh; planet koji "vuče" ostale (prvi u smjeru kazaljke iza praznine) daje ton cijeloj karti.' };
  }
  if (g1.size >= 60 && g2.size >= 60) {
    return { name: 'Klackalica (Seesaw)', desc: 'Planeti u dvije nasuprotne skupine — život u dijalogu suprotnosti, stalno odvagivanje dviju strana, dar za sagledavanje obje perspektive.' };
  }
  if (g1.size < 65) {
    return { name: 'Raspršeni (Splash)', desc: 'Planeti ravnomjerno raspršeni po cijelom krugu — širok raspon interesa i sposobnosti, univerzalnost, ali i izazov raspršenosti.' };
  }
  return { name: 'Lepeza (Splay)', desc: 'Planeti u nekoliko nepravilno raspoređenih skupina — individualist koji ne pristaje na kalupe, s nekoliko jakih, neovisnih područja djelovanja.' };
}
