/* Cloudflare Pages Function — Server-side render Open Graph meta tagova za blog članke.
   Cilj: WhatsApp / Facebook / Instagram / Twitter scraperi dohvate ovaj URL,
   vide prave meta tagove i pokažu thumbnail preview. Pravi posjetitelji se
   automatski preusmjeravaju na SPA (/#post/<slug>). */

export async function onRequest(context) {
  const { params, request } = context;
  const slug   = params.slug;
  const origin = new URL(request.url).origin;

  let post = null;
  try {
    const res = await fetch(origin + '/js/data.js');
    if (res.ok) {
      const text  = await res.text();
      const posts = extractPosts(text);
      post = posts.find(p => p.id === slug && !p.archived) || null;
    }
  } catch (e) { /* fallback na default meta tagove */ }

  const title       = post ? `${post.title} — Alkemijana` : 'Alkemijana — Tarot & Astrologija';
  const description = post
    ? truncate(stripHtml(post.excerpt || post.content || ''), 200)
    : 'Mistični kutak za tarot i astrologiju. Već znaš. Karte samo pokazuju put.';
  const image    = post && post.imageUrl
    ? post.imageUrl
    : `${origin}/og/${encodeURIComponent(slug)}.svg`;
  const canonical = `${origin}/post/${slug}`;
  const redirect  = `${origin}/#post/${slug}`;

  const html = `<!DOCTYPE html>
<html lang="hr">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(canonical)}">

<meta property="og:type" content="article">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:image:secure_url" content="${escapeHtml(image)}">
<meta property="og:image:type" content="image/${image.toLowerCase().endsWith('.jpg') || image.toLowerCase().endsWith('.jpeg') ? 'jpeg' : (image.toLowerCase().endsWith('.svg') ? 'svg+xml' : 'png')}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${escapeHtml(post ? post.title : 'Alkemijana')}">
<meta property="og:url" content="${escapeHtml(canonical)}">
<meta property="og:site_name" content="Alkemijana">
<meta property="og:locale" content="hr_HR">
${post ? `<meta property="article:published_time" content="${escapeHtml(post.date || '')}">` : ''}
${post && post.category ? `<meta property="article:section" content="${escapeHtml(post.category)}">` : ''}

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(image)}">

<meta http-equiv="refresh" content="0; url=${escapeHtml(redirect)}">
<script>window.location.replace(${JSON.stringify(redirect)});</script>
<style>body{font-family:sans-serif;background:#06080f;color:#c0bcce;padding:2rem;text-align:center}a{color:#a890d0}</style>
</head>
<body>
<p>Preusmjeravanje na članak…</p>
<p><a href="${escapeHtml(redirect)}">Otvori članak ručno</a></p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300'
    }
  });
}

function extractPosts(src) {
  const m = src.match(/BLOG_POSTS\s*=\s*(\[[\s\S]*?\])\s*;\s*\/\/\s*===ALKEMIJANA:BLOG_POSTS:END===/);
  if (!m) return [];
  try {
    return JSON.parse(m[1]);
  } catch (e) {
    return [];
  }
}

function stripHtml(s) {
  return String(s).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncate(s, n) {
  s = String(s);
  if (s.length <= n) return s;
  return s.slice(0, n).replace(/\s+\S*$/, '') + '…';
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
