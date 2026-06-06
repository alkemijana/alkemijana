/* ============================================================
   AlkemiJana — Glavna logika aplikacije
   (navigacija, renderiranje usluga, blog)
   ============================================================ */

/* ---- NAVIGACIJA ---- */

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === id);
  });
  document.getElementById('navLinks').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (id === 'blog')   renderBlogList();
  if (id === 'usluge') renderPricingTable();
}

function toggleMenu() {
  document.getElementById('navLinks').classList.toggle('open');
}

function submitForm(e) {
  e.preventDefault();
  document.getElementById('bookingForm').style.display = 'none';
  document.getElementById('formSuccess').classList.add('show');
}

/* ---- RENDERIRANJE USLUGA ---- */

function renderServices() {
  const homeGrid = document.getElementById('home-services-grid');
  const allGrid  = document.getElementById('all-services-grid');
  const sel      = document.getElementById('booking-service-select');

  if (homeGrid) homeGrid.innerHTML = SERVICES.filter(s => s.home).map(svcCard).join('');
  if (allGrid)  allGrid.innerHTML  = SERVICES.map(svcCard).join('');

  if (sel) {
    sel.innerHTML = '<option value="">Odaberi uslugu</option>' +
      SERVICES.map(s => `<option>${s.name} (${s.price} €)</option>`).join('');
  }
}

function svcCard(s) {
  return `
    <div class="service-card">
      <span class="service-icon">${s.icon}</span>
      <h3>${s.name}</h3>
      <p>${s.desc}</p>
      <div class="service-price">${s.price} €<small> / ${s.duration} min</small></div>
    </div>`;
}

function renderPricingTable() {
  const wrap = document.getElementById('pricing-table-wrap');
  if (!wrap) return;
  wrap.innerHTML =
    `<div class="pricing-row header">
       <div>Usluga</div>
       <div>Opis</div>
       <div style="text-align:right">Cijena</div>
     </div>` +
    PRICING.map(r =>
      `<div class="pricing-row">
         <div class="name">${r.name}</div>
         <div class="desc">${r.desc}</div>
         <div class="price">${r.price} €</div>
       </div>`
    ).join('');
}

/* ---- BLOG ---- */

function renderBlogList() {
  const grid = document.getElementById('blog-grid');
  if (!grid) return;
  grid.innerHTML = BLOG_POSTS.map(p => `
    <div class="blog-card" onclick="openPost('${p.id}')">
      <div class="blog-image">
        ${p.imageUrl ? `<img src="${p.imageUrl}" alt="">` : p.icon}
      </div>
      <div class="blog-content">
        <div class="blog-meta">${p.date} · ${p.category}</div>
        <h3>${p.title}</h3>
        <p>${p.excerpt}</p>
        <div class="blog-link">Pročitaj više →</div>
      </div>
    </div>`
  ).join('');
}

function openPost(id) {
  const p = BLOG_POSTS.find(x => x.id === id);
  if (!p) return;

  document.getElementById('post-meta').textContent  = `${p.date} · ${p.category}`;
  document.getElementById('post-title').textContent = p.title;
  document.getElementById('post-body').innerHTML    = p.content;

  const fi = document.getElementById('post-feature-img');
  const pi = document.getElementById('post-img');
  if (p.imageUrl) { pi.src = p.imageUrl; fi.style.display = 'block'; }
  else            { fi.style.display = 'none'; }

  document.getElementById('blog-list-view').classList.add('hidden');
  document.getElementById('blog-post-view').classList.add('active');
  window.location.hash = 'post/' + id;
  renderShareBar(p);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeBlogPost() {
  document.getElementById('blog-post-view').classList.remove('active');
  document.getElementById('blog-list-view').classList.remove('hidden');
  window.location.hash = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderShareBar(p) {
  const url = window.location.href.split('#')[0] + '#post/' + p.id;
  document.getElementById('share-bar').innerHTML = `
    <span>Podijeli:</span>
    <button class="share-btn" onclick="copyPostLink('${p.id}', this)">🔗 Kopiraj link</button>
    <a href="https://www.instagram.com/alkemijana" target="_blank" rel="noopener" class="share-btn">Instagram</a>
    <a href="https://www.tiktok.com/@alkemijana"   target="_blank" rel="noopener" class="share-btn">TikTok</a>`;
}

function copyPostLink(id, btn) {
  const url = window.location.href.split('#')[0] + '#post/' + id;
  navigator.clipboard.writeText(url).then(() => {
    btn.textContent = '✓ Kopirano!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = '🔗 Kopiraj link';
      btn.classList.remove('copied');
    }, 2500);
  });
}

/* ---- POMOCNA FUNKCIJA ---- */

function esc(s) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* ---- INICIJALIZACIJA ---- */

window.addEventListener('load', () => {
  renderServices();

  const hash = window.location.hash;
  if (hash === '#admin') {
    showPage('home');
    document.getElementById('admin-login-overlay').classList.add('show');
  } else if (hash.startsWith('#post/')) {
    showPage('blog');
    openPost(hash.replace('#post/', ''));
  }

  // Provjeri je li admin već bio prijavljen u ovoj sesiji
  if (sessionStorage.getItem('aj_admin') === '1') {
    activateAdmin();
  }
});

window.addEventListener('hashchange', () => {
  if (window.location.hash === '#admin') {
    document.getElementById('admin-login-overlay').classList.add('show');
  }
});
