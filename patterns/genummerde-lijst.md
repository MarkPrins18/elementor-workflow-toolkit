# Patroon: genummerde lijst (verticaal gestapelde rijen)

**Status:** concept (bevestigd op het lawyer-homepage-project: `practice-lijst`
en `matters-lijst`)

## Herkenning

Past op een `data-cmp`-element in `spec.json` waarvoor geldt:

- `role: "container"`
- de kinderen zijn zelf containers, elk met `layout.display: "grid"` en
  dezelfde `gridTemplateColumns` (bijvoorbeeld `70px 378px 567px`, of
  `150px 433px 433px`)
- elke rij heeft een `border-top` (en de laatste rij vaak ook een
  `border-bottom`), en de rijen worden onder elkaar getoond — niet naast
  elkaar zoals bij `kaartenrij.md`

Dit is dus het verticale tegenovergestelde van `kaartenrij.md`: één kolom
van herhaalde rijen, waarbij elke rij zelf weer een horizontale rij van 2 of
3 vaste kolommen is (bijvoorbeeld nummer/label + titel + tekst).

## Elementor-opbouw

1. **Buitenste container** (de lijst zelf), richting Column.
   - `Gap` = 0 (de rijen worden gescheiden door hun eigen `border` +
     `padding`, niet door een gap).
   - `Border-top` op de buitenste container als `spec.json` dat aangeeft
     (bijvoorbeeld bij `practice-lijst`; bij `matters-lijst` zit de eerste
     rand al op de eerste rij zelf).

2. **Per rij**, in dezelfde volgorde als `children`:
   - Eén Elementor-container, richting Row, `align-items` uit
     `layout.alignItems` van díe rij (`baseline` bij `practice`, `normal`
     bij `matters`).
   - `Gap` = `layout.columnGap` van de rij.
   - `Padding` = `box.paddingTop/Bottom` van de rij (meestal 0 links/rechts).
   - `Border-top` = altijd; `border-bottom` alleen op de laatste rij.
   - Elk kind van de rij krijgt een **vaste breedte** gelijk aan de
     kolombreedte uit `gridTemplateColumns` van díe rij (niet flex-groeien).

3. **Kolominhoud** (per rij, in volgorde):
   - Eerste kolom (smal, bijv. 70px of 150px): `tekst`-rol, klein
     lettertype, vaak in de accentkleur (het volgnummer) of als sans-serif
     label.
   - Tweede kolom: `titel`-rol → Heading-widget.
   - Derde kolom: `tekst`-rol → Text Editor-widget.

## Belangrijk (Elementor-eigenaardigheden)

Zelfde aandachtspunten als bij `sectie-kop.md`: `content_width: "full"`,
`flex`/`width`/`gap`/`align-items` met `!important`, en typografie op zowel
de buitenste `cmp-`class als de binnenste `.elementor-heading-title` /
`.elementor-text-editor p`.
