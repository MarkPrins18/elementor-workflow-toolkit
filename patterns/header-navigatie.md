# Patroon: header met logo + navigatie

**Status:** concept (bevestigd op het cinema-homepage-project: `header`)

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
   `"boxed"`, zie `sectie-kop.md` voor waarom), zelf een expliciete `width`
   (desktop, in px) + `width_mobile: 100%` + `margin: 0 auto` (unit
   `"custom"`) om het boxed-effect zonder de boxed-bug te bereiken.
   `flex_direction: "row"`, `flex_justify_content: "space-between"`,
   `flex_align_items: "center"`, `padding` uit `spec.json`.
3. **Logo**: Heading-widget, `header_size: "span"`, met `link`.
4. **Navigatie-container** (`header-nav`): zelfde `flex_*`-opbouw als
   hierboven, plus **verplicht** `width: {unit:"custom", size:"auto"}` (zie
   "Belangrijk" hieronder) en `_flex_size: "none"` op ZICHZELF èn op ELK
   kind (elke link + de CTA-knop) — anders rekt de navigatie uit tot de
   volledige beschikbare breedte in plaats van op de inhoud te blijven.
5. **Links**: Heading-widget, `header_size: "span"`, met `link`.
6. **CTA-knop** (indien aanwezig): Button-widget. Padding via `text_padding`
   (NIET `button_padding`, zie hieronder).

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
- **Containers hebben geen eigen typografie-instelling.** Elementor past
  font/kleur alleen toe op de binnenste tekstlaag van een widget
  (`.elementor-heading-title` / `.elementor-button` /
  `.elementor-text-editor`), nooit op de buitenste `.elementor-element`-
  wrapper die de `cmp-`class draagt. Die buitenste wrapper erft bovendien
  het thema's eigen `body`-standaard (font-size/regelhoogte/kleur via
  `theme.json`), wat geen zichtbaar effect heeft maar wel de doos-hoogte
  van die wrapper opblaast via de CSS-"strut". Er is geen native Elementor-
  instelling om dit op te lossen (drie keer bevestigd in de broncode).
  **Oplossing zit in `compare.js` zelf, niet in Elementor:** stijl wordt
  gemeten op de binnenste tekstlaag (wat je echt ziet), typografie-checks
  worden overgeslagen op elementen zonder eigen tekst, en `y`/`height` van
  tekst-widgets krijgen een ruimere tolerantie (12px) specifiek voor dit
  strut-effect. Zie de commentaren in `compare.js` bij `TEXT_WIDGET_SELECTOR`
  en `STRUT_TOLERANCE_PX`.
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
