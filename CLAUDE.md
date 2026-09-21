# Elementor-workflow — vaste regels

Dit bestand geldt voor elk project waarin een bestaand ontwerp (PDF of HTML)
zo exact mogelijk in Elementor nagebouwd moet worden. Het doel is niet "ziet
er goed uit", maar "meetbaar identiek, binnen de afgesproken marge". Volg
onderstaande stappen en regels in deze volgorde, en sla geen stap over omdat
het al goed lijkt te gaan.

## 0. Site-profiel (eerst controleren, per project)

Voordat er iets gebouwd wordt, staat het volgende vast, of wordt het nu
vastgesteld:

- Elementor-versie: _______ (de 4.2-reeks is actueel; op dit project is
  4.2.4 bevestigd, containers actief)
- Container-modus: aan / uit (Elementor → Settings → Features)
- Breakpoints: desktop / tablet / mobiel-grenzen, standaard 1024px en 767px
  tenzij dit project ze zelf heeft aangepast
- Site-brede content-breedte: _______ (nodig voor stap 5b)
- Actief thema: _______
- Staging-URL: _______

Ga hier nooit vanuit, controleer het bij een nieuw project.

Controleer ook één keer of de toolkit zelf werkt voordat je 'm gebruikt:

```
npm install
npm test
```

`npm test` draait `compare.js`, `extract-spec.js`, `check-native.js`,
`check-bouwbaar.js` en `screenshot-diff.js` tegen de vaste voorbeelden in
`test/`, en controleert of ze slagen én falen wanneer dat hoort. Een van die
scripts is de enige reden dat een sectie "klaar" mag heten; als ze stil
zachter worden, verdwijnt die garantie zonder dat iemand het merkt.

## Mapstructuur van deze toolkit

Dit bestand hoort samen met de rest van de toolkit in `ai-workflow/` te
staan (of de root van het project, als `CLAUDE.md` daar apart naartoe is
verplaatst):

```
ai-workflow/
├── CLAUDE.md               ← dit bestand
├── extract-spec.js         ← stap 2: HTML → spec.json
├── compare.js              ← stap 7: de verplichte controle
├── check-bouwbaar.js       ← stap 1: is dit ontwerp native te bouwen?
├── check-native.js         ← stap 5a: is het native gebouwd?
├── screenshot-diff.js      ← stap 8.1: de hele pagina naast elkaar
├── config.example.json
├── lib/                    ← gedeelde browser-code voor bovenstaande scripts
├── test/                   ← vaste voorbeelden + `npm test`
├── patterns/               ← verticale-stapel.md, kaartenrij.md, etc.
├── design/                 ← het brondesign per project: de aangeleverde
│                              of door Claude gemaakte HTML (zie stap 1),
│                              en de spec.json die daaruit volgt
├── configs/                ← losse compare.js-configbestanden, één per
│                              root uit spec.json
└── reports/                ← de uitkomst per run (JSON + screenshot-diffs)
```

Verwijs in commando's dus naar `ai-workflow/design/...`,
`ai-workflow/compare.js`, `ai-workflow/extract-spec.js`, en
`ai-workflow/patterns/...`, tenzij het project een andere indeling gebruikt
(pas dit dan hier bovenaan even aan).

Het goedgekeurde ontwerp in `design/` hoort **mee de repo in**. Zonder dat
bestand is een geslaagde run niet te herhalen en dus geen bewijs meer; zie
`configs/archief/README.md` voor hoe dat in de praktijk misging.

## 1. Bron wordt goedgekeurde HTML

Het ontwerp komt uit een PDF, uit eigen HTML/CSS van Mark, of wordt door
Claude zelf gemaakt. Ongeacht de bron:

1. Zet het ontwerp om naar (of gebruik) een werkende HTML/CSS-pagina, en zet
   die in `ai-workflow/design/` (bijvoorbeeld
   `ai-workflow/design/hero-sectie.html`).
2. Voeg zelf op elk element dat je later apart wilt kunnen controleren een
   naam toe: `data-cmp="sectie-element"`, bijvoorbeeld `hero-titel`,
   `kaart-2-tekst`, `footer-logo`. Dit gebeurt altijd door Claude, ongeacht
   wie de HTML oorspronkelijk maakte.

   Geef élk element met eigen typografie een eigen naam, ook als het binnen
   een groter blok zit. Een `<span>` met een andere lettergrootte binnen een
   getagde knop wordt anders nooit gecontroleerd: `compare.js` heeft geen
   naam om op te koppelen. `extract-spec.js` waarschuwt hiervoor bij elke
   run, met een lijst van de elementen die het betreft.

3. Draai de bouwbaarheidscheck:

   ```
   node ai-workflow/check-bouwbaar.js ai-workflow/design/hero-sectie.html
   ```

   Dit meldt wat er in het ontwerp staat dat Elementor **niet** met zijn
   eigen widgets kan maken: pseudo-elementen (`::before`/`::after`),
   gestapelde CSS-gradients, `transform`, `mix-blend-mode`, en inhoud die
   door JavaScript wordt opgebouwd. Exit code 1 betekent niet "afkeuren",
   maar "beslis dit nu". Anders komt die keuze pas tijdens het bouwen boven
   water, als het akkoord al gegeven is, en staat er alleen nog de keuze
   tussen een slechter ontwerp of een overtreding van regel 5a.

4. Laat Mark deze HTML-versie beoordelen, samen met de uitkomst van stap 3.
   **Dit is het enige moment waarop een mens visueel oordeelt of het ontwerp
   goed is.** Wacht op akkoord voordat je verdergaat naar Elementor.

Nooit een sectie in Elementor bouwen op basis van een ontwerp dat nog niet
in deze vorm is goedgekeurd.

## 2. HTML wordt `spec.json`

Draai `ai-workflow/extract-spec.js` op de goedgekeurde HTML in
`ai-workflow/design/`, bijvoorbeeld:

```
node ai-workflow/extract-spec.js ai-workflow/design/hero-sectie.html \
  --breedtes=1440,1024,767,390
```

Dit levert één spec per breedte op (`hero-sectie.1440.spec.json`,
`hero-sectie.1024.spec.json`, etc.): per `data-cmp`-element het type, de
tekst, de boomstructuur en alle opmaakwaarden (zie `README.md` in deze
toolkit).

**Meet altijd op alle breakpoints uit stap 0, niet alleen op desktop.**
Zonder die metingen is er voor tablet en mobiel geen bron van waarheid, en
wordt daar dus geschat — precies wat de rest van deze workflow probeert te
voorkomen. Een grid dat op desktop drie kolommen heeft en op tablet twee,
kun je alleen goed instellen als je de tablet-meting hebt.

**Vanaf hier is er geen ruimte meer voor interpretatie.** Elke waarde die in
`spec.json` staat, wordt exact overgenomen in Elementor. Rond niets af, schat
niets in, en verzin geen "nettere" waarde. Als een waarde vreemd oogt (bv.
23px in plaats van 24px), is dat een vraag voor Mark, niet iets om zelf te
corrigeren.

Twee dingen die `extract-spec.js` bij de run meldt en die je niet mag
negeren:

- **Een dubbele `data-cmp`-naam is een fout** (exit code 1), geen
  waarschuwing. Twee elementen met dezelfde naam maken de vergelijking
  dubbelzinnig. Geef ze elk een eigen naam en draai opnieuw.
- **Elementen met eigen opmaak maar zonder eigen naam** worden opgesomd. Die
  opmaak wordt nooit gecontroleerd. Ga de lijst langs en geef ze alsnog een
  naam als het om echte opmaak gaat (zie stap 1.2).

## 3. Ruimte: gap, padding, margin

Vaste regel, dit is ook Elementor's eigen aanbevolen werkwijze:

- **Gap** voor de herhalende ruimte tussen kinderen in één container. Zet dit
  één keer op de container zelf (Layout-tab → Gap), nooit als margin op elk
  kind apart.
- **Padding** voor ruimte binnen één blok, tussen de rand en de inhoud.
- **Margin** alleen als uitzondering, voor een enkel element dat net iets
  meer afstand nodig heeft dan de rest van de gap-waarde.
- **Nooit gap en margin tegelijk** op hetzelfde element voor dezelfde
  richting. Dat telt op tot een onverwachte waarde en is de reden waarom
  Elementor zelf dit afraadt.

## 4. Kleuren en fonts: globaal waar het terugkomt

Kleuren en lettertypes die op meerdere plekken in het ontwerp voorkomen,
worden Elementor Global Colors / Global Fonts, zodat de klant ze later
centraal kan aanpassen. Een kleur of font die maar één keer voorkomt, blijft
gewoon lokaal op dat element staan. Bouw dit vóórdat je de secties zelf
opbouwt.

## 5. Structuur: gebruik het vertaalpatroon, verzin niets nieuws

In `patterns/` staat per terugkerend soort blok een vaste bouwinstructie:
welke Elementor-container, welke widgets, in welke volgorde, en welk veld
uit `spec.json` naar welke Elementor-instelling gaat. Bepaal per
`data-cmp`-container in `spec.json` welk patroon past, aan de hand van de
`role` van de kinderen en de `layout`-richting (zie de "Herkenning"-sectie
van elk patroonbestand), en volg dat patroon. Gevuld wordt altijd met de
exacte waarden uit `spec.json` van dít project, nooit met de inhoud van een
eerder project. Bouw altijd met Elementor's eigen widgets (Heading, Text
Editor, Image, Button, Container). Ruwe HTML/custom code in Elementor is
alleen een laatste redmiddel voor een detail dat écht niet anders kan, nooit
voor een hele sectie.

Beschikbare patronen nu:

| Bestand | Waarvoor |
|---|---|
| `verticale-stapel.md` | titel/tekst/knop onder elkaar (hero, cta-blok) |
| `kaartenrij.md` | een rij of grid van kaarten, elk zelf een verticale stapel |
| `sectie-kop.md` | label + titel naast elkaar, boven de sectie-inhoud |
| `genummerde-lijst.md` | herhaalde rijen van 2-3 kolommen, gescheiden door randen |
| `gedefinieerde-lijst.md` | herhaalde items van label + waarde onder elkaar |
| `header-navigatie.md` | logo + navigatie + cta in een balk bovenaan |

De `role`-waarden waarop je herkent zijn: `titel`, `tekst`, `link`, `knop`,
`afbeelding` en `container`. Let op het verschil tussen `link` en `knop`:
een `<a>` zonder eigen achtergrond, rand of horizontale padding is een
tekstlink en hoort een Heading-widget met link te worden, geen Button.

Past geen enkel patroon op deze structuur? Bouw het dan zo zorgvuldig
mogelijk, laat het controleren met stap 7, en schrijf het daarna pas als
nieuw bestand in `patterns/` voor hergebruik (status: concept, tot een
volgend project het bevestigt).

## 5a. Verboden: bypass van native Elementor-instellingen

**Alles wordt gebouwd met Elementor's eigen widgets en instellingen.
Custom CSS/code is uitsluitend voor de allerlaatste 1% — een enkel detail
dat aantoonbaar en onderbouwd niet native kan — en nooit zonder vooraf
Mark's expliciete akkoord.** Dit is geen richtlijn maar een harde eis.

Nooit gebruiken, ook niet als "tijdelijke oplossing" om `compare.js` te
laten slagen, en nooit stilzwijgend of achteraf pas gemeld:

- WordPress' "Additional CSS" (of enig ander los, globaal CSS-bestand/
  stylesheet) buiten Elementor's eigen Style/Layout-tabs om.
- `!important`, in welk CSS dan ook.
- Een HTML-widget of raw-code-widget voor structuur of styling van een
  hele sectie.

**Voordat er ook maar één regel custom CSS of code geschreven wordt:**
stop, en leg dit eerst aan Mark voor, met (1) welke native instelling niet
werkt, (2) wat al geprobeerd is om het native op te lossen (cache/CSS
regenereren, alternatieve widget, sleutelnaam-mismatch zoals hieronder),
en (3) waarom er geen andere weg is. Pas na akkoord van Mark mag het
toegepast worden, en dan alleen op dat ene element, nooit als
verzamel-bestand voor meerdere elementen of een hele sectie.

Als een native Elementor-instelling (container-gap, -padding,
`align-items`, widget-typografie, containerbreedte) niet lijkt door te
werken, is de meest waarschijnlijke oorzaak een **sleutelnaam-mismatch**
tussen de MCP-tool en Elementor's actieve control-schema voor die
Elementor-versie — niet een echte beperking van Elementor. Voorbeeld:
in Elementor 4.2.4 schrijft de EMCP Tools-MCP `gap` weg, maar de
CSS-generator van die versie leest `flex_gap` (met een verplicht
`size`-veld). De waarde stond dus wél correct in `_elementor_data`, maar
werd nooit naar CSS vertaald. Los dit op door de bekende/nieuwe sleutel
(`flex_gap` ernaast, met dezelfde waarden) mee te schrijven, niet door
naar CSS uit te wijken. Controleer dit sleutelnaam-verschil voor élke
layout-eigenschap die niet lijkt door te werken (`justify_content`,
`align_items`, breedte-instellingen, etc.), en documenteer bevestigde
mismatches hieronder zodat ze niet telkens opnieuw uitgezocht hoeven te
worden:

- `gap` → moet ook als `flex_gap` (met `size`-veld) geschreven worden op
  Elementor 4.2.4.
- `justify_content` → de echte sleutel is `flex_justify_content`
  (groepscontrole-prefix `flex_`, bevestigd in
  `includes/controls/groups/flex-container.php`, `'name' => 'flex'`).
- `align_items` → idem, echte sleutel is `flex_align_items`.
- `button_padding` (Button-widget) → de echte sleutel is `text_padding`
  (bevestigd in `includes/widgets/traits/button-trait.php`).
- Een container/widget als kind van een `flex_direction: "row"`-ouder krijgt
  standaard `flex-grow:1` (Elementor's eigen `row`-preset). Moet het op zijn
  eigen inhoud blijven (niet uitrekken), zet dan expliciet
  `_flex_size: "none"` (groepscontrole `_flex`, `includes/controls/groups/
  flex-item.php`) — dit is geen mismatch maar Elementor's eigen standaard-
  gedrag, dus geen "nieuwe sleutel ernaast" nodig, wel een bewuste
  instelling.
- Containers hebben geen eigen typografie-instelling. Bij widgets verschilt
  het per widget wáár Elementor de opmaak zet: typografie op
  `.elementor-heading-title` (Heading), op de wrapper zelf (Text Editor) of
  op `.elementor-button` (Button); padding en margin staan bij Heading en
  Text Editor op de wrapper, maar bij Button óók op `.elementor-button`.
  `.elementor-text-editor` bestaat alleen in de editor, niet op de live
  pagina — bouw daar geen selector op. Zie `patterns/header-navigatie.md`
  voor de tabel en hoe `compare.js` hiermee omgaat (niet oplosbaar via een
  sleutelnaam-fix, wel via de meetmethode).

**`compare.js` op exit code 0 is geen bewijs dat deze regel is gevolgd** —
het script meet alleen het eindresultaat, niet hoe dat tot stand kwam. Een
sectie mag daarom pas "klaar" heten als, naast een geslaagde `compare.js`-
run, ook expliciet bevestigd is dat er geen bulk-CSS of raw-HTML-widget
gebruikt is om daar te komen, en dat er geen custom code is toegepast
zonder voorafgaand akkoord van Mark.

Die bevestiging is geen geheugenkwestie meer, maar een run:

```
node ai-workflow/check-native.js <elementor-data.json> [extra.css ...]
```

Geef het script de inhoud van de post-meta `_elementor_data` van de pagina,
en eventueel losse CSS-bestanden (WordPress' "Additional CSS", een
child-theme stylesheet). Het meldt elk gevuld `custom_css`-veld, elke
`!important`, elke HTML-/shortcode-widget, en elke `.cmp-`selector die via
CSS gestyled wordt. Exit code 0 is de bevestiging die hier gevraagd wordt;
toon die uitkomst bij elke sectie, ook als er niets aan de hand is ("geen
custom CSS gebruikt, alles native").

## 5b. Containerbreedte en responsief gedrag

`spec.json` bevat alleen pixelwaarden gemeten op vaste breedtes — dat is
een meting, geen bouwinstructie voor breedte. Neem een gemeten
`geometry.width` daarom nooit letterlijk over als vaste pixelbreedte op
een widget of container, want dat maakt de pagina niet-responsief (goed
op de gemeten breedte, kapot ertussenin of erbuiten).

Vaste regel per root-sectie:

1. Buitenste container van de sectie: full-width, met de
   achtergrondkleur/-afbeelding van die sectie.
2. Daarbinnen een inhoud-container met een max-breedte gelijk aan de
   site-brede standaard content-breedte (zie stap 0 — meestal 1200-1240px,
   bevestig dit per project, ga er nooit vanuit). Dít is waar een gemeten
   desktop-breedte als 1200px naartoe vertaalt: een max-width, niet een
   vaste width.

   **Let op welke van de twee opzetten je gebruikt:**

   - Staat de inhoud van die container **onder elkaar** (column), dan kan
     `content_width: "boxed"` gewoon.
   - Staat de inhoud **naast elkaar** (row — een header, een sectie-kop, een
     rij kaarten), dan mag dat **niet**: Elementor's eigen
     `.e-con-boxed.e-flex`-regel forceert `flex-direction:column` en reset
     `justify-content`, waardoor een horizontale opbouw onmogelijk wordt.
     Gebruik dan `content_width: "full"` met `margin: 0 auto` en een `width`
     met unit `custom` en waarde `min(1200px, 100%)`. Dat geeft hetzelfde
     boxed-effect zonder een vaste pixelbreedte. Zie
     `patterns/sectie-kop.md` en `patterns/header-navigatie.md`.

3. Kinderen daarbinnen op relatieve/flexibele breedte (`flex-grow`,
   procenten, of Elementor's eigen kolomverdeling), tenzij een element in
   de bron aantoonbaar een echt vaste afmeting moet houden (bijvoorbeeld
   een logo of icoon) — dat is de uitzondering, niet de standaard.

   Een gemeten `gridTemplateColumns` van `70px 378px 567px` is geen lijst
   van drie vaste breedtes: `getComputedStyle` geeft `1fr` en `auto` ook in
   pixels terug, dus de flexibiliteit is al weg vóórdat jij iets kiest.
   Reken zulke waarden terug naar een verhouding (hier ±7/39/54) en zet die
   als `flex-grow` of percentage.

Dit is onderdeel van dezelfde controle als stap 5a: een geslaagde
`compare.js`-run op de geconfigureerde breakpoints is geen bewijs dat dit
goed is toegepast, want dat script test niet wat er tussen de
breakpoints gebeurt (zie stap 7 voor de uitgebreide controle hierop).

## 6. Bouwen: één sectie is één afgebakende taak

**Dit gebeurt automatisch, Mark hoeft geen secties of patronen aan te
wijzen.** De secties van een pagina zijn simpelweg de `roots`-lijst uit
`spec.json` (de losse blokken bovenaan de boomstructuur, in
document-volgorde). Loop deze lijst zelf af, en bepaal per sectie zelf welk
patroon uit `ai-workflow/patterns/` past, aan de hand van de
"Herkenning"-regel in elk patroonbestand (zie stap 5). Vraag hier niet naar,
dit is Claude's eigen taak.

Bouw de pagina sectie voor sectie, niet in één lange sessie. Elke sectie is
een eigen, afgeronde opdracht: patroon bepalen, bouwen, teruglezen,
controleren, rapporteren. Ga pas naar de volgende sectie als de huidige
geslaagd is. Dit voorkomt dat de context te vol raakt en er verderop in een
lange sessie meer fouten sluipen.

Na het schrijven van een sectie:

1. Lees terug wat Elementor daadwerkelijk heeft opgeslagen en vergelijk dat
   met wat verstuurd is. Een waarde die stilletjes geweigerd is, moet hier
   al opvallen, niet pas bij de visuele controle.
2. Regenereer de CSS en leeg de cache.

## 7. Verplichte controle: `compare.js`

Draai na elke sectie. Maak zelf het configbestand aan in
`ai-workflow/configs/<naam-van-de-root-uit-spec.json>.json`, op basis van
`ai-workflow/config.example.json`, met `htmlPath` naar het bestand in
`ai-workflow/design/` en `pageUrl` naar de zojuist gebouwde Elementor-pagina.
Ook dit hoeft Mark niet aan te geven.

```
node ai-workflow/compare.js ai-workflow/configs/<sectie>.json
```

- **Exit code 0 (geslaagd):** pas nu mag je zeggen dat de sectie klaar is,
  en toon daarbij de tabel of het rapport van het script.
- **Exit code 1 (mislukt of ongeldig):** los de afwijkingen op en draai het
  script opnieuw. Blijf dit herhalen tot exit code 0.
- **Exit code 2 (kapot):** het script kón niet draaien — de staging-URL was
  onbereikbaar, het ontwerpbestand bestond niet, de browser startte niet.
  Dit is géén meetuitkomst. Meld het expliciet in plaats van door te gaan
  alsof er gecontroleerd is.

**Een geslaagde run is niet hetzelfde als een run die niets gemeten heeft.**
Het script weigert daarom "GESLAAGD" te zeggen bij een `roots`-naam die niet
in het ontwerp voorkomt, bij nul vergeleken elementen, en bij een dubbele
naam aan een van beide kanten. In die gevallen komt er `ONGELDIG` en exit
code 1. De uitvoer noemt bij elk breakpoint hoeveel elementen er
daadwerkelijk vergeleken zijn; als dat aantal niet klopt met de sectie die
je gebouwd hebt, is er iets mis met de config, niet met de bouw.

**Verruim een tolerantie nooit breder dan nodig.** `tolerancePx` en
`tolerances` zijn twee verschillende dingen: `tolerances.geometry` verruimt
alleen posities en afmetingen, terwijl typografie op 0,5px en kleur op exact
blijven staan. Dat onderscheid bestaat omdat één globale tolerantie van
20px, ooit ingesteld voor een gedraaide poster, een kop van 40px als 24px
liet passeren. Zet bij elke verruiming een `_toleranceNote` met de reden —
het script toont die bij elke run en waarschuwt als hij ontbreekt.

**Je mag nooit zeggen dat een sectie of pagina klaar is op basis van hoe het
eruitziet.** Een oordeel als "dit ziet er goed uit" is geen vervanging voor
een geslaagde run van dit script.

**Extra, verplicht bij de laatste sectie van de pagina (stap 8):**
`compare.js` test alleen exact de geconfigureerde breakpoints — dat bewijst
dus niet dat de pagina responsief is, alleen dat hij op die specifieke
breedtes goed staat (zie stap 5b). Draai daarom ook:

```
node ai-workflow/compare.js ai-workflow/configs/<sectie>.json --responsive
```

Dit test een vaste ladder tussenbreedtes (1280, 1100, 900, 800, 600, 480px,
plus de middens tussen je eigen breakpoints) op grove fouten: horizontale
overflow, een element dat buiten het scherm steekt, een container die
smaller wordt dan zijn inhoud, en twee buren die over elkaar heen vallen.

Exit code 1 hierop betekent: er is ergens een vaste pixelbreedte gebruikt
waar een relatieve/boxed opzet hoorde (stap 5b). Los dat op in de
container/widget-opbouw, niet door die tussenbreedte óók vast in te stellen.

De check weigert te draaien bij minder dan twee geconfigureerde breakpoints,
en meldt dat als `ONGELDIG`. Dat is opzet: met één breakpoint test de gewone
run alleen desktop, en dan zegt een geslaagde responsief-check niets.

## 8. Afronden van de hele pagina

Nadat alle secties losstaand geslaagd zijn:

1. **Screenshot-diff van de volledige pagina**, HTML naast Elementor, om
   dingen te vangen die losse metingen kunnen missen (verkeerde volgorde,
   overlappende blokken, een ontbrekende achtergrond):

   ```
   node ai-workflow/screenshot-diff.js ai-workflow/configs/full-page.json
   ```

   Dit schrijft per breakpoint één afbeelding naar `reports/screenshots/`
   met drie panelen naast elkaar: ontwerp, Elementor, en het verschil (rood
   waar de pixels afwijken). Let vooral op hele blokken rood — een paar
   rode randjes rond letters is normale fontrendering, een rood vlak ter
   grootte van een sectie is een echt probleem. Exit code 1 zodra het
   verschil boven `screenshotDrempelPct` (standaard 2%) uitkomt.

2. **Responsief-check** op de hele pagina, zoals in stap 7 beschreven:
   `node ai-workflow/compare.js ai-workflow/configs/full-page.json --responsive`.

3. **Native-check** op de hele pagina:
   `node ai-workflow/check-native.js <elementor-data.json>`. Exit code 0 is
   de bevestiging dat er nergens custom CSS, `!important` of een
   HTML-widget gebruikt is om de rest te laten slagen (stap 5a).

4. Controleer of er geen losse kleurcodes of vaste maten in Elementor staan
   waar een Global Color/Font had moeten worden gebruikt.

5. Verwijder de tijdelijke `cmp-`classes, of laat ze staan als ze niet
   storen. Let op: daarna kan `compare.js` niets meer controleren, dus doe
   dit pas als alles afgerond is.

6. Was dit een nieuw vertaalpatroon? Zet het gestructureerd terug in de
   patronen-bibliotheek, zodat het volgende project ervan profiteert.

7. Commit het goedgekeurde ontwerp, de specs, de configs en de rapporten
   samen. Een rapport zonder het bijbehorende ontwerp is niet te herhalen en
   dus geen bewijs meer.
