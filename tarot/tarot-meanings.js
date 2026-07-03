/* ============================================================
   Virtualni tarot — kratka značenja karata (SAMO za "kartu dana" na
   početnoj stranici, tumačenje pomoću RWS špila). Interaktivni stol
   ostaje namjerno bez tumačenja — ovo je izolirana iznimka za teaser
   karticu na početnoj (v. CLAUDE.md).

   Izvor: A. E. Waite, "The Pictorial Key to the Tarot" (1910) — izvorna
   knjiga napisana UZ sam RWS špil (Waite je ko-autor deck-a), javno
   dostupna (public domain). Tekst niže je hrvatska parafraza Waiteovih
   izvornih "Divinatory Meanings" natuknica za svaku od 78 karata (Part III,
   "The Outer Method of the Oracles"), ne slobodna moderna interpretacija —
   Waiteova izvorna značenja su namjerno terzija/viktorijanska i mjestimice
   tamnija/drukčija od popularnih modernih (npr. Luda kod Waitea znači
   "ludost, pretjerivanje, zanos", ne "nevin novi početak"). Sekundarna
   ("also...", "another reading says...") značenja koja Waite navodi uz
   glavno, spomenuta su gdje postoje. Preuzeto preko en.wikisource.org
   (Wikisource, javna domena — https://en.wikisource.org/wiki/The_Pictorial_Key_to_the_Tarot).
   ============================================================ */

const TAROT_CARD_MEANINGS = {
  // ---- Velika arkana ----
  'fool': 'Waiteovo izvorno značenje Lude mnogo je tamnije od popularne slike "nevinog novog početka" — ludost, pretjerivanje, zanos, čak i mahnitost koja gubi tlo pod nogama. Karta upozorava na impulzivnost i odluke donesene bez razmišljanja o posljedicama. Ipak, u toj nesputanosti krije se i hrabrost da se krene bez straha od tuđeg suda.',
  'magician': 'Prema Waiteu, Mag prije svega znači vještinu, diplomaciju i snalažljivost — sposobnost da se stvari elegantno riješe. Istodobno upozorava na bolest, gubitak i zamke neprijatelja, pa uz volju i samopouzdanje traži i oprez. Ako pitanje postavlja muškarac, karta prema Waiteu često predstavlja njega samog.',
  'high-priestess': 'Velika svećenica, kaže Waite, čuva tajne i budućnost koja se još nije otkrila — tišinu, upornost, skrivenu mudrost i znanost. Za muškarca koji postavlja pitanje karta često predstavlja ženu koja ga zaokuplja; za ženu, predstavlja nju samu. U oba slučaja poruka je ista: odgovor još nije spreman da bude izrečen naglas.',
  'empress': 'Carica prema Waiteu donosi plodnost, djelovanje i inicijativu — dug i bogat život pun rasta. No uz to stoji i nešto skriveno, tajnovito, a ponekad i sumnja ili neznanje koje tek treba razriješiti. Karta traži povjerenje u prirodni tijek rasta, ali bez gubljenja opreza.',
  'emperor': 'Car nosi stabilnost, moć i zaštitu — Waite ga povezuje s ostvarenjem zamisli i pomoći značajne osobe. Razum, uvjerenje i snažna volja njegove su glavne odlike, uz autoritet koji donosi red. Karta najavljuje vodstvo koje ima i snagu da taj red održi.',
  'hierophant': 'Svećenik prema Waiteu prvenstveno znači brak i savezništvo, no on dodaje i sjenovitiju stranu — zarobljenost i podložnost, osjećaj obaveze koji ograničava. Po drugom tumačenju koje Waite navodi, ista karta nosi milost i dobrotu. Poruka je o prihvaćanju nečeg što nadilazi pojedinca — tradicije, zajednice ili obećanja.',
  'lovers': 'Ljubavnici u Waiteovom tumačenju znače privlačnost, ljubav i ljepotu — te kušnje koje su uspješno prevladane. Karta govori o vezi koja je izdržala test vremena ili odluci koja je, unatoč izazovu, donesena srcem. Ono što je bilo neizvjesno sada se razrješava u sklad.',
  'chariot': 'Kočija prema Waiteu donosi pomoć i providnost, ali i rat, pobjedu, umišljenost i osvetu — kartu snažnih, ponekad sukobljenih sila. Uspjeh je moguć, no dolazi s dozom nemira koji ga prati. Riječ je o pobjedi voljom, uz oprez da ona ne preraste u aroganciju.',
  'strength': 'Ovu je kartu Waite u svom tekstu nazivao "Fortitude" (Postojanost) — moć, energiju, akciju i hrabrost, plemenitost duha koja vodi do potpunog uspjeha i priznanja. Ne radi se o sirovoj sili, nego o velikodušnosti i unutarnjoj čvrstoći koja svladava prepreke. Uspjeh dolazi onima koji djeluju s odvažnošću i širinom srca.',
  'hermit': 'Pustinjak prema Waiteu prije svega znači razboritost i opreznost, no on upozorava i na izdaju, prijetvornost i lukavost — potrebu da se dobro pripazi kome se vjeruje. Karta traži povučenost i promišljenost, ali i budnost prema onima koji možda nisu iskreni. Mudrost ovdje znači znati kada šutjeti i promatrati.',
  'wheel-of-fortune': 'Kotač sreće prema Waiteu jednostavno nosi sudbinu, uspjeh, uzdizanje, sreću i blagostanje. Život se okreće u povoljnom smjeru, donoseći priliku koja je dugo čekala. Vrijedi je prepoznati i iskoristiti dok kotač ide uzlaznom putanjom.',
  'justice': 'Pravda prema Waiteu znači pravednost, ispravnost i integritet — trijumf zaslužene strane, osobito u pravnim ili formalnim pitanjima. Karta govori o ishodu koji je pošten, čak i kad dolazi sporo. Ono što je ispravno, na kraju dobiva svoje priznanje.',
  'hanged-man': 'Obješeni čovjek prema Waiteu znači mudrost, oprez i sposobnost razlučivanja — postignute kroz kušnje i žrtvu. Karta je usko povezana s intuicijom i predosjećajem, sposobnošću da se vidi ono što drugima izmiče. Ponekad je najveća mudrost prihvatiti trenutnu žrtvu radi dubljeg uvida.',
  'death': 'Smrt prema Waiteu znači kraj, prolaznost i razaranje — za muškarca ponekad i gubitak dobrotvora ili zaštitnika. Waite je ne ublažava metaforama; ovo je karta istinskog okončanja koje zahtijeva prihvaćanje. Ono što je bilo, prestaje biti, i to nosi svoju vlastitu težinu.',
  'temperance': 'Umjerenost prema Waiteu znači štedljivost, umjerenost, gospodarenje resursima i prilagodbu. Nije riječ o velikim gestama, nego o strpljivom usklađivanju potreba i mogućnosti. Stabilnost dolazi iz mjere, ne iz krajnosti.',
  'devil': 'Vrag prema Waiteu znači razaranje, nasilje i silovitost — izvanredne napore i silu koja ponekad graniči sa sudbinskom neumitnošću. Karta upozorava na situacije koje nadilaze uobičajenu kontrolu, gdje se stvari odvijaju snažno i nepredvidivo. Prepoznavanje te sile prvi je korak k oslobađanju od nje.',
  'tower': 'Kula je jedna od najtežih karata u Waiteovom tumačenju — bijeda, nevolja, oskudica, nesreća, sramota, obmana i propast. Waite ne ublažava težinu onoga što dolazi; ovo je karta potresa koji ruši ono što je bilo pogrešno postavljeno. Iz te ruševine, iako bolne, otvara se prostor za nešto istinitije.',
  'star': 'Zvijezda u izvornom Waiteovom tumačenju znači gubitak, krađu, oskudicu i napuštenost — mnogo tamniju sliku od popularne moderne "nade". No, kako i sam Waite navodi, postoji i drugo čitanje karte koje govori upravo o nadi i svijetlim izgledima. Obje strane postoje istodobno: teškoća koja se priznaje, i svjetlo koje se ipak nazire iza nje.',
  'moon': 'Mjesec prema Waiteu znači skrivene neprijatelje, opasnost, klevetu, tamu, užas i obmanu — okultne sile koje djeluju izvan vidokruga i zbunjuju rasudbu. Karta upozorava na strah i pogrešku koja nastaje kad se stvarnost ne vidi jasno. Oprez i sumnjičavost ovdje nisu slabost, nego nužna zaštita.',
  'sun': 'Sunce prema Waiteu jednostavno i izravno znači materijalnu sreću, sretan brak i zadovoljstvo — jedna od najpovoljnijih karata u cijelom špilu. Nema skrivenih upozorenja ni dvostrukih značenja; radost je iskrena i zaslužena. Vrijeme je uživati u onome što je postignuto.',
  'judgement': 'Sud (u Waiteovu izvorniku "Posljednji sud") znači promjenu položaja, obnovu i konačan ishod — kratka, ali značajna karta prekretnice. Nešto se pomiče iz jednog stanja u drugo, donoseći jasnoću o tome kako se stvari razrješavaju. To je poziv da se prihvati novo poglavlje koje slijedi.',
  'world': 'Svijet prema Waiteu znači siguran uspjeh i nagradu za uloženo, a povezuje ga i s putovanjem, promjenom mjesta, iseljenjem ili odlaskom. Karta najavljuje zaokruženje jednog poglavlja upravo u trenutku kad se otvara novi put ili horizont. Ostvarenje dolazi zajedno s pokretom naprijed, ne mirovanjem.',

  // ---- Štapovi (prema Waiteu: poduzetnost, snaga, akcija) ----
  'wands-ace': 'As štapova prema Waiteu znači stvaranje, izum i poduzetnost — snage iz kojih nastaju novi počeci, sam izvor i princip s kojeg sve kreće. To je iskra iz koje se rađa novi poduhvat.',
  'wands-02': 'Dvojka štapova, prema jednom od Waiteovih tumačenja, znači bogatstvo, sreću i veličanstvenost. Karta najavljuje materijalni napredak i osjećaj da se stvari šire u pravom smjeru. Vrijedi prepoznati priliku koja se otvara.',
  'wands-03': 'Trojka štapova prema Waiteu znači utvrđenu snagu, poduzetnost i trud uložen u trgovinu ili otkriće. Ovo je karta koja slavi napredak već postavljenih temelja. Ono što je pokrenuto, sada se širi dalje.',
  'wands-04': 'Četvorka štapova, prema Waiteu, donosi seoski život, utočište i vrstu domaće proslave žetve — mir, slogu i blagostanje. Karta govori o odmoru zasluženom nakon truda i skladu u domu. To je trenutak za slavlje i zahvalnost.',
  'wands-05': 'Petica štapova znači naporno natjecanje i borbu u potrazi za bogatstvom i srećom — Waite je opisuje kroz oponašanje i sukobljene interese. Karta upozorava na trvenje koje nastaje kad se više strana bori za isto. Iz te napetosti ipak može izrasti jasnoća o vlastitoj poziciji.',
  'wands-06': 'Šestica štapova znači pobjednika koji slavi trijumf — Waite je povezuje s velikim vijestima i očekivanjem koje se konačno ispunjava. Karta najavljuje priznanje za uloženi trud. Ono čemu si se nadao stiže u obliku dobre vijesti.',
  'wands-07': 'Sedmica štapova znači hrabrost usred rasprave i verbalnog sukoba — u poslu, pregovore, trgovinsko nadmetanje i konkurenciju. Waite je vidi kao kartu koja traži da se odlučno brani vlastita pozicija. Ustrajnost usred izazova donosi prednost.',
  'wands-08': 'Osmica štapova znači aktivnost i brzinu — Waite je uspoređuje s hitrošću glasnika koji nosi važnu poruku. Karta najavljuje veliku žurbu, ali i veliku nadu koja tu žurbu prati. Stvari se pokreću naglo, nakon razdoblja čekanja.',
  'wands-09': 'Devetka štapova znači snagu usred opiranja — Waite je opisuje i kroz odgodu i privremeni zastoj. Karta govori o otpornosti sabranoj kroz prijeđeni put, čak i kad se čini da se sve zaustavilo. Snaga je u tome da se izdrži do kraja.',
  'wands-10': 'Desetka štapova znači, kako Waite kaže, jednostavno teret — no dodaje da je to ujedno i sreća, dobitak, svaki oblik uspjeha, pa je teret zapravo teret samog tog uspjeha. Karta govori o opterećenju koje nosi onaj tko je postigao mnogo. Vrijedi promisliti što je od tog tereta stvarno potrebno nositi dalje.',
  'wands-page': 'Paž štapova prema Waiteu predstavlja tamnokosog mladića, vjernog i odanog — ljubavnika, glasnika ili donositelja pošte. Karta najavljuje vijest ili poruku koja dolazi s entuzijazmom i iskrenošću.',
  'wands-knight': 'Vitez štapova znači odlazak, odsutnost, bijeg ili iseljenje — Waite ga opisuje i kao prijateljski nastrojenog tamnokosog mladića. Karta najavljuje promjenu mjesta boravka ili naglo kretanje naprijed. Nešto se pokreće, i to brzo.',
  'wands-queen': 'Kraljica štapova predstavlja tamnokosu ženu, prijateljsku, čestitu i punu ljubavi — Waite spominje i naklonost prema novcu ili određeni uspjeh u poslu. Njezina snaga je u iskrenosti i neovisnosti.',
  'wands-king': 'Kralj štapova predstavlja tamnokosog, prijateljski nastrojenog čovjeka, obično oženjenog, poštenog i savjesnog — Waite naglašava da karta uvijek znači poštenje. Ponekad najavljuje i vijest o neočekivanom nasljedstvu koje uskoro stiže.',

  // ---- Pehari (prema Waiteu: emocije, odnosi, srce) ----
  'cups-ace': 'As pehara znači dom istinskog srca, radost i zadovoljstvo — Waite ga povezuje s obiljem, plodnošću i duhovnom hranom. Karta najavljuje emocionalni početak pun topline. Srce se otvara novom osjećaju.',
  'cups-02': 'Dvojka pehara znači ljubav, strast i prijateljstvo — sklad i suosjećanje između dvoje ljudi. Waite je opisuje kao kartu istinske povezanosti, gdje se dvije strane susreću kao ravnopravne. To je razmjena koja obogaćuje oboje.',
  'cups-03': 'Trojka pehara znači sretan završetak stvari — obilje, savršenstvo i veselje. Waite je opisuje kao kartu pobjede i ispunjenja. Vrijeme je za proslavu s onima koji su dio tog uspjeha.',
  'cups-04': 'Četvorka pehara znači umor, gađenje i nezadovoljstvo — Waite spominje i zamišljene, uobražene tegobe. No dodaje da je to ujedno i karta miješanog zadovoljstva. Vrijedi preispitati je li nezadovoljstvo stvarno ili samo privid.',
  'cups-05': 'Petica pehara je karta gubitka — no Waite naglašava da nešto uvijek ostaje, poput karte nasljedstva koja se prenosi dalje. Tuga zbog onoga što je izgubljeno ne poništava ono što je preostalo.',
  'cups-06': 'Šestica pehara je karta prošlosti i sjećanja — pogled unatrag, primjerice na djetinjstvo, uz osjećaj sreće i uživanja. Waite je vidi kao nostalgičnu, toplu kartu. Prošlost donosi utjehu ili radostan susret.',
  'cups-07': 'Sedmica pehara znači vilinske darove i slike razmišljanja — sentiment, maštu, stvari viđene kroz staklo kontemplacije. Waite je opisuje kao kartu mnoštva mogućnosti obavijenih iluzijom. Potrebna je jasnoća prije nego što se odabere pravi put među snovima.',
  'cups-08': 'Osmica pehara, kako Waite kaže, "govori sama za sebe" — opadanje neke stvari, ili spoznaja da nešto što se činilo važnim zapravo nije. Karta najavljuje okretanje od onoga što više ne ispunjava. To je hrabar korak prema onome što stvarno ima smisla.',
  'cups-09': 'Devetka pehara znači sklad, zadovoljstvo i tjelesnu dobrobit — Waite dodaje i pobjedu, uspjeh i prednost, zadovoljstvo za onoga tko postavlja pitanje. Vrijeme je uživati u onome što je postignuto.',
  'cups-10': 'Desetka pehara znači zadovoljstvo i mir cijelog srca — Waite je opisuje kao savršenstvo tog stanja, kao i savršenstvo ljudske ljubavi i prijateljstva. Karta slika obiteljsku sreću i emocionalno ispunjenje dijeljeno s voljenima.',
  'cups-page': 'Paž pehara predstavlja svijetlog mladića sklonog pružanju usluge — Waite ga opisuje kao marljivog, zamišljenog mladića. Karta najavljuje vijest ili poruku, uz poziv na promišljenost i meditaciju.',
  'cups-knight': 'Vitez pehara znači dolazak i približavanje — ponekad glasnika, ponekad ponude ili poziva. Waite je vidi kao kartu vođenu romantikom i idealima. Netko se približava s iskrenom namjerom.',
  'cups-queen': 'Kraljica pehara predstavlja dobru, svijetlu ženu — poštenu i odanu, spremnu pomoći onome tko pita. Waite spominje ljubeću inteligenciju koja donosi uspjeh i sreću. Njezina snaga je u dubokoj empatiji.',
  'cups-king': 'Kralj pehara predstavlja svijetlog čovjeka — poslovnog, pravnog ili duhovnog usmjerenja, odgovornog i spremnog pomoći. Waite dodaje pravednost, umjetnost i znanost kao njegove odlike. On je primjer kako ostati topao i pribran usred izazova.',

  // ---- Mačevi (prema Waiteu: um, sukob, istina) ----
  'swords-ace': 'As mačeva znači trijumf — pretjeranost u svemu, osvajanje, pobjedu sile. Waite ga opisuje kao kartu velike snage, jednako prisutne u ljubavi kao i u mržnji. Ovo je trenutak oštre, nedvosmislene jasnoće.',
  'swords-02': 'Dvojka mačeva znači sukladnost i ravnotežu koju ona donosi — hrabrost, prijateljstvo, slogu čak i u stanju napetosti. Waite je vidi kao privremeno primirje između suprotstavljenih strana. Vrijedi skinuti povez s očiju i suočiti se s odlukom.',
  'swords-03': 'Trojka mačeva znači uklanjanje, odsutnost, odgodu i razdvajanje — Waite naglašava da karta prirodno nosi bol raskida. To je karta iskrene, ponekad bolne istine, iz koje ipak proizlazi put naprijed.',
  'swords-04': 'Četvorka mačeva znači budnost, povlačenje i samoću — Waite je povezuje s pustinjačkim mirom, pa čak i s grobnicom kao slikom potpunog odmora. Karta traži predah i mentalni oporavak prije sljedećeg koraka.',
  'swords-05': 'Petica mačeva znači poniženje, razaranje i sramotu — Waite je opisuje kao kartu gubitka u svim njegovim oblicima. Karta upozorava na pobjedu koja gorko okusi, sukob u kojem svi nešto gube.',
  'swords-06': 'Šestica mačeva znači putovanje vodom, put, glasnika ili povoljno rješenje. Waite je vidi kao kartu prijelaza prema mirnijim vodama. Teškoće ostaju iza, čak i ako je put naprijed još pomalo neizvjestan.',
  'swords-07': 'Sedmica mačeva znači namjeru, pokušaj, nadu i samopouzdanje — no Waite dodaje i svađu, plan koji može propasti, i razdraženost. Prečaci mogu koštati više nego što donose.',
  'swords-08': 'Osmica mačeva znači loše vijesti, snažnu ogorčenost i krizu — Waite spominje i moć okovanu preprekama, sukob i klevetu. Karta opisuje osjećaj zarobljenosti koji je često samonametnut. Izlaz postoji čim se prepozna da zapravo postoji.',
  'swords-09': 'Devetka mačeva znači smrt, neuspjeh i propast — Waite je opisuje kao jednu od najtežih karata, punu razočaranja i očaja. Nosi tjeskobu i noćne brige koje se vrte u krug, no strahovi su često veći u glavi nego u stvarnosti.',
  'swords-10': 'Desetka mačeva znači ono što slika sama otkriva — bol, patnju, suze, tugu i pustoš. Waite je ne ublažava; ovo je karta bolnog, ali definitivnog dna. S tog dna vodi samo put prema gore.',
  'swords-page': 'Paž mačeva znači autoritet, nadzor i tajnu službu — budnost, promatranje i ispitivanje. Waite ga opisuje kao pažljivog, opreznog promatrača. Karta najavljuje vijest koja traži oštro, jasno razmišljanje.',
  'swords-knight': 'Vitez mačeva znači vještinu, hrabrost i sposobnost obrane — no Waite dodaje i neprijateljstvo, gnjev, rat i razaranje. Karta nosi energiju brzog, odlučnog djelovanja koje ponekad ide prebrzo.',
  'swords-queen': 'Kraljica mačeva znači udovištvo, žensku tugu i nelagodu — odsutnost, žalovanje i razdvojenost. Waite je opisuje kroz iskustvo gubitka koje je izoštrilo njezinu jasnoću. Njezina snaga leži u iskrenosti stečenoj kroz bol.',
  'swords-king': 'Kralj mačeva znači sve što proizlazi iz ideje prosudbe — moć, zapovijedanje, autoritet i odlučnu, ratničku inteligenciju vezanu uz zakon. Waite ga vidi kao vladara logikom i nepristranom procjenom, koji odluke donosi hladne glave.',

  // ---- Pentakli (prema Waiteu: materijalno, rad, tijelo) ----
  'pentacles-ace': 'As pentakla znači savršeno zadovoljstvo, sreću i zanos — Waite dodaje i brzu, oštroumnu vijest, te samo zlato kao simbol materijalnog dobitka. Sjeme je posađeno, spremno za rast.',
  'pentacles-02': 'Dvojka pentakla je, s jedne strane, karta veselja i rekreacije — no Waite je čita i kao vijesti i poruke u pismu, prepreke, uznemirenost i nevolju. Karta govori o žongliranju s više obaveza istodobno; prilagodljivost je ključna dok se sve ne posloži.',
  'pentacles-03': 'Trojka pentakla znači zanat, trgovinu i vješt rad — no Waite napominje da se obično smatra kartom plemenitosti, ugleda i slave. Vještina i suradnja grade nešto trajno.',
  'pentacles-04': 'Četvorka pentakla znači sigurnost posjeda — čvrsto priljubljivanje uz ono što se ima, dar ili nasljedstvo. Waite je vidi kao kartu koja traži sigurnost kroz kontrolu. Ipak, pretjerano stiskanje ponekad koči obilje koje bi moglo doći.',
  'pentacles-05': 'Petica pentakla prije svega najavljuje materijalnu nevolju — bilo u obliku prikazanom na karti, dakle bijedi, bilo u nekom drugom obliku. Waite je jasan: ovo je karta oskudice. No podrška je često bliže nego što se čini.',
  'pentacles-06': 'Šestica pentakla znači darove, poklone i zadovoljstvo — po drugom tumačenju, pažnju i budnost. Waite naglašava da je "sada prihvaćeno vrijeme" — sadašnji trenutak blagostanja. Bilo da daješ ili primaš, ravnoteža u razmjeni je ključna.',
  'pentacles-07': 'Sedmica pentakla nosi, kako Waite priznaje, izrazito proturječna značenja — no u osnovi je karta novca, posla i razmjene. Poziva na strpljivu procjenu uloženog truda prije nego što se nastavi dalje.',
  'pentacles-08': 'Osmica pentakla znači rad, zaposlenje i majstorstvo — vještinu u zanatu i poslu, možda još u pripremnoj fazi. Waite je opisuje kao kartu predanog, marljivog usavršavanja. Kvaliteta dolazi iz ponavljanja i pažnje na detalje.',
  'pentacles-09': 'Devetka pentakla znači razboritost, sigurnost i uspjeh — postignuće, izvjesnost i sposobnost rasuđivanja. Waite je vidi kao kartu samostalno izgrađenog blagostanja, nezavisnosti stečene vlastitim trudom.',
  'pentacles-10': 'Desetka pentakla znači dobitak i bogatstvo — obiteljska pitanja, podrijetlo, dom obitelji. Waite je opisuje kao kartu trajnog, generacijskog blagostanja. Ono što se gradi sada, nadživljuje pojedinca.',
  'pentacles-page': 'Paž pentakla znači predanost, učenje i promišljenost — po drugom tumačenju, vijesti, poruke i onoga tko ih donosi, kao i vođenje i upravljanje. Waite ga opisuje kao marljivog učenika prilika.',
  'pentacles-knight': 'Vitez pentakla znači korisnost, uslužnost i odgovornost — poštenje na sasvim praktičnoj, vanjskoj razini. Waite ga vidi kao kartu postojanog, pouzdanog napretka. Strpljenje i doslednost donose rezultate.',
  'pentacles-queen': 'Kraljica pentakla znači obilje, velikodušnost i sigurnost — Waite dodaje i slobodu kao njezinu odliku. Ona spaja udobnost doma s praktičnom sposobnošću brige o drugima.',
  'pentacles-king': 'Kralj pentakla znači hrabrost i inteligenciju koja ostvaruje zamisli — poslovnu i intelektualnu sposobnost, ponekad i dar za matematiku. Waite ga opisuje kao utjelovljenje stabilnosti izgrađene kroz godine truda.'
};

window.TAROT_CARD_MEANINGS = TAROT_CARD_MEANINGS;
