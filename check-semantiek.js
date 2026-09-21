#!/usr/bin/env node
/**
 * check-semantiek.js — de derde as naast pixels en nativeheid.
 *
 * `compare.js` meet of het er hetzelfde uitziet. `check-native.js` meet of
 * het native gebouwd is. Geen van beide ziet of de opbouw nog dezelfde
 * bétekenis heeft: een navigatie die als rij losse spans is nagebouwd, een
 * <h2> die een <span> werd, een afbeelding zonder alt-tekst. Dat is voor een
 * bezoeker met een schermlezer, en voor Google, een echt verschil — en het
 * is op dit moment onzichtbaar voor elke andere controle in deze toolkit.
 *
 * Gebruik:
 *   node check-semantiek.js <config.json>
 *
 * Gebruikt dezelfde config als compare.js (htmlPath, pageUrl, roots).
 *
 * Exit code 0 = de betekenis is behouden
 * Exit code 1 = er zijn verschillen, of de koppenstructuur klopt niet
 * Exit code 2 = het script kon niet draaien
 */

const fs = require("fs");
const path = require("path");
const { openBrowser, stabilizePage } = require("./lib/browser");

const EXIT_OK = 0;
const EXIT_VERSCHIL = 1;
const EXIT_KAPOT = 2;

const configPath = process.argv[2];
if (!configPath) {
  console.error("Gebruik: node check-semantiek.js <config.json>");
  process.exit(EXIT_KAPOT);
}

let config;
try {
  config = JSON.parse(fs.readFileSync(path.resolve(configPath), "utf8"));
} catch (err) {
  console.error(`Config kon niet gelezen worden (${configPath}): ${err.message}`);
  process.exit(EXIT_KAPOT);
}

const { htmlPath, pageUrl, roots = null } = config;
if (!htmlPath || !pageUrl) {
  console.error("De config mist 'htmlPath' en/of 'pageUrl'.");
  process.exit(EXIT_KAPOT);
}

const kandidaten = path.isAbsolute(htmlPath)
  ? [htmlPath]
  : [path.resolve(htmlPath), path.resolve(path.dirname(path.resolve(configPath)), htmlPath)];
const resolvedHtmlPath = kandidaten.find((p) => fs.existsSync(p));
if (!resolvedHtmlPath) {
  console.error("Het ontwerp-HTML-bestand bestaat niet. Gezocht op:");
  kandidaten.forEach((p) => console.error(`  ${p}`));
  process.exit(EXIT_KAPOT);
}

async function leesSemantiek(page, roots) {
  return page.evaluate(({ roots }) => {
    const LANDMARKS = ["header", "nav", "main", "footer", "aside", "section", "article"];
    // Elementen die uit zichzelf betekenis dragen. Een <div> of <span> staat
    // hier bewust niet tussen: dat zijn de neutrale bouwstenen.
    const BETEKENISVOL = new Set([
      ...LANDMARKS,
      "h1", "h2", "h3", "h4", "h5", "h6",
      "a", "img", "button", "ul", "ol", "li", "p", "blockquote", "figure", "figcaption", "time", "address",
    ]);

    function nameOf(el) {
      const attr = el.getAttribute("data-cmp");
      if (attr) return attr;
      const cls = Array.from(el.classList).find((c) => c.startsWith("cmp-"));
      return cls ? cls.replace(/^cmp-/, "") : null;
    }

    function underRoots(el, name) {
      if (!roots) return true;
      if (roots.includes(name)) return true;
      let node = el.parentElement;
      while (node) {
        const n = nameOf(node);
        if (n && roots.includes(n)) return true;
        node = node.parentElement;
      }
      return false;
    }

    // Het element dat de betekenis draagt. In de bron is dat het getagde
    // element zelf; in Elementor staat de cmp-class op een neutrale wrapper
    // en zit de betekenis een laag dieper (de <h2> van een Heading-widget,
    // de <a> van een Button). Stopt bij een kind met een eigen cmp-naam.
    function betekenisElement(el) {
      if (BETEKENISVOL.has(el.tagName.toLowerCase())) return el;
      let node = el;
      for (let diepte = 0; diepte < 6; diepte++) {
        const kinderen = Array.from(node.children).filter((k) => !nameOf(k));
        if (kinderen.length === 0) return el;
        const betekenisvol = kinderen.filter((k) => BETEKENISVOL.has(k.tagName.toLowerCase()));
        if (betekenisvol.length === 1) return betekenisvol[0];
        if (betekenisvol.length > 1) return el;
        if (kinderen.length !== 1) return el;
        node = kinderen[0];
      }
      return el;
    }

    function landmarkVan(el) {
      let node = el;
      while (node && node !== document.body) {
        const tag = node.tagName.toLowerCase();
        if (LANDMARKS.includes(tag)) return tag;
        const rol = node.getAttribute && node.getAttribute("role");
        if (rol && ["banner", "navigation", "main", "contentinfo", "complementary"].includes(rol)) return rol;
        node = node.parentElement;
      }
      return null;
    }

    const alle = Array.from(document.querySelectorAll("[data-cmp], [class*='cmp-']"));
    const componenten = {};

    alle.forEach((el) => {
      const naam = nameOf(el);
      if (!naam || componenten[naam]) return;
      if (!underRoots(el, naam)) return;

      const doel = betekenisElement(el);
      const tag = doel.tagName.toLowerCase();

      componenten[naam] = {
        tag,
        koprniveau: /^h[1-6]$/.test(tag) ? parseInt(tag.slice(1), 10) : null,
        landmark: landmarkVan(doel),
        heeftLink: doel.tagName.toLowerCase() === "a" ? Boolean(doel.getAttribute("href")) : null,
        alt: doel.tagName.toLowerCase() === "img" ? doel.getAttribute("alt") : null,
        rol: doel.getAttribute("role") || null,
      };
    });

    // Koppenstructuur van de hele pagina, los van de cmp-namen.
    const koppen = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((h) => ({
      niveau: parseInt(h.tagName.slice(1), 10),
      tekst: h.textContent.trim().slice(0, 40),
    }));

    return { componenten, koppen };
  }, { roots });
}

function koppenProblemen(koppen) {
  const problemen = [];
  const aantalH1 = koppen.filter((k) => k.niveau === 1).length;
  if (aantalH1 === 0) problemen.push("geen <h1> op de pagina");
  if (aantalH1 > 1) problemen.push(`${aantalH1} keer een <h1>; er hoort er precies één te zijn`);

  for (let i = 1; i < koppen.length; i++) {
    const sprong = koppen[i].niveau - koppen[i - 1].niveau;
    if (sprong > 1) {
      problemen.push(
        `van h${koppen[i - 1].niveau} naar h${koppen[i].niveau} bij "${koppen[i].tekst}" — een niveau overgeslagen`
      );
    }
  }
  return problemen;
}

(async () => {
  const browser = await openBrowser();
  let bron;
  let gebouwd;

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

    const bronPagina = await context.newPage();
    await bronPagina.goto("file://" + resolvedHtmlPath, { waitUntil: "networkidle" });
    await stabilizePage(bronPagina);
    bron = await leesSemantiek(bronPagina, roots);

    const gebouwdePagina = await context.newPage();
    await gebouwdePagina.goto(pageUrl, { waitUntil: "networkidle" });
    await stabilizePage(gebouwdePagina);
    gebouwd = await leesSemantiek(gebouwdePagina, roots);

    await context.close();
  } finally {
    await browser.close();
  }

  const namen = new Set([...Object.keys(bron.componenten), ...Object.keys(gebouwd.componenten)]);
  const verschillen = [];

  for (const naam of [...namen].sort()) {
    const b = bron.componenten[naam];
    const g = gebouwd.componenten[naam];
    if (!b || !g) continue; // ontbrekende elementen zijn het werk van compare.js

    if (b.tag !== g.tag) {
      verschillen.push({
        element: naam,
        wat: "element",
        bron: `<${b.tag}>`,
        gebouwd: `<${g.tag}>`,
        uitleg:
          b.koprniveau && !g.koprniveau
            ? "een kop is geen kop meer; zet de juiste HTML-tag op de Heading-widget"
            : b.tag === "a"
              ? "een link is geen link meer; gebruik een widget met een link-veld"
              : "andere HTML-tag, dus andere betekenis",
      });
    }

    if (b.koprniveau !== g.koprniveau && (b.koprniveau || g.koprniveau)) {
      verschillen.push({
        element: naam,
        wat: "koprniveau",
        bron: b.koprniveau ? `h${b.koprniveau}` : "geen kop",
        gebouwd: g.koprniveau ? `h${g.koprniveau}` : "geen kop",
        uitleg: "zet `header_size` op de Heading-widget gelijk aan de tag uit spec.json",
      });
    }

    if (b.landmark !== g.landmark) {
      verschillen.push({
        element: naam,
        wat: "landmark",
        bron: b.landmark || "geen",
        gebouwd: g.landmark || "geen",
        uitleg: "zet `html_tag` op de container (header, nav, main, footer, aside, section, article)",
      });
    }

    if (b.heeftLink && !g.heeftLink) {
      verschillen.push({
        element: naam,
        wat: "link",
        bron: "href aanwezig",
        gebouwd: "geen href",
        uitleg: "vul het link-veld van de widget met de `href` uit spec.json",
      });
    }

    if (b.alt !== null && (g.alt === null || g.alt === "") && b.alt !== "") {
      verschillen.push({
        element: naam,
        wat: "alt-tekst",
        bron: `"${b.alt}"`,
        gebouwd: g.alt === null ? "geen img" : "leeg",
        uitleg: "vul de alt-tekst van de Image-widget met `alt` uit spec.json",
      });
    }
  }

  const problemenGebouwd = koppenProblemen(gebouwd.koppen);
  const problemenBron = koppenProblemen(bron.koppen);

  console.log(`Vergeleken: ${namen.size} element(en).`);

  if (verschillen.length) {
    console.log(`\n${verschillen.length} betekenisverschil(len):\n`);
    const breedtes = [22, 14, 20, 20];
    const pad = (s, w) => String(s).padEnd(w).slice(0, w);
    console.log(["Element", "Wat", "Bron", "Elementor"].map((h, i) => pad(h, breedtes[i])).join(" | "));
    console.log(breedtes.map((w) => "-".repeat(w)).join("-|-"));
    verschillen.forEach((v) => {
      console.log([pad(v.element, breedtes[0]), pad(v.wat, breedtes[1]), pad(v.bron, breedtes[2]), pad(v.gebouwd, breedtes[3])].join(" | "));
      console.log(`  → ${v.uitleg}`);
    });
  }

  if (problemenGebouwd.length) {
    console.log(`\nKoppenstructuur van de gebouwde pagina:`);
    problemenGebouwd.forEach((p) => {
      const ookInBron = problemenBron.includes(p);
      console.log(`  ${p}${ookInBron ? "  (staat ook al zo in het ontwerp — repareer daar eerst)" : ""}`);
    });
  }

  if (verschillen.length === 0 && problemenGebouwd.length === 0) {
    console.log("\nRESULTAAT: BEHOUDEN — zelfde tags, koppen, landmarks, links en alt-teksten als het ontwerp.");
    process.exitCode = EXIT_OK;
    return;
  }

  console.log(
    "\nRESULTAAT: AFWIJKEND — de pagina ziet er misschien goed uit, maar leest anders.\n" +
      "Los dit op met Elementor's eigen instellingen: `html_tag` op containers, `header_size` op\n" +
      "Heading-widgets, het link-veld voor links, en de alt-tekst op Image-widgets."
  );
  process.exitCode = EXIT_VERSCHIL;
})().catch((err) => {
  console.error("check-semantiek.js kon niet draaien (exit 2 = kapot):");
  console.error(err && err.message ? err.message : err);
  process.exit(EXIT_KAPOT);
});
