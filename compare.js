#!/usr/bin/env node
/**
 * compare.js
 *
 * Vergelijkt een goedgekeurde HTML-pagina (de bron van waarheid) met een
 * gebouwde Elementor-pagina, element voor element, op meerdere schermbreedtes.
 *
 * Koppeling tussen de twee pagina's gebeurt via een gedeelde naam:
 *   - in de HTML:      <div data-cmp="hero-titel">...</div>
 *   - in Elementor:     CSS class "cmp-hero-titel" op hetzelfde element
 *                       (Advanced-tab -> CSS Classes)
 *
 * Gebruik:
 *   node compare.js config.json
 *   node compare.js config.json --responsive
 *
 * Zonder --responsive: pixel-voor-pixel vergelijking van HTML vs. Elementor
 * op de geconfigureerde breakpoints.
 *
 * Met --responsive: geen HTML-vergelijking, maar een grove check op de
 * GEBOUWDE Elementor-pagina (pageUrl) op een vaste ladder tussenbreedtes.
 * Vangt géén pixelverschillen, wel: horizontale overflow, een cmp-element
 * waarvan de inhoud breder is dan zijn doos, en overlappende buren. Dit is
 * de check die een pagina met vaste in plaats van relatieve/boxed breedtes
 * moet ontmaskeren (zie CLAUDE.md stap 5b en 7).
 *
 * Exit code 0 = alles binnen de tolerantie (geslaagd)
 * Exit code 1 = er zijn afwijkingen gevonden, of de controle is ongeldig
 * Exit code 2 = het script kon niet draaien (crash, pagina onbereikbaar)
 */

const fs = require("fs");
const path = require("path");
const { openBrowser, stabilizePage } = require("./lib/browser");

const EXIT_OK = 0;
const EXIT_AFWIJKING = 1;
const EXIT_KAPOT = 2;

// ---------------------------------------------------------------------------
// Configuratie inlezen
// ---------------------------------------------------------------------------

const configPath = process.argv[2];
const responsiveMode = process.argv.includes("--responsive");
if (!configPath) {
  console.error("Gebruik: node compare.js <config.json> [--responsive]");
  process.exit(EXIT_KAPOT);
}

let config;
try {
  config = JSON.parse(fs.readFileSync(path.resolve(configPath), "utf8"));
} catch (err) {
  console.error(`Config kon niet gelezen worden (${configPath}): ${err.message}`);
  process.exit(EXIT_KAPOT);
}

const configNaam = path.basename(configPath).replace(/\.json$/i, "");

const {
  htmlPath,
  pageUrl,
  // Algemene tolerantie, gebruikt voor geometrie en alles zonder eigen regel.
  tolerancePx = 1,
  // Tolerantie per eigenschap of per categorie ("geometry", "typography",
  // "color", "default"). Zie resolveTolerance() hieronder: een ruime
  // geometrie-tolerantie mag typografie NOOIT meeslepen.
  tolerances = {},
  breakpoints = [{ name: "desktop", width: 1440, height: 900 }],
  properties = [
    "fontSize",
    "fontWeight",
    "lineHeight",
    "color",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",
  ],
  reportPath = `./reports/${configNaam}.json`,
  // Optioneel: beperk de vergelijking tot deze data-cmp-root(s) en hun
  // afstammelingen. Nodig om een sectie apart op exit code 0 te krijgen
  // terwijl latere secties nog niet gebouwd zijn (CLAUDE.md stap 7).
  roots = null,
} = config;

if (!htmlPath || !pageUrl) {
  console.error("De config mist 'htmlPath' en/of 'pageUrl'.");
  process.exit(EXIT_KAPOT);
}

// htmlPath mag relatief aan de werkmap staan (zoals CLAUDE.md het aanroept,
// vanaf de projectroot) of relatief aan de config zelf.
const kandidaatPaden = path.isAbsolute(htmlPath)
  ? [htmlPath]
  : [path.resolve(htmlPath), path.resolve(path.dirname(path.resolve(configPath)), htmlPath)];

const resolvedHtmlPath = kandidaatPaden.find((p) => fs.existsSync(p));

if (!resolvedHtmlPath) {
  console.error("Het ontwerp-HTML-bestand bestaat niet. Gezocht op:");
  kandidaatPaden.forEach((p) => console.error(`  ${p}`));
  console.error("Gebruik een repo-relatief pad, zodat de run op elke machine te herhalen is.");
  process.exit(EXIT_KAPOT);
}

const htmlUrl = "file://" + resolvedHtmlPath;

// ---------------------------------------------------------------------------
// Tolerantie per eigenschap
// ---------------------------------------------------------------------------

const GEOMETRY_PROPS = ["x", "y", "width", "height"];

// Typografie en kleur horen streng te blijven, óók als geometrie speling
// nodig heeft (fontsubstitutie, een transform die Elementor niet live
// toepast). Eén globale tolerancePx van 20 liet anders een kop van 40px als
// 24px passeren.
const TYPOGRAPHY_PROPS = new Set([
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "textAlign",
  "textTransform",
  "fontFamily",
]);

const COLOR_PROPS = new Set(["color", "backgroundColor", "borderColor"]);

const STRIKTE_STANDAARD_PX = 0.5;

function resolveTolerance(prop) {
  if (Object.prototype.hasOwnProperty.call(tolerances, prop)) return tolerances[prop];

  const isGeometry = GEOMETRY_PROPS.includes(prop);
  if (isGeometry && Object.prototype.hasOwnProperty.call(tolerances, "geometry")) {
    return tolerances.geometry;
  }
  if (TYPOGRAPHY_PROPS.has(prop)) {
    if (Object.prototype.hasOwnProperty.call(tolerances, "typography")) return tolerances.typography;
    return STRIKTE_STANDAARD_PX;
  }
  if (COLOR_PROPS.has(prop)) {
    if (Object.prototype.hasOwnProperty.call(tolerances, "color")) return tolerances.color;
    return 0;
  }
  if (Object.prototype.hasOwnProperty.call(tolerances, "default")) return tolerances.default;
  return tolerancePx;
}

function printToleranceOverzicht() {
  const ruim = [];
  for (const prop of [...GEOMETRY_PROPS, ...properties]) {
    const t = resolveTolerance(prop);
    if (t > 1) ruim.push(`${prop}=${t}px`);
  }
  console.log(`Tolerantie: algemeen ${tolerancePx}px, typografie ${resolveTolerance("fontSize")}px, kleur exact.`);
  if (ruim.length) {
    console.log(`Verruimd: ${ruim.join(", ")}`);
    const notes = Object.keys(config).filter((k) => k.startsWith("_") && /note/i.test(k));
    if (notes.length) {
      notes.forEach((k) => console.log(`  ${k}: ${config[k]}`));
    } else {
      console.log(
        "  LET OP: geen onderbouwing in de config. Zet een \"_toleranceNote\" met de reden,\n" +
          "  anders is niet na te gaan waarom deze verruiming is toegestaan."
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Code die in de browser draait: stabiliseren van de pagina en meten
// ---------------------------------------------------------------------------

async function measureComponents(page, propList, roots) {
  return page.evaluate(({ props, roots }) => {
    const nodes = Array.from(document.querySelectorAll("[data-cmp]"));
    const cmpNodes = Array.from(document.querySelectorAll('[class*="cmp-"]')).filter((el) =>
      Array.from(el.classList).some((c) => c.startsWith("cmp-"))
    );

    // Beide vormen meenemen: de bron gebruikt data-cmp, Elementor de
    // cmp--class. Eerder won data-cmp het volledig, waardoor één los
    // data-cmp op de Elementor-pagina alle cmp--classes onzichtbaar maakte.
    const all = Array.from(new Set([...nodes, ...cmpNodes]));
    const result = {};
    const duplicaten = [];

    function nameOf(el) {
      const attr = el.getAttribute("data-cmp");
      if (attr) return attr;
      const cls = Array.from(el.classList).find((c) => c.startsWith("cmp-"));
      return cls ? cls.replace(/^cmp-/, "") : null;
    }

    // Hoort dit element bij één van de gevraagde roots (zichzelf, of een
    // data-cmp/cmp--voorouder die in de roots-lijst staat)?
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

    // Elementor past typografie (font/kleur/etc.) altijd toe op een binnenste
    // tekstlaag, nooit op de buitenste widget-wrapper die de cmp-class draagt.
    // Die wrapper erft zijn eigen font-size/line-height van het thema, wat als
    // "strut" zijn doos-hoogte opblaast ook al staat de zichtbare tekst
    // binnenin op de juiste maat. Voor tekst-widgets daarom de STIJL van die
    // binnenste laag meten; de geometrie blijft van de cmp-node zelf komen.
    const INNER_TEXT_SELECTOR =
      ".elementor-heading-title, .elementor-button, .elementor-button-text, .elementor-text-editor";
    const TEXT_WIDGET_SELECTOR =
      ".elementor-widget-heading, .elementor-widget-button, .elementor-widget-text-editor";

    // Typografie vergelijken op een element zonder eigen, directe tekst is
    // zinloos: het geërfde lettertype van een kale structuur-container is
    // nooit zichtbaar en in Elementor's containers ook niet instelbaar.
    const TYPOGRAPHY_ONLY_PROPS = new Set([
      "fontSize",
      "fontWeight",
      "lineHeight",
      "letterSpacing",
      "color",
      "textAlign",
      "textTransform",
      "fontFamily",
    ]);

    function hasOwnText(el) {
      return Array.from(el.childNodes).some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0
      );
    }

    all.forEach((el) => {
      const name = nameOf(el);
      if (!name) return;
      if (!underRoots(el, name)) return;

      if (result[name]) {
        duplicaten.push(name);
        return;
      }

      const styleEl = (el.matches(TEXT_WIDGET_SELECTOR) && el.querySelector(INNER_TEXT_SELECTOR)) || el;
      const rect = el.getBoundingClientRect();
      const cs = window.getComputedStyle(styleEl);
      const isTextless = styleEl === el && !hasOwnText(el);

      const styles = {};
      props.forEach((prop) => {
        styles[prop] = isTextless && TYPOGRAPHY_ONLY_PROPS.has(prop) ? null : cs[prop];
      });

      result[name] = {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        styles,
        // Gemarkeerd zodat de vergelijking het strut-effect hierboven een
        // ruimere tolerantie kan geven op y/height.
        isTextWidget: el.matches(TEXT_WIDGET_SELECTOR),
      };
    });

    return { components: result, duplicaten: Array.from(new Set(duplicaten)) };
  }, { props: propList, roots });
}

async function measureResponsiveIssues(page) {
  return page.evaluate(() => {
    const issues = [];
    const tolerance = 2; // px speling voor scrollbars/subpixel-afronding

    // 1. Overflowt de hele pagina horizontaal?
    const docWidth = document.documentElement.scrollWidth;
    const viewportWidth = window.innerWidth;
    if (docWidth > viewportWidth + tolerance) {
      issues.push({
        element: "(hele pagina)",
        probleem: `pagina is ${docWidth}px breed, viewport is ${viewportWidth}px — horizontale overflow`,
      });
    }

    function nameOf(el) {
      const attr = el.getAttribute("data-cmp");
      if (attr) return attr;
      const cls = Array.from(el.classList).find((c) => c.startsWith("cmp-"));
      return cls ? cls.replace(/^cmp-/, "") : el.tagName.toLowerCase();
    }

    const nodes = Array.from(document.querySelectorAll("[data-cmp], [class*='cmp-']"));

    // 2. Inhoud breder dan de eigen doos, of buiten het scherm.
    nodes.forEach((el) => {
      const name = nameOf(el);
      const cs = window.getComputedStyle(el);

      // Een element dat zelf bewust clipt of scrollt (overflow hidden/auto/
      // scroll/clip) heeft een scrollWidth > clientWidth by design.
      const clipt = !["visible"].includes(cs.overflowX);
      if (!clipt && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + tolerance) {
        issues.push({
          element: name,
          probleem: `inhoud (${el.scrollWidth}px) is breder dan het element zelf (${el.clientWidth}px)`,
        });
      }

      const rect = el.getBoundingClientRect();
      if (rect.right > viewportWidth + tolerance) {
        issues.push({
          element: name,
          probleem: `steekt ${(rect.right - viewportWidth).toFixed(0)}px buiten de rechterrand van het scherm`,
        });
      }
    });

    // 3. Overlappende buren: twee cmp-elementen met dezelfde ouder die elkaar
    //    in beide richtingen overlappen. Dat is het typische gevolg van een
    //    vaste breedte die op een smaller scherm niet meer past.
    const perOuder = new Map();
    nodes.forEach((el) => {
      const cs = window.getComputedStyle(el);
      if (["absolute", "fixed"].includes(cs.position)) return;
      const ouder = el.parentElement;
      if (!ouder) return;
      if (!perOuder.has(ouder)) perOuder.set(ouder, []);
      perOuder.get(ouder).push(el);
    });

    for (const groep of perOuder.values()) {
      for (let i = 0; i < groep.length; i++) {
        for (let j = i + 1; j < groep.length; j++) {
          const a = groep[i].getBoundingClientRect();
          const b = groep[j].getBoundingClientRect();
          if (a.width === 0 || a.height === 0 || b.width === 0 || b.height === 0) continue;
          const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (overlapX > tolerance && overlapY > tolerance) {
            issues.push({
              element: `${nameOf(groep[i])} ↔ ${nameOf(groep[j])}`,
              probleem: `overlappen elkaar met ${Math.round(overlapX)}×${Math.round(overlapY)}px`,
            });
          }
        }
      }
    }

    return issues;
  });
}

// Vaste ladder tussenbreedtes, bewust NIET afgeleid uit de config: met één
// geconfigureerd breakpoint leverde de oude berekening nul te testen breedtes
// op, en dus een geslaagde run die niets had gemeten.
const VASTE_TUSSENBREEDTES = [1280, 1100, 900, 800, 600, 480];

function responsiveWidths(breakpointList) {
  const hoogte = breakpointList[0] ? breakpointList[0].height : 900;
  const geconfigureerd = new Set(breakpointList.map((b) => b.width));
  const sorted = [...breakpointList].sort((a, b) => a.width - b.width);

  const kandidaten = new Map();
  for (let i = 0; i < sorted.length - 1; i++) {
    const mid = Math.round((sorted[i].width + sorted[i + 1].width) / 2);
    kandidaten.set(mid, `tussen-${sorted[i].name}-en-${sorted[i + 1].name}`);
  }
  for (const w of VASTE_TUSSENBREEDTES) {
    if (!kandidaten.has(w)) kandidaten.set(w, `vast-${w}`);
  }

  return [...kandidaten.entries()]
    .filter(([w]) => !geconfigureerd.has(w))
    .sort((a, b) => b[0] - a[0])
    .map(([width, name]) => ({ name, width, height: hoogte }));
}

// ---------------------------------------------------------------------------
// Vergelijkingslogica
// ---------------------------------------------------------------------------

// Alleen een losse waarde (getal met optionele eenheid) is numeriek te
// vergelijken. Een shorthand als "1px 0px 0px" of "1px solid rgb(0,0,0)"
// mag NIET op zijn eerste getal vergeleken worden, want dan blijven de
// overige delen ongezien.
const LOSSE_WAARDE = /^-?\d+(\.\d+)?(px|em|rem|%|deg|s|ms|vw|vh|pt)?$/;

function parseNumeric(value) {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return LOSSE_WAARDE.test(v) ? parseFloat(v) : null;
}

function parseColor(value) {
  if (typeof value !== "string") return null;
  const m = value.trim().match(/^rgba?\(([^)]+)\)$/);
  if (!m) return null;
  const delen = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
  if (delen.length < 3 || delen.some(Number.isNaN)) return null;
  return [delen[0], delen[1], delen[2], delen.length > 3 ? delen[3] : 1];
}

function compareValue(htmlValue, elementorValue, tolerance) {
  const kleurA = parseColor(htmlValue);
  const kleurB = parseColor(elementorValue);
  if (kleurA && kleurB) {
    const deltas = kleurA.map((v, i) => Math.abs(v - kleurB[i]));
    const kanaalDelta = Math.max(deltas[0], deltas[1], deltas[2]);
    const alphaDelta = deltas[3];
    const ok = kanaalDelta <= tolerance && alphaDelta <= (tolerance > 0 ? 0.01 : 0);
    return { ok, diff: ok && kanaalDelta === 0 && alphaDelta === 0 ? "0" : `Δrgb ${kanaalDelta}` };
  }

  const a = parseNumeric(htmlValue);
  const b = parseNumeric(elementorValue);
  if (a !== null && b !== null) {
    const diff = Math.abs(a - b);
    return { ok: diff <= tolerance, diff: diff.toFixed(2) };
  }

  // Niet-numeriek en geen kleur (bijv. "normal", "none", een shorthand):
  // exacte match.
  const ok = htmlValue === elementorValue;
  return { ok, diff: ok ? "0" : "anders" };
}

function compareBreakpoint(htmlData, elementorData, propList, strutTolerance) {
  const rows = [];
  const names = new Set([...Object.keys(htmlData), ...Object.keys(elementorData)]);

  // De geometrie-eigenschappen worden apart vergeleken (de echte doos op het
  // scherm). Staan width/height óók in propList, dan zijn dat de CSS-waarden,
  // die door box-sizing van de doos kunnen afwijken; die krijgen daarom het
  // prefix "css:" in het rapport zodat de twee niet meer op elkaar lijken.
  const styleProps = propList;

  for (const name of names) {
    const h = htmlData[name];
    const e = elementorData[name];

    if (!h) {
      rows.push({ element: name, property: "-", status: "ONBEKEND", note: "Alleen in Elementor gevonden" });
      continue;
    }
    if (!e) {
      rows.push({
        element: name,
        property: "-",
        status: "ONTBREEKT",
        note: "Niet gevonden in Elementor (cmp-" + name + " ontbreekt)",
      });
      continue;
    }

    const geomProps = { x: h.x, y: h.y, width: h.width, height: h.height };
    const geomElementor = { x: e.x, y: e.y, width: e.width, height: e.height };

    for (const geomKey of GEOMETRY_PROPS) {
      const basis = resolveTolerance(geomKey);
      // De wrapper van een tekst-widget erft de regelhoogte van het thema voor
      // zijn eigen (onzichtbare) doos-strut. Dat raakt alleen y/height. De
      // ruimere strut-tolerantie mag een al ruimere configuratie niet
      // verkleinen, vandaar Math.max.
      const effectiveTolerance =
        e.isTextWidget && (geomKey === "y" || geomKey === "height") ? Math.max(basis, strutTolerance) : basis;
      const cmp = compareValue(geomProps[geomKey] + "px", geomElementor[geomKey] + "px", effectiveTolerance);
      rows.push({
        element: name,
        property: geomKey,
        htmlValue: geomProps[geomKey].toFixed(1) + "px",
        elementorValue: geomElementor[geomKey].toFixed(1) + "px",
        tolerance: effectiveTolerance,
        diff: cmp.diff,
        status: cmp.ok ? "ok" : "FOUT",
      });
    }

    for (const prop of styleProps) {
      const hv = h.styles[prop];
      const ev = e.styles[prop];
      const tol = resolveTolerance(prop);
      const cmp = compareValue(hv, ev, tol);
      rows.push({
        element: name,
        property: GEOMETRY_PROPS.includes(prop) ? `css:${prop}` : prop,
        htmlValue: hv,
        elementorValue: ev,
        tolerance: tol,
        diff: cmp.diff,
        status: cmp.ok ? "ok" : "FOUT",
      });
    }
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Rapportage
// ---------------------------------------------------------------------------

function printTable(breakpointName, rows, elementCount) {
  const failures = rows.filter((r) => r.status !== "ok");
  console.log(`\n=== ${breakpointName} ===`);
  console.log(`${elementCount} element(en) vergeleken, ${rows.length} metingen.`);

  if (failures.length === 0) {
    console.log("Geen afwijkingen.");
    return failures;
  }

  const header = ["Element", "Eigenschap", "HTML", "Elementor", "Verschil", "Tol.", "Status"];
  const widths = [22, 16, 18, 18, 10, 6, 10];
  const pad = (s, w) => String(s).padEnd(w).slice(0, w);

  console.log(header.map((h, i) => pad(h, widths[i])).join(" | "));
  console.log(widths.map((w) => "-".repeat(w)).join("-|-"));

  for (const r of failures) {
    console.log(
      [
        pad(r.element, widths[0]),
        pad(r.property, widths[1]),
        pad(r.htmlValue ?? "-", widths[2]),
        pad(r.elementorValue ?? "-", widths[3]),
        pad(r.diff ?? "-", widths[4]),
        pad(r.tolerance ?? "-", widths[5]),
        pad(r.status, widths[6]),
      ].join(" | ")
    );
  }

  return failures;
}

// ---------------------------------------------------------------------------
// Hoofdscript
// ---------------------------------------------------------------------------

async function runResponsive(browser) {
  if (breakpoints.length < 2) {
    console.error(
      `ONGELDIG: er is maar ${breakpoints.length} breakpoint geconfigureerd (${breakpoints
        .map((b) => b.width + "px")
        .join(", ")}).`
    );
    console.error(
      "De gewone run test dan alleen die ene breedte, dus er is geen enkele meting op tablet of mobiel.\n" +
        "Configureer minstens desktop, tablet en mobiel in 'breakpoints' (zie config.example.json)."
    );
    return EXIT_AFWIJKING;
  }

  const widths = responsiveWidths(breakpoints);
  console.log(`Tussenbreedtes: ${widths.map((w) => w.width + "px").join(", ")}`);

  let totalIssues = 0;
  for (const bp of widths) {
    const context = await browser.newContext({ viewport: { width: bp.width, height: bp.height } });
    const page = await context.newPage();
    await page.goto(pageUrl, { waitUntil: "networkidle" });
    await stabilizePage(page);
    const issues = await measureResponsiveIssues(page);
    await context.close();

    console.log(`\n=== ${bp.name} (${bp.width}px) ===`);
    if (issues.length === 0) {
      console.log("Geen afwijkingen.");
    } else {
      issues.forEach((i) => console.log(`FOUT | ${i.element} | ${i.probleem}`));
      totalIssues += issues.length;
    }
  }

  if (totalIssues > 0) {
    console.log(`\nRESULTAAT: MISLUKT — ${totalIssues} responsief probleem(en) op tussenliggende breedtes.`);
    return EXIT_AFWIJKING;
  }
  console.log(
    `\nRESULTAAT: GESLAAGD — geen responsieve problemen op ${widths.length} tussenliggende breedte(s).`
  );
  return EXIT_OK;
}

async function runCompare(browser) {
  printToleranceOverzicht();

  if (breakpoints.length < 2) {
    console.log(
      `\nWAARSCHUWING: maar ${breakpoints.length} breakpoint geconfigureerd. Tablet en mobiel worden ` +
        "dus niet gecontroleerd (CLAUDE.md stap 0 en 7)."
    );
  }

  const strutTolerance = Object.prototype.hasOwnProperty.call(tolerances, "strut") ? tolerances.strut : 12;

  const allResults = {};
  const samenvatting = {};
  let totalFailures = 0;
  let ongeldig = null;

  for (const bp of breakpoints) {
    const context = await browser.newContext({ viewport: { width: bp.width, height: bp.height } });

    const htmlPage = await context.newPage();
    await htmlPage.goto(htmlUrl, { waitUntil: "networkidle" });
    await stabilizePage(htmlPage);
    const htmlMeting = await measureComponents(htmlPage, properties, roots);

    const elementorPage = await context.newPage();
    await elementorPage.goto(pageUrl, { waitUntil: "networkidle" });
    await stabilizePage(elementorPage);
    const elementorMeting = await measureComponents(elementorPage, properties, roots);

    await context.close();

    const htmlData = htmlMeting.components;
    const elementorData = elementorMeting.components;

    if (htmlMeting.duplicaten.length) {
      console.error(
        `\nONGELDIG (${bp.name}): dubbele data-cmp-naam in het ontwerp: ${htmlMeting.duplicaten.join(", ")}.`
      );
      ongeldig = "dubbele namen in de HTML";
    }
    if (elementorMeting.duplicaten.length) {
      console.error(
        `\nONGELDIG (${bp.name}): dubbele cmp--class in Elementor: ${elementorMeting.duplicaten.join(", ")}.` +
          "\nTwee elementen met dezelfde naam maken de meting dubbelzinnig; geef ze elk een eigen naam."
      );
      ongeldig = "dubbele namen in Elementor";
    }

    // Een verschrijving in 'roots' gaf voorheen nul metingen en dus exit 0.
    if (roots) {
      const gevonden = new Set(Object.keys(htmlData));
      const missend = roots.filter((r) => !gevonden.has(r));
      if (missend.length) {
        console.error(
          `\nONGELDIG (${bp.name}): de root(s) ${missend.join(", ")} bestaan niet in het ontwerp.` +
            "\nControleer de spelling tegen de roots-lijst in spec.json."
        );
        ongeldig = "onbekende root in de config";
      }
    }

    const elementCount = new Set([...Object.keys(htmlData), ...Object.keys(elementorData)]).size;
    if (elementCount === 0) {
      console.error(
        `\nONGELDIG (${bp.name}): nul elementen vergeleken. Er is dus niets gecontroleerd.` +
          "\nOorzaak is meestal een verkeerde 'roots'-naam, of een ontwerp zonder data-cmp-attributen."
      );
      ongeldig = "nul elementen vergeleken";
    }

    const rows = compareBreakpoint(htmlData, elementorData, properties, strutTolerance);
    const failures = printTable(bp.name, rows, elementCount);
    totalFailures += failures.length;

    allResults[bp.name] = rows;
    samenvatting[bp.name] = {
      elementen: elementCount,
      metingen: rows.length,
      afwijkingen: failures.length,
    };
  }

  fs.mkdirSync(path.dirname(path.resolve(reportPath)), { recursive: true });
  fs.writeFileSync(
    path.resolve(reportPath),
    JSON.stringify(
      {
        uitgevoerdOp: new Date().toISOString(),
        config: path.resolve(configPath),
        htmlPath: resolvedHtmlPath,
        pageUrl,
        roots,
        samenvatting,
        ongeldig: ongeldig || null,
        resultaten: allResults,
      },
      null,
      2
    )
  );

  console.log(`\nRapport opgeslagen in ${reportPath}`);

  if (ongeldig) {
    console.log(`\nRESULTAAT: ONGELDIG — ${ongeldig}. Dit is geen geslaagde controle.`);
    return EXIT_AFWIJKING;
  }
  if (totalFailures > 0) {
    console.log(`\nRESULTAAT: MISLUKT — ${totalFailures} afwijking(en) gevonden.`);
    return EXIT_AFWIJKING;
  }
  console.log("\nRESULTAAT: GESLAAGD — geen afwijkingen.");
  return EXIT_OK;
}

(async () => {
  const browser = await openBrowser();
  try {
    const code = responsiveMode ? await runResponsive(browser) : await runCompare(browser);
    process.exitCode = code;
  } finally {
    await browser.close();
  }
})().catch((err) => {
  console.error("Compare.js kon niet draaien (exit 2 = kapot, niet 'afwijkingen gevonden'):");
  console.error(err && err.message ? err.message : err);
  process.exit(EXIT_KAPOT);
});
