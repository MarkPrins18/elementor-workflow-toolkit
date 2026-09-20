# Patroon: gedefinieerde lijst (label + waarde, herhaald)

**Status:** beproefd (lawyer-homepage: `hero-aside`, `contact-details`).
**Herzien:** de eerdere versie schreef `!important` voor om padding en gap te
"herbevestigen", en maakte de HTML-widget een standaardstap voor kale inline
tekst. Beide zijn vervallen; zie "Wat er met de HTML-widget-fallback gebeurd
is" onderaan.

## Herkenning

Past op een `data-cmp`-element in `spec.json` waarvoor geldt:

- `role: "container"`
- de kinderen zijn zelf containers met telkens precies twee kinderen: een
  korte `tekst`-rol (het label, klein/uppercase) en een `tekst`- of
  `link`-rol (de waarde), onder elkaar
- elk kind-item heeft een `borderTopWidth` (of `borderBottomWidth`) als
  scheiding, met bijbehorende padding

Dit lijkt op `verticale-stapel.md` maar dan **herhaald** (zoals
`kaartenrij.md` dat doet met kaarten), met dit verschil dat elk item hier
maar twee vaste onderdelen heeft en de scheiding via een rand loopt, niet
via een gap.

## Elementor-opbouw

1. **Buitenste container**, richting Column (verticaal, `hero-aside`) of
   Row met wrap (twee kolommen, `contact-details` / `partner-credentials`).
   Bij die tweede variant: `flex_direction: "row"`, `flex_wrap: "wrap"`, en
   per item een `flex-basis` van ongeveer 50% minus de halve gap — dus geen
   vaste pixelbreedte (`CLAUDE.md` stap 5b). `flex_gap` regelt zowel de rij-
   als de kolomruimte.

2. **Per item**, in volgorde:
   - Eén Elementor-container, richting Column, `flex_gap: 0`.
   - `padding` boven/onder en de rand per zijde uit `spec.json` van dát item
     (`background.borderTopWidth` / `borderTopColor` / `borderTopStyle`).
     Bij het laatste item vaak ook een rand onder.
   - **Label**: Heading-widget, `header_size: "span"`, klein sans-serif,
     uppercase. De ruimte onder het label komt uit `box.marginBottom` van
     het label zelf.
   - **Waarde**: bij `role: "link"` (een telefoonnummer of e-mailadres) een
     Heading-widget met `link`. Bij `role: "tekst"` een Text Editor-widget,
     of een Heading-widget met `header_size: "span"` als het om één regel
     zonder opmaak gaat.

## Belangrijk (Elementor-eigenaardigheden)

- **Sleutelnamen.** `flex_gap` (met `size`-veld), `flex_justify_content`,
  `flex_align_items`, en `_flex_size: "none"` op een kind dat niet mag
  uitrekken. De ongeprefixte varianten worden wél opgeslagen maar nooit naar
  CSS vertaald — dat is de werkelijke oorzaak van de oude klacht dat
  "container-padding niet doorrendert".
- **Marge-collaps bij een grid van twee kolommen.** In de bron-HTML kan de
  marge tussen het vorige blok-element en dit blok *collapsen* (normaal
  block-flow gedrag). Flex-items collapsen nooit, dus in Elementor komt die
  marge er wél bij. Reken dat verschil één keer uit en neem de
  gecollapste waarde over, of zet de marge op de ouder in plaats van op
  beide buren. Dit is een echt verschil tussen de twee, geen meetfout — meld
  het aan Mark in plaats van het met een correctie te verbergen.

## Wat er met de HTML-widget-fallback gebeurd is

De oude versie van dit patroon zei: gebruik voor kale inline tekst (een
adres met een `<br>`, een los label) géén gewone widget maar een HTML-widget
met een `<span>`, "anders klopt de hoogte niet". Die instructie is vervallen,
om twee redenen:

1. **Het was een meetprobleem, geen bouwprobleem.** De hoogte klopte wél op
   het scherm; wat niet klopte was de gemeten doos-hoogte van Elementor's
   buitenste widget-wrapper, die de regelhoogte van het thema erft als
   onzichtbare "strut". `compare.js` meet inmiddels de binnenste tekstlaag
   en geeft `y`/`height` van tekst-widgets een ruimere tolerantie precies
   voor dit effect. Er is dus niets meer op te lossen in de bouw.
2. **Het is een overtreding van regel 5a.** Een HTML-widget voor structuur
   mag alleen na Mark's expliciete akkoord, voor één detail. Als
   standaardstap in een patroon gaat dat per definitie mis.

Gebruik in plaats daarvan een Heading-widget met `header_size: "span"`.
Dat is dezelfde oplossing die `header-navigatie.md` voor het logo en de
navigatielinks gebruikt, en die daar op een echt project bevestigd is.
Voor een adres met een regelafbreking: een Text Editor-widget, waarin de
regelafbreking gewoon onderdeel van de tekst is.
