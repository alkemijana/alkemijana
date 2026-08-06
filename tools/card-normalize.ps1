# Poravnavanje i izrezivanje skenova tarot karata (dev alat, nije dio stranice).
#
# Skenovi s Wikimedije nisu jednako kadrirani: svaki je malo drugacije zakrenut
# i drugacije odrezan, pa se uz rub vidi bijela pozadina, a karte su na stolu
# razlicito velike. Ovaj alat svakoj karti nadje otisnutu crnu liniju okvira,
# ispravi nagib, izreze jednak okvir + jednaku kremastu marginu i spremi sve
# na istu velicinu (omjer 0.583, kao prava karta).
#
# Pokretanje (iz korijena projekta):
#   powershell -ExecutionPolicy Bypass -File tools/card-normalize.ps1 -Deck rws
#   powershell -ExecutionPolicy Bypass -File tools/card-normalize.ps1 -Deck rws -Apply
#
# VAZNO: pokretati uvijek nad IZVORNIM skenovima. Alat reze prema okviru, pa
# bi drugo pokretanje nad vec obradjenim slikama odrezalo jos jedan krug
# margine. Ako treba ponoviti: git checkout -- tarot/assets/decks/<deck>
#
# Bez -Apply rezultat ide u tools/_cards_<deck>/ da se moze pregledati.
# S -Apply se prepisuju izvorne slike u tarot/assets/decks/<deck>/.
# PAZI: nakon -Apply povecaj TAROT_IMG_VERSION u tarot/tarot-data.js, inace
# preglednik i Cloudflare i dalje serviraju staru sliku (ime datoteke je isto).
# Vracanje na staro: git checkout -- tarot/assets/decks/<deck>

param(
  [string]$Deck  = 'rws',
  [switch]$Apply,
  [int]$OutWidth = 500,
  [double]$Ratio = 0.583,
  [double]$Margin = 0.024   # kremasta margina oko okvira, u dijelu sirine okvira
)

$root = Split-Path -Parent $PSScriptRoot
$src  = Join-Path $root "tarot\assets\decks\$Deck"
$tmp  = Join-Path $root "tools\_cards_$Deck"

if (-not (Test-Path $src)) { throw "Nema spila: $src" }

Add-Type -Path (Join-Path $PSScriptRoot 'card-normalize.cs') -ReferencedAssemblies System.Drawing, System.Linq -ErrorAction Stop

New-Item -ItemType Directory -Force $tmp | Out-Null
Get-ChildItem $tmp -Filter *.jpg | Remove-Item -Force

[CardFix]::ProcessDeck($src, $tmp, $OutWidth, $Ratio, $Margin)

$made = Get-ChildItem $tmp -Filter *.jpg
$have = Get-ChildItem $src -Filter *.jpg
if ($made.Count -ne $have.Count) { throw "Obradjeno $($made.Count) od $($have.Count) - ne prepisujem." }

if ($Apply) {
  Copy-Item "$tmp\*.jpg" $src -Force
  "PREPISANO: $($made.Count) karata u $src  (povecaj TAROT_IMG_VERSION!)"
} else {
  "Rezultat je u $tmp  ($($made.Count) karata). Pokreni ponovo s -Apply da se prepise."
}
