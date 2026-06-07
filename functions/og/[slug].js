/* Cloudflare Pages Function — Dinamički generira Open Graph SVG sliku
   za blog članak: mistična ljubičasta pozadina + zvjezdice + emoji ikona
   članka + naslov i kategorija. Koristi se kao og:image kad članak nema
   uploadanu sliku. */

export async function onRequest(context) {
  const { params, request } = context;
  const slug   = params.slug.replace(/\.svg$/, '');
  const origin = new URL(request.url).origin;

  let post = null;
  try {
    const res = await fetch(origin + '/js/data.js');
    if (res.ok) {
      const text  = await res.text();
      const posts = extractPosts(text);
      post = posts.find(p => p.id === slug) || null;
    }
  } catch (e) {}

  const icon     = post && post.icon ? post.icon : '✦';
  const title    = post && post.title ? post.title : 'Alkemijana';
  const category = post && post.category ? post.category.toUpperCase() : 'TAROT & ASTROLOGIJA';
  const date     = post && post.date ? post.date : '';

  const svg = renderSvg({ icon, title, category, date });

  return new Response(svg, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400'
    }
  });
}

function renderSvg({ icon, title, category, date }) {
  const W = 1200, H = 630;

  const stars = [];
  const seed = hash(title);
  for (let i = 0; i < 70; i++) {
    const r1 = pseudo(seed + i * 7);
    const r2 = pseudo(seed + i * 13 + 3);
    const r3 = pseudo(seed + i * 29 + 11);
    const cx = (r1 * W).toFixed(1);
    const cy = (r2 * H).toFixed(1);
    const rr = (0.6 + r3 * 1.8).toFixed(2);
    const op = (0.25 + r3 * 0.55).toFixed(2);
    stars.push(`<circle cx="${cx}" cy="${cy}" r="${rr}" fill="#d8d4ec" opacity="${op}"/>`);
  }

  const accents = [];
  for (let i = 0; i < 6; i++) {
    const r1 = pseudo(seed + i * 41 + 99);
    const r2 = pseudo(seed + i * 53 + 77);
    const r3 = pseudo(seed + i * 17 + 31);
    accents.push(`<text x="${(r1 * W).toFixed(1)}" y="${(r2 * H).toFixed(1)}" font-size="${(14 + r3 * 18).toFixed(0)}" fill="#a890d0" opacity="${(0.2 + r3 * 0.3).toFixed(2)}" font-family="serif">✦</text>`);
  }

  const titleLines = wrapTitle(title, 22);
  const titleSvg = titleLines.map((line, idx) =>
    `<text x="600" y="${470 + idx * 62}" text-anchor="middle" font-family="'Playfair Display', Georgia, serif" font-size="56" font-weight="600" fill="#e4e0f4">${escapeXml(line)}</text>`
  ).join('');

  const metaLine = [date, category].filter(Boolean).join('  ·  ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="75%">
      <stop offset="0%" stop-color="#1c1840"/>
      <stop offset="55%" stop-color="#0e0c24"/>
      <stop offset="100%" stop-color="#06080f"/>
    </radialGradient>
    <radialGradient id="iconGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#a890d0" stop-opacity="0.55"/>
      <stop offset="60%" stop-color="#a890d0" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#a890d0" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="brandLine" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#a890d0" stop-opacity="0"/>
      <stop offset="50%" stop-color="#a890d0" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#a890d0" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  ${stars.join('\n  ')}
  ${accents.join('\n  ')}

  <circle cx="600" cy="240" r="220" fill="url(#iconGlow)"/>
  <text x="600" y="305" text-anchor="middle" font-size="240"
    font-family="'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji','Twemoji Mozilla',sans-serif"
    style="dominant-baseline:central">${escapeXml(icon)}</text>

  <line x1="350" y1="395" x2="850" y2="395" stroke="url(#brandLine)" stroke-width="1"/>

  ${titleSvg}

  <text x="600" y="${470 + titleLines.length * 62 + 30}" text-anchor="middle"
    font-family="'Quicksand', 'Helvetica Neue', sans-serif" font-size="22" font-weight="600"
    fill="#a890d0" letter-spacing="6">${escapeXml(metaLine)}</text>

  <text x="600" y="80" text-anchor="middle"
    font-family="'Tangerine', 'Brush Script MT', cursive" font-size="58" fill="#a890d0"
    opacity="0.95">Alkemijana</text>
</svg>`;
}

function wrapTitle(s, max) {
  const words = String(s).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > max) {
      if (cur) lines.push(cur);
      cur = w;
    } else {
      cur = (cur ? cur + ' ' : '') + w;
    }
    if (lines.length === 2) break;
  }
  if (cur && lines.length < 3) lines.push(cur);
  if (lines.length === 3 && words.join(' ').length > max * 3) {
    lines[2] = lines[2].slice(0, max - 1) + '…';
  }
  return lines.slice(0, 3);
}

function extractPosts(src) {
  const m = src.match(/BLOG_POSTS\s*=\s*(\[[\s\S]*?\])\s*;\s*\/\/\s*===ALKEMIJANA:BLOG_POSTS:END===/);
  if (!m) return [];
  try { return new Function('return ' + m[1])(); } catch (e) { return []; }
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pseudo(seed) {
  let x = (seed * 9301 + 49297) % 233280;
  return x / 233280;
}
