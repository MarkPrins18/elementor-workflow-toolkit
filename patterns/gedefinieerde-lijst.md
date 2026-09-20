# Patroon: gedefinieerde lijst (label + waarde, herhaald)

**Status:** concept (bevestigd op het lawyer-homepage-project: `hero-aside`
en `contact-details`)

## Herkenning

Past op een `data-cmp`-element in `spec.json` waarvoor geldt:

- `role: "container"`
- de kinderen zijn zelf containers met telkens precies twee kinderen: een
  korte `tekst`-rol (het label, klein/uppercase) en een `tekst`- of
  `link`-rol (de waarde), onder elkaar
- elk kind-item heeft een `border-top` (of `border-bottom`) als scheiding,
  met `padding-top`/`padding-bottom`

Dit lijkt op `verticale-stapel.md` maar dan **herhaald** (net als
`kaartenrij.md` dat doet met verticale-stapel-kaarten) — met dit verschil
dat elk item hier maar twee vaste onderdelen heeft (label + waarde), en de
scheiding tussen items via `border`, niet via `gap`.

## Elementor-opbouw

1. **Buitenste container**, richting Column (verticaal, `hero-aside`) of
   Row-met-wrap (grid van 2 kolommen, `contact-details` / `partner-credentials`
   — gebruik dan `flex-wrap:wrap` met een vaste breedte per item die twee
   per rij past, en `gap` voor zowel de rij- als kolomruimte).

2. **Per item**, in volgorde:
   - Eén Elementor-container, richting Column, `gap: 0`.
   - `Padding-top`/`Padding-bottom` + `border-top` (en bij het laatste item
     eventueel ook `border-bottom`) uit `spec.json` van dát item.
   - **Label**: Heading-widget, klein sans-serif lettertype, uppercase,
     `margin-bottom` gelijk aan de waarde uit `spec.json`.
   - **Waarde**: als het een `link`-rol is (bijvoorbeeld een telefoonnummer
     of e-mailadres), Heading-widget met `link`. Als het een kale
     `tekst`-rol zonder blok-element is (bijvoorbeeld met een `<br>` erin,
     zoals een adres), gebruik dan **niet** een gewone widget maar de
     HTML-widget-fallback (zie hieronder) — anders klopt de hoogte niet.

## Belangrijk (Elementor-eigenaardigheden)

- Container-padding via de MCP-tool rendert niet altijd door naar de
  uiteindelijke CSS, ook al staat de waarde goed in de Elementor-data.
  Herbevestig padding/gap altijd expliciet via CSS met `!important`.
- **Kale inline tekst as laatste kind** (geen volgend element in dezelfde
  container dat erdoor zou verschuiven): gebruik een HTML-widget met een
  losse `<span>` (of `<a>`), zodat de `cmp-`class op een écht inline element
  staat in plaats van op Elementor's altijd-geblockificeerde widget-wrapper.
  Dit gaf in de praktijk een exacte match zonder verdere correcties nodig
  te hebben (zie `contact-detail-3-waarde` en `contact-detail-4-waarde`).
- **Kale inline label/tekst die WEL gevolgd wordt door een volgend element**
  in dezelfde flex-column (bijvoorbeeld een `sec-head`-label die niet in een
  grid zit, zoals `hero-label` of `contact-label`): ook de HTML-widget-
  fallback gebruiken, want dan neemt de buitenste (ongetagde) wrapper vanzelf
  de juiste line-height-hoogte aan in de flow — zonder margin-hacks.
- Bij een **grid van 2 kolommen** (`partner-credentials`,
  `contact-details` is hier juist verticaal): let op dat de marge tussen het
  vorige blok-element en dit grid-blok in de bron-HTML kan *collapsen*
  (block-flow gedrag). Flex-items collapsen nooit. Zie de toelichting in
  `partner-credentials`'s marginTop-afwijking (gemeld aan Mark) voor hoe dat
  is opgevangen.
