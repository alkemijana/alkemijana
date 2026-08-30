// Sigurnosni headeri za SVE odgovore Cloudflare Pages Functions.
//
// ZAŠTO POSTOJI: korijenski `_headers` file (CSP, X-Frame-Options, nosniff, HSTS...)
// Cloudflare primjenjuje SAMO na statičke datoteke (index.html, css, js...), NE na
// odgovore Functions ruta. Bez ovoga bi /post/<slug> (SSR HTML za dijeljenje članka),
// /og/<slug>.svg i sve JSON API rute (/save-data, /verify-pass, /log-natal...) stizale
// bez ijednog sigurnosnog headera - SSR stranica bi bila uokvirljiva (clickjacking),
// SVG/JSON bi se mogli "sniffati" kao HTML, i eventualni XSS ne bi imao CSP kočnicu.
//
// _middleware.js na korijenu functions/ omata svaku funkcijsku rutu: pozovemo next()
// pa na dobiveni odgovor dodamo headere (bez diranja Content-Typea i tijela).
//
// VAŽNO: CSP mora ostati usklađen s korijenskim `_headers` - ako se ondje promijeni
// (novi vanjski servis), promijeni i ovdje. SSR /post stranica koristi inline <script>
// (redirect) i inline <style> pa CSP mora dopuštati 'unsafe-inline' u script/style-src,
// isto kao ostatak stranice.

const CSP = "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com; " +
  "style-src 'self' 'unsafe-inline'; font-src 'self'; " +
  "img-src 'self' data: blob: https://i.ibb.co https://emojicdn.elk.sh https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com; " +
  "connect-src 'self' https://api.imgbb.com https://i.ibb.co https://api.web3forms.com https://*.google-analytics.com https://*.analytics.google.com https://geocoding-api.open-meteo.com; " +
  "form-action 'self' https://api.web3forms.com; frame-ancestors 'none'; base-uri 'self'; object-src 'none'";

const SECURITY_HEADERS = {
  'Content-Security-Policy': CSP,
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cross-Origin-Opener-Policy': 'same-origin'
};

export async function onRequest(context) {
  const res = await context.next();
  // Klon je nužan - originalni Headers na odgovoru funkcije mogu biti immutable.
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(k)) headers.set(k, v);
  }
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}
