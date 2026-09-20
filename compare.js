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
 * op de geconfigureerde breakpoints (zoals hierboven).
 *
 * Met --responsive: geen HTML-vergelijking, maar een grove check op de
 * GEBOUWDE Elementor-pagina (pageUrl) op een paar tussenliggende breedtes
 * (het midden tussen elk paar geconfigureerde breakpoints). Vangt géén
 * pixelverschillen, wel: horizontale overflow van de hele pagina, en een
 * cmp-element waarvan de inhoud breder is dan zijn eigen doos. Dit is de
 * check die een pagina met vaste in plaats van relatieve/boxed breedtes
 * moet ontmaskeren, ook als de hoofd-breakpoints zelf toevallig goed staan
 * (zie CLAUDE.md stap 5b en 7).
 *
 * Exit code 0  = alles binnen de tolerantie (geslaagd)
 * Exit code 1  = er zijn afwijkingen gevonden, of er ging iets mis
 */

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

// ---------------------------------------------------------------------------
// Configuratie inlezen
// ---------------------------------------------------------------------------

const configPath = process.argv[2];
const responsiveMode = process.argv.includes("--responsive");
if (!configPath) {
  console.error("Gebruik: node compare.js <config.json> [--responsive]");
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(path.resolve(configPath), "utf8"));

const {
  htmlPath,
  pageUrl,
  tolerancePx = 1,
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
    "width",
    "height",
  ],
  reportPath = "./reports/laatste-run.json",
  // Optioneel: beperk de vergelijking tot deze data-cmp-root(s) en hun
  // afstammelingen. Zonder dit veld wordt (zoals voorheen) de volledige
  // pagina vergeleken. Nodig om een sectie apart op exit code 0 te kunnen
  // krijgen terwijl latere secties nog niet gebouwd zijn (CLAUDE.md stap 7).
  roots = null,
} = config;

if (!htmlPath || !pageUrl) {
  console.error("De config mist 'htmlPath' en/of 'pageUrl'.");
  process.exit(1);
}

const htmlUrl = "file://" + path.resolve(htmlPath);

// ---------------------------------------------------------------------------
// Code die in de browser draait: stabiliseren van de pagina en meten
// ---------------------------------------------------------------------------

async function stabilizePage(page) {
  // Wacht tot alle fonts geladen zijn, anders meet je een fallback-font.
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  });

  // Zet animaties en transities uit, zodat je nooit een tussentijdse staat meet.
  await page.addStyleTag({
    content: `*, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
      scroll-behavior: auto !important;
    }`,
  });

  // Geef lazy-loaded afbeeldingen een korte kans om te laden.
  await page.evaluate(async () => {
    const imgs = Array.from(document.images).filter((img) => !img.complete);
    await Promise.all(
      imgs.map(
        (img) =>
          new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          })
      )
    );
  });
}

async function measureComponents(page, propList, roots) {
  return page.evaluate(({ props, roots }) => {
    const nodes = Array.from(document.querySelectorAll("[data-cmp]"));
    const cmpNodes = Array.from(document.querySelectorAll('[class*="cmp-"]')).filter(
      (el) => Array.from(el.classList).some((c) => c.startsWith("cmp-"))
    );

    const all = nodes.length ? nodes : cmpNodes;
    const result = {};

    function nameOf(el) {
      const attr = el.getAttribute("data-cmp");
      if (attr) return attr;
      const cls = Array.from(el.classList).find((c) => c.startsWith("cmp-"));
      return cls ? cls.replace(/^cmp-/, "") : null;
    }

    // Hoort dit element bij één van de gevraagde roots (zichzelf, of een
    // data-cmp-voorouder die in de roots-lijst staat)?
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
    // tekstlaag (.elementor-heading-title / .elementor-button /
    // .elementor-text-editor), nooit op de buitenste widget-wrapper die de
    // cmp-class draagt. Die buitenste wrapper erft bovendien zijn eigen
    // font-size/line-height van de pagina (theme.json-standaard, niet van
    // dit project), wat als "strut" zijn doos-hoogte opblaast ook al staat
    // de zichtbare tekst binnenin op de juiste maat. Voor tekst-widgets
    // daarom zowel stijl ALS geometrie (positie/afmeting) van die binnenste
    // laag meten — dat is het element dat je daadwerkelijk ziet. Voor
    // gewone containers (geen eigen tekst) blijft alles van de cmp-node
    // zelf komen.
    const INNER_TEXT_SELECTOR = ".elementor-heading-title, .elementor-button, .elementor-text-editor";
    // Alleen zoeken naar een binnenste tekstlaag als dit element ZELF een
    // tekst-widget-wrapper is (Elementor zet die marker-class op dezelfde
    // node als de cmp-class) — anders zou bij een gewone container de
    // eerste toevallige tekst-widget ergens diep binnenin worden gepakt.
    const TEXT_WIDGET_SELECTOR = ".elementor-widget-heading, .elementor-widget-button, .elementor-widget-text-editor";

    // Typografie-eigenschappen zijn zinloos om te vergelijken op een element
    // zonder eigen, directe tekst (bijv. een kale structuur-container) — het
    // ge?rfde lettertype/kleur van zo'n element is nooit zichtbaar en is in
    // Elementor's containers ook niet native instelbaar. Alleen overslaan
    // als het element geen eigen tekstknoop heeft ?n geen bekende tekstlaag
    // is gevonden (styleEl === el betekent: geen binnenste tekstlaag).
    const TYPOGRAPHY_ONLY_PROPS = new Set([
      "fontSize", "fontWeight", "lineHeight", "letterSpacing", "color", "textAlign", "textTransform", "fontFamily",
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

      // Geometrie blijft van de buitenste cmp-node komen: dat is het echte
      // doos/flex-item-element (vergelijkbaar met het bron-element, dat als
      // kind van een flex-container ook geblockificeerd is). Alleen de
      // STIJL (font/kleur/etc.) komt van de binnenste tekstlaag, want alleen
      // daar past Elementor die daadwerkelijk toe.
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
        // De buitenste wrapper van een tekst-widget erft zijn eigen
        // font-size/line-height van de pagina (niet van dit project) — dat
        // heeft geen zichtbaar effect (de tekst zelf staat via de binnenste
        // laag al op de juiste maat), maar blaast wel de doos-hoogte van die
        // wrapper op via de CSS "strut". Elementor biedt hier geen native
        // instelling voor op de wrapper zelf. Gemarkeerd zodat de
        // vergelijking hiervoor een ruimere tolerantie kan gebruiken.
        isTextWidget: el.matches(TEXT_WIDGET_SELECTOR),
      };
    });

    return result;
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

    // 2. Is er een cmp-element waarvan de inhoud breder is dan zijn eigen doos,
    //    of dat buiten zijn ouder uitsteekt?
    const nodes = Array.from(document.querySelectorAll("[data-cmp], [class*='cmp-']"));
    nodes.forEach((el) => {
      let name = el.getAttribute("data-cmp");
      if (!name) {
        const cls = Array.from(el.classList).find((c) => c.startsWith("cmp-"));
        name = cls ? cls.replace(/^cmp-/, "") : el.tagName.toLowerCase();
      }

      if (el.scrollWidth > el.clientWidth + tolerance) {
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

    return issues;
  });
}

function midpointWidths(breakpointList) {
  const sorted = [...breakpointList].sort((a, b) => a.width - b.width);
  const widths = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const mid = Math.round((sorted[i].width + sorted[i + 1].width) / 2);
    widths.push({ name: `tussen-${sorted[i].name}-en-${sorted[i + 1].name}`, width: mid, height: sorted[i].height });
  }
  return widths;
}

// ---------------------------------------------------------------------------
// Vergelijkingslogica
// ---------------------------------------------------------------------------

function parseNumeric(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : null;
}

function compareValue(propName, htmlValue, elementorValue, tolerance) {
  const a = parseNumeric(htmlValue);
  const b = parseNumeric(elementorValue);

  if (a !== null && b !== null) {
    const diff = Math.abs(a - b);
    return { ok: diff <= tolerance, diff: diff.toFixed(2) };
  }

  // Niet-numerieke waarde (bijv. een kleur als rgb(...)): exacte match.
  const ok = htmlValue === elementorValue;
  return { ok, diff: ok ? "0" : "n.v.t." };
}

function compareBreakpoint(htmlData, elementorData, propList, tolerance) {
  const rows = [];
  const names = new Set([...Object.keys(htmlData), ...Object.keys(elementorData)]);

  for (const name of names) {
    const h = htmlData[name];
    const e = elementorData[name];

    if (!h) {
      rows.push({ element: name, property: "-", status: "ONBEKEND", note: "Alleen in Elementor gevonden" });
      continue;
    }
    if (!e) {
      rows.push({ element: name, property: "-", status: "ONTBREEKT", note: "Niet gevonden in Elementor (cmp-" + name + " ontbreekt)" });
      continue;
    }

    // Positie en afmeting. x/y zijn de plek op het scherm (t.o.v. de viewport);
    // die komt alleen overeen als er niets gescrold is en beide pagina's op
    // dezelfde viewportbreedte gemeten zijn, wat hierboven al zo is opgezet.
    const geomProps = { x: h.x, y: h.y, width: h.width, height: h.height };
    const geomElementor = { x: e.x, y: e.y, width: e.width, height: e.height };
    // De buitenste wrapper van een tekst-widget erft de regelhoogte van de
    // pagina voor zijn eigen (onzichtbare) doos-"strut" — geen native
    // Elementor-instelling voor beschikbaar (zie compare.js's meetcode
    // hierboven). Dat beïnvloedt alleen y/height, nooit x/width. Voor die
    // twee daarom een ruimere, met Mark afgestemde tolerantie.
    const STRUT_TOLERANCE_PX = 12;
    for (const geomKey of Object.keys(geomProps)) {
      const effectiveTolerance =
        e.isTextWidget && (geomKey === "y" || geomKey === "height") ? STRUT_TOLERANCE_PX : tolerance;
      const cmp = compareValue(geomKey, geomProps[geomKey] + "px", geomElementor[geomKey] + "px", effectiveTolerance);
      rows.push({
        element: name,
        property: geomKey,
        htmlValue: geomProps[geomKey].toFixed(1) + "px",
        elementorValue: geomElementor[geomKey].toFixed(1) + "px",
        diff: cmp.diff,
        status: cmp.ok ? "ok" : "FOUT",
      });
    }

    // Stijlen
    for (const prop of propList) {
      const hv = h.styles[prop];
      const ev = e.styles[prop];
      const cmp = compareValue(prop, hv, ev, tolerance);
      rows.push({
        element: name,
        property: prop,
        htmlValue: hv,
        elementorValue: ev,
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

function printTable(breakpointName, rows) {
  const failures = rows.filter((r) => r.status !== "ok");
  console.log(`\n=== ${breakpointName} ===`);

  if (failures.length === 0) {
    console.log("Geen afwijkingen.");
    return failures;
  }

  const header = ["Element", "Eigenschap", "HTML", "Elementor", "Verschil", "Status"];
  const widths = [18, 14, 16, 16, 10, 10];
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
        pad(r.status, widths[5]),
      ].join(" | ")
    );
  }

  return failures;
}

// ---------------------------------------------------------------------------
// Hoofdscript
// ---------------------------------------------------------------------------

(async () => {
  // Optioneel: een expliciet pad naar Chromium (handig als Playwright's eigen
  // download niet lukt of een andere versie op de machine al staat).
  const launchOptions = {};
  if (process.env.PW_CHROMIUM_PATH) {
    launchOptions.executablePath = process.env.PW_CHROMIUM_PATH;
  }
  const browser = await chromium.launch(launchOptions);

  if (responsiveMode) {
    const widths = midpointWidths(breakpoints);
    if (widths.length === 0) {
      console.log("Geen tussenliggende breedtes te testen (minder dan 2 breakpoints geconfigureerd).");
      await browser.close();
      process.exit(0);
    }

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

    await browser.close();

    if (totalIssues > 0) {
      console.log(`\nRESULTAAT: MISLUKT — ${totalIssues} responsief probleem(en) gevonden op tussenliggende breedtes.`);
      process.exit(1);
    } else {
      console.log("\nRESULTAAT: GESLAAGD — geen responsieve problemen op tussenliggende breedtes.");
      process.exit(0);
    }
    return;
  }

  const allResults = {};
  let totalFailures = 0;

  for (const bp of breakpoints) {
    const context = await browser.newContext({
      viewport: { width: bp.width, height: bp.height },
    });

    const htmlPage = await context.newPage();
    await htmlPage.goto(htmlUrl, { waitUntil: "networkidle" });
    await stabilizePage(htmlPage);
    const htmlData = await measureComponents(htmlPage, properties, roots);

    const elementorPage = await context.newPage();
    await elementorPage.goto(pageUrl, { waitUntil: "networkidle" });
    await stabilizePage(elementorPage);
    const elementorData = await measureComponents(elementorPage, properties, roots);

    await context.close();

    const rows = compareBreakpoint(htmlData, elementorData, properties, tolerancePx);
    const failures = printTable(bp.name, rows);
    totalFailures += failures.length;

    allResults[bp.name] = rows;
  }

  await browser.close();

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(allResults, null, 2));

  console.log(`\nRapport opgeslagen in ${reportPath}`);

  if (totalFailures > 0) {
    console.log(`\nRESULTAAT: MISLUKT — ${totalFailures} afwijking(en) gevonden.`);
    process.exit(1);
  } else {
    console.log("\nRESULTAAT: GESLAAGD — geen afwijkingen.");
    process.exit(0);
  }
})().catch((err) => {
  console.error("Compare.js is gestopt met een fout:");
  console.error(err);
  process.exit(1);
});
