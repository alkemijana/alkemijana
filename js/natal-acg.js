/* ============================================================
   Alkemijana — ASTROCARTOGRAPHY (planetarne linije preko karte svijeta)
   Glue modul: submit, astronomski izračun linija (MC/IC/ASC/DSC po planetu).
   Ovisi o:
     natal.js          — selectedPlace, showNatalError, loadScript
     natal-data.js      — norm360, D2R, R2D, PLANET_DEFS, loadScript
     natal-synastry.js  — setNatalMode (mod 'acg' već dodan ondje)
     natal-acg-render.js — renderAcgResult (Leaflet karta + legenda)
   Učitava se nakon natal-transit.js.
   ============================================================ */

'use strict';

let currentAcg = null; // { name, place, lines: [{ id, name, mundo:{...}, zodio:{...} }], gastDeg, eps }

/* Tijela za koje crtamo linije — klasičnih 10, bez čvorova/Lilith/Kirona
   (nemaju smislenu fizičku RA/Dec putanju za ACG u ovom opsegu). */
const ACG_BODIES = PLANET_DEFS.filter(p => p.body);

/* Geocentrična ekvatorijalna pozicija "od datuma" (RA/Dec u stupnjevima) —
   isti obrazac kao eclLonOfDate() u natal-calc.js, samo bez rotacije u ekliptiku. */
function equOfDate(body, time) {
  const vec = Astronomy.GeoVector(body, time, true);
  const rot = Astronomy.Rotation_EQJ_EQD(time);
  const sph = Astronomy.SphereFromVector(Astronomy.RotateVector(rot, vec));
  return { ra: sph.lon, dec: sph.lat }; // oboje u stupnjevima
}

/* Zemljopisna dužina omeđena na −180..180 (za crtanje na karti). */
function wrapLon180(lon) {
  let x = norm360(lon);
  return x > 180 ? x - 360 : x;
}

/* Ekvatorijalne koordinate (RA/Dec, °) iz ekliptičke duljine uz latitudu 0 —
   za "Zodiaco" projekciju (planet projiciran na ekliptiku, kao u relokacijskoj karti). */
function raDecFromEcliptic(lonDeg, epsDeg) {
  const l = lonDeg * D2R, e = epsDeg * D2R;
  const ra = norm360(Math.atan2(Math.sin(l) * Math.cos(e), Math.cos(l)) * R2D);
  const dec = Math.asin(Math.sin(e) * Math.sin(l)) * R2D;
  return { ra, dec };
}

const ACG_LAT_LIMIT = 85; // granica Web Mercator projekcije koju Leaflet prikazuje

/* Za dano RA/Dec planeta izračunaj sve 4 ACG linije.
   gastDeg = Greenwich apparent sidereal time u stupnjevima (gast*15).
   ASC i DSC krivulje dijele krajnje točke (na granici cirkumpolarnosti H0→0 obje
   konvergiraju u MC liniju, H0→180 u IC liniju) pa se vizualno spoje kao na Astro-Seeku. */
function computeAcgLines(raDeg, decDeg, gastDeg) {
  const lonMC = wrapLon180(raDeg - gastDeg);
  const lonIC = wrapLon180(lonMC + 180);
  const tdec = Math.tan(decDeg * D2R);

  // Krajnje širine krivulja: tan(lat) = ∓1/tan(dec).
  //   H0 = 0   → ASC = DSC = MC linija (spoj na dnu/vrhu ovisno o predznaku)
  //   H0 = 180 → ASC = DSC = IC linija
  const ends = [];
  if (Math.abs(tdec) > 1e-9) {
    const latMC = R2D * Math.atan(-1 / tdec); // spoj na MC longitudi
    const latIC = R2D * Math.atan(1 / tdec);  // spoj na IC longitudi
    if (Math.abs(latMC) <= ACG_LAT_LIMIT) ends.push([latMC, lonMC]);
    if (Math.abs(latIC) <= ACG_LAT_LIMIT) ends.push([latIC, lonIC]);
  }

  const ascSamples = [], dscSamples = [];
  for (let lat = -ACG_LAT_LIMIT; lat <= ACG_LAT_LIMIT; lat += 0.5) {
    const tanProd = Math.tan(lat * D2R) * tdec;
    if (Math.abs(tanProd) >= 1) continue; // cirkumpolarno / nikad ne izlazi na toj širini
    const h0 = R2D * Math.acos(Math.max(-1, Math.min(1, -tanProd)));
    ascSamples.push([lat, wrapLon180(raDeg - h0 - gastDeg)]);
    dscSamples.push([lat, wrapLon180(raDeg + h0 - gastDeg)]);
  }

  // ubaci zajedničke krajnje točke pa poredaj po širini — tako ASC i DSC dijele krajeve
  const asc = [...ends, ...ascSamples].sort((a, b) => a[0] - b[0]);
  const dsc = [...ends, ...dscSamples].sort((a, b) => a[0] - b[0]);

  return { mc: lonMC, ic: lonIC, asc, dsc };
}

/* Spakiraj sirove linije u segmentirane (antimeridian) za crtanje. */
function packAcgLines(l) {
  return {
    mc: l.mc, ic: l.ic,
    ascSegments: splitAntimeridian(l.asc),
    dscSegments: splitAntimeridian(l.dsc)
  };
}

/* ---- LOCAL SPACE (azimut) ---- */

/* Točka na velikom krugu: kreni iz (lat1,lon1) u smjeru bearing° za kutnu udaljenost dist°. */
function greatCirclePoint(lat1, lon1, bearingDeg, distDeg) {
  const p1 = lat1 * D2R, l1 = lon1 * D2R, th = bearingDeg * D2R, dl = distDeg * D2R;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(dl) + Math.cos(p1) * Math.sin(dl) * Math.cos(th));
  const l2 = l1 + Math.atan2(Math.sin(th) * Math.sin(dl) * Math.cos(p1), Math.cos(dl) - Math.sin(p1) * Math.sin(p2));
  return [p2 * R2D, wrapLon180(l2 * R2D)];
}

/* Local Space linija planeta: veliki krug iz mjesta rođenja u smjeru azimuta planeta
   u trenutku rođenja. Azimut iz satnog kuta (H = LST − RA) standardnom formulom. */
function computeLocalSpaceSegments(lat0, lon0, raDeg, decDeg, gastDeg) {
  const lstDeg = norm360(gastDeg + lon0);
  const H = norm360(lstDeg - raDeg) * D2R;      // satni kut (zapad pozitivan)
  const phi = lat0 * D2R, dec = decDeg * D2R;
  const aSouth = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)) * R2D;
  const bearing = norm360(aSouth + 180);        // kompasni azimut od sjevera (S=0→N=180 pretvorba)

  // uzorkuj cijeli veliki krug pa prekini na antimeridianu i blizu polova (Mercator granica)
  const segments = [];
  let cur = [];
  for (let dd = 0; dd <= 360; dd += 1) {
    const p = greatCirclePoint(lat0, lon0, bearing, dd);
    if (Math.abs(p[0]) > ACG_LAT_LIMIT) { if (cur.length > 1) segments.push(cur); cur = []; continue; }
    if (cur.length) {
      const prevLon = cur[cur.length - 1][1];
      if (Math.abs(p[1] - prevLon) > 180) { if (cur.length > 1) segments.push(cur); cur = []; }
    }
    cur.push(p);
  }
  if (cur.length > 1) segments.push(cur);
  return { lsSegments: segments };
}

/* Razdvoji niz [lat,lon] točaka u segmente kad lon "preskoči" preko ±180°
   (antimeridian) — inače Leaflet povuče ravnu crtu preko cijele karte. */
function splitAntimeridian(points) {
  const segments = [];
  let cur = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (cur.length) {
      const prevLon = cur[cur.length - 1][1];
      if (Math.abs(p[1] - prevLon) > 180) { segments.push(cur); cur = []; }
    }
    cur.push(p);
  }
  if (cur.length) segments.push(cur);
  return segments;
}

async function acgSubmit(ev) {
  ev.preventDefault();
  const err = document.getElementById('natal-error');
  err.style.display = 'none';

  const name = document.getElementById('natal-name').value.trim();
  const dateV = document.getElementById('natal-date').value;
  const timeV = document.getElementById('natal-time').value;

  if (!dateV)         return showNatalError('Upiši datum rođenja.');
  if (!timeV)         return showNatalError('Astrokartografija treba točno vrijeme rođenja (checkbox „ne znam vrijeme” ovdje ne vrijedi).');
  if (!selectedPlace) return showNatalError('Upiši mjesto rođenja i odaberi ga s popisa.');

  const [y, mo, d] = dateV.split('-').map(Number);
  const [h, mi] = timeV.split(':').map(Number);
  if (y < 1900 || y > 2099) return showNatalError('Podržane su godine rođenja od 1900. do 2099.');

  const btn = document.getElementById('natal-submit');
  const origTxt = btn.textContent;
  btn.disabled = true; btn.textContent = 'Računam…';

  try {
    await loadScript('js/lib/astronomy.browser.min.js');

    const { date: utcDate } = localToUtc(y, mo, d, h, mi, selectedPlace.tz);
    const time = Astronomy.MakeTime(utcDate);
    const gastDeg = Astronomy.SiderealTime(time) * 15;
    const eps = trueObliquity(time); // za živi ASC/MC pod mišem (computeAscMc)

    const lines = ACG_BODIES.map(def => {
      const body = Astronomy.Body[def.body];
      const eqM = equOfDate(body, time);                       // Mundo: prava RA/Dec (s latitudom)
      const eclLon = eclLonOfDate(body, time);                 // ekliptička duljina planeta
      const eqZ = raDecFromEcliptic(eclLon, eps);              // Zodiaco: projekcija na ekliptiku (lat 0)
      return {
        id: def.id, name: def.name,
        mundo: packAcgLines(computeAcgLines(eqM.ra, eqM.dec, gastDeg)),
        zodio: packAcgLines(computeAcgLines(eqZ.ra, eqZ.dec, gastDeg)),
        local: computeLocalSpaceSegments(selectedPlace.lat, selectedPlace.lon, eqM.ra, eqM.dec, gastDeg)
      };
    });

    currentAcg = { name, place: selectedPlace, lines, dateV, timeV, gastDeg, eps };
    renderAcgResult(currentAcg);
    try { localStorage.setItem('aj_natal_form', JSON.stringify({ name, dateV, timeV, noTime: false, place: selectedPlace })); } catch (e) {}
    document.getElementById('acg-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) {
    showNatalError('Došlo je do greške pri izračunu: ' + e.message);
  } finally {
    btn.disabled = false; btn.textContent = origTxt;
  }
}
