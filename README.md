# Elementor-workflow tools

Twee scripts die samen de kern van de workflow vormen: eerst exact vastleggen
wat er in het goedgekeurde ontwerp staat, en daarna controleren of Elementor
dat ook echt heeft overgenomen.

- **`extract-spec.js`** — leest de goedgekeurde HTML uit en zet 'm om naar
  `spec.json`: per `data-cmp`-element de exacte tekst, het waarschijnlijke
  type (titel, tekst, knop, afbeelding, container), de plek in de boom
  (ouder/kinderen, in volgorde) en alle opmaakwaarden. Dit is de bron waaruit
  gebouwd wordt, in plaats van dat er per element opnieuw gegokt wordt.
- **`compare.js`** — vergelijkt na het bouwen de HTML met de gebouwde
  Elementor-pagina, element voor element, op meerdere schermbreedtes. Geeft
  een tabel met afwijkingen en stopt met een foutcode zolang er iets niet
  klopt, zodat Claude niet zelf kan beoordelen of iets "goed genoeg" is.

Beide zijn getest op een voorbeeldpagina (zie `test/`). `extract-spec.js` haalt
daar correct tekst, type, volgorde, gap/padding/margin en kleuren uit.
`compare.js` detecteert daar zowel een opzettelijke fontgrootte-fout (36px in
plaats van 40px) als de positieverschuiving die daardoor verderop ontstaat.

## Installeren

```
npm install
```

Als Playwright geen eigen Chromium kan downloaden (bijvoorbeeld door een
firewall), installeer je 'm los met:

```
npx playwright install chromium
```

## `spec.json` maken

```
node extract-spec.js jouw-ontwerp.html
```

Dit schrijft `jouw-ontwerp.spec.json` naast de HTML (of geef zelf een tweede
pad mee als output). De output bevat per `data-cmp`-element onder andere:

- `role`: een eerste inschatting van het type (titel, tekst, knop, afbeelding,
  container), af te leiden bijstellen waar nodig.
- `text`, en bij een link/afbeelding ook `href` / `src` / `alt`.
- `parent` en `children`: de boomstructuur, in document-volgorde.
- `geometry`: positie en afmeting.
- `typography`, `box`, `layout`, `background`: alle opmaakwaarden die nodig
  zijn om het element en zijn ruimte-instellingen (padding/margin/gap) exact
  na te bouwen.

Dit bestand is de invoer voor het bouwen in Elementor: elke waarde die erin
staat, wordt overgenomen, niet opnieuw beoordeeld.

## Voorbereiden per pagina

1. Zorg dat de HTML-pagina die je wilt naspiegelen `data-cmp="naam"` attributen
   heeft op de elementen die je wilt controleren.
2. Zorg dat de bijbehorende Elementor-elementen dezelfde naam hebben als
   CSS class, met het voorvoegsel `cmp-`. Bijvoorbeeld: `data-cmp="hero-titel"`
   in de HTML wordt `cmp-hero-titel` in Elementor (Advanced-tab, CSS Classes).
3. Kopieer `config.example.json` naar een eigen configbestand, bijvoorbeeld
   `configs/hero-sectie.json`, en vul in:
   - `htmlPath`: pad naar de goedgekeurde HTML op je eigen machine.
   - `pageUrl`: de URL van de gebouwde Elementor-pagina op staging.
   - `tolerancePx`: hoeveel pixels afwijking je toestaat (standaard 1).
   - `breakpoints`: op welke schermbreedtes gemeten wordt.
   - `properties`: welke CSS-eigenschappen gecontroleerd worden.

## Draaien

```
node compare.js configs/hero-sectie.json
```

- Exit code `0`: alles binnen de tolerantie. Claude mag pas nu zeggen dat de
  sectie klaar is, en moet de tabel laten zien.
- Exit code `1`: er zijn afwijkingen, of het script kon niet draaien (bijv. de
  staging-URL was niet bereikbaar). De tabel laat zien wat er niet klopt.

Een volledig rapport (ook de geslaagde metingen) komt als JSON terecht op het
pad uit `reportPath`.

## Responsief-check (`--responsive`)

```
node compare.js configs/hero-sectie.json --responsive
```

Dit vergelijkt niets met de HTML — het controleert alleen de al gebouwde
Elementor-pagina (`pageUrl`) op een paar breedtes tussenin de geconfigureerde
breakpoints (het midden van elk paar), op grove fouten: horizontale overflow
van de hele pagina, of een `cmp-`element dat breder is dan zijn eigen doos of
buiten het scherm uitsteekt. De gewone run hierboven test namelijk alleen
exact de geconfigureerde breakpoints — een pagina die op precies die
breedtes goed staat maar met vaste in plaats van relatieve/boxed breedtes is
gebouwd, kan daar toch doorheen glippen. Dit is de check die dat alsnog
vangt (zie ook `CLAUDE.md` stap 5b en 7).

- Exit code `0`: geen problemen op de tussenliggende breedtes.
- Exit code `1`: er is ergens een vaste breedte gebruikt waar een
  relatieve/boxed opzet hoorde. Los dit op in de container/widget-opbouw,
  niet door de tussenliggende breedte ook nog vast in te stellen.

## Wat het wel en niet vangt

- **Wel:** verschillen in positie, afmeting, fontgrootte, lettergewicht,
  kleur, padding, margin, en wat je verder aan `properties` toevoegt.
- **Wel:** een element dat in Elementor helemaal ontbreekt (status `ONTBREEKT`)
  of een `cmp-`element dat niet in de HTML terug te vinden is (`ONBEKEND`).
- **Wel, met `--responsive`:** grove niet-responsieve fouten tussen de
  geconfigureerde breakpoints in (horizontale overflow, vaste breedtes).
- **Niet:** of het ontwerp zelf mooi is. Dat blijft jouw beoordeling bij het
  goedkeuren van de HTML-versie, dit script controleert alleen of Elementor
  die goedgekeurde versie ook echt volgt.
- **Niet:** of een waarde via een native Elementor-instelling of via custom
  CSS tot stand kwam — dat is een aparte, verplichte handmatige controle
  (zie `CLAUDE.md` stap 5a).
- **Niet (nog):** een visuele diff-afbeelding. Dat is een goede volgende stap,
  maar staat los van deze cijfermatige controle.

## Waarom deze aanpak

- Positie en stijl worden gemeten met de browser zelf (`getBoundingClientRect`
  en `getComputedStyle`), niet geschat. Elke waarde is dus de waarde die de
  bezoeker ook echt te zien krijgt.
- Fonts en afbeeldingen krijgen de tijd om te laden, en animaties staan uit
  tijdens het meten, zodat je nooit een tussentijdse staat vergelijkt.
- Koppeling via een gedeelde naam (`data-cmp` / `cmp-`) werkt ongeacht hoeveel
  extra lagen Elementor om een element heen bouwt.
