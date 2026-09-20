#!/usr/bin/env node
/**
 * run-tests.js — controleert de controleurs.
 *
 * compare.js en extract-spec.js zijn de enige reden dat een sectie "klaar"
 * mag heten (CLAUDE.md stap 7). Zonder deze test kan een verruiming in die
 * scripts ongemerkt de hele workflow zachter maken.
 *
 * Gebruik: npm test
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const TEST = __dirname;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "ewt-test-"));

let geslaagd = 0;
let gefaald = 0;

function fileUrl(p) {
  return "file://" + path.resolve(p);
}

function schrijfConfig(naam, config) {
  const p = path.join(TMP, naam + ".json");
  fs.writeFileSync(p, JSON.stringify(config, null, 2));
  return p;
}

function draai(script, args) {
  return spawnSync(process.execPath, [path.join(ROOT, script), ...args], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 120000,
    env: process.env,
  });
}

function test(naam, verwachteCode, script, args, extraCheck) {
  const r = draai(script, args);
  const code = r.status;
  const uitvoer = (r.stdout || "") + (r.stderr || "");
  const timeout = r.error && r.error.code === "ETIMEDOUT";

  let ok = !timeout && code === verwachteCode;
  let reden = timeout
    ? "script liep vast (timeout)"
    : `exit ${code}, verwacht ${verwachteCode}`;

  if (ok && extraCheck) {
    const check = extraCheck(uitvoer);
    if (check !== true) {
      ok = false;
      reden = check;
    }
  }

  if (ok) {
    geslaagd++;
    console.log(`  ok    ${naam}`);
  } else {
    gefaald++;
    console.log(`  FOUT  ${naam} — ${reden}`);
    console.log(
      uitvoer
        .split("\n")
        .slice(0, 25)
        .map((l) => "        " + l)
        .join("\n")
    );
  }
}

const basis = {
  htmlPath: path.join(TEST, "source.html"),
  pageUrl: fileUrl(path.join(TEST, "built-correct.html")),
  tolerancePx: 1,
  breakpoints: [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobiel", width: 390, height: 900 },
  ],
  reportPath: path.join(TMP, "report.json"),
};

const foutBasis = { ...basis, pageUrl: fileUrl(path.join(TEST, "built-with-fout.html")) };

console.log("\ncompare.js — kernfuncties");

test("een correcte build slaagt", 0, "compare.js", [schrijfConfig("ok", basis)], (uit) =>
  /GESLAAGD/.test(uit) ? true : "geen GESLAAGD in de uitvoer"
);

test("een verkeerde fontgrootte wordt betrapt", 1, "compare.js", [schrijfConfig("fout", foutBasis)], (uit) =>
  /fontSize/.test(uit) ? true : "fontSize niet als afwijking gemeld"
);

console.log("\ncompare.js — geen vals 'geslaagd' meer");

test(
  "een typefout in roots is ongeldig, niet geslaagd",
  1,
  "compare.js",
  [schrijfConfig("roots-typo", { ...basis, roots: ["sectie-die-niet-bestaat"] })],
  (uit) => (/ONGELDIG/.test(uit) ? true : "niet als ONGELDIG gemeld")
);

test(
  "nul vergeleken elementen is ongeldig, niet geslaagd",
  1,
  "compare.js",
  [
    schrijfConfig("leeg", {
      ...basis,
      htmlPath: path.join(TEST, "fixtures", "zonder-cmp.html"),
      pageUrl: fileUrl(path.join(TEST, "fixtures", "zonder-cmp.html")),
    }),
  ],
  (uit) => (/nul elementen/.test(uit) ? true : "geen melding over nul elementen")
);

test(
  "een ruime geometrie-tolerantie verbergt een fontfout niet",
  1,
  "compare.js",
  [schrijfConfig("ruim", { ...foutBasis, tolerancePx: 20 })],
  (uit) => (/fontSize/.test(uit) ? true : "fontSize werd door de tolerantie ingeslikt")
);

test(
  "--responsive met één breakpoint is ongeldig, niet geslaagd",
  1,
  "compare.js",
  [
    schrijfConfig("een-bp", { ...basis, breakpoints: [{ name: "desktop", width: 1440, height: 900 }] }),
    "--responsive",
  ],
  (uit) => (/ONGELDIG/.test(uit) ? true : "niet als ONGELDIG gemeld")
);

test(
  "--responsive test echte tussenbreedtes",
  0,
  "compare.js",
  [schrijfConfig("resp", basis), "--responsive"],
  (uit) => (/Tussenbreedtes: .*\d+px/.test(uit) ? true : "geen tussenbreedtes getest")
);

test(
  "een dubbele cmp-naam is ongeldig",
  1,
  "compare.js",
  [
    schrijfConfig("dubbel", {
      ...basis,
      pageUrl: fileUrl(path.join(TEST, "fixtures", "dubbele-naam.html")),
    }),
  ],
  (uit) => (/dubbele cmp/.test(uit) ? true : "dubbele naam niet gemeld")
);

test(
  "een onbereikbare pagina geeft exit 2, niet exit 1",
  2,
  "compare.js",
  [schrijfConfig("kapot", { ...basis, pageUrl: "http://localhost:1/bestaat-niet" })]
);

test("een ontbrekend ontwerpbestand geeft exit 2", 2, "compare.js", [
  schrijfConfig("geen-html", { ...basis, htmlPath: "./design/bestaat-echt-niet.html" }),
]);

console.log("\nextract-spec.js");

test(
  "een lazy-loaded afbeelding onder de fold laat het script niet vastlopen",
  0,
  "extract-spec.js",
  [path.join(TEST, "fixtures", "lazy-image.html"), path.join(TMP, "lazy.spec.json")]
);

test(
  "geneste inline tekst wordt met een scheiding uitgelezen",
  0,
  "extract-spec.js",
  [path.join(TEST, "fixtures", "inline-tekst.html"), path.join(TMP, "inline.spec.json")],
  () => {
    const c = JSON.parse(fs.readFileSync(path.join(TMP, "inline.spec.json"), "utf8")).components;
    const verwacht = {
      "dag-knop": "Vandaag zo 20 sep",
      "tijden": "14:30 Zaal 1 21:00 Zaal 2",
      "prijs": "vanaf 10,- per kaartje",
    };
    for (const [naam, wil] of Object.entries(verwacht)) {
      if (c[naam].text !== wil) {
        return `${naam} is ${JSON.stringify(c[naam].text)}, verwacht ${JSON.stringify(wil)}`;
      }
    }
    return true;
  }
);

test(
  "een dubbele data-cmp-naam is een fout, geen waarschuwing",
  1,
  "extract-spec.js",
  [path.join(TEST, "fixtures", "dubbele-naam-bron.html"), path.join(TMP, "dubbel.spec.json")],
  (uit) => (/dubbel/i.test(uit) ? true : "dubbele naam niet gemeld")
);

test(
  "een link krijgt de rol link, een knop de rol knop",
  0,
  "extract-spec.js",
  [path.join(TEST, "fixtures", "rollen.html"), path.join(TMP, "rollen.spec.json")],
  () => {
    const spec = JSON.parse(fs.readFileSync(path.join(TMP, "rollen.spec.json"), "utf8"));
    const c = spec.components;
    if (c["nav-link"].role !== "link") return `nav-link heeft rol ${c["nav-link"].role}, verwacht link`;
    if (c["cta-knop"].role !== "knop") return `cta-knop heeft rol ${c["cta-knop"].role}, verwacht knop`;
    return true;
  }
);

test(
  "transform, schaduw, gradient en max-width worden vastgelegd",
  0,
  "extract-spec.js",
  [path.join(TEST, "fixtures", "visuele-details.html"), path.join(TMP, "details.spec.json")],
  () => {
    const spec = JSON.parse(fs.readFileSync(path.join(TMP, "details.spec.json"), "utf8"));
    const p = spec.components["poster"];
    const mist = [];
    if (!p.effects || p.effects.transform === "none") mist.push("transform");
    if (!p.effects || p.effects.boxShadow === "none") mist.push("boxShadow");
    if (!p.background.backgroundImage || p.background.backgroundImage === "none") mist.push("backgroundImage");
    if (!p.box.maxWidth || p.box.maxWidth === "none") mist.push("maxWidth");
    if (!p.layout.flexWrap) mist.push("flexWrap");
    return mist.length ? `niet vastgelegd: ${mist.join(", ")}` : true;
  }
);

test(
  "een spec per breakpoint is te maken",
  0,
  "extract-spec.js",
  [path.join(TEST, "source.html"), "--breedtes=1440,390", "--out-dir=" + TMP],
  () => {
    const a = path.join(TMP, "source.1440.spec.json");
    const b = path.join(TMP, "source.390.spec.json");
    if (!fs.existsSync(a)) return "source.1440.spec.json niet gemaakt";
    if (!fs.existsSync(b)) return "source.390.spec.json niet gemaakt";
    const specA = JSON.parse(fs.readFileSync(a, "utf8"));
    if (specA.viewport.width !== 1440) return "viewport niet vastgelegd in de spec";
    return true;
  }
);

console.log("\nscreenshot-diff.js — stap 8.1");

test(
  "een identieke build geeft nul afwijkende pixels",
  0,
  "screenshot-diff.js",
  [schrijfConfig("shot-ok", { ...basis, screenshotDir: path.join(TMP, "shots") })],
  (uit) => (/0\.00%/.test(uit) ? true : "niet 0.00% verschil op een identieke build")
);

test(
  "een structureel verschil komt boven de drempel uit",
  1,
  "screenshot-diff.js",
  [
    schrijfConfig("shot-fout", {
      ...basis,
      pageUrl: fileUrl(path.join(TEST, "fixtures", "dubbele-naam.html")),
      screenshotDir: path.join(TMP, "shots"),
      screenshotDrempelPct: 0.5,
    }),
  ],
  (uit) => (/MISLUKT/.test(uit) ? true : "structureel verschil niet gemeld")
);

console.log("\ncheck-native.js — stap 5a");

test(
  "custom CSS met !important wordt gemeld",
  1,
  "check-native.js",
  [path.join(TEST, "fixtures", "elementor-data-fout.json")],
  (uit) => (/!important/.test(uit) ? true : "!important niet gemeld")
);

test("een native opbouw slaagt", 0, "check-native.js", [
  path.join(TEST, "fixtures", "elementor-data-native.json"),
]);

console.log("\ncheck-bouwbaar.js — stap 1");

test(
  "pseudo-elementen en JS-interactie worden voor de goedkeuring gemeld",
  1,
  "check-bouwbaar.js",
  [path.join(TEST, "fixtures", "visuele-details.html")],
  (uit) => (/pseudo/i.test(uit) ? true : "pseudo-elementen niet gemeld")
);

test("een native te bouwen ontwerp slaagt", 0, "check-bouwbaar.js", [path.join(TEST, "source.html")]);

fs.rmSync(TMP, { recursive: true, force: true });

console.log(`\n${geslaagd} geslaagd, ${gefaald} gefaald.`);
process.exit(gefaald > 0 ? 1 : 0);
