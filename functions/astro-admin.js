import { guardAdmin, passFromHeader, json } from './lib/admin-auth.js';

// A query path keeps this a single Pages Function: /astro-admin?path=users/ime/license.
const USER = '[a-z0-9._-]{3,32}';
const ROUTES = [
  ['GET', /^users$/],
  ['POST', /^users$/],
  ['DELETE', new RegExp(`^users/${USER}$`)],
  ['GET', new RegExp(`^users/${USER}/devices$`)],
  ['POST', new RegExp(`^users/${USER}/(password|license|remove-device|logout|addons)$`)]
];

export async function onRequest({ request, env }) {
  const denied = await guardAdmin(request, env, passFromHeader(request));
  if (denied) return denied;

  const path = new URL(request.url).searchParams.get('path') || '';
  if (!ROUTES.some(([method, pattern]) => method === request.method && pattern.test(path))) {
    return json({ error: 'not_found' }, 404);
  }
  let base;
  try {
    base = new URL(env.ASTRO_API_URL);
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password ||
        base.search || base.hash || base.pathname !== '/') throw new Error();
    if (!env.ASTRO_ADMIN_TOKEN) throw new Error();
  } catch {
    return json({ error: 'Astro API nije konfiguriran.' }, 503);
  }

  try {
    const response = await fetch(new URL('/api/admin/' + path, base), {
      method: request.method,
      headers: {
        'X-Astro-Admin': env.ASTRO_ADMIN_TOKEN,
        ...(request.method === 'POST' ? { 'Content-Type': 'application/json' } : {})
      },
      ...(request.method === 'POST' ? { body: await request.text() } : {}),
      redirect: 'manual',
      signal: AbortSignal.timeout(15000)
    });
    // Never follow a redirect with the admin secret or forward server cookies.
    if (response.status >= 300 && response.status < 400) {
      return json({ error: 'Neočekivano preusmjeravanje Astro API-ja.' }, 502);
    }
    const headers = new Headers({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    if (response.headers.has('Retry-After')) headers.set('Retry-After', response.headers.get('Retry-After'));
    return new Response(response.body, { status: response.status, headers });
  } catch {
    return json({ error: 'Astro API trenutačno nije dostupan.' }, 502);
  }
}
