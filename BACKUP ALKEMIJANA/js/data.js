/* ============================================================
   AlkemiJana — Podaci (blog članci, usluge, cjenik)

   Ovaj fajl možete urediti ručno ili putem admin panela.
   Nakon promjena u admin panelu, preuzmite novu verziju ovog
   fajla klikom na "Spremi & preuzmi" i zamijenite ga na hostingu.
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
    content: "<p>Mjesec je jedno od najvažnijih nebeskih tijela u natalnoj astrologiji. Dok Sunce govori o tome tko jesmo prema svijetu, Mjesec otkriva naš unutarnji svijet — naše emocije, obrasce ponašanja koje smo usvojili u djetinjstvu i naš instinktivni odgovor na život.</p><h2>Položaj Mjeseca po znakovima</h2><p>Svaki od dvanaest znakova Zodijaka daje Mjesecu drugačiji ton. Mjesec u Ovnu donosi impulsivnost u emocijama, dok Mjesec u Raku — svom domicilu — pojačava osjećajnost i potrebu za bliskošću.</p><blockquote>Vaš Mjesec nije ono što pokazujete svijetu — to je ono što osjećate kad ste sami sa sobom.</blockquote><p>U natalnoj konzultaciji uvijek posvećujem posebnu pažnju Mjesecu jer upravo on često nosi ključ za razumijevanje obrazaca koji se ponavljaju u životu.</p>"
  },
  {
    id: "velika-arkana",
    title: "Kako čitati Veliku Arkanu",
    date: "2. svibnja 2026",
    category: "Tarot",
    icon: "✦",
    imageUrl: "",
    excerpt: "Dvadeset i dvije karte Velike Arkane predstavljaju arhetipove duhovnog putovanja. Vodič kroz njihova značenja i međusobne veze...",
    content: "<p>Velika Arkana predstavlja 22 karte koje opisuju cjelokupno putovanje ljudske duše — od Ludog koji kreće u nepoznato, do Svijeta koji označava dovršenje i integraciju.</p><h2>Ludi i Putovanje Duha</h2><p>Ludi (0) je polazišna točka — čista potencija, bezbrižna hrabrost koja korača prema rubu bez straha. Svaki put kad u čitanju izvučete Ludog, pitate se: gdje u životu trebam taj skok vjere?</p><blockquote>Svaka karta Velike Arkane je pitanje koje svemir postavlja vama. Vaš odgovor je uvijek slobodan.</blockquote><p>Preporučam da svakodnevno ujutro izvučete jednu kartu Velike Arkane i pratite kako njen arhetip rezonira kroz dan.</p>"
  },
  {
    id: "retrogradni-merkur",
    title: "Retrogradni Merkur — što očekivati",
    date: "18. travnja 2026",
    category: "Astrologija",
    icon: "☿",
    imageUrl: "",
    excerpt: "Tri puta godišnje Merkur kreće unatrag. Što to znači za našu komunikaciju, putovanja i tehnologiju, i kako se nositi s tim razdobljem...",
    content: "<p>Svake godine, otprilike tri puta, Merkur se sa Zemljine perspektive čini kao da kreće unazad. Merkur vlada komunikacijom, putovanjima, tehnologijom i razmjenom informacija.</p><h2>Kako se prilagoditi</h2><p>Retrogradni Merkur nije prekletstvo — to je poziv na usporavanje i reviziju. Koristite to vrijeme za <em>re</em>viziju, <em>re</em>fleksiju i <em>re</em>organizaciju.</p><blockquote>Retrogradni Merkur nije neprijatelj. On je tihi urednik koji kaže: stani, provjeri, jesi li siguran?</blockquote>"
  },
  {
    id: "tarot-i-mjesec",
    title: "Tarot i mjesečeve mijene",
    date: "5. travnja 2026",
    category: "Ritual",
    icon: "☾",
    imageUrl: "",
    excerpt: "Mlad mjesec, pun mjesec, svaka faza nosi svoju energiju. Naučite kako uskladiti svoja tarot čitanja s ciklusima Mjeseca...",
    content: "<p>Mjesec prolazi kroz osam distinktnih faza svakih 29.5 dana. Svaka faza donosi drugačiju kvalitetu energije, i usklađivanjem tarot prakse s tim ritmovima čitanja postaju dublja i preciznija.</p><h2>Mlad Mjesec — vrijeme sijanja</h2><p>Mlad Mjesec je idealno vrijeme za čitanja koja se bave novim početcima i namjerama. Karte izvučene u ovoj fazi govore o potencijalu i sjemenu koje sadite.</p><blockquote>Tarot i Mjesec dijele isti jezik — jezik ciklusa, rasta i otpuštanja.</blockquote>"
  }
];
// ===ALKEMIJANA:BLOG_POSTS:END===


// ===ALKEMIJANA:SERVICES:START===
let SERVICES = [
  { id: "s1", icon: "☽", name: "Tarot Čitanje",        desc: "Otkrijte poruke koje karte nose o vašoj prošlosti, sadašnjosti i budućnosti.", price: "40", duration: "60", home: true  },
  { id: "s2", icon: "☉", name: "Natalna Karta",         desc: "Detaljna analiza vaše astrološke karte rođenja i životnog puta.",             price: "60", duration: "90", home: true  },
  { id: "s3", icon: "✦", name: "Duhovno Savjetovanje",  desc: "Vodstvo kroz životne prijelaze, odluke i osobni razvoj.",                     price: "50", duration: "60", home: true  },
  { id: "s4", icon: "♆", name: "Tranziti & Predviđanja",desc: "Astrološka analiza nadolazećeg razdoblja i ključnih tranzita.",              price: "55", duration: "75", home: false },
  { id: "s5", icon: "♥", name: "Ljubavna Sinastrija",   desc: "Usporedba dvije natalne karte i analiza odnosa.",                            price: "75", duration: "90", home: false },
  { id: "s6", icon: "☿", name: "Online Konzultacija",   desc: "Sve usluge dostupne putem video poziva, bilo gdje u svijetu.",               price: "35", duration: "60", home: false }
];
// ===ALKEMIJANA:SERVICES:END===


// ===ALKEMIJANA:PRICING:START===
let PRICING = [
  { name: "Brzo Čitanje",       desc: "Jedno pitanje, 3 karte, 20 minuta",              price: "20" },
  { name: "Tarot Čitanje",      desc: "Klasično čitanje, 60 minuta",                    price: "40" },
  { name: "Duhovno Savjetovanje",desc: "Razgovor uz karte, 60 minuta",                  price: "50" },
  { name: "Tranziti",           desc: "Astrološka analiza razdoblja, 75 minuta",        price: "55" },
  { name: "Natalna Karta",      desc: "Karta rođenja + pisani izvještaj, 90 minuta",    price: "60" },
  { name: "Ljubavna Sinastrija",desc: "Analiza odnosa dvije karte, 90 minuta",          price: "75" },
  { name: "Solarni Povratak",   desc: "Godišnja prognoza, 60 minuta",                   price: "45" }
];
// ===ALKEMIJANA:PRICING:END===
