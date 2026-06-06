/* ============================================================
   AlkemiJana — Admin panel
   Pristup: AlkemiJana.html#admin  (ili index.html#admin)
   Korisničko ime : jana
   Lozinka        : alkemijana2026
   ============================================================ */

const ADMIN_CREDS = { user: 'jana', pass: 'morasmora2026' };
const IMGBB_KEY   = '0d1cce4852e17860ddebe0e15f9ac341';

let isAdmin       = false;
let editingPostId = null;
let editingSvcId  = null;
let editingRevId  = null;

/* ============================================================
   PRIJAVA / ODJAVA
   ============================================================ */

function handleAdminLogin() {
  const u   = document.getElementById('aj-user').value;
  const p   = document.getElementById('aj-pass').value;
  const err = document.getElementById('admin-error');
  if (u === ADMIN_CREDS.user && p === ADMIN_CREDS.pass) {
    isAdmin = true;
    sessionStorage.setItem('aj_admin', '1');
    document.getElementById('admin-login-overlay').classList.remove('show');
    activateAdmin();
    history.replaceState(null, '', '#');
  } else {
    err.style.display = 'block';
  }
}

function activateAdmin() {
  isAdmin = true;
  document.getElementById('admin-bar').classList.add('show');
  document.getElementById('main-nav').style.top = '46px';
  document.querySelectorAll('.page').forEach(p => p.style.paddingTop = '9.5rem');
  syncToggleBtns();
}

function adminLogout() {
  isAdmin = false;
  sessionStorage.removeItem('aj_admin');
  document.getElementById('admin-bar').classList.remove('show');
  document.getElementById('main-nav').style.top = '0';
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
      <div class="bpi-m">${p.date} · ${p.category}</div>
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
      <div class="af"><label>Kategorija</label>
        <input id="ed-cat" value="${p ? esc(p.category) : ''}"></div>
      <div class="af"><label>Ikona — odabrana: <span id="blog-icon-preview" style="font-size:1.3rem;vertical-align:middle">${icon}</span></label>
        <input id="ed-icon" value="${icon}" style="display:none">
        ${buildEmojiPicker(icon, 'selectBlogEmoji')}
      </div>
    </div>

    <div class="af">
      <label>Naslovna slika</label>
      <div style="display:flex;align-items:center;gap:0.8rem;margin-top:0.3rem">
        <label class="ap-btn ap-btn-cancel" style="cursor:pointer;display:inline-block">
          📁 Odaberi s računala
          <input type="file" accept="image/*" style="display:none" onchange="handleBlogImageUpload(this)">
        </label>
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
      </div>
      <div id="blog-content-ed" contenteditable="true">
        ${p ? p.content : '<p>Počni pisati ovdje...</p>'}
      </div>
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

function savePost() {
  const title = (document.getElementById('ed-title').value || '').trim();
  if (!title) { alert('Naslov je obavezan.'); return; }

  const id = editingPostId === '__new__'
    ? title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-')
    : editingPostId;

  const pd = {
    id, title,
    date:     (document.getElementById('ed-date').value || '').trim(),
    category: (document.getElementById('ed-cat').value  || '').trim(),
    icon:     (document.getElementById('ed-icon').value || '✦').trim(),
    imageUrl: document.getElementById('ed-img').value || '',
    excerpt:  (document.getElementById('ed-exc').value  || '').trim(),
    content:  document.getElementById('blog-content-ed').innerHTML,
    archived: document.getElementById('ed-archived').checked,
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

const TEXT_LABELS = {
  heroSub:          'Podnaslov (početna)',
  heroDesc:         'Opis (početna)',
  servicesTitle:    'Naslov usluga',
  servicesSub:      'Podnaslov usluga',
  ctaTitle:         'CTA naslov',
  ctaText:          'CTA tekst',
  ctaBtn:           'CTA gumb',
  reviewsTitle:     'Naslov recenzija',
  reviewsSub:       'Podnaslov recenzija',
  blogPreviewTitle: 'Naslov blog pregleda',
  blogPreviewSub:   'Podnaslov blog pregleda',
  blogPreviewBtn:   'Gumb za blog',
  contactTitle:     'Naslov kontakta',
  contactSub:       'Podnaslov kontakta',
  footerTagline:    'Footer tagline',
  aboutQuote:       'Citat (O meni)'
};

function renderTextsAdmin() {
  const wrap = document.getElementById('texts-fields');
  wrap.innerHTML = Object.keys(TEXT_LABELS).map(key => `
    <div class="af">
      <label>${TEXT_LABELS[key]}</label>
      ${TEXTS[key].length > 60
        ? `<textarea id="txt-${key}" rows="2">${esc(TEXTS[key])}</textarea>`
        : `<input id="txt-${key}" value="${esc(TEXTS[key])}">`
      }
    </div>`
  ).join('');
}

function saveTexts() {
  Object.keys(TEXT_LABELS).forEach(key => {
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

  // Spremi na server (auto-deploy)
  const saveBtn = document.querySelector('[onclick="downloadSite()"]');
  if (saveBtn) { saveBtn.textContent = '⏳ Spremam...'; saveBtn.disabled = true; }

  try {
    const res = await fetch('/.netlify/functions/save-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pass: ADMIN_CREDS.pass, content })
    });
    const data = await res.json();

    if (data.success) {
      alert('✅ Spremljeno! Stranica se automatski ažurira za ~30 sekundi.');
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
