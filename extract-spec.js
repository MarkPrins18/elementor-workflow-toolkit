#!/usr/bin/env node
/**
 * extract-spec.js
 *
 * Leest een goedgekeurde HTML-pagina uit en zet elk element met een
 * data-cmp-naam om naar een exacte, meetbare beschrijving: tekst, type,
 * plek in de boom (ouder/kinderen, in de juiste volgorde), opmaak, en de
 * dozen-model waarden (padding, margin, gap).
 *
 * Dit bestand ("spec.json") is de bron waaruit een Elementor-pagina gebouwd
 * wordt. Het is bewust de LAATSTE stap waarin er nog geïnterpreteerd wordt
 * (bijvoorbeeld: "dit element is waarschijnlijk een knop"); alles daarna is
 * gewoon exact overnemen van wat hier staat.
 *
 * Gebruik:
 *   node extract-spec.js <pad-naar-html> [pad-naar-output.json]
 *   node extract-spec.js <pad-naar-html> --breedtes=1440,1024,390 [--out-dir=...]
 *
 * Zonder --breedtes wordt er op 1440px gemeten en komt de output naast de
 * HTML te staan als "<naam>.spec.json". Met --breedtes komt er één spec per
 * breedte: "<naam>.1440.spec.json", "<naam>.390.spec.json", etc. Zonder die
 * metingen is er voor tablet en mobiel geen bron van waarheid en wordt daar
 * dus geschat (CLAUDE.md stap 5b).
 *
 * Exit code 0 = spec geschreven
 * Exit code 1 = het ontwerp is niet bruikbaar als bron (bijv. dubbele namen)
 * Exit code 2 = het script kon niet draaien
 */

const fs = require("fs");
const path = require("path");
const { openBrowser, stabilizePage } = require("./lib/browser");

const EXIT_OK = 0;
const EXIT_ONBRUIKBAAR = 1;
const EXIT_KAPOT = 2;

const args = process.argv.slice(2);
const vlaggen = args.filter((a) => a.startsWith("--"));
const posities = args.filter((a) => !a.startsWith("--"));

const htmlArg = posities[0];
if (!htmlArg) {
  console.error("Gebruik: node extract-spec.js <pad-naar-html> [output.json] [--breedtes=1440,1024,390]");
  process.exit(EXIT_KAPOT);
}

const htmlPath = path.resolve(htmlArg);
if (!fs.existsSync(htmlPath)) {
  console.error(`Bestand niet gevonden: ${htmlPath}`);
  process.exit(EXIT_KAPOT);
}

function vlagWaarde(naam) {
  const v = vlaggen.find((f) => f.startsWith(`--${naam}=`));
  return v ? v.slice(naam.length + 3) : null;
}

const breedtesArg = vlagWaarde("breedtes");
const outDir = vlagWaarde("out-dir");
const hoogte = parseInt(vlagWaarde("hoogte") || "900", 10);

const breedtes = breedtesArg
  ? breedtesArg
      .split(",")
      .map((b) => parseInt(b.trim(), 10))
      .filter((b) => Number.isFinite(b) && b > 0)
  : [1440];

if (breedtesArg && breedtes.length === 0) {
  console.error(`--breedtes bevat geen bruikbare getallen: ${breedtesArg}`);
  process.exit(EXIT_KAPOT);
}

const basisNaam = path.basename(htmlPath).replace(/\.html?$/i, "");
const basisMap = outDir ? path.resolve(outDir) : path.dirname(htmlPath);

function outputPathVoor(breedte) {
  if (!breedtesArg && posities[1]) return path.resolve(posities[1]);
  if (!breedtesArg) return path.join(basisMap, `${basisNaam}.spec.json`);
  return path.join(basisMap, `${basisNaam}.${breedte}.spec.json`);
}

const htmlUrl = "file://" + htmlPath;

// De eigenschappen die we per element vastleggen.
const TYPOGRAPHY_PROPS = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "textAlign",
  "textTransform",
  "textDecorationLine",
  "color",
];

const BOX_PROPS = [
  "width",
  "height",
  "maxWidth",
  "minHeight",
  "aspectRatio",
  "boxSizing",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
];

const LAYOUT_PROPS = [
  "display",
  "flexDirection",
  "flexWrap",
  "justifyContent",
  "alignItems",
  "rowGap",
  "columnGap",
  "gridTemplateColumns",
  "gridTemplateRows",
];

// Randen per zijde: de shorthand borderWidth geeft bij verschillende zijden
// een samengestelde waarde ("1px 0px 0px"), die niet één op één in
// Elementor's per-zijde velden te zetten is.
const BACKGROUND_PROPS = [
  "backgroundColor",
  "backgroundImage",
  "borderRadius",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "borderTopStyle",
  "borderRightStyle",
  "borderBottomStyle",
  "borderLeftStyle",
];

// Zichtbare effecten die eerder helemaal buiten de spec vielen. Een element
// dat volledig uit een gradient en een schaduw bestaat, stond in de oude spec
// als "geen achtergrond".
const EFFECT_PROPS = ["transform", "boxShadow", "opacity", "filter", "position", "zIndex", "overflow"];

async function extract(page) {
  return page.evaluate(
    ({ typographyProps, boxProps, layoutProps, backgroundProps, effectProps }) => {
      const elements = Array.from(document.querySelectorAll("[data-cmp]"));
      const components = {};
      const roots = [];
      const duplicaten = [];
      const ongetagdeTekst = [];

      function nearestCmpAncestor(el) {
        let node = el.parentElement;
        while (node) {
          if (node.hasAttribute && node.hasAttribute("data-cmp")) {
            return node.getAttribute("data-cmp");
          }
          node = node.parentElement;
        }
        return null;
      }

      // Tekst die rechtstreeks in dit element staat, niet in een kind-cmp.
      // Twee aangrenzende stukken zonder witruimte ertussen (bijvoorbeeld
      // "<b>Vandaag</b>zo 20 sep") worden gescheiden, anders levert de spec
      // letterlijk verkeerde kopij op om in Elementor over te typen.
      function directText(el) {
        let text = "";
        const voegToe = (deel) => {
          if (!deel) return;
          const laatste = text.slice(-1);
          const eerste = deel.charAt(0);
          if (text && /[\w)\]]/.test(laatste) && /[\w([]/.test(eerste)) text += " ";
          text += deel;
        };
        // Recursief, want de aaneenplakking zit ook op diepere niveaus:
        // <a><b>14:30</b><small>Zaal 1</small></a> levert anders "14:30Zaal 1".
        const loop = (node) => {
          node.childNodes.forEach((kind) => {
            if (kind.nodeType === Node.TEXT_NODE) {
              voegToe(kind.textContent);
            } else if (kind.nodeType === Node.ELEMENT_NODE && !kind.hasAttribute("data-cmp")) {
              loop(kind);
            }
          });
        };
        loop(el);
        return text.replace(/\s+/g, " ").trim();
      }

      // Een <a> kan een tekstlink zijn (Heading-widget met link) of een echte
      // knop (Button-widget). Dat onderscheid bepaalt welk widget je bouwt,
      // dus het hoort in de spec te staan en niet bij het bouwen geraden te
      // worden.
      function lijktOpKnop(cs) {
        const achtergrond = cs.backgroundColor !== "rgba(0, 0, 0, 0)" && cs.backgroundColor !== "transparent";
        const randRondom = ["borderTopStyle", "borderRightStyle", "borderBottomStyle", "borderLeftStyle"].every(
          (p) => cs[p] !== "none"
        );
        const pl = parseFloat(cs.paddingLeft) || 0;
        const pr = parseFloat(cs.paddingRight) || 0;
        return achtergrond || randRondom || (pl >= 8 && pr >= 8);
      }

      function bepaalRol(tag, cs, hasChildComponents, text) {
        if (tag === "img") return "afbeelding";
        if (tag === "button") return "knop";
        if (tag === "a") return lijktOpKnop(cs) ? "knop" : "link";
        if (/^h[1-6]$/.test(tag)) return "titel";
        if (hasChildComponents) return "container";
        if (text) return "tekst";
        return "container";
      }

      elements.forEach((el) => {
        const name = el.getAttribute("data-cmp");
        if (!name) return;
        if (components[name]) {
          duplicaten.push(name);
          return;
        }

        const cs = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();

        const childComponents = Array.from(el.querySelectorAll("[data-cmp]")).filter(
          (child) => nearestCmpAncestor(child) === name
        );
        const hasChildComponents = childComponents.length > 0;
        const text = directText(el);
        const tag = el.tagName.toLowerCase();

        const pak = (lijst) => {
          const uit = {};
          lijst.forEach((p) => (uit[p] = cs[p]));
          return uit;
        };

        components[name] = {
          tag,
          role: bepaalRol(tag, cs, hasChildComponents, text),
          text: text || null,
          href: tag === "a" ? el.getAttribute("href") : null,
          src: tag === "img" ? el.getAttribute("src") : null,
          alt: tag === "img" ? el.getAttribute("alt") : null,
          parent: nearestCmpAncestor(el),
          children: childComponents.map((c) => c.getAttribute("data-cmp")),
          geometry: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          typography: pak(typographyProps),
          box: pak(boxProps),
          layout: pak(layoutProps),
          background: pak(backgroundProps),
          effects: pak(effectProps),
        };

        // Tekst binnen dit element die een eigen opmaak heeft maar geen eigen
        // naam: die opmaak wordt nooit vergeleken door compare.js, want er is
        // niets om op te koppelen.
        Array.from(el.querySelectorAll("*")).forEach((kind) => {
          if (kind.hasAttribute("data-cmp")) return;
          if (kind.closest("[data-cmp]") !== el) return;
          const eigenTekst = Array.from(kind.childNodes).some(
            (n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim()
          );
          if (!eigenTekst) return;
          const kcs = window.getComputedStyle(kind);
          const afwijkend =
            kcs.fontSize !== cs.fontSize ||
            kcs.fontWeight !== cs.fontWeight ||
            kcs.color !== cs.color ||
            kcs.textTransform !== cs.textTransform;
          if (afwijkend) {
            ongetagdeTekst.push({
              binnen: name,
              tag: kind.tagName.toLowerCase(),
              klasse: kind.className || null,
              tekst: kind.textContent.trim().slice(0, 40),
            });
          }
        });
      });

      elements.forEach((el) => {
        const name = el.getAttribute("data-cmp");
        if (components[name] && !components[name].parent && !roots.includes(name)) {
          roots.push(name);
        }
      });

      return { roots, components, duplicaten: Array.from(new Set(duplicaten)), ongetagdeTekst };
    },
    {
      typographyProps: TYPOGRAPHY_PROPS,
      boxProps: BOX_PROPS,
      layoutProps: LAYOUT_PROPS,
      backgroundProps: BACKGROUND_PROPS,
      effectProps: EFFECT_PROPS,
    }
  );
}

(async () => {
  const browser = await openBrowser();
  let onbruikbaar = false;

  try {
    for (const breedte of breedtes) {
      const page = await browser.newPage({ viewport: { width: breedte, height: hoogte } });
      await page.goto(htmlUrl, { waitUntil: "networkidle" });
      await stabilizePage(page);
      const data = await extract(page);
      await page.close();

      const doel = outputPathVoor(breedte);
      fs.mkdirSync(path.dirname(doel), { recursive: true });

      const spec = {
        generatedAt: new Date().toISOString(),
        source: htmlPath,
        viewport: { width: breedte, height: hoogte },
        roots: data.roots,
        components: data.components,
      };
      fs.writeFileSync(doel, JSON.stringify(spec, null, 2));

      const aantal = Object.keys(data.components).length;
      console.log(`\n${breedte}px — ${aantal} element(en) met data-cmp gevonden.`);
      console.log(`Root-elementen: ${data.roots.join(", ") || "(geen)"}`);
      console.log(`Spec opgeslagen in ${doel}`);

      if (data.duplicaten.length) {
        console.error(
          `\nONBRUIKBAAR: data-cmp="${data.duplicaten.join('", "')}" komt meer dan één keer voor.\n` +
            "Elke naam moet één element aanwijzen, anders weet compare.js niet wat het met wat vergelijkt.\n" +
            "Geef de dubbele elementen een eigen naam (bijvoorbeeld -1 en -2) en draai opnieuw."
        );
        onbruikbaar = true;
      }

      if (data.ongetagdeTekst.length) {
        console.warn(
          `\nLet op: ${data.ongetagdeTekst.length} element(en) met eigen tekst en afwijkende opmaak hebben ` +
            "geen eigen data-cmp.\nHun opmaak wordt door compare.js dus niet gecontroleerd:"
        );
        data.ongetagdeTekst.slice(0, 15).forEach((o) => {
          console.warn(`  <${o.tag}${o.klasse ? ' class="' + o.klasse + '"' : ""}> in ${o.binnen} — "${o.tekst}"`);
        });
        if (data.ongetagdeTekst.length > 15) {
          console.warn(`  ... en nog ${data.ongetagdeTekst.length - 15}.`);
        }
      }
    }
  } finally {
    await browser.close();
  }

  process.exitCode = onbruikbaar ? EXIT_ONBRUIKBAAR : EXIT_OK;
})().catch((err) => {
  console.error("extract-spec.js kon niet draaien (exit 2 = kapot):");
  console.error(err && err.message ? err.message : err);
  process.exit(EXIT_KAPOT);
});
