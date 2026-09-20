# Patroon: verticale stapel

**Status:** concept (nog niet getest op een echt klantproject, wel op de
voorbeeldpagina in `test/`)

## Herkenning

Past op een `data-cmp`-element in `spec.json` waarvoor geldt:

- `role: "container"`
- `layout.display: "flex"` en `layout.flexDirection: "column"`
- de kinderen (`children`, in de volgorde uit `spec.json`) hebben elk een
  `role` van: `titel`, `tekst`, `knop`, of `afbeelding`

Dit is dus niet specifiek "de hero", maar elk blok dat zo'n opbouw heeft.
De hero is het meest voorkomende voorbeeld, maar bijvoorbeeld een cta-blok
met alleen titel + knop volgt hetzelfde patroon.

## Elementor-opbouw

1. **Container**, richting Column.
   - `Gap` (Layout-tab) = `layout.rowGap` van het container-element.
   - `Padding` (Advanced-tab) = `box.paddingTop/Right/Bottom/Left` van het
     container-element.
   - `Align items` = vertaal `layout.alignItems` (`normal`/`flex-start` →
     Start, `center` → Center, `flex-end` → End).
   - `Background` = `background.backgroundColor` als die niet transparant is.

2. **Per kind, in dezelfde volgorde als `children` in `spec.json`:**

   | `role` in spec.json | Elementor-widget | Vult widget met |
   |---|---|---|
   | `titel` | Heading | `text`; HTML-tag = `tag` (h1–h6) |
   | `tekst` | Text Editor | `text` |
   | `knop` | Button | `text` als knoplabel; `href` als link |
   | `afbeelding` | Image | `src` en `alt` |

3. **Per widget, ruimte-instellingen (Advanced-tab):**
   - `Padding` = het kind se eigen `box.paddingTop/Right/Bottom/Left`
     (meestal 0, tenzij het kind zelf inspringing heeft).
   - `Margin` = het kind se eigen `box.marginTop/Right/Bottom/Left`,
     **maar alleen als die afwijkt van wat de gap van de container al
     regelt.** Zie `CLAUDE.md` regel 3: gap regelt de normale tussenruimte,
     margin is uitsluitend de uitzondering (bijvoorbeeld een knop die meer
     afstand nodig heeft dan de rest).

4. **Per widget, typografie:**
   - `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, `textAlign`,
     `color` rechtstreeks uit `typography` van dat kind.
   - Lettertype (`fontFamily`) alleen lokaal instellen als het niet al via
     een Global Font geregeld is (zie `CLAUDE.md` regel 4).

## Voorbeeld (uit `test/source.spec.json`)

```
hero (container, column, gap 16px, padding 64/56)
├─ hero-titel  → Heading widget, "Snelle hulp aan huis", 40px/700
└─ hero-knop   → Button widget, "Plan afspraak", margin-top 24px
                 (uitzondering op de gap, want de knop moet verder van de
                 titel af staan dan de rest)
```

## Bijwerken van dit patroon

Zodra dit patroon voor het eerst op een echt klantproject wordt gebruikt en
`compare.js` daar geslaagd op draait, zet de status hierboven op "beproefd"
en noteer kort welk project het bevestigde.
