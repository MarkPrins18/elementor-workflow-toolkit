# Elementor-workflow — vaste regels

Dit bestand geldt voor elk project waarin een bestaand ontwerp (PDF of HTML)
zo exact mogelijk in Elementor nagebouwd moet worden. Het doel is niet "ziet
er goed uit", maar "meetbaar identiek, binnen de afgesproken marge". Volg
onderstaande stappen en regels in deze volgorde, en sla geen stap over omdat
het al goed lijkt te gaan.

## 0. Site-profiel (eerst controleren, per project)

Voordat er iets gebouwd wordt, staat het volgende vast, of wordt het nu
vastgesteld:

- Elementor-versie: _______ (huidig: recente 3.x, containers actief)
- Container-modus: aan / uit (Elementor → Settings → Features)
- Breakpoints: desktop / tablet / mobiel-grenzen, standaard 1024px en 767px
  tenzij dit project ze zelf heeft aangepast
- Actief thema: _______
- Staging-URL: _______

Ga hier nooit vanuit, controleer het bij een nieuw project.

## Mapstructuur van deze toolkit

Dit bestand hoort samen met de rest van de toolkit in `ai-workflow/` te
staan (of de root van het project, als `CLAUDE.md` daar apart naartoe is
verplaatst):

```
ai-workflow/
├── CLAUDE.md               ← dit bestand
├── compare.js
├── extract-spec.js
├── config.example.json
├── patterns/               ← verticale-stapel.md, kaartenrij.md, etc.
├── design/                 ← het brondesign per project: de aangeleverde
│                              of door Claude gemaakte HTML (zie stap 1),
│                              en de spec.json die daaruit volgt
└── configs/                ← losse compare.js-configbestanden, één per
                               sectie/pagina die getest wordt
```

Verwijs in commando's dus naar `ai-workflow/design/...`,
`ai-workflow/compare.js`, `ai-workflow/extract-spec.js`, en
`ai-workflow/patterns/...`, tenzij het project een andere indeling gebruikt
(pas dit dan hier bovenaan even aan).

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
3. Laat Mark deze HTML-versie beoordelen. **Dit is het enige moment waarop
   een mens visueel oordeelt of het ontwerp goed is.** Wacht op akkoord
   voordat je verdergaat naar Elementor.

Nooit een sectie in Elementor bouwen op basis van een ontwerp dat nog niet
in deze vorm is goedgekeurd.

## 2. HTML wordt `spec.json`

Draai `ai-workflow/extract-spec.js` op de goedgekeurde HTML in
`ai-workflow/design/`, bijvoorbeeld:

```
node ai-workflow/extract-spec.js ai-workflow/design/hero-sectie.html
```

Dit levert `ai-workflow/design/hero-sectie.spec.json` op: per
`data-cmp`-element het type, de tekst, de boomstructuur en alle opmaakwaarden
(zie `README.md` in deze toolkit).

**Vanaf hier is er geen ruimte meer voor interpretatie.** Elke waarde die in
`spec.json` staat, wordt exact overgenomen in Elementor. Rond niets af, schat
niets in, en verzin geen "nettere" waarde. Als een waarde vreemd oogt (bv.
23px in plaats van 24px), is dat een vraag voor Mark, niet iets om zelf te
corrigeren.

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

Beschikbare patronen nu: `patterns/verticale-stapel.md` (titel/tekst/knop
onder elkaar, bijvoorbeeld een hero of cta-blok) en `patterns/kaartenrij.md`
(een rij of grid van kaarten, waarbij elke kaart zelf weer volgens
verticale-stapel wordt gevuld).

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
- Containers hebben geen eigen typografie-instelling — Elementor past
  font/kleur alleen toe op de binnenste tekstlaag van een widget, nooit op
  de buitenste wrapper. Zie `patterns/header-navigatie.md` voor de volledige
  toelichting en hoe `compare.js` hiermee omgaat (niet oplosbaar via een
  sleutelnaam-fix, wel via de meetmethode).

**`compare.js` op exit code 0 is geen bewijs dat deze regel is gevolgd** —
het script meet alleen het eindresultaat, niet hoe dat tot stand kwam. Een
sectie mag daarom pas "klaar" heten als, naast een geslaagde `compare.js`-
run, ook expliciet bevestigd is dat er geen bulk-CSS of raw-HTML-widget
gebruikt is om daar te komen, en dat er geen custom code is toegepast
zonder voorafgaand akkoord van Mark. Meld dit bij elke sectie erbij, ook
als er niets aan de hand is ("geen custom CSS gebruikt, alles native").

## 5b. Containerbreedte en responsief gedrag

`spec.json` bevat alleen pixelwaarden gemeten op vaste breedtes — dat is
een meting, geen bouwinstructie voor breedte. Neem een gemeten
`geometry.width` daarom nooit letterlijk over als vaste pixelbreedte op
een widget of container, want dat maakt de pagina niet-responsief (goed
op de gemeten breedte, kapot ertussenin of erbuiten).

Vaste regel per root-sectie:

1. Buitenste container van de sectie: full-width, met de
   achtergrondkleur/-afbeelding van die sectie.
2. Daarbinnen een inhoud-container op **Boxed** content-breedte, met een
   max-breedte gelijk aan de site-brede standaard content-breedte (zie
   stap 0 — meestal 1200-1240px, bevestig dit per project, ga er nooit
   vanuit). Dít is waar een gemeten desktop-breedte als 1200px naartoe
   vertaalt: een max-width, niet een vaste width.
3. Kinderen daarbinnen op relatieve/flexibele breedte (`flex-grow`,
   procenten, of Elementor's eigen kolomverdeling), tenzij een element in
   de bron aantoonbaar een echt vaste afmeting moet houden (bijvoorbeeld
   een logo of icoon) — dat is de uitzondering, niet de standaard.

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

- **Exit code 1 (mislukt):** los de afwijkingen op en draai het script
  opnieuw. Blijf dit herhalen tot exit code 0.
- **Exit code 0 (geslaagd):** pas nu mag je zeggen dat de sectie klaar is,
  en toon daarbij de tabel of het rapport van het script.

**Je mag nooit zeggen dat een sectie of pagina klaar is op basis van hoe het
eruitziet.** Een oordeel als "dit ziet er goed uit" is geen vervanging voor
een geslaagde run van dit script. Als het script niet gedraaid kan worden
(bijvoorbeeld omdat de staging-URL niet bereikbaar is), meld dat expliciet
in plaats van door te gaan alsof het wel gecontroleerd is.

**Extra, verplicht bij de laatste sectie van de pagina (stap 8):**
`compare.js` test alleen exact de geconfigureerde breakpoints — dat bewijst
dus niet dat de pagina responsief is, alleen dat hij op die specifieke
breedtes goed staat (zie stap 5b). Draai daarom ook het `--responsive`-
onderdeel van `compare.js` (test op een paar tussenliggende breedtes op
grove fouten: horizontale overflow, overlappende elementen, een container
die smaller wordt dan zijn inhoud). Exit code 1 hierop betekent: er is
ergens een vaste pixelbreedte gebruikt waar een relatieve/boxed opzet
hoorde (stap 5b) — dit oplossen door de container/widget aan te passen,
niet door de tussenliggende breedte simpelvoudig ook nog vast in te
stellen.

## 8. Afronden van de hele pagina

Nadat alle secties losstaand geslaagd zijn:

1. Maak een screenshot-diff van de volledige pagina, HTML naast Elementor,
   om dingen te vangen die losse metingen kunnen missen (verkeerde volgorde,
   overlappende blokken).
2. Controleer of er geen losse kleurcodes of vaste maten in Elementor staan
   waar een Global Color/Font had moeten worden gebruikt.
3. Verwijder de tijdelijke `cmp-`classes, of laat ze staan als ze niet
   storen.
4. Was dit een nieuw vertaalpatroon? Zet het gestructureerd terug in de
   patronen-bibliotheek, zodat het volgende project ervan profiteert.
