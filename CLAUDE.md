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
- Elementor Pro beschikbaar: ja / nee — bepaalt of Theme Builder (header en
  footer als sitebrede template) en Motion Effects (sticky) kunnen
- Container-modus: aan / uit (Elementor → Settings → Features)
- **Optimized Markup: aan / uit** (Elementor → Settings → Features). Staat
  dit aan, dan is `.elementor-widget-container` uit alle widgets verdwenen.
  Dat verandert de DOM waarop de hele meetmethode staat, dus noteer het.
- Breakpoints: desktop / tablet / mobiel-grenzen, standaard 1024px en 767px
  tenzij dit project ze zelf heeft aangepast. Extra breakpoints (laptop,
  widescreen, tablet extra, mobiel extra) moeten apart aangezet worden in
  Site Settings → Layout → Breakpoints — doe dat nu als het ontwerp ze
  nodig heeft, niet halverwege het bouwen.
- Site-brede content-breedte: _______ (Site Settings → Layout → Content
  Width; nodig voor stap 5b)
- Actief thema: _______
- Staging-URL: _______

Ga hier nooit vanuit, controleer het bij een nieuw project.

**Werkt dit project met de klassieke widgets of met V4 atomic elements?**
Deze toolkit en alle patronen gaan uit van de klassieke containers en
widgets (Heading, Text Editor, Image, Button, Container) en van Global
Colors/Fonts — niet van de atomic elements en het variabelen-systeem van
Elementor 4. Wijkt een project daarvan af, dan kloppen de sleutelnamen in
`patterns/` niet meer en moet dat eerst uitgezocht worden.

Controleer ook één keer of de toolkit zelf werkt voordat je 'm gebruikt:

```
npm install
npm test
```

`npm test` draait alle controlescripts tegen de vaste voorbeelden in
`test/`, en controleert of ze slagen én falen wanneer dat hoort. Die
scripts zijn de enige reden dat een sectie "klaar" mag heten; als ze stil
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
├── check-semantiek.js      ← stap 5c: leest het nog hetzelfde?
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

**Zet daarnaast eerst de Theme Style.** In Site Settings → Typography en
→ Buttons leg je de standaard vast voor bodytekst, h1 t/m h6, links en
knoppen. Doe je dat eerst, dan hoeven de meeste widgets daarna helemaal
geen eigen typografie: ze staan al goed. Dat scheelt niet alleen werk, het
haalt ook tientallen plekken weg waar een waarde later stilletjes kan
afwijken. Vul de Theme Style met de waarden die in `spec.json` het vaakst
voorkomen voor dat soort element, en zet alleen de uitzonderingen lokaal.

De volgorde is dus: **Theme Style → Global Colors/Fonts → secties bouwen.**

**Header en footer: sitebreed of op de pagina?** Hoort de header op meer dan
één pagina, en is Elementor Pro beschikbaar (zie stap 0), bouw 'm dan als
Theme Builder-template in plaats van als container op de pagina. Anders
staat hij straks alleen op deze pagina en moet hij bij elke volgende pagina
opnieuw. Is Pro er niet, bouw hem dan op de pagina en noteer dat als
bekende beperking. Geldt hetzelfde voor een sectie die op meerdere pagina's
terugkomt: sla die op als Template in plaats van 'm te kopiëren.

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

**Matcht er meer dan één patroon?** Dat kan: een header is óók "een rij met
container-kinderen". Loop ze daarom af van specifiek naar algemeen en neem
de eerste die past. Die volgorde, en de regels die voor álle patronen
gelden, staan in `ai-workflow/patterns/README.md`.

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

Als een native Elementor-instelling (container-gap, -padding, uitlijning,
widget-typografie, containerbreedte) niet lijkt door te werken, is de
oorzaak bijna nooit een beperking van Elementor. Meestal is de waarde wél
netjes opgeslagen in `_elementor_data`, maar hoort de sleutel bij een
control die op dít element niet actief is.

**De belangrijkste bron van verwarring: een container heeft twee
groepscontroles voor layout, en er is er altijd maar één actief.** Welke,
hangt af van `container_type`:

| `container_type` | Actieve groep | Prefix | Voorbeelden |
|---|---|---|---|
| `"flex"` | flex-container | `flex_` | `flex_direction`, `flex_gap`, `flex_wrap`, `flex_justify_content`, `flex_align_items` |
| `"grid"` | grid-container | *geen* | `columns_grid`, `rows_grid`, `gaps`, `auto_flow`, `justify_items`, `align_items`, `justify_content`, `align_content` |

`justify_content` en `align_items` zijn dus **geen verkeerde namen** — het
zijn de echte sleutels van de grid-groep. Zet je ze op een flex-container,
dan gebeurt er niets, omdat die control daar niet actief is. En andersom:
`flex_gap` op een grid-container komt evenmin aan; daar heet de gap `gaps`.

Bevestigd in `includes/controls/groups/flex-container.php`
(`'name' => 'flex'`, vandaar de prefix) en
`includes/controls/groups/grid-container.php` (geen prefix).

Controleer bij elke layout-eigenschap die niet doorwerkt dus eerst: klopt
`container_type` met de groep waar deze sleutel bij hoort? Wijk pas uit
naar CSS als dat is uitgesloten — en dan alleen na akkoord (zie hierboven).
Documenteer bevestigde gevallen hieronder, zodat ze niet telkens opnieuw
uitgezocht hoeven te worden:

- `gap` → bestaat niet. Op een flex-container is het `flex_gap` (met
  `size`-veld), op een grid-container `gaps`.
- `justify_content` / `align_items` → grid-groep. Op een flex-container
  moet je `flex_justify_content` / `flex_align_items` hebben.
- `columns_grid` → het aantal kolommen van een grid-container. Niet te
  verwarren met een breedte-instelling.
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
- **`hide_tablet`/`hide_mobile` zetten de verkeerde class.** In plaats van
  `elementor-hidden-tablet`/`elementor-hidden-mobile` (de classes die
  Elementor's eigen CSS in `frontend.min.css` daadwerkelijk verbergt via
  `@media(max-width:...){display:none}`) komt er `elementor-yes` te staan —
  zichtbaar niets. Zet de juiste class zelf mee in `_css_classes` (naast de
  `cmp-`class) in plaats van de `hide_*`-toggle te gebruiken; dat is nog
  steeds Elementor's eigen CSS-regel, alleen via de class direct toegepast.
- **Een responsieve `width` op `custom`-eenheid (zoals `"auto"` of
  `min(1180px, 100%)`) erft NIET automatisch door naar tablet/mobiel.**
  Bevestigd in de controlecode van `container.php`: de mobiele breedte heeft
  een eigen standaardwaarde (100%) en "is not inherited from the higher
  breakpoint width controls". Zet dezelfde waarde dus expliciet nogmaals op
  `width_tablet` én `width_mobile`, ook al lijkt dat overbodig.
- **Een bron-breakpoint dat niet samenvalt met Elementor's tablet/mobiel-
  grens (bijv. 920px, tussen Elementor's 1024 en 767 in) kun je niet exact
  native raken.** Kies de dichtstbijzijnde kant die de bron nog goed
  weergeeft — hier: het gedrag onder 920px (nav-links verbergen, padding
  verkleinen) toegepast vanaf Elementor's mobiel-breakpoint (767), niet
  tablet (1024), want bij 1024 is de bron nog in zijn brede stand. Controleer
  dit altijd met de echte metingen per breakpoint uit `spec.json`, nooit op
  gevoel.

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

   **Zet de content-breedte bij voorkeur één keer site-breed**, in Site
   Settings → Layout → Content Width. Een container op
   `content_width: "boxed"` neemt die waarde vanzelf over, en dan hoef je
   per sectie helemaal niets in te stellen. Moet één sectie afwijken, dan is
   `boxed_width` de native control daarvoor — geen custom `width`.

   **Boxed werkt gewoon met een horizontale opbouw.** Een eerdere versie van
   de patronen zei: nooit `boxed` bij `flex_direction: "row"`, want
   `.e-con-boxed.e-flex` zou `flex-direction:column` forceren. Dat is
   onjuist en die regel is verwijderd. Wat er werkelijk gebeurt: een boxed
   container rendert een **extra binnenwrapper**,

   ```html
   <div class="e-con e-con-boxed"><div class="e-con-inner">…kinderen…</div></div>
   ```

   (bevestigd in `before_render()` van `includes/elements/container.php`).
   De buitenste doos is full-width en heeft precies één kind; de kinderen
   staan in `.e-con-inner`, en dáár gebeurt de uitlijning. Dat de buitenste
   doos op `column` staat is dus logisch en zegt niets over je kinderen.

   **Waar je wél op moet letten: welk element je `cmp-`naam draagt.**
   Elementor zet CSS-classes altijd op de buitenste `.e-con-boxed`, nooit op
   `.e-con-inner`. Dat bepaalt je opbouw:

   - Hoeft de content-breedte-laag niet apart gecontroleerd te worden
     (meestal: het is een kale `.wrap` zonder eigen opmaak), gebruik dan
     **één boxed container** en geef de `.wrap` in de bron-HTML geen
     `data-cmp`. Dat is de nette, native oplossing: geen tweede container,
     geen custom breedte.
   - Draagt die laag wél eigen opmaak die je wilt verifiëren (flex row,
     `space-between`, eigen padding — zoals `header-binnen`), dan heb je een
     element nodig dat de `cmp-`naam kan dragen én de begrensde breedte
     heeft. Gebruik dan **twee containers**: een buitenste full-width met de
     achtergrond, en daarbinnen een container op `content_width: "full"` met
     `margin: 0 auto` en een responsieve `width` (bijvoorbeeld unit `custom`
     met `min(1180px, 100%)`). Niet omdat boxed stuk is, maar omdat de
     `cmp-`naam anders op de full-width buitenkant belandt en `compare.js`
     dan de verkeerde doos meet.

   Kies dus per sectie op basis van wat je wilt kúnnen meten, niet op basis
   van een vermeende bug.

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

## 5c. Betekenis: `html_tag`, koppen en alt-teksten

Een pagina die er identiek uitziet kan totaal anders lezen. Een navigatie
die als rij losse tekstwidgets is nagebouwd, een `<h2>` die een `<span>`
werd, een afbeelding zonder alt-tekst: `compare.js` ziet daar niets van,
want de pixels kloppen. Voor een bezoeker met een schermlezer en voor Google
is het wel een echt verschil.

Vaste regels:

1. **Zet `html_tag` op elke container die in de bron een betekenisvol
   element was.** Elementor's container ondersteunt `div`, `header`,
   `footer`, `main`, `article`, `section`, `aside`, `nav` en `a` (bevestigd
   in `includes/elements/container.php`). De `tag` uit `spec.json` zegt
   precies welke je nodig hebt. Standaard is `div`, en dat is bijna nooit
   wat de bron bedoelde voor een root-sectie.
2. **Neem het koppenniveau letterlijk over uit `spec.json`.** `header_size`
   op de Heading-widget is `h1`…`h6` of `span`. Een label dat in de bron een
   `<span>` is, wordt `span`; een sectiekop die `<h2>` is, wordt `h2`.
   Gebruik `span` nooit om een kop kleiner te maken — daar is typografie
   voor.
3. **Eén `<h1>` per pagina, en sla geen niveaus over.** Geldt ook voor de
   bron-HTML die je in stap 1 maakt: staat het daar al fout, repareer het
   daar en niet in Elementor.
4. **Een link blijft een link.** `role: "link"` uit `spec.json` wordt een
   widget met een gevuld link-veld, niet een stuk tekst dat er alleen zo
   uitziet.
5. **Alt-teksten uit `spec.json` overnemen op de Image-widget.** Een lege
   alt is alleen goed als de afbeelding puur decoratief is.

Controleer dit na elke sectie, naast `compare.js`:

```
node ai-workflow/check-semantiek.js ai-workflow/configs/<sectie>.json
```

Het script vergelijkt per `cmp-`naam de HTML-tag, het koppenniveau, het
omliggende landmark, de link en de alt-tekst tussen bron en gebouwde
pagina, en controleert de koppenstructuur van de hele pagina. Exit code 0
is de bevestiging; exit code 1 noemt per element wat er is weggevallen en
met welke instelling je het terugzet.

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

4. **Semantiek-check** op de hele pagina:
   `node ai-workflow/check-semantiek.js ai-workflow/configs/full-page.json`.
   Dit is de enige controle die de koppenstructuur van de hele pagina in
   samenhang ziet — losse secties kunnen elk kloppen terwijl er samen twee
   `<h1>`'s op de pagina staan (stap 5c).

5. Controleer of er geen losse kleurcodes of vaste maten in Elementor staan
   waar een Global Color/Font had moeten worden gebruikt.

6. Verwijder de tijdelijke `cmp-`classes, of laat ze staan als ze niet
   storen. Let op: daarna kan `compare.js` niets meer controleren, dus doe
   dit pas als alles afgerond is.

7. Was dit een nieuw vertaalpatroon? Zet het gestructureerd terug in de
   patronen-bibliotheek, zodat het volgende project ervan profiteert.

8. Commit het goedgekeurde ontwerp, de specs, de configs en de rapporten
   samen. Een rapport zonder het bijbehorende ontwerp is niet te herhalen en
   dus geen bewijs meer.

## 9. Een bestaande sectie wijzigen

Stap 1 tot 8 beschrijven bouwen vanaf nul. Staat de pagina er al en moet er
iets veranderen, dan gelden dezelfde regels, maar in een andere volgorde.
Bepaal eerst welk van deze twee het is — ze hebben een verschillende route:

### A. Het ontwerp verandert

De HTML in `design/` blijft de bron van waarheid. Pas dus **nooit eerst iets
in Elementor aan om het daarna in de HTML na te tekenen**; dan is de spec
geen bron meer maar een verslag.

1. Pas de HTML in `design/` aan.
2. Komt er iets nieuws in dat Elementor misschien niet native kan (een
   gradient, een schaduw, een transform)? Draai `check-bouwbaar.js` opnieuw.
3. Laat de gewijzigde HTML goedkeuren, net als in stap 1.
4. Draai `extract-spec.js` opnieuw, met dezelfde breedtes als eerst.
5. **`git diff design/`** — dit is je werklijst. De spec staat in git, dus de
   diff laat per element precies zien welke waarden veranderd zijn. De regel
   `generatedAt` verandert altijd; die telt niet mee.
6. Pas in Elementor alleen de elementen aan die in die diff staan.
7. Controleer die sectie: `compare.js` → `check-semantiek.js` →
   `check-native.js`.

### B. De bouw is fout, het ontwerp klopt

Dan verandert er niets aan de spec. Dit is gewoon de lus uit stap 7:
aanpassen in Elementor, `compare.js` opnieuw, herhalen tot exit code 0.

Controle op jezelf: `git diff design/` hoort hierbij **leeg** te blijven.
Staat daar wel iets in, dan ben je het ontwerp aan het aanpassen in plaats
van de bouw, en hoor je route A te volgen (inclusief goedkeuring).

### Let op: een hoogteverandering schuift alles eronder mee

Posities worden standaard absoluut gemeten. Wordt een sectie hoger of lager,
dan verschuift elke sectie eronder, en die falen dan allemaal op `y` —
terwijl er intern niets mis mee is.

Zet daarom in een **sectie-config** (één root) de geometrie op relatief:

```json
"roots": ["bezoek"],
"geometrie": "relatief"
```

Dan worden posities gemeten vanaf de linkerbovenhoek van de sectie zelf, en
controleer je de interne opbouw los van wat erboven staat. Een fout bínnen
de sectie valt nog steeds door de mand. In `full-page.json` laat je
`"absoluut"` staan — daar wil je de onderlinge volgorde en plaatsing juist
wél controleren.

Werkvolgorde bij een wijziging die de hoogte raakt:

1. Werk van boven naar beneden door de gewijzigde secties.
2. Draai per sectie de config met `"geometrie": "relatief"`.
3. Sluit af met de full-page run op `"absoluut"`, plus `--responsive` en
   `screenshot-diff.js`. Dat is de enige controle die de nieuwe onderlinge
   posities in samenhang ziet.

Raakt de wijziging de hoogte niet (een kleur, een lettergrootte binnen
dezelfde regelhoogte), dan speelt dit niet en kun je die ene sectie gewoon
draaien.
