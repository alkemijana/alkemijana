/* ============================================================
   AlkemiJana — Podaci
   ============================================================ */

// ===ALKEMIJANA:BLOG_POSTS:START===
let BLOG_POSTS = [
  {
    id: "znacenje-mjeseca",
    title: "Značenje Mjeseca u natalnoj karti",
    date: "15. svibnja 2026",
    category: "Astrologija",
    icon: "☽",
    imageUrl: "",
    excerpt: "Mjesec je vladar naših emocija, podsvijesti i intuicije. Otkrijte kako njegov položaj u vašoj karti rođenja utječe na vaš emocionalni svijet...",
    content: "<p>Mjesec je jedno od najvažnijih nebeskih tijela u natalnoj astrologiji. Dok Sunce govori o tome tko jesmo prema svijetu, Mjesec otkriva naš unutarnji svijet — naše emocije, obrasce ponašanja koje smo usvojili u djetinjstvu i naš instinktivni odgovor na život.</p><h2>Položaj Mjeseca po znakovima</h2><p>Svaki od dvanaest znakova Zodijaka daje Mjesecu drugačiji ton. Mjesec u Ovnu donosi impulsivnost u emocijama, dok Mjesec u Raku — svom domicilu — pojačava osjećajnost i potrebu za bliskošću.</p><blockquote>Vaš Mjesec nije ono što pokazujete svijetu — to je ono što osjećate kad ste sami sa sobom.</blockquote><p>U natalnoj konzultaciji uvijek posvećujem posebnu pažnju Mjesecu jer upravo on često nosi ključ za razumijevanje obrazaca koji se ponavljaju u životu.</p>",
    archived: false
  },
  {
    id: "velika-arkana",
    title: "Kako čitati Veliku Arkanu",
    date: "2. svibnja 2026",
    category: "Tarot",
    icon: "✦",
    imageUrl: "",
    excerpt: "Dvadeset i dvije karte Velike Arkane predstavljaju arhetipove duhovnog putovanja. Vodič kroz njihova značenja i međusobne veze...",
    content: "<p>Velika Arkana predstavlja 22 karte koje opisuju cjelokupno putovanje ljudske duše — od Ludog koji kreće u nepoznato, do Svijeta koji označava dovršenje i integraciju.</p><h2>Ludi i Putovanje Duha</h2><p>Ludi (0) je polazišna točka — čista potencija, bezbrižna hrabrost koja korača prema rubu bez straha. Svaki put kad u čitanju izvučete Ludog, pitate se: gdje u životu trebam taj skok vjere?</p><blockquote>Svaka karta Velike Arkane je pitanje koje svemir postavlja vama. Vaš odgovor je uvijek slobodan.</blockquote><p>Preporučam da svakodnevno ujutro izvučete jednu kartu Velike Arkane i pratite kako njen arhetip rezonira kroz dan.</p>",
    archived: false
  },
  {
    id: "retrogradni-merkur",
    title: "Retrogradni Merkur — što očekivati",
    date: "18. travnja 2026",
    category: "Astrologija",
    icon: "☿",
    imageUrl: "",
    excerpt: "Tri puta godišnje Merkur kreće unatrag. Što to znači za našu komunikaciju, putovanja i tehnologiju, i kako se nositi s tim razdobljem...",
    content: "<p>Svake godine, otprilike tri puta, Merkur se sa Zemljine perspektive čini kao da kreće unazad. Merkur vlada komunikacijom, putovanjima, tehnologijom i razmjenom informacija.</p><h2>Kako se prilagoditi</h2><p>Retrogradni Merkur nije prekletstvo — to je poziv na usporavanje i reviziju. Koristite to vrijeme za <em>re</em>viziju, <em>re</em>fleksiju i <em>re</em>organizaciju.</p><blockquote>Retrogradni Merkur nije neprijatelj. On je tihi urednik koji kaže: stani, provjeri, jesi li siguran?</blockquote>",
    archived: false
  },
  {
    id: "tarot-i-mjesec",
    title: "Tarot i mjesečeve mijene",
    date: "5. travnja 2026",
    category: "Ritual",
    icon: "☾",
    imageUrl: "",
    excerpt: "Mlad mjesec, pun mjesec, svaka faza nosi svoju energiju. Naučite kako uskladiti svoja tarot čitanja s ciklusima Mjeseca...",
    content: "<p>Mjesec prolazi kroz osam distinktnih faza svakih 29.5 dana. Svaka faza donosi drugačiju kvalitetu energije, i usklađivanjem tarot prakse s tim ritmovima čitanja postaju dublja i preciznija.</p><h2>Mlad Mjesec — vrijeme sijanja</h2><p>Mlad Mjesec je idealno vrijeme za čitanja koja se bave novim početcima i namjerama. Karte izvučene u ovoj fazi govore o potencijalu i sjemenu koje sadite.</p><blockquote>Tarot i Mjesec dijele isti jezik — jezik ciklusa, rasta i otpuštanja.</blockquote>",
    archived: false
  }
];
// ===ALKEMIJANA:BLOG_POSTS:END===


// ===ALKEMIJANA:SERVICES:START===
let SERVICES = [
  { id: "s1", icon: "✧", name: "Poruke svemira",          desc: "Opće tarot čitanje u kojem ti donosiš temu, a karte donose odgovore. Zajedno istražujemo što ti svemir želi reći upravo sada.",                                                                                    price: "40", duration: "45", home: true,  archived: false, showPrice: true, showDuration: true },
  { id: "s2", icon: "♡", name: "Tajne srca",              desc: "Čitanje uz tarot i oracle karte fokusirano na ljubav - što te blokira, tko je tvoj idealni partner i što ti srce već zna, a um još ne prihvaća.",                                                                   price: "60", duration: "60", home: true,  archived: false, showPrice: true, showDuration: true },
  { id: "s3", icon: "✦", name: "Razgovor s nesvjesnim",   desc: "Asocijativne karte su projektivna psihoterapijska tehnika koja nema veze s ezoterijom - one su alat za razgovor s vlastitim nesvjesnim. Sve što ti treba već je u tebi.",                                             price: "50", duration: "60", home: true,  archived: false, showPrice: true, showDuration: true },
  { id: "s4", icon: "☽", name: "Povratak sebi",           desc: "Najdublja i najpospežnija usluga. Uz tarot, visak, astrologiju i asocijativne karte zajedno istražujemo tvoje obrasce, kako ti prošlost oblikuje sadašnjost i što ti treba da doneseš bolje odluke za sebe.",         price: "55", duration: "75", home: false, archived: false, showPrice: true, showDuration: true },
  { id: "s5", icon: "☉", name: "Tren jasnoće",            desc: "Jedno konkretno pitanje, jedan jasan odgovor. Pošalješ mi pitanje, ja radim čitanje viskom i šaljem ti video odgovor - direktno na WhatsApp.",                                                                       price: "75", duration: "90", home: false, archived: false, showPrice: true, showDuration: true },
  { id: "s6", icon: "⊹", name: "Na raskrižju",            desc: "Stojite pred izborom i ne znate kuda? Uz tarot i arhetipske karte zajedno rasvijetlimo obje strane i ono što se krije iza svake odluke.",                                                                            price: "35", duration: "60", home: false, archived: false, showPrice: true, showDuration: true }
];
// ===ALKEMIJANA:SERVICES:END===


// ===ALKEMIJANA:PRICING:START===
let PRICING = [
  { name: "Brzo Čitanje",        desc: "Jedno pitanje, 3 karte, 20 minuta",           price: "20", archived: false, showPrice: true, showDuration: true },
  { name: "Tarot Čitanje",       desc: "Klasično čitanje, 60 minuta",                 price: "40", archived: false, showPrice: true, showDuration: true },
  { name: "Duhovno Savjetovanje",desc: "Razgovor uz karte, 60 minuta",                price: "50", archived: false, showPrice: true, showDuration: true },
  { name: "Tranziti",            desc: "Astrološka analiza razdoblja, 75 minuta",     price: "55", archived: false, showPrice: true, showDuration: true },
  { name: "Natalna Karta",       desc: "Karta rođenja + pisani izvještaj, 90 minuta", price: "60", archived: false, showPrice: true, showDuration: true },
  { name: "Ljubavna Sinastrija", desc: "Analiza odnosa dvije karte, 90 minuta",       price: "75", archived: false, showPrice: true, showDuration: true },
  { name: "Solarni Povratak",    desc: "Godišnja prognoza, 60 minuta",                price: "45", archived: false, showPrice: true, showDuration: true }
];
// ===ALKEMIJANA:PRICING:END===


// ===ALKEMIJANA:REVIEWS:START===
let REVIEWS = [
  {
    id: "rev1",
    author: "MARIJA K.",
    location: "Zagreb",
    stars: 5,
    text: "Jana ima izuzetnu sposobnost čitanja energije. Njezina interpretacija karata bila je toliko precizna da sam ostala bez riječi. Preporučujem od srca.",
    section: "home",
    archived: false
  },
  {
    id: "rev2",
    author: "IVAN M.",
    location: "Split",
    stars: 5,
    text: "Natalna karta koju mi je izradila otvorila mi je oči o aspektima mene samog kojih nisam bio svjestan. Profesionalno, toplo i duboko.",
    section: "home",
    archived: false
  },
  {
    id: "rev3",
    author: "ANA P.",
    location: "Rijeka",
    stars: 5,
    text: "Dolazila sam u teškom razdoblju života. Janina mudrost i intuicija pomogle su mi pronaći jasnoću i smirenost. Hvala od srca.",
    section: "home",
    archived: false
  },
  {
    id: "rev4",
    author: "LANA T.",
    location: "Pula",
    stars: 5,
    text: "Susret s Janom nije obična konzultacija — to je iskustvo koje vas mijenja. Njena toplina i znanje su rijetka kombinacija.",
    section: "omeni",
    archived: false
  },
  {
    id: "rev5",
    author: "PETRA S.",
    location: "Osijek",
    stars: 5,
    text: "Vraćam se već treću godinu. Svaki put me iznova zadivi dubinom svojih tumačenja.",
    section: "omeni",
    archived: false
  }
];
// ===ALKEMIJANA:REVIEWS:END===


// ===ALKEMIJANA:TEXTS:START===
let TEXTS = {
  heroSub:          "Već znaš. Karte samo pokazuju put.",
  heroDesc:         "Ovo nije mjesto gdje ćeš dobiti odgovore. Ovo je mjesto gdje ćeš početi postavljati prava pitanja.",
  servicesTitle:    "Moje Usluge",
  servicesSub:      "Putovi do unutarnje istine",
  ctaTitle:         "Karte čekaju vaše pitanje",
  ctaText:          "Zakažite svoj prvi susret i otvorite vrata novim spoznajama",
  ctaBtn:           "Zakaži susret",
  reviewsTitle:     "Riječi Klijenata",
  reviewsSub:       "Iskustva onih koji su prošli kroz vrata",
  blogPreviewTitle: "Najnoviji Članci",
  blogPreviewSub:   "Iz bloga",
  blogPreviewBtn:   "Pročitaj sve članke →",
  contactTitle:     "Kontakt",
  contactSub:       "Putovanje počinje jednom porukom",
  footerTagline:    "Već znaš. Karte samo pokazuju put.",
  aboutQuote:       "Karte ne predviđaju budućnost — one vam pokazuju vašu unutarnju istinu, kako biste mogli oblikovati put pred sobom."
};
// ===ALKEMIJANA:TEXTS:END===


// ===ALKEMIJANA:SETTINGS:START===
let SITE_SETTINGS = {
  showReviews:      false,
  showAboutReviews: false,
  showServices:     false,
  aboutImageUrl:    ""
};
// ===ALKEMIJANA:SETTINGS:END===
