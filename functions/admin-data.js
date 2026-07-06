// Privatni dohvat PUNIH podataka (uključujući isključeno/arhivirano) za prijavljenog
// admina. Skriveni sadržaj NIJE u javnom js/data.js (da ga Google/AI crawleri ne vide)
// nego u KV-u (binding NATAL_LOG, ključ 'admin:full'); ovdje ga admin vraća uz lozinku.
// Piše ga /save-data pri svakom spremanju. Bez KV-a / bez zapisa vrati { empty:true }
// i admin ostaje na javnom (vidljivom) skupu iz data.js.

export async function onRequestGet({ request, env }) {
  const ADMIN_PASS = env.ADMIN_PASS;
  if (!ADMIN_PASS) return json({ error: 'ADMIN_PASS not configured' }, 500);

  const provided = request.headers.get('x-admin-pass') || '';
  if (!safeEqual(provided, ADMIN_PASS)) {
    await new Promise(r => setTimeout(r, 250)); // uspori pogađanje
    return json({ error: 'Unauthorized' }, 403);
  }

  const KV = env.NATAL_LOG;
  if (!KV) return json({ empty: true, note: 'KV (NATAL_LOG) nije konfiguriran' }, 200);

  try {
    const raw = await KV.get('admin:full');
    if (!raw) return json({ empty: true }, 200);
    return json({ ok: true, full: JSON.parse(raw) }, 200);
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}
