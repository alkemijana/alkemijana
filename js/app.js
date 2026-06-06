/* ============================================================
   AlkemiJana — Glavna logika aplikacije
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

async function submitForm(e) {
  e.preventDefault();
  const form    = e.target;
  const btn     = document.getElementById('form-submit-btn');
  const origTxt = btn.textContent;

  btn.textContent = 'Šalje se...';
  btn.disabled    = true;

  try {
    const res  = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body:   new FormData(form)
    });
    const data = await res.json();

    if (data.success) {
      form.style.display = 'none';
      document.getElementById('formSuccess').classList.add('show');
    } else {
      alert('Greška pri slanju. Provjerite ključ ili pokušajte ponovo.');
      btn.textContent = origTxt;
      btn.disabled    = false;
    }
  } catch {
    alert('Nema veze s internetom. Pokušajte ponovo.');
    btn.textContent = origTxt;
    btn.disabled    = false;
  }
}

/* ---- USLUGE ---- */

function renderServices() {
  const homeGrid = document.getElementById('home-services-grid');
  const allGrid  = document.getElementById('all-services-grid');
  const sel      = document.getElementById('booking-service-select');

  const active     = SERVICES.filter(s => !s.archived);
  const homeActive = active.filter(s => s.home);

  if (homeGrid) homeGrid.innerHTML = homeActive.map(svcCard).join('');
  if (allGrid)  allGrid.innerHTML  = active.map(svcCard).join('');

  if (sel) {
    sel.innerHTML = '<option value="">Odaberi uslugu</option>' +
      active.map(s => {
        let info = '';
        if (s.showPrice !== false) info += s.price + ' €';
        if (s.showDuration !== false) info += (info ? ' / ' : '') + s.duration + ' min';
        return `<option>${s.name}${info ? ' (' + info + ')' : ''}</option>`;
      }).join('') +
      '<option value="Ostalo">Ostalo / Nešto drugo</option>';
  }
}

function svcCard(s) {
  const sp = s.showPrice !== false;
  const sd = s.showDuration !== false;
  let priceHtml = '';
  if (sp && sd)       priceHtml = `<div class="service-price">${s.price} €<small> / ${s.duration} min</small></div>`;
  else if (sp)        priceHtml = `<div class="service-price">${s.price} €</div>`;
  else if (sd)        priceHtml = `<div class="service-price"><small>${s.duration} min</small></div>`;
  return `
    <div class="service-card">
      <span class="service-icon">${s.icon}</span>
      <h3>${s.name}</h3>
      <p>${s.desc}</p>
      ${priceHtml}
    </div>`;
}

function renderPricingTable() {
  const wrap = document.getElementById('pricing-table-wrap');
  if (!wrap) return;
  const active = PRICING.filter(r => !r.archived);
  wrap.innerHTML =
    `<div class="pricing-row header">
       <div>Usluga</div><div>Opis</div>
       <div style="text-align:right">Cijena</div>
     </div>` +
    active.map(r =>
      `<div class="pricing-row">
         <div class="name">${r.name}</div>
         <div class="desc">${r.desc}</div>
         <div class="price">${r.price} €</div>
       </div>`
    ).join('');
}

/* ---- RECENZIJE ---- */

function renderReviews(section, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const active = REVIEWS.filter(r => r.section === section && !r.archived);
  el.innerHTML = active.map(r => `
    <div class="review-card">
      <div class="review-stars">${'★'.repeat(r.stars)}</div>
      <p class="review-text">${r.text}</p>
      <div class="review-author">${r.author}<span>${r.location}</span></div>
    </div>`
  ).join('');
}

/* ---- BLOG ---- */

function renderBlogList() {
  const grid = document.getElementById('blog-grid');
  if (!grid) return;
  const active = BLOG_POSTS.filter(p => !p.archived);
  grid.innerHTML = active.length
    ? active.map(blogCard).join('')
    : '<p style="color:var(--text-muted);font-family:\'Cormorant Garamond\',serif;font-style:italic;text-align:center;padding:3rem">Još nema objavljenih članaka.</p>';
}

function renderHomeBlogPreview() {
  const grid = document.getElementById('home-blog-preview-grid');
  if (!grid) return;
  const latest = BLOG_POSTS.filter(p => !p.archived).slice(0, 3);
  grid.innerHTML = latest.map(blogCard).join('');
}

function blogCard(p) {
  return `
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
    </div>`;
}

function openPost(id) {
  const p = BLOG_POSTS.find(x => x.id === id);
  if (!p) return;

  // Osiguraj da je stranica bloga aktivna (može se zvati i s početne)
  document.querySelectorAll('.page').forEach(pg => pg.classList.remove('active'));
  document.getElementById('blog').classList.add('active');
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === 'blog');
  });
  document.getElementById('navLinks').classList.remove('open');

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
  document.getElementById('share-bar').innerHTML = `
    <span>Podijeli:</span>
    <button class="share-btn" onclick="copyPostLink('${p.id}', this)">🔗 Kopiraj link</button>`;
}

function copyPostLink(id, btn) {
  const url = window.location.href.split('#')[0] + '#post/' + id;
  navigator.clipboard.writeText(url).then(() => {
    btn.textContent = '✓ Kopirano!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = '🔗 Kopiraj link'; btn.classList.remove('copied'); }, 2500);
  });
}

/* ---- POSTAVKE STRANICE ---- */

function applySettings() {
  // Recenzije
  const homeRev  = document.getElementById('home-reviews-section');
  const aboutRev = document.getElementById('about-reviews-section');
  if (homeRev)  homeRev.style.display  = SITE_SETTINGS.showReviews      ? 'block' : 'none';
  if (aboutRev) aboutRev.style.display = SITE_SETTINGS.showAboutReviews ? 'block' : 'none';

  // Tekstovi (ovise o showServices za kontakt naslov)
  applyTexts();

  // Usluge
  const show = SITE_SETTINGS.showServices;

  const navUsluge    = document.getElementById('nav-usluge');
  const homeSvc      = document.getElementById('home-services-section');
  const homeCta      = document.getElementById('home-cta-section');
  const svcFormGroup = document.getElementById('svc-form-group');
  const svcFormRow   = document.getElementById('svc-form-row');

  if (navUsluge)    navUsluge.style.display    = show ? '' : 'none';
  if (homeSvc)      homeSvc.style.display      = show ? 'block' : 'none';
  if (homeCta)      homeCta.style.display      = show ? 'block' : 'none';
  if (svcFormGroup) svcFormGroup.style.display = show ? '' : 'none';
  if (svcFormRow)   svcFormRow.style.gridTemplateColumns = show ? '' : '1fr';

  // O meni slika
  const aboutImg = document.getElementById('about-image-float');
  if (aboutImg) {
    if (SITE_SETTINGS.aboutImageUrl) {
      aboutImg.innerHTML = `<img src="${SITE_SETTINGS.aboutImageUrl}" alt="Jana">`;
    } else {
      aboutImg.innerHTML = '';
    }
  }
}

/* ---- TEKSTOVI ---- */

function applyTexts() {
  const t = TEXTS;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  set('t-heroSub',          t.heroSub);
  set('t-heroDesc',         t.heroDesc);
  set('t-servicesTitle',    t.servicesTitle);
  set('t-servicesSub',      t.servicesSub);
  set('t-ctaTitle',         t.ctaTitle);
  set('t-ctaText',          t.ctaText);
  set('t-ctaBtn',           t.ctaBtn);
  set('t-reviewsTitle',     t.reviewsTitle);
  set('t-reviewsSub',       t.reviewsSub);
  set('t-blogPreviewTitle', t.blogPreviewTitle);
  set('t-blogPreviewSub',   t.blogPreviewSub);
  set('t-blogPreviewBtn',   t.blogPreviewBtn);
  set('t-footerTagline',    t.footerTagline);

  // Kontakt naslov — dinamički prema stanju usluga
  const contactEl = document.getElementById('t-contactTitle');
  if (contactEl) {
    contactEl.textContent = SITE_SETTINGS.showServices
      ? 'Rezervacija & ' + t.contactTitle
      : t.contactTitle;
  }
  set('t-contactSub', t.contactSub);
}

/* ---- POMOĆNA FUNKCIJA ---- */

function esc(s) {
  return (s || '')
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ---- AMBIENT ANIMACIJE (glare zvjezdice) ---- */

function spawnGlare() {
  const el   = document.createElement('span');
  const size = 10 + Math.random() * 18;
  el.textContent = '✦';
  el.style.cssText = `
    position:fixed; z-index:3; pointer-events:none; line-height:1;
    font-family:sans-serif; user-select:none;
    left:${(Math.random() * 93).toFixed(1)}vw;
    top:${(Math.random() * 93).toFixed(1)}vh;
    font-size:${size}px;
    color:rgba(228,224,244,0.95);
    text-shadow:0 0 10px rgba(168,144,208,1), 0 0 28px rgba(168,144,208,0.7), 0 0 50px rgba(168,144,208,0.3);
    animation:glareFlash ${1.8 + Math.random() * 1.2}s ease-in-out forwards;
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function scheduleGlares() {
  spawnGlare();
  setTimeout(scheduleGlares, 10000 + Math.random() * 20000);
}

/* ---- INICIJALIZACIJA ---- */

window.addEventListener('load', () => {
  renderServices();
  renderHomeBlogPreview();
  renderReviews('home', 'home-reviews-grid');
  renderReviews('omeni', 'about-reviews-grid');
  applySettings();

  const hash = window.location.hash;
  if (hash === '#admin') {
    showPage('home');
    document.getElementById('admin-login-overlay').classList.add('show');
  } else if (hash.startsWith('#post/')) {
    showPage('blog');
    openPost(hash.replace('#post/', ''));
  }

  if (sessionStorage.getItem('aj_admin') === '1') activateAdmin();

  // Pokreni ambient glare animacije (svakih 10–30 sek)
  setTimeout(scheduleGlares, 5000 + Math.random() * 5000);
});

window.addEventListener('hashchange', () => {
  if (window.location.hash === '#admin')
    document.getElementById('admin-login-overlay').classList.add('show');
});
