#!/usr/bin/env node
/**
 * screenshot-diff.js — de controle bij CLAUDE.md stap 8.1.
 *
 * compare.js meet losse elementen. Dingen die daar tussendoor glippen — een
 * blok in de verkeerde volgorde, twee blokken die elkaar overlappen, een
 * achtergrond die er helemaal niet staat — zie je pas als je de twee
 * pagina's naast elkaar legt. Dit script maakt die vergelijking, per
 * breakpoint, als afbeelding.
 *
 * Gebruik:
 *   node screenshot-diff.js <config.json>
 *
 * Gebruikt dezelfde config als compare.js (htmlPath, pageUrl, breakpoints).
 * Optioneel in de config:
 *   "screenshotDrempelPct": 2     hoeveel procent afwijkende pixels mag
 *   "screenshotDir": "./reports/screenshots"
 *
 * Exit code 0 = onder de drempel
 * Exit code 1 = te veel afwijkende pixels
 * Exit code 2 = het script kon niet draaien
 */

const fs = require("fs");
const path = require("path");
const { openBrowser, stabilizePage } = require("./lib/browser");

const EXIT_OK = 0;
const EXIT_AFWIJKING = 1;
const EXIT_KAPOT = 2;

const configPath = process.argv[2];
if (!configPath) {
  console.error("Gebruik: node screenshot-diff.js <config.json>");
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
  breakpoints = [{ name: "desktop", width: 1440, height: 900 }],
  screenshotDrempelPct = 2,
  screenshotDir = "./reports/screenshots",
} = config;

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

const uitMap = path.resolve(screenshotDir);

// De vergelijking zelf gebeurt in de browser met canvas, zodat de toolkit
// geen extra afhankelijkheid nodig heeft om PNG's te kunnen lezen.
async function vergelijkInBrowser(page, htmlPng, elementorPng, drempelPerPixel) {
  return page.evaluate(
    async ({ a, b, drempel }) => {
      function laad(dataUrl) {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = dataUrl;
        });
      }

      const imgA = await laad("data:image/png;base64," + a);
      const imgB = await laad("data:image/png;base64," + b);

      const breedte = Math.max(imgA.width, imgB.width);
      const hoogte = Math.max(imgA.height, imgB.height);

      function naarData(img) {
        const c = document.createElement("canvas");
        c.width = breedte;
        c.height = hoogte;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, breedte, hoogte);
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, breedte, hoogte);
      }

      const dataA = naarData(imgA);
      const dataB = naarData(imgB);

      const diffCanvas = document.createElement("canvas");
      diffCanvas.width = breedte;
      diffCanvas.height = hoogte;
      const diffCtx = diffCanvas.getContext("2d");
      const diffData = diffCtx.createImageData(breedte, hoogte);

      let anders = 0;
      const totaal = breedte * hoogte;

      for (let i = 0; i < dataA.data.length; i += 4) {
        const dr = Math.abs(dataA.data[i] - dataB.data[i]);
        const dg = Math.abs(dataA.data[i + 1] - dataB.data[i + 1]);
        const db = Math.abs(dataA.data[i + 2] - dataB.data[i + 2]);
        const verschil = Math.max(dr, dg, db);

        if (verschil > drempel) {
          anders++;
          diffData.data[i] = 255;
          diffData.data[i + 1] = 0;
          diffData.data[i + 2] = 80;
          diffData.data[i + 3] = 255;
        } else {
          // Ongewijzigde pixels vervagen naar lichtgrijs, zodat het rood
          // eruit springt maar je nog ziet waar je bent op de pagina.
          const grijs = (dataA.data[i] + dataA.data[i + 1] + dataA.data[i + 2]) / 3;
          const licht = 200 + (grijs / 255) * 55;
          diffData.data[i] = licht;
          diffData.data[i + 1] = licht;
          diffData.data[i + 2] = licht;
          diffData.data[i + 3] = 255;
        }
      }

      diffCtx.putImageData(diffData, 0, 0);

      // Eén afbeelding met de drie naast elkaar: ontwerp, Elementor, verschil.
      const marge = 16;
      const naast = document.createElement("canvas");
      naast.width = breedte * 3 + marge * 4;
      naast.height = hoogte + marge * 2 + 28;
      const nctx = naast.getContext("2d");
      nctx.fillStyle = "#f2f2f2";
      nctx.fillRect(0, 0, naast.width, naast.height);
      nctx.fillStyle = "#111111";
      nctx.font = "14px sans-serif";
      ["Ontwerp (bron)", "Elementor", "Verschil"].forEach((label, i) => {
        nctx.fillText(label, marge + i * (breedte + marge), 20);
      });
      nctx.drawImage(imgA, marge, marge + 20);
      nctx.drawImage(imgB, marge * 2 + breedte, marge + 20);
      nctx.drawImage(diffCanvas, marge * 3 + breedte * 2, marge + 20);

      return {
        anders,
        totaal,
        breedte,
        hoogte,
        hoogteA: imgA.height,
        hoogteB: imgB.height,
        naastElkaar: naast.toDataURL("image/png").split(",")[1],
      };
    },
    { a: htmlPng, b: elementorPng, drempel: drempelPerPixel }
  );
}

(async () => {
  const browser = await openBrowser();
  fs.mkdirSync(uitMap, { recursive: true });

  let mislukt = false;

  try {
    for (const bp of breakpoints) {
      const context = await browser.newContext({ viewport: { width: bp.width, height: bp.height } });

      const htmlPage = await context.newPage();
      await htmlPage.goto("file://" + resolvedHtmlPath, { waitUntil: "networkidle" });
      await stabilizePage(htmlPage);
      const htmlPng = (await htmlPage.screenshot({ fullPage: true })).toString("base64");

      const elementorPage = await context.newPage();
      await elementorPage.goto(pageUrl, { waitUntil: "networkidle" });
      await stabilizePage(elementorPage);
      const elementorPng = (await elementorPage.screenshot({ fullPage: true })).toString("base64");

      const werkblad = await context.newPage();
      await werkblad.goto("about:blank");
      const resultaat = await vergelijkInBrowser(werkblad, htmlPng, elementorPng, 32);

      await context.close();

      const pct = (resultaat.anders / resultaat.totaal) * 100;
      const doel = path.join(uitMap, `${configNaam}-${bp.name}.png`);
      fs.writeFileSync(doel, Buffer.from(resultaat.naastElkaar, "base64"));

      console.log(`\n=== ${bp.name} (${bp.width}px) ===`);
      console.log(`Ontwerp ${resultaat.breedte}×${resultaat.hoogteA}px, Elementor ${resultaat.breedte}×${resultaat.hoogteB}px`);
      if (Math.abs(resultaat.hoogteA - resultaat.hoogteB) > 4) {
        console.log(
          `LET OP: de pagina's verschillen ${Math.abs(resultaat.hoogteA - resultaat.hoogteB)}px in totale hoogte.`
        );
      }
      console.log(`Afwijkende pixels: ${resultaat.anders} van ${resultaat.totaal} (${pct.toFixed(2)}%)`);
      console.log(`Beeld opgeslagen: ${doel}`);

      if (pct > screenshotDrempelPct) {
        console.log(`FOUT: boven de drempel van ${screenshotDrempelPct}%.`);
        mislukt = true;
      }
    }
  } finally {
    await browser.close();
  }

  if (mislukt) {
    console.log(
      "\nRESULTAAT: MISLUKT — bekijk de verschil-afbeelding. Rood is een pixel die in het ontwerp anders is\n" +
        "dan in Elementor. Let vooral op hele blokken rood: dat is meestal een verkeerde volgorde of een\n" +
        "ontbrekende achtergrond, niet een kwestie van een paar pixels."
    );
    process.exitCode = EXIT_AFWIJKING;
    return;
  }

  console.log("\nRESULTAAT: GESLAAGD — het verschil blijft onder de drempel op elk breakpoint.");
  process.exitCode = EXIT_OK;
})().catch((err) => {
  console.error("screenshot-diff.js kon niet draaien (exit 2 = kapot):");
  console.error(err && err.message ? err.message : err);
  process.exit(EXIT_KAPOT);
});
