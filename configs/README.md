# Configs

Eén configbestand per root uit `spec.json`, gebaseerd op
`../config.example.json`. De naam van het bestand is de naam van de root, dus
`hero.json` hoort bij `"roots": ["hero"]`.

Dat `roots`-veld is niet optioneel. Zonder dat veld vergelijkt `compare.js`
de hele pagina, en doet elke sectie-config dus hetzelfde werk onder een
andere naam. Zie `archief/README.md` voor hoe dat er in de praktijk uitzag.

Drie dingen die een run ongeldig maken in plaats van geslaagd:

- een `roots`-naam die niet in het ontwerp voorkomt (een typefout leverde
  vroeger gewoon "GESLAAGD" op, met nul gemeten elementen);
- nul vergeleken elementen, om welke reden dan ook;
- een dubbele naam, in het ontwerp of in Elementor.

Verruim je een tolerantie boven 1px, zet er dan een `_toleranceNote` bij met
de reden. Het script toont die notitie bij elke run en waarschuwt als hij
ontbreekt. Verruim daarbij alleen wat je écht moet verruimen: `tolerances`
kent aparte waarden voor `geometry`, `typography`, `color` en losse
eigenschappen, juist zodat speling op posities de controle op lettergroottes
niet meesleept.

Laat een eigenschap nooit uit `properties` weg om een bekend verschil te
verbergen. Dan staat het niet in het rapport, en weet niemand er later nog
van. Zet 'm erin, laat 'm falen, en leg het verschil aan Mark voor.
