# Patroon: kaartenrij (grid met kaarten)

**Status:** concept (nog niet getest)

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

1. **Buitenste container**, richting Row (bij `flex`) of Grid (bij `grid`).
   - Bij Grid: aantal kolommen = tel het aantal kinderen, tenzij
     `layout.gridTemplateColumns` een ander aantal aangeeft (bijvoorbeeld
     bij een grid dat op deze schermbreedte al is teruggevallen naar minder
     kolommen; gebruik in dat geval het aantal uit de desktop-meting).
   - `flex_gap` (**niet** `gap`) = `layout.columnGap`, en `rowGap` bij
     meerdere rijen.
   - `padding` = `box.paddingTop/Right/Bottom/Left` van het buitenste
     container-element.
   - Wrapt de rij in de bron (`layout.flexWrap: "wrap"`), zet dan ook
     `flex_wrap: "wrap"` — anders perst Elementor alle kaarten op één rij
     zodra het scherm smaller wordt.

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
