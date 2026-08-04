// Privatni dohvat PUNIH podataka (uključujući isključeno/arhivirano) za prijavljenog
// admina. Skriveni sadržaj NIJE u javnom js/data.js (da ga Google/AI crawleri ne vide)
// nego u KV-u (binding NATAL_LOG, ključ 'admin:full'); ovdje ga admin vraća uz lozinku.
// Piše ga /save-data pri svakom spremanju. Bez KV-a / bez zapisa vrati { empty:true }
// i admin ostaje na javnom (vidljivom) skupu iz data.js.
// Autentikacija i zaštita od pogađanja lozinke: lib/admin-auth.js.

import { guardAdmin, passFromHeader, json } from './lib/admin-auth.js';

export async function onRequestGet({ request, env }) {
  const denied = await guardAdmin(request, env, passFromHeader(request));
  if (denied) return denied;

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
