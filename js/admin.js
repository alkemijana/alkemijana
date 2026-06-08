/* ============================================================
   AlkemiJana — Admin panel
   Pristup: AlkemiJana.html#admin  (ili index.html#admin)
   Korisničko ime : jana
   Lozinka        : (provjerava se preko /verify-pass — env var ADMIN_PASS)
   ============================================================ */

const ADMIN_USER  = 'jana';
const IMGBB_KEY   = '0d1cce4852e17860ddebe0e15f9ac341';

let isAdmin       = false;
let editingPostId = null;
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
  try {
    const res = await fetch('/verify-pass', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pass: p })
    });
    const data = await res.json().catch(() => ({}));
    ok = res.ok && data.ok === true;
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

async function uploadToImgBB(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result.split(',')[1];
        const formData = new FormData();
        formData.append('key', IMGBB_KEY);
        formData.append('image', base64);
        const res  = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) resolve(data.data.url);
        else reject(new Error(data.error ? data.error.message : 'Upload neuspješan'));
      } catch(e) { reject(e); }
    };
    reader.onerror = () => reject(new Error('Čitanje datoteke neuspješno'));
    reader.readAsDataURL(file);
  });
}

async function handleAboutImageUpload(input) {
  const file = input.files[0];
  if (!file) return;
  try {
    input.parentElement.textContent = '⏳ Uploadam...';
    const url = await uploadToImgBB(file);
    SITE_SETTINGS.aboutImageUrl = url;
    applySettings();
    input.parentElement.innerHTML = '📷 Moja slika <input type="file" accept="image/*" style="display:none" onchange="handleAboutImageUpload(this)">';
    alert('Slika je postavljena!');
  } catch(e) {
    alert('Greška pri uploadu slike. Pokušaj ponovo.');
    input.parentElement.innerHTML = '📷 Moja slika <input type="file" accept="image/*" style="display:none" onchange="handleAboutImageUpload(this)">';
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
  setItem('toggle-reviews-btn',       SITE_SETTINGS.showReviews,      'Recenzije — Početna');
  setItem('toggle-about-reviews-btn', SITE_SETTINGS.showAboutReviews, 'Recenzije — O meni');
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
   ADMIN PANEL — otvaranje / zatvaranje / tabovi
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
  if (t === 'services') renderSvcAdmin();
  if (t === 'pricing')  renderPricingAdmin();
  if (t === 'reviews')  renderReviewsAdmin();
  if (t === 'texts')    renderTextsAdmin();
  if (t === 'stats')    loadStats();
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
   BLOG — admin lista i editor
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
      <div class="af"><label>Ikona — odabrana: <span id="blog-icon-preview" style="font-size:1.3rem;vertical-align:middle">${icon}</span></label>
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
        <button type="button" class="ap-btn ap-btn-cancel" onclick="generateCoverFromIcon()" title="Generiraj mističnu naslovnu sliku iz odabrane ikone — radi na WhatsAppu, Facebooku, itd.">
          ✨ Generiraj iz ikone
        </button>
        <span id="img-filename" style="font-family:'Cormorant Infant',serif;color:var(--text-muted);font-size:0.9rem">
          ${p && p.imageUrl ? 'Slika učitana' : 'Nema odabrane slike'}
        </span>
      </div>
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
        <button onclick="eCmd('insertParagraph')">¶</button>
        <label class="ed-img-upload" title="Ubaci sliku na mjesto kursora" onmousedown="saveEditorSelection(event)">
          🖼 Slika
          <input type="file" accept="image/*" style="display:none" onchange="insertImageInContent(this)">
        </label>
      </div>
      <div id="blog-content-ed" contenteditable="true" onpaste="handleEditorPaste(event)">
        ${p ? p.content : '<p>Počni pisati ovdje...</p>'}
      </div>
    </div>

    <div class="af">
      <label>Izvori (opcionalno — pojavljuje se ispod članka samo ako napišeš)</label>
      <p style="font-family:'Cormorant Garamond',serif;font-style:italic;color:var(--text-muted);font-size:0.9rem;margin:0.2rem 0 0.5rem">
        Svaki izvor u novi red. Linkovi se automatski pretvaraju u klikabilne. Možeš pisati i čisti tekst (citate radova).
      </p>
      <textarea id="ed-sources" rows="4" placeholder="https://primjer.com/članak&#10;Ime Autora — &quot;Naslov rada&quot;, Časopis, 2024.">${p && p.sources ? esc(p.sources) : ''}</textarea>
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
  document.getElementById('img-filename').textContent = '⏳ Uploadam...';

  try {
    const url = await uploadToImgBB(file);
    document.getElementById('ed-img').value           = url;
    document.getElementById('img-prev').src           = url;
    document.getElementById('img-prev').style.display = 'block';
    document.getElementById('img-filename').textContent = '✅ ' + file.name;
  } catch(e) {
    document.getElementById('img-filename').textContent = '❌ Greška — pokušaj ponovo';
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

function saveEditorSelection() {
  const ed = document.getElementById('blog-content-ed');
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

function restoreEditorSelection() {
  const ed = document.getElementById('blog-content-ed');
  if (!ed) return false;
  ed.focus();
  if (!_savedEditorRange) {
    // Nije bilo kursora u editoru — stavi na kraj
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

/* Ubaci sliku u tijelo članka — uploada na ImgBB i umetne <img> točno na
   mjestu gdje je kursor bio kad je user kliknuo gumb. */
async function insertImageInContent(input) {
  const file = input.files[0];
  if (!file) return;

  restoreEditorSelection();
  const placeholderId = 'img-ph-' + Date.now();
  document.execCommand('insertHTML', false,
    `<p id="${placeholderId}" style="color:var(--text-muted);font-style:italic">⏳ Uploadam sliku...</p>`);
  _savedEditorRange = null;

  try {
    const url = await uploadToImgBB(file);
    const ph  = document.getElementById(placeholderId);
    if (ph) {
      ph.outerHTML = `<figure class="post-inline-img"><img src="${url}" alt=""></figure><p>&nbsp;</p>`;
    }
  } catch (e) {
    const ph = document.getElementById(placeholderId);
    if (ph) ph.outerHTML = '<p style="color:#e07070">❌ Slika nije uploadana, pokušaj ponovo.</p>';
  } finally {
    input.value = '';
  }
}

/* Generira mističnu PNG naslovnu sliku iz odabrane ikone + naslova članka.
   Renderira se na canvasu u browseru (besplatno, neograničeno), uploada na
   ImgBB i URL ide u članak. Dobiveni PNG radi kao OG preview na WhatsAppu,
   Facebooku, Instagramu — svuda gdje SVG previewi ne rade pouzdano. */
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
    const url  = await uploadToImgBB(file);

    document.getElementById('ed-img').value           = url;
    document.getElementById('img-prev').src           = url;
    document.getElementById('img-prev').style.display = 'block';
    filenameEl.textContent = '✅ Slika generirana iz ikone';
  } catch (e) {
    console.error(e);
    filenameEl.textContent = '❌ Greška pri generiranju — pokušaj ponovo';
  }
}

/* Dohvati Apple-stil emoji sliku s emojicdn.elk.sh — radi za sve emoji unicode.
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
    '<p style="color:var(--text-muted);font-family:\'Cormorant Garamond\',serif;font-style:italic;font-size:1.1rem;margin-top:2rem;text-align:center">Odaberite članak za uređivanje ili dodajte novi.</p>';
}

function eCmd(cmd) {
  document.getElementById('blog-content-ed').focus();
  document.execCommand(cmd, false);
}

function wSel(open, close) {
  const ed  = document.getElementById('blog-content-ed');
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
  const tmp = document.createElement('div');
  tmp.innerHTML = html;

  const allowedTags = new Set(['P','H2','H3','H4','STRONG','B','EM','I','U','BR','BLOCKQUOTE','FIGURE','IMG','A','UL','OL','LI','DIV','SPAN']);
  // Per-tag whitelist atributa — sve ostalo (uključujući on* event handleri) se briše
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
    // Ukloni sve kontrolne znakove i whitespace prije provjere — sprječava
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
      // SPAN bez stila je suvišan — unwrap
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

/* Paste handler — ubaci samo plain text (ili minimalno očišćen HTML),
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
      <label>Ikona — odabrana: <span id="svc-icon-preview" style="font-size:1.4rem;vertical-align:middle">${icon}</span></label>
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
    '<p style="color:var(--text-muted);font-family:\'Cormorant Garamond\',serif;font-style:italic;font-size:1.1rem;margin-top:2rem;text-align:center">Odaberite uslugu za uređivanje ili dodajte novu.</p>';
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
      <div class="bpi-t">${r.archived ? '🗄 ' : ''}${r.author}${r.location ? ' — ' + r.location : ''}</div>
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
    '<p style="color:var(--text-muted);font-family:\'Cormorant Garamond\',serif;font-style:italic;font-size:1.1rem;margin-top:2rem;text-align:center">Odaberite recenziju za uređivanje ili dodajte novu.</p>';
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
   STATISTIKA
   ============================================================ */

async function loadStats() {
  const el = document.getElementById('stats-display');
  el.innerHTML = '<p style="color:var(--text-muted);font-style:italic;text-align:center;padding:2rem">Učitavam statistiku...</p>';

  const GC = 'https://alkemijana.goatcounter.com';

  try {
    // === HERO statistika (TOTAL) ===
    const totalRes = await fetch(GC + '/counter/TOTAL.json');
    if (!totalRes.ok) throw new Error('No data');
    const total = await totalRes.json();

    // Dohvati i pojedinačne stranice (paralelno)
    const pages = [
      { path: '/',        label: 'Početna',  icon: '☾' },
      { path: '#blog',    label: 'Blog',     icon: '✦' },
      { path: '#o-meni',  label: 'O meni',   icon: '✧' },
      { path: '#kontakt', label: 'Kontakt',  icon: '✉' }
    ];

    const pageResults = await Promise.all(pages.map(p =>
      fetch(GC + '/counter/' + encodeURIComponent(p.path) + '.json')
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
    ));

    let html = '';

    // === BLOK 1: Glavni brojevi ===
    html += `<div style="margin-bottom:2.5rem">
      <h4 style="font-family:'Quicksand',sans-serif;font-size:0.72rem;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:var(--text-muted);margin-bottom:1rem">Pregled</h4>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem">
        ${bigStatCard('Ukupno posjeta', total.count || '0', '👁️')}
        ${bigStatCard('Jedinstveni posjetitelji', total.count_unique || '0', '👤')}
      </div>
    </div>`;

    // === BLOK 2: Po stranicama ===
    html += `<div style="margin-bottom:2.5rem">
      <h4 style="font-family:'Quicksand',sans-serif;font-size:0.72rem;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:var(--text-muted);margin-bottom:1rem">Posjet po stranicama</h4>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:0.8rem">`;

    pages.forEach((p, i) => {
      const d = pageResults[i] || {};
      html += pageStatCard(p.icon, p.label, d.count || '0', d.count_unique || '0');
    });
    html += `</div></div>`;

    // === BLOK 3: SVG graf trenda (iz GoatCounter) ===
    html += `<div style="margin-bottom:2rem">
      <h4 style="font-family:'Quicksand',sans-serif;font-size:0.72rem;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:var(--text-muted);margin-bottom:1rem">Trend posjeta (zadnjih 30 dana)</h4>
      <div style="background:rgba(6,8,15,0.4);border:1px solid var(--border);padding:1rem;text-align:center">
        <img src="${GC}/counter/TOTAL.svg?style=line"
          alt="Trend posjeta"
          style="max-width:100%;height:auto;filter:invert(0.85) hue-rotate(220deg)">
      </div>
    </div>`;

    // === BLOK 4: Najpopularniji blog članci ===
    const activePosts = BLOG_POSTS.filter(p => !p.archived).slice(0, 5);
    if (activePosts.length) {
      const blogResults = await Promise.all(activePosts.map(p =>
        fetch(GC + '/counter/' + encodeURIComponent('#post/' + p.id) + '.json')
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      ));

      html += `<div style="margin-bottom:2rem">
        <h4 style="font-family:'Quicksand',sans-serif;font-size:0.72rem;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:var(--text-muted);margin-bottom:1rem">Posjet po blog člancima</h4>
        <div style="border:1px solid var(--border)">`;

      const sortedBlog = activePosts.map((p, i) => ({
        post: p,
        count: parseInt((blogResults[i] || {}).count || '0', 10),
        unique: parseInt((blogResults[i] || {}).count_unique || '0', 10)
      })).sort((a, b) => b.count - a.count);

      sortedBlog.forEach(({ post, count, unique }, idx) => {
        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:0.9rem 1.1rem;${idx < sortedBlog.length - 1 ? 'border-bottom:1px solid var(--border)' : ''}">
          <div style="display:flex;align-items:center;gap:0.8rem;min-width:0;flex:1">
            <span style="font-size:1.3rem;flex-shrink:0">${post.icon}</span>
            <span style="color:var(--silver-light);font-family:'Cormorant Garamond',serif;font-size:1.05rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${post.title}</span>
          </div>
          <div style="display:flex;gap:1.5rem;flex-shrink:0">
            <span style="color:var(--lavender);font-family:'Playfair Display',serif;font-size:1.1rem">${count}</span>
            <span style="color:var(--text-muted);font-family:'Quicksand',sans-serif;font-size:0.78rem;align-self:center">${unique} jed.</span>
          </div>
        </div>`;
      });

      html += `</div></div>`;
    }

    // === BLOK 5: Info kartica ===
    html += `<div style="background:rgba(168,144,208,0.05);border:1px solid var(--border);padding:1.2rem;font-family:'Cormorant Garamond',serif;color:var(--text-muted);font-size:0.95rem;line-height:1.6;font-style:italic">
      💡 Posjete se bilježe automatski preko GoatCounter analitike (bez kolačića). Brojevi se ažuriraju jednom dnevno. Za detaljniji pregled — geografska lokacija posjetitelja, izvori prometa, uređaji — koristi gumb ispod.
    </div>`;

    el.innerHTML = html;

  } catch(e) {
    el.innerHTML = `
      <div style="text-align:center;padding:2rem">
        <p style="color:var(--text);font-size:1.05rem;margin-bottom:0.5rem">Još nema dovoljno podataka za prikaz.</p>
        <p style="color:var(--text-muted);font-size:0.95rem">Posjeti se bilježe automatski. Vrati se ovamo nakon što stranicu posjeti nekoliko ljudi.</p>
      </div>`;
  }
}

function bigStatCard(label, value, icon) {
  return `<div style="background:linear-gradient(135deg,rgba(28,24,64,0.6),rgba(14,12,36,0.8));border:1px solid var(--border);padding:1.5rem 1.2rem;text-align:center;position:relative;overflow:hidden">
    <div style="position:absolute;top:0.5rem;right:0.7rem;font-size:1.2rem;opacity:0.4">${icon}</div>
    <div style="font-family:'Playfair Display',serif;font-size:2.6rem;color:var(--lavender);line-height:1;margin-bottom:0.5rem">${value}</div>
    <div style="font-family:'Quicksand',sans-serif;font-size:0.68rem;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:var(--text-muted)">${label}</div>
  </div>`;
}

function pageStatCard(icon, label, count, unique) {
  return `<div style="background:rgba(6,8,15,0.5);border:1px solid var(--border);padding:1.1rem;text-align:center">
    <div style="font-size:1.6rem;color:var(--sage);margin-bottom:0.4rem">${icon}</div>
    <div style="font-family:'Quicksand',sans-serif;font-size:0.7rem;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:var(--silver);margin-bottom:0.6rem">${label}</div>
    <div style="font-family:'Playfair Display',serif;font-size:1.6rem;color:var(--lavender);line-height:1">${count}</div>
    <div style="font-family:'Cormorant Infant',serif;font-size:0.82rem;color:var(--text-muted);font-style:italic;margin-top:0.2rem">${unique} jedinstvenih</div>
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

/* Tekstovi grupirani po sekciji stranice — lakše za pronaći u admin panelu.
   Svaki ključ mora postojati i u TEXTS (data.js) i u applyTexts() (app.js). */
const TEXT_GROUPS = [
  {
    title: 'Početna',
    keys: {
      heroSub:          'Hero — podnaslov',
      heroDesc:         'Hero — opis',
      servicesTitle:    'Usluge — naslov',
      servicesSub:      'Usluge — podnaslov',
      ctaTitle:         'CTA — naslov',
      ctaText:          'CTA — tekst',
      ctaBtn:           'CTA — gumb',
      reviewsTitle:     'Recenzije — naslov',
      reviewsSub:       'Recenzije — podnaslov',
      blogPreviewTitle: 'Blog pregled — naslov',
      blogPreviewSub:   'Blog pregled — podnaslov',
      blogPreviewBtn:   'Blog pregled — gumb'
    }
  },
  {
    title: 'Stranica Usluge',
    keys: {
      servicesPageTitle: 'Naslov stranice',
      servicesPageSub:   'Podnaslov stranice',
      pricingTitle:      'Cjenik — naslov',
      pricingSub:        'Cjenik — podnaslov',
      servicesCtaTitle:  'CTA — naslov',
      servicesCtaText:   'CTA — tekst',
      servicesCtaBtn:    'CTA — gumb'
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
      aboutReviewsTitle: 'Recenzije — naslov'
    }
  },
  {
    title: 'Moja filozofija',
    keys: {
      philosophyTitle:      'Naslov sekcije',
      valueDiscretionTitle: 'Vrijednost 1 — naslov',
      valueDiscretionText:  'Vrijednost 1 — opis',
      valueHonestyTitle:    'Vrijednost 2 — naslov',
      valueHonestyText:     'Vrijednost 2 — opis',
      valueFreedomTitle:    'Vrijednost 3 — naslov',
      valueFreedomText:     'Vrijednost 3 — opis'
    }
  },
  {
    title: 'Blog stranica',
    keys: {
      blogPageTitle: 'Naslov stranice',
      blogPageSub:   'Podnaslov stranice',
      relatedTitle:  '"Možda će Vam se svidjeti" naslov'
    }
  },
  {
    title: 'Kontakt',
    keys: {
      contactTitle: 'Naslov',
      contactSub:   'Podnaslov'
    }
  },
  {
    title: 'Footer',
    keys: {
      footerTagline: 'Tagline ispod naslova'
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
        p.imageUrl = await uploadToImgBB(file);
      } catch (e) {
        console.warn('Cover gen failed for', p.id, e);
      }
    }
    if (editingPostId && editingPostId !== '__new__') {
      const ep = BLOG_POSTS.find(x => x.id === editingPostId);
      if (ep) showPostEditor(ep);
    }
  }

  const postsJson    = JSON.stringify(BLOG_POSTS,    null, 2);
  const svcJson      = JSON.stringify(SERVICES,      null, 2);
  const prJson       = JSON.stringify(PRICING,       null, 2);
  const revJson      = JSON.stringify(REVIEWS,       null, 2);
  const textsJson    = JSON.stringify(TEXTS,         null, 2);
  const settingsJson = JSON.stringify(SITE_SETTINGS, null, 2);

  const content = `/* ============================================================
   AlkemiJana — Podaci
   ============================================================ */

// ===ALKEMIJANA:BLOG_POSTS:START===
let BLOG_POSTS = ${postsJson};
// ===ALKEMIJANA:BLOG_POSTS:END===


// ===ALKEMIJANA:SERVICES:START===
let SERVICES = ${svcJson};
// ===ALKEMIJANA:SERVICES:END===


// ===ALKEMIJANA:PRICING:START===
let PRICING = ${prJson};
// ===ALKEMIJANA:PRICING:END===


// ===ALKEMIJANA:REVIEWS:START===
let REVIEWS = ${revJson};
// ===ALKEMIJANA:REVIEWS:END===


// ===ALKEMIJANA:TEXTS:START===
let TEXTS = ${textsJson};
// ===ALKEMIJANA:TEXTS:END===


// ===ALKEMIJANA:SETTINGS:START===
let SITE_SETTINGS = ${settingsJson};
// ===ALKEMIJANA:SETTINGS:END===
`;

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
      body: JSON.stringify({ content })
    });
    const data = await res.json();

    if (data.success) {
      alert('✅ Spremljeno! Stranica se automatski ažurira za ~30 sekundi.');
    } else if (res.status === 403) {
      sessionStorage.removeItem('aj_pass');
      alert('❌ Pogrešna lozinka — prijavi se ponovo.');
    } else {
      alert('❌ Greška: ' + (data.error || 'Nepoznata greška'));
    }
  } catch(e) {
    // Fallback na download ako serverless ne radi (lokalni razvoj)
    const blob = new Blob([content], { type: 'text/javascript;charset=utf-8' });
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
