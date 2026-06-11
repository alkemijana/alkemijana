# Alkemijana — Vodič za Claude Code

Ovaj dokument sadrži sve što Claude Code treba znati o projektu.
Otvori ga ili daj ga Claudeu kao kontekst pri novom razgovoru.

---

## Što je projekt

**Alkemijana** je web stranica za tarot/astrologiju (vlasnica: Jana, Rab).
Statična web aplikacija — HTML + CSS + vanilla JS, bez framework-a.
Hostana na Cloudflare Pages, repozitorij na GitHubu, automatski deploy.

**Domena:** alkemijana.com
**Cloudflare Pages URL:** alkemijana.pages.dev
**GitHub repo:** https://github.com/alkemijana/alkemijana

---

## Struktura datoteka

```
ALKEMIJANA WEBSITE/
├── index.html                      ← Glavna stranica + SVG zviježđa + admin HTML
├── css/style.css                   ← Svi stilovi
├── js/
│   ├── data.js                     ← Podaci (blog, usluge, cjenik, recenzije, tekstovi, postavke)
│   ├── app.js                      ← Navigacija, renderiranje, blog, animacije
│   ├── admin.js                    ← Admin panel logika
│   ├── natal-data.js               ← Natalna karta: konstante, glifovi, palete, helperi (norm360, fmtDegMin, glyphSvg...)
│   ├── natal-calc.js               ← Natalna karta: astronomski izračun (computeChart, Placidus, Kiron, aspekti)
│   ├── natal-render.js             ← Natalna karta: SVG kotač + tablice na stranici
│   ├── natal-pdf.js                ← Natalna karta: PDF eksport (poster A4–A0 + radna A4)
│   ├── natal.js                    ← Natalna karta: forma, geocoding, init (glue — učitava se zadnji)
│   ├── natal-chiron.js             ← Chiron efemerida (JPL Horizons 1900–2100, generirano — ne uređivati)
│   └── lib/                        ← Vendorirane biblioteke (astronomy-engine, jsPDF, svg2pdf) — lazy-load
├── assets/fonts/                   ← TTF fontovi koji se ugrađuju u PDF (Tangerine, Playfair, Quicksand)
├── functions/
│   └── save-data.js                ← Cloudflare Pages Function za auto-save preko GitHub API
├── tools/serve.ps1                 ← Lokalni dev HTTP server (PowerShell) — nije dio stranice
├── .gitignore
└── CLAUDE.md                       ← ovaj fajl
```

`BACKUP ALKEMIJANA/` i `AlkemiJana.html` su u .gitignore — ignoriraju se.

---

## Vizualni identitet

- **Boje:** tamno ljubičasta, lavender, sage green, srebrna; **NIKAD** zlatna
- **Glavni font (logo, hero):** Tangerine (cursive, mistično rukopisno)
- **Naslovi sekcija:** Playfair Display
- **Body tekst:** Cormorant Infant
- **UI elementi/labels:** Quicksand
- **Italic citati:** Cormorant Garamond
- **Pozadina:** 12 horoskopskih zviježđa kao SVG (samo zvijezde, bez linija/imena)
- **Animacije:** suptilan glow na "Alkemijana" naslovu (10s ciklus); povremeni glare ✦ bljesak na pozadini (svakih 30–60s)
- **Stranica:** SPA (single page) — JS prebacuje između sekcija (početna, blog, o-meni, natalna karta, kontakt)

---

## Natalna karta (js/natal.js)

Besplatni alat za posjetitelje — stranica **#natal** u navigaciji.

- **Izračun:** astronomy-engine (vendoriran u `js/lib/`, lazy-load pri prvom izračunu).
  Geocentrične pozicije na ekliptici datuma, retrogradnost, pravi Mjesečev čvor
  (oskulirajući, iz state vektora), srednja Lilith (Meeus), Kiron iz vlastite
  efemeride (`js/natal-chiron.js`, interpolacija JPL Horizons podataka, 1900–2099),
  Fortuna (dnevna/noćna formula) i Vertex (ascendent ko-širine uz RAMC+180°) —
  izvedene točke, ne ulaze u aspekte. Mjesečev čvor: pravi (default) ili srednji —
  switch u formi (`aj_natal_node` u localStorage), preračunava postojeću kartu.
- **Kartice rezultata (kao Astro-Seek):** Pozicije (tablice planeta/kuća/aspekata),
  Aspektna tablica (trokutasta mreža), Dominante (elementi/kvalitete ponderirano +
  najaspektiraniji), Oblik karte (Jonesovi uzorci — computeDominants/detectShape
  u natal-calc.js). Minute se odsijecaju, ne zaokružuju (kao Astro-Seek).
- **Točnost:** verificirano protiv JPL Horizons — planeti unutar ~5 lučnih sekundi;
  ASC/MC/Placidus provjereni geometrijski (visina ASC = 0°, omjeri polulukova 1/3, 2/3).
  Rezultati se poklapaju s Astro-Seekom (isti izvori efemerida).
- **Kuće:** Placidus (iterativno); blokirano za |lat| > 66°. ASC/MC standardne formule.
- **Vrijeme:** mjesto → Open-Meteo geocoding (besplatan, bez ključa) daje IANA zonu;
  povijesni UTC offseti (ljetno vrijeme, Jugoslavija...) preko `Intl.DateTimeFormat`.
- **Kotač:** SVG, glifovi planeta/znakova su ručno crtani path-evi u `GLYPHS` objektu
  (ne ovise o fontovima — identični na ekranu i u PDF-u). Palete u `PALETTES`
  (dark/light/poster/ink) + boje elemenata (fire/earth/air/water za znakove);
  kotač se ponovo iscrta pri promjeni teme (MutationObserver). Astro-Seek stil:
  planeti u prstenu kao stupanj · glif znaka · minute (R uz glif ako je retrogradno);
  osi ASC/DSC/MC/IC prekinute u unutarnjoj kružnici, s oznakom i stupnjem unutar
  kotača; crtice na unutarnjoj kružnici pokazuju gdje počinju aspektne linije.
- **PDF (jsPDF + svg2pdf, lazy-load):** poster A4–A0 (vektorski, tamni dizajn sa
  zvijezdama, Tangerine naslov) i radna A4 verzija (svijetla, karta + tablice pozicija/
  kuća/aspekata). TTF fontovi iz `assets/fonts/` ugrađuju se u PDF pri preuzimanju.
- Zadnji unos forme čuva se u `localStorage` (`aj_natal_form`).
- Nema admin integracije — alat nema sadržaja za uređivanje.

---

## Admin sustav

### Pristup
- URL: **alkemijana.com#admin**
- Username: **jana**
- Lozinka: pohranjena u Cloudflare Pages env varu `ADMIN_PASS` (NIJE u kodu)

### Što admin može
1. **Blog** — dodaj/uredi/obriši/arhiviraj članke, upload slike (ImgBB), rich text editor
2. **Usluge** — dodaj/uredi/arhiviraj usluge, izaberi emoji ikonu (60+ astroloških), per-uslugu toggle "prikaži cijenu" i "prikaži trajanje"
3. **Cjenik** — uredi tablicu cijena
4. **Recenzije** — dodaj/uredi/arhiviraj recenzije za početnu i o-meni
5. **Tekstovi** — uredi sav statički tekst (hero, CTA, naslovi sekcija, footer...)
6. **Statistika** — GoatCounter analytics (ukupno posjeta, jedinstveni, po stranicama, blog članci, 30-dnevni graf)
7. **Toggle gumbi (dropdown "Prikaz"):** Usluge On/Off, Rec. Početna, Rec. O meni
8. **📷 Slika** — upload vlastite slike za O meni
9. **↓ Spremi** — automatski commit-a `data.js` na GitHub preko Cloudflare Pages funkcije → auto-deploy na Cloudflareu za ~30 sek
10. **Arhiviranje** — svaki blog/usluga/cjenik/recenzija ima checkbox "Arhivirano" → skriva od posjetitelja, ali ostaje u adminu da se može vratiti

### Kako auto-save radi
Admin "Spremi" gumb šalje POST na `/save-data` s podacima i lozinkom.
Cloudflare Pages funkcija provjeri lozinku i koristi GitHub API token (Cloudflare env var `GITHUB_TOKEN`) za commit na repo.
GitHub trigerira Cloudflare Pages deploy → stranica se osvježi za 30 sek.

---

## Vanjski servisi

| Servis | Svrha | API ključ |
|--------|-------|-----------|
| **ImgBB** | Upload slika (`uploadToImgBB` u admin.js) | Hard-coded u `IMGBB_KEY` |
| **Web3Forms** | Kontakt forma | Hard-coded `value` u `<input name="access_key">` u index.html |
| **GoatCounter** | Analytics | Site `alkemijana.goatcounter.com`, javni counter API |
| **GitHub API** | Auto-save iz admina | Token u Cloudflare env var `GITHUB_TOKEN` |

---

## Razvoj — git workflow

Svaka promjena ide kroz git:

```powershell
cd "D:\Programiranje\ALKEMIJANA WEBSITE"
git pull --rebase                    # uvijek prvo pull (jer auto-save piše na repo)
# ... uredi datoteke ...
git add -A
git commit -m "Opis promjene"
git push                             # Cloudflare Pages automatski deploya
```

**VAŽNO:** uvijek `git pull --rebase` prije push-a jer admin može u međuvremenu spremati promjene preko serverless funkcije.

---

## Posebne tehnike u kodu

### data.js — markeri za auto-save
Svaki dio podataka omeđen je markerima:
```js
// ===ALKEMIJANA:BLOG_POSTS:START===
let BLOG_POSTS = [...];
// ===ALKEMIJANA:BLOG_POSTS:END===
```
Markeri se NE smiju mijenjati — `downloadSite()` u admin.js ih koristi za regeneriranje fajla.

### Toggle vidljivosti sekcija
`SITE_SETTINGS` u data.js → `applySettings()` u app.js postavlja `display:none/block`.
Sekcije imaju ID-eve poput `home-services-section`, `home-reviews-section`, `about-reviews-section`.

### Tekstovi (TEXTS objekt)
Svi statički tekstovi u `TEXTS` objektu u data.js.
HTML elementi imaju `id="t-naziv"`.
`applyTexts()` u app.js postavlja `textContent` iz `TEXTS[naziv]`.

### Zvjezdice na pozadini
SVG s ručno postavljenim circle elementima na koordinatama stvarnih horoskopskih zviježđa (RA/Dec).
Veličina kruga odgovara prividnoj magnitudi zvijezde.
Boje: bjelkasti tonovi za većinu, narančasti za Aldebaran/Antares, hladniji ljubičasti za pozadinske.

### Blog članci — URL routing
Klik na članak → `openPost(id)` → `window.location.hash = 'post/<id>'`
Pri učitavanju stranice JS provjerava hash → automatski otvori članak (deep linking).
Gumb "Kopiraj link" kopira URL s tim hash-om.

---

## Česti zadaci za Claude Code

### Promjena dizajna / boja / fontova
Uredi `css/style.css`. Test lokalno otvaranjem `index.html` u browseru.
Push na git.

### Dodavanje nove sekcije na stranicu
1. Dodaj HTML u `index.html` (unutar `<div class="content">`)
2. Stilove u `css/style.css`
3. Ako sadržaj dolazi iz podataka — dodaj u `js/data.js` i render funkciju u `js/app.js`
4. Ako treba admin — dodaj tab u admin panel (`index.html`), funkciju za render u `js/admin.js`, ažuriraj `downloadSite()` da uključi nove podatke

### Mijenjanje admin tabova
Admin tabovi imaju strukturu: HTML `<div class="ap-tab-content" id="ap-NAZIV">` + `<button id="tab-NAZIV" onclick="switchTab('NAZIV')">`.
U `admin.js` `switchTab()` poziva odgovarajuću render funkciju.

### Lokalni razvoj (testing prije deploya)
Otvori `index.html` u browseru — sve radi osim auto-save (koristi fallback download).
Za natalnu kartu (fetch fontova za PDF) bolje je preko HTTP servera:
`powershell -File tools/serve.ps1` → http://localhost:8344 (radi i bez Node/Pythona).
Za testiranje serverless funkcije lokalno: `npx wrangler pages dev` (ako instalirano).

---

## Sigurnost

- Lozinka admin je u Cloudflare Pages env varu `ADMIN_PASS` — NIJE u kodu.
  - Login overlay šalje upisanu lozinku na `/verify-pass` koja je uspoređuje s env varom.
  - Nakon uspjeha lozinka se drži u `sessionStorage` (`aj_pass`) i šalje kao `X-Admin-Pass` header na `/save-data`.
- GitHub token je u Cloudflare Pages env varu `GITHUB_TOKEN` — NIJE u kodu.
- ImgBB i Web3Forms ključevi su u kodu — to je OK, oni su client-side ključevi s rate limit-om.
- HTML sanitizator (`sanitizeContentHtml` u admin.js) koristi whitelist atributa i validira href/src sheme — sve `on*` event handlere automatski briše.

---

## Što IZBJEGAVATI

- **Brisanje sadržaja** — Jana želi mogućnost arhiviranja (toggle), ne brisanja
- **Zlatna boja** — ne pristaje viziji
- **Dodavanje cijena / oglašavanja usluga** dok Jana nema obrt — usluge su trenutno OFF preko toggla
- **Mijenjanje markera u data.js** — auto-save ovisi o njima
- **Push bez pull-a** — auto-save može pisati paralelno

---

## Prompt za pokretanje nove Claude sesije

```
Radim na web stranici Alkemijana.com (tarot/astrologija).
Projekt je u D:\Programiranje\ALKEMIJANA WEBSITE.
Pročitaj CLAUDE.md za sve detalje o projektu, dizajnu, admin sustavu i workflow-u.
Sve promjene committaj i pushaj na git — Cloudflare Pages automatski deploya.
Prvo napravi git pull --rebase.
```

---

*Zadnje ažuriranje: nakon implementacije auto-save, ImgBB, GoatCounter analytics i čišćenja admin bara.*
