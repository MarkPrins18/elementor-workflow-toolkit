#!/usr/bin/env node
/**
 * extract-spec.js
 *
 * Leest een goedgekeurde HTML-pagina uit en zet elk element met een
 * data-cmp-naam om naar een exacte, meetbare beschrijving: tekst, type,
 * plek in de boom (ouder/kinderen, in de juiste volgorde), opmaak, en
 * de dozen-model waarden (padding, margin, gap).
 *
 * Dit bestand ("spec.json") is de bron waaruit een Elementor-pagina gebouwd
 * wordt. Het is bewust de LAATSTE stap waarin er nog geïnterpreteerd wordt
 * (bijvoorbeeld: "dit element is waarschijnlijk een knop"); alles daarna is
 * gewoon exact overnemen van wat hier staat.
 *
 * Gebruik:
 *   node extract-spec.js <pad-naar-html> [pad-naar-output.json]
 *
 * Zonder tweede argument komt de output naast de HTML te staan als
 * "<naam>.spec.json".
 */

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const htmlArg = process.argv[2];
if (!htmlArg) {
  console.error("Gebruik: node extract-spec.js <pad-naar-html> [output.json]");
  process.exit(1);
}

const htmlPath = path.resolve(htmlArg);
if (!fs.existsSync(htmlPath)) {
  console.error(`Bestand niet gevonden: ${htmlPath}`);
  process.exit(1);
}

const outputPath = process.argv[3]
  ? path.resolve(process.argv[3])
  : htmlPath.replace(/\.html?$/i, "") + ".spec.json";

const htmlUrl = "file://" + htmlPath;

// De typografie- en opmaakeigenschappen die we per element vastleggen.
const TYPOGRAPHY_PROPS = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  "textAlign",
  "textTransform",
  "color",
];

const BOX_PROPS = [
  "width",
  "height",
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
  "justifyContent",
  "alignItems",
  "rowGap",
  "columnGap",
  "gridTemplateColumns",
];

const BACKGROUND_PROPS = ["backgroundColor", "borderRadius", "borderWidth", "borderColor", "borderStyle"];

async function stabilizePage(page) {
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  });
  await page.addStyleTag({
    content: `*, *::before, *::after {
      animation-duration: 0s !important;
      animation-delay: 0s !important;
      transition-duration: 0s !important;
      transition-delay: 0s !important;
    }`,
  });
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

function guessRole(tagName, hasChildComponents, hasDirectText) {
  const tag = tagName.toLowerCase();
  if (tag === "img") return "afbeelding";
  if (tag === "a" || tag === "button") return "knop";
  if (/^h[1-6]$/.test(tag)) return "titel";
  if (hasChildComponents) return "container";
  if (hasDirectText) return "tekst";
  return "container";
}

async function extract(page) {
  return page.evaluate(
    ({ typographyProps, boxProps, layoutProps, backgroundProps }) => {
      const elements = Array.from(document.querySelectorAll("[data-cmp]"));
      const components = {};
      const roots = [];

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

      function directText(el) {
        // Tekst die rechtstreeks in dit element staat, niet in een kind-cmp-element.
        let text = "";
        el.childNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            text += node.textContent;
          } else if (node.nodeType === Node.ELEMENT_NODE && !node.hasAttribute("data-cmp")) {
            text += node.textContent;
          }
        });
        return text.trim();
      }

      elements.forEach((el) => {
        const name = el.getAttribute("data-cmp");
        if (!name) return;
        if (components[name]) {
          console.warn(`Let op: data-cmp="${name}" komt meer dan één keer voor, alleen de eerste telt.`);
          return;
        }

        const cs = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();

        const childComponents = Array.from(el.querySelectorAll("[data-cmp]")).filter(
          (child) => nearestCmpAncestor(child) === name
        );
        const hasChildComponents = childComponents.length > 0;
        const text = directText(el);

        const typography = {};
        typographyProps.forEach((p) => (typography[p] = cs[p]));

        const box = {};
        boxProps.forEach((p) => (box[p] = cs[p]));

        const layout = {};
        layoutProps.forEach((p) => (layout[p] = cs[p]));

        const background = {};
        backgroundProps.forEach((p) => (background[p] = cs[p]));

        const tag = el.tagName.toLowerCase();
        const role = (function guessRole() {
          if (tag === "img") return "afbeelding";
          if (tag === "a" || tag === "button") return "knop";
          if (/^h[1-6]$/.test(tag)) return "titel";
          if (hasChildComponents) return "container";
          if (text) return "tekst";
          return "container";
        })();

        components[name] = {
          tag,
          role,
          text: text || null,
          href: tag === "a" ? el.getAttribute("href") : null,
          src: tag === "img" ? el.getAttribute("src") : null,
          alt: tag === "img" ? el.getAttribute("alt") : null,
          parent: nearestCmpAncestor(el),
          children: childComponents.map((c) => c.getAttribute("data-cmp")),
          geometry: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          },
          typography,
          box,
          layout,
          background,
        };
      });

      // Bepaal de root-elementen (geen data-cmp-ouder) in document-volgorde.
      elements.forEach((el) => {
        const name = el.getAttribute("data-cmp");
        if (components[name] && !components[name].parent && !roots.includes(name)) {
          roots.push(name);
        }
      });

      return { roots, components };
    },
    { typographyProps: TYPOGRAPHY_PROPS, boxProps: BOX_PROPS, layoutProps: LAYOUT_PROPS, backgroundProps: BACKGROUND_PROPS }
  );
}

(async () => {
  const launchOptions = {};
  if (process.env.PW_CHROMIUM_PATH) {
    launchOptions.executablePath = process.env.PW_CHROMIUM_PATH;
  }
  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  page.on("console", (msg) => {
    if (msg.type() === "warning") console.warn(msg.text());
  });

  await page.goto(htmlUrl, { waitUntil: "networkidle" });
  await stabilizePage(page);
  const data = await extract(page);

  await browser.close();

  const spec = {
    generatedAt: new Date().toISOString(),
    source: htmlPath,
    ...data,
  };

  fs.writeFileSync(outputPath, JSON.stringify(spec, null, 2));

  const count = Object.keys(data.components).length;
  console.log(`${count} element(en) met data-cmp gevonden.`);
  console.log(`Root-elementen: ${data.roots.join(", ") || "(geen)"}`);
  console.log(`Spec opgeslagen in ${outputPath}`);
})().catch((err) => {
  console.error("extract-spec.js is gestopt met een fout:");
  console.error(err);
  process.exit(1);
});
