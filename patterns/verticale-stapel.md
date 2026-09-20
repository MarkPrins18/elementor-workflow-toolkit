# Patroon: verticale stapel

**Status:** beproefd (cinema-homepage: `hero-inhoud`; lawyer-homepage:
`contact-inhoud`)

## Herkenning

Past op een `data-cmp`-element in `spec.json` waarvoor geldt:

- `role: "container"`
- `layout.display: "flex"` en `layout.flexDirection: "column"`
- de kinderen (`children`, in de volgorde uit `spec.json`) hebben elk een
  `role` van: `titel`, `tekst`, `link`, `knop`, of `afbeelding`

Dit is dus niet specifiek "de hero", maar elk blok met die opbouw. Een
cta-blok met alleen titel + knop volgt hetzelfde patroon.

## Elementor-opbouw

1. **Container**, richting Column.

   | Instelling | Sleutel | Waarde uit `spec.json` |
   |---|---|---|
   | Richting | `flex_direction` | `"column"` |
   | Gap | `flex_gap` (**niet** `gap`) | `layout.rowGap` |
   | Uitlijning | `flex_align_items` (**niet** `align_items`) | `layout.alignItems` |
   | Padding | `padding` | `box.paddingTop/Right/Bottom/Left` |
   | Achtergrond | `background_color` | `background.backgroundColor`, als die niet transparant is |

   `layout.alignItems` vertaalt als: `normal`/`flex-start` → Start, `center`
   → Center, `flex-end` → End.

2. **Per kind, in dezelfde volgorde als `children` in `spec.json`:**

   | `role` in spec.json | Elementor-widget | Vult widget met |
   |---|---|---|
   | `titel` | Heading | `text`; HTML-tag = `tag` (h1–h6) |
   | `tekst` | Text Editor | `text` |
   | `link` | Heading, `header_size: "span"` | `text` als label, `href` als link |
   | `knop` | Button | `text` als knoplabel, `href` als link |
   | `afbeelding` | Image | `src` en `alt` |

   Het verschil tussen `link` en `knop` staat al in `spec.json`: een `<a>`
   zonder eigen achtergrond, rand of horizontale padding is een tekstlink,
   met wel zo'n opmaak is het een knop. Bouw een tekstlink dus niet als
   Button-widget — dan krijg je Elementor's knop-opmaak die er in het
   ontwerp niet staat.

3. **Per widget, ruimte-instellingen:**
   - `padding` = de eigen `box.padding*`-waarden van dat kind (meestal 0).
   - `margin` = de eigen `box.margin*`-waarden, **maar alleen als die
     afwijkt van wat de gap van de container al regelt.** Zie `CLAUDE.md`
     regel 3: gap regelt de normale tussenruimte, margin is uitsluitend de
     uitzondering.
   - Een kind dat niet mag uitrekken: `_flex_size: "none"`.

4. **Per widget, typografie:** `fontSize`, `fontWeight`, `lineHeight`,
   `letterSpacing`, `textAlign` en `color` rechtstreeks uit `typography` van
   dat kind. Elementor zet die waarden zelf op de binnenste tekstlaag — je
   hoeft daar geen extra CSS-regel voor te schrijven. Lettertype
   (`fontFamily`) alleen lokaal instellen als het niet al via een Global
   Font geregeld is (`CLAUDE.md` regel 4).

5. **Breedte.** Geef de kinderen geen vaste pixelbreedte uit
   `geometry.width`; die meting is een gevolg van de containerbreedte, geen
   instructie (`CLAUDE.md` stap 5b). Heeft een kind in de bron een echte
   `box.maxWidth` (bijvoorbeeld `max-width: 30em` op een alinea), neem dan
   díe waarde over als max-breedte.

## Voorbeeld (uit `test/source.spec.json`)

```
hero (container, column, gap 16px, padding 64/56)
├─ hero-titel  → Heading widget, "Snelle hulp aan huis", 40px/700
└─ hero-knop   → Button widget, "Plan afspraak", margin-top 24px
                 (uitzondering op de gap, want de knop moet verder van de
                 titel af staan dan de rest)
```

## Belangrijk (Elementor-eigenaardigheden)

- De groepscontrole-sleutels hebben een prefix: `flex_gap` (met `size`-veld),
  `flex_justify_content`, `flex_align_items`, `_flex_size` op een kind, en
  `text_padding` in plaats van `button_padding` op de Button-widget. De
  ongeprefixte varianten worden opgeslagen maar nooit naar CSS vertaald.
  Bevestigd in `includes/controls/groups/flex-container.php`,
  `includes/controls/groups/flex-item.php` en
  `includes/widgets/traits/button-trait.php`.
- Containers hebben geen eigen typografie-instelling; zie
  `header-navigatie.md` voor de volledige toelichting en hoe `compare.js`
  daarmee omgaat.
