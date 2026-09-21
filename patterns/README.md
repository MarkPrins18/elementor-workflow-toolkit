# Patronen — hoe je er één kiest

Elk bestand hier beschrijft één terugkerend soort blok: welke Elementor-
container, welke widgets, in welke volgorde, en welk veld uit `spec.json`
naar welke instelling gaat. Dit bestand beschrijft wat voor allemaal geldt.

## Kiezen: de eerste die past, van specifiek naar algemeen

Loop de lijst in deze volgorde af en neem het **eerste** patroon waarvan de
"Herkenning" klopt. De volgorde is niet willekeurig: de bovenste patronen
beschrijven een specifiekere structuur, en die zou anders ook onder een
algemener patroon vallen.

| # | Patroon | Herken je aan |
|---|---|---|
| 1 | `header-navigatie.md` | root-container, vaak sticky; één binnen-container met een logo en een navigatie ernaast |
| 2 | `sectie-kop.md` | precies twee kinderen naast elkaar: een kort `tekst`-label en een `titel` |
| 3 | `genummerde-lijst.md` | kinderen zijn containers met dezelfde `gridTemplateColumns`, onder elkaar, gescheiden door randen |
| 4 | `gedefinieerde-lijst.md` | kinderen zijn containers met precies twee kinderen (label + waarde), gescheiden door randen |
| 5 | `kaartenrij.md` | kinderen zijn containers, naast elkaar in een rij of grid |
| 6 | `verticale-stapel.md` | kinderen zijn losse elementen (`titel`, `tekst`, `link`, `knop`, `afbeelding`) onder elkaar |

Twee voorbeelden van waarom de volgorde uitmaakt:

- Een header is óók "een rij met container-kinderen", dus `kaartenrij` zou
  matchen. `header-navigatie` staat daarom hoger.
- Een kaart in een kaartenrij is zelf een verticale stapel. `kaartenrij`
  beschrijft alleen de buitenste rij en verwijst voor de inhoud van elke
  kaart door naar `verticale-stapel`.

Past er niets? Bouw het zo zorgvuldig mogelijk, laat het controleren met
stap 7 van `CLAUDE.md`, en schrijf het daarna pas als nieuw bestand hier weg
(status: concept).

## Wat voor elk patroon geldt

Deze regels staan niet in elk bestand herhaald:

1. **Kies eerst `container_type`.** Een flex-container gebruikt de
   `flex_`-sleutels (`flex_direction`, `flex_gap`, `flex_wrap`,
   `flex_justify_content`, `flex_align_items`); een grid-container gebruikt
   de sleutels zónder prefix (`columns_grid`, `rows_grid`, `gaps`,
   `auto_flow`, `justify_items`, `align_items`, `justify_content`,
   `align_content`). Ze werken niet door elkaar heen. Zie `CLAUDE.md` 5a.
2. **Zet `html_tag`** op elke container die in de bron een betekenisvol
   element was: `header`, `nav`, `main`, `footer`, `section`, `article`,
   `aside`. Standaard is `div`, en dat is bijna nooit wat de bron bedoelde.
   Zie `CLAUDE.md` 5c.
3. **Geen vaste pixelbreedtes uit `geometry.width` of
   `gridTemplateColumns`.** Die waarden zijn metingen op één breedte. Reken
   ze om naar verhoudingen. Zie `CLAUDE.md` 5b.
4. **Gap voor de ruimte tussen kinderen, padding voor ruimte binnen een
   blok, margin alleen als uitzondering** — en nooit gap en margin samen in
   dezelfde richting. Zie `CLAUDE.md` 3.
5. **Typografie hoeft maar één keer.** Staat de Theme Style goed (stap 4),
   dan hebben de meeste widgets geen eigen typografie nodig. Waar het wel
   moet: één keer via de widget-instelling, nooit via een extra CSS-regel.
6. **Geen custom CSS, geen `!important`, geen HTML-widget** om een patroon
   kloppend te krijgen. Werkt iets niet, controleer dan eerst of de sleutel
   bij het juiste `container_type` hoort. Zie `CLAUDE.md` 5a.

## Statuslabels

- **concept** — opgeschreven, maar nog niet bevestigd met een geslaagde
  `compare.js`-run op een echt project.
- **beproefd** — minstens één keer gebruikt op een echt project, met een
  geslaagde `compare.js`-run. Het project staat erbij.

Zet een patroon pas op "beproefd" als je de run echt hebt gedraaid, en
noteer welk project het bevestigde. Een patroon dat er goed uitziet is geen
beproefd patroon.

## Een patroon bijwerken

Klopt er iets niet meer, pas het dan hier aan in plaats van het per project
te omzeilen. Schrijf er bij een correctie kort bij wat er eerder stond en
waarom het veranderd is — dat voorkomt dat de oude aanpak later opnieuw
opduikt omdat iemand zich de reden niet meer herinnert.
