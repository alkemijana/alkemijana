export async function onRequestPost({ request, env }) {
  const ADMIN_PASS = env.ADMIN_PASS;
  if (!ADMIN_PASS) {
    return new Response(JSON.stringify({ error: 'ADMIN_PASS not configured' }), { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const provided = (body && body.pass) || '';
  if (!safeEqual(provided, ADMIN_PASS)) {
    // mala umjetna pauza protiv brute-forcea
    await new Promise(r => setTimeout(r, 250));
    return new Response(JSON.stringify({ ok: false }), { status: 403 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
