// Provjera admin lozinke pri prijavi. Lozinka je u env varu ADMIN_PASS (nikad u kodu).
// Brojanje promašaja i zaključavanje po IP-u su u lib/admin-auth.js (zajedničko sa
// svim admin rutama - napadač ne može zaobići lockout gađajući drugu rutu).
import { guardAdmin, json } from './lib/admin-auth.js';

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const denied = await guardAdmin(request, env, (body && body.pass) || '');
  if (denied) return denied;

  return json({ ok: true }, 200);
}
