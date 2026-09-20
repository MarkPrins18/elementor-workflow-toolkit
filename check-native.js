#!/usr/bin/env node
/**
 * check-native.js — de controle bij CLAUDE.md stap 5a.
 *
 * compare.js meet alleen het eindresultaat, niet hoe dat tot stand kwam. Een
 * sectie die met een bak custom CSS en !important op zijn plek is geduwd,
 * haalt exit code 0 net zo goed. Dit script leest de opgeslagen Elementor-
 * data (en eventueel losse CSS-bestanden) en meldt precies de dingen die
 * regel 5a verbiedt.
 *
 * Gebruik:
 *   node check-native.js <elementor-data.json> [extra.css ...]
 *
 * De JSON is de inhoud van de post-meta `_elementor_data` van de pagina.
 * Losse CSS-bestanden (WordPress' "Additional CSS", een child-theme
 * stylesheet) kun je er als extra argumenten achteraan zetten.
 *
 * Exit code 0 = alles native
 * Exit code 1 = er is een bypass gevonden (of aangetroffen zonder akkoord)
 * Exit code 2 = het script kon niet draaien
 */

const fs = require("fs");
const path = require("path");

const EXIT_OK = 0;
const EXIT_BYPASS = 1;
const EXIT_KAPOT = 2;

const argumenten = process.argv.slice(2);
if (argumenten.length === 0) {
  console.error("Gebruik: node check-native.js <elementor-data.json> [extra.css ...]");
  process.exit(EXIT_KAPOT);
}

const dataPath = path.resolve(argumenten[0]);
const cssPaden = argumenten.slice(1).map((p) => path.resolve(p));

if (!fs.existsSync(dataPath)) {
  console.error(`Elementor-data niet gevonden: ${dataPath}`);
  process.exit(EXIT_KAPOT);
}

let data;
try {
  const ruw = fs.readFileSync(dataPath, "utf8");
  data = JSON.parse(ruw);
  // _elementor_data wordt soms als JSON-string-in-een-string bewaard.
  if (typeof data === "string") data = JSON.parse(data);
} catch (err) {
  console.error(`Kon de Elementor-data niet lezen als JSON: ${err.message}`);
  process.exit(EXIT_KAPOT);
}

// Widgets waarmee ruwe HTML/code de pagina in komt. Regel 5a staat die
// alleen toe voor een enkel detail na akkoord, nooit voor structuur.
const CODE_WIDGETS = new Set(["html", "shortcode", "code-highlight", "text-path"]);

const bevindingen = [];
const telling = { containers: 0, widgets: 0, perWidget: {} };

function meld(soort, pad, uitleg, fragment) {
  bevindingen.push({ soort, pad, uitleg, fragment });
}

function doorzoekWaarde(waarde, pad, elementNaam) {
  if (typeof waarde === "string") {
    if (waarde.includes("!important")) {
      meld(
        "!important",
        pad,
        `!important gevonden in de instellingen van ${elementNaam}`,
        waarde.trim().slice(0, 120)
      );
    }
    return;
  }
  if (Array.isArray(waarde)) {
    waarde.forEach((v, i) => doorzoekWaarde(v, `${pad}[${i}]`, elementNaam));
    return;
  }
  if (waarde && typeof waarde === "object") {
    for (const [k, v] of Object.entries(waarde)) doorzoekWaarde(v, `${pad}.${k}`, elementNaam);
  }
}

function loopElement(el, pad) {
  if (!el || typeof el !== "object") return;

  const type = el.elType === "widget" ? el.widgetType || "widget" : el.elType || "onbekend";
  const naam = `${type} (${el.id || "geen id"})`;
  const hierPad = `${pad}/${type}`;

  if (el.elType === "widget") {
    telling.widgets++;
    telling.perWidget[type] = (telling.perWidget[type] || 0) + 1;
  } else if (el.elType === "container" || el.elType === "section" || el.elType === "column") {
    telling.containers++;
  }

  const settings = el.settings || {};

  if (typeof settings.custom_css === "string" && settings.custom_css.trim()) {
    meld(
      "custom CSS",
      hierPad,
      `custom_css ingevuld op ${naam}`,
      settings.custom_css.trim().slice(0, 160)
    );
  }

  if (el.elType === "widget" && CODE_WIDGETS.has(el.widgetType)) {
    const inhoud = String(settings.html || settings.shortcode || "");
    const lijktStructuur = /<(div|section|header|footer|nav|ul|article)\b/i.test(inhoud);
    meld(
      lijktStructuur ? "html-widget (structuur)" : "html-widget",
      hierPad,
      lijktStructuur
        ? `${naam} bevat blok-HTML en wordt dus voor structuur gebruikt`
        : `${naam} is een code-widget; alleen toegestaan voor één detail na akkoord`,
      inhoud.trim().slice(0, 160)
    );
  }

  doorzoekWaarde(settings, hierPad, naam);

  (el.elements || []).forEach((kind, i) => loopElement(kind, `${hierPad}[${i}]`));
}

if (!Array.isArray(data)) {
  console.error("De Elementor-data is geen lijst van elementen. Verwacht de inhoud van _elementor_data.");
  process.exit(EXIT_KAPOT);
}

data.forEach((el, i) => loopElement(el, `[${i}]`));

for (const cssPad of cssPaden) {
  if (!fs.existsSync(cssPad)) {
    console.error(`CSS-bestand niet gevonden: ${cssPad}`);
    process.exit(EXIT_KAPOT);
  }
  const css = fs.readFileSync(cssPad, "utf8");
  const regels = css.split("\n");
  const belangrijk = regels
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r.includes("!important"));
  const cmpSelectors = regels
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => /\.cmp-[\w-]+/.test(r));

  if (css.trim()) {
    meld(
      "los CSS-bestand",
      path.basename(cssPad),
      `${path.basename(cssPad)} bevat ${regels.length} regel(s) CSS buiten Elementor's eigen tabs om`,
      css.trim().slice(0, 160)
    );
  }
  belangrijk.forEach(({ r, i }) =>
    meld("!important", `${path.basename(cssPad)}:${i + 1}`, "!important in een los CSS-bestand", r.trim())
  );
  cmpSelectors.forEach(({ r, i }) =>
    meld(
      "cmp-selector in CSS",
      `${path.basename(cssPad)}:${i + 1}`,
      "een cmp--class wordt via CSS gestyled in plaats van via Elementor's instellingen",
      r.trim()
    )
  );
}

console.log(`Gecontroleerd: ${telling.containers} container(s), ${telling.widgets} widget(s).`);
const widgetLijst = Object.entries(telling.perWidget)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `${k}×${v}`)
  .join(", ");
if (widgetLijst) console.log(`Widgets: ${widgetLijst}`);

if (bevindingen.length === 0) {
  console.log("\nRESULTAAT: NATIVE — geen custom CSS, geen !important, geen code-widget.");
  console.log("Dit is de bevestiging die CLAUDE.md stap 5a bij elke sectie vraagt.");
  process.exit(EXIT_OK);
}

console.log(`\n${bevindingen.length} bevinding(en):\n`);
const perSoort = {};
bevindingen.forEach((b) => {
  if (!perSoort[b.soort]) perSoort[b.soort] = [];
  perSoort[b.soort].push(b);
});

for (const [soort, lijst] of Object.entries(perSoort)) {
  console.log(`${soort} (${lijst.length}×)`);
  lijst.slice(0, 10).forEach((b) => {
    console.log(`  ${b.pad}`);
    console.log(`    ${b.uitleg}`);
    if (b.fragment) console.log(`    > ${b.fragment.replace(/\s+/g, " ")}`);
  });
  if (lijst.length > 10) console.log(`  ... en nog ${lijst.length - 10}.`);
  console.log("");
}

console.log("RESULTAAT: NIET NATIVE — dit mag alleen met Mark's voorafgaande akkoord (CLAUDE.md stap 5a).");
console.log("Werkt een native instelling niet, controleer dan eerst de sleutelnaam (flex_gap,");
console.log("flex_justify_content, flex_align_items, text_padding) voordat je naar CSS uitwijkt.");
process.exit(EXIT_BYPASS);
