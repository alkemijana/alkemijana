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
│   ├── data.js                     ← Podaci (blog, usluge, cjenik, recenzije, tekstovi, postavke, TAROT_CARD_TEXTS)
│   ├── app.js                      ← Navigacija, renderiranje, blog, animacije
│   ├── admin.js                    ← Admin panel logika
│   ├── natal-data.js               ← Natalna karta: konstante, glifovi, palete, helperi (norm360, fmtDegMin, glyphSvg...)
│   ├── natal-calc.js               ← Natalna karta: astronomski izračun (computeChart, Placidus, Kiron, aspekti)
│   ├── natal-render.js             ← Natalna karta: SVG kotač + tablice na stranici
│   ├── natal-pdf.js                ← Natalna karta + sinastrija: PDF eksport (poster A4–A0 + radna A4)
│   ├── natal.js                    ← Natalna karta: forma, geocoding, init (glue)
│   ├── natal-synastry.js           ← Sinastrija: prekidač moda, forma 2. osobe, submit, kontrole (glue — nakon natal.js)
│   ├── natal-transit.js            ← Tranziti: kontrola vremena (5 slidera), živi bi-wheel, submit, PDF (glue — nakon natal-synastry.js)
│   ├── natal-acg.js                ← AstroCartography: submit, izračun MC/IC/ASC/DSC linija po planetu (glue — nakon natal-transit.js)
│   ├── natal-acg-render.js         ← AstroCartography: Leaflet karta (lazy-load CDN), legenda, toggle po planetu (nakon natal-acg.js)
│   ├── natal-ai.js                 ← Natalna karta: AI uvidi (Janin radni alat — admin-only, generira PDF; samostalan modul)
│   ├── natal-chiron.js             ← Chiron efemerida (JPL Horizons 1900–2100, generirano — ne uređivati)
│   └── lib/                        ← Vendorirane biblioteke (astronomy-engine, jsPDF, svg2pdf) — lazy-load
├── assets/fonts/                   ← TTF fontovi koji se ugrađuju u PDF (Tangerine, Playfair, Quicksand)
├── tarot/                          ← Virtualni tarot — skoro potpuno samostalan modul (v. odjeljak niže)
│   ├── tarot.css                   ← Svi stilovi (dark/light preko istih CSS varijabli kao style.css)
│   ├── tarot-data.js               ← 78 kanonskih karata, definicije špilova, 12 spreadova (pozicije+značenja)
│   ├── tarot-engine.js             ← Stanje bez DOM-a (špilovi, stol, otpad, postavke) — createTarotEngine()
│   ├── tarot-render.js             ← DOM izgradnja, animacije (let/flip), desktop+mobilni layout — createTarotUI()
│   ├── tarot.js                    ← Init (glue) — #tarot-app stol + #vtar-cotd-root karta dana na početnoj
│   └── assets/decks/
│       ├── rws/                    ← Rider–Waite–Smith 1909 (Wikimedia Commons, public domain) + back.svg
│       ├── marseille/              ← Tarot de Marseille, Lequart 1890 (Wikimedia Commons, public domain) + back.svg
│       ├── lenormand/              ← Samo back.svg — "uskoro" placeholder špil (nema karata)
│       └── oracle/                 ← Samo back.svg — "uskoro" placeholder špil (nema karata)
├── functions/
│   ├── save-data.js                ← Cloudflare Pages Function za auto-save preko GitHub API
│   ├── verify-pass.js              ← Provjera admin lozinke (env ADMIN_PASS)
│   ├── log-natal.js                ← Zapisuje izradu natalne karte u KV (binding NATAL_LOG)
│   ├── natal-log.js                ← Admin čitanje/brisanje evidencije karata (X-Admin-Pass)
│   ├── interpret-natal.js          ← Ruta /interpret-natal (tanki shim — pravi kod je u ai/)
│   └── ai/                         ← AI tumačenje (server): core.js (cache+limiti+dispatch), providers.js (adapteri), prompt.js
├── tools/serve.ps1                 ← Lokalni dev HTTP server (PowerShell) — nije dio stranice
├── tools/pdf-view.html             ← Dev: pregled PDF-a iz tools/_upload.bin preko pdf.js (CDN)
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

## Astro alati (stranica #natal) — natalna karta, sinastrija, tranziti, astrokartografija

Stranica **#natal** (nav link "Astro alati") okuplja sve astro alate, birane
prekidačem `.nt-mode-seg` (natal/synastry/transit/acg — `setNatalMode()` u
natal-synastry.js). Iznad forme su **4 kartice alata** (`.tool-cards-grid` u
index.html) — svaka s ručno crtanim SVG motivom (kotač/dvostruki krug/orbita/globus,
`var(--lavender)`/`var(--sage)` boje, prati temu), naslovom i kratkim opisom;
tekstovi kartica uredivi u adminu (Teksti → "Astro alati — kartice").

- **`openAstroTool(mode)`** (natal.js) — zajednička ulazna točka: `showPage('natal')`
  + `window.Synastry.setNatalMode(mode, true)` + scroll do forme. Koriste je i
  4 kartice (`onclick="openAstroTool('natal')"` itd.) i kolut "Izradi vlastitu
  natalnu kartu" na početnoj (`#home-natal-section`) — klik na kolut uvijek otvara
  mod `natal`, bez obzira na prethodno odabrani mod spremljen u `aj_natal_mode`.
- **FAQ (do 15 pitanja):** `natalFaqQ1..15`/`A1..15` u TEXTS, sva pitanja+odgovori
  u HTML-u unaprijed (`.nt-faq-item` × 15), `applyTexts()` sakriva stavku
  (`display:none`) ako je pitanje prazno — tako Jana može popuniti manje od 15 preko
  admina bez praznih redaka na stranici.
- **Upute za korištenje (vodiči):** iznad FAQ-a je sklopiva kartica (`.nt-guide` u
  index.html) s opsežnim vodičem za trenutno odabrani alat. Sadržaj je u
  `TOOL_GUIDES` bloku u data.js (markeri `===ALKEMIJANA:TOOL_GUIDES:START/END===`) —
  fiksna 4 vodiča (`id/mode/title/icon/excerpt/content/sources/archived`), uređuju
  se u adminu (tab **"Upute za alate"**, isti rich-text editor kao blog; nema
  dodavanja/brisanja, checkbox "Sakrij sa stranice" = `archived`). Render:
  `renderToolGuide(mode)` + `toggleToolGuide()` u app.js; `setNatalMode()`
  (natal-synastry.js) ih zove pri promjeni moda. Naslov sekcije i oznake
  ("Vrijeme čitanja", otvori/zatvori) su u TEXTS (`natalGuide*`); tekstovi
  prekidača modova, hintova i submit gumba po modu također su u TEXTS
  (`natalMode*`, `natalHint*`, `natalBtnSynastry/Transit/Acg` —
  `applyModeTexts()` u natal-synastry.js).

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
- **Bez vremena rođenja:** checkbox u formi (`natal-notime`) — pozicije se računaju za
  podne, karta se crta s 0° Ovna lijevo, bez kuća/ASC/MC/Fortune/Vertexa (`chart.noTime`
  flag kroz computeChart → buildChartSVG → tablice/PDF), uz napomenu da je Mjesec približan.
- **Vrijeme:** mjesto → Open-Meteo geocoding (besplatan, bez ključa) daje IANA zonu;
  povijesni UTC offseti (ljetno vrijeme, Jugoslavija...) preko `Intl.DateTimeFormat`.
- **Kotač:** SVG, glifovi planeta/znakova su ručno crtani path-evi u `GLYPHS` objektu
  (ne ovise o fontovima — identični na ekranu i u PDF-u). Palete u `PALETTES`
  (dark/light/poster/ink) + boje elemenata (fire/earth/air/water za znakove);
  kotač se ponovo iscrta pri promjeni teme (MutationObserver). Astro-Seek stil:
  planeti u prstenu kao stupanj · glif znaka · minute (R uz glif ako je retrogradno);
  osi ASC/DSC/MC/IC prekinute u unutarnjoj kružnici, s oznakom i stupnjem unutar
  kotača; crtice na unutarnjoj kružnici pokazuju gdje počinju aspektne linije.
  Kad je u kući gust skup pa se glifovi razmaknu (>1°), tanka poveznica vodi od
  stvarnog stupnja (crtica na zodijaku) do razmaknutog glifa.
- **Glifovi znakova:** DejaVu Sans (slobodni font, bez obveze atribucije), obrisi
  izvučeni i normalizirani u `viewBox 0 0 24 24` kao fill path-evi u `GLYPHS`.
- **PDF (jsPDF + svg2pdf, lazy-load):** poster A4–A0 (vektorski, tamni dizajn sa
  zvijezdama, Tangerine naslov) i radna A4 verzija (svijetla). Radna A4:
  **str. 1** = velika karta + legenda aspekata + aspektna tablica + dominante;
  **str. 2** = pozicije planeta + kuće (Placidus) + popis aspekata.
  TTF fontovi iz `assets/fonts/` ugrađuju se u PDF pri preuzimanju.
- Zadnji unos forme čuva se u `localStorage` (`aj_natal_form`).
- Pri izradi karte šalje se anoniman signal na `/log-natal` (samo hash unosa) za brojač — vidi Admin → Brojač karata.

### AI uvidi za čitanje (Janin radni alat) — izdvojeno u zaseban modul
**SAMO za prijavljenu Janu** (kartica se ne prikazuje posjetiteljima; endpoint je admin-only).
Nije tumačenje za klijenta nego **strukturirana analiza kao pomoć pri čitanju**: ključni
položaji, najuži aspekti, dominantni obrasci, glavne teme, napetosti/proturječja i pitanja
za klijenta. Umjesto teksta na ekranu → **PDF** (svijetli stil radnog PDF-a), dva gumba:
**"Uvidi → PDF"** (zaseban) i **"Uvidi → u radni PDF"** (karta + tablice + uvidi). Checkbox
**"Regeneriraj"** zaobilazi cache. Bez ikakvih limita.

**Cijeli AI dio je izdvojen** (lako za naći/mijenjati/ukloniti):
- **Klijent:** `js/natal-ai.js` — samostalan modul (`window.AInatal`). Prikaz samo ako je
  `sessionStorage.aj_pass` (admin). Serijalizira kartu u opis (pozicije/aspekti/dominante,
  **BEZ imena**), šalje POST `/interpret-natal` s `X-Admin-Pass`, pa dohvaćeni tekst predaje
  u PDF. `natal.js` ga okine s `window.AInatal.setChart(chart)`.
- **PDF:** `js/natal-pdf.js` — `downloadInsights(text)` (zaseban) i `downloadWorkingWithInsights(text)`
  (radni + uvidi); `renderInsightsPages`/`parseInsights` (## naslov, - natuknica → layout),
  `renderWorkingContent` (izdvojen sadržaj radnog PDF-a), `addFooters` (numeracija svih stranica).
- **Server:** `functions/ai/` — `core.js` (admin-gate, cache, dispatch), `providers.js` (adapteri), `prompt.js`.
  `functions/interpret-natal.js` je tanki shim (mora ostati u `functions/` zbog Cloudflare routinga).

**Provajder/model se mijenjaju BEZ koda — preko env varijabli** (Cloudflare dashboard):
- `AI_PROVIDER` — `gemini` | `cloudflare` (Workers AI, treba `AI` binding) | `openai` | `anthropic`.
  Adapter `openai` je OpenAI-kompatibilan pa preko `AI_BASE_URL` pokriva i **Groq / OpenRouter / Mistral / DeepSeek**.
- `AI_MODEL` (default po provajderu), `AI_API_KEY` (Workers AI ga ne treba), `AI_BASE_URL` (samo `openai`).
- **Aktivno:** `AI_PROVIDER=cloudflare`, model `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (Gemini free tier je regionalno blokiran).

**Pristup i cache:** endpoint zahtijeva točan `X-Admin-Pass` (= `ADMIN_PASS`), inače 403 — nema limita.
Cache u KV-u `NATAL_LOG`: `aiv2:<provider>:<model>:<hash>` (90 dana — ista karta vraća iste uvide; `fresh:true` zaobilazi).
Bez env varova / bindinga funkcija graciozno vrati grešku, a karta i PDF rade normalno.
**Privatnost:** AI poziv šalje samo pozicije karte (bez imena); PDF (Janin dokument) smije sadržavati ime/podatke rođenja.

---

## Sinastrija (js/natal-synastry.js)

Usporedba **dviju** karata na istoj stranici **#natal** — besplatno za posjetitelje.

- **Prekidač iznad forme:** „Natalna karta” ↔ „Sinastrija” (`.nt-seg` stil). U modu sinastrije
  blok **Osoba 2** se animirano otvori (max-height + opacity + slide), pojave se naslovi
  „Prva/Druga osoba” i hint, a submit gumb postaje „Izračunaj sinastriju”. Mod se pamti
  (`aj_natal_mode`), unos u `aj_synastry_form`.
- **Submit:** `natalSubmit` (natal.js) delegira na `synastrySubmit` kad je
  `#natal-form-wrap[data-natal-mode="synastry"]`. Računaju se dvije karte (`computeChart`),
  pa `renderSynastryResult`.
- **Međuaspekti:** `computeSynastryAspects(chartA, chartB)` u natal-calc.js — cross-aspekti
  planeta/osi osobe A naspram osobe B, uži orbisi (`SYN_ORBS`). Bez fortune/vertexa/J.čvora.
- **Bi-wheel:** `buildChartSVG` prima `opts.biwheel` (vanjski prsten = osoba B, `pal.planetB`
  boja) i `opts.synAspects` (linije A↔B). Osoba A je baza (kuće/osi, Placidus); prsten kuća
  pomaknut prema sredini da stanu dva prstena planeta. Natalni prikaz je **nepromijenjen**
  (isti `drawRing` helper, identičan izlaz bez `biwheel`).
- **Prikaz:** `renderSynastryResult` (natal-render.js) → legenda (koja boja koja osoba),
  bi-wheel, tablica međuaspekata (popis sortiran po orbu), pozicije obje osobe; kontrole
  aspekata (`SYN_CHART_OPTS`), ponovno iscrtavanje pri promjeni teme (MutationObserver).
- **PDF (natal-pdf.js):** `downloadSynastryPoster` (poster A4–A0, isti tamni dizajn, bi-wheel,
  oba imena + legenda) i `downloadSynastryWorking` (radni A4: bi-wheel + aspektna legenda,
  pa pozicije obje osobe + popis međuaspekata). Isti font/footer pipeline kao natalna karta.
- **Što NIJE uključeno (zasad):** AI tumačenje sinastrije, composite karta.

---

## Tranziti (js/natal-transit.js)

Treći mod na stranici **#natal** (prekidač: Natalna karta · Sinastrija · **Tranziti**) — besplatno.
Natalna karta + **tranzitni planeti** za odabrani trenutak, sa **živim klizanjem kroz vrijeme**.

- **Kontrola vremena:** polje **datum-sidro** (+vrijeme, zadano „sada") i **5 slidera**
  (Sat/Dan/Tjedan/Mjesec/Godina) sa **brojčanim poljima** uz svaki (− je unazad). Svih pet se
  **zbraja** na sidro; živi prikaz točnog datuma. Gumb „⟳ Sada" resetira sidro i offsete.
  Mjeseci/godine = kalendarska aritmetika; datum izvan 1900–2099 → Kiron se izostavi (napomena).
- **Živo, glatko osvježavanje:** natalna karta (baza) se izračuna jednom; pri pomaku slidera
  računaju se **samo tranzitni položaji** (`computeChart` noTime — geocentrični, neovisni o mjestu)
  i osvježava se **samo pomični sloj** kotača. Throttle na `requestAnimationFrame`; tablice se
  osvježavaju debounce-ano (160 ms). Bez mrežnih poziva.
- **Slojeviti bi-wheel:** `buildChartSVG` `opts.layer`: `'base'` (statična podloga: natalna karta
  unutra + kuće/osi), `'dynamic'` (samo tranzitni vanjski prsten + aspektne linije, prozirno, isti
  viewBox). Dva naslagana `<svg>` (`#transit-wheel-base` / `-dyn`) u `.tw-stack`. Natalni i
  sinastrijski prikaz (`layer:'all'`) su **nepromijenjeni**.
- **Aspekti tranzit↔natal:** `computeSynastryAspects(natal, tranzit)` (ista funkcija kao sinastrija).
  Boja tranzitnog prstena = `pal.planetT` (plava; sinastrija koristi `planetB` zelenu).
- **Prikaz:** `renderTransitResult` / `redrawTransitDynamic` / `renderTransitTables` (natal-render.js),
  `currentTransit = { natal, transit, aspects, label }`. Kontrole aspekata `TRANSIT_CHART_OPTS`.
- **PDF:** dijeli parametrizirane sinastrijske funkcije (`buildSynastryPosterSVG` /
  `renderSynastryWorkingContent` primaju `cfg` = unutarnja/vanjska karta, boja, oznake) preko
  `downloadTransitPoster` / `downloadTransitWorking` (natal-pdf.js).
- **Što NIJE uključeno (zasad):** AI tumačenje tranzita, izbor pojedinih tranzitnih tijela, progresije.

---

## AstroCartography (js/natal-acg.js, js/natal-acg-render.js)

Četvrti mod na stranici **#natal** (prekidač: Natalna karta · Sinastrija · Tranziti ·
**AstroCartography**) — besplatno. Planetarne linije preko karte svijeta: gdje bi za
osobu (po trenutku i mjestu rođenja) planet bio točno na ASC/MC/DSC/IC.

- **Forma:** ista forma kao natalna karta (Osoba 1), ali bez opcije "ne znam vrijeme
  rođenja" (`.nt-notime-chip` sakriven u ovom modu preko CSS-a) — ACG bez preciznog
  vremena rođenja nema smisla (RAMC/linije ovise o UTC trenutku).
- **Izračun (`natal-acg.js`):** za 10 klasičnih tijela (Sunce–Pluton, bez čvorova/
  Lilith/Kirona) računa se geocentrična ekvatorijalna pozicija "od datuma" (RA/Dec)
  preko `Astronomy.GeoVector` + `Astronomy.Rotation_EQJ_EQD` + `Astronomy.SphereFromVector`
  (isti obrazac kao `eclLonOfDate` u natal-calc.js, samo bez rotacije u ekliptiku —
  **ne koristi se** `Astronomy.Equator`, jer ta funkcija traži Observer i računa
  topocentričnu, ne geocentričnu poziciju). MC/IC linije = okomiti meridijani
  (`RA − GAST`); ASC/DSC krivulje = klasična formula izlaska/zalaska
  (`cos H₀ = −tan(lat)·tan(dec)`) do ±85°. ASC i DSC **dijele krajnje točke** (na
  granici cirkumpolarnosti H0→0 obje konvergiraju u MC liniju, H0→180 u IC) pa se
  vizualno spoje kao na Astro-Seeku. `computeChart` u natal-calc.js **nije dirana**.
- **Projekcija Mundo/Zodiaco/Local Space (`#acg-projection`):** za svaki planet računaju se **tri**
  seta linija — **Mundo** (prava RA/Dec s latitudom, astronomska vidljivost), **Zodiaco**
  (planet projiciran na ekliptiku, `raDecFromEcliptic(eclLon, eps)` s latitudom 0 — linije
  1:1 s relokacijskom kartom) i **Local Space** (`computeLocalSpaceSegments` — jedan veliki
  krug po planetu iz mjesta rođenja u smjeru azimuta planeta; azimut iz satnog kuta
  `H = LST − RA`, veliki krug preko `greatCirclePoint`). Dropdown prebacuje bez ponovnog
  računanja (`pl.mundo`/`pl.zodio`/`pl.local`); Local Space nema ASC/MC vs DSC/IC pa
  `acgUpdateNote` mijenja napomenu ispod karte.
- **Karta (`natal-acg-render.js`):** Leaflet (lazy-load s CDN-a, `js/lib/` ga ne
  sadrži — jedina biblioteka u projektu koja nije vendorirana lokalno), **CARTO
  light_all tile server** (nazivi gradova na engleskom/latinici; OSM piše lokalna
  pisma), stiliziran CSS filterom (`hue-rotate`/`invert`/`sepia` na `.leaflet-tile-pane`)
  u tonove Alkemijane — različit filter + pozadina karte za tamnu/svijetlu temu (nema
  bijelih rubova). Zoom 2–12, panning ograničen na svijet (`maxBounds`). 10 ručno
  biranih boja po planetu u `ACG_PLANET_COLORS` (nedovoljno boja u `PALETTES`, koje ima 3).
  **Glif-oznake u okviru oko karte** (`.acg-map-wrap` ima padding `ACG_GUTTER`=30px;
  overlay `#acg-edge-overlay`): `updateAcgEdgeLabels` na svakoj promjeni pogleda
  (`move`/`zoom`, rAF-throttle) projicira svaku liniju u piksele, nađe gdje presijeca
  rub vidljivog dijela (`acgSegCrossAll`) i stavi glif planeta u okvir na tom rubu —
  glifovi tako "prate" zoom/pan. Napomena ispod karte objašnjava punu (ASC/MC) vs.
  isprekidanu (DSC/IC) liniju. Koordinatna mreža svakih 30° s oznakama stupnjeva
  (`acgAddGraticule`); kutija dolje-lijevo živo pokazuje GEO koordinate + ASC/MC pod
  mišem (`acgAddCoordBox`,
  računa `computeAscMc` iz natal-calc.js s `gastDeg`/`eps` spremljenima u `currentAcg`).
  Legenda ispod karte: boja + glif (`glyphSvgHtml`) + naziv + checkbox za
  uključi/isključi liniju (Leaflet `L.layerGroup` po planetu).
- **Klik/tap na liniju:** svaka linija ima tanku vidljivu + široku prozirnu "hit" liniju
  (weight 16, lakši tap na mobitelu). Hover podeblja liniju; klik/tap ju **odabere**
  (`acgSelectLine`: podebljanje na weight 5 + popup s nazivom uz liniju). Fokus-pravokutnik
  uklonjen (`path.leaflet-interactive:focus{outline:none}`). `acgSelectedVis` pamti odabir.
- **Bez bijelih rubova:** `acgFitMinZoom` (`getBoundsZoom(world, true)`) postavi minimalni
  zoom tako da svijet ispuni cijelu širinu; uz to pozadina karte je tema-boja preko
  `.acg-map.leaflet-container` (specifičnost 0,2,0 nadjačava Leafletov `#ddd` default).
- **Glif-oznake u okviru:** `updateAcgEdgeLabels` dedupira iste glifove (isti planet blizu,
  po rubu i globalno u kutovima) da se ne pojave dva identična jedan do drugog.
- **Što NIJE uključeno (zasad):** paranske linije, relokacijska karta (numerički prikaz),
  reverse (ASC/MC finder), PDF export.

---

## Virtualni tarot (mapa `tarot/`)

Stranica **#tarot** (nav link "Virtualni tarot", + karta dana na početnoj `#vtar-cotd-root`)
— besplatan interaktivni tarot stol, **čisto vizualno/interaktivno izvlačenje karata, BEZ
tumačenja značenja na stolu**. Namjerno **skoro potpuno izdvojeno** u mapu `tarot/` (vlastiti
CSS/JS, vlastite slike) — za izmjene layouta/logike stola nije potrebno čitati ostatak stranice.
**Jedina namjerna iznimka:** tekstovi karata (`TAROT_CARD_TEXTS`) žive u `js/data.js`, ne u
`tarot/`, da mogu ići kroz admin sustav i auto-save — v. "Admin uređivanje" niže.

- **Arhitektura (4 JS filea u `tarot/`, učitavaju se nakon `natal-live.js`):** `tarot-data.js`
  (čisti podaci: 78 kanonskih karata, špilovi, spreadovi — bez ovisnosti) → `tarot-engine.js`
  (`createTarotEngine()` — stanje bez DOM-a: špilovi/preostalo, stol, otpad, postavke, pub/sub
  `onChange`) → `tarot-render.js` (`createTarotUI(engine, root)` — gradi cijeli DOM u
  `#tarot-app` iz JS-a, animacije) → `tarot.js` (glue: pokreće stol na `DOMContentLoaded` I
  renderira "kartu dana" na početnoj preko `#vtar-cotd-root`). Tekstovi karata (`TAROT_CARD_TEXTS`)
  dolaze iz `js/data.js`, koji se učitava PRIJE svih tarot skripti pa je globalna varijabla već
  dostupna kad `tarot.js`/`tarot-render.js` trebaju čitati naziv/značenje karte.
- **Logika špilova — INVARIJANTA „nikad duplikat":** svaka od 78 karata špila je u točno
  jednom stanju — u špilu (`remaining`), na stolu (`table`) ili u otpadu (`discard`). Sve
  operacije u engineu to održavaju: `drawFromDeck` (remaining→table), `discardSlot`
  (table→discard), `returnDiscardToDecks` (klik na otpad: discard→remaining + promiješaj),
  `shuffleFull` („Promiješaj sve": vrati SVE karte tog špila sa stola i iz otpada natrag u
  špil i promiješaj svih 78), `shuffleRemaining` (permutacija unutar remaining). Tako je
  duplikat matematički nemoguć. `newSpreadReading`/`setSpread` vraćaju karte sa stola natrag
  u špilove. Nema opcije za "presijeci" (uklonjena — nepotrebna).
- **CSS prefiks `vtar-`** (namjerno, NE `tr-`) — `tr-` prefiks je već zauzet u `css/style.css`
  za Tranzite (`.tr-panel`, `.tr-slider`, `.tr-hint`...); korištenje `tr-` je izazvalo stvarni
  layout bug (kolizija imena + `flex-basis` koji se pod `flex-direction:column` na mobitelu
  tumači kao visina umjesto širine). Pri dodavanju novih klasa u ovaj modul **uvijek koristiti
  `vtar-` prefiks**.
- **Kuke izvan `tarot/` (namjerno minimalne):** `index.html` — `<link>` na `tarot/tarot.css`,
  4× `<script src="tarot/...">` na dnu, nav link (`showPage('tarot')`), `<section id="tarot">`
  s praznim `<div id="tarot-app">` (sav sadržaj gradi JS), `<div id="vtar-cotd-root">` na
  početnoj (karta dana — `tarot.js` u njega renderira CIJELU `.vtar-cotd` cjelinu, HTML u
  index.html je samo prazan kontejner). `js/app.js` — jedan zapis u `PAGE_META.tarot` (SEO).
  `showPage()` u app.js **nije mijenjan** — generički mehanizam (toggle `.page.active` po id-u)
  radi bez posebne iznimke za tarot. `js/data.js` i `js/admin.js` — v. "Admin uređivanje" niže.
- **Špilovi (proširivo):** `TAROT_DECKS` niz u `tarot-data.js` — **Rider–Waite–Smith 1909** i
  **Tarot de Marseille** (Lequart 1890, Pariz), oba public domain sa Wikimedia Commons, plus
  dva **"uskoro" placeholdera** (`Lenormand`, `Oracle` — `comingSoon:true`, bez slika/karata,
  samo vlastiti `back.svg` kao pregled; engine ih preskače pri inicijalizaciji stanja i svugdje
  gdje se iterira `TAROT_DECKS`, jer `state.decks[id]` za njih ne postoji — provjeri `if
  (d.comingSoon)`/`if (state.decks[id])` prije dodavanja novih mjesta koja iteriraju špilove).
  Slike u `tarot/assets/decks/<folder>/`, imenovane kanonskim id-em karte (npr. `fool.jpg`;
  PAZI: u izvornom Wikimedia setu za Marseille Paž/Vitez su bili zamijenjeni — datoteke
  `*-page.jpg`/`*-knight.jpg` su ispravljene zamjenom, VALET=page, CAVALIER=knight) —
  isti id/naziv za sve špilove (`TAROT_CARD_DEFS`, 78 karata), razlikuje se samo slika.
  **Cache-busting:** `tarotCardImage()` dodaje `?v=${TAROT_IMG_VERSION}` (u tarot-data.js) na
  URL slike — kad se slika promijeni na ISTOM imenu (npr. ispravak Paž/Vitez), povećaj
  `TAROT_IMG_VERSION` da probiješ cache preglednika/Cloudflarea (inače korisnik vidi staru
  sliku jer se URL nije promijenio). Admin (`renderTarotAdminList`) koristi isti helper.
  Dodavanje pravog Lenormand/Oracle špila = ukloni `comingSoon`, dodaj `folder`/`ext` + 78 slika.
  Pozadine karata (`back.svg`, različit motiv po špilu) **ne mijenjaju se s temom**.
- **Uključi/isključi špil — odvojeno od stola:** `.vtar-deck-switches` (red prekidača, uvijek
  vidljiv iznad stola, uključuje i "uskoro" špilove kao onemogućene) je JEDINO mjesto za
  uključivanje špila. `.vtar-rail-left` (stog za izvlačenje + "Promiješaj sve"/"Promiješaj
  preostale") prikazuje SAMO uključene, stvarne špilove (`renderDeckRail` filtrira
  `!comingSoon && enabled`) — prazan red ako nijedan nije uključen.
- **Spreadovi:** `TAROT_SPREADS` u `tarot-data.js` — 12 rasporeda: **Slobodno slaganje**
  (`free:true` — neograničeno karata, teku u redovima, prvi u izborniku, stol dobiva vlastiti
  scroll umjesto da raste u beskonačnost — v. `.vtar-table-scroll`; svaki špil u lijevoj traci
  dobiva dodatni gumb **"▤ Izvuci sve"** koji `handleDrawAllClick` izvlači preostale karte tog
  špila jednu po jednu uz mali stagger (90ms) — kaskadna animacija; prije izvlačenja pozove
  `engine.sortRemaining(deckId)` pa karte izlaze **kanonskim redom** (velika arkana 0–21, pa
  štapovi/pehari/mačevi/pentakli: As, 2–10, Paž, Vitez, Kraljica, Kralj); svako izvlačenje u free
  modu zove `scrollTableToBottom()` koje `.vtar-table` glatko scrolla do dna da se novododana
  karta uvijek vidi) + Jedna karta, Dva izbora,
  Tri karte, Pet karata, Karijera, Odnos, Potkova, Zvijezda, Keltski križ, Čakre, Godina pred
  nama. **GRID model:** svaki fiksni spread ima `cols`/`rows` (za mini-ikonu u izborniku) i
  pozicije s `gx`/`gy` (SREDIŠTE karte, decimalno za lukove/kružnice — v.
  `tarotCirclePositions` helper). `rot` (Keltski križ, karta 2) rotira karticu 90° — **rotira
  se sam `.vtar-cardbox` (kontejner), ne samo naknadno izvučena karta**, pa se "križanje"
  vidi već na praznom placeholderu prije izvlačenja. `label`/`meaning` = kratke HR oznake
  pozicije. `.vtar-caption` ISPOD karte prikazuje **SAMO `label`** (jedan red, elipsa, puni
  `label - meaning` u `title` atributu) — puni opisi su SAMO u legendi ispod stola. Tako
  caption nikad ne može prerasti rezervirani red i preklopiti karte ispod, a `computeLayout`
  rezervira samo fiksnih `capH=20px` pa su karte veće. Iznimka: karta koja križa (`rot`)
  NEMA caption ispod (isto je središte kao karta 1 pa bi se dvije oznake preklopile) —
  ostaje samo u legendi. Caption je ograničen širinom ćelije (`--vtar-cellw`).
- **Bounding-box layout (`computeLayout` u render, NE koristi deklarirani `cols`/`rows`
  izravno):** izračuna stvarni "otisak" (min/max `gx`/`gy`) korištenih pozicija i skalira
  karte na TAJ prostor, ne na deklarirani grid — spreadovi s puno praznog prostora u gridu
  (npr. Zvijezda, Karijera) automatski dobiju veće karte bez ručnog podešavanja koordinata.
  Karte su uvijek maksimalno velike bez preklapanja i uvijek unutar stola. Relayout ide preko
  `ResizeObserver` na `.vtar-table` (ne `window.resize`) — hvata promjenu veličine elementa
  bez obzira na uzrok (zoom stranice, fullscreen ulaz/izlaz, promjena prozora), pa je stabilan
  neovisno o zoomu.
- **Oznake pokraj karte (nikad preko ilustracije), prikazuju se TEK kad je karta postavljena
  (`orderBadge`/`reversedBadge` dodaju se u `placeCardInSlot`, ne pri crtanju placeholdera):**
  `.vtar-badge-order` (mali broj, gornji lijevi kut — redoslijed izvlačenja) i `.vtar-badge-rev`
  (samo glif „⟲", crvene boje, DONJI lijevi kut, SAMO kad je karta obrnuta — bez teksta). Gumb
  za odlaganje u otpad (`✕`) je u GORNJEM desnom kutu (hover-only). Sve tri se kontra-rotiraju
  preko `--vtar-box-rot` da ostanu čitljive na rotiranoj Keltski-križ kartici. Prazan
  placeholder pokazuje samo broj pozicije u sredini (`.vtar-slot-num`).
- **Interakcija s karticom (tap vs. drag) — `attachCardInteraction` u tarot-render.js:**
  jedinstveno preko Pointer eventova (miš + dodir). **Kratak tap/klik** otvara fokus;
  **pritisni-i-drži (~280ms) pa povuci** hvata karticu (`.vtar-drag-ghost`, fixed, prati
  prst, `pointer-events:none` da `elementFromPoint` vidi kroz njega) i ispuštanjem na zonu
  iskorištenih karata (`.vtar-discard-zone` desno na desktopu / `.vtar-drawbar-used` ▤ u
  donjoj traci na mobitelu) je odloži (`engine.discardSlot`). Rješava nedostupne ✕ gumbe na
  gustim spreadovima na dodirnom zaslonu (Keltski križ, Zvijezda...). Move/up se slušaju na
  `document` (ne na kartici, bez `setPointerCapture` koji zna ubiti scroll); pomak >12px
  prije isteka drži-timera = scroll (otkazuje drag). Scroll stranice tijekom draga blokira
  **non-passive `touchmove`** koji `preventDefault`-a samo dok je `dragActive` (zato NEMA
  `touch-action:none` na karti — obični tap/scroll na kartici ostaje moguć). Zona se istakne
  (`.vtar-dragging` pulsira, `.vtar-drop-hover` obrub).
- **Klik na kartu → fokus (uvećanje + značenje):** klik na izvučenu karticu otvara `.vtar-focus`
  — modal (`position:fixed`, `z-index:3000`) koji karticu centrira i poveća, s nazivom ispod i
  **panelom DESNO od karte na desktopu / ISPOD na mobitelu** (`.vtar-focus-inner` je flex-row,
  postaje flex-column ispod 760px; `margin:auto` na inner omogućuje scroll s vrha kad je
  sadržaj viši od zaslona). Panel prikazuje **UVIJEK OBA značenja** (uspravno i obrnuto) iz
  `TAROT_CARD_TEXTS[deckId][cardId]` — blok koji odgovara orijentaciji izvučene karte je
  **uokviren** (`.vtar-focus-m-active`, lavender okvir + "· izvučeno" u labelu), drugi je
  prigušen. Iznad značenja je **"Odgovor karte" DA/NE/MOŽDA chip** (`text.yesno`,
  `.vtar-yn-da/-ne/-mozda` boje). Prazna polja se preskaču (Marseille bez tekstova pokazuje
  samo yesno chip); ako nema NIČEGA, panel se ne prikaže (`.vtar-focus-no-meaning`).
  Klik bilo gdje na overlay ju zatvara. `position:fixed` (ne absolute unutar stola) je namjeran
  jer pouzdano radi i kad stol scrolla (free spread), u fullscreenu i na mobitelu. Hover na
  karticu je samo suptilan podizaj (`translateY`), ne veliko uvećanje — glavni "zoom" je
  klik-fokus. `renderSlots` zove `closeFocus()` na početku (relayout zatvori fokus).
- **Izbornik spreadova = panel koji se PROŠIRI u toku (ne padajući):** `.vtar-spread-toggle`
  (gumb s trenutnim spreadom) prebacuje `.vtar-open` na `.vtar-spread-panel` — panel je u
  NORMALNOM toku (`display:grid`, ne `position:absolute`) pa se otvara ispod gumba i gurne stol
  prema dolje, bez ikakvog preklapanja/prozirnosti (prije je padajući izbornik + hover-tooltip
  bio odsječen `overflow:auto`-om i završavao iza stola). Svaki chip nosi mini-ikonu + naziv +
  opis (nema zasebnog hover-previewa). Toggle i panel su UNUTAR `.vtar-stage` (fullscreen target)
  pa je odabir dostupan i u cijelom zaslonu (`.vtar-fs .vtar-spread-panel.vtar-open` dobiva
  `flex:0 0 auto` + vlastiti scroll). Isto vrijedi za `.vtar-deck-switches`.
- **Stol namjerno nema `overflow:hidden`** (dekorativna tekstura ima vlastiti `border-radius`
  na `::before`) — nije više nužno zbog hover-zooma (koji je uklonjen), ali ostaje jer klik-fokus
  je ionako `position:fixed` modal.
- **Fullscreen (desktop, gumb `#vtar-btn-fs` → `requestFullscreen` na `.vtar-stage`):**
  `.vtar-fs` je flex-kolona (`height:100%`) gdje toolbar/deck-switches/hint imaju `flex:0 0
  auto`, stol `flex:1 1 auto` (uzima sav preostali prostor), a legenda `flex:0 1 auto` s
  vlastitim `max-height:20vh; overflow-y:auto` — tako se toolbar+stol+legenda UVIJEK uklope u
  zaslon bez obzira na omjer/veličinu monitora, legenda se sama scrolla umjesto da izgura stol
  van. Uz to `.vtar-fs .vtar-layout` ima `overflow:hidden` a `.vtar-fs .vtar-rail`
  `overflow-y:auto` — s dva uključena špila lijeva traka je viša od dodijeljenog prostora pa
  bi se bez toga prelila PREKO legende; u fullscreenu špilovi dobivaju i kompaktniju širinu
  (`--vtar-card-w` vezan uz `vh`). Relayout preko istog `ResizeObserver` (ne posebna
  `fullscreenchange` logika za veličine). Skriven na mobitelu (`@media max-width:900px`).
- **Mobilna verzija (`@media max-width:760px`, klasa `.vtar-mobile`):** fiksni spreadovi
  koriste ISTI apsolutni bounding-box layout kao desktop pa je **geometrija spreada
  identična** (Keltski križ = pravi križ + stup, Zvijezda = krug...), samo `computeLayout`
  u mobilnoj grani radi obrnuto: iz širine ekrana izračuna veličinu karata (max 118px) i
  **postavi visinu stola inline** (`els.slots.style.height`) — stranica normalno scrolla.
  Oznake ispod karata prikazuju se samo ako je ćelija ≥88px široka (inače su značenja samo
  u legendi s brojevima); `renderFreeSlots` mora čistiti inline height. BOČNE TRAKE SU
  SKRIVENE (`display:none` na `.vtar-rail-left/right`) — sve akcije preuzima **fiksna traka
  na dnu** (`.vtar-mobile-drawbar`, `position:fixed`): po uključenom špilu složeni chip
  (`.vtar-drawbar-group` = gumb za izvlačenje + mali `⟲` koji radi `shuffleFull`), pa gumb
  `▤` s brojačem iskorištenih (klik ih vraća u špil; brojač ažurira `renderDiscard` preko
  `#vtar-drawbar-used-count`) i `✦` (novi spread) — dimenzionirano da SVE stane u 375px bez
  scrollanja trake. Gumb `✕` na karti je uvijek vidljiv (nema hovera na dodirnom zaslonu),
  badge-evi su smanjeni na 18px. Render: `renderFixedSlots` (desktop i mobitel) /
  `renderFreeSlots`. **PAZI:** u `.vtar-toolbar` (flex-kolona na mobitelu) `flex-basis`
  postaje VISINA — `.vtar-spread-toggle` mora imati `flex:0 0 auto` u ≤760 mediji (inače
  naraste na 320px). Drawbar automatski nestaje na drugim stranicama jer je
  `#tarot section.page:not(.active)` cijela `display:none`.
- **Postavke (bez perzistencije u localStorage — namjerno, sesijski alat):** uspravno/obrnuto
  (utječe samo na buduća izvlačenja), prikaži/sakrij značenja (utječe na legendu). Iskorištene
  karte (interno i dalje `discard`/"otpad" u kodu, ali SVI vidljivi tekstovi kažu "iskorištene
  karte"): klik na izvučenu karticu je odloži; klik na zonu iskorištenih vraća sve natrag u
  špilove.
- **Card backs:** `back.svg` po špilu (RWS mandala/kompas, Marseille medaljon+rešetka,
  Lenormand mini-kartice, Oracle polumjesec) — moraju imati eksplicitne `width`/`height` uz
  `viewBox` da se pouzdano renderiraju kao CSS `background-image` (bez toga izgledaju
  prozirno). Dark paleta, ne mijenjaju se s temom.
- **"Karta dana" na početnoj — SVJESNA iznimka od "bez tumačenja", i JEDINA veza s `js/data.js`:**
  jedna klikabilna cjelina (`.vtar-cotd`, veća slika ~190px, vodi na `showPage('tarot')`) koju
  `tarot.js` renderira u `#vtar-cotd-root`. Dan se računa deterministički preko
  `Intl.DateTimeFormat` s `timeZone:'Europe/Zagreb'` (mijenja se u ponoć po hrvatskom vremenu,
  neovisno o zoni posjetitelja) hashiran u indeks 0-77 među RWS kartama — ista karta cijeli dan
  za sve posjetitelje, nema spremanja/API poziva. Prikazuje `TAROT_CARD_TEXTS.rws[id].upright`
  (uvijek RWS, nikad Marseille — RWS ima potpuna značenja). **Ton/izvor teksta:** spoj
  tradicionalnih RWS značenja (temelj: A. E. Waite, *The Pictorial Key to the Tarot*, 1910,
  javna domena, preuzeto preko en.wikisource.org) i modernih, toplijih tumačenja. Piše se kao
  IZRAVAN opis karte — **bez fraza tipa „kaže Waite / prema Waiteu / navodi se…"** — i
  uravnoteženog tona (i sjena i svjetlo karte, ne samo mračna viktorijanska strana).
  **Isti ton i opseg (2-3 rečenice) vrijedi i za OBRNUTA značenja** — temeljena na Waiteovim
  reversed značenjima iz PKT-a, uz moderniju, blažu perspektivu (blokirana/pretjerana/
  unutarnja verzija energije karte + nježan savjet), obraćanje u ženskom rodu.
- **Admin uređivanje (`TAROT_CARD_TEXTS` u `js/data.js`):** naziv + **odgovor karte
  (DA/NE/MOŽDA `select`, polje `yesno`)** + značenje uspravno + značenje obrnuto, po špilu po
  karti, uređuju se u admin tabu **"Tarot karte"** (`index.html` `#ap-tarot`, `js/admin.js`
  `renderTarotAdmin()`/`switchTarotAdminDeck()`/`saveTarotAdminTexts()`). Tab prikazuje
  deck-switch (RWS/Marseille — bez Lenormand/Oracle jer nemaju slike) pa svih 78 karata
  odjednom (slika + 4 polja), bez add/delete jer je skup karata fiksan. RWS dolazi potpuno
  popunjen; **Marseille ima popunjene `name` i `yesno` za svih 78 karata, a `upright`/`reversed`
  prazne** dok ih Jana sama ne popuni — prazan `upright`/`reversed` znači da se na tarot stolu
  i uz kartu dana taj tekst jednostavno ne prikazuje (v. gore), NE placeholder poruka
  (yesno chip se u fokusu prikazuje i tada). `collectTarotAdminFields()` pokupi
  trenutno prikazani špil u `TAROT_CARD_TEXTS` prije svake promjene špila I prije globalnog
  `downloadSite()` (inače bi se izgubile izmjene ako admin promijeni špil bez klika na "Spremi
  značenja karata"). `downloadSite()` uključuje `TAROT_CARD_TEXTS` marker blok pa ide kroz isti
  auto-save/GitHub flow kao ostatak stranice — ovo je JEDINI dio tarot modula koji tako radi.
- **Što NIJE uključeno (namjerno):** tumačenje značenja karata na samom stolu (samo u fokusu na
  klik i uz kartu dana), AI uvidi, spremanje/dijeljenje čitanja, drag-and-drop (samo klik).

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
7. **Natalne karte** — anoniman brojač izrada (ukupno / zadnjih 30 / zadnjih 7 dana). Broje se samo jedinstveni unosi. **Ne pohranjuju se nikakvi osobni podaci** (samo hash unosa). Vidljivo prijavljenom adminu; "Resetiraj brojač". Pohrana u Cloudflare KV (vidi dolje).
8. **Toggle gumbi (dropdown "Prikaz"):** Usluge On/Off, Rec. Početna, Rec. O meni
9. **📷 Slika** — upload vlastite slike za O meni
10. **↓ Spremi** — automatski commit-a `data.js` na GitHub preko Cloudflare Pages funkcije → auto-deploy na Cloudflareu za ~30 sek
11. **Arhiviranje** — svaki blog/usluga/cjenik/recenzija ima checkbox "Arhivirano" → skriva od posjetitelja, ali ostaje u adminu da se može vratiti

### Brojač natalnih karata (KV) — anonimno
Pri izradi karte `js/natal.js` računa **SHA-256 hash unosa** (datum, vrijeme, lat/lon, tip čvora — **bez imena**)
i šalje POST na `/log-natal` samo s tim hashom (fire-and-forget). `functions/log-natal.js` u **Cloudflare KV**
(binding **`NATAL_LOG`**) drži `s:<hash>` (dedup) i `c:<YYYYMMDD>:<hash>` (brojač s datumom u nazivu ključa).
Tako se broje samo **jedinstveni unosi** i **ne pohranjuju se nikakvi osobni podaci** (hash je jednosmjeran, nema imena).
Admin tab "Natalne karte" preko `/natal-log` (GET, `X-Admin-Pass`) čita samo nazive ključeva → ukupno / 30 / 7 dana
(bez po-ključ dohvata, zbog limita Functions subrequestova). POST `{action:'reset'}` briše brojač.
**Postavljanje (jednokratno):** Cloudflare → Workers & Pages → KV → *Create namespace* (npr. `alkemijana-natal-log`),
pa Pages projekt → Settings → Functions → KV namespace bindings → binding imena **`NATAL_LOG`**.
Bez bindinga brojač tiho ne radi (admin pokaže napomenu), izrada karte radi normalno.
**Privatnost:** ništa osobno se ne sprema → nema GDPR obveze obavijesti/privole za ovaj brojač.

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
| **jsDelivr (Leaflet)** | AstroCartography karta (`natal-acg-render.js`) | Bez ključa, CDN |
| **OpenStreetMap tiles** | Podloga AstroCartography karte | Bez ključa, javni tile server |

**Napomena — `_headers` (CSP):** korijenski `_headers` file definira Content-Security-Policy
za cijelu stranicu (Cloudflare Pages headers). Svaki novi vanjski domain (CDN skripta, API,
slika, font) **mora se dodati u odgovarajuću CSP direktivu** (`script-src`/`style-src`/
`img-src`/`connect-src`/`font-src`) ili će browser tiho blokirati zahtjev — provjeri
ovo prvo ako nešto vanjsko "ne radi" bez očite JS greške.

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
