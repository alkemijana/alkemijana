/* ============================================================
   Alkemijana - crtanje Mjeseca (zajednički modul, window.AJMoon)
   ------------------------------------------------------------
   Jedan Mjesec za cijelu stranicu: Halloween (js/halloween.js),
   mali Mjesec u traci (js/nav-moon.js) i alat „Mjesec" na Astro
   alatima (js/moon-tool.js). Kod je izvučen iz halloween.js bez
   promjene izgleda - Halloween ga zove sa zadanim opcijama.

     AJMoon.loadMap()             → Promise; NASA karta površine (jednom)
     AJMoon.hasMap()              → je li karta učitana
     AJMoon.geometry(date, lat, lon) → { k, limbDeg, faceDeg } (treba astronomy-engine)
     AJMoon.phaseName(date)       → 'Mlađak' | 'Rastući srp' | … (treba astronomy-engine)
     AJMoon.render(D, g, opts)    → Promise<canvas>
        opts.glow  (true)  sjaj oko osvijetljenog dijela; platno je tada D + 2·25 %
        opts.earth (0.025) Zemljin odsjaj na tamnom dijelu (svjetlina)
        opts.dark  (1)     prozirnost tamnog dijela (0 = nevidljiv, 1 = pun)
        opts.hi    (false) velika karta 2k/4k (treba AJMoon.loadMapHi(promjerDiskaPx)) - alat i slide
        opts.relief (false) reljef i bačene sjene kratera (treba AJMoon.loadHeight()) - alat i slide

   Učitava se SINKRONO u <head> PRIJE halloween.js (samo definira funkcije).
   ============================================================ */
(function () {
  'use strict';

  /* Mjesec se crta JEDNOM u canvas (obična slika) - NE kao SVG s filterima.
     Safari na iPhoneu je SVG filtere (feTurbulence tekstura, zamućenje mora,
     drop-shadow sjaj, maska) računao u svakom kadru: uvod je zapinjao, a sjaj
     krvavog sloja znao je ostati kao crveni obrub. Canvas = isti izgled
     (tekstura, mora na stvarnim mjestima, sjaj, faza i nagib), ali se poslije
     animira samo prozirnost gotove slike. Krvavi Mjesec je druga gotova slika. */
  /* Karta mora kao na stvarnom Mjesecu (sjever gore, pogled sa Zemlje), u koordinatama
     diska 0-200: [cx, cy, rx, ry, kut°]. Mora se preklapaju u povezane tamne površine
     („lice u Mjesecu") - odvojeni mali ovali su izgledali kao pjege. */
  const MARIA = [
    [40, 100, 26, 50, 8],     // Oceanus Procellarum (veliki, lijevo)
    [58, 128, 20, 18, 0],     //   … njegov južni dio prema Humorumu
    [78, 62, 28, 24, -10],    // Mare Imbrium
    [92, 34, 42, 8, -6],      // Mare Frigoris (tanki pojas na sjeveru)
    [118, 66, 17, 16, 0],     // Mare Serenitatis
    [100, 86, 12, 9, 0],      // Mare Vaporum / spoj
    [80, 100, 13, 11, 0],     // Mare Insularum / spoj
    [131, 92, 22, 16, 15],    // Mare Tranquillitatis
    [168, 76, 11, 9, 0],      // Mare Crisium
    [157, 113, 11, 17, 10],   // Mare Fecunditatis
    [139, 122, 9, 9, 0],      // Mare Nectaris
    [96, 138, 20, 13, 0],     // Mare Nubium
    [66, 142, 10, 10, 0]      // Mare Humorum
  ];
  function noiseCanvas(n, lo) {            // lo = najtamnija vrijednost (manji kontrast = blaži šum)
    const c = document.createElement('canvas'); c.width = c.height = n;
    const x = c.getContext('2d'), id = x.createImageData(n, n);
    for (let i = 0; i < id.data.length; i += 4) {
      const v = lo + Math.random() * (255 - lo) | 0;
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255;
    }
    x.putImageData(id, 0, 0);
    return c;
  }
  let texCache = null;
  function moonTexture(D) {                          // pun Mjesec bez faze (lice), D x D
    if (texCache && texCache.D === D) return texCache.c;
    const c = document.createElement('canvas'); c.width = c.height = D;
    const x = c.getContext('2d'), R = D / 2, u = D / 200;
    x.save();
    x.beginPath(); x.arc(R, R, R, 0, Math.PI * 2); x.clip();
    const g = x.createRadialGradient(D * 0.46, D * 0.44, 0, D * 0.46, D * 0.44, D * 0.62);
    g.addColorStop(0, '#d8d0c1'); g.addColorStop(0.7, '#cbc2b2'); g.addColorStop(1, '#b4aa99');   // albedo - svjetlo/sjenu daje renderMoon
    x.fillStyle = g; x.fillRect(0, 0, D, D);
    x.globalCompositeOperation = 'darken';     // preklapanja mora se NE zbrajaju u tamnije mrlje
    // mora: mekane preklopljene površine (crtaju se PRIJE šuma, pa im šum razbije rubove)
    for (const [cx, cy, rx, ry, ang] of MARIA) {
      x.save(); x.translate(cx * u, cy * u); x.rotate(ang * Math.PI / 180); x.scale(rx * u, ry * u);
      const mg = x.createRadialGradient(0, 0, 0, 0, 0, 1.45);     // dugi mekani rub - bez vidljivog ovala
      mg.addColorStop(0, 'rgba(92,82,70,0.85)'); mg.addColorStop(0.45, 'rgba(92,82,70,0.7)'); mg.addColorStop(0.8, 'rgba(92,82,70,0.25)'); mg.addColorStop(1, 'rgba(92,82,70,0)');
      x.fillStyle = mg; x.beginPath(); x.arc(0, 0, 1.45, 0, Math.PI * 2); x.fill();
      x.restore();
    }
    // zrnata tekstura preko svega (multiply) - razbija rubove mora
    x.globalCompositeOperation = 'multiply';
    x.imageSmoothingEnabled = true;
    x.globalAlpha = 0.6; x.drawImage(noiseCanvas(9, 215), 0, 0, D, D);    // blage krupne mrlje (gorje) - mali kontrast, inače su pjege
    x.globalAlpha = 0.3; x.drawImage(noiseCanvas(40, 150), 0, 0, D, D);
    x.globalAlpha = 0.2; x.drawImage(noiseCanvas(140, 120), 0, 0, D, D);
    x.globalAlpha = 1;
    x.globalCompositeOperation = 'source-over';
    const tg = x.createRadialGradient(101 * u, 167 * u, 0, 101 * u, 167 * u, 6 * u);   // Tycho
    tg.addColorStop(0, 'rgba(239,237,243,0.5)'); tg.addColorStop(1, 'rgba(239,237,243,0)');
    x.fillStyle = tg; x.fillRect(0, 0, D, D);
    x.restore();
    texCache = { D, c };
    return c;
  }
  /* gotov Mjesec u fazi g: platno (D + 25 % ruba za sjaj sa svake strane), CSS ga razvuče na 150 %.
     Osvjetljenje se RAČUNA kao na kugli, piksel po piksel (jednom): normala točke na disku,
     smjer Sunca iz faze (k = (1 + cos i) / 2) i smjera osvijetljenog ruba, pa Lommel-Seeliger
     zakon (vrijedi za Mjesečevu površinu): I = 2·μ0 / (μ0 + μ). Zato je granica svjetla i
     tame mekana i postupna, uz nju je površina sve tamnija, a pun Mjesec ostaje jednoliko
     svijetao do ruba - kao pravi. (Prije: oštar rez maskom + plošan disk = „naljepnica".) */
  /* PRAVA FOTOGRAFIJA: NASA karta cijele površine Mjeseca (LRO, „CGI Moon Kit",
     NASA's Scientific Visualization Studio, svs.gsfc.nasa.gov/4720 - javno vlasništvo,
     NASA moli navođenje izvora). Ekvidistantna projekcija 1024×512: dužina -180..180
     slijeva nadesno (0 = sredina bliske strane), širina +90 gore. renderMoon je
     „omota" oko kugle: za svaku točku diska izračuna širinu/dužinu i uzme boju s karte.
     Ako se karta ne učita, ostaje Mjesec crtan kodom (moonTexture) - backup je i tag
     backup/halloween-mjesec-crtani. */
  const MOON_MAP = 'assets/halloween/moon-lroc-1k.jpg';
  let mapData = null, mapPromise = null;
  function loadMoonMap() {
    if (mapPromise) return mapPromise;
    return (mapPromise = new Promise(res => {
      const im = new Image();
      im.onload = () => {
        try {
          // smanjena na 384×192 = mekša, manje detalja (puna oštrina je djelovala „previše" uz ostatak stranice)
          const c = document.createElement('canvas'); c.width = 384; c.height = 192;
          const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, 384, 192);
          mapData = { w: c.width, h: c.height, d: x.getImageData(0, 0, c.width, c.height).data };
        } catch (e) { mapData = null; }
        res();
      };
      im.onerror = () => res();
      im.src = MOON_MAP;
    }));
  }
  /* VELIKA karta, bez smanjivanja - za alat „Mjesec" i slide „Mjesec sada", gdje je Mjesec
     velik i treba najviše detalja (vlasnik). Halloween i traka ostaju na mekanoj 384×192.
     Ista NASA karta (LROC „poles", 2019) u 2k i 4k - JPG pretvoren iz NASA-inog TIF-a.
     Disk promjera D piksela pokriva pola karte (180° dužine), pa za puni detalj karta treba
     biti široka ~2·D: do D = 1024 dovoljna je 2k (376 KB), iznad toga 4k (1,5 MB; mobitel s
     oštrim zaslonom). Veća (8k) se ne isplati: Mjesec na ekranu nije veći od ~1400 px, a
     samo pikseli karte bi u memoriji zauzeli 134 MB. Ako velika karta padne, koristi se 1k. */
  const MOON_MAP_HI = { 2048: 'assets/halloween/moon-lroc-2k.jpg', 4096: 'assets/halloween/moon-lroc-4k.jpg' };
  let mapHi = null;
  const mapHiPromises = {};
  function loadMoonMapHi(diskPx) {
    const want = (diskPx || 0) * 2 > 2048 ? 4096 : 2048;
    if (mapHi && mapHi.w >= want) return Promise.resolve();   // već imamo dovoljno veliku
    if (mapHiPromises[want]) return mapHiPromises[want];
    return (mapHiPromises[want] = new Promise(res => {
      const im = new Image();
      im.onload = () => {
        try {
          const w = im.naturalWidth, h = im.naturalHeight;
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          const x = c.getContext('2d'); x.drawImage(im, 0, 0);
          const m = { w, h, d: x.getImageData(0, 0, w, h).data };
          if (!mapHi || m.w > mapHi.w) mapHi = m;
        } catch (e) { /* ostaje manja karta */ }
        res();
      };
      im.onerror = () => loadMoonMap().then(res);       // velika ne ide - barem 1k
      im.src = MOON_MAP_HI[want];
    }));
  }

  /* KARTA VISINA (NASA LDEM, CGI Moon Kit) za reljef i sjene - assets/halloween/moon-height-2k.png,
     izrađen alatom tools/moon-height.js: 2048×1024, visina = R·256 + G (pola metra + 20 000).
     Visine se drže u km × RELIEF_X (pretjerivanje: na ekranu je Mjesec malen, pa bi stvarni
     reljef bio jedva vidljiv - kao i na NASA-inim prikazima). */
  const MOON_R = 1737.4, RELIEF_X = 2.5;
  const MOON_HEIGHT = 'assets/halloween/moon-height-2k.png';
  let heightMap = null, heightPromise = null;
  function loadHeight() {
    if (heightPromise) return heightPromise;
    return (heightPromise = new Promise(res => {
      const im = new Image();
      im.onload = () => {
        try {
          const w = im.naturalWidth, h = im.naturalHeight;
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          const x = c.getContext('2d'); x.drawImage(im, 0, 0);
          const px = x.getImageData(0, 0, w, h).data, raw = new Float32Array(w * h);
          for (let i = 0, j = 0; i < raw.length; i++, j += 4) raw[i] = ((px[j] * 256 + px[j + 1]) - 20000) / 2000 * RELIEF_X;
          /* blago zaglađivanje (1-2-1 vodoravno pa okomito): nagibi iz susjednih piksela
             nezaglađene karte su nemirni pa su uz granicu svjetla iskakale pojedinačne
             svijetle točkice (vlasnik) */
          const tmp = new Float32Array(w * h), v = new Float32Array(w * h);
          for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
            const o = yy * w, l = xx ? xx - 1 : w - 1, r = xx === w - 1 ? 0 : xx + 1;
            tmp[o + xx] = (raw[o + l] + 2 * raw[o + xx] + raw[o + r]) / 4;
          }
          let max = -1e9;
          for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
            const u = Math.max(0, yy - 1) * w + xx, dn = Math.min(h - 1, yy + 1) * w + xx, i = yy * w + xx;
            const km = (tmp[u] + 2 * tmp[i] + tmp[dn]) / 4;
            v[i] = km; if (km > max) max = km;
          }
          heightMap = { w, h, v, max };
        } catch (e) { heightMap = null; }
        res();
      };
      im.onerror = () => res();
      im.src = MOON_HEIGHT;
    }));
  }

  /* Crtanje je POSTUPNO (async): radi se u komadima od ~8 ms s predahom između, pa
     animacija loga koja se tada vrti ne zapne (u jednom komadu je blokiralo ~0,3 s).
     Jedan prolaz po pikselu: uzorak fotografije + osvjetljenje + maska svjetla. */
  const yieldFrame = () => new Promise(r => setTimeout(r, 0));
  async function renderMoon(D, g, opts) {
    opts = opts || {};
    const GLOW = opts.glow !== false, DARK = opts.dark == null ? 1 : opts.dark;
    const P = GLOW ? Math.round(D * 0.25) : 0, W = D + 2 * P, R = D / 2;
    const face = document.createElement('canvas'); face.width = face.height = D;
    const fx = face.getContext('2d');
    const map = (opts.hi && mapHi) || mapData;        // opts.hi: velika karta (alat i slide „Mjesec")
    let img;
    if (map) img = fx.createImageData(D, D);
    else {                                            // bez fotografije: tekstura crtana kodom
      fx.translate(R, R); fx.rotate(g.faceDeg * Math.PI / 180); fx.drawImage(moonTexture(D), -R, -R);
      fx.setTransform(1, 0, 0, 1, 0, 0);
      img = fx.getImageData(0, 0, D, D);
    }
    const d = img.data, mask = fx.createImageData(D, D), m = mask.data;
    const fa = -g.faceDeg * Math.PI / 180, cf = Math.cos(fa), sf = Math.sin(fa);
    // smjer Sunca u koordinatama ekrana (x desno, y dolje, z prema gledatelju)
    const ph = Math.acos(Math.max(-1, Math.min(1, 2 * g.k - 1)));   // fazni kut (0 = pun Mjesec)
    const L = g.limbDeg * Math.PI / 180;
    const sx = Math.sin(ph) * Math.cos(L), sy = Math.sin(ph) * Math.sin(L), sz = Math.cos(ph);
    const EARTH = opts.earth == null ? 0.025 : opts.earth;   // Zemljin odsjaj na tamnom dijelu - jedva (vlasnik: tamnije)
    const TINT = [1, 0.97, 0.9];                      // blago topla boja kosti
    /* RELJEF I SJENE (opts.relief, treba AJMoon.loadHeight()) - samo alat i slide „Mjesec".
       Karta visina daje nagib terena u svakoj točki; normala kugle se nagne za taj nagib pa
       strane kratera okrenute Suncu posvijetle, a suprotne potamne. Za točke uz granicu
       svjetla (Sunce nisko) uz to se po karti visina „hoda" prema Suncu i provjeri zaklanja
       li ga rub kratera ili planina - tako u kratere padaju duge sjene, s mekim rubom
       (polusjena) koliko je širok Sunčev disk. Sve u koordinatama Mjeseca:
       X desno, Y gore (sjever), Z prema gledatelju. */
    const HM = opts.relief ? heightMap : null;
    let SmX = 0, SmY = 0, SmZ = 0;
    if (HM) { SmX = sx * cf - sy * sf; SmY = -(sx * sf + sy * cf); SmZ = sz; }
    const hw = HM ? HM.w : 0, hh = HM ? HM.h : 0, hv = HM ? HM.v : null;
    const hAt = (u, v) => {                           // visina (km × pretjerivanje), bilinearno
      if (v < 0) v = 0; else if (v > hh - 1.001) v = hh - 1.001;
      u %= hw; if (u < 0) u += hw;
      const x0 = u | 0, y0 = v | 0, x1 = x0 + 1 === hw ? 0 : x0 + 1, ax = u - x0, ay = v - y0;
      const a = hv[y0 * hw + x0], b = hv[y0 * hw + x1], c = hv[(y0 + 1) * hw + x0], e = hv[(y0 + 1) * hw + x1];
      return a + (b - a) * ax + (c - a + (e - c - b + a) * ax) * ay;
    };
    const RAD_U = HM ? hw / (2 * Math.PI) : 0, RAD_V = HM ? hh / Math.PI : 0;   // piksela karte po radijanu
    // s reljefom: VIDLJIVOST Sunca (granica + bačena sjena) se zagladi, sjenčanje terena ostaje oštro
    const litBuf = HM ? new Float32Array(D * D).fill(-1) : null, baseBuf = HM ? new Float32Array(D * D) : null;
    let until = performance.now() + 8;
    for (let y = 0, k = 0; y < D; y++) {
      const ny = (y + 0.5 - R) / R;
      for (let x = 0; x < D; x++, k += 4) {
        const nx = (x + 0.5 - R) / R, r2 = nx * nx + ny * ny;
        if (r2 >= 1) { d[k + 3] = 0; m[k + 3] = 0; continue; }
        const nz = Math.sqrt(1 - r2);
        let reliefMu = null, shadowLit = 1;
        if (map || HM) {
          const px = nx * cf - ny * sf, py = nx * sf + ny * cf;
          const lat = Math.asin(Math.max(-1, Math.min(1, -py))), lon = Math.atan2(px, nz);
          if (HM) {
            const sLat = -py, cLat = Math.max(1e-4, Math.sqrt(1 - py * py));
            const sLon = px / cLat, cLon = nz / cLat;
            const hu = (lon / (2 * Math.PI) + 0.5) * hw - 0.5, hvv = (0.5 - lat / Math.PI) * hh - 0.5;
            // nagib (km po radijanu) iz razlike susjednih piksela karte
            const dLon = (hAt(hu + 1, hvv) - hAt(hu - 1, hvv)) * RAD_U / 2;
            const dLat = (hAt(hu, hvv - 1) - hAt(hu, hvv + 1)) * RAD_V / 2;
            const kLat = dLat / MOON_R, kLon = dLon / (MOON_R * cLat);
            // osnovni vektori: istok (eLon) i sjever (eLat) u točki
            const eLx = cLon, eLz = -sLon;
            const eNx = -sLat * sLon, eNy = cLat, eNz = -sLat * cLon;
            let Nx = px - kLat * eNx - kLon * eLx, Ny = sLat - kLat * eNy, Nz = nz - kLat * eNz - kLon * eLz;
            const nl = Math.sqrt(Nx * Nx + Ny * Ny + Nz * Nz); Nx /= nl; Ny /= nl; Nz /= nl;
            reliefMu = Nx * SmX + Ny * SmY + Nz * SmZ;
            // bačene sjene: samo dok je Sunce nisko iznad lokalnog obzora
            const sinAlt = px * SmX + sLat * SmY + nz * SmZ;
            if (reliefMu > 0 && sinAlt < 0.3) {
              const cosAlt = Math.sqrt(Math.max(1e-6, 1 - sinAlt * sinAlt)), tanAlt = sinAlt / cosAlt;
              // smjer prema Suncu po površini (jedinični), pa brzina promjene širine/dužine
              const Tx = (SmX - sinAlt * px) / cosAlt, Ty = (SmY - sinAlt * sLat) / cosAlt, Tz = (SmZ - sinAlt * nz) / cosAlt;
              const rLat = Tx * eNx + Ty * eNy + Tz * eNz, rLon = (Tx * eLx + Tz * eLz) / cLat;
              const h0 = hAt(hu, hvv);
              let dd = 1.3 / RAD_U;
              while (dd < 0.3) {
                const ray = h0 + MOON_R * dd * (tanAlt + dd / 2);    // visina zrake iznad kugle (km)
                if (ray > HM.max) break;                             // iznad najvišeg vrha - slobodno
                const hq = hAt(hu + rLon * dd * RAD_U, hvv - rLat * dd * RAD_V);
                const pen = MOON_R * dd * 0.016;                     // širina polusjene (~Sunčev disk, malo šire = mekše)
                const l = (ray - hq) / pen + 0.5;
                if (l < shadowLit) { shadowLit = l; if (shadowLit <= 0) { shadowLit = 0; break; } }
                dd *= 1.13;
              }
              if (shadowLit > 1) shadowLit = 1;
            }
          }
        }
        if (map) {                                    // NASA karta omotana oko kugle (bilinearno)
          const px = nx * cf - ny * sf, py = nx * sf + ny * cf;
          const lat = Math.asin(Math.max(-1, Math.min(1, -py))), lon = Math.atan2(px, nz);
          const mw = map.w, mh = map.h, md = map.d;
          let u = (lon / (2 * Math.PI) + 0.5) * mw - 0.5, v = (0.5 - lat / Math.PI) * mh - 0.5;
          if (u < 0) u += mw; if (v < 0) v = 0; if (v > mh - 1.001) v = mh - 1.001;
          const x0 = u | 0, y0 = v | 0, x1 = (x0 + 1) % mw, ax = u - x0, ay = v - y0;
          const i00 = (y0 * mw + x0) * 4, i10 = (y0 * mw + x1) * 4, i01 = ((y0 + 1) * mw + x0) * 4, i11 = ((y0 + 1) * mw + x1) * 4;
          for (let ch = 0; ch < 3; ch++) {
            const p = md[i00 + ch] + (md[i10 + ch] - md[i00 + ch]) * ax;
            const q = md[i01 + ch] + (md[i11 + ch] - md[i01 + ch]) * ax;
            const val = Math.max(0, Math.min(1, ((p + (q - p) * ay) / 255 - 0.55) * 0.95 + 0.55));   // blag kontrast
            d[k + ch] = val * 255 * TINT[ch];
          }
        }
        const edge = Math.min(1, (1 - Math.sqrt(r2)) * R * 1.2);     // zaglađen rub diska
        // hrapava granica: svjetlina teksture malo pomakne granicu (planine/krateri uz terminator)
        const tl = (d[k] + d[k + 1] + d[k + 2]) / 765;
        let lit = 0;
        if (reliefMu !== null) {
          // s reljefom: stvarni nagib terena + bačena sjena; granica je oštrija (kao na pravom
          // Mjesecu), a mekši je samo prijelaz unutar polusjene
          let vis = 0;
          if (reliefMu > 0) {
            lit = Math.min(1.1, 0.75 * (2 * reliefMu / (reliefMu + nz + 1e-4)) + 0.25 * reliefMu);
            const t = Math.min(1, reliefMu / 0.07);
            vis = t * t * (3 - 2 * t) * shadowLit * shadowLit * (3 - 2 * shadowLit);
          }
          if (litBuf) { litBuf[k >> 2] = vis; baseBuf[k >> 2] = lit; continue; }   // sjenčanje u drugom prolazu
          lit *= vis;
        } else {
          const mu0 = nx * sx + ny * sy + nz * sz + (tl - 0.72) * 0.07;
          if (mu0 > -0.1) {
            const m0 = Math.max(mu0, 0);
            // Lommel-Seeliger (pravi Mjesec) + malo Lamberta = postupno tamnjenje prema granici
            lit = Math.min(1.1, 0.75 * (2 * m0 / (m0 + nz + 1e-4)) + 0.25 * m0);
            const t = Math.min(1, Math.max(0, (mu0 + 0.1) / 0.4));    // široki mekani prijelaz
            lit *= t * t * (3 - 2 * t);
          }
        }
        const shade = EARTH + (1 - EARTH) * lit * 0.95;
        d[k] *= shade; d[k + 1] *= shade; d[k + 2] *= shade; d[k + 3] = 255 * edge * (DARK + (1 - DARK) * Math.min(1, lit));
        m[k] = m[k + 1] = m[k + 2] = 255; m[k + 3] = 255 * Math.min(1, lit) * edge;
      }
      if (performance.now() > until) { await yieldFrame(); until = performance.now() + 8; }
    }
    if (litBuf) {
      /* ZAGLAĐIVANJE SAMO VIDLJIVOSTI SUNCA (granica svjetla + bačene sjene), NE sjenčanja terena
         ni fotografije: uklanja usamljene osvijetljene točkice uz granicu i nazubljene rubove
         sjena (vlasnik: „točkice"), a krateri ostaju oštri. (Prvi pokušaj je zaglađivao cijelo
         svjetlo - Mjesec je izgledao mutno, jer je detalj kratera upravo njihovo sjenčanje.)
         Šator-filtar 1-2-1 (r = 1), na velikom Mjesecu 1-2-3-2-1 (r = 2). */
      const rb = D > 1100 ? 2 : 1, tmpL = new Float32Array(D * D);
      for (let pass = 0; pass < 2; pass++) {
        const srcL = pass ? tmpL : litBuf, dstL = pass ? litBuf : tmpL;
        for (let a = 0; a < D; a++) {
          for (let b = 0; b < D; b++) {
            const i = pass ? b * D + a : a * D + b;
            if (srcL[i] < 0) { dstL[i] = -1; continue; }
            let sum = 0, cnt = 0;
            for (let o = -rb; o <= rb; o++) {
              const bb = b + o; if (bb < 0 || bb >= D) continue;
              const j = pass ? bb * D + a : a * D + bb, v = srcL[j], wgt = rb + 1 - Math.abs(o);
              if (v >= 0) { sum += v * wgt; cnt += wgt; }
            }
            dstL[i] = sum / cnt;
          }
          if (performance.now() > until) { await yieldFrame(); until = performance.now() + 8; }
        }
      }
      for (let y = 0, k = 0; y < D; y++) {
        const ny = (y + 0.5 - R) / R;
        for (let x = 0; x < D; x++, k += 4) {
          const vis = litBuf[k >> 2];
          if (vis < 0) continue;
          const lit = baseBuf[k >> 2] * vis;
          const nx = (x + 0.5 - R) / R, r2 = nx * nx + ny * ny;
          const edge = Math.min(1, (1 - Math.sqrt(r2)) * R * 1.2);
          const shade = EARTH + (1 - EARTH) * lit * 0.95;
          d[k] *= shade; d[k + 1] *= shade; d[k + 2] *= shade; d[k + 3] = 255 * edge * (DARK + (1 - DARK) * Math.min(1, lit));
          m[k] = m[k + 1] = m[k + 2] = 255; m[k + 3] = 255 * Math.min(1, lit) * edge;
        }
      }
    }
    fx.putImageData(img, 0, 0);
    if (!GLOW) return face;
    // sjaj SAMO od osvijetljenog dijela: sjena maske, računana na 1/4 veličine (16× manje posla) pa povećana
    const q = 4, gW = Math.ceil(W / q), gD = Math.ceil(D / q), gP = Math.round(P / q);
    const ms = document.createElement('canvas'); ms.width = ms.height = gD;
    const mx = ms.getContext('2d'); mx.putImageData(mask, 0, 0);          // (puna maska; crta se smanjeno niže)
    const mfull = document.createElement('canvas'); mfull.width = mfull.height = D; mfull.getContext('2d').putImageData(mask, 0, 0);
    mx.clearRect(0, 0, gD, gD); mx.drawImage(mfull, 0, 0, gD, gD);
    const gc = document.createElement('canvas'); gc.width = gc.height = gW;
    const gx = gc.getContext('2d'), OFF = gW * 3;
    gx.shadowOffsetX = OFF;
    gx.shadowColor = 'rgba(215,200,175,0.35)'; gx.shadowBlur = gD * 0.18; gx.drawImage(ms, gP - OFF, gP);
    gx.shadowColor = 'rgba(225,215,195,0.4)';  gx.shadowBlur = gD * 0.045; gx.drawImage(ms, gP - OFF, gP);
    await yieldFrame();
    const c = document.createElement('canvas'); c.width = c.height = W;
    const x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(gc, 0, 0, W, W);
    x.drawImage(face, P, P);
    return c;
  }

  function moonGeometry(date, lat, lon) {
    const A = window.Astronomy, D = Math.PI / 180;
    const obs = new A.Observer(lat, lon, 10);
    const m = A.Equator('Moon', date, obs, true, true);
    const s = A.Equator('Sun', date, obs, true, true);
    const k = A.Illumination('Moon', date).phase_fraction;
    const am = m.ra * 15 * D, dm = m.dec * D, as = s.ra * 15 * D, ds = s.dec * D;
    const chi = Math.atan2(Math.cos(ds) * Math.sin(as - am),
      Math.sin(ds) * Math.cos(dm) - Math.cos(ds) * Math.sin(dm) * Math.cos(as - am));
    const lst = (A.SiderealTime(date) + lon / 15) * 15 * D;
    const H = lst - am, phi = lat * D;
    const q = Math.atan2(Math.sin(H), Math.tan(phi) * Math.cos(dm) - Math.sin(dm) * Math.cos(H));
    const z = chi - q;
    // na ekranu (y prema dolje): smjer osvijetljenog ruba = zakret za z suprotno od kazaljke od „gore"
    const limbDeg = Math.atan2(-Math.cos(z), -Math.sin(z)) / D;
    return { k, limbDeg, faceDeg: q / D };
  }

  /* Naziv mijene iz elongacije (Astronomy.MoonPhase: 0 = mlađak, 90 = prva četvrt,
     180 = uštap, 270 = posljednja četvrt). Glavne mijene dobivaju ±10° (oko dan) - toliko
     okom izgledaju „točno" mlađak/četvrt/uštap. */
  const PHASES = [[10, 'Mlađak'], [80, 'Rastući srp'], [100, 'Prva četvrt'], [170, 'Rastući Mjesec'],
                  [190, 'Uštap'], [260, 'Opadajući Mjesec'], [280, 'Posljednja četvrt'], [350, 'Opadajući srp'], [361, 'Mlađak']];
  function phaseName(date) {
    const e = window.Astronomy.MoonPhase(date);
    for (const [lim, n] of PHASES) if (e < lim) return n;
    return 'Mlađak';
  }

  window.AJMoon = {
    loadMap: loadMoonMap,
    loadMapHi: loadMoonMapHi,
    loadHeight,
    hasHeight: () => !!heightMap,
    hasMap: () => !!mapData,
    geometry: moonGeometry,
    render: renderMoon,
    phaseName
  };
})();
