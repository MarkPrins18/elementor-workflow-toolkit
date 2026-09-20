# Ontwerpen

Zet hier per project de goedgekeurde HTML en de spec.json die daaruit volgt.

Het ontwerpbestand hoort **mee de repo in**. Zonder dat bestand is een
geslaagde `compare.js`-run niet te herhalen en dus geen bewijs meer; zie
`../configs/archief/README.md` voor hoe dat in de praktijk misging.

## Spec maken

```
node extract-spec.js design/<ontwerp>.html --breedtes=1440,1024,767,390
```

Dat levert één spec per breedte op. Meet altijd op alle breakpoints uit
`CLAUDE.md` stap 0: zonder die metingen is er voor tablet en mobiel geen
bron van waarheid, en wordt daar dus geschat.

In deze map staat alleen de 1440px-spec van het voorbeeldproject
(`cinema-homepage.spec.json`), als referentie voor het formaat. Genereer
voor een echt project de volledige set.

## Voordat je om akkoord vraagt

```
node check-bouwbaar.js design/<ontwerp>.html
```

Op `cinema-homepage.html` meldt dit 18 punten die Elementor niet native kan:
zeven pseudo-elementen (de inkepingen in de ticketjes), acht gestapelde
CSS-gradients (alle filmposters), een `transform: rotate(1.6deg)` op de
hero-poster, een `backdrop-filter` op de header, en zeventien elementen die
pas door JavaScript worden aangemaakt (de dagkiezer en de filmlijst).

Dat is precies het soort werk dat anders pas tijdens het bouwen opvalt, als
het akkoord al gegeven is — en dan staat er alleen nog de keuze tussen een
slechter ontwerp of een overtreding van regel 5a.
