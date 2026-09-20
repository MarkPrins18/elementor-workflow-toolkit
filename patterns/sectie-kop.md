# Patroon: sectie-kop (label + titel)

**Status:** beproefd (lawyer-homepage: `practice-head`, `approach-head`,
`matters-head`). **Herzien:** de eerdere versie van dit patroon schreef
`!important` en losse CSS-regels voor. Dat is in strijd met `CLAUDE.md`
regel 5a en bovendien niet meer nodig — zie "Waarom hier geen CSS meer
staat" onderaan.

## Herkenning

Past op een `data-cmp`-element in `spec.json` waarvoor geldt:

- `role: "container"`
- `layout.display: "grid"` met twee kolommen, waarbij de eerste smal is
  (bijvoorbeeld 320px) en de tweede breed (bijvoorbeeld 704px)
- de kinderen zijn precies twee: een korte `tekst`-rol (het label, meestal
  uppercase) en een `titel`-rol (de sectiekop, groot lettertype)

Komt typisch voor als eerste kind van een sectie, direct boven de eigenlijke
inhoud (een lijst, een rij kaarten, etc.).

## Elementor-opbouw

1. **Container**, richting Row. (In `spec.json` staat `display:grid`, maar
   met precies twee kinderen is een flex-rij eenvoudiger en identiek.)

   | Instelling | Sleutel | Waarde uit `spec.json` |
   |---|---|---|
   | Richting | `flex_direction` | `"row"` |
   | Gap | `flex_gap` (**niet** `gap`) | `layout.columnGap` |
   | Uitlijning | `flex_align_items` (**niet** `align_items`) | `stretch` |
   | Breedte | `content_width` | `"full"` — nooit `"boxed"`, zie hieronder |
   | Marge onder | `margin` | `box.marginBottom` van het kopcontainer-element |

2. **Label** (eerste kind): Heading-widget, `header_size: "span"`.
3. **Titel** (tweede kind): Heading-widget, `header_size: "h2"`.

4. **Kolomverdeling.** De twee kinderen krijgen géén vaste pixelbreedte
   (`CLAUDE.md` stap 5b). Reken de verhouding uit de gemeten kolommen en zet
   die als `flex-basis` in procenten, of laat de titel groeien en het label
   op zijn inhoud staan:

   - Label: `_flex_size: "none"` plus `width` met unit `custom`, waarde
     `min(320px, 100%)` — zo houdt het label zijn maat op desktop, maar kan
     het op smalle schermen krimpen.
   - Titel: `_flex_size: "grow"` (of laat de standaard `flex-grow:1` staan
     die Elementor kinderen van een `row`-container al geeft).

   Gemeten `320px` en `704px` is dus een **verhouding van ±31/69**, geen
   instructie om twee vaste breedtes te zetten. Controleer dit met
   `node compare.js <config> --responsive`: vaste breedtes vallen daar door
   de mand zodra het scherm tussen twee breakpoints in staat.

5. **Typografie** per widget uit `typography` van dát kind. Elementor zet die
   waarden zelf op de binnenste tekstlaag; je hoeft daar niets extra's voor
   te doen.

## Belangrijk (Elementor-eigenaardigheden, bevestigd in de plugin-broncode)

- **Nooit `content_width: "boxed"` op deze container.** Elementor's
  `.e-con-boxed.e-flex`-regel forceert `flex-direction:column` en reset
  `justify-content`, wat een horizontale kop onmogelijk maakt. Gebruik
  `"full"` en regel de content-breedte op de sectie-container erboven.
- **De groepscontrole-sleutels hebben een `flex_`-prefix.** `justify_content`
  en `align_items` doen niets; de echte sleutels zijn
  `flex_justify_content` en `flex_align_items` (bevestigd in
  `includes/controls/groups/flex-container.php`, `'name' => 'flex'`).
  Hetzelfde geldt voor `gap` → `flex_gap` (met een `size`-veld).
- **Kinderen van een `row`-container krijgen standaard `flex-grow:1`.** Moet
  een kind op zijn eigen inhoud blijven, zet dan `_flex_size: "none"`
  (groepscontrole `_flex`, `includes/controls/groups/flex-item.php`).

## Waarom hier geen CSS meer staat

De vorige versie van dit patroon gaf drie CSS-instructies. Alle drie zijn
vervallen, en het is nuttig om te weten waarom — anders komt de reflex terug
zodra iets niet meteen werkt:

1. *"Elementor's `.e-con.e-flex` (2 classes) wint van `.cmp-*` (1 class),
   dus forceer met `!important`."* — Dat klopte, maar het probleem ontstond
   alleen doordat layout via een eigen `.cmp-*`-CSS-regel werd gezet. Zet je
   `flex_direction`, `flex_gap` en `flex_align_items` via Elementor's eigen
   instellingen, dan schrijft Elementor zijn eigen regel met dezelfde
   specificiteit en is er niets te winnen of te verliezen.
2. *"Container-padding rendert niet altijd door."* — Dat is het
   sleutelnaam-probleem hierboven, niet een beperking van Elementor. De
   waarde stond correct in `_elementor_data`, maar de CSS-generator las een
   andere sleutel.
3. *"Zet typografie op zowel de buitenste class als op
   `.cmp-X .elementor-heading-title`."* — Dat was nodig omdat `compare.js`
   de buitenste wrapper mat, die de opmaak van het thema erft. Dat is nu in
   het meetscript opgelost: stijl wordt gemeten op de binnenste tekstlaag,
   precies waar Elementor 'm ook toepast. De dubbele CSS-regel loste dus een
   meetfout op, geen bouwfout.

Werkt een instelling niet, loop dan deze volgorde af vóórdat je aan CSS
denkt: (a) klopt de sleutelnaam, (b) is de CSS geregenereerd en de cache
geleegd, (c) bestaat er een andere native widget-instelling voor. Pas daarna,
en alleen met Mark's expliciete akkoord, komt custom CSS in beeld — voor één
element, nooit voor een hele sectie. Controleer het resultaat met
`node check-native.js <elementor-data.json>`.

## Variant zonder aparte kopcontainer (`contact`)

Bij `contact` staan label, titel en intro-tekst niet in een eigen
`sec-head`-container, maar direct als eerste drie kinderen van
`contact-inhoud` (een verticale stapel). Het label is daar een kale inline
`<span>`. Bouw dat als Heading-widget met `header_size: "span"` — dezelfde
aanpak als het logo en de navigatielinks in `header-navigatie.md`. De
HTML-widget die hier vroeger voor nodig leek, is dat niet meer: het
hoogteverschil dat die fallback moest opvangen was een meetartefact, dat
`compare.js` nu zelf afhandelt (zie `header-navigatie.md`, laatste punt).
