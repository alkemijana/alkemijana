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
│   └── admin.js                    ← Admin panel logika
├── functions/
│   └── save-data.js                ← Cloudflare Pages Function za auto-save preko GitHub API
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
- **Stranica:** SPA (single page) — JS prebacuje između sekcija (početna, blog, o-meni, kontakt)

---

## Admin sustav

### Pristup
- URL: **alkemijana.com#admin**
- Username: **jana**
- Lozinka: **morasmora2026**

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
Za testiranje serverless funkcije lokalno: `npx wrangler pages dev` (ako instalirano).

---

## Sigurnost

- Lozinka admin je hard-coded u dva mjesta: `admin.js` (`ADMIN_CREDS.pass`) i `functions/save-data.js`. **Mora se sinkronizirati!**
- GitHub token je u Cloudflare Pages env varu — NIJE u kodu.
- ImgBB i Web3Forms ključevi su u kodu — to je OK, oni su client-side ključevi s rate limit-om.

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
