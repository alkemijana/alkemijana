/* ============================================================
   Virtualni tarot — podaci (karte, špilovi, spreadovi)
   Samostalan modul — ne ovisi o ostatku stranice osim CSS varijabli teme.
   ============================================================ */

/* ---- 78 kanonskih karata (isti id/naziv za sve špilove; razlikuje se samo slika) ---- */

const TAROT_MAJOR_DEFS = [
  ['fool', 'Luda'], ['magician', 'Mag'], ['high-priestess', 'Velika svećenica'],
  ['empress', 'Carica'], ['emperor', 'Car'], ['hierophant', 'Svećenik'],
  ['lovers', 'Ljubavnici'], ['chariot', 'Kočija'], ['strength', 'Snaga'],
  ['hermit', 'Pustinjak'], ['wheel-of-fortune', 'Kotač sreće'], ['justice', 'Pravda'],
  ['hanged-man', 'Obješeni čovjek'], ['death', 'Smrt'], ['temperance', 'Umjerenost'],
  ['devil', 'Vrag'], ['tower', 'Kula'], ['star', 'Zvijezda'],
  ['moon', 'Mjesec'], ['sun', 'Sunce'], ['judgement', 'Sud'], ['world', 'Svijet']
];

const TAROT_SUITS = [
  { id: 'wands',     name: 'Štapovi',  gen: 'štapova' },
  { id: 'cups',      name: 'Pehari',   gen: 'pehara' },
  { id: 'swords',    name: 'Mačevi',   gen: 'mačeva' },
  { id: 'pentacles', name: 'Pentakli', gen: 'pentakla' }
];

const TAROT_RANKS = [
  ['ace', 'As'], ['02', 'Dvojka'], ['03', 'Trojka'], ['04', 'Četvorka'], ['05', 'Petica'],
  ['06', 'Šestica'], ['07', 'Sedmica'], ['08', 'Osmica'], ['09', 'Devetka'], ['10', 'Desetka'],
  ['page', 'Paž'], ['knight', 'Vitez'], ['queen', 'Kraljica'], ['king', 'Kralj']
];

function buildCardDefs() {
  const defs = [];
  TAROT_MAJOR_DEFS.forEach(([id, name], i) => {
    defs.push({ id, name, suit: 'major', isMajor: true, num: i });
  });
  TAROT_SUITS.forEach(suit => {
    TAROT_RANKS.forEach(([rankId, rankName], i) => {
      defs.push({
        id: `${suit.id}-${rankId}`,
        name: `${rankName} ${suit.gen}`,
        suit: suit.id,
        isMajor: false,
        num: i
      });
    });
  });
  return defs;
}

const TAROT_CARD_DEFS = buildCardDefs(); // 78 kartica

/* ---- Špilovi (proširivo — dodaj novi objekt u ovaj niz za novi špil) ---- */

const TAROT_DECKS = [
  {
    id: 'rws',
    name: 'Rider–Waite–Smith',
    shortName: 'RWS',
    year: '1909',
    folder: 'rws',
    ext: 'jpg',
    backClass: 'vtar-back-rws'
  },
  {
    id: 'marseille',
    name: 'Tarot de Marseille',
    shortName: 'Marseille',
    year: '1890',
    folder: 'marseille',
    ext: 'jpg',
    backClass: 'vtar-back-marseille'
  }
];

function tarotCardImage(deckId, cardId) {
  const deck = TAROT_DECKS.find(d => d.id === deckId);
  return `tarot/assets/decks/${deck.folder}/${cardId}.${deck.ext}`;
}

/* ---- Spreadovi ----
   GRID model: svaki spread ima `cols`/`rows` i pozicije s koordinatama
   `gx` (0..cols-1) i `gy` (0..rows-1) = SREDIŠTE karte u toj ćeliji (može biti
   decimalno, npr. za lukove/kružnice). Renderer skalira karte tako da SVE stane
   unutar stola (nikad izvan) i da opisi ne izlaze. `rot` (samo Keltski križ,
   karta 2) rotira karticu 90° (poprijeko). `labelSide` = 'right' stavlja oznaku
   desno od karte (Čakre), inače ispod. `short` je opis (hover/ispod izbornika),
   `label` kratka oznaka pozicije, `meaning` par riječi ŠTO pozicija znači
   (ne tumačenje karte) — prikazuje se uz uključen prekidač "Značenja pozicija".
   `free:true` = slobodno slaganje (neograničeno karata, bez zadanih pozicija). */

/* helper — 12/6 pozicija u krug unutar cols×rows grida */
function tarotCirclePositions(cols, rows, count, radius, startDeg, labels, meanings) {
  const cx = (cols - 1) / 2, cy = (rows - 1) / 2;
  const out = [];
  for (let k = 0; k < count; k++) {
    const a = (startDeg + k * (360 / count)) * Math.PI / 180;
    out.push({
      gx: Math.round((cx + radius * Math.cos(a)) * 1000) / 1000,
      gy: Math.round((cy + radius * Math.sin(a)) * 1000) / 1000,
      label: labels[k],
      meaning: meanings[k]
    });
  }
  return out;
}

const TAROT_SPREADS = [
  {
    id: 'free',
    name: 'Slobodno slaganje',
    free: true,
    short: 'Slažeš karte redom, bez zadanih pozicija — koliko god želiš.',
    cols: 1, rows: 1,
    positions: []
  },
  {
    id: 'single',
    name: 'Jedna karta',
    short: 'Dnevna karta — brz uvid u energiju dana ili pitanja.',
    cols: 1, rows: 1,
    positions: [
      { gx: 0, gy: 0, label: 'Karta', meaning: 'Opća energija dana ili odgovor na pitanje.' }
    ]
  },
  {
    id: 'two-choice',
    name: 'Dva izbora',
    short: 'Usporedba dviju opcija i njihovih mogućih ishoda.',
    cols: 2, rows: 2,
    positions: [
      { gx: 0, gy: 1, label: 'Opcija A', meaning: 'Energija prve opcije, ako je izabereš.' },
      { gx: 0, gy: 0, label: 'Ishod A', meaning: 'Mogući ishod prve opcije.' },
      { gx: 1, gy: 1, label: 'Opcija B', meaning: 'Energija druge opcije, ako je izabereš.' },
      { gx: 1, gy: 0, label: 'Ishod B', meaning: 'Mogući ishod druge opcije.' }
    ]
  },
  {
    id: 'three-card',
    name: 'Tri karte',
    short: 'Prošlost · Sadašnjost · Budućnost — klasičan pregled toka.',
    cols: 3, rows: 1,
    positions: [
      { gx: 0, gy: 0, label: 'Prošlost', meaning: 'Što je dovelo do sadašnje situacije.' },
      { gx: 1, gy: 0, label: 'Sadašnjost', meaning: 'Trenutna energija ili stanje stvari.' },
      { gx: 2, gy: 0, label: 'Budućnost', meaning: 'Vjerojatan smjer ako se ništa ne promijeni.' }
    ]
  },
  {
    id: 'five-card',
    name: 'Pet karata',
    short: 'Situacija · prepreka · savjet · vanjski utjecaj · ishod.',
    cols: 5, rows: 1,
    positions: [
      { gx: 0, gy: 0, label: 'Situacija', meaning: 'Srž trenutnog pitanja.' },
      { gx: 1, gy: 0, label: 'Prepreka', meaning: 'Što stoji na putu ili koči napredak.' },
      { gx: 2, gy: 0, label: 'Savjet', meaning: 'Preporučen smjer djelovanja.' },
      { gx: 3, gy: 0, label: 'Vanjski utjecaj', meaning: 'Okolnosti ili ljudi izvan tvoje kontrole.' },
      { gx: 4, gy: 0, label: 'Ishod', meaning: 'Vjerojatan ishod situacije.' }
    ]
  },
  {
    id: 'career',
    name: 'Karijera',
    short: 'Trenutna uloga · snaga · izazov · akcija · ishod.',
    cols: 5, rows: 2,
    positions: [
      { gx: 0, gy: 0.85, label: 'Trenutna uloga', meaning: 'Sadašnja energija na poslu ili u karijeri.' },
      { gx: 1, gy: 0.15, label: 'Tvoja snaga', meaning: 'Vještine i prednosti koje nosiš sa sobom.' },
      { gx: 2, gy: 0.85, label: 'Izazov', meaning: 'Što trenutno ograničava napredak.' },
      { gx: 3, gy: 0.15, label: 'Sljedeći korak', meaning: 'Konkretna akcija koja pomiče stvari naprijed.' },
      { gx: 4, gy: 0.85, label: 'Ishod', meaning: 'Kamo ovaj put vodi.' }
    ]
  },
  {
    id: 'relationship',
    name: 'Odnos',
    short: 'Ti · partner · temelj · dinamika · izazovi · ishod.',
    cols: 3, rows: 5,
    positions: [
      { gx: 0, gy: 0, label: 'Ti', meaning: 'Tvoja uloga, osjećaji i pogled na odnos.' },
      { gx: 2, gy: 0, label: 'Partner', meaning: 'Njegova/njezina uloga, osjećaji i pogled.' },
      { gx: 1, gy: 1, label: 'Temelj', meaning: 'Na čemu odnos počiva.' },
      { gx: 1, gy: 2, label: 'Dinamika', meaning: 'Kako energija teče između vas sada.' },
      { gx: 1, gy: 3, label: 'Izazovi', meaning: 'Skrivene napetosti ili prepreke.' },
      { gx: 1, gy: 4, label: 'Ishod', meaning: 'Vjerojatan smjer kojim odnos ide.' }
    ]
  },
  {
    id: 'horseshoe',
    name: 'Potkova',
    short: 'Sedam karata u luku — od prošlosti do konačnog ishoda.',
    cols: 5, rows: 3,
    positions: [
      { gx: 0,    gy: 2,    label: 'Prošli utjecaji', meaning: 'Događaji koji su oblikovali situaciju.' },
      { gx: 0.4,  gy: 1,    label: 'Sadašnjost', meaning: 'Trenutna situacija.' },
      { gx: 1.2,  gy: 0.2,  label: 'Skriveni utjecaji', meaning: 'Nepoznati ili nesvjesni faktori.' },
      { gx: 2,    gy: 0,    label: 'Prepreke', meaning: 'Glavna prepreka na putu.' },
      { gx: 2.8,  gy: 0.2,  label: 'Okolina', meaning: 'Stavovi i utjecaj drugih ljudi.' },
      { gx: 3.6,  gy: 1,    label: 'Savjet', meaning: 'Preporučen postupak.' },
      { gx: 4,    gy: 2,    label: 'Ishod', meaning: 'Konačan ishod situacije.' }
    ]
  },
  {
    id: 'star',
    name: 'Zvijezda',
    short: 'Šest karata oko središnje — problem i njegovi utjecaji.',
    cols: 5, rows: 5,
    positions: [
      { gx: 2,     gy: 2,    label: 'Problem', meaning: 'Srž pitanja oko kojeg se sve vrti.' },
      { gx: 2,     gy: 0.1,  label: 'Pozitivni utjecaji', meaning: 'Sile koje ti idu u prilog.' },
      { gx: 3.645, gy: 1.05, label: 'Negativni utjecaji', meaning: 'Sile koje otežavaju situaciju.' },
      { gx: 3.645, gy: 2.95, label: 'Prošlost', meaning: 'Utjecaj koji polako gubi snagu.' },
      { gx: 2,     gy: 3.9,  label: 'Sadašnjost', meaning: 'Stanje stvari upravo sada.' },
      { gx: 0.355, gy: 2.95, label: 'Budućnost', meaning: 'Ono što se nazire ubrzo.' },
      { gx: 0.355, gy: 1.05, label: 'Konačan ishod', meaning: 'Krajnji rezultat cijele situacije.' }
    ]
  },
  {
    id: 'celtic-cross',
    name: 'Keltski križ',
    short: 'Deset karata — najdetaljniji klasičan spread.',
    cols: 5, rows: 4,
    positions: [
      { gx: 1.5, gy: 1.5,          label: 'Sadašnjost', meaning: 'Srž situacije, sadašnji trenutak.' },
      { gx: 1.5, gy: 1.5, rot: 90, label: 'Izazov', meaning: 'Izazov koji križa i oblikuje situaciju.' },
      { gx: 1.5, gy: 2.7,          label: 'Temelj', meaning: 'Daleka prošlost ili podsvjesni uzrok.' },
      { gx: 0,   gy: 1.5,          label: 'Prošlost', meaning: 'Nedavna prošlost, događaj koji blijedi.' },
      { gx: 1.5, gy: 0.3,          label: 'Cilj', meaning: 'Svjesni cilj ili ono čemu težiš.' },
      { gx: 3,   gy: 1.5,          label: 'Budućnost', meaning: 'Bliska budućnost, ono što dolazi.' },
      { gx: 4,   gy: 3,            label: 'Tvoj stav', meaning: 'Kako pristupaš situaciji.' },
      { gx: 4,   gy: 2,            label: 'Okolina', meaning: 'Vanjski utjecaji, drugi ljudi.' },
      { gx: 4,   gy: 1,            label: 'Nade i strahovi', meaning: 'Nade i strahovi vezani za ishod.' },
      { gx: 4,   gy: 0,            label: 'Ishod', meaning: 'Konačan ishod cijele situacije.' }
    ]
  },
  {
    id: 'chakra',
    name: 'Čakre',
    short: 'Sedam karata, po jedna za svaku čakru — energija tijela.',
    cols: 1, rows: 7,
    labelSide: 'right',
    positions: [
      { gx: 0, gy: 6, label: 'Korijenska', meaning: 'Sigurnost, opstanak, uzemljenost.' },
      { gx: 0, gy: 5, label: 'Sakralna', meaning: 'Kreativnost, emocije, senzualnost.' },
      { gx: 0, gy: 4, label: 'Solarni pleksus', meaning: 'Snaga volje, samopouzdanje.' },
      { gx: 0, gy: 3, label: 'Srčana', meaning: 'Ljubav, povezanost, suosjećanje.' },
      { gx: 0, gy: 2, label: 'Grlena', meaning: 'Komunikacija, izražavanje istine.' },
      { gx: 0, gy: 1, label: 'Treće oko', meaning: 'Intuicija, unutarnji uvid.' },
      { gx: 0, gy: 0, label: 'Tjemena', meaning: 'Duhovnost, viša svijest.' }
    ]
  },
  {
    id: 'year-ahead',
    name: 'Godina pred nama',
    short: 'Dvanaest karata u krug (mjeseci) + tema godine u sredini.',
    cols: 5, rows: 5,
    positions: (() => {
      const months = ['Siječanj','Veljača','Ožujak','Travanj','Svibanj','Lipanj','Srpanj','Kolovoz','Rujan','Listopad','Studeni','Prosinac'];
      const pos = tarotCirclePositions(5, 5, 12, 2, -90, months,
        months.map(m => `Energija i tema mjeseca ${m.toLowerCase()}.`));
      pos.push({ gx: 2, gy: 2, label: 'Tema godine', meaning: 'Sveukupna tema i lekcija cijele godine.' });
      return pos;
    })()
  }
];

window.TAROT_CARD_DEFS = TAROT_CARD_DEFS;
window.TAROT_DECKS = TAROT_DECKS;
window.TAROT_SPREADS = TAROT_SPREADS;
window.tarotCardImage = tarotCardImage;
