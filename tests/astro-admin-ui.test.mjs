import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Evaluate only the isolated Astro helpers, without booting the site's global UI.
const source = readFileSync(new URL('../js/admin.js', import.meta.url), 'utf8');
const context = vm.createContext({ crypto });
vm.runInContext(source.slice(source.indexOf('// Astro API data'), source.indexOf('let isAdmin')), context);

test('license states respect UTC end-of-day and the 14-day boundary', () => {
  const state = context.astroLicenseState;
  assert.equal(state(null), 'Nema licence');
  assert.equal(state('2026-10-31', Date.parse('2026-10-31T23:59:59Z')), 'Istječe za ≤ 14 dana');
  assert.equal(state('2026-10-31', Date.parse('2026-11-01T00:00:00Z')), 'Istekla');
  assert.equal(state('2026-11-14', Date.parse('2026-11-01T00:00:00Z')), 'Istječe za ≤ 14 dana');
  assert.equal(state('2026-11-15', Date.parse('2026-11-01T00:00:00Z')), 'Vrijedi');
});

test('extension clamps month ends and leap years and starts expired licenses today', () => {
  const extend = context.astroExtendedDate;
  const now = new Date('2026-01-01T12:00:00Z');
  assert.equal(extend('2026-01-31', 1, now), '2026-02-28');
  assert.equal(extend('2028-02-29', 12, now), '2029-02-28');
  assert.equal(extend(null, 1, now), '2026-02-01');
  assert.equal(extend('2025-12-31', 12, now), '2027-01-01');
});

test('generated passwords have 16 secure random characters and are not stored', () => {
  const values = new Set(Array.from({ length: 100 }, () => context.astroPassword()));
  assert.equal(values.size, 100);
  for (const value of values) assert.match(value, /^[A-Za-z0-9_-]{16}$/);
});

class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.events = {}; this.style = {}; this.value = ''; }
  appendChild(child) { this.children.push(child); }
  replaceChildren() { this.children = []; this.textContent = ''; }
  addEventListener(type, handler) { this.events[type] = handler; }
  querySelectorAll(selector) {
    const tags = selector.split(',').map(tag => tag.trim());
    return this.children.flatMap(child => [...(tags.includes(child.tag) ? [child] : []), ...child.querySelectorAll(selector)]);
  }
  checkValidity() { return true; }
}

test('tab workflows send the API contract, hide one-time passwords and render device text safely', async () => {
  const ids = new Map(['ap-astroapp', 'astro-admin-secret', 'astro-admin-message', 'astro-admin-users', 'astro-admin-detail']
    .map(id => [id, new Element('div')]));
  const panel = ids.get('ap-astroapp');
  for (const [id, el] of ids) if (id !== 'ap-astroapp') panel.appendChild(el);
  const user = { username: 'jana', role: 'user', license: { until: '2027-01-31' }, addons: [],
    seats: [{ deviceId: 'Windows_1.2-3', name: '<img src=x onerror=alert(3)>', platform: 'Windows',
      since: '2026-10-31T09:00:00Z', lastBeat: '2026-10-31T11:00:00Z' },
      { deviceId: 'legacy' }],
    devices: [{ id: 'Windows_1.2-3', name: '<img src=x onerror=alert(1)>', platform: 'Windows',
      suspect: true, suspectReason: 'multiple_countries,ip_changes', reports: [
        { t: '2026-10-30T10:00:00Z', country: 'HR', ip: 'private-hash' },
        { t: '2026-10-31T11:00:00Z', country: null, ip: 'another-private-hash' },
        { t: '<img src=x onerror=alert(2)>', country: '<script>bad</script>' }
      ] }, { id: 'legacy', name: 'Stari uređaj' }] };
  const calls = [];
  let clearFails = true;
  let releaseFails = true;
  const ctx = vm.createContext({ crypto, console, document: {
    createElement: tag => new Element(tag), getElementById: id => ids.get(id)
  }, sessionStorage: { getItem: key => { assert.equal(key, 'aj_pass'); return 'admin-pass'; } },
  confirm: () => true,
  fetch: async (url, options) => {
    assert.equal(options.headers['X-Admin-Pass'], 'admin-pass');
    const path = new URL(url, 'https://website.example.test').searchParams.get('path');
    const body = options.body ? JSON.parse(options.body) : undefined;
    calls.push({ path, method: options.method, body });
    if (path.endsWith('/release')) {
      if (releaseFails) return { ok: false, status: 404, json: async () => ({ error: 'not_found' }) };
      user.seats = user.seats.filter(seat => !path.endsWith('/' + seat.deviceId + '/release'));
    }
    if (path.endsWith('/clear-suspect')) {
      if (clearFails) return { ok: false, status: 404, json: async () => ({ error: 'not_found' }) };
      user.devices[0].suspect = false;
      user.devices[0].suspectReason = null;
    }
    return { ok: true, json: async () => path === 'users' && options.method === 'GET' ? { users: [user] } : { ok: true } };
  } });
  vm.runInContext(source.slice(source.indexOf('// Astro API data'), source.indexOf('let isAdmin')), ctx);
  const flush = () => new Promise(resolve => setImmediate(resolve));
  const detail = ids.get('astro-admin-detail');
  const click = async text => {
    const button = detail.querySelectorAll('button').find(el => el.textContent === text);
    assert.ok(button, text);
    button.events.click();
    await flush();
  };
  const lastMutation = () => calls.filter(call => call.method !== 'GET').at(-1);
  await ctx.loadAstroAdmin();
  ctx.astroShowUser('jana');
  const allText = el => [el.textContent || '', ...el.children.map(allText)].join(' ');
  assert.match(allText(ids.get('astro-admin-users')), /2\/3 2\/2/);
  assert.match(allText(detail), /Zauzeta mjesta \(2\/2\)/);
  assert.match(allText(detail), /Korisničko ime se ne može mijenjati/);
  assert.match(allText(detail), /<img src=x onerror=alert\(3\)>/);
  assert.match(allText(detail), /Od: 31\. 10\. 2026\. \d{1,2}:00 · Zadnje javljanje: 31\. 10\. 2026\. \d{1,2}:00 · ID: Windows_1\.2-3/);
  assert.match(allText(detail), /Od: — · Zadnje javljanje: — · ID: legacy/);
  assert.match(allText(detail), /Uređaji \(2\/3\)/);
  assert.match(allText(detail), /bez javljanja 30 dana automatski ispadaju/);
  assert.equal(detail.querySelectorAll('button').filter(el => el.textContent === 'Oslobodi mjesto').length, 2);
  await click('Oslobodi mjesto');
  assert.equal(lastMutation().path, 'users/jana/seats/Windows_1.2-3/release');
  assert.equal(lastMutation().method, 'POST');
  assert.equal(lastMutation().body, undefined);
  assert.match(allText(ids.get('astro-admin-message')), /zauzeto mjesto više ne postoji/);
  assert.match(allText(detail), /Zauzeta mjesta \(2\/2\)/);
  assert.equal(detail.querySelectorAll('button').find(el => el.textContent === 'Oslobodi mjesto').disabled, false);
  releaseFails = false;
  await click('Oslobodi mjesto');
  assert.match(allText(detail), /Zauzeta mjesta \(1\/2\)/);
  assert.match(allText(ids.get('astro-admin-users')), /2\/3 1\/2/);
  await click('Oslobodi mjesto');
  assert.equal(lastMutation().path, 'users/jana/seats/legacy/release');
  assert.match(allText(detail), /Nema zauzetih mjesta/);
  assert.equal(detail.querySelectorAll('button').some(el => el.textContent === 'Oslobodi mjesto'), false);
  assert.match(allText(detail), /<img src=x onerror=alert\(1\)>/);
  assert.equal(detail.querySelectorAll('img').length, 0);
  assert.match(allText(detail), /moguća kopija — javlja se iz više država; naizmjenično s različitih mreža/);
  const warning = detail.querySelectorAll('p').find(el => el.textContent.startsWith('moguća kopija'));
  assert.equal(warning.style.color, '#dc2626');
  const reports = detail.querySelectorAll('details');
  assert.equal(reports.length, 2);
  assert.equal(reports[0].open, undefined); // Native details stays collapsed until its summary is clicked.
  assert.match(allText(reports[0]), /2026-10-30T10:00:00Z · HR/);
  assert.match(allText(reports[0]), /2026-10-31T11:00:00Z · Nepoznata država/);
  assert.match(allText(reports[0]), /<script>bad<\/script>/);
  assert.equal(detail.querySelectorAll('script').length, 0);
  assert.doesNotMatch(allText(detail), /private-hash/);
  assert.match(allText(reports[1]), /Nema zabilježenih javljanja/);
  assert.equal(detail.querySelectorAll('button').filter(el => el.textContent === 'U redu je').length, 1);
  await click('U redu je');
  assert.equal(lastMutation().path, 'users/jana/devices/Windows_1.2-3/clear-suspect');
  assert.equal(lastMutation().method, 'POST');
  assert.equal(lastMutation().body, undefined);
  assert.match(allText(ids.get('astro-admin-message')), /Korisnik, uređaj ili zauzeto mjesto više ne postoji/);
  assert.match(allText(detail), /moguća kopija/);
  assert.equal(detail.querySelectorAll('button').find(el => el.textContent === 'U redu je').disabled, false);
  clearFails = false;
  await click('U redu je');
  assert.doesNotMatch(allText(detail), /moguća kopija/);
  assert.equal(detail.querySelectorAll('button').some(el => el.textContent === 'U redu je'), false);
  assert.match(allText(detail.querySelectorAll('details')[0]), /2026-10-30T10:00:00Z · HR/);
  await click('+1 mj.');
  assert.equal(lastMutation().body.until, '2027-02-28');
  await click('Ukini licencu');
  assert.equal(lastMutation().body.until, null);
  detail.querySelectorAll('input').find(el => el.type === 'date').value = '2028-03-15';
  await click('Spremi datum');
  assert.equal(lastMutation().body.until, '2028-03-15');
  await click('Nova lozinka');
  assert.equal(lastMutation().path, 'users/jana/password');
  const password = lastMutation().body.password;
  assert.match(allText(ids.get('astro-admin-secret')), new RegExp(password));
  assert.match(allText(ids.get('astro-admin-secret')), /Korisničko ime: jana[\s\S]*Privremena lozinka: /);
  assert.match(allText(ids.get('astro-admin-secret')), /https:\/\/astro\.alkemijana\.com/);
  assert.ok(ids.get('astro-admin-secret').querySelectorAll('button').some(el => el.textContent === 'Kopiraj podatke'));
  assert.match(allText(ids.get('astro-admin-secret')), /Prijava: https:\/\/astro\.alkemijana\.com\/\?u=jana/);
  await click('Odjavi sve');
  assert.equal(lastMutation().path, 'users/jana/logout');
  assert.equal(allText(ids.get('astro-admin-secret')).trim(), '');
  detail.querySelectorAll('input').find(el => el.type === 'checkbox').checked = true;
  await click('Spremi addon dozvole');
  assert.deepEqual(lastMutation().body, { addons: ['famous-times'] });
  await click('Ukloni uređaj');
  assert.equal(lastMutation().path, 'users/jana/remove-device');
  assert.deepEqual(lastMutation().body, { deviceId: 'Windows_1.2-3' });
  ctx.astroNewUser();
  detail.querySelectorAll('input')[0].value = 'novi';
  detail.querySelectorAll('select')[0].value = 'admin';
  detail.querySelectorAll('form')[0].events.submit({ preventDefault() {} });
  await flush();
  assert.equal(lastMutation().path, 'users');
  assert.equal(lastMutation().body.username, 'novi');
  assert.equal(lastMutation().body.role, 'admin');
  assert.equal(lastMutation().body.password.length, 16);
  ctx.astroShowUser('jana');
  await click('Obriši korisnika');
  assert.equal(lastMutation().method, 'DELETE');
  assert.equal(lastMutation().path, 'users/jana');
  delete user.seats;
  delete user.devices;
  await ctx.loadAstroAdmin();
  ctx.astroShowUser('jana');
  assert.match(allText(ids.get('astro-admin-users')), /0\/3 0\/2/);
  assert.match(allText(detail), /Zauzeta mjesta \(0\/2\)/);
  assert.match(allText(detail), /Nema zauzetih mjesta/);
  assert.match(allText(detail), /Nema registriranih uređaja/);
  ctx.astroClearAdmin();
  assert.equal(allText(ids.get('astro-admin-secret')).trim(), '');
  assert.equal(allText(detail).trim(), '');
});
