# Patroon: kaartenrij (grid met kaarten)

**Status:** concept — nog niet bevestigd met een geslaagde `compare.js`-run.
Het cinema-project heeft wel kaartenrijen (`binnenkort`, `avonden`), maar
daar is geen rapport van, dus dit patroon telt nog niet als beproefd.

## Herkenning

Past op een `data-cmp`-element in `spec.json` waarvoor geldt:

- `role: "container"`
- `layout.display` is `"grid"`, of `"flex"` met `layout.flexDirection: "row"`
- de kinderen (`children`) hebben elk zelf ook `role: "container"`, en
  volgen op hun beurt het patroon **verticale stapel** (zie dat bestand)
  voor hun eigen inhoud

Met andere woorden: dit patroon beschrijft alleen de buitenste rij/grid.
De inhoud van elke losse kaart wordt gebouwd volgens het patroon
"verticale stapel", niet opnieuw uitgevonden.

## Elementor-opbouw

1. **Buitenste container.** Kies eerst `container_type`, want dáár hangt de
   hele sleutelset aan vast. Een grid-container gebruikt **andere
   instellingen dan een flex-container**, en de flex-sleutels komen op een
   grid simpelweg niet aan (zie `CLAUDE.md` 5a).

   **Bij `layout.display: "flex"` → `container_type: "flex"`**

   | Instelling | Sleutel | Waarde uit `spec.json` |
   |---|---|---|
   | Richting | `flex_direction` | `"row"` |
   | Gap | `flex_gap` | `layout.columnGap` / `layout.rowGap` |
   | Wrap | `flex_wrap` | `layout.flexWrap` |
   | Uitlijning | `flex_align_items` | `layout.alignItems` |
   | Verdeling | `flex_justify_content` | `layout.justifyContent` |

   Wrapt de rij in de bron, zet dan ook echt `flex_wrap: "wrap"` — anders
   perst Elementor alle kaarten op één rij zodra het scherm smaller wordt.

   **Bij `layout.display: "grid"` → `container_type: "grid"`**

   | Instelling | Sleutel | Waarde uit `spec.json` |
   |---|---|---|
   | Kolommen | `columns_grid` | aantal uit `layout.gridTemplateColumns` |
   | Rijen | `rows_grid` | aantal uit `layout.gridTemplateRows` |
   | Gap | `gaps` (rij + kolom in één control) | `layout.rowGap` / `layout.columnGap` |
   | Richting | `auto_flow` | meestal `row` |
   | Uitlijning | `align_items` / `justify_items` | `layout.alignItems` |
   | Verdeling | `align_content` / `justify_content` | `layout.justifyContent` |

   Let op de namen: de grid-groepscontrole heeft **geen prefix**, dus hier
   heten ze echt `align_items` en `justify_content` — precies de sleutels
   die op een flex-container níets doen. En de gap heet hier `gaps`, niet
   `flex_gap`. Zet je `flex_gap` op een grid-container, dan wordt die waarde
   wel opgeslagen maar nooit toegepast.

   Het aantal kolommen is het aantal uit `layout.gridTemplateColumns` van de
   desktop-meting, niet het aantal kinderen: een grid dat op de gemeten
   breedte al is teruggevallen naar twee kolommen geeft anders een verkeerd
   getal.

   `padding` = `box.paddingTop/Right/Bottom/Left` van het buitenste
   container-element, bij beide varianten.

2. **Per kaart, in dezelfde volgorde als `children`:**
   - Eén Elementor-container per kaart.
   - Vul deze container volgens het patroon **verticale stapel**, met de
     eigen `children` van díe kaart (bijvoorbeeld een titel + tekst per
     kaart, geen knop).
   - `Padding` van de kaart-container = de eigen `box`-waarden van dat
     kaart-element.
   - `Background` / `border` van de kaart-container = de eigen
     `background`-waarden van dat kaart-element (bijvoorbeeld een rand of
     een lichte achtergrondkleur).

3. **Gelijke breedte tussen kaarten:** als alle kaarten in `spec.json`
   dezelfde `geometry.width` hebben, zet elke kaart-container op gelijke
   kolombreedte — Grid regelt dat zelf, bij Flex met `flex-grow: 1` op elke
   kaart. Neem de gemeten pixelbreedte **niet** over als vaste breedte
   (`CLAUDE.md` stap 5b): die waarde is een gevolg van de containerbreedte
   op het gemeten breakpoint. Verschillen de breedtes wél van elkaar, reken
   ze dan om naar een verhouding (bijvoorbeeld `flex-grow` 2 en 1 bij een
   kaart die twee keer zo breed is).

## Voorbeeld (structuur, geen echte klantdata)

```
kaarten (container, grid, 3 kolommen, gap 24px, padding 24/20/32)
├─ kaart-1 (container) → verticale stapel: titel + tekst
├─ kaart-2 (container) → verticale stapel: titel + tekst
└─ kaart-3 (container) → verticale stapel: titel + tekst
```

## Per breakpoint instellen

Een grid van 3 kolommen op desktop valt op tablet vaak terug naar 2 of 1.
Dat moet ook in Elementor per breakpoint ingesteld staan, en daarvoor heb je
een meting per breedte nodig:

```
node extract-spec.js ai-workflow/design/<ontwerp>.html --breedtes=1440,1024,767,390
```

Dat levert `<ontwerp>.1440.spec.json`, `<ontwerp>.1024.spec.json`, etc. Lees
het kolomaantal per breedte uit `layout.gridTemplateColumns` van díe spec, en
zet het op de bijbehorende Elementor-breakpoint. Zonder die metingen is het
kolomaantal op tablet een schatting.

## Bijwerken van dit patroon

Zodra dit patroon voor het eerst op een echt klantproject wordt gebruikt en
`compare.js` daar geslaagd op draait, zet de status hierboven op "beproefd"
en noteer kort welk project het bevestigde.
