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
    backClass: 'tarot-back-rws'
  },
  {
    id: 'marseille',
    name: 'Tarot de Marseille',
    shortName: 'Marseille',
    year: '1890',
    folder: 'marseille',
    ext: 'jpg',
    backClass: 'tarot-back-marseille'
  }
];

function tarotCardImage(deckId, cardId) {
  const deck = TAROT_DECKS.find(d => d.id === deckId);
  return `tarot/assets/decks/${deck.folder}/${cardId}.${deck.ext}`;
}

/* ---- Spreadovi ----
   Pozicije su postotci (0-100) unutar stola; "rot" je dodatni kut (za
   Keltski križ karticu #2 koja leži poprijeko). "label" je kratka oznaka
   pozicije, "meaning" kratko objašnjenje ŠTO pozicija znači (ne tumačenje
   karte) — prikazuje se kad je uključen prekidač "Značenja pozicija". */

const TAROT_SPREADS = [
  {
    id: 'single',
    name: 'Jedna karta',
    short: 'Dnevna karta — brz uvid u energiju dana ili pitanja.',
    positions: [
      { x: 50, y: 50, label: 'Karta', meaning: 'Opća energija dana ili odgovor na pitanje.' }
    ]
  },
  {
    id: 'two-choice',
    name: 'Dva izbora',
    short: 'Usporedba dviju opcija i njihovih mogućih ishoda.',
    positions: [
      { x: 28, y: 68, label: 'A', meaning: 'Energija prve opcije, ako je izabereš.' },
      { x: 28, y: 34, label: 'A →', meaning: 'Mogući ishod prve opcije.' },
      { x: 72, y: 68, label: 'B', meaning: 'Energija druge opcije, ako je izabereš.' },
      { x: 72, y: 34, label: 'B →', meaning: 'Mogući ishod druge opcije.' }
    ]
  },
  {
    id: 'three-card',
    name: 'Tri karte',
    short: 'Prošlost · Sadašnjost · Budućnost — klasičan pregled toka.',
    positions: [
      { x: 20, y: 50, label: 'Prošlost', meaning: 'Što je dovelo do sadašnje situacije.' },
      { x: 50, y: 50, label: 'Sadašnjost', meaning: 'Trenutna energija ili stanje stvari.' },
      { x: 80, y: 50, label: 'Budućnost', meaning: 'Vjerojatan smjer ako se ništa ne promijeni.' }
    ]
  },
  {
    id: 'five-card',
    name: 'Pet karata',
    short: 'Situacija · prepreka · savjet · vanjski utjecaj · ishod.',
    positions: [
      { x: 10, y: 55, label: 'Situacija', meaning: 'Srž trenutnog pitanja.' },
      { x: 30, y: 55, label: 'Prepreka', meaning: 'Što stoji na putu ili koči napredak.' },
      { x: 50, y: 55, label: 'Savjet', meaning: 'Preporučen smjer djelovanja.' },
      { x: 70, y: 55, label: 'Vanjski utjecaj', meaning: 'Okolnosti ili ljudi izvan tvoje kontrole.' },
      { x: 90, y: 55, label: 'Ishod', meaning: 'Vjerojatan ishod situacije.' }
    ]
  },
  {
    id: 'career',
    name: 'Karijera',
    short: 'Trenutna uloga · snaga · izazov · akcija · ishod.',
    positions: [
      { x: 10, y: 55, label: 'Trenutna uloga', meaning: 'Sadašnja energija na poslu ili u karijeri.' },
      { x: 30, y: 32, label: 'Tvoja snaga', meaning: 'Vještine i prednosti koje nosiš sa sobom.' },
      { x: 50, y: 55, label: 'Izazov', meaning: 'Što trenutno ograničava napredak.' },
      { x: 70, y: 32, label: 'Sljedeći korak', meaning: 'Konkretna akcija koja pomiče stvari naprijed.' },
      { x: 90, y: 55, label: 'Ishod', meaning: 'Kamo ovaj put vodi.' }
    ]
  },
  {
    id: 'relationship',
    name: 'Odnos',
    short: 'Ti · partner · temelj · dinamika · izazovi · ishod.',
    positions: [
      { x: 25, y: 16, label: 'Ti', meaning: 'Tvoja uloga, osjećaji i pogled na odnos.' },
      { x: 75, y: 16, label: 'Partner', meaning: 'Njegova/njezina uloga, osjećaji i pogled.' },
      { x: 50, y: 38, label: 'Temelj', meaning: 'Na čemu odnos počiva.' },
      { x: 50, y: 58, label: 'Dinamika', meaning: 'Kako energija teče između vas sada.' },
      { x: 50, y: 78, label: 'Izazovi', meaning: 'Skrivene napetosti ili prepreke.' },
      { x: 50, y: 94, label: 'Ishod', meaning: 'Vjerojatan smjer kojim odnos ide.' }
    ]
  },
  {
    id: 'horseshoe',
    name: 'Potkova',
    short: 'Sedam karata u luku — od prošlosti do konačnog ishoda.',
    positions: [
      { x: 8,  y: 80, label: 'Prošli utjecaji', meaning: 'Događaji koji su oblikovali situaciju.' },
      { x: 12, y: 52, label: 'Sadašnjost', meaning: 'Trenutna situacija.' },
      { x: 26, y: 26, label: 'Skriveni utjecaji', meaning: 'Nepoznati ili nesvjesni faktori.' },
      { x: 50, y: 14, label: 'Prepreke', meaning: 'Glavna prepreka na putu.' },
      { x: 74, y: 26, label: 'Okolina', meaning: 'Stavovi i utjecaj drugih ljudi.' },
      { x: 88, y: 52, label: 'Savjet', meaning: 'Preporučen postupak.' },
      { x: 92, y: 80, label: 'Ishod', meaning: 'Konačan ishod situacije.' }
    ]
  },
  {
    id: 'star',
    name: 'Zvijezda',
    short: 'Šest karata oko središnje — problem i njegovi utjecaji.',
    positions: [
      { x: 50, y: 54, label: 'Problem', meaning: 'Srž pitanja oko kojeg se sve vrti.' },
      { x: 50, y: 16, label: 'Pozitivni utjecaji', meaning: 'Sile koje ti idu u prilog.' },
      { x: 84, y: 35, label: 'Negativni utjecaji', meaning: 'Sile koje otežavaju situaciju.' },
      { x: 84, y: 74, label: 'Prošlost', meaning: 'Utjecaj koji polako gubi snagu.' },
      { x: 50, y: 92, label: 'Sadašnjost', meaning: 'Stanje stvari upravo sada.' },
      { x: 16, y: 74, label: 'Budućnost', meaning: 'Ono što se nazire ubrzo.' },
      { x: 16, y: 35, label: 'Konačan ishod', meaning: 'Krajnji rezultat cijele situacije.' }
    ]
  },
  {
    id: 'celtic-cross',
    name: 'Keltski križ',
    short: 'Deset karata — najdetaljniji klasičan spread.',
    positions: [
      { x: 32, y: 52, label: '1', meaning: 'Srž situacije, sadašnji trenutak.' },
      { x: 32, y: 52, rot: 90, label: '2', meaning: 'Izazov koji križa i oblikuje situaciju.' },
      { x: 32, y: 79, label: '3', meaning: 'Temelj — daleka prošlost ili podsvjesni uzrok.' },
      { x: 11, y: 52, label: '4', meaning: 'Nedavna prošlost, događaj koji blijedi.' },
      { x: 32, y: 25, label: '5', meaning: 'Svjesni cilj ili ono čemu težiš.' },
      { x: 53, y: 52, label: '6', meaning: 'Bliska budućnost, ono što dolazi.' },
      { x: 82, y: 85, label: '7', meaning: 'Tvoj stav i način na koji pristupaš situaciji.' },
      { x: 82, y: 64, label: '8', meaning: 'Vanjski utjecaji — okolina, drugi ljudi.' },
      { x: 82, y: 43, label: '9', meaning: 'Nade i strahovi vezani za ishod.' },
      { x: 82, y: 21, label: '10', meaning: 'Konačan ishod cijele situacije.' }
    ]
  },
  {
    id: 'chakra',
    name: 'Čakre',
    short: 'Sedam karata, po jedna za svaku čakru — energija tijela.',
    positions: [
      { x: 50, y: 89, label: 'Korijenska', meaning: 'Sigurnost, opstanak, uzemljenost.' },
      { x: 50, y: 76, label: 'Sakralna', meaning: 'Kreativnost, emocije, senzualnost.' },
      { x: 50, y: 63, label: 'Solarni pleksus', meaning: 'Snaga volje, samopouzdanje.' },
      { x: 50, y: 50, label: 'Srčana', meaning: 'Ljubav, povezanost, suosjećanje.' },
      { x: 50, y: 37, label: 'Grlena', meaning: 'Komunikacija, izražavanje istine.' },
      { x: 50, y: 24, label: 'Treće oko', meaning: 'Intuicija, unutarnji uvid.' },
      { x: 50, y: 11, label: 'Tjemena', meaning: 'Duhovnost, viša svijest.' }
    ]
  },
  {
    id: 'year-ahead',
    name: 'Godina pred nama',
    short: 'Dvanaest karata, po jedna za svaki mjesec, plus tema godine.',
    positions: (() => {
      const months = ['Siječanj','Veljača','Ožujak','Travanj','Svibanj','Lipanj','Srpanj','Kolovoz','Rujan','Listopad','Studeni','Prosinac'];
      const cx = 50, cy = 52, rx = 41, ry = 39;
      const pos = months.map((m, idx) => {
        const h = idx + 1;
        const rad = (h * 30 - 90) * Math.PI / 180;
        return {
          x: Math.round((cx + rx * Math.cos(rad)) * 10) / 10,
          y: Math.round((cy + ry * Math.sin(rad)) * 10) / 10,
          label: m,
          meaning: `Energija i tema mjeseca ${m.toLowerCase()}.`
        };
      });
      pos.push({ x: cx, y: cy, label: 'Tema godine', meaning: 'Sveukupna tema i lekcija cijele godine.' });
      return pos;
    })()
  }
];

window.TAROT_CARD_DEFS = TAROT_CARD_DEFS;
window.TAROT_DECKS = TAROT_DECKS;
window.TAROT_SPREADS = TAROT_SPREADS;
window.tarotCardImage = tarotCardImage;
