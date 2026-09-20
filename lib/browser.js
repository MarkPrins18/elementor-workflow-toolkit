/**
 * Gedeelde browser-hulpmiddelen voor extract-spec.js en compare.js.
 *
 * Deze code stond eerder twee keer los in beide scripts. De lazy-image-hang
 * hieronder zat daardoor ook twee keer in de toolkit; gedeeld houden
 * voorkomt dat een fix in het ene script het andere overslaat.
 */

const { chromium } = require("playwright");

async function openBrowser() {
  const launchOptions = {};
  if (process.env.PW_CHROMIUM_PATH) {
    launchOptions.executablePath = process.env.PW_CHROMIUM_PATH;
  }
  return chromium.launch(launchOptions);
}

async function stabilizePage(page) {
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

  // Een <img loading="lazy"> onder de fold wordt door de browser bewust niet
  // opgehaald: er komt nooit een load- of error-event, dus wachten op
  // img.complete hing hier oneindig. Eerst eager forceren en doorscrollen,
  // daarna wachten met een harde bovengrens.
  await page.evaluate(async () => {
    for (const img of Array.from(document.images)) {
      img.loading = "eager";
      if (img.hasAttribute("loading")) img.setAttribute("loading", "eager");
    }
    const stap = Math.max(200, window.innerHeight);
    for (let y = 0; y < document.documentElement.scrollHeight; y += stap) {
      window.scrollTo(0, y);
      await new Promise((r) => requestAnimationFrame(r));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => requestAnimationFrame(r));
  });

  await page.evaluate(async () => {
    const wachtend = Array.from(document.images).filter((img) => !img.complete);
    const geladen = Promise.all(
      wachtend.map(
        (img) =>
          new Promise((resolve) => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          })
      )
    );
    await Promise.race([geladen, new Promise((r) => setTimeout(r, 5000))]);
  });

  // Wacht tot de fonts geladen zijn, anders meet je een fallback-font.
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) {
      await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 5000))]);
    }
  });

  // getBoundingClientRect is viewport-relatief: beide pagina's moeten op
  // dezelfde scrollpositie gemeten worden.
  await page.evaluate(() => window.scrollTo(0, 0));
}

module.exports = { openBrowser, stabilizePage };
