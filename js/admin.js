/* ============================================================
   AlkemiJana - Admin panel
   Pristup: AlkemiJana.html#admin  (ili index.html#admin)
   Korisničko ime : jana
   Lozinka        : (provjerava se preko /verify-pass - env var ADMIN_PASS)
   ============================================================ */

const ADMIN_USER  = 'jana';
const IMGBB_KEY   = '0d1cce4852e17860ddebe0e15f9ac341';

let isAdmin        = false;
let editingPostId  = null;
let editingGuideId = null;
let editingSvcId  = null;
let editingRevId  = null;

/* ============================================================
   PRIJAVA / ODJAVA
   ============================================================ */

async function handleAdminLogin() {
  const u    = document.getElementById('aj-user').value;
  const p    = document.getElementById('aj-pass').value;
  const err  = document.getElementById('admin-error');
  const btn  = document.querySelector('#admin-login-box .btn-primary');

  if (u !== ADMIN_USER) {
    err.style.display = 'block';
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Provjeravam...'; }
  err.style.display = 'none';

  let ok = false;
  let lockMsg = '';
  try {
    const res = await fetch('/verify-pass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pass: p })
    });
    const data = await res.json().catch(() => ({}));
    ok = res.ok && data.ok === true;
    // 429 = previše promašaja, pristup privremeno zaključan (lib/admin-auth.js)
    if (res.status === 429 && data && data.error) lockMsg = data.error;
  } catch (e) {
    // Lokalni razvoj (bez Cloudflare funkcija): pusti login da se UI može testirati,
    // ali save neće raditi jer nema env vara.
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.protocol === 'file:') {
      ok = !!p;
    }
  }

  if (btn) { btn.disabled = false; btn.textContent = 'Prijava'; }

  if (ok) {
    isAdmin = true;
    sessionStorage.setItem('aj_admin', '1');
    sessionStorage.setItem('aj_pass', p);
    document.getElementById('admin-login-overlay').classList.remove('show');
    activateAdmin();
    history.replaceState(null, '', '#');
  } else {
    if (lockMsg) err.textContent = lockMsg;
    err.style.display = 'block';
  }
}

function adjustAdminLayout() {
  const bar = document.getElementById('admin-bar');
  if (!bar.classList.contains('show')) return;
  const barH = bar.offsetHeight;
  const nav = document.getElementById('main-nav');
  nav.style.top = barH + 'px';
  const navH = nav.offsetHeight;
  document.querySelectorAll('.page').forEach(p => p.style.paddingTop = (barH + navH) + 'px');
}
window.addEventListener('resize', adjustAdminLayout);

function activateAdmin() {
  isAdmin = true;
  const bar = document.getElementById('admin-bar');
  bar.classList.add('show');
  syncToggleBtns();
  requestAnimationFrame(adjustAdminLayout);
  hydrateAdminData(); // vrati skriveno/arhivirano iz privatne KV pohrane (uz lozinku)
}

/* Puni podaci (uklj. isključeno/arhivirano) NISU u javnom js/data.js - Google/AI
   ih ne smiju vidjeti - nego u privatnom KV-u. Prijavljeni admin ih ovdje vraća
   preko /admin-data (X-Admin-Pass) i reassigna globalne nizove da u panelu vidi i
   može vratiti sve. Ako KV nije spreman / offline smo, ostaje javni (vidljivi) skup. */
async function hydrateAdminData() {
  const pass = sessionStorage.getItem('aj_pass') || '';
  if (!pass) return;
  let data;
  try {
    const res = await fetch('/admin-data?cb=' + Date.now(), { headers: { 'X-Admin-Pass': pass } });
    if (!res.ok) return;
    data = await res.json().catch(() => null);
  } catch (e) { return; } // lokalno / bez funkcija - ostaje javni data.js
  if (!data || data.empty || !data.full) return;

  const f = data.full;
  if (Array.isArray(f.blog))     BLOG_POSTS  = f.blog;
  if (Array.isArray(f.guides) && typeof TOOL_GUIDES !== 'undefined') TOOL_GUIDES = f.guides;
  if (Array.isArray(f.services)) SERVICES    = f.services;
  if (Array.isArray(f.pricing))  PRICING     = f.pricing;
  if (Array.isArray(f.reviews))  REVIEWS     = f.reviews;
  if (f.settings && typeof f.settings === 'object') SITE_SETTINGS = f.settings;

  // Osvježi admin prikaz (trenutni tab) i javne sekcije (arhivirano se ionako filtrira)
  syncToggleBtns();
  const activeTab = document.querySelector('.ap-tab-btn.active');
  if (activeTab && activeTab.id) switchTab(activeTab.id.replace('tab-', ''));
  if (typeof applySettings === 'function') applySettings();
  if (typeof renderServices === 'function') renderServices();
  if (typeof renderPricingTable === 'function') renderPricingTable();
  if (typeof renderReviews === 'function') {
    renderReviews('home', 'home-reviews-grid');
    renderReviews('omeni', 'about-reviews-grid');
  }
  if (typeof renderHomeBlogPreview === 'function') renderHomeBlogPreview();
  if (typeof renderBlogList === 'function') renderBlogList();
}

function adminLogout() {
  isAdmin = false;
  sessionStorage.removeItem('aj_admin');
  sessionStorage.removeItem('aj_pass');
  document.getElementById('admin-bar').classList.remove('show');
  const nav = document.getElementById('main-nav');
  nav.style.top = '0';
  document.querySelectorAll('.page').forEach(p => p.style.paddingTop = '');
  closeAdminPanel();
}

function closeAdminLogin() {
  document.getElementById('admin-login-overlay').classList.remove('show');
  if (window.location.hash === '#admin') history.replaceState(null, '', '#');
}

document.getElementById('aj-pass').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleAdminLogin();
});

/* ============================================================
   VIDLJIVOST RECENZIJA (toggle u admin baru)
   ============================================================ */

/* ============================================================
   UPLOAD SLIKA NA ImgBB
   ------------------------------------------------------------
   Slike s mobitela znaju biti 10+ MB, a na ImgBB idu kao base64 (~33% veći
   prijenos od same datoteke). Takav upload traje minutama ili se potpuno
   zaglavi, a ranije nije bilo ni timeouta ni ograničenja veličine - pa je
   poruka "Uploadam sliku..." znala visjeti unedogled bez ijedne greške.
   Zato sada: slika se prije slanja smanji na canvasu, zahtjev ima timeout,
   a svaka greška ima svoj tekst umjesto općeg "pokušaj ponovo".
   ============================================================ */
const UPLOAD_MAX_PX         = 1600;         // dulja stranica nakon smanjivanja
const UPLOAD_TARGET_BYTES   = 900 * 1024;   // ciljana veličina poslane datoteke
const UPLOAD_PASSTHRU_BYTES = 400 * 1024;   // manje od ovoga se ne dira (bez gubitka)
const UPLOAD_FALLBACK_BYTES = 5 * 1024 * 1024; // ako dekodiranje padne, tolika se jos smije poslati kakva jest
const UPLOAD_TIMEOUT_MS     = 60000;

function uploadTimeoutSignal(ms) {
  if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) return AbortSignal.timeout(ms);
  const ctl = new AbortController();
  setTimeout(() => ctl.abort(), ms);
  return ctl.signal;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error('Čitanje datoteke nije uspjelo.'));
    reader.readAsDataURL(file);
  });
}

/* Dekodiraj sliku iz datoteke. Prvo createImageBitmap - on radi IZRAVNO nad
   datotekom, bez ijednog URL-a, pa ga Content-Security-Policy ne dira. Stariji
   put preko <img src="blob:..."> ostaje kao rezerva, ali on ovisi o tome da
   img-src u CSP-u dopusta blob: (bez toga preglednik javi gresku ucitavanja,
   sto izvana izgleda kao "format nije podrzan" i za obicni JPG). */
async function decodeImageFile(file) {
  if (typeof createImageBitmap === 'function') {
    try { return await createImageBitmap(file); } catch (e) {}
  }
  return await loadImageForResize(file);
}

function loadImageForResize(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload  = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('DECODE')); };
    img.src = url;
  });
}

/* Vrati datoteku spremnu za upload. Animirani GIF i SVG idu kako jesu (canvas
   bi ubio animaciju, odnosno vektor), male slike se ne diraju, sve ostalo se
   smanji na UPLOAD_MAX_PX i sprema kao JPEG s padajućom kvalitetom dok ne
   padne ispod UPLOAD_TARGET_BYTES. */
async function prepareImageForUpload(file) {
  if (!file || !file.type || file.type.indexOf('image/') !== 0)
    throw new Error('Odabrana datoteka nije slika.');

  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
  if (file.size <= UPLOAD_PASSTHRU_BYTES) return file;

  let img;
  try {
    img = await decodeImageFile(file);
  } catch (e) {
    // Preglednik ne zna dekodirati (HEIC s iPhonea, oštećena datoteka...). Ako je
    // datoteka ionako dovoljno mala, pošalji original kakav jest umjesto da je
    // odbijemo unaprijed - smanjivanje je ubrzanje, ne uvjet.
    if (file.size <= UPLOAD_FALLBACK_BYTES) return file;
    throw new Error('Ovu sliku preglednik ne može otvoriti (najčešće HEIC s iPhonea ili oštećena datoteka), a prevelika je da bi se poslala kakva jest. Spremi je kao JPG pa pokušaj ponovo.');
  }

  const wOrig = img.naturalWidth  || img.width;
  const hOrig = img.naturalHeight || img.height;
  if (!wOrig || !hOrig) return file;

  const scale = Math.min(1, UPLOAD_MAX_PX / Math.max(wOrig, hOrig));
  if (scale === 1 && file.size <= UPLOAD_TARGET_BYTES) return file;

  const w = Math.max(1, Math.round(wOrig * scale));
  const h = Math.max(1, Math.round(hOrig * scale));
  const canvas  = document.createElement('canvas');
  canvas.width  = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // JPEG nema prozirnost - bez ove podloge bi prozirni dijelovi ispali crni.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  if (typeof img.close === 'function') img.close();   // ImageBitmap drži memoriju dok ga se ne zatvori

  let blob = null;
  const steps = [0.85, 0.75, 0.65, 0.55];
  for (let i = 0; i < steps.length; i++) {
    blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', steps[i]));
    if (!blob || blob.size <= UPLOAD_TARGET_BYTES) break;
  }
  if (!blob || blob.size >= file.size) return file;   // original je već manji

  const base = (file.name || 'slika').replace(/\.[^.]+$/, '');
  return new File([blob], base + '.jpg', { type: 'image/jpeg' });
}

/* opts.raw      - preskoči smanjivanje (slike koje smo sami nacrtali na canvasu)
   opts.onStatus - povratni poziv s tekstom statusa (Pripremam / Uploadam) */
async function uploadToImgBB(file, opts) {
  opts = opts || {};
  const note = typeof opts.onStatus === 'function' ? opts.onStatus : function () {};

  let toSend = file;
  if (!opts.raw) {
    note('\u23F3 Pripremam sliku...');
    toSend = await prepareImageForUpload(file);
  }

  note('\u23F3 Uploadam sliku...');
  const base64   = await fileToBase64(toSend);
  const formData = new FormData();
  formData.append('key', IMGBB_KEY);
  formData.append('image', base64);

  let res;
  try {
    res = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST', body: formData, signal: uploadTimeoutSignal(UPLOAD_TIMEOUT_MS)
    });
  } catch (e) {
    if (e && (e.name === 'AbortError' || e.name === 'TimeoutError'))
      throw new Error('Upload predugo traje – veza je prespora ili je pukla. Pokušaj ponovo.');
    throw new Error('Nema veze s poslužiteljem slika. Provjeri internet pa pokušaj ponovo.');
  }

  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (data && data.success && data.data && data.data.url) return data.data.url;

  const msg = (data && data.error && data.error.message) ? data.error.message : ('HTTP ' + res.status);
  throw new Error('Slika nije prihvaćena (' + msg + ').');
}

async function handleAboutImageUpload(input) {
  const file = input.files[0];
  if (!file) return;
  const label = input.parentElement;
  try {
    const url = await uploadToImgBB(file, { onStatus: t => { label.textContent = t; } });
    SITE_SETTINGS.aboutImageUrl = url;
    applySettings();
    // label, ne input.parentElement: postavljanje statusa je maknulo <input> iz
    // labela pa mu parentElement više nije ništa.
    label.innerHTML = '📷 Moja slika <input type="file" accept="image/*" style="display:none" onchange="handleAboutImageUpload(this)">';
    alert('Slika je postavljena!');
  } catch(e) {
    alert(e && e.message ? e.message : 'Greška pri uploadu slike. Pokušaj ponovo.');
    label.innerHTML = '📷 Moja slika <input type="file" accept="image/*" style="display:none" onchange="handleAboutImageUpload(this)">';
  }
}

function toggleServices() {
  SITE_SETTINGS.showServices = !SITE_SETTINGS.showServices;
  applySettings();
  syncToggleBtns();
}

function toggleReviews() {
  SITE_SETTINGS.showReviews = !SITE_SETTINGS.showReviews;
  applySettings();
  syncToggleBtns();
}

function toggleAboutReviews() {
  SITE_SETTINGS.showAboutReviews = !SITE_SETTINGS.showAboutReviews;
  applySettings();
  syncToggleBtns();
}

function syncToggleBtns() {
  const setItem = (id, on, label) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = (on ? '● ' : '○ ') + label;
    el.classList.toggle('is-on', on);
  };
  setItem('toggle-services-btn',      SITE_SETTINGS.showServices,     'Usluge');
  setItem('toggle-reviews-btn',       SITE_SETTINGS.showReviews,      'Recenzije - Početna');
  setItem('toggle-about-reviews-btn', SITE_SETTINGS.showAboutReviews, 'Recenzije - O meni');
}

function toggleAdminMenu() {
  document.getElementById('abt-toggles-menu').classList.toggle('open');
}

// Zatvori dropdown na klik vani
document.addEventListener('click', e => {
  const dd = document.querySelector('.abt-dropdown');
  if (dd && !dd.contains(e.target)) {
    document.getElementById('abt-toggles-menu')?.classList.remove('open');
  }
});

/* ============================================================
   ADMIN PANEL - otvaranje / zatvaranje / tabovi
   ============================================================ */

function openAdmin(tab) {
  document.getElementById('admin-panel-overlay').classList.add('show');
  switchTab(tab || 'blog');
}

function closeAdminPanel() {
  document.getElementById('admin-panel-overlay').classList.remove('show');
}

function switchTab(t) {
  document.querySelectorAll('.ap-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.ap-tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById('tab-' + t).classList.add('active');
  document.getElementById('ap-' + t).classList.add('active');

  if (t === 'blog')     renderBlogAdminList();
  if (t === 'guides')   renderGuidesAdminList();
  if (t === 'services') renderSvcAdmin();
  if (t === 'pricing')  renderPricingAdmin();
  if (t === 'reviews')  renderReviewsAdmin();
  if (t === 'texts')    renderTextsAdmin();
  if (t === 'natallog') loadNatalLog();
  if (t === 'tarot')    renderTarotAdmin();
}

/* ============================================================
   EMOJI PICKER (dijele blog i usluge)
   ============================================================ */

const EMOJI_GROUPS = [
  { label: 'Astrološki simboli', emojis: ['☽','☾','☉','☿','♀','♂','♃','♄','♅','♆','⊕','☊','☋'] },
  { label: 'Znakovi horoskopa',  emojis: ['♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓'] },
  { label: 'Zvijezde i svemir',  emojis: ['✦','✧','✨','⭐','🌟','💫','🌠','🌌','🪐','☀️','🌤️'] },
  { label: 'Faze Mjeseca',       emojis: ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘','🌙','🌛','🌜','🌝'] },
  { label: 'Tarot i mistika',    emojis: ['🔮','🃏','🎴','🕯️','🔥','👁️','💎','🌹','🐍','🦋','♾️','☯️','🌿','🌊','⚡','🗝️','📿','🌀','🧿','🪬','🪄','🌺','🖤','🌑'] }
];

function buildEmojiPicker(currentIcon, onSelectFn) {
  return `<div class="emoji-picker-grid">` +
    EMOJI_GROUPS.map(g =>
      `<div class="ep-group">${g.label}</div>` +
      g.emojis.map(e =>
        `<span class="ep-btn ${e === currentIcon ? 'active' : ''}"
          onclick="${onSelectFn}('${e}', this)">${e}</span>`
      ).join('')
    ).join('') +
    `</div>`;
}

/* ============================================================
   BLOG - admin lista i editor
   ============================================================ */

function renderBlogAdminList() {
  document.getElementById('blog-admin-list').innerHTML = BLOG_POSTS.map(p => `
    <div class="bpi ${editingPostId === p.id ? 'sel' : ''} ${p.archived ? 'archived-item' : ''}"
      onclick="loadPostEditor('${p.id}')">
      <div class="bpi-t">${p.archived ? '🗄 ' : ''}${p.title}</div>
      <div class="bpi-m">${p.date}${p.series ? ' · ' + esc(p.series) + (p.seriesPart ? ' #' + p.seriesPart : '') : ''}</div>
    </div>`
  ).join('');
}

function newPost() {
  editingPostId = '__new__';
  renderBlogAdminList();
  showPostEditor(null);
}

function loadPostEditor(id) {
  editingPostId = id;
  renderBlogAdminList();
  showPostEditor(BLOG_POSTS.find(p => p.id === id));
}

function showPostEditor(p) {
  const isNew = !p;
  const icon  = p ? p.icon : '✦';

  document.getElementById('blog-editor-col').innerHTML = `
    <h3>${isNew ? 'Novi članak' : 'Uredi članak'}</h3>

    <div class="af-2">
      <div class="af"><label>Naslov</label>
        <input id="ed-title" value="${p ? esc(p.title) : ''}"></div>
      <div class="af"><label>Datum</label>
        <input id="ed-date" value="${p ? esc(p.date) : ''}"></div>
    </div>
    <div class="af-2">
      <div class="af"><label>Ikona - odabrana: <span id="blog-icon-preview" style="font-size:1.3rem;vertical-align:middle">${icon}</span></label>
        <input id="ed-icon" value="${icon}" style="display:none">
        ${buildEmojiPicker(icon, 'selectBlogEmoji')}
      </div>
      <div class="af">
        <label>Tagovi <span style="font-weight:400;color:var(--text-muted);font-style:italic">(Enter ili zarez za novi tag)</span></label>
        <div class="tag-input-wrap" onclick="document.getElementById('ed-tag-text').focus()">
          <span id="tag-chips-container"></span>
          <input id="ed-tag-text" type="text" placeholder="dodaj tag..." autocomplete="off" onkeydown="handleTagKey(event)" onblur="commitTagInput()">
        </div>
      </div>
    </div>

    <div class="af-2">
      <div class="af">
        <label>Serijal <span style="font-weight:400;color:var(--text-muted);font-style:italic">(opcionalno)</span></label>
        <input id="ed-series" type="text" placeholder="npr. Tarot osnove" value="${p && p.series ? esc(p.series) : ''}">
      </div>
      <div class="af">
        <label>Dio serijala</label>
        <input id="ed-series-part" type="number" min="1" placeholder="1, 2, 3..." value="${p && p.seriesPart ? p.seriesPart : ''}">
      </div>
    </div>

    <div class="af">
      <label>Naslovna slika</label>
      <div style="display:flex;align-items:center;gap:0.8rem;margin-top:0.3rem;flex-wrap:wrap">
        <label class="ap-btn ap-btn-cancel" style="cursor:pointer;display:inline-block">
          📁 Odaberi s računala
          <input type="file" accept="image/*" style="display:none" onchange="handleBlogImageUpload(this)">
        </label>
        <button type="button" class="ap-btn ap-btn-cancel" onclick="generateCoverFromIcon()" title="Generiraj mističnu naslovnu sliku iz odabrane ikone - radi na WhatsAppu, Facebooku, itd.">
          ✨ Generiraj iz ikone
        </button>
        <button type="button" class="ap-btn ap-btn-cancel" onclick="shrinkExistingCover()" title="Dohvati postojeću naslovnu sliku, smanji je i postavi natrag - za slike uploadane prije nego je smanjivanje uvedeno">
          ⚡ Smanji sliku
        </button>
        <span id="img-filename" style="font-family:'Atkinson Hyperlegible',sans-serif;color:var(--text-muted);font-size:0.9rem">
          ${p && p.imageUrl ? 'Slika učitana' : 'Nema odabrane slike'}
        </span>
      </div>
      <p style="font-family:'Atkinson Hyperlegible',sans-serif;font-style:italic;color:var(--text-muted);font-size:0.85rem;margin:0.5rem 0 0">
        Slike se pri uploadu automatski smanje (najviše 1600 px, oko 900 KB). Naslovna slika veća od 1,5 MB
        usporava i trza cijelu stranicu - blog i početnu - pa je smanji gumbom „⚡ Smanji sliku".
      </p>
      <input type="hidden" id="ed-img" value="${p && p.imageUrl ? esc(p.imageUrl) : ''}">
      <img id="img-prev" class="img-preview-thumb"
        src="${p && p.imageUrl ? p.imageUrl : ''}"
        style="${p && p.imageUrl ? 'display:block' : 'display:none'}">
      ${p && p.imageUrl ? `<button class="ap-btn ap-btn-del" style="margin-top:0.5rem;padding:0.3rem 0.8rem;font-size:0.68rem" onclick="clearBlogImage()">✕ Ukloni sliku</button>` : ''}
    </div>

    <div class="af"><label>Kratki opis (na kartici)</label>
      <textarea id="ed-exc" rows="2">${p ? esc(p.excerpt) : ''}</textarea>
    </div>

    <div class="af">
      <label>Sadržaj članka</label>
      <div class="editor-toolbar">
        <button onclick="eCmd('bold')"><b>B</b></button>
        <button onclick="eCmd('italic')"><em>I</em></button>
        <button onclick="wSel('<h2>','</h2>')">Naslov</button>
        <button onclick="wSel('<h3>','</h3>')">Podnaslov</button>
        <button onclick="wSel('<blockquote>','</blockquote>')">❝ Citat</button>
        <button onclick="wSel('<strong>','</strong>')">Masno</button>
        <button onclick="eCmd('insertUnorderedList')">• Popis</button>
        <button onclick="eCmd('insertOrderedList')">1. Popis</button>
        <button onclick="eCmd('insertParagraph')">¶</button>
        <label class="ed-img-upload" title="Ubaci sliku na mjesto kursora" onmousedown="saveEditorSelection(event)">
          🖼 Slika
          <input type="file" accept="image/*" style="display:none" onchange="insertImageInContent(this)">
        </label>
        <span class="ed-img-status"></span>
      </div>
      <div id="blog-content-ed" contenteditable="true" onpaste="handleEditorPaste(event)">
        ${p ? p.content : '<p>Počni pisati ovdje...</p>'}
      </div>
    </div>

    <div class="af">
      <label>Izvori (opcionalno - pojavljuje se ispod članka samo ako napišeš)</label>
      <p style="font-family:'Atkinson Hyperlegible',sans-serif;font-style:italic;color:var(--text-muted);font-size:0.9rem;margin:0.2rem 0 0.5rem">
        Svaki izvor u novi red. Linkovi se automatski pretvaraju u klikabilne. Možeš pisati i čisti tekst (citate radova).
      </p>
      <textarea id="ed-sources" rows="4" placeholder="https://primjer.com/članak&#10;Ime Autora - &quot;Naslov rada&quot;, Časopis, 2024.">${p && p.sources ? esc(p.sources) : ''}</textarea>
    </div>

    <div class="af" style="display:flex;align-items:center;gap:0.8rem;padding:0.8rem;background:rgba(6,8,15,0.3);border:1px solid var(--border)">
      <label class="home-toggle">
        <input type="checkbox" id="ed-archived" ${p && p.archived ? 'checked' : ''}>
        <span>🗄 Arhivirano (skriveno od posjetitelja)</span>
      </label>
    </div>

    <div class="ap-actions">
      <button class="ap-btn ap-btn-save"   onclick="savePost()">Spremi</button>
      ${!isNew ? `<button class="ap-btn ap-btn-del" onclick="deletePost('${p.id}')">Obriši</button>` : ''}
      <button class="ap-btn ap-btn-cancel" onclick="cancelPostEdit()">Odustani</button>
    </div>`;

  initTagsForPost(p);
  if (p && p.imageUrl) warnIfCoverHuge(p.imageUrl);
}

/* === TAG INPUT (chip-style) === */
let editingTags = [];

function initTagsForPost(p) {
  if (p && Array.isArray(p.tags)) {
    editingTags = p.tags.slice();
  } else if (p && p.category) {
    // Migracija: stara polja category → prvi tag
    editingTags = [p.category];
  } else {
    editingTags = [];
  }
  renderTagChips();
}

function renderTagChips() {
  const c = document.getElementById('tag-chips-container');
  if (!c) return;
  c.innerHTML = editingTags.map((t, i) =>
    `<span class="tag-chip-pill">${esc(t)}<button type="button" onclick="removeTagAt(${i})" aria-label="Ukloni tag">×</button></span>`
  ).join('');
}

function handleTagKey(e) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    commitTagInput();
  } else if (e.key === 'Backspace' && !e.target.value && editingTags.length) {
    editingTags.pop();
    renderTagChips();
  }
}

function commitTagInput() {
  const inp = document.getElementById('ed-tag-text');
  if (!inp) return;
  const val = inp.value.trim().replace(/,/g, '');
  if (val && !editingTags.some(t => t.toLowerCase() === val.toLowerCase())) {
    editingTags.push(val);
  }
  inp.value = '';
  renderTagChips();
}

function removeTagAt(i) {
  editingTags.splice(i, 1);
  renderTagChips();
}

function selectBlogEmoji(emoji, el) {
  document.getElementById('ed-icon').value = emoji;
  document.getElementById('blog-icon-preview').textContent = emoji;
  document.querySelectorAll('#blog-editor-col .ep-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

async function handleBlogImageUpload(input) {
  const file = input.files[0];
  if (!file) return;
  const status = document.getElementById('img-filename');
  status.style.color = '';
  status.textContent = '⏳ Pripremam sliku...';

  try {
    // Smanjivanje se radi ovdje (a ne unutar uploada) da znamo KOLIKA je slika
    // na kraju - Jana tako uvijek vidi brojku, a ne samo "gotovo".
    const small = await prepareImageForUpload(file);
    const url   = await uploadToImgBB(small, { raw: true, onStatus: t => { status.textContent = t; } });
    document.getElementById('ed-img').value           = url;
    document.getElementById('img-prev').src           = url;
    document.getElementById('img-prev').style.display = 'block';
    // Vecina slika ovdje zavrsi ispod 900 KB. Prode li ipak nesto veliko
    // (animirani GIF, SVG, format koji preglednik ne zna otvoriti), neka to
    // bude ODMAH jasno - inace se veliki naslovni GIF objavi neprimijeceno.
    if (small.size > COVER_WARN_BYTES) {
      status.style.color = '#e0b070';
      status.textContent = hugeCoverMsg(small.size);
    } else {
      status.textContent = '✅ ' + file.name + ' (' + fmtBytes(small.size) + ')';
    }
  } catch(e) {
    status.style.color = '#e07070';
    status.textContent = '❌ ' + (e && e.message ? e.message : 'Greška – pokušaj ponovo');
  }
}

/* ============================================================
   POSTOJECE NASLOVNE SLIKE (uploadane prije nego je smanjivanje uvedeno)
   ------------------------------------------------------------
   Slika od 8160x6120 (50 MP, 16 MB) izgleda na kartici jednako kao ona od
   1600 px, ali preglednik je mora skinuti i dekodirati u cijelosti - zbog
   toga se blog i slide "najnoviji clanci" trzaju, a slika se pri prvom
   otvaranju iscrtava red po red. Novi upload se sam smanji
   (prepareImageForUpload), a za vec postavljene slike sluzi gumb
   "Smanji sliku": dohvati sliku s ImgBB-a (salje Access-Control-Allow-Origin
   pa je smijemo procitati), provuce je kroz isto smanjivanje i vrati natrag
   kao novu sliku. Stara ostaje na ImgBB-u, samo je clanak vise ne koristi.
   ============================================================ */
function fmtBytes(n) {
  return n >= 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB'
                      : Math.round(n / 1024) + ' KB';
}

const COVER_WARN_BYTES = 1.5 * 1024 * 1024;

/* Upozorenje mora reci POSLJEDICU, ne samo broj megabajta - "slika je velika"
   se lako preskoci kao sitnica, a rezultat je stranica koja se trza. */
function hugeCoverMsg(bytes) {
  return '⚠ PREVELIKA SLIKA (' + fmtBytes(bytes) + ') - zbog nje šteka cijela stranica '
       + '(blog i početna se trzaju, slika se otvara red po red). '
       + 'Klikni „⚡ Smanji sliku" pa spremi.';
}

async function warnIfCoverHuge(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: uploadTimeoutSignal(15000) });
    const len = Number(res.headers.get('content-length') || 0);
    if (!len || len < COVER_WARN_BYTES) return;
    const el = document.getElementById('img-filename');
    // Uredivac se u meduvremenu mogao zatvoriti ili prebaciti na drugi clanak.
    if (!el || document.getElementById('ed-img').value !== url) return;
    el.textContent = hugeCoverMsg(len);
    el.style.color = '#e0b070';
  } catch (e) {}
}

async function shrinkExistingCover() {
  const urlEl  = document.getElementById('ed-img');
  const status = document.getElementById('img-filename');
  const url    = (urlEl.value || '').trim();
  status.style.color = '';
  if (!url) { status.textContent = 'Nema naslovne slike za smanjivanje.'; return; }

  status.textContent = '⏳ Dohvaćam sliku...';
  try {
    // Dulji rok nego kod uploada: ovdje se SKIDA original, a upravo takve
    // slike su i po 16 MB.
    const res = await fetch(url, { signal: uploadTimeoutSignal(120000) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const blob   = await res.blob();
    const before = blob.size;
    const name   = (url.split('/').pop() || 'naslovna.jpg').split('?')[0];
    const file   = new File([blob], name, { type: blob.type || 'image/jpeg' });

    status.textContent = '⏳ Smanjujem...';
    const small = await prepareImageForUpload(file);
    if (small.size >= before) {
      // GIF i SVG prolaze nedirnuti (animacija, odnosno vektor) pa se velik GIF
      // ovdje ne moze smanjiti - bez ove grane bi Jana dobila "vec je dovoljno
      // mala" na slici koju je maloprije upozorenje proglasilo prevelikom.
      if (before > COVER_WARN_BYTES) {
        status.style.color = '#e0b070';
        status.textContent = '⚠ Ovu sliku ne mogu smanjiti (' + fmtBytes(before) + ') - GIF i SVG '
                           + 'se ne diraju zbog animacije. Spremi je kao JPG pa uploadaj ponovo.';
      } else {
        status.textContent = '✅ Slika je već dovoljno mala (' + fmtBytes(before) + ') - nema što smanjivati.';
      }
      return;
    }

    const newUrl = await uploadToImgBB(small, { raw: true, onStatus: t => { status.textContent = t; } });
    urlEl.value = newUrl;
    document.getElementById('img-prev').src           = newUrl;
    document.getElementById('img-prev').style.display = 'block';
    status.textContent = '✅ ' + fmtBytes(before) + ' → ' + fmtBytes(small.size) + ' - spremi članak pa „↓ Spremi"';
  } catch (e) {
    status.style.color = '#e07070';
    status.textContent = '❌ ' + (e && e.message ? e.message : 'Smanjivanje nije uspjelo.');
  }
}

function clearBlogImage() {
  document.getElementById('ed-img').value            = '';
  document.getElementById('img-prev').style.display  = 'none';
  document.getElementById('img-filename').textContent = 'Nema odabrane slike';
}

/* Selection u contenteditable se gubi čim user otvori file dialog (fokus
   prelazi na OS prozor). Zato moramo zapamtiti raspon PRIJE nego dialog otvori,
   pa ga vratiti kasnije kad ubacujemo sliku. */
let _savedEditorRange = null;

function saveEditorSelection(evt, edId) {
  const ed = document.getElementById(edId || 'blog-content-ed');
  if (!ed) return;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) {
    _savedEditorRange = null;
    return;
  }
  const range = sel.getRangeAt(0);
  if (ed.contains(range.commonAncestorContainer)) {
    _savedEditorRange = range.cloneRange();
  } else {
    _savedEditorRange = null;
  }
}

function restoreEditorSelection(edId) {
  const ed = document.getElementById(edId || 'blog-content-ed');
  if (!ed) return false;
  ed.focus();
  if (!_savedEditorRange) {
    // Nije bilo kursora u editoru - stavi na kraj
    const range = document.createRange();
    range.selectNodeContents(ed);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  }
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(_savedEditorRange);
  return true;
}

/* Ubaci sliku u tijelo članka - uploada na ImgBB i umetne <img> točno na
   mjestu gdje je kursor bio kad je user kliknuo gumb.

   ZASTO OVAKO: ranije se ubacivao placeholder <p id="..."> pa se poslije
   tražio preko getElementById. Chrome kod execCommand('insertHTML') takav
   odlomak normalizira u <span> i USPUT BACI id - element se onda više nije
   mogao naći, pa je natpis "Uploadam sliku..." zauvijek ostajao u članku
   i kad je upload odavno uspio (a ni poruka o grešci se nije imala gdje
   ispisati). Zato se sada odmah ubaci prava <figure> sa slikom iz same
   datoteke (blob URL): figure, class i src PREŽIVLJAVAJU insertHTML, pa je
   src ujedno pouzdana oznaka po kojoj sliku poslije nađemo i zamijenimo
   pravim ImgBB URL-om. Jana usput odmah vidi gdje je slika sjela.
   Status uploada ide u alatnu traku (sticky pa je uvijek na ekranu), a ne u
   tekst članka - tako se ni u jednom scenariju ne može objaviti. */
async function insertImageInContent(input, edId) {
  const file = input.files[0];
  if (!file) return;

  const ed      = document.getElementById(edId || 'blog-content-ed');
  const toolbar = input.closest('.editor-toolbar');
  const status  = toolbar ? toolbar.querySelector('.ed-img-status') : null;
  const note    = (txt, isErr) => {
    if (!status) return;
    status.textContent = txt;
    status.style.color = isErr ? '#e07070' : '';
  };

  restoreEditorSelection(edId);
  const previewUrl = URL.createObjectURL(file);
  document.execCommand('insertHTML', false,
    `<figure class="post-inline-img"><img src="${previewUrl}" alt=""></figure><p>&nbsp;</p>`);
  _savedEditorRange = null;

  const findImg = () => (ed ? ed.querySelector(`img[src="${previewUrl}"]`) : null);

  try {
    const url = await uploadToImgBB(file, { onStatus: note });
    const img = findImg();
    if (img) {
      img.src = url;
    } else if (ed) {
      // Privremena slika je u međuvremenu obrisana - ne bacaj upload, dodaj na kraj.
      ed.insertAdjacentHTML('beforeend',
        `<figure class="post-inline-img"><img src="${url}" alt=""></figure><p>&nbsp;</p>`);
    }
    note('✅ Slika je dodana');
    setTimeout(() => {
      if (status && status.textContent === '✅ Slika je dodana') note('');
    }, 5000);
  } catch (e) {
    // Makni privremenu sliku - blob URL ionako ne preživi spremanje članka.
    const img = findImg();
    if (img) {
      const fig = img.closest('figure') || img;
      if (fig.parentNode) fig.parentNode.removeChild(fig);
    }
    note('❌ ' + (e && e.message ? e.message : 'Slika nije uploadana, pokušaj ponovo.'), true);
  } finally {
    URL.revokeObjectURL(previewUrl);
    input.value = '';
  }
}

/* Generira mističnu PNG naslovnu sliku iz odabrane ikone + naslova članka.
   Renderira se na canvasu u browseru (besplatno, neograničeno), uploada na
   ImgBB i URL ide u članak. Dobiveni PNG radi kao OG preview na WhatsAppu,
   Facebooku, Instagramu - svuda gdje SVG previewi ne rade pouzdano. */
async function generateCoverFromIcon() {
  const icon  = (document.getElementById('ed-icon').value  || '✦').trim();
  const title = (document.getElementById('ed-title').value || 'Alkemijana').trim();
  const date  = (document.getElementById('ed-date').value  || '').trim();
  const cat   = editingTags[0] || '';

  const filenameEl = document.getElementById('img-filename');
  filenameEl.textContent = '✨ Generiram sliku...';

  try {
    if (document.fonts && document.fonts.load) {
      await Promise.all([
        document.fonts.load('600 56px "Playfair Display"'),
        document.fonts.load('600 22px "Quicksand"')
      ]);
    }
    const blob = await renderCoverCanvas({ icon, title, date, category: cat });
    filenameEl.textContent = '⏳ Uploadam sliku...';
    const file = new File([blob], `cover-${Date.now()}.png`, { type: 'image/png' });
    const url  = await uploadToImgBB(file, { raw: true });

    document.getElementById('ed-img').value           = url;
    document.getElementById('img-prev').src           = url;
    document.getElementById('img-prev').style.display = 'block';
    filenameEl.textContent = '✅ Slika generirana iz ikone';
  } catch (e) {
    console.error(e);
    filenameEl.textContent = '❌ Greška pri generiranju - pokušaj ponovo';
  }
}

/* Dohvati Apple-stil emoji sliku s emojicdn.elk.sh - radi za sve emoji unicode.
   Vraća HTMLImageElement koji se može nacrtati na canvas. */
function loadAppleEmojiImage(emoji) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('emoji image load failed'));
    img.src = `https://emojicdn.elk.sh/${encodeURIComponent(emoji)}?style=apple`;
  });
}

async function renderCoverCanvas({ icon, title, date, category }) {
  const W = 1200, H = 630;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createRadialGradient(W/2, H*0.35, 0, W/2, H*0.35, 750);
  bg.addColorStop(0, '#1c1840');
  bg.addColorStop(0.55, '#0e0c24');
  bg.addColorStop(1, '#06080f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const seed = [...title].reduce((a, c) => a + c.charCodeAt(0), 0) || 1;
  let rng = seed;
  const rand = () => { rng = (rng * 9301 + 49297) % 233280; return rng / 233280; };

  ctx.textBaseline = 'alphabetic';
  for (let i = 0; i < 90; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const r = 0.5 + rand() * 1.8;
    ctx.globalAlpha = 0.25 + rand() * 0.55;
    ctx.fillStyle = '#d8d4ec';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.textAlign = 'left';
  for (let i = 0; i < 7; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const size = 14 + rand() * 18;
    ctx.globalAlpha = 0.2 + rand() * 0.3;
    ctx.fillStyle = '#a890d0';
    ctx.font = `${size}px serif`;
    ctx.fillText('✦', x, y);
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const cx = W/2, cy = 240;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 240);
  glow.addColorStop(0, 'rgba(168,144,208,0.55)');
  glow.addColorStop(0.6, 'rgba(168,144,208,0.12)');
  glow.addColorStop(1, 'rgba(168,144,208,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, 240, 0, Math.PI * 2);
  ctx.fill();

  // Emoji se na različitim OS-ovima renderira drugačije (Windows je flat/crveniji,
   // Apple je glossy/ružičast). Dohvatimo Apple-stil sliku s CDN-a da rezultat
   // bude konzistentan bez obzira s kojeg uređaja admin generira cover.
  const emojiSize = 240;
  try {
    const emojiImg = await loadAppleEmojiImage(icon);
    ctx.drawImage(emojiImg, cx - emojiSize/2, cy - emojiSize/2, emojiSize, emojiSize);
  } catch (e) {
    // Fallback: nativni canvas rendering ako CDN ne radi
    ctx.font = '220px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", sans-serif';
    ctx.fillStyle = '#e4e0f4';
    ctx.fillText(icon, cx, cy);
  }

  const grad = ctx.createLinearGradient(W*0.22, 0, W*0.78, 0);
  grad.addColorStop(0, 'rgba(168,144,208,0)');
  grad.addColorStop(0.5, 'rgba(168,144,208,0.7)');
  grad.addColorStop(1, 'rgba(168,144,208,0)');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W*0.22, 370);
  ctx.lineTo(W*0.78, 370);
  ctx.stroke();

  ctx.font = '600 56px "Playfair Display", Georgia, serif';
  ctx.fillStyle = '#e4e0f4';
  const lines = wrapCanvasText(ctx, title, W * 0.82, 2);
  const titleTop = lines.length === 1 ? 460 : 440;
  const lineH = 66;
  lines.forEach((line, i) => {
    ctx.fillText(line, cx, titleTop + i * lineH);
  });

  const meta = [date, category].filter(Boolean).join('   •   ').toUpperCase();
  if (meta) {
    ctx.font = '600 22px "Quicksand", "Helvetica Neue", sans-serif';
    ctx.fillStyle = '#a890d0';
    ctx.fillText(meta, cx, H - 50);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('canvas.toBlob failed')), 'image/png');
  });
}

function wrapCanvasText(ctx, text, maxWidth, maxLines) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines - 1) break;
    } else {
      cur = test;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(last + '…').width > maxWidth && last.length > 1) {
      last = last.slice(0, -1);
    }
    if (last !== lines[maxLines - 1]) lines[maxLines - 1] = last.trim() + '…';
  }
  return lines;
}

function spaceLetters(s, px) {
  return s.split('').join(String.fromCharCode(8202).repeat(Math.max(1, Math.round(px/2))));
}

function cancelPostEdit() {
  editingPostId = null;
  renderBlogAdminList();
  document.getElementById('blog-editor-col').innerHTML =
    '<p style="color:var(--text-muted);font-family:\'Atkinson Hyperlegible\',sans-serif;font-style:italic;font-size:1.1rem;margin-top:2rem;text-align:center">Odaberi članak za uređivanje ili dodaj novi.</p>';
}

/* Rich-text toolbar naredbe - edId je id contenteditable elementa;
   default 'blog-content-ed' (blog), a vodiči šalju 'guide-content-ed'. */
function eCmd(cmd, edId) {
  document.getElementById(edId || 'blog-content-ed').focus();
  document.execCommand(cmd, false);
}

function wSel(open, close, edId) {
  const ed  = document.getElementById(edId || 'blog-content-ed');
  const sel = window.getSelection();
  ed.focus();
  if (sel && sel.rangeCount) {
    const t = sel.getRangeAt(0).toString();
    document.execCommand('insertHTML', false, t ? open + t + close : open + 'Tekst' + close);
  }
}

/* Strip svih inline stilova (font-size, font-family, color iz Worda/Docsa),
   svih event-handler atributa (onclick, onerror...) i opasnih URL shema
   (javascript:, data: osim slika). Zadržava strukturu (p, h2, h3, strong,
   b, em, i, u, blockquote, figure, img, a, ul, ol, li, br). */
function sanitizeContentHtml(html) {
  // Parsiranje ide u INERTNI dokument, ne u <div> žive stranice. Razlog: čim se
  // nesiguran HTML ubaci u element ovog dokumenta, preglednik odmah krene dohvaćati
  // resurse, pa <img src=nepostojeci onerror=...> može opaliti PRIJE nego što petlja
  // niže ukloni atribut - čišćenje bi bilo utrka s preglednikom. U dokumentu iz
  // createHTMLDocument resursi se ne učitavaju i rukovatelji se ne pokreću.
  const inert = document.implementation.createHTMLDocument('');
  const tmp = inert.createElement('div');
  tmp.innerHTML = html;

  const allowedTags = new Set(['P','H2','H3','H4','STRONG','B','EM','I','U','BR','BLOCKQUOTE','FIGURE','IMG','A','UL','OL','LI','DIV','SPAN']);
  // Per-tag whitelist atributa - sve ostalo (uključujući on* event handleri) se briše
  const allowedAttrs = {
    A:      ['href','title','target','rel'],
    IMG:    ['src','alt','title','width','height'],
    FIGURE: [],
    SPAN:   ['style'],
    P:[], H2:[], H3:[], H4:[], STRONG:[], B:[], EM:[], I:[], U:[], BR:[],
    BLOCKQUOTE:[], UL:[], OL:[], LI:[], DIV:[]
  };
  const stripStyleProps = ['font-size','font-family','line-height','color','background','background-color','font-weight','font-style'];

  const safeUrl = (val, kind) => {
    if (!val) return false;
    const raw = String(val).toLowerCase();
    // Ukloni sve kontrolne znakove i whitespace prije provjere - sprječava
    // bypass tipa "java[tab]script:" ili "java script:"
    let clean = '';
    for (let i = 0; i < raw.length; i++) {
      if (raw.charCodeAt(i) > 32) clean += raw[i];
    }
    if (kind === 'href') {
      return clean.startsWith('http://') || clean.startsWith('https://') ||
             clean.startsWith('mailto:') || clean.startsWith('tel:') ||
             clean.startsWith('#') || clean.startsWith('/');
    }
    if (kind === 'src') {
      return clean.startsWith('http://') || clean.startsWith('https://') ||
             clean.startsWith('data:image/');
    }
    return false;
  };

  const walk = (node) => {
    const children = [...node.childNodes];
    children.forEach(child => {
      if (child.nodeType === 8) { // komentar
        child.parentNode.removeChild(child);
        return;
      }
      if (child.nodeType !== 1) return; // ne-element
      const tag = child.tagName;
      if (!allowedTags.has(tag)) {
        // zamijeni s child contentom (unwrap)
        while (child.firstChild) child.parentNode.insertBefore(child.firstChild, child);
        child.parentNode.removeChild(child);
        return;
      }
      // Drži samo atribute s whitelist-e (sve on* je automatski uklonjeno)
      const allowed = allowedAttrs[tag] || [];
      [...child.attributes].forEach(attr => {
        if (!allowed.includes(attr.name.toLowerCase())) {
          child.removeAttribute(attr.name);
        }
      });
      // Validiraj URL-ove
      if (tag === 'A' && child.hasAttribute('href') && !safeUrl(child.getAttribute('href'), 'href')) {
        child.removeAttribute('href');
      }
      if (tag === 'IMG') {
        if (!child.hasAttribute('src') || !safeUrl(child.getAttribute('src'), 'src')) {
          child.parentNode.removeChild(child);
          return;
        }
      }
      // Sigurnost za target=_blank
      if (tag === 'A' && (child.getAttribute('target') || '').toLowerCase() === '_blank') {
        child.setAttribute('rel', 'noopener noreferrer');
      }
      // Očisti inline style (samo SPAN ga može imati prema whitelist-u)
      if (child.hasAttribute('style')) {
        stripStyleProps.forEach(p => {
          if (child.style[p.replace(/-([a-z])/g, (_, c) => c.toUpperCase())]) {
            child.style.removeProperty(p);
          }
        });
        const s = child.getAttribute('style') || '';
        // Ukloni style koji sadrži expression(), javascript:, ili HTML znakove
        if (!s.trim() || /expression\s*\(|javascript:|<|>/i.test(s)) {
          child.removeAttribute('style');
        }
      }
      // SPAN bez stila je suvišan - unwrap
      if (tag === 'SPAN' && !child.hasAttribute('style')) {
        while (child.firstChild) child.parentNode.insertBefore(child.firstChild, child);
        child.parentNode.removeChild(child);
        return;
      }
      walk(child);
    });
  };
  walk(tmp);
  return tmp.innerHTML;
}

/* Paste handler - ubaci samo plain text (ili minimalno očišćen HTML),
   bez Word/Docs inline stilova. */
function handleEditorPaste(e) {
  e.preventDefault();
  const cd = e.clipboardData || window.clipboardData;
  if (!cd) return;
  // Probaj HTML, ako postoji sanitiziraj; inače plain text
  const html = cd.getData('text/html');
  if (html) {
    const clean = sanitizeContentHtml(html);
    document.execCommand('insertHTML', false, clean);
  } else {
    const text = cd.getData('text/plain') || '';
    document.execCommand('insertText', false, text);
  }
}

function savePost() {
  const title = (document.getElementById('ed-title').value || '').trim();
  if (!title) { alert('Naslov je obavezan.'); return; }

  // Commit-aj zadnji untyped tag prije spremanja
  commitTagInput();

  const id = editingPostId === '__new__'
    ? title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-')
    : editingPostId;

  const seriesName = (document.getElementById('ed-series').value || '').trim();
  const seriesPartRaw = document.getElementById('ed-series-part').value;
  const seriesPart = seriesPartRaw ? parseInt(seriesPartRaw, 10) : null;

  const pd = {
    id, title,
    date:       (document.getElementById('ed-date').value || '').trim(),
    tags:       editingTags.slice(),
    icon:       (document.getElementById('ed-icon').value || '✦').trim(),
    imageUrl:   document.getElementById('ed-img').value || '',
    excerpt:    (document.getElementById('ed-exc').value  || '').trim(),
    content:    sanitizeContentHtml(document.getElementById('blog-content-ed').innerHTML),
    sources:    (document.getElementById('ed-sources').value || '').trim(),
    series:     seriesName,
    seriesPart: seriesPart && seriesPart > 0 ? seriesPart : null,
    archived:   document.getElementById('ed-archived').checked,
  };

  if (editingPostId === '__new__') BLOG_POSTS.unshift(pd);
  else {
    const idx = BLOG_POSTS.findIndex(p => p.id === editingPostId);
    if (idx >= 0) BLOG_POSTS[idx] = pd;
  }

  editingPostId = pd.id;
  document.getElementById('blog-grid').innerHTML = '';
  renderBlogList();
  renderHomeBlogPreview();
  renderBlogAdminList();
  alert('Članak je spremljen!');
}

function deletePost(id) {
  if (!confirm('Sigurno želite obrisati ovaj članak?')) return;
  BLOG_POSTS.splice(BLOG_POSTS.findIndex(p => p.id === id), 1);
  editingPostId = null;
  document.getElementById('blog-grid').innerHTML = '';
  renderBlogList();
  renderHomeBlogPreview();
  cancelPostEdit();
}

/* ============================================================
   UPUTE ZA ALATE - vodiči na stranici Astro alati (iznad FAQ-a)
   Fiksna 4 vodiča (po jedan za svaki alat) - uređuju se kao blog
   članci (isti rich-text editor), arhiviranje ih skriva sa stranice.
   Ne mogu se dodavati ni brisati (svaki alat ima točno jedan vodič).
   ============================================================ */

const GUIDE_MODE_LABELS = {
  natal:    'Natalna karta',
  synastry: 'Sinastrija',
  transit:  'Tranziti',
  acg:      'Astrokartografija'
};

function guidesData() {
  return (typeof TOOL_GUIDES !== 'undefined' && Array.isArray(TOOL_GUIDES)) ? TOOL_GUIDES : [];
}

function renderGuidesAdminList() {
  const el = document.getElementById('guides-admin-list');
  if (!el) return;
  el.innerHTML = guidesData().map(g => `
    <div class="bpi ${editingGuideId === g.id ? 'sel' : ''} ${g.archived ? 'archived-item' : ''}"
      onclick="loadGuideEditor('${g.id}')">
      <div class="bpi-t">${g.archived ? '🗄 ' : ''}${g.icon || '✦'} ${esc(GUIDE_MODE_LABELS[g.mode] || g.mode)}</div>
      <div class="bpi-m">${esc(g.title)}</div>
    </div>`
  ).join('');
}

function loadGuideEditor(id) {
  editingGuideId = id;
  renderGuidesAdminList();
  showGuideEditor(guidesData().find(g => g.id === id));
}

function selectGuideEmoji(emoji, el) {
  document.getElementById('gd-icon').value = emoji;
  document.getElementById('guide-icon-preview').textContent = emoji;
  document.querySelectorAll('#guide-editor-col .ep-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

function showGuideEditor(g) {
  if (!g) return;
  const icon = g.icon || '✦';

  document.getElementById('guide-editor-col').innerHTML = `
    <h3>Upute - ${esc(GUIDE_MODE_LABELS[g.mode] || g.mode)}</h3>

    <div class="af"><label>Naslov vodiča</label>
      <input id="gd-title" value="${esc(g.title)}"></div>

    <div class="af"><label>Ikona - odabrana: <span id="guide-icon-preview" style="font-size:1.3rem;vertical-align:middle">${icon}</span></label>
      <input id="gd-icon" value="${esc(icon)}" style="display:none">
      ${buildEmojiPicker(icon, 'selectGuideEmoji')}
    </div>

    <div class="af"><label>Kratki opis (vidljiv na zatvorenoj kartici)</label>
      <textarea id="gd-exc" rows="2">${esc(g.excerpt || '')}</textarea>
    </div>

    <div class="af">
      <label>Sadržaj vodiča</label>
      <div class="editor-toolbar">
        <button onclick="eCmd('bold','guide-content-ed')"><b>B</b></button>
        <button onclick="eCmd('italic','guide-content-ed')"><em>I</em></button>
        <button onclick="wSel('<h2>','</h2>','guide-content-ed')">Naslov</button>
        <button onclick="wSel('<h3>','</h3>','guide-content-ed')">Podnaslov</button>
        <button onclick="wSel('<blockquote>','</blockquote>','guide-content-ed')">❝ Citat</button>
        <button onclick="wSel('<strong>','</strong>','guide-content-ed')">Masno</button>
        <button onclick="eCmd('insertUnorderedList','guide-content-ed')">• Popis</button>
        <button onclick="eCmd('insertOrderedList','guide-content-ed')">1. Popis</button>
        <button onclick="eCmd('insertParagraph','guide-content-ed')">¶</button>
        <label class="ed-img-upload" title="Ubaci sliku na mjesto kursora" onmousedown="saveEditorSelection(event,'guide-content-ed')">
          🖼 Slika
          <input type="file" accept="image/*" style="display:none" onchange="insertImageInContent(this,'guide-content-ed')">
        </label>
        <span class="ed-img-status"></span>
      </div>
      <div id="guide-content-ed" contenteditable="true" onpaste="handleEditorPaste(event)">
        ${g.content || '<p>Počni pisati ovdje...</p>'}
      </div>
    </div>

    <div class="af">
      <label>Izvori (opcionalno - pojavljuju se ispod vodiča)</label>
      <p style="font-family:'Atkinson Hyperlegible',sans-serif;font-style:italic;color:var(--text-muted);font-size:0.9rem;margin:0.2rem 0 0.5rem">
        Svaki izvor u novi red. Linkovi se automatski pretvaraju u klikabilne. Možeš pisati i čisti tekst (citate radova).
      </p>
      <textarea id="gd-sources" rows="4" placeholder="https://primjer.com/članak&#10;Ime Autora - &quot;Naslov rada&quot;, Izdavač, 2024.">${esc(g.sources || '')}</textarea>
    </div>

    <div class="af" style="display:flex;align-items:center;gap:0.8rem;padding:0.8rem;background:rgba(6,8,15,0.3);border:1px solid var(--border)">
      <label class="home-toggle">
        <input type="checkbox" id="gd-archived" ${g.archived ? 'checked' : ''}>
        <span>🗄 Sakrij sa stranice (vodič se ne prikazuje posjetiteljima)</span>
      </label>
    </div>

    <div class="ap-actions">
      <button class="ap-btn ap-btn-save"   onclick="saveGuide()">Spremi</button>
      <button class="ap-btn ap-btn-cancel" onclick="cancelGuideEdit()">Odustani</button>
    </div>`;
}

function cancelGuideEdit() {
  editingGuideId = null;
  renderGuidesAdminList();
  document.getElementById('guide-editor-col').innerHTML =
    '<p style="color:var(--text-muted);font-family:\'Atkinson Hyperlegible\',sans-serif;font-style:italic;font-size:1.1rem;margin-top:2rem;text-align:center">Odaberi vodič za uređivanje.</p>';
}

function saveGuide() {
  const guides = guidesData();
  const idx = guides.findIndex(g => g.id === editingGuideId);
  if (idx < 0) return;

  const title = (document.getElementById('gd-title').value || '').trim();
  if (!title) { alert('Naslov je obavezan.'); return; }

  guides[idx] = {
    ...guides[idx],
    title,
    icon:     (document.getElementById('gd-icon').value || '✦').trim(),
    excerpt:  (document.getElementById('gd-exc').value || '').trim(),
    content:  sanitizeContentHtml(document.getElementById('guide-content-ed').innerHTML),
    sources:  (document.getElementById('gd-sources').value || '').trim(),
    archived: document.getElementById('gd-archived').checked,
  };

  renderGuidesAdminList();
  if (typeof renderToolGuide === 'function') renderToolGuide();
  alert('Vodič je spremljen! Ne zaboravi kliknuti ↓ Spremi (gore) da promjene odu na stranicu.');
}

/* ============================================================
   USLUGE
   ============================================================ */

function renderSvcAdmin() {
  document.getElementById('svc-admin-list').innerHTML =
    SERVICES.map(s => `
      <div class="spi ${editingSvcId === s.id ? 'sel' : ''} ${s.archived ? 'archived-item' : ''}"
        onclick="loadServiceEditor('${s.id}')">
        <div class="spi-icon">${s.icon}</div>
        <div class="spi-info">
          <div class="spi-name">${s.archived ? '🗄 ' : ''}${s.name}</div>
          <div class="spi-price">${s.showPrice !== false ? s.price + ' €' : ''}${s.showPrice !== false && s.showDuration !== false ? ' · ' : ''}${s.showDuration !== false ? s.duration + ' min' : ''}${s.showPrice === false && s.showDuration === false ? '(skriveno)' : ''}${s.home ? ' · početna' : ''}</div>
        </div>
      </div>`
    ).join('');
}

function newService() {
  editingSvcId = '__new__';
  renderSvcAdmin();
  showServiceEditor(null);
}

function loadServiceEditor(id) {
  editingSvcId = id;
  renderSvcAdmin();
  showServiceEditor(SERVICES.find(s => s.id === id));
}

function selectSvcEmoji(emoji, el) {
  document.getElementById('svc-icon-input').value = emoji;
  document.getElementById('svc-icon-preview').textContent = emoji;
  document.querySelectorAll('#svc-editor-col .ep-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

function showServiceEditor(s) {
  const isNew = !s;
  const icon  = s ? s.icon : '✦';

  document.getElementById('svc-editor-col').innerHTML = `
    <h3>${isNew ? 'Nova usluga' : 'Uredi uslugu'}</h3>

    <div class="af-2">
      <div class="af"><label>Naziv usluge</label>
        <input id="svc-name" value="${s ? esc(s.name) : ''}"></div>
      <div class="af" style="display:flex;flex-direction:column;justify-content:space-between">
        <label style="font-family:'Quicksand',sans-serif;font-size:0.68rem;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:var(--lavender);margin-bottom:0.35rem">Prikaži na početnoj</label>
        <label class="home-toggle">
          <input type="checkbox" id="svc-home" ${s && s.home ? 'checked' : ''}>
          <span>Jedna od 3 istaknute usluge</span>
        </label>
      </div>
    </div>
    <div class="af"><label>Opis</label>
      <textarea id="svc-desc" rows="3">${s ? esc(s.desc) : ''}</textarea>
    </div>
    <div class="af-2">
      <div class="af">
        <label>Cijena (€)</label>
        <input id="svc-price" type="number" min="0" value="${s ? s.price : ''}">
        <label class="home-toggle" style="margin-top:0.5rem">
          <input type="checkbox" id="svc-showprice" ${!s || s.showPrice !== false ? 'checked' : ''}>
          <span>Prikaži cijenu</span>
        </label>
      </div>
      <div class="af">
        <label>Trajanje (min)</label>
        <input id="svc-dur" type="number" min="0" value="${s ? s.duration : '60'}">
        <label class="home-toggle" style="margin-top:0.5rem">
          <input type="checkbox" id="svc-showdur" ${!s || s.showDuration !== false ? 'checked' : ''}>
          <span>Prikaži trajanje</span>
        </label>
      </div>
    </div>
    <div class="af">
      <label>Ikona - odabrana: <span id="svc-icon-preview" style="font-size:1.4rem;vertical-align:middle">${icon}</span></label>
      <input id="svc-icon-input" value="${icon}" style="display:none">
      ${buildEmojiPicker(icon, 'selectSvcEmoji')}
    </div>
    <div class="af" style="display:flex;align-items:center;gap:0.8rem;padding:0.8rem;background:rgba(6,8,15,0.3);border:1px solid var(--border)">
      <label class="home-toggle">
        <input type="checkbox" id="svc-archived" ${s && s.archived ? 'checked' : ''}>
        <span>🗄 Arhivirano (skriveno od posjetitelja)</span>
      </label>
    </div>
    <div class="ap-actions">
      <button class="ap-btn ap-btn-save"   onclick="saveService()">Spremi</button>
      ${!isNew ? `<button class="ap-btn ap-btn-del" onclick="deleteService('${s.id}')">Obriši</button>` : ''}
      <button class="ap-btn ap-btn-cancel" onclick="cancelServiceEdit()">Odustani</button>
    </div>`;
}

function cancelServiceEdit() {
  editingSvcId = null;
  renderSvcAdmin();
  document.getElementById('svc-editor-col').innerHTML =
    '<p style="color:var(--text-muted);font-family:\'Atkinson Hyperlegible\',sans-serif;font-style:italic;font-size:1.1rem;margin-top:2rem;text-align:center">Odaberi uslugu za uređivanje ili dodaj novu.</p>';
}

function saveService() {
  const name = (document.getElementById('svc-name').value || '').trim();
  if (!name) { alert('Naziv je obavezan.'); return; }

  const svcData = {
    id:       editingSvcId === '__new__' ? 's' + Date.now() : editingSvcId,
    icon:     document.getElementById('svc-icon-input').value || '✦',
    name,
    desc:     (document.getElementById('svc-desc').value  || '').trim(),
    price:    (document.getElementById('svc-price').value || '0').trim(),
    duration: (document.getElementById('svc-dur').value   || '60').trim(),
    home:         document.getElementById('svc-home').checked,
    showPrice:    document.getElementById('svc-showprice').checked,
    showDuration: document.getElementById('svc-showdur').checked,
    archived:     document.getElementById('svc-archived').checked,
  };

  if (editingSvcId === '__new__') SERVICES.push(svcData);
  else {
    const idx = SERVICES.findIndex(s => s.id === editingSvcId);
    if (idx >= 0) SERVICES[idx] = svcData;
  }

  editingSvcId = svcData.id;
  renderSvcAdmin();
  renderServices();
  alert('Usluga je spremljena!');
}

function deleteService(id) {
  if (!confirm('Sigurno želite obrisati ovu uslugu?')) return;
  SERVICES.splice(SERVICES.findIndex(s => s.id === id), 1);
  editingSvcId = null;
  renderServices();
  cancelServiceEdit();
}

/* ============================================================
   CJENIK
   ============================================================ */

function renderPricingAdmin() {
  document.getElementById('pricing-admin-list').innerHTML =
    `<div class="pr-item" style="font-family:'Quicksand',sans-serif;font-size:0.72rem;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:var(--lavender)">
       <div>NAZIV</div><div>OPIS</div><div>CIJENA</div><div>ARH.</div><div></div>
     </div>` +
    PRICING.map((r, i) => `
      <div class="pr-item" style="${r.archived ? 'opacity:0.45' : ''}">
        <input value="${esc(r.name)}"  onchange="PRICING[${i}].name=this.value">
        <input value="${esc(r.desc)}"  onchange="PRICING[${i}].desc=this.value">
        <input value="${esc(r.price)}" style="width:60px" onchange="PRICING[${i}].price=this.value">
        <input type="checkbox" title="Arhiviraj" ${r.archived ? 'checked' : ''}
          onchange="PRICING[${i}].archived=this.checked;renderPricingTable()"
          style="accent-color:var(--lavender);width:18px;height:18px;cursor:pointer">
        <button class="ap-btn ap-btn-del" style="padding:0.25rem 0.6rem;font-size:0.68rem"
          onclick="delPricingRow(${i})">✕</button>
      </div>`
    ).join('');
}

function addPricingRow() {
  PRICING.push({ name: 'Nova usluga', desc: 'Opis', price: '0', archived: false });
  renderPricingAdmin();
}

function delPricingRow(i) {
  if (!confirm('Obrisati ovu stavku?')) return;
  PRICING.splice(i, 1);
  renderPricingAdmin();
}

function savePricing() {
  renderPricingTable();
  alert('Cjenik je ažuriran!');
}

/* ============================================================
   RECENZIJE
   ============================================================ */

function renderReviewsAdmin() {
  document.getElementById('rev-admin-list').innerHTML = REVIEWS.map(r => `
    <div class="bpi ${editingRevId === r.id ? 'sel' : ''} ${r.archived ? 'archived-item' : ''}"
      onclick="loadReviewEditor('${r.id}')">
      <div class="bpi-t">${r.archived ? '🗄 ' : ''}${r.author}${r.location ? ' - ' + r.location : ''}</div>
      <div class="bpi-m">${r.section === 'home' ? 'Početna' : 'O meni'}</div>
    </div>`
  ).join('');
}

function newReview() {
  editingRevId = '__new__';
  renderReviewsAdmin();
  showReviewEditor(null);
}

function loadReviewEditor(id) {
  editingRevId = id;
  renderReviewsAdmin();
  showReviewEditor(REVIEWS.find(r => r.id === id));
}

function showReviewEditor(r) {
  const isNew = !r;
  document.getElementById('rev-editor-col').innerHTML = `
    <h3>${isNew ? 'Nova recenzija' : 'Uredi recenziju'}</h3>

    <div class="af-2">
      <div class="af"><label>Ime (npr. MARIJA K.)</label>
        <input id="rev-author" value="${r ? esc(r.author) : ''}"></div>
      <div class="af"><label>Lokacija</label>
        <input id="rev-loc" value="${r ? esc(r.location) : ''}"></div>
    </div>
    <div class="af-2">
      <div class="af"><label>Ocjena (1–5)</label>
        <input id="rev-stars" type="number" min="1" max="5" value="${r ? r.stars : 5}"></div>
      <div class="af"><label>Sekcija</label>
        <select id="rev-section">
          <option value="home"  ${!r || r.section === 'home'  ? 'selected' : ''}>Početna</option>
          <option value="omeni" ${r && r.section === 'omeni' ? 'selected' : ''}>O meni</option>
        </select>
      </div>
    </div>
    <div class="af"><label>Tekst recenzije</label>
      <textarea id="rev-text" rows="4">${r ? esc(r.text) : ''}</textarea>
    </div>
    <div class="af" style="display:flex;align-items:center;gap:0.8rem;padding:0.8rem;background:rgba(6,8,15,0.3);border:1px solid var(--border)">
      <label class="home-toggle">
        <input type="checkbox" id="rev-archived" ${r && r.archived ? 'checked' : ''}>
        <span>🗄 Arhivirano (skriveno od posjetitelja)</span>
      </label>
    </div>
    <div class="ap-actions">
      <button class="ap-btn ap-btn-save"   onclick="saveReview()">Spremi</button>
      ${!isNew ? `<button class="ap-btn ap-btn-del" onclick="deleteReview('${r.id}')">Obriši</button>` : ''}
      <button class="ap-btn ap-btn-cancel" onclick="cancelReviewEdit()">Odustani</button>
    </div>`;
}

function cancelReviewEdit() {
  editingRevId = null;
  renderReviewsAdmin();
  document.getElementById('rev-editor-col').innerHTML =
    '<p style="color:var(--text-muted);font-family:\'Atkinson Hyperlegible\',sans-serif;font-style:italic;font-size:1.1rem;margin-top:2rem;text-align:center">Odaberi recenziju za uređivanje ili dodaj novu.</p>';
}

function saveReview() {
  const author = (document.getElementById('rev-author').value || '').trim();
  if (!author) { alert('Ime je obavezno.'); return; }

  const rd = {
    id:       editingRevId === '__new__' ? 'rev' + Date.now() : editingRevId,
    author,
    location: (document.getElementById('rev-loc').value   || '').trim(),
    stars:    parseInt(document.getElementById('rev-stars').value) || 5,
    section:  document.getElementById('rev-section').value,
    text:     (document.getElementById('rev-text').value  || '').trim(),
    archived: document.getElementById('rev-archived').checked,
  };

  if (editingRevId === '__new__') REVIEWS.push(rd);
  else {
    const idx = REVIEWS.findIndex(r => r.id === editingRevId);
    if (idx >= 0) REVIEWS[idx] = rd;
  }

  editingRevId = rd.id;
  renderReviewsAdmin();
  renderReviews('home',  'home-reviews-grid');
  renderReviews('omeni', 'about-reviews-grid');
  alert('Recenzija je spremljena!');
}

function deleteReview(id) {
  if (!confirm('Sigurno želite obrisati ovu recenziju?')) return;
  REVIEWS.splice(REVIEWS.findIndex(r => r.id === id), 1);
  editingRevId = null;
  renderReviews('home',  'home-reviews-grid');
  renderReviews('omeni', 'about-reviews-grid');
  cancelReviewEdit();
}

/* ============================================================
   NATALNE KARTE - anoniman brojač izrada (samo admin, KV)
   ============================================================ */

async function loadNatalLog() {
  const el = document.getElementById('natallog-display');
  if (!el) return;
  el.innerHTML = '<p style="color:var(--text-muted);font-style:italic;text-align:center;padding:2rem">Učitavam…</p>';

  const pass = sessionStorage.getItem('aj_pass') || '';
  if (!pass) { el.innerHTML = '<p style="color:var(--text-muted)">Sesija je istekla - prijavi se ponovo.</p>'; return; }

  try {
    const res = await fetch('/natal-log?cb=' + Date.now(), { headers: { 'X-Admin-Pass': pass } });
    if (res.status === 403) { sessionStorage.removeItem('aj_pass'); el.innerHTML = '<p style="color:#c08090">Pogrešna lozinka - prijavi se ponovo.</p>'; return; }
    const data = await res.json();
    if (!data.ok) { el.innerHTML = '<p style="color:#c08090">Greška: ' + esc(data.error || 'nepoznata') + '</p>'; return; }

    let html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1rem;margin-bottom:1.5rem">' +
      bigStatCard('Ukupno izrađenih karata', data.total || 0, '☾') +
      bigStatCard('Zadnjih 30 dana', data.last30 || 0, '☾') +
      bigStatCard('Zadnjih 7 dana', data.last7 || 0, '✧') +
      '</div>';

    html += '<p style="color:var(--text-muted);font-style:italic;font-size:0.88rem;margin-bottom:1.2rem">Broje se samo jedinstveni unosi (ista karta se ne broji dvaput). Ne pohranjuju se nikakvi osobni podaci.</p>';
    if (data.note) html += '<p style="color:var(--text-muted);font-style:italic;margin-bottom:1rem">' + esc(data.note) + '</p>';

    html += '<div class="nl-actions">' +
      '<button class="ap-btn" onclick="loadNatalLog()">↻ Osvježi</button>' +
      (data.total ? '<button class="ap-btn nl-clear" onclick="resetNatalCount()">Resetiraj brojač</button>' : '') +
      '</div>';

    el.innerHTML = html;
  } catch (e) {
    el.innerHTML = '<p style="color:var(--text-muted)">Ne mogu dohvatiti brojač (radi samo na objavljenoj stranici, ne lokalno).</p>';
  }
}

async function resetNatalCount() {
  if (!confirm('Resetirati brojač na nulu? Ovo se ne može poništiti.')) return;
  const pass = sessionStorage.getItem('aj_pass') || '';
  try {
    await fetch('/natal-log', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Pass': pass }, body: JSON.stringify({ action: 'reset' }) });
    loadNatalLog();
  } catch (e) { alert('Greška pri resetiranju.'); }
}

function bigStatCard(label, value, icon) {
  return `<div style="background:linear-gradient(135deg,rgba(28,24,64,0.6),rgba(14,12,36,0.8));border:1px solid var(--border);padding:1.5rem 1.2rem;text-align:center;position:relative;overflow:hidden">
    <div style="position:absolute;top:0.5rem;right:0.7rem;font-size:1.2rem;opacity:0.4">${icon}</div>
    <div style="font-family:'Playfair Display',serif;font-size:2.6rem;color:var(--lavender);line-height:1;margin-bottom:0.5rem">${value}</div>
    <div style="font-family:'Quicksand',sans-serif;font-size:0.68rem;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:var(--text-muted)">${label}</div>
  </div>`;
}

function statCard(label, value) {
  return `<div style="background:rgba(6,8,15,0.5);border:1px solid var(--border);padding:1.5rem;text-align:center">
    <div style="font-family:'Playfair Display',serif;font-size:2.2rem;color:var(--lavender);margin-bottom:0.4rem">${value}</div>
    <div style="font-family:'Quicksand',sans-serif;font-size:0.72rem;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:var(--text-muted)">${label}</div>
  </div>`;
}

function getDateStr(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

/* ============================================================
   TEKSTOVI
   ============================================================ */

/* Tekstovi grupirani po sekciji stranice - lakše za pronaći u admin panelu.
   Svaki ključ mora postojati i u TEXTS (data.js) i u applyTexts() (app.js). */
const TEXT_GROUPS = [
  {
    title: 'Navigacija (izbornik)',
    keys: {
      navHome:     'Početna',
      navServices: 'Usluge',
      navAbout:    'O meni',
      navBlog:     'Blog',
      navNatal:    'Astro alati',
      navContact:  'Kontakt'
    }
  },
  {
    title: 'Početna',
    keys: {
      heroDesc:         'Hero - opis',
      servicesTitle:    'Usluge - naslov',
      servicesSub:      'Usluge - podnaslov',
      ctaTitle:         'CTA - naslov',
      ctaText:          'CTA - tekst',
      ctaBtn:           'CTA - gumb',
      reviewsTitle:     'Recenzije - naslov',
      reviewsSub:       'Recenzije - podnaslov',
      blogPreviewTitle: 'Blog pregled - naslov',
      blogPreviewSub:   'Blog pregled - podnaslov',
      blogPreviewBtn:   'Blog pregled - gumb'
    }
  },
  {
    title: 'Stranica Usluge',
    keys: {
      servicesPageTitle: 'Naslov stranice',
      servicesPageSub:   'Podnaslov stranice',
      pricingTitle:      'Cjenik - naslov',
      pricingSub:        'Cjenik - podnaslov',
      servicesCtaTitle:  'CTA - naslov',
      servicesCtaText:   'CTA - tekst',
      servicesCtaBtn:    'CTA - gumb'
    }
  },
  {
    title: 'O meni',
    keys: {
      aboutPageTitle:    'Naslov stranice',
      aboutP1:           'Odlomak 1',
      aboutP2:           'Odlomak 2',
      aboutP3:           'Odlomak 3',
      aboutP4:           'Odlomak 4',
      aboutQuote:        'Citat (između odlomaka)',
      aboutP5:           'Odlomak 5 (nakon citata)',
      aboutReviewsTitle: 'Recenzije - naslov'
    }
  },
  {
    title: 'Moja filozofija',
    keys: {
      philosophyTitle:      'Naslov sekcije',
      valueDiscretionTitle: 'Vrijednost 1 - naslov',
      valueDiscretionText:  'Vrijednost 1 - opis',
      valueHonestyTitle:    'Vrijednost 2 - naslov',
      valueHonestyText:     'Vrijednost 2 - opis',
      valueFreedomTitle:    'Vrijednost 3 - naslov',
      valueFreedomText:     'Vrijednost 3 - opis'
    }
  },
  {
    title: 'Blog stranica',
    keys: {
      blogPageTitle:        'Naslov stranice',
      blogPageSub:          'Podnaslov stranice',
      relatedTitle:         '"Možda će ti se svidjeti" naslov',
      blogSearchPlaceholder: 'Tražilica - placeholder',
      blogBackBtn:          'Gumb "Povratak na blog"',
      blogSourcesTitle:     'Naslov "Izvori"'
    }
  },
  {
    title: 'Astro alati - stranica i forma',
    keys: {
      natalPageTitle:    'Naslov stranice',
      natalPageSub:      'Podnaslov stranice',
      natalBtn:          'Gumb za izračun',
      natalNote:         'Napomena ispod gumba',
      natalPosterTitle:  'Poster kartica - naslov',
      natalPosterText:   'Poster kartica - opis',
      natalPosterBtn:    'Poster kartica - gumb',
      natalWorkingTitle: 'Radna verzija - naslov',
      natalWorkingText:  'Radna verzija - opis',
      natalWorkingBtn:   'Radna verzija - gumb',
      natalPerson1Label: 'Forma - naslov "Prva osoba"',
      natalPerson2Label: 'Forma - naslov "Druga osoba" (sinastrija)',
      natalNameLabel:    'Forma - Ime (oznaka)',
      natalNamePlaceholder: 'Forma - Ime (placeholder)',
      natalPlaceLabel:   'Forma - Mjesto rođenja (oznaka)',
      natalPlacePlaceholder: 'Forma - Mjesto rođenja (placeholder)',
      natalDateLabel:    'Forma - Datum rođenja',
      natalTimeLabel:    'Forma - Vrijeme rođenja',
      natalNoTimeLabel:  'Forma - "Ne znam vrijeme rođenja"',
      natalNodeLabel:    'Forma - "Mjesečev čvor:"',
      natalNodeTrue:     'Forma - čvor "Pravi"',
      natalNodeMean:     'Forma - čvor "Srednji"'
    }
  },
  {
    title: 'Astro alati - kartice (iznad forme)',
    keys: {
      toolCardNatalTitle:    'Natalna karta - naslov',
      toolCardNatalDesc:     'Natalna karta - opis',
      toolCardSynastryTitle: 'Sinastrija - naslov',
      toolCardSynastryDesc:  'Sinastrija - opis',
      toolCardTransitTitle:  'Tranziti - naslov',
      toolCardTransitDesc:   'Tranziti - opis',
      toolCardAcgTitle:      'Astrokartografija - naslov',
      toolCardAcgDesc:       'Astrokartografija - opis'
    }
  },
  {
    title: 'Astro alati - prekidač modova (hint i gumb po alatu)',
    keys: {
      natalModeNatal:    'Prekidač - "Natalna karta"',
      natalModeSynastry: 'Prekidač - "Sinastrija"',
      natalModeTransit:  'Prekidač - "Tranziti"',
      natalModeAcg:      'Prekidač - "Astrokartografija"',
      natalHintSynastry: 'Hint ispod prekidača - Sinastrija',
      natalHintTransit:  'Hint ispod prekidača - Tranziti',
      natalHintAcg:      'Hint ispod prekidača - Astrokartografija',
      natalBtnSynastry:  'Gumb za izračun - Sinastrija',
      natalBtnTransit:   'Gumb za izračun - Tranziti',
      natalBtnAcg:       'Gumb za izračun - Astrokartografija'
    }
  },
  {
    title: 'Astro alati - Upute za korištenje (sadržaj vodiča uređuješ u tabu "Upute za alate")',
    keys: {
      natalGuideReadTime:   'Oznaka "Vrijeme čitanja"',
      natalGuideOpenLabel:  'Tekst za otvaranje vodiča',
      natalGuideCloseLabel: 'Tekst gumba za zatvaranje'
    }
  },
  {
    title: 'Astro alati - Česta pitanja (FAQ, do 15; prazno pitanje se ne prikazuje)',
    keys: {
      natalFaqTitle: 'Naslov FAQ sekcije',
      natalFaqQ1:    '1 - Pitanje',
      natalFaqA1:    '1 - Odgovor',
      natalFaqQ2:    '2 - Pitanje',
      natalFaqA2:    '2 - Odgovor',
      natalFaqQ3:    '3 - Pitanje',
      natalFaqA3:    '3 - Odgovor',
      natalFaqQ4:    '4 - Pitanje',
      natalFaqA4:    '4 - Odgovor',
      natalFaqQ5:    '5 - Pitanje',
      natalFaqA5:    '5 - Odgovor',
      natalFaqQ6:    '6 - Pitanje',
      natalFaqA6:    '6 - Odgovor',
      natalFaqQ7:    '7 - Pitanje',
      natalFaqA7:    '7 - Odgovor',
      natalFaqQ8:    '8 - Pitanje',
      natalFaqA8:    '8 - Odgovor',
      natalFaqQ9:    '9 - Pitanje',
      natalFaqA9:    '9 - Odgovor',
      natalFaqQ10:   '10 - Pitanje',
      natalFaqA10:   '10 - Odgovor',
      natalFaqQ11:   '11 - Pitanje',
      natalFaqA11:   '11 - Odgovor',
      natalFaqQ12:   '12 - Pitanje',
      natalFaqA12:   '12 - Odgovor',
      natalFaqQ13:   '13 - Pitanje',
      natalFaqA13:   '13 - Odgovor',
      natalFaqQ14:   '14 - Pitanje (prazno = ne prikazuje se)',
      natalFaqA14:   '14 - Odgovor',
      natalFaqQ15:   '15 - Pitanje (prazno = ne prikazuje se)',
      natalFaqA15:   '15 - Odgovor'
    }
  },
  {
    title: 'Kontakt',
    keys: {
      contactTitle:         'Naslov',
      contactSub:           'Podnaslov',
      contactEmailLabel:    'Oznaka - Email',
      contactPhoneLabel:    'Oznaka - Telefon',
      contactLocationLabel: 'Oznaka - Lokacija',
      contactLocationValue: 'Lokacija - vrijednost',
      contactLocationNote:  'Lokacija - napomena (sitno)',
      contactFollowLabel:   'Oznaka - Pratite me',
      formNameLabel:        'Forma - Ime i prezime',
      formEmailLabel:       'Forma - Email',
      formPhoneLabel:       'Forma - Telefon',
      formServiceLabel:     'Forma - Usluga (oznaka)',
      formServicePlaceholder: 'Forma - Usluga (prazna opcija)',
      formMessageLabel:     'Forma - Poruka (oznaka)',
      formMessagePlaceholder: 'Forma - Poruka (placeholder)',
      formSubmitBtn:        'Forma - gumb za slanje',
      formSuccessTitle:     'Poruka uspjeha - naslov',
      formSuccessText:      'Poruka uspjeha - tekst'
    }
  },
  {
    title: 'Footer',
    keys: {
      footerCopy:    'Copyright redak',
      footerCredit:  'Kredit (Designed by…)'
    }
  }
];

function allTextKeys() {
  const out = [];
  TEXT_GROUPS.forEach(g => Object.keys(g.keys).forEach(k => out.push(k)));
  return out;
}

function renderTextsAdmin() {
  const wrap = document.getElementById('texts-fields');
  wrap.innerHTML = TEXT_GROUPS.map(group => {
    const fields = Object.keys(group.keys).map(key => {
      const label = group.keys[key];
      const val   = TEXTS[key] == null ? '' : String(TEXTS[key]);
      const long  = val.length > 60;
      const rows  = val.length > 200 ? 5 : (val.length > 100 ? 3 : 2);
      return `
        <div class="af">
          <label>${label}</label>
          ${long
            ? `<textarea id="txt-${key}" rows="${rows}">${esc(val)}</textarea>`
            : `<input id="txt-${key}" value="${esc(val)}">`
          }
        </div>`;
    }).join('');
    return `
      <div class="text-group" style="margin-top:2rem;padding-top:1rem;border-top:1px solid var(--border)">
        <h4 style="font-family:'Quicksand',sans-serif;font-size:0.78rem;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:var(--lavender);margin:0 0 1rem">${group.title}</h4>
        ${fields}
      </div>`;
  }).join('');
}

function saveTexts() {
  allTextKeys().forEach(key => {
    const el = document.getElementById('txt-' + key);
    if (el) TEXTS[key] = el.value;
  });
  applySettings();
  alert('Tekstovi su spremljeni!');
}

/* ============================================================
   TAB: Tarot karte (nazivi + značenja uspravno/obrnuto, po špilu)
   Podaci žive u TAROT_CARD_TEXTS (data.js) da mogu ići kroz isti
   auto-save mehanizam kao ostatak stranice - tarot/ modul ih samo čita.
   ============================================================ */
let tarotAdminDeck = 'rws';

function renderTarotAdmin() {
  renderTarotAdminList();
}

function switchTarotAdminDeck(deckId) {
  collectTarotAdminFields();
  tarotAdminDeck = deckId;
  document.querySelectorAll('.tarot-deck-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('tarot-deck-btn-' + deckId);
  if (btn) btn.classList.add('active');
  renderTarotAdminList();
}

function renderTarotAdminList() {
  const deckId = tarotAdminDeck;
  const deck = TAROT_DECKS.find(d => d.id === deckId);
  const list = document.getElementById('tarot-admin-list');
  if (!deck || !list) return;
  const defs = (typeof tarotDeckCardDefs === 'function') ? tarotDeckCardDefs(deckId) : TAROT_CARD_DEFS;
  list.innerHTML = defs.map(c => {
    const saved = (TAROT_CARD_TEXTS[deckId] && TAROT_CARD_TEXTS[deckId][c.id]) || {};
    const name = saved.name != null ? saved.name : c.name;
    const upright = saved.upright || '';
    const reversed = saved.reversed || '';
    const yesno = saved.yesno || '';
    const img = (typeof tarotCardImage === 'function') ? tarotCardImage(deckId, c.id) : `tarot/assets/decks/${deck.folder}/${c.id}.${deck.ext}`;
    const ynOpt = v => `<option value="${v}"${yesno === v ? ' selected' : ''}>${v || '(bez odgovora)'}</option>`;
    return `
      <div class="tarot-admin-card" data-card="${c.id}">
        <img src="${img}" alt="${esc(name)}" loading="lazy">
        <div class="tarot-admin-fields">
          <div class="af"><label>Naziv</label><input class="tarot-f-name" value="${esc(name)}"></div>
          <div class="af"><label>Odgovor karte (DA / NE / MOŽDA)</label>
            <select class="tarot-f-yesno">${ynOpt('')}${ynOpt('DA')}${ynOpt('NE')}${ynOpt('MOŽDA')}</select></div>
          <div class="af"><label>Značenje - uspravno</label><textarea class="tarot-f-upright" rows="3">${esc(upright)}</textarea></div>
          <div class="af"><label>Značenje - obrnuto</label><textarea class="tarot-f-reversed" rows="3">${esc(reversed)}</textarea></div>
        </div>
      </div>`;
  }).join('');
}

function collectTarotAdminFields() {
  const list = document.getElementById('tarot-admin-list');
  if (!list || !list.children.length) return;
  const deckId = tarotAdminDeck;
  if (!TAROT_CARD_TEXTS[deckId]) TAROT_CARD_TEXTS[deckId] = {};
  list.querySelectorAll('.tarot-admin-card').forEach(el => {
    const id = el.dataset.card;
    TAROT_CARD_TEXTS[deckId][id] = {
      name: el.querySelector('.tarot-f-name').value.trim(),
      yesno: el.querySelector('.tarot-f-yesno').value,
      upright: el.querySelector('.tarot-f-upright').value.trim(),
      reversed: el.querySelector('.tarot-f-reversed').value.trim()
    };
  });
}

function saveTarotAdminTexts() {
  collectTarotAdminFields();
  alert('Značenja karata su spremljena u memoriju. Klikni "↓ Spremi" gore za trajno spremanje na stranicu.');
}

/* ============================================================
   PREUZIMANJE AŽURIRANOG data.js
   ============================================================ */

async function downloadSite() {
  const saveBtn = document.querySelector('[onclick="downloadSite()"]');

  // Auto-generiraj naslovne slike iz emoji ikona za sve aktivne članke koji ih
  // nemaju. Tako WhatsApp / Facebook / Instagram dijeljenje uvijek ima pravi PNG
  // thumbnail bez ručnog rada po članku.
  const needCover = BLOG_POSTS.filter(p => !p.archived && !p.imageUrl && p.icon);
  if (needCover.length > 0) {
    if (saveBtn) saveBtn.disabled = true;
    if (document.fonts && document.fonts.load) {
      try {
        await Promise.all([
          document.fonts.load('600 56px "Playfair Display"'),
          document.fonts.load('600 22px "Quicksand"')
        ]);
      } catch (e) {}
    }
    for (let i = 0; i < needCover.length; i++) {
      const p = needCover[i];
      if (saveBtn) saveBtn.textContent = `✨ Slika ${i + 1}/${needCover.length}...`;
      try {
        const firstTag = (Array.isArray(p.tags) && p.tags[0]) || p.category || '';
        const blob = await renderCoverCanvas({
          icon: p.icon, title: p.title, date: p.date, category: firstTag
        });
        const file = new File([blob], `cover-${p.id}-${Date.now()}.png`, { type: 'image/png' });
        p.imageUrl = await uploadToImgBB(file, { raw: true });
      } catch (e) {
        console.warn('Cover gen failed for', p.id, e);
      }
    }
    if (editingPostId && editingPostId !== '__new__') {
      const ep = BLOG_POSTS.find(x => x.id === editingPostId);
      if (ep) showPostEditor(ep);
    }
  }

  collectTarotAdminFields(); // pokupi neshranjene izmjene iz trenutno otvorenog špila

  // ── PRIVATNOST: isključeno (toggle) i arhivirano NE smije u javni data.js ──
  // Javna datoteka dobiva SAMO vidljivi sadržaj (to je jedino što Google/AI crawleri
  // čitaju). Puni podaci - uključujući skriveno/arhivirano - idu u privatnu KV
  // pohranu preko /save-data, a admin ih pri prijavi vraća uz lozinku (hydrateAdminData).
  // Pravilo: kad je toggle OFF ili je stavka arhivirana, nje NEMA nigdje u javnom izvoru;
  // kad se uključi/odarhivira i spremi, vrati se u javni data.js i normalno je vidljiva.
  const s = SITE_SETTINGS;
  const allGuides  = guidesData();
  const pubPosts   = BLOG_POSTS.filter(p => !p.archived);
  const pubGuides  = allGuides.filter(g => !g.archived);
  const pubSvc     = s.showServices ? SERVICES.filter(x => !x.archived) : [];
  const pubPricing = s.showServices ? PRICING.filter(x => !x.archived) : [];
  const pubReviews = REVIEWS.filter(r => !r.archived &&
    ((r.section === 'home'  && s.showReviews) ||
     (r.section === 'omeni' && s.showAboutReviews)));

  const hasHidden =
    pubPosts.length   !== BLOG_POSTS.length ||
    pubGuides.length  !== allGuides.length  ||
    pubSvc.length     !== SERVICES.length   ||
    pubPricing.length !== PRICING.length    ||
    pubReviews.length !== REVIEWS.length;

  // Puni podaci za privatnu KV pohranu (admin ih vraća pri prijavi)
  const fullData = {
    v: 1,
    blog: BLOG_POSTS, guides: allGuides, services: SERVICES,
    pricing: PRICING, reviews: REVIEWS, settings: SITE_SETTINGS
  };

  const textsJson      = JSON.stringify(TEXTS,            null, 2);
  const settingsJson   = JSON.stringify(SITE_SETTINGS,    null, 2);
  const tarotTextsJson = JSON.stringify(TAROT_CARD_TEXTS, null, 2);

  // Gradi tekst data.js iz zadanih (već filtriranih ili punih) nizova.
  const buildDataJs = (posts, guides, svc, pricing, reviews) => `/* ============================================================
   AlkemiJana - Podaci
   ============================================================ */

// ===ALKEMIJANA:BLOG_POSTS:START===
let BLOG_POSTS = ${JSON.stringify(posts, null, 2)};
// ===ALKEMIJANA:BLOG_POSTS:END===


// ===ALKEMIJANA:TOOL_GUIDES:START===
let TOOL_GUIDES = ${JSON.stringify(guides, null, 2)};
// ===ALKEMIJANA:TOOL_GUIDES:END===


// ===ALKEMIJANA:SERVICES:START===
let SERVICES = ${JSON.stringify(svc, null, 2)};
// ===ALKEMIJANA:SERVICES:END===


// ===ALKEMIJANA:PRICING:START===
let PRICING = ${JSON.stringify(pricing, null, 2)};
// ===ALKEMIJANA:PRICING:END===


// ===ALKEMIJANA:REVIEWS:START===
let REVIEWS = ${JSON.stringify(reviews, null, 2)};
// ===ALKEMIJANA:REVIEWS:END===


// ===ALKEMIJANA:TEXTS:START===
let TEXTS = ${textsJson};
// ===ALKEMIJANA:TEXTS:END===


// ===ALKEMIJANA:SETTINGS:START===
let SITE_SETTINGS = ${settingsJson};
// ===ALKEMIJANA:SETTINGS:END===


// ===ALKEMIJANA:TAROT_CARD_TEXTS:START===
let TAROT_CARD_TEXTS = ${tarotTextsJson};
// ===ALKEMIJANA:TAROT_CARD_TEXTS:END===
`;

  // Javni file = samo vidljivo; puni = sve (za lokalni fallback bez KV-a)
  const content     = buildDataJs(pubPosts, pubGuides, pubSvc, pubPricing, pubReviews);
  const fullContent = buildDataJs(BLOG_POSTS, allGuides, SERVICES, PRICING, REVIEWS);

  if (saveBtn) { saveBtn.textContent = '⏳ Spremam...'; saveBtn.disabled = true; }

  const pass = sessionStorage.getItem('aj_pass') || '';
  if (!pass) {
    alert('❌ Sesija je istekla. Prijavi se ponovo.');
    if (saveBtn) { saveBtn.textContent = '↓ Spremi'; saveBtn.disabled = false; }
    return;
  }

  try {
    const res = await fetch('/save-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Pass': pass },
      body: JSON.stringify({ content, full: fullData, hasHidden })
    });
    const data = await res.json();

    if (data.success) {
      alert('✅ Spremljeno! Stranica se automatski ažurira za ~30 sekundi.');
    } else if (res.status === 403) {
      sessionStorage.removeItem('aj_pass');
      alert('❌ Pogrešna lozinka - prijavi se ponovo.');
    } else {
      alert('❌ Greška: ' + (data.error || 'Nepoznata greška'));
    }
  } catch(e) {
    // Fallback na download ako serverless ne radi (lokalni razvoj). Lokalno nema
    // privatne KV pohrane, pa preuzimamo PUNI data.js da se skriveni sadržaj ne izgubi.
    const blob = new Blob([fullContent], { type: 'text/javascript;charset=utf-8' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = 'data.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    alert('Preuzeto! Zamijenite datoteku js/data.js na vašem hostingu.');
  }

  if (saveBtn) { saveBtn.textContent = '↓ Spremi'; saveBtn.disabled = false; }
}
