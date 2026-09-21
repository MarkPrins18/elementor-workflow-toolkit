# Elementor-workflow tools

Zes scripts die samen de workflow uit `CLAUDE.md` afdwingen: eerst
vaststellen of een ontwerp überhaupt native te bouwen is, dan exact
vastleggen wat erin staat, en daarna controleren of Elementor dat ook echt
heeft overgenomen — op drie assen: ziet het er hetzelfde uit, is het native
gebouwd, en leest het nog hetzelfde.

| Script | Stap | Wat het doet |
|---|---|---|
| `check-bouwbaar.js` | 1 | Meldt vóór de goedkeuring wat Elementor niet met eigen widgets kan maken: pseudo-elementen, gestapelde gradients, `transform`, inhoud die door JavaScript wordt opgebouwd. |
| `extract-spec.js` | 2 | Zet de goedgekeurde HTML om naar `spec.json`: per `data-cmp`-element de tekst, het type, de boomstructuur en alle opmaakwaarden — per breakpoint. |
| `compare.js` | 7 | Vergelijkt de HTML met de gebouwde Elementor-pagina, element voor element, op meerdere schermbreedtes. Stopt met een foutcode zolang er iets niet klopt. |
| `check-native.js` | 5a | Leest de opgeslagen Elementor-data en meldt custom CSS, `!important` en HTML-widgets. |
| `check-semantiek.js` | 5c | Vergelijkt HTML-tags, koppenniveaus, landmarks, links en alt-teksten. Vangt wat er pixel-identiek uitziet maar anders leest. |
| `screenshot-diff.js` | 8.1 | Legt de hele pagina naast elkaar als afbeelding, met het verschil in rood. |

Alles staat of valt bij `npm test`: dat draait alle zes tegen de vaste
voorbeelden in `test/` en controleert of ze slagen én falen wanneer dat
hoort. Zonder die test kan een verruiming in een van deze scripts ongemerkt
de hele workflow zachter maken.

## Installeren

```
npm install
npm test
```

Als Playwright geen eigen Chromium kan downloaden (bijvoorbeeld door een
firewall), installeer je 'm los met `npx playwright install chromium`, of
wijs je een bestaande browser aan met de omgevingsvariabele
`PW_CHROMIUM_PATH`.

## `spec.json` maken

```
node extract-spec.js jouw-ontwerp.html --breedtes=1440,1024,767,390
```

Dit schrijft één spec per breedte (`jouw-ontwerp.1440.spec.json`, etc.)
naast de HTML, of in de map uit `--out-dir=`. Zonder `--breedtes` wordt er
op 1440px gemeten en heet de output `jouw-ontwerp.spec.json`.

**Meet altijd op alle breakpoints.** Een spec die alleen op desktop bestaat,
geeft voor tablet en mobiel geen enkele waarde om over te nemen — daar wordt
dan dus geschat.

De output bevat per `data-cmp`-element onder andere:

- `role`: het type (`titel`, `tekst`, `link`, `knop`, `afbeelding`,
  `container`). Het verschil tussen `link` en `knop` wordt bepaald aan de
  opmaak: een `<a>` zonder eigen achtergrond, rand of horizontale padding is
  een tekstlink en hoort dus geen Button-widget te worden.
- `text`, en bij een link/afbeelding ook `href` / `src` / `alt`.
- `parent` en `children`: de boomstructuur, in document-volgorde.
- `geometry`: positie en afmeting.
- `typography`, `box`, `layout`, `background`, `effects`: alle opmaakwaarden
  die nodig zijn om het element na te bouwen, inclusief `maxWidth`,
  `aspectRatio`, `flexWrap`, randen per zijde, `backgroundImage`,
  `boxShadow` en `transform`.

Het script stopt met exit code 1 bij een dubbele `data-cmp`-naam, en
waarschuwt over elementen met eigen opmaak die geen eigen naam hebben — die
worden later namelijk door niets gecontroleerd.

## Voorbereiden per pagina

1. Zorg dat de HTML `data-cmp="naam"` heeft op elk element dat je wilt
   controleren.
2. Zorg dat de bijbehorende Elementor-elementen dezelfde naam als CSS class
   hebben, met het voorvoegsel `cmp-`. `data-cmp="hero-titel"` wordt dus
   `cmp-hero-titel` (Advanced-tab → CSS Classes).
3. Kopieer `config.example.json` naar `configs/<root>.json` en vul in:
   - `htmlPath`: repo-relatief pad naar de goedgekeurde HTML.
   - `pageUrl`: de URL van de gebouwde Elementor-pagina op staging.
   - `roots`: welke root uit `spec.json` deze config controleert.
   - `tolerancePx` / `tolerances`: hoeveel afwijking je toestaat.
   - `breakpoints`: op welke schermbreedtes gemeten wordt.
   - `properties`: welke CSS-eigenschappen gecontroleerd worden.

## Draaien

```
node compare.js configs/hero.json
```

- Exit code `0`: alles binnen de tolerantie. Pas nu mag een sectie "klaar"
  heten, en hoort de tabel erbij getoond te worden.
- Exit code `1`: er zijn afwijkingen, óf de controle was ongeldig.
- Exit code `2`: het script kón niet draaien (staging onbereikbaar,
  ontwerpbestand weg, browser start niet). Dit is geen meetuitkomst.

### Wanneer een run ongeldig is in plaats van geslaagd

Een run die niets gemeten heeft, is geen geslaagde run. `compare.js` meldt
daarom `ONGELDIG` (exit 1) bij:

- een `roots`-naam die niet in het ontwerp voorkomt — een typefout leverde
  vroeger gewoon "GESLAAGD" op, met nul gemeten elementen;
- nul vergeleken elementen, om welke reden dan ook;
- een dubbele naam, in het ontwerp of in Elementor.

Bij elk breakpoint staat in de uitvoer hoeveel elementen er daadwerkelijk
vergeleken zijn. Klopt dat aantal niet met wat je gebouwd hebt, dan zit de
fout in de config.

### Tolerantie

`tolerancePx` is de algemene waarde. `tolerances` verfijnt dat:

```json
"tolerancePx": 1,
"tolerances": { "geometry": 20 },
"_toleranceNote": "20px op geometrie omdat de bron een transform:rotate(1.6deg) gebruikt die Elementor niet live toepast."
```

Typografie staat standaard op 0,5px en kleur op exact, en die worden **niet**
meegesleept door een ruimere `geometry`-waarde. Dat onderscheid bestaat om
een concrete reden: met één globale tolerantie van 20px passeerde een kop
van 40px die als 24px gebouwd was. Het script toont je `_toleranceNote` bij
elke run en waarschuwt als je iets verruimt zonder onderbouwing.

## Responsief-check (`--responsive`)

```
node compare.js configs/hero.json --responsive
```

Dit vergelijkt niets met de HTML — het controleert de gebouwde
Elementor-pagina op een vaste ladder tussenbreedtes (1280, 1100, 900, 800,
600 en 480px, plus de middens tussen je eigen breakpoints) op grove fouten:
horizontale overflow, een element dat buiten het scherm steekt, een
container die smaller wordt dan zijn inhoud, en twee buren die over elkaar
heen vallen.

De gewone run test namelijk alleen exact de geconfigureerde breedtes. Een
pagina die daar toevallig goed staat maar met vaste in plaats van
relatieve/boxed breedtes gebouwd is, glipt daar doorheen. Dit is de check
die dat alsnog vangt (zie `CLAUDE.md` stap 5b en 7).

De breedtes staan bewust vast in het script en worden niet uit de config
afgeleid: met één geconfigureerd breakpoint leverde de oude berekening nul
te testen breedtes op, en dus een geslaagde run die niets had gemeten. Bij
minder dan twee geconfigureerde breakpoints weigert de check nu te draaien.

## Wat het wel en niet vangt

- **Wel:** verschillen in positie, afmeting, fontgrootte, lettergewicht,
  kleur, padding, margin, randen, en wat je verder aan `properties`
  toevoegt.
- **Wel:** een element dat in Elementor ontbreekt (`ONTBREEKT`) of een
  `cmp-`element dat niet in de HTML terug te vinden is (`ONBEKEND`).
- **Wel, met `--responsive`:** grove niet-responsieve fouten tussen de
  geconfigureerde breakpoints in.
- **Wel, met `screenshot-diff.js`:** verkeerde volgorde, overlappende
  blokken, een ontbrekende achtergrond — dingen die losse metingen missen.
- **Wel, met `check-native.js`:** of een waarde via een native
  Elementor-instelling of via custom CSS tot stand kwam.
- **Niet:** of het ontwerp zelf mooi is. Dat blijft het oordeel bij het
  goedkeuren van de HTML-versie.
- **Niet:** andere toestanden van een interactieve pagina. `compare.js` meet
  de begintoestand. Bouwt JavaScript de inhoud op (tabs, filters), dan
  meldt `check-bouwbaar.js` dat vóór de goedkeuring.

## Waarom deze aanpak

- Positie en stijl worden gemeten met de browser zelf
  (`getBoundingClientRect` en `getComputedStyle`), niet geschat. Elke waarde
  is dus de waarde die de bezoeker ook echt te zien krijgt.
- Fonts en afbeeldingen krijgen de tijd om te laden, animaties staan uit
  tijdens het meten, en de pagina wordt eerst doorgescrold zodat
  lazy-loaded afbeeldingen daadwerkelijk laden.
- Koppeling via een gedeelde naam (`data-cmp` / `cmp-`) werkt ongeacht
  hoeveel extra lagen Elementor om een element heen bouwt.
- Stijl wordt gemeten op de binnenste tekstlaag van een widget, want daar
  past Elementor 'm ook toe. Zie `patterns/header-navigatie.md` voor de
  volledige toelichting.
