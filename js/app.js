/* ============================================================
   AlkemiJana — Glavna logika aplikacije
   ============================================================ */

/* ---- NAVIGACIJA ---- */

function showPage(id) {
  /* LEGAL: ako usluge nisu uključene u adminu (nema registriranog obrta),
     #usluge stranica je potpuno blokirana — preusmjeri na početnu.
     Tako čak ni direktni URL/bookmark ne može prikazati cjenik. */
  if (id === 'usluge' && !SITE_SETTINGS.showServices) {
    id = 'home';
    try { history.replaceState(null, '', window.location.pathname); } catch (e) {}
  }
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

/* ---- THEME (tamna / svijetla) ---- */

const THEME_KEY = 'aj_theme';

function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

function toggleTheme(ev) {
  const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  const next    = current === 'light' ? 'dark' : 'light';

  const circle = document.getElementById('theme-transition-circle');
  if (!circle || !window.matchMedia) {
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    return;
  }

  // Ako user preferira reduced motion, samo prebaci bez animacije
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    return;
  }

  // Pozicija klika — circle se širi iz te točke
  let x = window.innerWidth - 60;
  let y = 60;
  if (ev && (ev.clientX || ev.touches)) {
    const t = ev.touches ? ev.touches[0] : ev;
    x = t.clientX || x;
    y = t.clientY || y;
  } else if (ev && ev.currentTarget) {
    const r = ev.currentTarget.getBoundingClientRect();
    x = r.left + r.width / 2;
    y = r.top  + r.height / 2;
  }

  // Krug mora pokriti najdalju točku ekrana od pozicije klika
  const maxX = Math.max(x, window.innerWidth - x);
  const maxY = Math.max(y, window.innerHeight - y);
  const radius = Math.sqrt(maxX * maxX + maxY * maxY);
  const size = Math.ceil(radius * 2) + 100;

  // Boja kruga = boja NOVE pozadine (kupimo je iz CSS var-a privremenim
  // postavljanjem data-theme na hidden helper, ali jednostavnije: invertiramo)
  const newBg = next === 'light' ? '#f4eef9' : '#06080f';

  circle.style.left = x + 'px';
  circle.style.top  = y + 'px';
  circle.style.background = newBg;
  circle.style.setProperty('--reveal-size', size + 'px');
  circle.classList.remove('theme-reveal');
  // force reflow
  void circle.offsetWidth;
  circle.classList.add('theme-reveal');

  // Prebaci temu u sredini animacije (kad je krug već prekrio ekran)
  setTimeout(() => {
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  }, 450);

  // Skini krug nakon animacije
  setTimeout(() => {
    circle.classList.remove('theme-reveal');
    circle.style.width = '0';
    circle.style.height = '0';
  }, 1200);
}

// Postavi pohranjenu temu prije nego se DOM iscrta da ne bude flicker
(function initTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light') applyTheme('light');
  } catch (e) {}
})();

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

  /* LEGAL: kad u adminu showServices=false (nema registriranog obrta),
     ne smijemo NIŠTA renderirati u DOM — ni opise, ni cijene, ni opcije
     u <select>-u. Crawleri i View Source tako vide samo prazne kontejnere. */
  if (!SITE_SETTINGS.showServices) {
    if (homeGrid) homeGrid.innerHTML = '';
    if (allGrid)  allGrid.innerHTML  = '';
    if (sel)      sel.innerHTML      = '<option value="">—</option>';
    return;
  }

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
        return `<option>${esc(s.name)}${info ? ' (' + esc(info) + ')' : ''}</option>`;
      }).join('') +
      '<option value="Ostalo">Ostalo / Nešto drugo</option>';
  }
}

function svcCard(s) {
  const sp = s.showPrice !== false;
  const sd = s.showDuration !== false;
  let priceHtml = '';
  if (sp && sd)       priceHtml = `<div class="service-price">${esc(s.price)} €<small> / ${esc(s.duration)} min</small></div>`;
  else if (sp)        priceHtml = `<div class="service-price">${esc(s.price)} €</div>`;
  else if (sd)        priceHtml = `<div class="service-price"><small>${esc(s.duration)} min</small></div>`;
  return `
    <div class="service-card">
      <span class="service-icon">${esc(s.icon)}</span>
      <h3>${esc(s.name)}</h3>
      <p>${esc(s.desc)}</p>
      ${priceHtml}
    </div>`;
}

function renderPricingTable() {
  const wrap = document.getElementById('pricing-table-wrap');
  if (!wrap) return;
  /* LEGAL: cjenik se NIKAD ne renderira u DOM kad showServices=false */
  if (!SITE_SETTINGS.showServices) { wrap.innerHTML = ''; return; }
  const active = PRICING.filter(r => !r.archived);
  wrap.innerHTML =
    `<div class="pricing-row header">
       <div>Usluga</div><div>Opis</div>
       <div style="text-align:right">Cijena</div>
     </div>` +
    active.map(r =>
      `<div class="pricing-row">
         <div class="name">${esc(r.name)}</div>
         <div class="desc">${esc(r.desc)}</div>
         <div class="price">${esc(r.price)} €</div>
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
      <div class="review-stars">${'★'.repeat(parseInt(r.stars) || 0)}</div>
      <p class="review-text">${esc(r.text)}</p>
      <div class="review-author">${esc(r.author)}<span>${esc(r.location)}</span></div>
    </div>`
  ).join('');
}

/* ---- BLOG ---- */

let activeBlogCategory  = '';
let blogCategoriesOpen  = false;
const BLOG_CHIPS_VISIBLE = 6;

/* Vraća sve tagove za članak — koristi tags array, ali fallback na stari
   category field za članke koji još nisu migrirani. */
function getPostTags(p) {
  if (Array.isArray(p.tags) && p.tags.length) return p.tags;
  if (p.category) return [p.category];
  return [];
}

function renderBlogList() {
  const grid = document.getElementById('blog-grid');
  if (!grid) return;

  const chipsWrap = document.getElementById('blog-category-chips');
  if (chipsWrap) {
    const active = BLOG_POSTS.filter(p => !p.archived);
    const counts = {};
    active.forEach(p => {
      getPostTags(p).forEach(t => {
        counts[t] = (counts[t] || 0) + 1;
      });
    });
    const tags = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b, 'hr'));

    if (activeBlogCategory && !tags.includes(activeBlogCategory)) activeBlogCategory = '';

    const chip = (label, val, count) => {
      const safeVal = String(val).replace(/'/g, "\\'");
      const badge = (count != null) ? `<span class="blog-chip-count">${count}</span>` : '';
      return `<button type="button" class="blog-chip ${activeBlogCategory === val ? 'active' : ''}" onclick="setBlogCategory('${safeVal}')">${label}${badge}</button>`;
    };

    const overLimit = tags.length > BLOG_CHIPS_VISIBLE;
    let visible, hidden;
    if (!overLimit) {
      visible = tags; hidden = [];
    } else {
      visible = tags.slice(0, BLOG_CHIPS_VISIBLE);
      hidden  = tags.slice(BLOG_CHIPS_VISIBLE);
      if (activeBlogCategory && hidden.includes(activeBlogCategory) && !blogCategoriesOpen) {
        visible = visible.slice(0, BLOG_CHIPS_VISIBLE - 1).concat([activeBlogCategory]);
        hidden  = tags.filter(c => !visible.includes(c));
      }
    }

    const renderChips = arr => arr.map(c => chip(esc(c), c, counts[c])).join('');
    const allChip = chip('✦ Sve', '');

    let html = allChip + renderChips(visible);
    if (overLimit) {
      if (blogCategoriesOpen) {
        html += renderChips(hidden);
        html += `<button type="button" class="blog-chip blog-chip-toggle" onclick="toggleBlogCategories()">Manje ▴</button>`;
      } else {
        html += `<button type="button" class="blog-chip blog-chip-toggle" onclick="toggleBlogCategories()">Više (+${hidden.length}) ▾</button>`;
      }
    }
    chipsWrap.innerHTML = html;
  }

  filterBlogPosts();
}

function setBlogCategory(c) {
  activeBlogCategory = c;
  renderBlogList();
}

// Klik na tag UNUTAR otvorenog članka → otvori blog stranicu s tim tagom kao filter
function openBlogWithTag(tag) {
  activeBlogCategory = tag;
  blogCategoriesOpen = false;
  showPage('blog');
  // showPage poziva renderBlogList koji već uvažava activeBlogCategory
}

function toggleBlogCategories() {
  blogCategoriesOpen = !blogCategoriesOpen;
  renderBlogList();
}

function clearBlogSearch() {
  const s = document.getElementById('blog-search');
  if (s) { s.value = ''; s.focus(); }
  filterBlogPosts();
}

function filterBlogPosts() {
  const grid = document.getElementById('blog-grid');
  if (!grid) return;

  const searchEl = document.getElementById('blog-search');
  const query    = (searchEl ? searchEl.value : '').trim().toLowerCase();

  const wrap = document.querySelector('.blog-search-wrap');
  if (wrap) wrap.classList.toggle('has-text', !!query);

  let filtered = BLOG_POSTS.filter(p => !p.archived);
  if (activeBlogCategory) {
    filtered = filtered.filter(p => getPostTags(p).some(t => t === activeBlogCategory));
  }

  if (query) {
    filtered = filtered.filter(p => {
      const haystack = [p.title, p.excerpt, p.content, ...getPostTags(p), p.series]
        .filter(Boolean)
        .join(' ')
        .replace(/<[^>]*>/g, ' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }

  const meta = document.getElementById('blog-results-meta');
  if (meta) {
    if (query || activeBlogCategory) {
      const total = BLOG_POSTS.filter(p => !p.archived).length;
      meta.textContent = `${filtered.length} od ${total} članaka`;
      meta.classList.add('show');
    } else {
      meta.textContent = '';
      meta.classList.remove('show');
    }
  }

  grid.innerHTML = filtered.length
    ? filtered.map(blogCard).join('')
    : `<div class="blog-empty">
         <div class="blog-empty-glyph">✦</div>
         <p>Nema članaka koji odgovaraju pretrazi.</p>
         <button type="button" class="blog-empty-reset" onclick="resetBlogFilters()">Očisti filtere</button>
       </div>`;
}

function resetBlogFilters() {
  activeBlogCategory = '';
  const s = document.getElementById('blog-search');
  if (s) s.value = '';
  renderBlogList();
}

function renderHomeBlogPreview() {
  const grid = document.getElementById('home-blog-preview-grid');
  if (!grid) return;
  const latest = BLOG_POSTS.filter(p => !p.archived).slice(0, 3);
  grid.innerHTML = latest.map(blogCard).join('');
}

function blogCard(p) {
  // Tagovi se NE prikazuju na kartici početne — samo datum.
  // Ako je dio serijala, prikaži suptilni badge ispod naslova.
  const seriesBadge = p.series
    ? `<div class="blog-card-series">✦ ${esc(p.series)}${p.seriesPart ? ' · Dio ' + esc(p.seriesPart) : ''}</div>`
    : '';
  const safeImg = safeImgSrc(p.imageUrl);
  return `
    <div class="blog-card" onclick="openPost('${esc(p.id)}')">
      <div class="blog-image">
        ${safeImg ? `<img src="${esc(safeImg)}" alt="">` : esc(p.icon)}
      </div>
      <div class="blog-content">
        <div class="blog-meta">${esc(p.date)}</div>
        <h3>${esc(p.title)}</h3>
        ${seriesBadge}
        <p>${esc(p.excerpt)}</p>
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

  document.getElementById('post-meta').textContent  = p.date || '';
  document.getElementById('post-title').textContent = p.title;
  document.getElementById('post-body').innerHTML    = p.content;

  const fi = document.getElementById('post-feature-img');
  const pi = document.getElementById('post-img');
  const safeFeature = safeImgSrc(p.imageUrl);
  if (safeFeature) { pi.src = safeFeature; fi.style.display = 'block'; }
  else             { pi.removeAttribute('src'); fi.style.display = 'none'; }

  const rt = document.getElementById('post-read-time');
  if (rt) {
    const words = (p.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;
    const mins  = Math.max(1, Math.round(words / 200));
    rt.textContent = `⏳ Vrijeme čitanja: ${mins} min`;
  }

  renderPostTags(p);
  renderSeriesNav(p);
  renderPostSources(p.sources);
  renderRelatedPosts(p);

  document.getElementById('blog-list-view').classList.add('hidden');
  document.getElementById('blog-post-view').classList.add('active');
  window.location.hash = 'post/' + id;
  renderShareBar(p);
  setPostMetaTags(p);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---- SEO: dinamički meta tagovi za blog članak ----
   Mijenja title, description, canonical, OG/Twitter te dodaje Article JSON-LD.
   Bot-ovi koji renderiraju JS (Googlebot već neko vrijeme) ovo pokupe;
   za one koji ne renderiraju JS — server-side meta bi tražio prebacivanje
   s hash-routinga na prave URL-ove (zaseban posao). */
function setPostMetaTags(p) {
  const baseUrl = 'https://alkemijana.com/';
  const url     = baseUrl + '#post/' + p.id;
  const plain   = (p.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const desc    = (p.excerpt && p.excerpt.trim()) || plain.slice(0, 160);
  const img     = safeImgSrc(p.imageUrl) || baseUrl + 'og/home.svg';
  const title   = `${p.title} — Alkemijana`;

  document.title = title;
  const set = (id, attr, val) => { const el = document.getElementById(id); if (el) el.setAttribute(attr, val); };
  set('meta-description', 'content', desc);
  set('meta-canonical',   'href',    url);
  set('og-type',          'content', 'article');
  set('og-title',         'content', title);
  set('og-description',   'content', desc);
  set('og-image',         'content', img);
  set('og-url',           'content', url);
  set('tw-title',         'content', title);
  set('tw-description',   'content', desc);
  set('tw-image',         'content', img);

  // Article JSON-LD — ubacujemo/zamjenjujemo poseban <script id="ld-article">
  let ld = document.getElementById('ld-article');
  if (!ld) {
    ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.id   = 'ld-article';
    document.head.appendChild(ld);
  }
  ld.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": p.title,
    "description": desc,
    "image": img,
    "datePublished": p.date || undefined,
    "inLanguage": "hr-HR",
    "author": { "@type": "Person", "name": "Jana", "url": baseUrl },
    "publisher": {
      "@type": "Organization",
      "name": "Alkemijana",
      "logo": { "@type": "ImageObject", "url": baseUrl + "og/home.svg" }
    },
    "mainEntityOfPage": { "@type": "WebPage", "@id": url },
    "keywords": (getPostTags(p) || []).join(", ")
  });
}

function resetPostMetaTags() {
  const baseUrl = 'https://alkemijana.com/';
  const title   = 'Alkemijana - Tarot & Astrologija';
  const desc    = 'Alkemijana - osobni blog o tarotu, astrologiji i samospoznaji. Mistični kutak za unutarnje istraživanje i razmišljanje. Već znate - karte samo pokazuju put.';
  const img     = baseUrl + 'og/home.svg';

  document.title = title;
  const set = (id, attr, val) => { const el = document.getElementById(id); if (el) el.setAttribute(attr, val); };
  set('meta-description', 'content', desc);
  set('meta-canonical',   'href',    baseUrl);
  set('og-type',          'content', 'website');
  set('og-title',         'content', title);
  set('og-description',   'content', desc);
  set('og-image',         'content', img);
  set('og-url',           'content', baseUrl);
  set('tw-title',         'content', title);
  set('tw-description',   'content', desc);
  set('tw-image',         'content', img);
  const ld = document.getElementById('ld-article');
  if (ld) ld.remove();
}

function renderPostTags(p) {
  const wrap = document.getElementById('post-tags');
  if (!wrap) return;
  const tags = getPostTags(p);
  if (!tags.length) { wrap.style.display = 'none'; wrap.innerHTML = ''; return; }
  wrap.style.display = '';
  wrap.innerHTML = tags.map(t =>
    `<span class="post-tag" onclick="openBlogWithTag('${esc(t).replace(/'/g, "\\'")}')">${esc(t)}</span>`
  ).join('');
}

/* "Možda će ti se svidjeti" — 3 random druga članka (ne ovaj, ne arhivirani,
   ne oni već prikazani u serijal-nav iznad). Daje ljudima što čitati dalje. */
function renderRelatedPosts(p) {
  const wrap = document.getElementById('post-related');
  const grid = document.getElementById('post-related-grid');
  if (!wrap || !grid) return;

  // Isključi ovaj članak, arhivirane, i one iz iste serije (jer su već vidljivi)
  const seriesKey = p.series ? p.series.trim().toLowerCase() : null;
  const pool = BLOG_POSTS.filter(x =>
    !x.archived &&
    x.id !== p.id &&
    (!seriesKey || !x.series || x.series.trim().toLowerCase() !== seriesKey)
  );

  if (!pool.length) { wrap.style.display = 'none'; grid.innerHTML = ''; return; }

  // Fisher-Yates shuffle + uzmi 3
  const shuffled = pool.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const picks = shuffled.slice(0, 3);

  grid.innerHTML = picks.map(blogCard).join('');
  wrap.style.display = 'block';
}

function renderSeriesNav(p) {
  const wrap = document.getElementById('post-series-nav');
  if (!wrap) return;
  if (!p.series) { wrap.style.display = 'none'; wrap.innerHTML = ''; return; }

  // Svi članci u istom serijalu (case-insensitive match), sortirani po seriesPart
  const seriesKey = p.series.trim().toLowerCase();
  const inSeries = BLOG_POSTS
    .filter(x => !x.archived && x.series && x.series.trim().toLowerCase() === seriesKey)
    .sort((a, b) => (a.seriesPart || 0) - (b.seriesPart || 0));

  if (inSeries.length < 2) { wrap.style.display = 'none'; wrap.innerHTML = ''; return; }

  const idx = inSeries.findIndex(x => x.id === p.id);
  const prev = idx > 0 ? inSeries[idx - 1] : null;
  const next = idx < inSeries.length - 1 ? inSeries[idx + 1] : null;
  const total = inSeries.length;
  const partNum = p.seriesPart || (idx + 1);

  let html = `
    <div class="series-badge">
      <span class="series-badge-label">SERIJAL</span>
      <span class="series-badge-name">${esc(p.series)}</span>
      <span class="series-badge-part">Dio ${partNum} od ${total}</span>
    </div>
    <div class="series-nav-cards">`;

  const seriesCardInner = (x) => {
    const safeXImg = safeImgSrc(x.imageUrl);
    return `
    <div class="series-nav-thumb">
      ${safeXImg ? `<img src="${esc(safeXImg)}" alt="">` : `<span class="series-nav-thumb-icon">${esc(x.icon || '✦')}</span>`}
    </div>
    <div class="series-nav-text">
      <div class="series-nav-num">Dio ${esc(x.seriesPart || '')}</div>
      <div class="series-nav-title">${esc(x.title)}</div>
    </div>`;
  };

  if (prev) {
    html += `
      <a class="series-nav-card series-prev" onclick="openPost('${esc(prev.id)}')">
        <div class="series-nav-dir">← Prethodni dio</div>
        <div class="series-nav-body">${seriesCardInner(prev)}</div>
      </a>`;
  }
  if (next) {
    html += `
      <a class="series-nav-card series-next" onclick="openPost('${esc(next.id)}')">
        <div class="series-nav-dir">Sljedeći dio →</div>
        <div class="series-nav-body">${seriesCardInner(next)}</div>
      </a>`;
  }
  html += `</div>`;

  wrap.innerHTML = html;
  wrap.style.display = 'block';
}

function renderPostSources(raw) {
  const wrap = document.getElementById('post-sources');
  const list = document.getElementById('post-sources-list');
  if (!wrap || !list) return;

  const text = (raw || '').trim();
  if (!text) { wrap.style.display = 'none'; list.innerHTML = ''; return; }

  const items = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (!items.length) { wrap.style.display = 'none'; list.innerHTML = ''; return; }

  const urlRe = /(https?:\/\/[^\s<>"']+)/g;
  list.innerHTML = items.map(item => {
    const safe = esc(item);
    const linked = safe.replace(urlRe, u => {
      const display = u.replace(/^https?:\/\//, '').replace(/\/$/, '');
      return `<a href="${u}" target="_blank" rel="noopener noreferrer">${display}</a>`;
    });
    return `<li>${linked}</li>`;
  }).join('');
  wrap.style.display = 'block';
}

function closeBlogPost() {
  document.getElementById('blog-post-view').classList.remove('active');
  document.getElementById('blog-list-view').classList.remove('hidden');
  window.location.hash = '';
  resetPostMetaTags();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderShareBar(p) {
  document.getElementById('share-bar').innerHTML = `
    <span>Podijeli:</span>
    <button class="share-btn" onclick="copyPostLink('${p.id}', this)">🔗 Kopiraj link</button>
    <button class="share-btn" onclick="downloadPostPdf('${p.id}')">📄 Skini PDF</button>`;
}

function copyPostLink(id, btn) {
  const url = window.location.origin + '/post/' + id;
  navigator.clipboard.writeText(url).then(() => {
    btn.textContent = '✓ Kopirano!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = '🔗 Kopiraj link'; btn.classList.remove('copied'); }, 2500);
  });
}

/* ---- SKINI ČLANAK KAO PDF ----
   Otvara novi prozor s "print-ready" verzijom članka (bijela podloga, crna slova,
   naslovna slika kao mala kružnica u kutu, brojevi stranica preko CSS @page).
   Posjetitelj može u dialogu odabrati "Save as PDF" ili printati. */
function downloadPostPdf(id) {
  const p = BLOG_POSTS.find(x => x.id === id);
  if (!p) return;

  const cover    = safeImgSrc(p.imageUrl);
  const dateStr  = p.date || '';
  const content  = p.content || '';
  const titleEsc = esc(p.title);
  const safeFile = (p.title || 'clanak').replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-').toLowerCase().slice(0, 80) || 'clanak';

  const html = `<!DOCTYPE html>
<html lang="hr">
<head>
<meta charset="utf-8">
<title>${titleEsc} — Alkemijana</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Playfair+Display:wght@500;600;700&family=Tangerine:wght@700&display=swap" rel="stylesheet">
<style>
  @page {
    size: A4;
    margin: 18mm 16mm 22mm 16mm;
    @bottom-center {
      content: "— " counter(page) " / " counter(pages) " —";
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 9pt;
      color: #666;
    }
  }
  * { box-sizing: border-box; }
  html, body { background: #ffffff !important; color: #111 !important; margin: 0; padding: 0; }
  body {
    font-family: 'Cormorant Garamond', Georgia, 'Times New Roman', serif;
    font-size: 12pt;
    line-height: 1.7;
    color: #111;
  }
  .no-print-bar {
    background: linear-gradient(180deg,#f8f5fb,#efeaf5);
    border-bottom: 1px solid #d8cee6;
    padding: 14px 16px;
    text-align: center;
    font-family: 'Quicksand', system-ui, sans-serif;
    position: sticky; top: 0; z-index: 10;
  }
  .no-print-bar button {
    background: #4a2d6a; color: #fff; border: 0; border-radius: 4px;
    padding: 9px 18px; margin: 0 4px; cursor: pointer;
    font-family: inherit; font-size: 13px; font-weight: 600; letter-spacing: 0.05em;
  }
  .no-print-bar button:hover { background: #5d3d82; }
  .no-print-bar .hint { display:block; margin-top:8px; color:#5a4a72; font-size:12px; }

  .sheet { max-width: 178mm; margin: 8mm auto 0; padding: 0 4mm 14mm; }

  .pdf-header {
    position: relative;
    text-align: center;
    border-bottom: 1px solid #c9bcd9;
    padding: 4mm 4mm 6mm 4mm;
    margin-bottom: 8mm;
    min-height: 30mm;
  }
  .pdf-brand {
    font-family: 'Tangerine', cursive;
    font-size: 48pt;
    color: #3d245a;
    line-height: 1;
    margin: 0;
  }
  .pdf-cover-frame {
    position: absolute;
    top: 2mm;
    right: 2mm;
    padding: 1.8mm;
    background: #faf6ef;
    border: 1.2px solid #3d245a;
    box-shadow: 0 1.5px 4px rgba(0,0,0,0.18);
  }
  .pdf-cover-frame::before {
    content: '';
    position: absolute;
    inset: 0.9mm;
    border: 0.4px solid #8a6db0;
    pointer-events: none;
  }
  .pdf-cover {
    display: block;
    max-width: 30mm;
    max-height: 24mm;
    width: auto;
    height: auto;
  }

  .pdf-meta {
    text-align: center;
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 9pt;
    color: #6a5a82;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    margin-bottom: 5mm;
  }
  h1.pdf-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-weight: 600;
    font-size: 26pt;
    line-height: 1.25;
    color: #111;
    text-align: center;
    margin: 0 0 5mm 0;
    page-break-after: avoid;
  }
  .pdf-ornament {
    text-align: center;
    color: #8a6db0;
    font-size: 13pt;
    letter-spacing: 1.2em;
    margin: 4mm 0 7mm;
    padding-left: 1.2em;
  }

  .pdf-body { color: #111; }
  .pdf-body, .pdf-body * { background: transparent !important; }
  .pdf-body p { margin: 0 0 4mm 0; orphans: 3; widows: 3; text-align: justify; }
  .pdf-body h1, .pdf-body h2, .pdf-body h3, .pdf-body h4 {
    font-family: 'Playfair Display', Georgia, serif;
    color: #2a1d4a;
    page-break-after: avoid;
    break-after: avoid;
  }
  .pdf-body h2 { font-size: 16pt; margin: 8mm 0 3mm; }
  .pdf-body h3 { font-size: 13pt; margin: 6mm 0 2mm; }
  .pdf-body blockquote {
    border-left: 3px solid #8a6db0;
    padding: 1mm 0 1mm 5mm;
    margin: 5mm 0;
    font-style: italic;
    color: #2a2138;
  }
  .pdf-body img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 6mm auto;
    page-break-inside: avoid;
    break-inside: avoid;
    border-radius: 2px;
  }
  .pdf-body a { color: #4a2d6a; text-decoration: underline; }
  .pdf-body ul, .pdf-body ol { padding-left: 8mm; margin: 3mm 0 4mm; }
  .pdf-body li { margin-bottom: 2mm; }
  .pdf-body hr { border: 0; border-top: 1px solid #c9bcd9; margin: 6mm 0; }

  .pdf-footer {
    margin-top: 10mm;
    padding-top: 4mm;
    border-top: 1px solid #c9bcd9;
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 9pt;
    color: #6a5a82;
    text-align: center;
    letter-spacing: 0.15em;
  }
  .pdf-footer .star { color: #8a6db0; letter-spacing: 0.6em; display: block; margin-bottom: 2mm; }

  @media print {
    html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print, .no-print-bar { display: none !important; }
    .sheet { margin: 0; padding: 0; max-width: none; }
  }
</style>
</head>
<body>
  <div class="no-print-bar">
    <button onclick="window.print()">🖨️ Printaj / Spremi kao PDF</button>
    <button onclick="window.close()">✕ Zatvori</button>
    <span class="hint">U dijalogu odaberi <b>"Save as PDF"</b> kao odredište kako bi skinuo članak.</span>
  </div>

  <div class="sheet">
    <header class="pdf-header">
      ${cover ? `<div class="pdf-cover-frame"><img class="pdf-cover" src="${esc(cover)}" alt=""></div>` : ''}
      <div class="pdf-brand">Alkemijana</div>
    </header>

    ${dateStr ? `<div class="pdf-meta">${esc(dateStr)}</div>` : ''}
    <h1 class="pdf-title">${titleEsc}</h1>
    <div class="pdf-ornament">✦ ✦ ✦</div>

    <article class="pdf-body">${content}</article>

    <div class="pdf-footer">
      <span class="star">✦ ✦ ✦</span>
      Alkemijana · alkemijana.com
    </div>
  </div>

  <script>
    document.title = ${JSON.stringify(safeFile + ' — Alkemijana')};
    function waitForImages() {
      const imgs = Array.from(document.images || []);
      if (!imgs.length) return Promise.resolve();
      return Promise.all(imgs.map(img => img.complete ? Promise.resolve() :
        new Promise(res => { img.onload = img.onerror = res; })));
    }
    window.addEventListener('load', function () {
      waitForImages().then(() => setTimeout(() => window.print(), 350));
    });
  <\/script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('Molim dopusti pop-up prozore za ovu stranicu kako bi mogao/la skinuti PDF.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
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
  const uslugePage   = document.getElementById('usluge');
  const svcFormGroup = document.getElementById('svc-form-group');
  const svcFormRow   = document.getElementById('svc-form-row');

  if (navUsluge)    navUsluge.style.display    = show ? '' : 'none';
  if (homeSvc)      homeSvc.style.display      = show ? 'block' : 'none';
  if (homeCta)      homeCta.style.display      = show ? 'block' : 'none';
  if (uslugePage)   uslugePage.style.display   = show ? '' : 'none';
  if (svcFormGroup) svcFormGroup.style.display = show ? '' : 'none';
  if (svcFormRow)   svcFormRow.style.gridTemplateColumns = show ? '' : '1fr';

  // Ponovno renderiraj usluge/cjenik — ako je toggle prebačen, ovo
  // ili napuni grid-ove ili ih očisti (renderServices/renderPricingTable
  // sami provjeravaju showServices stanje).
  renderServices();
  renderPricingTable();

  // O meni slika
  const aboutImg = document.getElementById('about-image-float');
  if (aboutImg) {
    const safeAbout = safeImgSrc(SITE_SETTINGS.aboutImageUrl);
    aboutImg.innerHTML = safeAbout ? `<img src="${esc(safeAbout)}" alt="Jana">` : '';
  }
}

/* ---- TEKSTOVI ---- */

function applyTexts() {
  const t = TEXTS;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val == null ? '' : val; };

  /* LEGAL: kad je showServices=false, sve service-y tekstove postavljamo
     na prazan string. Crawleri/View Source tako ne vide ni naslove
     poput "Moje usluge", "Cjenik", "Zakazi susret", "Rezerviraj termin". */
  const svc = SITE_SETTINGS.showServices;

  // Početna
  set('t-heroSub',          t.heroSub);
  set('t-heroDesc',         t.heroDesc);
  set('t-servicesTitle',    svc ? t.servicesTitle : '');
  set('t-servicesSub',      svc ? t.servicesSub   : '');
  set('t-ctaTitle',         svc ? t.ctaTitle      : '');
  set('t-ctaText',          svc ? t.ctaText       : '');
  set('t-ctaBtn',           svc ? t.ctaBtn        : '');
  set('t-reviewsTitle',     t.reviewsTitle);
  set('t-reviewsSub',       t.reviewsSub);
  set('t-blogPreviewTitle', t.blogPreviewTitle);
  set('t-blogPreviewSub',   t.blogPreviewSub);
  set('t-blogPreviewBtn',   t.blogPreviewBtn);

  // Stranica Usluge — sve tekstove cistimo ako !svc
  set('t-servicesPageTitle', svc ? t.servicesPageTitle : '');
  set('t-servicesPageSub',   svc ? t.servicesPageSub   : '');
  set('t-pricingTitle',      svc ? t.pricingTitle      : '');
  set('t-pricingSub',        svc ? t.pricingSub        : '');
  set('t-servicesCtaTitle',  svc ? t.servicesCtaTitle  : '');
  set('t-servicesCtaText',   svc ? t.servicesCtaText   : '');
  set('t-servicesCtaBtn',    svc ? t.servicesCtaBtn    : '');

  // O meni
  set('t-aboutPageTitle',    t.aboutPageTitle);
  set('t-aboutP1',           t.aboutP1);
  set('t-aboutP2',           t.aboutP2);
  set('t-aboutP3',           t.aboutP3);
  set('t-aboutP4',           t.aboutP4);
  set('t-aboutP5',           t.aboutP5);
  set('t-aboutQuote',        t.aboutQuote);
  set('t-aboutReviewsTitle', t.aboutReviewsTitle);

  // Filozofija
  set('t-philosophyTitle',       t.philosophyTitle);
  set('t-valueDiscretionTitle',  t.valueDiscretionTitle);
  set('t-valueDiscretionText',   t.valueDiscretionText);
  set('t-valueHonestyTitle',     t.valueHonestyTitle);
  set('t-valueHonestyText',      t.valueHonestyText);
  set('t-valueFreedomTitle',     t.valueFreedomTitle);
  set('t-valueFreedomText',      t.valueFreedomText);

  // Blog stranica
  set('t-blogPageTitle', t.blogPageTitle);
  set('t-blogPageSub',   t.blogPageSub);
  set('t-relatedTitle',  t.relatedTitle);

  // Natalna karta
  set('t-natalPageTitle',    t.natalPageTitle);
  set('t-natalPageSub',      t.natalPageSub);
  set('t-natalNote',         t.natalNote);
  set('t-natalPosterTitle',  t.natalPosterTitle);
  set('t-natalPosterText',   t.natalPosterText);
  set('t-natalWorkingTitle', t.natalWorkingTitle);
  set('t-natalWorkingText',  t.natalWorkingText);
  // gumbi imaju funkcionalne id-eve pa im tekst postavljamo direktno
  set('natal-submit',      t.natalBtn);
  set('natal-poster-btn',  t.natalPosterBtn);
  set('natal-working-btn', t.natalWorkingBtn);

  // Footer
  set('t-footerTagline', t.footerTagline);

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
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/'/g, '&#39;');
}

/* Vraća URL samo ako je http(s) ili data:image — inače prazan string.
   Sprječava da netko stavi javascript: URL u admin polje slike. */
function safeImgSrc(u) {
  if (!u) return '';
  const raw = String(u).toLowerCase();
  let clean = '';
  for (let i = 0; i < raw.length; i++) {
    if (raw.charCodeAt(i) > 32) clean += raw[i];
  }
  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:image/')) {
    return String(u);
  }
  return '';
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
