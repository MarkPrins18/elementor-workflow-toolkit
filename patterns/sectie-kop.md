# Patroon: sectie-kop (label + titel)

**Status:** concept (bevestigd op het lawyer-homepage-project: `practice-head`,
`approach-head`, `matters-head`; ook `contact` gebruikt een variant zonder
aparte kopcontainer, zie onderaan)

## Herkenning

Past op een `data-cmp`-element in `spec.json` waarvoor geldt:

- `role: "container"`
- `layout.display: "grid"` met twee kolommen, waarbij de eerste kolom smal is
  (bijvoorbeeld 320px) en de tweede breed (bijvoorbeeld 704px)
- de kinderen zijn precies twee: een korte `tekst`-rol (het label, kleine
  hoofdletters/kapitaal, meestal uppercase) en een `titel`-rol (de sectiekop,
  groot lettertype)

Komt typisch voor als eerste kind van een sectie, direct boven de eigenlijke
inhoud (een lijst, een rij kaarten, etc.).

## Elementor-opbouw

1. **Container**, richting Row (ook al staat er `display:grid` in `spec.json`
   — met precies twee kinderen van vaste breedte is een flex-rij met vaste
   `width` op beide kinderen eenvoudiger te bouwen en identiek resultaat).
   - `Gap` = `layout.columnGap` van het kopcontainer-element.
   - `Margin-bottom` = de marge tussen de kop en de content eronder (staat
     als `marginBottom` op het kopcontainer-element zelf, niet als gap).
   - `Align items` = stretch (kinderen worden even hoog, gelijk aan het
     hoogste kind — meestal de titel).
2. **Label** (eerste kind): Heading-widget, `header_size: span`, breedte
   vastgezet op de eerste kolombreedte uit `spec.json`.
3. **Titel** (tweede kind): Heading-widget, `header_size: h2`, breedte
   vastgezet op de tweede kolombreedte uit `spec.json`.

## Belangrijk (Elementor-eigenaardigheden)

- Zet altijd `content_width: "full"` op deze container, nooit `"boxed"` —
  Elementor's `.e-con-boxed.e-flex`-regel forceert `flex-direction:column`
  en reset `justify-content`, wat een horizontale kop onmogelijk maakt.
- Elementor's eigen `.e-con.e-flex`-regel (2 classes) wint van een
  losstaande `.cmp-*`-regel (1 class): forceer `flex`, `width`, `gap` en
  `align-items` met `!important`.
- Elementor's binnenste tekstlaag (`.elementor-heading-title`) heeft een
  eigen font-size los van de buitenste `cmp-`wrapper. Zet typografie op
  zowel de buitenste class als op `.cmp-X .elementor-heading-title`.

## Variant zonder aparte kopcontainer (`contact`)

Bij `contact` staan het label, de titel en de intro-tekst niet in een eigen
`sec-head`-container, maar direct als eerste drie kinderen van
`contact-inhoud` (een verticale-stapel). Het label is daar bovendien een
kale inline `<span>` zonder blok ervoor — gebruik dan de HTML-widget-
fallback uit `verticale-stapel.md` in plaats van dit patroon.
