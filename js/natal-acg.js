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

let currentAcg = null; // { time, lines: [{ id, name, mc:[...], ic:[...], asc:[[...]], dsc:[[...]] }] }

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

/* Za dano RA/Dec planeta izračunaj sve 4 ACG linije.
   gastDeg = Greenwich apparent sidereal time u stupnjevima (gast*15). */
function computeAcgLines(raDeg, decDeg, gastDeg) {
  const lonMC = wrapLon180(raDeg - gastDeg);
  const lonIC = wrapLon180(lonMC + 180);

  // Raspon do ±85° (granica Web Mercator projekcije koju Leaflet prikazuje) uz sitan
  // korak — ASC/DSC krivulje tako stignu skoro do granice cirkumpolarnosti i vizualno
  // se spoje s MC/IC linijom (matematički: kod H0→0 obje formule konvergiraju u MC),
  // umjesto da budu naglo odsječene na fiksnoj širini.
  const asc = [], dsc = [];
  for (let lat = -85; lat <= 85; lat += 0.5) {
    const tanProd = Math.tan(lat * D2R) * Math.tan(decDeg * D2R);
    if (Math.abs(tanProd) >= 1) continue; // cirkumpolarno / nikad ne izlazi na toj širini
    const h0 = R2D * Math.acos(Math.max(-1, Math.min(1, -tanProd)));
    asc.push([lat, wrapLon180(raDeg - h0 - gastDeg)]);
    dsc.push([lat, wrapLon180(raDeg + h0 - gastDeg)]);
  }

  return { mc: lonMC, ic: lonIC, asc, dsc };
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
  if (!timeV)         return showNatalError('AstroCartography treba točno vrijeme rođenja (checkbox „ne znam vrijeme” ovdje ne vrijedi).');
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
      const eq = equOfDate(Astronomy.Body[def.body], time);
      const l = computeAcgLines(eq.ra, eq.dec, gastDeg);
      return {
        id: def.id, name: def.name,
        mc: l.mc, ic: l.ic,
        ascSegments: splitAntimeridian(l.asc),
        dscSegments: splitAntimeridian(l.dsc)
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
