/* ============================================================
   Virtualni tarot — kratka značenja karata (SAMO za "kartu dana" na
   početnoj stranici). Interaktivni stol ostaje namjerno bez tumačenja —
   ovo je izolirana iznimka za teaser karticu na početnoj (v. CLAUDE.md).

   Tekst je spoj tradicionalnih značenja RWS špila (temeljenih na izvornoj
   knjizi A. E. Waitea "The Pictorial Key to the Tarot", 1910, javna domena)
   i modernih, toplijih tumačenja koja se danas najčešće koriste. Namjerno
   je pisan kao izravan opis karte (BEZ "kaže Waite / navodi se..." fraza) i
   uravnoteženog tona — priznaje i sjenu i svjetlo karte, ne samo mračnu
   viktorijansku stranu.
   ============================================================ */

const TAROT_CARD_MEANINGS = {
  // ---- Velika arkana ----
  'fool': 'Luda je karta novog početka i skoka u nepoznato — spontanosti, znatiželje i vjere da će se put otvoriti dok hodaš. Nosi svježinu i hrabrost da kreneš bez tereta prošlih iskustava i bez straha od tuđeg suda. U starijim tumačenjima podsjeća i na nepromišljenost, pa je poruka jednostavna: kreni slobodno, ali ostani barem malo prisebna.',
  'magician': 'Mag je karta volje pretvorene u djelo — vještine, snalažljivosti i sposobnosti da zamisao postane stvarnost. Svi alati koje trebaš već su pred tobom; pitanje je samo hoćeš li ih usmjeriti s namjerom. Poziva na fokus, samopouzdanje i preuzimanje inicijative.',
  'high-priestess': 'Velika svećenica čuva prag između svjesnog i skrivenog — nosi intuiciju, tihu mudrost i tajne koje se još nisu otkrile. Poziva na strpljenje i osluškivanje unutarnjeg glasa prije nego što se nešto izgovori naglas. Odgovori koje tražiš već su u tebi; treba im samo tišina da isplivaju.',
  'empress': 'Carica donosi obilje, plodnost i toplinu prirode koja se ne žuri. Govori o njegovanju — sebe, ideje, odnosa ili doma — i o zadovoljstvu u stvaralačkom, osjetilnom životu. Rast dolazi kad dopustiš stvarima da sazriju svojim ritmom.',
  'emperor': 'Car predstavlja red, stabilnost i čvrstu vlast nad vlastitim životom. Nosi zaštitu, razum i snagu volje — temelje na kojima se gradi sigurnost. Poziva na jasne granice i odgovornost, uz vodstvo koje dolazi iz mirne čvrstine, a ne iz krutosti.',
  'hierophant': 'Svećenik nosi tradiciju, zajedničke vrijednosti i učenje kroz provjerene puteve. Povezuje se s obvezom, savezništvom i pripadanjem nečemu većem — mentorstvu, zajednici ili duhovnoj praksi. Podsjeća da je ponekad mudro osloniti se na ono što je već isprobano, uz pažnju da te okvir ne sputa previše.',
  'lovers': 'Ljubavnici govore o privlačnosti, ljubavi i skladu koji nastaje kad se vrijednosti dvoje ljudi poklope. Nose i temu izbora donesenog srcem — raskrižja na kojem biraš ono što je za tebe istinito. Kušnje koje su iza tebe sada se razrješavaju u povezanost.',
  'chariot': 'Kočija je pobjeda voljom — sposobnost da suprotstavljene sile usmjeriš u isti smjer i kreneš naprijed. Traži samopouzdanje, fokus i odlučnost usred izazova. Uspjeh dolazi onome tko drži uzde čvrsto, uz oprez da ta snaga ne preraste u tvrdoglavost.',
  'strength': 'Snaga (u starijim špilovima "Postojanost") nosi hrabrost, energiju i plemenitost duha. Ne radi se o sirovoj sili, nego o strpljenju i suosjećanju koji pripitomljuju i najveće prepreke. Prava moć ovdje je nježna — i upravo zato potpuna.',
  'hermit': 'Pustinjak se povlači od buke svijeta u potrazi za unutarnjim svjetlom. Nosi razboritost, promišljenost i mudrost stečenu vlastitim iskustvom. Poziva na trenutak samoće koji liječi i razbistri — odgovor se često ne nalazi vani, nego u tišini.',
  'wheel-of-fortune': 'Kotač sreće donosi sudbinu, sreću i uzlazni okret događaja. Podsjeća da je promjena jedina stalnost — ono što je dugo čekalo sada dolazi. Vrijedi prepoznati priliku i uhvatiti val dok se kotač penje.',
  'justice': 'Pravda traži poštenje, jasnoću i preuzimanje odgovornosti za vlastite postupke. Govori o ravnoteži uzroka i posljedice — što posiješ, to i žanješ. Ono što je ispravno na kraju dobiva svoje priznanje, čak i kad dolazi sporo.',
  'hanged-man': 'Obješeni čovjek nudi pogled iz sasvim drugog kuta — mudrost koja dolazi kad prestaneš gurati. Nosi predaju, strpljenje i sposobnost razlučivanja izoštrenu kroz mirovanje. Ponekad je najveći uvid u tome da svjesno zastaneš i pustiš.',
  'death': 'Smrt najavljuje kraj jednog poglavlja da bi moglo početi sljedeće — rijetko doslovan kraj, gotovo uvijek transformaciju. Ono što je odslužilo svoju svrhu sada odlazi, ma koliko se za njega držali. Iz tog rastanka oslobađa se prostor za nešto novo i istinitije.',
  'temperance': 'Umjerenost miješa suprotnosti u skladnu cjelinu — strpljenje, mjeru i postupan napredak. Poziva na ravnotežu umjesto krajnosti i na povjerenje u proces koji se ne žuri. Iscjeljenje i mir dolaze iz prave mjere.',
  'devil': 'Vrag pokazuje lance koje često sami sebi stavljamo — navike, strahove ili ovisnosti koje nas drže zarobljenima. Nosi i snažnu, sirovu privlačnost koja zna zavesti. Poruka je ipak oslobađajuća: čim prepoznaš iluziju kontrole koju nešto ima nad tobom, lanac popušta.',
  'tower': 'Kula je nagla promjena koja ruši ono što je bilo izgrađeno na krivim temeljima. Iako potresna, ta oluja čisti prostor od iluzija i otkriva istinu koja se dotad skrivala. Nakon rušenja često dolazi neočekivano olakšanje i mogućnost da se gradi stabilnije.',
  'star': 'Zvijezda donosi nadu, iscjeljenje i tihu vjeru nakon teškog razdoblja. Nosi obnovu i nadahnuće — osjećaj da su, nakon oblaka, bolji dani ponovno na putu. Dovoljno je pratiti svjetlo koje već osjećaš i dopustiti si da vjeruješ.',
  'moon': 'Mjesec vodi kroz maglu neizvjesnosti, snova i onoga što nije posve jasno. Podsjeća da strahovi i iluzije u polumraku znaju izgledati veći nego što jesu. Poziva te da se osloniš na intuiciju i ne žuriš kroz nepoznato dok se put ne razbistri.',
  'sun': 'Sunce je radost, vitalnost i jasnoća bez skrivenih namjera — jedna od najvedrijih karata špila. Najavljuje uspjeh, toplinu i osjećaj da je, makar nakratko, sve na svom mjestu. Dopusti si da se raduješ bez zadrške.',
  'judgement': 'Sud je poziv na buđenje — pogled unatrag koji donosi razumijevanje i poticaj da kreneš prema autentičnijoj verziji sebe. Govori o obnovi, oprostu i prekretnici na kojoj se nešto zaokružuje. Vrijeme je odgovoriti na unutarnji poziv i prihvatiti novo poglavlje.',
  'world': 'Svijet obilježava zaokruženje jednog ciklusa — cilj je postignut, krug se zatvorio. Nosi ispunjenje, cjelovitost i osjećaj da su svi dijelovi konačno posloženi. Često najavljuje i putovanje ili novi horizont — ostvarenje koje dolazi zajedno s pokretom naprijed.',

  // ---- Štapovi (vatra — akcija, strast, poduzetnost) ----
  'wands-ace': 'As štapova iskra je nove strasti, ideje ili poduzetnog pothvata spremnog da krene. Nosi stvaralačku energiju i početak koji budi entuzijazam. Sada je trenutak da uhvatiš tu iskru dok je svježa.',
  'wands-02': 'Dvojka štapova stoji na pragu odluke — plan je postavljen, obzor otvoren, ostaje odabrati smjer. Nosi i naslućivanje uspjeha i obilja koje takva hrabrost može donijeti. Vizija bez prvog koraka ostaje tek zamisao.',
  'wands-03': 'Trojka štapova gleda prema obzoru dok prvi rezultati truda počinju stizati. Vrijeme je za strpljivo širenje, suradnju i pogled unaprijed. Ono što si pokrenula počinje se vraćati.',
  'wands-04': 'Četvorka štapova slavi proslavu, dom i zajedništvo nakon uloženog truda. Nosi sklad, stabilnost i radost dijeljenu s bliskima. Trenutak je da zastaneš i uživaš u onome što je izgrađeno.',
  'wands-05': 'Petica štapova donosi trvenje, natjecanje i sukobljene interese koji traže glasan dogovor. Energija je živa, ponekad naporna, ali iz nje može izrasti bolje rješenje. Vrijedi se uključiti, no birati bitke.',
  'wands-06': 'Šestica štapova javlja pobjedu, priznanje i zaslužene čestitke. Nosi trijumf i ispunjenje očekivanja. Vrijeme je primiti pohvalu i povjerenje koje ti drugi ukazuju.',
  'wands-07': 'Sedmica štapova traži da braniš svoj stav i prostor usred izazova ili konkurencije. Nosi hrabrost i upornost onoga tko drži poziciju. Ostaneš li vjerna sebi, prednost je na tvojoj strani.',
  'wands-08': 'Osmica štapova je nagli, ubrzani napredak — nakon čekanja stvari se pokreću brzo. Nose je vijesti, poruke i događaji koji stižu bez odgode. Prati zamah dok traje.',
  'wands-09': 'Devetka štapova pokazuje umor od prijeđenog puta, ali i otpornost sabranu iz iskustva. Nosi snagu u naizgled nepovoljnoj situaciji i posljednju rezervu izdržljivosti. Ostani budna — cilj je bliže nego što se čini.',
  'wands-10': 'Desetka štapova nosi težinu preuzetih obveza — uspjeh je stigao, ali s njim i teret. Vrijedi razmotriti što je uistinu potrebno nositi dalje, a što možeš spustiti. Ne moraš sve raditi sama.',
  'wands-page': 'Paž štapova nosi svježu, znatiželjnu energiju istraživača spremnog na nove pothvate. Najavljuje ideju, vijest ili poruku koja budi entuzijazam. Prati taj poticaj i vidi kamo vodi.',
  'wands-knight': 'Vitez štapova juri naprijed hrabro i strastveno, gladan akcije i pustolovine. Nosi promjenu, pokret i energiju koja teško miruje. Podsjeća da i najžešća strast treba malo smjera da ne izgori prebrzo.',
  'wands-queen': 'Kraljica štapova zrači samopouzdanjem, toplinom i neovisnošću koja privlači druge. Vodi srcem i djelom istovremeno, sigurna u vlastitu vrijednost. Njezina karizma otvara i vrata i prilike.',
  'wands-king': 'Kralj štapova vodi vizijom, hrabrošću i prirodnim autoritetom poduzetnika. Nosi poštenje, odlučnost i sposobnost da ideju pretvori u pokret. Inspirira druge vlastitim primjerom.',

  // ---- Pehari (voda — emocije, odnosi, intuicija) ----
  'cups-ace': 'As pehara prelijeva se novom emocijom — ljubavlju, radošću ili duhovnim otvaranjem srca. Nosi obilje osjećaja i početak nečeg nježnog. Dopusti osjećajima da slobodno poteku.',
  'cups-02': 'Dvojka pehara slavi povezanost, uzajamnost i sklad između dvoje. Nosi ljubav, prijateljstvo i susret ravnopravnih. Ono što se gradi počiva na iskrenosti i međusobnom poštovanju.',
  'cups-03': 'Trojka pehara slavi prijateljstvo, zajedništvo i radost dijeljenu s onima koji te podržavaju. Nosi proslavu, zahvalnost i sretan ishod. Vrijeme je uživati u zajednici oko sebe.',
  'cups-04': 'Četvorka pehara pokazuje trenutak zasićenosti ili nezadovoljstva usred obilja koje se ne primjećuje. Podsjeća da vrijedi podignuti pogled — nova prilika već čeka. Ponekad je sreća bliže nego što se čini.',
  'cups-05': 'Petica pehara oplakuje gubitak, ali podsjeća da nešto vrijedno ipak ostaje. Iza tuge stoje pehari koji su još uspravni, čim se okreneš od onoga što je prosuto. Nosi i utjehu onoga što se prenosi i ostaje.',
  'cups-06': 'Šestica pehara vraća toplinu djetinjstva, nostalgiju i iskrenu dobrotu bez skrivenih namjera. Nosi ugodne uspomene i susrete koji liječe. Prošlost ovdje donosi utjehu, a ne teret.',
  'cups-07': 'Sedmica pehara nudi mnoštvo mogućnosti obavijenih maglom mašte i sanjarenja. Podsjeća da je potrebna jasnoća prije nego odabereš pravi put među privlačnim slikama. Ne mora sve što blista biti ono pravo.',
  'cups-08': 'Osmica pehara okreće leđa onome što više ne ispunjava, u potrazi za dubljim smislom. Nosi hrabar odlazak od udobnog radi autentičnog. Ono što ostavljaš možda je manje važno nego što se činilo.',
  'cups-09': 'Devetka pehara nosi zadovoljstvo, ispunjenje i osjećaj da su želje uslišane. Zovu je i "kartom želje" — trenutkom kad se dobro osjećaš u vlastitoj koži. Vrijeme je uživati u onome što si sebi izgradila.',
  'cups-10': 'Desetka pehara slika sklad, obiteljsku sreću i emocionalno ispunjenje koje nadilazi pojedinca. Nosi mir srca i puninu ljubavi i prijateljstva. Ovo je karta trajnog zadovoljstva dijeljenog s voljenima.',
  'cups-page': 'Paž pehara donosi nježnu, maštovitu poruku ili nova emocionalna otkrića. Nosi otvorenost srca, kreativnost i tihu intuiciju. Poziva te da poslušaš osjećaj koji se javlja.',
  'cups-knight': 'Vitez pehara jaše vođen romantikom, idealima i pozivom srca. Nosi ponudu, poziv ili gestu koja dolazi iz iskrenih osjećaja. Približava se nešto lijepo — dopusti mu da priđe.',
  'cups-queen': 'Kraljica pehara njeguje duboku empatiju i emocionalnu mudrost. Vodi osjećajima, ali s mirnoćom koja druge umiruje i razumije. Njezina toplina daje sigurnost svima oko nje.',
  'cups-king': 'Kralj pehara vlada emocijama sa zrelošću i stabilnošću — suosjećajan, ali pribran. Spaja srce i razum, ostajući miran i usred oluje. Primjer je kako biti topao, a istovremeno čvrst.',

  // ---- Mačevi (zrak — um, istina, izazovi) ----
  'swords-ace': 'As mačeva sječe kroz konfuziju do jasne istine ili nove ideje. Nosi mentalnu bistrinu, odlučnost i snagu — u ljubavi jednako kao u sukobu. Trenutak je da stvari nazoveš pravim imenom.',
  'swords-02': 'Dvojka mačeva pokazuje zastoj i odgađanje odluke dok se izbjegava suočavanje. Nosi i privremenu ravnotežu i primirje, ali ono ne može trajati vječno. Vrijeme je skinuti povez s očiju i odabrati.',
  'swords-03': 'Trojka mačeva nosi bol istine, razočaranja ili rastanka — jednu od iskrenijih, ali i teže karata. Ipak, ta jasnoća, koliko god oštra, otvara put ozdravljenju. Ono što boli sada oslobađa prostor za zdraviji odnos prema sebi.',
  'swords-04': 'Četvorka mačeva traži predah — oporavak, tišinu i mentalni odmor prije sljedeće bitke. Nosi povlačenje koje nije bijeg, nego priprema. Zaustavljanje sada vraća ti snagu.',
  'swords-05': 'Petica mačeva upozorava na pobjedu koja gorko okusi — sukob u kojem svi ponešto izgube. Vrijedi promisliti je li borba uopće vrijedna nastavka. Ponekad je najmudrije spustiti mač.',
  'swords-06': 'Šestica mačeva vodi prema mirnijim vodama, ostavljajući teškoće iza sebe. Nosi putovanje, prijelaz i postupno smirivanje. Ideš prema boljem, čak i ako je put još pomalo neizvjestan.',
  'swords-07': 'Sedmica mačeva govori o strategiji, snalažljivosti i potrebi da djeluješ promišljeno. Nosi i upozorenje na prečace ili neiskrenost — svoju ili tuđu. Vrijedi provjeriti igra li se pošteno.',
  'swords-08': 'Osmica mačeva prikazuje osjećaj zarobljenosti koji je često samonametnut. Nosi ograničenja koja izgledaju veća nego što uistinu jesu. Izlaz postoji čim prestaneš vjerovati da ga nema.',
  'swords-09': 'Devetka mačeva nosi tjeskobu, brige i misli koje se vrte u krug usred noći. Podsjeća da strahovi u glavi znaju biti mnogo veći nego u stvarnosti. Ono što te muči često izgleda drukčije na dnevnom svjetlu.',
  'swords-10': 'Desetka mačeva označava bolan, ali definitivan kraj — dno s kojeg vodi samo put prema gore. Ono najgore je iza tebe; ono što slijedi je oporavak. Iza najtamnijeg trenutka već sviće.',
  'swords-page': 'Paž mačeva budan je, znatiželjan promatrač spreman učiti i postavljati pitanja. Nosi oštar um, opreznost i potrebu za jasnim razmišljanjem. Najavljuje vijest ili istinu koju vrijedi dobro pogledati.',
  'swords-knight': 'Vitez mačeva juri odlučno prema cilju, brzo i izravno, ponekad prebrzo. Nosi hitro djelovanje, hrabrost i jasnu komunikaciju. Podsjeća da snaga uma treba i malo strpljenja.',
  'swords-queen': 'Kraljica mačeva vidi jasno kroz iluzije i vodi razumom, iskrenošću i nezavisnošću. Njezina snaga je u britkoj istini izrečenoj bez suvišnih riječi. Iza njezine ozbiljnosti krije se iskustvo, ne hladnoća.',
  'swords-king': 'Kralj mačeva vlada logikom, autoritetom i nepristranom prosudbom. Odluke donosi bistre glave, na temelju činjenica, a ne emocija. Njegova je moć u jasnoći i pravednosti.',

  // ---- Pentakli (zemlja — materijalno, rad, tijelo) ----
  'pentacles-ace': 'As pentakla donosi novu priliku u poslu, financijama ili opipljivom svijetu. Nosi sjeme uspjeha, blagostanja i konkretnog rasta. Uz njegu, iz njega može izrasti nešto stabilno i trajno.',
  'pentacles-02': 'Dvojka pentakla žonglira s više obveza, tražeći ravnotežu usred promjenjivih okolnosti. Nosi prilagodljivost, ali i vijesti ili poruke koje traže pažnju. Dok se sve posloži, ključno je ostati gibak.',
  'pentacles-03': 'Trojka pentakla slavi vještinu, suradnju i kvalitetan rad prepoznat od drugih. Nosi majstorstvo, ugled i zajednički trud koji gradi nešto trajno. Ono što stvarate zajedno vrijedi više od zbroja.',
  'pentacles-04': 'Četvorka pentakla čvrsto drži stečeno, tražeći sigurnost kroz kontrolu i štednju. Nosi stabilnost, ali i podsjetnik da pretjerano stiskanje zna zakočiti rast. Sigurnost je dobra dok ne postane strah od dijeljenja.',
  'pentacles-05': 'Petica pentakla govori o oskudici, brigama ili osjećaju izostavljenosti. No podrška je bliže nego što se u hladnoći čini — vrijedi je potražiti. Ova teškoća je prolazna, ne konačna.',
  'pentacles-06': 'Šestica pentakla nosi velikodušnost, dijeljenje i pravednu razmjenu. Bilo da daješ ili primaš, ravnoteža u davanju ovdje je ključna. Sadašnji trenutak nosi obilje koje se vraća.',
  'pentacles-07': 'Sedmica pentakla poziva na strpljivu procjenu uloženog truda prije nego nastaviš. Nosi trenutak zastajanja i razmišljanja, ne odustajanja. Ono što si posijala treba još malo vremena da sazre.',
  'pentacles-08': 'Osmica pentakla slika predanost usavršavanju vještine kroz strpljiv, marljiv rad. Nosi majstorstvo koje dolazi iz ponavljanja i pažnje na detalje. Ustrajnost sada gradi stručnost sutra.',
  'pentacles-09': 'Devetka pentakla uživa u plodovima samostalno izgrađenog uspjeha i udobnosti. Nosi neovisnost, sigurnost i zasluženo zadovoljstvo. Ovo je trenutak da uživaš u onome što si sama postigla.',
  'pentacles-10': 'Desetka pentakla predstavlja trajno blagostanje, obiteljsko nasljeđe i dugoročnu sigurnost. Nosi obilje koje nadživljuje pojedinca i temelj koji ostaje. Ono što se gradi sada, traje generacijama.',
  'pentacles-page': 'Paž pentakla marljivo uči i planira nove prilike, s obje noge čvrsto na zemlji. Nosi vijest, priliku ili ideju vrijednu ozbiljnog razmatranja. Predanost učenju sada se isplati kasnije.',
  'pentacles-knight': 'Vitez pentakla napreduje polako, ali postojano, oslonjen na pouzdanost i rutinu. Nosi ustrajnost, odgovornost i temeljit pristup. Njegova sporost nije zastoj, nego sigurnost.',
  'pentacles-queen': 'Kraljica pentakla njeguje udobnost, obilje i praktičnu brigu o sebi i drugima. Spaja toplinu doma s poslovnom sposobnošću i velikodušnošću. U njezinoj blizini stvari cvjetaju i napreduju.',
  'pentacles-king': 'Kralj pentakla utjelovljuje stabilnost, materijalni uspjeh i pouzdano vodstvo izgrađeno kroz godine truda. Nosi sigurnost, izobilje i sposobnost da se brine za druge. Ono što gradi, gradi da traje.'
};

window.TAROT_CARD_MEANINGS = TAROT_CARD_MEANINGS;
