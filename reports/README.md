# Rapporten

Hier komt per `compare.js`-run een JSON-rapport terecht, met een samenvatting
per breakpoint (hoeveel elementen vergeleken, hoeveel metingen, hoeveel
afwijkingen) en daarna alle metingen — ook de geslaagde. `screenshot-diff.js`
schrijft zijn afbeeldingen naar `screenshots/`.

Een rapport is pas bewijs als de run te herhalen is. Dat betekent: het
goedgekeurde ontwerp staat in `design/`, de config in `configs/` verwijst er
repo-relatief naar, en beide zijn mee gecommit. Zie `../configs/archief/`
voor wat er gebeurt als dat niet zo is.

## Let op: `hero.json` en `header.json` zijn verouderd

Die twee dateren van vóór de herziening van de toolkit en zeggen "0
afwijkingen" onder de oude, te ruime instellingen:

- ze zijn gedraaid met één globale `tolerancePx` (20 respectievelijk 6),
  die toen ook lettergroottes en kleuren verruimde;
- ze zijn alleen op desktop (1440px) gedraaid, dus tablet en mobiel zijn
  nooit gemeten;
- bij `hero` stond `marginLeft` niet in `properties`, waardoor een bekend
  verschil niet in het rapport terechtkwam.

De bijbehorende configs zijn inmiddels aangepast: typografie en kleur staan
weer streng, er zijn vier breakpoints geconfigureerd, en `marginLeft` staat
er weer in. Deze twee rapporten worden dus pas weer geldig nadat ze opnieuw
gedraaid zijn tegen de staging-URL. Verwacht daarbij afwijkingen op tablet
en mobiel: die zijn nooit eerder gecontroleerd.
