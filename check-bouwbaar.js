#!/usr/bin/env node
/**
 * check-bouwbaar.js — de controle bij CLAUDE.md stap 1.
 *
 * Stap 1 is het enige moment waarop een mens visueel oordeelt. Maar "vindt
 * Mark het mooi" is niet hetzelfde als "is dit met Elementor's eigen widgets
 * te bouwen". Als dat verschil pas bij het bouwen opvalt, staat de keuze
 * tussen een slechter ontwerp of een overtreding van regel 5a — terwijl het
 * akkoord al gegeven is.
 *
 * Dit script leest het ontwerp en meldt alles wat niet native te bouwen is,
 * zodat het vóór de goedkeuring op tafel ligt.
 *
 * Gebruik:
 *   node check-bouwbaar.js <pad-naar-ontwerp.html> [--breedte=1440]
 *
 * Exit code 0 = alles is met Elementor's eigen widgets te bouwen
 * Exit code 1 = er zit iets in dat native niet kan; eerst bespreken
 * Exit code 2 = het script kon niet draaien
 */

const fs = require("fs");
const path = require("path");
const { openBrowser, stabilizePage } = require("./lib/browser");

const EXIT_OK = 0;
const EXIT_BESPREKEN = 1;
const EXIT_KAPOT = 2;

const args = process.argv.slice(2);
const htmlArg = args.find((a) => !a.startsWith("--"));
const breedteArg = args.find((a) => a.startsWith("--breedte="));
const breedte = breedteArg ? parseInt(breedteArg.split("=")[1], 10) : 1440;

if (!htmlArg) {
  console.error("Gebruik: node check-bouwbaar.js <ontwerp.html> [--breedte=1440]");
  process.exit(EXIT_KAPOT);
}

const htmlPath = path.resolve(htmlArg);
if (!fs.existsSync(htmlPath)) {
  console.error(`Bestand niet gevonden: ${htmlPath}`);
  process.exit(EXIT_KAPOT);
}

const ruweHtml = fs.readFileSync(htmlPath, "utf8");
const ruweCmpCount = (ruweHtml.match(/data-cmp\s*=/g) || []).length;

(async () => {
  const browser = await openBrowser();
  let bevindingen;

  try {
    const page = await browser.newPage({ viewport: { width: breedte, height: 900 } });
    await page.goto("file://" + htmlPath, { waitUntil: "networkidle" });
    await stabilizePage(page);

    bevindingen = await page.evaluate(() => {
      const blokkerend = [];
      const letOp = [];

      function naamVan(el) {
        const eigen = el.getAttribute("data-cmp");
        if (eigen) return eigen;
        const ouder = el.closest("[data-cmp]");
        const basis = el.tagName.toLowerCase() + (el.className ? "." + String(el.className).split(" ")[0] : "");
        return ouder ? `${basis} (in ${ouder.getAttribute("data-cmp")})` : basis;
      }

      const alle = Array.from(document.querySelectorAll("body *")).filter((el) => el.tagName !== "SCRIPT");

      const pseudo = [];
      const gradients = [];
      const transforms = [];
      const blend = [];
      const sticky = [];

      alle.forEach((el) => {
        for (const ps of ["::before", "::after"]) {
          const cs = getComputedStyle(el, ps);
          if (cs.content && cs.content !== "none" && cs.content !== "normal") {
            pseudo.push({ element: naamVan(el), detail: `${ps} met content ${cs.content}` });
            break;
          }
        }

        const cs = getComputedStyle(el);
        if (cs.backgroundImage && /gradient\(/.test(cs.backgroundImage)) {
          gradients.push({ element: naamVan(el), detail: cs.backgroundImage.slice(0, 80) });
        }
        if (cs.transform && cs.transform !== "none") {
          transforms.push({ element: naamVan(el), detail: cs.transform });
        }
        const blendRedenen = [];
        if (cs.mixBlendMode && cs.mixBlendMode !== "normal") blendRedenen.push(`mix-blend-mode: ${cs.mixBlendMode}`);
        if (cs.backdropFilter && cs.backdropFilter !== "none") blendRedenen.push(`backdrop-filter: ${cs.backdropFilter}`);
        if (blendRedenen.length) {
          blend.push({ element: naamVan(el), detail: blendRedenen.join(", ") });
        }
        if (["sticky", "fixed"].includes(cs.position)) {
          sticky.push({ element: naamVan(el), detail: `position: ${cs.position}` });
        }
      });

      if (pseudo.length) {
        blokkerend.push({
          soort: "pseudo-elementen (::before / ::after)",
          uitleg:
            "Elementor's widgets hebben geen instelling voor pseudo-elementen. Dit is alleen met CSS te " +
            "maken, wat regel 5a verbiedt zonder akkoord. Alternatief: het decoratieve deel als " +
            "achtergrondafbeelding of los Icon-widget opnemen, of uit het ontwerp halen.",
          items: pseudo,
        });
      }
      if (gradients.length) {
        blokkerend.push({
          soort: "CSS-gradients als achtergrond",
          uitleg:
            "Elementor's achtergrond-instelling kan wel een gradient, maar alleen lineair/radiaal met twee " +
            "stops. Een gradient met meer stops of meerdere gestapelde gradients is niet native na te maken. " +
            "Controleer per geval; een echte afbeelding is meestal de betere route.",
          items: gradients,
        });
      }
      if (transforms.length) {
        blokkerend.push({
          soort: "CSS-transform (rotate/scale/skew)",
          uitleg:
            "Elementor schrijft transform-waarden wel weg, maar past ze in de geteste versie alleen in de " +
            "editor-preview toe, niet op de live pagina. Reken hier niet op: het verschil komt later terug " +
            "als een geometrie-afwijking die alleen met een ruimere tolerantie te verbergen is.",
          items: transforms,
        });
      }
      if (blend.length) {
        blokkerend.push({
          soort: "mix-blend-mode / backdrop-filter",
          uitleg: "Geen native instelling in Elementor's Style-tab.",
          items: blend,
        });
      }
      if (sticky.length) {
        letOp.push({
          soort: "sticky of fixed positionering",
          uitleg:
            "Native mogelijk via Elementor's Motion Effects (Sticky), maar dat zit in Elementor Pro. " +
            "Controleer of dat op deze site beschikbaar is.",
          items: sticky,
        });
      }

      return {
        blokkerend,
        letOp,
        gerenderdeCmpCount: document.querySelectorAll("[data-cmp]").length,
        scripts: Array.from(document.querySelectorAll("script")).filter(
          (s) => !s.type || s.type === "text/javascript" || s.type === "module"
        ).length,
      };
    });

    await page.close();
  } finally {
    await browser.close();
  }

  const { blokkerend, letOp, gerenderdeCmpCount, scripts } = bevindingen;

  if (scripts > 0 && gerenderdeCmpCount > ruweCmpCount) {
    blokkerend.push({
      soort: "inhoud die door JavaScript wordt opgebouwd",
      uitleg:
        `In het bestand staan ${ruweCmpCount} data-cmp-attributen, maar na het laden zijn het er ` +
        `${gerenderdeCmpCount}. Het verschil wordt door JavaScript aangemaakt. Die inhoud is in Elementor ` +
        "alleen als vaste tekst na te bouwen, en de bijbehorende interactie (tabs, filters) verdwijnt. " +
        "compare.js meet bovendien alleen de begintoestand, dus de andere toestanden worden nooit " +
        "gecontroleerd. Spreek af welke toestand de bron is, of haal de interactie uit het ontwerp.",
      items: [{ element: "(hele pagina)", detail: `${gerenderdeCmpCount - ruweCmpCount} elementen via JavaScript` }],
    });
  } else if (scripts > 0) {
    letOp.push({
      soort: "JavaScript op de pagina",
      uitleg:
        "Er staat script op de pagina dat geen extra data-cmp-elementen aanmaakt. Controleer of het " +
        "alleen gedrag toevoegt dat niet nagebouwd hoeft te worden.",
      items: [{ element: "(hele pagina)", detail: `${scripts} script-blok(ken)` }],
    });
  }

  function toon(groepen, kop) {
    if (!groepen.length) return;
    console.log(`\n${kop}\n`);
    groepen.forEach((g) => {
      console.log(`${g.soort} — ${g.items.length}×`);
      console.log(`  ${g.uitleg}`);
      g.items.slice(0, 8).forEach((i) => console.log(`    ${i.element}: ${i.detail}`));
      if (g.items.length > 8) console.log(`    ... en nog ${g.items.length - 8}.`);
      console.log("");
    });
  }

  console.log(`Ontwerp: ${path.basename(htmlPath)} op ${breedte}px`);

  toon(blokkerend, "NIET NATIVE TE BOUWEN — bespreek dit met Mark vóór het akkoord:");
  toon(letOp, "LET OP — native mogelijk, maar controleer of het op deze site kan:");

  if (blokkerend.length === 0) {
    console.log("\nRESULTAAT: BOUWBAAR — alles in dit ontwerp is met Elementor's eigen widgets te maken.");
    process.exitCode = EXIT_OK;
    return;
  }

  console.log(
    "RESULTAAT: BESPREKEN — dit ontwerp vraagt om dingen die Elementor niet native kan.\n" +
      "Pas het ontwerp aan, of leg per punt aan Mark voor wat het alternatief is (CLAUDE.md stap 1 en 5a).\n" +
      "Dit is geen reden om het ontwerp af te keuren, wel om de keuze nú te maken in plaats van tijdens het bouwen."
  );
  process.exitCode = EXIT_BESPREKEN;
})().catch((err) => {
  console.error("check-bouwbaar.js kon niet draaien (exit 2 = kapot):");
  console.error(err && err.message ? err.message : err);
  process.exit(EXIT_KAPOT);
});
