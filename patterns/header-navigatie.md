# Patroon: header met logo + navigatie

**Status:** beproefd (cinema-homepage: `header`)

## Herkenning

Past op een root-`data-cmp`-element in `spec.json` waarvoor geldt:

- `role: "container"`, vaak sticky/fixed in de bron-CSS
- precies één kind: een binnen-container op boxed content-breedte
- dat binnen-kind heeft twee kinderen: een logo (`knop`- of `titel`-rol) en
  een navigatie-container (`role: "container"`, `layout.display: "flex"`,
  `flexDirection: "row"`) met een rij tekstlinks en meestal één knop die
  er als losse CTA uitziet (andere achtergrond/kleur dan de overige links)

Dit is dus niet `sectie-kop.md` (dat is titel+label, geen logo+nav) en ook
geen `verticale-stapel`/`kaartenrij`.

## Elementor-opbouw

1. **Buitenste container** (`header`): `html_tag: "header"`,
   `content_width: "full"`, achtergrond/border-bottom uit `spec.json`.
   `flex_align_items: "center"` (LET OP: niet `align_items`, zie hieronder).
2. **Binnen-container** (`header-binnen`): `content_width: "full"` (NOOIT
   `"boxed"`, zie `sectie-kop.md` voor waarom), `margin: 0 auto` en een
   `width` met unit `"custom"` en als waarde `min(<content-breedte>px, 100%)`
   — bijvoorbeeld `min(1180px, 100%)`. Zo krijg je het boxed-effect zonder
   de boxed-bug, én zonder een vaste pixelbreedte die tussen de breakpoints
   in stukloopt (`CLAUDE.md` stap 5b). Verder `flex_direction: "row"`,
   `flex_justify_content: "space-between"`, `flex_align_items: "center"`,
   `padding` uit `spec.json`.

   *Op het cinema-project stond hier een vaste px-`width` met
   `width_mobile: 100%`. Dat werkte op de twee gemeten breedtes, maar laat
   een gat ertussen; de `min()`-variant is de opvolger. Bevestig 'm op het
   eerstvolgende project met `node compare.js <config> --responsive` en
   werk deze regel bij.*
3. **Logo**: Heading-widget, `header_size: "span"`, met `link`. In
   `spec.json` heeft dit element `role: "link"` (een `<a>` zonder eigen
   achtergrond of rand) — dus géén Button-widget.
4. **Navigatie-container** (`header-nav`): `html_tag: "nav"` — anders wordt
   het een `<div>` en verdwijnt het navigatie-landmark uit de pagina (zie
   `CLAUDE.md` 5c; `check-semantiek.js` vangt dit). Verder zelfde
   `flex_*`-opbouw als hierboven, plus **verplicht**
   `width: {unit:"custom", size:"auto"}` (zie
   "Belangrijk" hieronder) en `_flex_size: "none"` op ZICHZELF èn op ELK
   kind (elke link + de CTA-knop) — anders rekt de navigatie uit tot de
   volledige beschikbare breedte in plaats van op de inhoud te blijven.
5. **Links**: Heading-widget, `header_size: "span"`, met `link`
   (`role: "link"` in `spec.json`).
6. **CTA-knop** (indien aanwezig): Button-widget. In `spec.json` is dit het
   enige nav-item met `role: "knop"`, doordat het een eigen achtergrond of
   rand heeft. Padding via `text_padding` (NIET `button_padding`, zie
   hieronder).

## Belangrijk (Elementor-eigenaardigheden, bevestigd in de plugin-broncode)

- **`justify_content`/`align_items` werken niet** op containers in
  Elementor 4.2.4 — de echte sleutel is **`flex_justify_content`** /
  **`flex_align_items`** (groepscontrole-prefix `flex_`, zelfde patroon als
  het al bekende `gap` → `flex_gap`, zie `CLAUDE.md` 5a). Bevestigd in
  `includes/controls/groups/flex-container.php` (`'name' => 'flex'`).
- **Button-padding heet `text_padding`**, niet `button_padding`. Bevestigd
  in `includes/widgets/traits/button-trait.php`.
- **Kinderen van een `row`-richting container krijgen standaard
  `flex-grow:1`** (Elementor's eigen `--container-widget-flex-grow: 1`
  voor de `row`-preset). Een container/widget die op zijn EIGEN inhoud moet
  blijven (zoals de navigatie, of losse nav-items), moet expliciet
  `_flex_size: "none"` krijgen (groepscontrole `_flex`, bevestigd in
  `includes/controls/groups/flex-item.php`, geregistreerd met
  `'name' => '_flex'`).
- **`content_width: "full"` zonder eigen `width` valt terug op 100%** van
  de ouder (de standaard-placeholder). Voor een container die alleen op
  zijn inhoud moet blijven (zoals de navigatie), zet `width` op
  `{unit:"custom", size:"auto"}`.
- **Nieuwe pagina staat standaard op het thema-paginasjabloon**, waardoor
  het actieve thema (hier: Twenty Twenty-Five, een block-thema) zijn eigen
  header/footer/content-wrapper (met een eigen, smallere content-breedte)
  om de Elementor-pagina heen zet. Zet `_wp_page_template` op
  `elementor_canvas` zodra het ontwerp een eigen header/footer heeft (zoals
  hier), zodat er geen thema-wrapper meer omheen zit.
- **Containers hebben geen eigen typografie-instelling.** Dat klopt: een
  container kent die control niet. Maar de vroegere conclusie dat Elementor
  typografie "altijd op de binnenste tekstlaag zet, nooit op de wrapper" is
  te grof. Uit de `selectors` van de style-controls in de plugin-broncode
  blijkt dat het **per widget verschilt**:

  | Widget | Typografie en kleur | Padding, margin, achtergrond |
  |---|---|---|
  | Heading | `.elementor-heading-title` | de wrapper (Advanced-tab) |
  | Text Editor | **de wrapper zelf** (`{{WRAPPER}}`), erft omlaag | de wrapper |
  | Button | `.elementor-button` | `.elementor-button` |

  Let daarbij op één valkuil: **`.elementor-text-editor` bestaat alleen in
  de editor.** De widget voegt die class toe binnen
  `if ( $should_render_inline_editing )`, dus op de live pagina is hij er
  niet. Bouw er geen enkele aanname of selector op.

  De buitenste wrapper erft wel het thema's `body`-standaard
  (font-size/regelhoogte via `theme.json`). Bij een inline tekstlaag
  (`header_size: "span"`) geeft dat een CSS-"strut" die de doos-hoogte van
  de wrapper opblaast zonder dat je het ziet. `compare.js` meet daarom de
  doos op de laag die de opmaak draagt, en houdt voor dat strut-geval een
  instelbare extra tolerantie aan (`tolerances.strut`, standaard 12px op
  `y`/`height`). Zie `WIDGETLAGEN` in `compare.js`.
- **Lettertype-substitutie:** een lettertype uit de bron-CSS dat niet lokaal
  geïnstalleerd is (bv. Didot, Bodoni MT), maar wel als Google Font bestaat
  (bv. Playfair Display, verderop in dezelfde `font-family`-stack), gewoon
  als losse naam invullen — Elementor herkent en laadt Google Fonts
  automatisch. Geef in dat geval NOOIT de volledige komma-gescheiden
  fallback-stack door aan één typography-veld: Elementor quote't de hele
  waarde als één string, wat de fallback-keten breekt.

## `compare.js`-configuratie

Gebruik `"roots": ["<sectienaam>"]` om een sectie apart te kunnen
verifiëren terwijl latere secties nog niet gebouwd zijn (zie
`config.example.json`).
