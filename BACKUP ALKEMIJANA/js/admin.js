/* ============================================================
   AlkemiJana — Admin panel
   Pristup: otvorite AlkemiJana.html#admin
   Korisničko ime: jana
   Lozinka: alkemijana2026  ← promijenite po želji
   ============================================================ */

const ADMIN_CREDS = { user: 'jana', pass: 'alkemijana2026' };

let isAdmin        = false;
let editingPostId  = null;

/* ---- PRIJAVA / ODJAVA ---- */

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

// Prijava tipkom Enter
document.getElementById('aj-pass').addEventListener('keydown', e => {
  if (e.key === 'Enter') handleAdminLogin();
});

/* ---- PANEL (otvaranje / zatvaranje / tabovi) ---- */

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
}

/* ---- BLOG: lista i editor ---- */

function renderBlogAdminList() {
  document.getElementById('blog-admin-list').innerHTML = BLOG_POSTS.map(p => `
    <div class="bpi ${editingPostId === p.id ? 'sel' : ''}" onclick="loadPostEditor('${p.id}')">
      <div class="bpi-t">${p.title}</div>
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
  document.getElementById('blog-editor-col').innerHTML = `
    <h3>${isNew ? 'Novi članak' : 'Uredi članak'}</h3>

    <div class="af-2">
      <div class="af">
        <label>Naslov</label>
        <input id="ed-title" value="${p ? esc(p.title) : ''}">
      </div>
      <div class="af">
        <label>Datum (npr. 15. lipnja 2026)</label>
        <input id="ed-date" value="${p ? esc(p.date) : ''}">
      </div>
    </div>

    <div class="af-3">
      <div class="af">
        <label>Kategorija</label>
        <input id="ed-cat" value="${p ? esc(p.category) : ''}">
      </div>
      <div class="af">
        <label>Ikona</label>
        <input id="ed-icon" value="${p ? p.icon : '✦'}">
        <div class="emoji-row">
          ${'☽☉✦☿♆♥☾✧♄🌙⭐'.split('').map(e =>
            `<span class="emoji-btn" onclick="document.getElementById('ed-icon').value='${e}'">${e}</span>`
          ).join('')}
        </div>
      </div>
      <div class="af">
        <label>URL slike (nije obavezno)</label>
        <input id="ed-img"
          value="${p && p.imageUrl ? esc(p.imageUrl) : ''}"
          placeholder="https://..."
          oninput="prevImg(this.value)">
        <img id="img-prev" class="img-preview-thumb"
          src="${p && p.imageUrl ? p.imageUrl : ''}"
          style="${p && p.imageUrl ? 'display:block' : 'display:none'}">
      </div>
    </div>

    <div class="af">
      <label>Kratki opis (prikazan na kartici)</label>
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
        <button onclick="eCmd('insertParagraph')">¶ Novi odlomak</button>
      </div>
      <div id="blog-content-ed" contenteditable="true">
        ${p ? p.content : '<p>Počni pisati ovdje...</p>'}
      </div>
    </div>

    <div class="ap-actions">
      <button class="ap-btn ap-btn-save"   onclick="savePost()">Spremi</button>
      ${!isNew ? `<button class="ap-btn ap-btn-del" onclick="deletePost('${p.id}')">Obriši</button>` : ''}
      <button class="ap-btn ap-btn-cancel" onclick="cancelPostEdit()">Odustani</button>
    </div>`;
}

function cancelPostEdit() {
  editingPostId = null;
  renderBlogAdminList();
  document.getElementById('blog-editor-col').innerHTML =
    '<p style="color:var(--text-muted);font-family:\'Cormorant Garamond\',serif;font-style:italic;font-size:1.1rem;margin-top:2rem;text-align:center">Odaberite članak za uređivanje ili dodajte novi.</p>';
}

function prevImg(url) {
  const img = document.getElementById('img-prev');
  if (!img) return;
  img.src           = url;
  img.style.display = url ? 'block' : 'none';
}

// Alati za formatiranje teksta
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

  // Generiraj ID iz naslova (za nove članke)
  const id = editingPostId === '__new__'
    ? title.toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
    : editingPostId;

  const postData = {
    id,
    title,
    date:     (document.getElementById('ed-date').value || '').trim(),
    category: (document.getElementById('ed-cat').value  || '').trim(),
    icon:     (document.getElementById('ed-icon').value || '✦').trim(),
    imageUrl: (document.getElementById('ed-img').value  || '').trim(),
    excerpt:  (document.getElementById('ed-exc').value  || '').trim(),
    content:  document.getElementById('blog-content-ed').innerHTML,
  };

  if (editingPostId === '__new__') {
    BLOG_POSTS.unshift(postData);
  } else {
    const idx = BLOG_POSTS.findIndex(p => p.id === editingPostId);
    if (idx >= 0) BLOG_POSTS[idx] = postData;
  }

  editingPostId = postData.id;

  // Osvježi prikaz bloga i liste u adminu
  document.getElementById('blog-grid').innerHTML = '';
  renderBlogList();
  renderBlogAdminList();

  alert('Članak je spremljen!');
}

function deletePost(id) {
  if (!confirm('Sigurno želite obrisati ovaj članak?')) return;
  BLOG_POSTS.splice(BLOG_POSTS.findIndex(p => p.id === id), 1);
  editingPostId = null;
  document.getElementById('blog-grid').innerHTML = '';
  renderBlogList();
  cancelPostEdit();
}

/* ---- USLUGE ---- */

function renderSvcAdmin() {
  document.getElementById('svc-admin-grid').innerHTML =
    SERVICES.map(s => `
      <div class="svc-item">
        <div class="svc-item-head">
          <div>
            <span style="font-size:1.4rem;margin-right:0.4rem">${s.icon}</span>
            <span class="svc-item-name">${s.name}</span>
          </div>
          <div class="svc-item-actions">
            <button class="ap-btn ap-btn-save"
              style="padding:0.25rem 0.7rem;font-size:0.68rem"
              onclick="editSvc('${s.id}')">Uredi</button>
            <button class="ap-btn ap-btn-del"
              style="padding:0.25rem 0.7rem;font-size:0.68rem"
              onclick="deleteSvc('${s.id}')">✕</button>
          </div>
        </div>
        <div class="svc-item-desc">${s.desc}</div>
        <div class="svc-item-price">${s.price} € / ${s.duration} min
          <small style="color:var(--text-muted);font-size:0.8rem;margin-left:0.5rem">
            ${s.home ? '(početna)' : ''}
          </small>
        </div>
      </div>`
    ).join('') +
    `<button class="svc-add-btn" onclick="addSvc()">+</button>`;
}

function editSvc(id) {
  const s = SERVICES.find(x => x.id === id);
  if (!s) return;

  const icon  = prompt('Ikona (emoji):', s.icon) || s.icon;
  const name  = prompt('Naziv usluge:', s.name);
  if (!name) return;
  const desc  = prompt('Opis:', s.desc) || s.desc;
  const price = prompt('Cijena (€):', s.price) || s.price;
  const dur   = prompt('Trajanje (min):', s.duration) || s.duration;
  const home  = confirm('Prikaži na početnoj stranici (3 istaknute usluge)?');

  Object.assign(SERVICES.find(x => x.id === id), { icon, name, desc, price, duration: dur, home });
  renderSvcAdmin();
  renderServices();
}

function deleteSvc(id) {
  if (!confirm('Sigurno želite obrisati ovu uslugu?')) return;
  SERVICES.splice(SERVICES.findIndex(x => x.id === id), 1);
  renderSvcAdmin();
  renderServices();
}

function addSvc() {
  const name  = prompt('Naziv nove usluge:');
  if (!name) return;
  const icon  = prompt('Ikona (emoji):', '✦') || '✦';
  const desc  = prompt('Opis:', '') || '';
  const price = prompt('Cijena (€):', '0') || '0';
  const dur   = prompt('Trajanje (min):', '60') || '60';
  const home  = confirm('Prikaži na početnoj stranici?');

  SERVICES.push({ id: 's' + Date.now(), icon, name, desc, price, duration: dur, home });
  renderSvcAdmin();
  renderServices();
}

/* ---- CJENIK ---- */

function renderPricingAdmin() {
  document.getElementById('pricing-admin-list').innerHTML =
    `<div class="pr-item" style="font-family:'Quicksand',sans-serif;font-size:0.72rem;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:var(--lavender)">
       <div>NAZIV</div><div>OPIS</div><div>CIJENA</div><div></div>
     </div>` +
    PRICING.map((r, i) => `
      <div class="pr-item">
        <input value="${esc(r.name)}"  onchange="PRICING[${i}].name=this.value">
        <input value="${esc(r.desc)}"  onchange="PRICING[${i}].desc=this.value">
        <input value="${esc(r.price)}" style="width:70px" onchange="PRICING[${i}].price=this.value">
        <button class="ap-btn ap-btn-del"
          style="padding:0.25rem 0.6rem;font-size:0.68rem;white-space:nowrap"
          onclick="delPricingRow(${i})">✕</button>
      </div>`
    ).join('');
}

function addPricingRow() {
  PRICING.push({ name: 'Nova usluga', desc: 'Opis', price: '0' });
  renderPricingAdmin();
}

function delPricingRow(i) {
  if (!confirm('Obrisati ovu stavku iz cjenika?')) return;
  PRICING.splice(i, 1);
  renderPricingAdmin();
}

function savePricing() {
  renderPricingTable();
  alert('Cjenik je ažuriran!');
}

/* ---- PREUZIMANJE AŽURIRANOG data.js ---- */

function downloadSite() {
  const postsJson = JSON.stringify(BLOG_POSTS, null, 2);
  const svcJson   = JSON.stringify(SERVICES,   null, 2);
  const prJson    = JSON.stringify(PRICING,    null, 2);

  const content = `/* ============================================================
   AlkemiJana — Podaci (blog članci, usluge, cjenik)

   Ovaj fajl možete urediti ručno ili putem admin panela.
   Nakon promjena u admin panelu, preuzmite novu verziju ovog
   fajla klikom na "Spremi & preuzmi" i zamijenite ga na hostingu.
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
