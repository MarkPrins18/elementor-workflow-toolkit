# Patroon: genummerde lijst (verticaal gestapelde rijen)

**Status:** beproefd (lawyer-homepage: `practice-lijst`, `matters-lijst`).
**Herzien:** de eerdere versie verwees voor de opbouw door naar
`sectie-kop.md`'s `!important`-instructies en schreef vaste pixelbreedtes per
kolom voor. Beide zijn vervangen, zie `sectie-kop.md` → "Waarom hier geen CSS
meer staat" en `CLAUDE.md` stap 5b.

## Herkenning

Past op een `data-cmp`-element in `spec.json` waarvoor geldt:

- `role: "container"`
- de kinderen zijn zelf containers, elk met `layout.display: "grid"` en
  dezelfde `gridTemplateColumns` (bijvoorbeeld `70px 378px 567px`)
- elke rij heeft een `borderTopWidth` (en de laatste rij vaak ook een
  `borderBottomWidth`), en de rijen staan onder elkaar

Dit is het verticale tegenovergestelde van `kaartenrij.md`: één kolom van
herhaalde rijen, waarbij elke rij zelf een horizontale rij van 2 of 3
kolommen is (bijvoorbeeld nummer + titel + tekst).

## Elementor-opbouw

1. **Buitenste container** (de lijst zelf), richting Column.
   - `flex_gap` = 0. De rijen worden gescheiden door hun eigen rand en
     padding, niet door een gap. Zet dus géén gap én margin voor dezelfde
     richting (`CLAUDE.md` regel 3).
   - Rand boven op de buitenste container als `spec.json` dat aangeeft
     (bijvoorbeeld bij `practice-lijst`; bij `matters-lijst` zit de eerste
     rand al op de eerste rij zelf).

2. **Per rij**, in dezelfde volgorde als `children`:

   | Instelling | Sleutel | Waarde uit `spec.json` |
   |---|---|---|
   | Richting | `flex_direction` | `"row"` |
   | Uitlijning | `flex_align_items` | `layout.alignItems` van díe rij |
   | Gap | `flex_gap` | `layout.columnGap` van díe rij |
   | Padding | `padding` | `box.paddingTop` / `box.paddingBottom` |
   | Rand | `border_width` per zijde | `background.borderTopWidth` etc. |

3. **Kolombreedtes: verhoudingen, geen vaste pixels.** `spec.json` geeft
   `gridTemplateColumns` altijd in pixels terug, ook als de bron `1fr` of
   `auto` gebruikte — de flexibiliteit is dus al weg vóórdat jij iets kiest.
   Reken de gemeten waarden terug naar een verdeling:

   - Smalle vaste kolom (een volgnummer of label, bijvoorbeeld 70px): dit is
     de uitzondering uit stap 5b waar een echte vaste maat klopt. Zet
     `_flex_size: "none"` en een `width` met unit `custom`, waarde
     `min(70px, 20%)`.
   - Overige kolommen: laat ze groeien. `378px` en `567px` naast elkaar is
     een verhouding van ±40/60, dus `flex-basis` 40% en 60%, of
     `_flex_size: "grow"` op beide met een `flex-grow` van 40 en 60.

   Controleer dit altijd met `node compare.js <config> --responsive`. Een
   rij die met drie vaste breedtes is gebouwd, valt daar door de mand zodra
   het scherm tussen twee breakpoints in staat.

4. **Kolominhoud** (per rij, in volgorde):
   - Eerste kolom (smal): `tekst`-rol, klein lettertype, vaak in de
     accentkleur (het volgnummer) of als sans-serif label.
   - Tweede kolom: `titel`-rol → Heading-widget.
   - Derde kolom: `tekst`-rol → Text Editor-widget.

## Belangrijk (Elementor-eigenaardigheden)

Dezelfde drie als bij `sectie-kop.md`, kort herhaald:

- `content_width: "full"` op de rij-containers: die zitten al in een sectie
  die de content-breedte regelt, dus een tweede begrenzing is dubbelop.
  (Boxed is hier niet verboden — dat werkt prima met een rij, zie
  `CLAUDE.md` 5b — alleen overbodig.)
- De groepscontrole-sleutels hebben een prefix: `flex_gap`,
  `flex_justify_content`, `flex_align_items`, en `_flex_size` op een kind.
- Typografie hoef je maar één keer te zetten, via de widget-instellingen.
  Elementor past die zelf op de binnenste tekstlaag toe, en `compare.js`
  meet daar ook. De oude instructie om typografie óók via
  `.cmp-X .elementor-heading-title` te zetten is vervallen.

Werkt iets niet, controleer dan eerst de sleutelnaam en de cache voordat je
aan CSS denkt, en bevestig het eindresultaat met
`node check-native.js <elementor-data.json>`.
