/**
 * @file scripts/splash/generate.cjs
 * @description Makes the iPhone launch screens in public/splash/ and prints
 * the <link rel="apple-touch-startup-image"> tags for index.html.
 *
 * iOS shows one of these while the installed app starts, then the HTML splash
 * in index.html, then the app. All three use the same dark background with the
 * app icon in the middle, so the hand-offs don't flash. iOS needs a separate
 * image for each screen size; add a row to DEVICES for a new iPhone.
 *
 * Needs Playwright (not a project dependency): run with
 *   node scripts/splash/generate.cjs
 * from the repo root, where `require("playwright")` resolves.
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

/** Keep in step with the HTML splash in index.html. */
const BG = "#09090f";
const ICON_PX = 104;

// [css width, css height, pixel ratio, models]
const DEVICES = [
  [440, 956, 3, "iPhone 16/17 Pro Max"],
  [420, 912, 3, "iPhone Air"],
  [402, 874, 3, "iPhone 16/17 Pro, 17"],
  [430, 932, 3, "iPhone 14 Pro Max, 15 Plus/Pro Max, 16 Plus"],
  [393, 852, 3, "iPhone 14 Pro, 15, 15 Pro, 16, 16e"],
  [428, 926, 3, "iPhone 12/13 Pro Max, 14 Plus"],
  [390, 844, 3, "iPhone 12, 12 Pro, 13, 13 Pro, 14"],
  [375, 812, 3, "iPhone X, XS, 11 Pro, 12/13 mini"],
  [414, 896, 3, "iPhone XS Max, 11 Pro Max"],
  [414, 896, 2, "iPhone XR, 11"],
  [414, 736, 3, "iPhone 6/7/8 Plus"],
  [375, 667, 2, "iPhone 6/7/8, SE 2nd/3rd gen"],
];

const root = path.resolve(__dirname, "../..");
const icon = fs.readFileSync(path.join(root, "public/icon.svg"), "utf8");
const html = `<!doctype html><html><body style="margin:0;height:100vh;background:${BG};display:grid;place-items:center">
  <div style="width:${ICON_PX}px;height:${ICON_PX}px;border-radius:24%;overflow:hidden;box-shadow:0 12px 40px rgba(20,160,133,0.28)">
    ${icon.replace("<svg ", `<svg style="width:100%;height:100%;display:block" `)}
  </div></body></html>`;

(async () => {
  const browser = await chromium.launch();
  const links = [];
  for (const [w, h, dpr, models] of DEVICES) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
    await page.setContent(html);
    const file = `splash-${w * dpr}x${h * dpr}.png`;
    await page.screenshot({ path: path.join(root, "public/splash", file) });
    await page.close();
    links.push(
      `  <!-- ${models} -->\n` +
      `  <link rel="apple-touch-startup-image" href="/splash/${file}"\n` +
      `    media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)" />`
    );
  }
  await browser.close();
  console.log(links.join("\n"));
})();
