/* ============================================================
   Dev alat (NIJE dio stranice): NASA karta visina Mjeseca → PNG za web.
   ------------------------------------------------------------
   Ulaz:  ldem_16_uint.tif s NASA SVS 4720 (CGI Moon Kit, javno vlasništvo,
          „NASA's Scientific Visualization Studio") - 5760×2880, 16-bit uint,
          vrijednost = visina u POLA METRA + 20 000 (u odnosu na 1737,4 km).
   Izlaz: assets/halloween/moon-height-2k.png - 2048×1024, RGB:
          R = gornji bajt, G = donji bajt iste 16-bitne vrijednosti (B = 0).
          Preglednik zna samo 8-bitne kanale, a 8 bita (80 m korak) daje
          stepenice u reljefu - zato je vrijednost rastavljena u dva kanala.
          PNG nema gAMA/iCCP pa ga canvas čita bez pretvorbe boja (točne vrijednosti).
   Smanjivanje: prosjek svih izvornih piksela koji padnu u ciljni (box filter),
   zaokružen na 8 m (Q).

   Pokretanje:  node tools/moon-height.js <put/do/ldem_16_uint.tif> [širina=2048]
   ============================================================ */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const src = process.argv[2];
const W = +(process.argv[3] || 2048), H = W / 2;
const Q = 16;                                               // korak zaokruživanja (pola metra × 16 = 8 m)
if (!src) { console.error('upotreba: node tools/moon-height.js ldem_16_uint.tif [2048]'); process.exit(1); }

// ---- TIFF (nesažet, little-endian, 16-bit, trake) ----
const buf = fs.readFileSync(src);
if (buf.toString('ascii', 0, 2) !== 'II') throw new Error('očekujem little-endian TIFF');
const ifd = buf.readUInt32LE(4);
const n = buf.readUInt16LE(ifd);
const tags = {};
const TYPE_SIZE = { 3: 2, 4: 4 };
for (let i = 0; i < n; i++) {
  const e = ifd + 2 + i * 12;
  const tag = buf.readUInt16LE(e), type = buf.readUInt16LE(e + 2), cnt = buf.readUInt32LE(e + 4);
  const sz = TYPE_SIZE[type] || 0, inline = sz * cnt <= 4;
  const off = inline ? e + 8 : buf.readUInt32LE(e + 8);
  const vals = [];
  for (let k = 0; k < cnt && sz; k++) vals.push(type === 3 ? buf.readUInt16LE(off + k * 2) : buf.readUInt32LE(off + k * 4));
  tags[tag] = vals;
}
const sw = tags[256][0], sh = tags[257][0], bits = tags[258][0], comp = tags[259][0];
console.log('TIFF', sw + '×' + sh, bits + '-bit', 'compression', comp);
if (comp !== 1 || bits !== 16) throw new Error('podržan je samo nesažet 16-bitni TIFF');
const offsets = tags[273], rps = tags[278] ? tags[278][0] : sh;
const srcAt = (x, y) => {                                   // vrijednost izvornog piksela
  const strip = Math.floor(y / rps), row = y - strip * rps;
  return buf.readUInt16LE(offsets[strip] + (row * sw + x) * 2);
};

// ---- smanjivanje (box filter) ----
const out = new Uint16Array(W * H);
let mn = 65535, mx = 0;
for (let y = 0; y < H; y++) {
  const y0 = Math.floor(y * sh / H), y1 = Math.max(y0 + 1, Math.floor((y + 1) * sh / H));
  for (let x = 0; x < W; x++) {
    const x0 = Math.floor(x * sw / W), x1 = Math.max(x0 + 1, Math.floor((x + 1) * sw / W));
    let s = 0, c = 0;
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { s += srcAt(xx, yy); c++; }
    // zaokruženo na 16 (= 8 m): za sjene je i to puno preciznije od potrebnog, a PNG je
    // ~3× manji (donji bajt bez šuma se puno bolje sažme)
    const v = Math.round(s / c / Q) * Q;
    out[y * W + x] = v;
    if (v < mn) mn = v; if (v > mx) mx = v;
  }
}
const km = v => ((v - 20000) / 2 / 1000).toFixed(2);
console.log('visine:', km(mn), 'do', km(mx), 'km');

// ---- PNG (RGB 8-bit; po retku bira filtar Sub/Up s manjim zbrojem) ----
const raw = Buffer.alloc(H * (1 + W * 3));
const line = y => {
  const r = Buffer.alloc(W * 3);
  for (let x = 0; x < W; x++) { const v = out[y * W + x]; r[x * 3] = v >> 8; r[x * 3 + 1] = v & 255; }
  return r;
};
let prev = Buffer.alloc(W * 3);
for (let y = 0; y < H; y++) {
  const cur = line(y), sub = Buffer.alloc(W * 3), up = Buffer.alloc(W * 3);
  let sSub = 0, sUp = 0;
  for (let i = 0; i < cur.length; i++) {
    sub[i] = (cur[i] - (i >= 3 ? cur[i - 3] : 0)) & 255;
    up[i] = (cur[i] - prev[i]) & 255;
    sSub += sub[i] < 128 ? sub[i] : 256 - sub[i];
    sUp += up[i] < 128 ? up[i] : 256 - up[i];
  }
  const o = y * (1 + W * 3);
  if (sUp <= sSub) { raw[o] = 2; up.copy(raw, o + 1); } else { raw[o] = 1; sub.copy(raw, o + 1); }
  prev = cur;
}
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc = b => { let c = -1; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2; // 8-bit, RGB
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
]);
const dst = path.join(__dirname, '..', 'assets', 'halloween', 'moon-height-' + (W / 1024) + 'k.png');
fs.writeFileSync(dst, png);
console.log('zapisano', dst, Math.round(png.length / 1024) + ' KB');
// kontrolni uzorci (za provjeru dekodiranja u pregledniku)
console.log('uzorci', JSON.stringify([[0, 0], [W / 2, H / 2], [W / 4, H / 4]].map(([x, y]) => out[y * W + x])));
