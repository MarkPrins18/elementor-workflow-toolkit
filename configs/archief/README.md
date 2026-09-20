# Archief — niet meer te herhalen runs

Deze configs horen bij het lawyer-homepage-project. Ze staan hier apart
omdat ze **niet te reproduceren zijn**: ze verwijzen alle zeven naar

```
C:/laragon/www/ultimate-workflow/ai-workflow/design/lawyer-homepage (1).html
```

en dat ontwerpbestand is nooit meegecommit. Het staat alleen op de machine
waarop het destijds gedraaid is. De bijbehorende rapporten in
`../../reports/archief/` melden bijna allemaal "0 afwijkingen", maar niemand
kan die uitkomst nog nakijken — ook Mark niet, op een andere machine.

Daarnaast missen ze allemaal een `roots`-veld, waardoor ze in feite de hele
pagina vergeleken in plaats van één sectie. `approach.json`, `matters.json`
en `full-page.json` deden dus hetzelfde werk onder een andere naam.

## Wat hiervan te leren valt

1. **Commit het goedgekeurde ontwerp mee.** Zonder de HTML in `design/` is
   een geslaagde run een bewering, geen bewijs.
2. **Gebruik repo-relatieve paden.** `./design/<ontwerp>.html`, nooit een
   pad dat met `C:/` of `/Users/` begint.
3. **Zet altijd `roots`.** Eén config per root uit `spec.json`, zoals
   `CLAUDE.md` stap 7 het beschrijft.

## Weer bruikbaar maken

Zet `lawyer-homepage (1).html` in `design/`, hernoem het naar een pad zonder
spaties en haakjes, pas `htmlPath` aan naar `./design/<naam>.html`, voeg een
`roots`-veld toe, en verplaats de config terug naar `configs/`. Draai daarna
opnieuw — pas dán zegt het rapport weer iets.
