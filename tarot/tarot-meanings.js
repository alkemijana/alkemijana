/* ============================================================
   Virtualni tarot — kratka značenja karata (SAMO za "kartu dana" na
   početnoj stranici, tumačenje pomoću RWS špila). Interaktivni stol
   ostaje namjerno bez tumačenja — ovo je izolirana iznimka za teaser
   karticu na početnoj (v. CLAUDE.md).
   ============================================================ */

const TAROT_CARD_MEANINGS = {
  // ---- Velika arkana ----
  'fool': 'Luda nosi energiju novog početka — skok u nepoznato, bez tereta prošlih iskustava. Poziva na spontanost, znatiželju i povjerenje da će se put otvoriti dok hodaš. Podsjeća da je ponekad najhrabrije krenuti bez potpunog plana.',
  'magician': 'Mag simbolizira volju pretvorenu u djelo — sve alate koje trebaš već imaš pri ruci. Ova karta govori o fokusu, vještini i sposobnosti da zamisao postane stvarnost. Trenutak je za preuzimanje inicijative.',
  'high-priestess': 'Velika svećenica čuva prag između svjesnog i podsvjesnog. Poziva na tišinu, strpljenje i slušanje unutarnjeg glasa prije nego što se nešto izgovori naglas. Odgovori koje tražiš već su negdje u tebi.',
  'empress': 'Carica donosi obilje, plodnost i toplinu prirode koja se ne žuri. Govori o njegovanju — sebe, ideje ili odnosa — i o zadovoljstvu u osjetilnom, stvaralačkom životu. Rast dolazi kad dopustiš stvarima da sazriju.',
  'emperor': 'Car predstavlja strukturu, red i stabilnu vlast nad vlastitim životom. Ova karta traži jasne granice, disciplinu i odgovornost — temelje na kojima se gradi sigurnost. Vodstvo dolazi iz čvrstine, ne iz strogosti radi strogosti.',
  'hierophant': 'Svećenik nosi tradiciju, zajedničke vrijednosti i učenje kroz provjerene puteve. Podsjeća na važnost mentorstva, institucija ili duhovne prakse koja daje okvir. Ponekad je mudrije osloniti se na ono što je već isprobano.',
  'lovers': 'Ljubavnici govore o izboru koji dolazi iz srca — spoju vrijednosti, privlačnosti i iskrenog usklađivanja. Karta podsjeća da prava povezanost traži ranjivost i zajedničku odluku. Pred tobom je raskrižje koje vrijedi promisliti.',
  'chariot': 'Kočija je pobjeda voljom — sposobnost da usmjeriš suprotstavljene sile u istom smjeru i krećeš naprijed. Traži samopouzdanje, fokus i odlučnost usred izazova. Kontrola nad sobom donosi kontrolu nad situacijom.',
  'strength': 'Snaga ne dolazi iz sile nego iz strpljenja, suosjećanja i mirnog pripitomljavanja vlastitih nagona. Ova karta govori o hrabrosti koja se ne dokazuje glasno. Nježnost je ovdje najveća moć.',
  'hermit': 'Pustinjak povlači se od buke svijeta u potrazi za unutarnjim svjetlom. Poziva na introspekciju, samoću koja liječi i mudrost stečenu vlastitim iskustvom. Odgovor se ne nalazi vani, nego u tišini.',
  'wheel-of-fortune': 'Kotač sreće podsjeća da je promjena jedina stalnost — uspon i pad dio su istog kruga. Karta govori o sudbini, ciklusima i trenutku kad se stvari okreću u novom smjeru. Prihvaćanje toka donosi mir.',
  'justice': 'Pravda traži jasnoću, poštenje i preuzimanje odgovornosti za vlastite postupke. Ova karta govori o ravnoteži uzroka i posljedice — što posiješ, to i žanješ. Istina uvijek na kraju izlazi na vidjelo.',
  'hanged-man': 'Obješeni čovjek nudi pogled iz sasvim drugog kuta — predaju umjesto borbe. Karta govori o pauzi, žrtvi koja ima smisao i uvidu koji dolazi kad prestaneš gurati. Ponekad je najproduktivnije ne raditi ništa.',
  'death': 'Smrt najavljuje kraj jednog poglavlja da bi moglo početi sljedeće. Ne radi se o doslovnom kraju nego o transformaciji — ono što je odslužilo svoju svrhu sada odlazi. Iz rastanka raste prostor za novo.',
  'temperance': 'Umjerenost miješa suprotnosti u skladnu cjelinu — strpljenje, prilagodbu i postupan napredak. Karta poziva na ravnotežu umjesto krajnosti i na povjerenje u proces. Ispravna mjera donosi mir.',
  'devil': 'Vrag pokazuje lance koje često sami stvaramo — ovisnosti, strahove ili obrasce koji nas drže zarobljenima. Podsjeća da je izlaz uvijek moguć čim prepoznaš iluziju kontrole koju ti drugi (ili navika) imaju nad tobom. Sloboda počinje svjesnošću.',
  'tower': 'Kula je nagla, ponekad bolna promjena koja ruši ono što je bilo izgrađeno na krivim temeljima. Iako potresno, ovo rušenje čisti prostor za nešto istinitije i stabilnije. Poslije oluje dolazi jasnoća.',
  'star': 'Zvijezda donosi nadu, iscjeljenje i tihu vjeru nakon teškog razdoblja. Karta govori o obnovi, nadahnuću i povjerenju da su bolji dani na putu. Dovoljno je pratiti svjetlo koje već osjećaš.',
  'moon': 'Mjesec vodi kroz maglu neizvjesnosti, snova i onoga što nije posve jasno. Podsjeća da strahovi i iluzije mogu izgledati veći nego što jesu, i poziva na oslanjanje na intuiciju dok se put ne razjasni. Ne treba žuriti kroz nepoznato.',
  'sun': 'Sunce je radost, vitalnost i jasnoća bez skrivenih namjera. Karta najavljuje uspjeh, toplinu i osjećaj da je sve, makar nakratko, na svom mjestu. Dopusti si da se raduješ bez zadrške.',
  'judgement': 'Sud poziva na buđenje — pogled unatrag koji donosi razumijevanje i poziv da kreneš prema autentičnijoj verziji sebe. Karta govori o oprostu, obnovi i odgovoru na unutarnji poziv. Vrijeme je za novo poglavlje utemeljeno na naučenim lekcijama.',
  'world': 'Svijet obilježava završetak ciklusa — cilj je postignut, krug se zatvorio. Karta govori o ispunjenju, cjelovitosti i osjećaju da su svi dijelovi konačno posloženi. Slavi ono što je dovršeno prije nego kreneš u novo.',

  // ---- Štapovi (vatra — akcija, strast, ambicija) ----
  'wands-ace': 'As štapova iskra je nove strasti ili ideje spremne da krene u pokret. Osjeti taj nagli nalet inspiracije i entuzijazma — sada je trenutak da djeluješ dok je zamah svjež.',
  'wands-02': 'Dvojka štapova stoji na pragu odluke — plan je postavljen, ostaje odabrati smjer i krenuti u širi svijet. Podsjeća da vizija bez koraka naprijed ostaje samo zamisao.',
  'wands-03': 'Trojka štapova gleda prema obzoru dok se prvi rezultati truda počinju nazirati. Vrijeme je za strpljivo širenje, suradnju i predviđanje sljedećih koraka.',
  'wands-04': 'Četvorka štapova slavi proslavu, zajedništvo i osjećaj doma nakon uloženog truda. Ova karta donosi stabilnost i radost dijeljenu s drugima.',
  'wands-05': 'Petica štapova donosi trvenje, natjecanje i sukobljene interese koji traže glasan dogovor. Iz te napetosti, ako se vodi pošteno, može izrasti snažnije rješenje.',
  'wands-06': 'Šestica štapova javlja pobjedu i priznanje za uloženi trud. Vrijeme je da primiš zasluženu pohvalu i povjerenje koje ti drugi ukazuju.',
  'wands-07': 'Sedmica štapova traži da braniš svoj stav i prostor usred izazova ili konkurencije. Odlučnost i uvjerenje u vlastitu poziciju nose te dalje.',
  'wands-08': 'Osmica štapova je nagli ubrzani napredak — stvari se pokreću brzo nakon razdoblja čekanja. Prati zamah, komunikacija i vijesti stižu bez odgode.',
  'wands-09': 'Devetka štapova pokazuje umor od prijeđenog puta, ali i otpornost sabranu iz iskustva. Ostani na oprezu, cilj je blizu i vrijedan posljednjeg napora.',
  'wands-10': 'Desetka štapova nosi težinu preuzetih obaveza — uspjeh je stigao, ali s njim i teret odgovornosti. Vrijeme je razmotriti što je stvarno potrebno nositi dalje.',
  'wands-page': 'Paž štapova nosi svježu, znatiželjnu energiju istraživača spremnog na nove poduhvate. Najava je ideje ili poruke koja budi entuzijazam.',
  'wands-knight': 'Vitez štapova jurca naprijed hrabro i impulzivno, gladan akcije i pustolovine. Podsjeća da strast treba i malo smjera da ne izgori prebrzo.',
  'wands-queen': 'Kraljica štapova zrači samopouzdanjem, toplinom i neovisnošću koja privlači druge. Vodi srcem i djelom istovremeno, sigurna u svoju snagu.',
  'wands-king': 'Kralj štapova vodi vizijom, hrabrošću i prirodnim autoritetom poduzetnika. Inspirira druge svojim primjerom i sposobnošću da pretvori ideju u pokret.',

  // ---- Pehari (voda — emocije, odnosi, intuicija) ----
  'cups-ace': 'As pehara prelijeva se novom emocijom — ljubavlju, suosjećanjem ili duhovnim otvaranjem srca. Ovo je poziv da dopustiš osjećajima da teku slobodno.',
  'cups-02': 'Dvojka pehara slavi povezanost, uzajamnost i sklad u odnosu koji se gradi na iskrenosti. Dvije strane susreću se kao ravnopravni partneri.',
  'cups-03': 'Trojka pehara slavi prijateljstvo, zajedništvo i radost dijeljenu s onima koji te podržavaju. Vrijeme je za proslavu i zahvalnost na zajednici oko sebe.',
  'cups-04': 'Četvorka pehara pokazuje apatiju ili nezadovoljstvo usred obilja koje se ne primjećuje. Podsjeća da vrijedi podignuti pogled prema novoj prilici koja čeka.',
  'cups-05': 'Petica pehara oplakuje gubitak, ali podsjeća da dva pehara još stoje uspravno. Iza tuge postoji nešto vrijedno spašavanja, čim se okreneš od onoga što je prosuto.',
  'cups-06': 'Šestica pehara vraća toplinu djetinjstva, nostalgiju i iskrenu dobrotu bez skrivenih namjera. Prošlost donosi utjehu ili susret koji liječi.',
  'cups-07': 'Sedmica pehara nudi mnoštvo mogućnosti obavijenih maglom iluzije. Podsjeća da je potrebna jasnoća prije nego što odabereš pravi put među snovima.',
  'cups-08': 'Osmica pehara okreće leđa onome što više ne ispunjava, u potrazi za dubljim smislom. Hrabar je to korak — napustiti udobno radi autentičnog.',
  'cups-09': 'Devetka pehara nosi zadovoljstvo i osjećaj ispunjenja — želje se ostvaruju. Vrijeme je uživati u onome što si sebi izgradio.',
  'cups-10': 'Desetka pehara slika sklad, obiteljsku sreću i emocionalno ispunjenje koje nadilazi pojedinca. Ovo je karta trajnog zadovoljstva dijeljenog s voljenima.',
  'cups-page': 'Paž pehara donosi nježnu, maštovitu poruku ili nova emocionalna otkrića. Podsjeća na otvorenost srca i povjerenje u intuiciju.',
  'cups-knight': 'Vitez pehara jaše vođen romantikom, idealima i pozivom srca. Nosi ponudu, poziv ili gestu koja dolazi iz iskrenih osjećaja.',
  'cups-queen': 'Kraljica pehara njeguje duboku empatiju i emocionalnu mudrost. Vodi osjećajima, ali s mirnoćom koja druge umiruje i razumije.',
  'cups-king': 'Kralj pehara vlada emocijama s zrelošću i stabilnošću — suosjećajan, ali pribran. Primjer je kako ostati topao i uravnotežen usred oluje.',

  // ---- Mačevi (zrak — um, istina, izazovi) ----
  'swords-ace': 'As mačeva sječe kroz konfuziju do jasne istine ili nove ideje. Trenutak je mentalne bistrine i odlučnosti da se stvari nazovu pravim imenom.',
  'swords-02': 'Dvojka mačeva pokazuje unutarnji sukob i odgađanje odluke dok se izbjegava suočavanje s istinom. Vrijeme je skinuti povez s očiju i odabrati.',
  'swords-03': 'Trojka mačeva nosi bol istine, razočaranja ili rastanka. Iako oštra, ta jasnoća otvara put iskrenijem, zdravijem odnosu prema sebi.',
  'swords-04': 'Četvorka mačeva traži predah — oporavak, tišinu i mentalni odmor prije sljedeće bitke. Zaustavljanje sada nije slabost nego priprema.',
  'swords-05': 'Petica mačeva upozorava na pobjedu koja gorko okusi — sukob u kojem svi gube nešto. Vrijedi promisliti je li borba uopće vrijedna nastavka.',
  'swords-06': 'Šestica mačeva vodi prema mirnijim vodama, ostavljajući teškoće iza sebe. Prijelaz je u tijeku, čak i ako je još uvijek pomalo neizvjestan.',
  'swords-07': 'Sedmica mačeva govori o strategiji, ponekad i prikrivanju — potrebi da djeluješ diskretno ili preispitaš vlastitu iskrenost prema drugima. Pripazi na prečace koji mogu koštati povjerenja.',
  'swords-08': 'Osmica mačeva prikazuje osjećaj zarobljenosti koji je često samonametnut. Izlaz postoji čim prestaneš vjerovati da ga nema.',
  'swords-09': 'Devetka mačeva nosi tjeskobu, noćne brige i misli koje se vrte u krug. Podsjeća da su strahovi često veći u glavi nego u stvarnosti.',
  'swords-10': 'Desetka mačeva označava bolan, ali definitivan kraj — dno s kojeg vodi samo put prema gore. Ono najgore je prošlo; oporavak slijedi.',
  'swords-page': 'Paž mačeva budan je, znatiželjan promatrač spreman učiti i postavljati pitanja. Najavljuje vijest ili potrebu za oštrim, jasnim razmišljanjem.',
  'swords-knight': 'Vitez mačeva juri odlučno prema cilju, ponekad prebrzo i bez razmišljanja o posljedicama. Nosi energiju hitrog djelovanja i izravne komunikacije.',
  'swords-queen': 'Kraljica mačeva vidi jasno kroz iluzije, vodi razumom i iskrenošću bez suvišnih riječi. Njezina snaga leži u nezavisnosti i britkoj istini.',
  'swords-king': 'Kralj mačeva vlada logikom, autoritetom i nepristranom prosudbom. Odluke donosi hladne glave, na temelju činjenica, ne emocija.',

  // ---- Pentakli (zemlja — materijalno, rad, tijelo) ----
  'pentacles-ace': 'As pentakla donosi novu priliku u poslu, financijama ili opipljivom svijetu. Sjeme je posađeno — uz njegu, iz njega može izrasti stabilan uspjeh.',
  'pentacles-02': 'Dvojka pentakla žonglira s više obaveza, tražeći ravnotežu usred promjenjivih okolnosti. Prilagodljivost je ključna dok se sve posloži.',
  'pentacles-03': 'Trojka pentakla slavi vještinu, suradnju i kvalitetan rad prepoznat od drugih. Zajednički trud gradi nešto trajno.',
  'pentacles-04': 'Četvorka pentakla čvrsto drži stečeno, tražeći sigurnost kroz kontrolu. Podsjeća da pretjerano stiskanje ponekad koči rast koji bi obilje moglo donijeti.',
  'pentacles-05': 'Petica pentakla govori o financijskoj ili osobnoj oskudici i osjećaju izostavljenosti. Podrška je bliže nego što se čini — vrijedi je potražiti.',
  'pentacles-06': 'Šestica pentakla nosi velikodušnost, dijeljenje i pravednu razmjenu resursa. Bilo da daješ ili primaš, ravnoteža u odnosu je ovdje ključna.',
  'pentacles-07': 'Sedmica pentakla poziva na strpljivu procjenu uloženog truda prije nego što nastaviš dalje. Vrijeme je za trenutak razmišljanja, ne za odustajanje.',
  'pentacles-08': 'Osmica pentakla slika predanost usavršavanju vještine kroz strpljiv, marljiv rad. Kvaliteta dolazi iz ponavljanja i pažnje na detalje.',
  'pentacles-09': 'Devetka pentakla uživa u plodovima samostalno izgrađenog uspjeha i udobnosti. Ovo je karta nezavisnosti stečene vlastitim trudom.',
  'pentacles-10': 'Desetka pentakla predstavlja trajno bogatstvo, obiteljsko nasljeđe i dugoročnu sigurnost. Ono što se gradi sada, nadživljuje pojedinca.',
  'pentacles-page': 'Paž pentakla marljivo uči i planira nove prilike za rast, s obje noge čvrsto na zemlji. Najavljuje priliku vrijednu ozbiljnog razmatranja.',
  'pentacles-knight': 'Vitez pentakla napreduje polako, ali postojano, s naglaskom na pouzdanost i rutinu. Strpljenje i doslednost donose rezultate.',
  'pentacles-queen': 'Kraljica pentakla njeguje udobnost, obilje i praktičnu brigu o sebi i drugima. Spaja toplinu doma s poslovnom sposobnošću.',
  'pentacles-king': 'Kralj pentakla utjelovljuje stabilnost, materijalni uspjeh i pouzdano vodstvo izgrađeno kroz godine truda. Sigurnost koju nudi osjeti se u svakom detalju.'
};

window.TAROT_CARD_MEANINGS = TAROT_CARD_MEANINGS;
