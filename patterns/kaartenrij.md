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
   - `Gap` (Layout-tab) = `layout.columnGap` (en `rowGap` bij meerdere rijen)
     van het buitenste container-element.
   - `Padding` = `box.paddingTop/Right/Bottom/Left` van het buitenste
     container-element.

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
   kolombreedte (Grid: automatisch; Flex: `flex-grow: 1` of vaste breedte
   gelijk aan de gemeten waarde). Verschillen de breedtes wél van elkaar,
   neem dan de gemeten breedte per kaart apart over in plaats van gelijk
   te verdelen.

## Voorbeeld (structuur, geen echte klantdata)

```
kaarten (container, grid, 3 kolommen, gap 24px, padding 24/20/32)
├─ kaart-1 (container) → verticale stapel: titel + tekst
├─ kaart-2 (container) → verticale stapel: titel + tekst
└─ kaart-3 (container) → verticale stapel: titel + tekst
```

## Bijwerken van dit patroon

Zodra dit patroon voor het eerst op een echt klantproject wordt gebruikt en
`compare.js` daar geslaagd op draait, zet de status hierboven op "beproefd"
en noteer kort welk project het bevestigde. Let bij het testen extra op de
tablet-breedte: een grid dat op desktop 3 kolommen heeft, valt op tablet
vaak terug naar 2 of 1, en dat moet dan ook zo in Elementor ingesteld staan
per breakpoint.
