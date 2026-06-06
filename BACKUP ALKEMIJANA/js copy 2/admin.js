/* ============================================================
   AlkemiJana — Admin panel
   Pristup: AlkemiJana.html#admin  (ili index.html#admin)
   Korisničko ime : jana
   Lozinka        : alkemijana2026
   ============================================================ */

const ADMIN_CREDS = { user: 'jana', pass: 'alkemijana2026' };

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
  const b1 = document.getElementById('toggle-reviews-btn');
  const b2 = document.getElementById('toggle-about-reviews-btn');
  if (b1) {
    b1.textContent     = SITE_SETTINGS.showReviews ? 'Rec. Početna: On' : 'Rec. Početna: Off';
    b1.style.color     = SITE_SETTINGS.showReviews ? 'var(--sage)' : '';
    b1.style.borderColor = SITE_SETTINGS.showReviews ? 'var(--sage)' : '';
  }
  if (b2) {
    b2.textContent     = SITE_SETTINGS.showAboutReviews ? 'Rec. O meni: On' : 'Rec. O meni: Off';
    b2.style.color     = SITE_SETTINGS.showAboutReviews ? 'var(--sage)' : '';
    b2.style.borderColor = SITE_SETTINGS.showAboutReviews ? 'var(--sage)' : '';
  }
}

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

function handleBlogImageUpload(input) {
  const file = input.files[0];
  if (!file) return;
  document.getElementById('img-filename').textContent = file.name;

  const canvas = document.createElement('canvas');
  const img    = new Image();
  img.onload = () => {
    let w = img.width, h = img.height;
    const MAX = 1000;
    if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
    canvas.width = w; canvas.height = h;
    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
    const b64 = canvas.toDataURL('image/jpeg', 0.82);
    document.getElementById('ed-img').value        = b64;
    document.getElementById('img-prev').src        = b64;
    document.getElementById('img-prev').style.display = 'block';
    URL.revokeObjectURL(img.src);
  };
  img.src = URL.createObjectURL(file);
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
          <div class="spi-price">${s.price} € · ${s.duration} min${s.home ? ' · početna' : ''}</div>
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
      <div class="af"><label>Cijena (€)</label>
        <input id="svc-price" type="number" min="0" value="${s ? s.price : ''}"></div>
      <div class="af"><label>Trajanje (min)</label>
        <input id="svc-dur" type="number" min="0" value="${s ? s.duration : '60'}"></div>
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
    home:     document.getElementById('svc-home').checked,
    archived: document.getElementById('svc-archived').checked,
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
   PREUZIMANJE AŽURIRANOG data.js
   ============================================================ */

function downloadSite() {
  const postsJson    = JSON.stringify(BLOG_POSTS,    null, 2);
  const svcJson      = JSON.stringify(SERVICES,      null, 2);
  const prJson       = JSON.stringify(PRICING,       null, 2);
  const revJson      = JSON.stringify(REVIEWS,       null, 2);
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


// ===ALKEMIJANA:SETTINGS:START===
let SITE_SETTINGS = ${settingsJson};
// ===ALKEMIJANA:SETTINGS:END===
`;

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
