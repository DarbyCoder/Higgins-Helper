/**
 * @file server/scraper/smokeTest.ts
 * @description A standalone test script to verify the scraper works
 * against the live Clark dining site. Run with:
 *
 *   npx tsx server/scraper/smokeTest.ts
 *
 * Expected output: a JSON dump of today's menu for all open locations.
 */

import { scrapeMenuHours } from "./menuHoursScraper.js";
import { scrapeLocationMenu } from "./locationMenuScraper.js";

/** Returns today as "YYYY-MM-DD" in local time. */
function toLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function main() {
  // Use today's date by default, or pass a date as the first CLI arg
  const date = process.argv[2] ?? toLocalDateString();
  console.log(`\n🍽️  Higgins Helper Scraper Smoke Test`);
  console.log(`📅  Date: ${date}\n`);

  // ── Layer 1 ──
  console.log("=== LAYER 1: Fetching menu hours ===");
  const stubs = await scrapeMenuHours(date);

  if (stubs.length === 0) {
    console.warn("⚠️  No dining locations found. Is this a holiday or weekend?");
    return;
  }

  stubs.forEach((s) => {
    const status = s.isOpen ? "✅ Open" : "❌ Closed";
    console.log(`  ${status}  ${s.name}  (${s.meals.length} meal periods)`);
    s.meals.forEach((m) =>
      console.log(`           └─ ${m.name}: ${m.startTime} – ${m.endTime}`)
    );
  });

  // ── Layer 2: Only scrape open locations ──
  const openStubs = stubs.filter((s) => s.isOpen);
  console.log(
    `\n=== LAYER 2: Scraping ${openStubs.length} open location(s) ===`
  );

  const results = await Promise.allSettled(
    openStubs.map((stub) => scrapeLocationMenu(stub))
  );

  let totalItems = 0;
  results.forEach((result, i) => {
    const name = openStubs[i]?.name ?? "Unknown";
    if (result.status === "fulfilled") {
      const loc = result.value;
      const itemCount = loc.meals.reduce(
        (a, m) => a + m.stations.reduce((b, s) => b + s.items.length, 0),
        0
      );
      totalItems += itemCount;
      console.log(`  ✅  ${name}: ${itemCount} item(s) across ${loc.meals.length} meal(s)`);

      // Show the first item as a sample
      const firstItem = loc.meals[0]?.stations[0]?.items[0];
      if (firstItem) {
        console.log(`       Sample: "${firstItem.name}" — ${firstItem.calories} kcal, ${firstItem.protein}g protein`);
      }
    } else {
      console.error(`  ❌  ${name}: ${result.reason}`);
    }
  });

  console.log(`\n🎉  Done! Total items scraped: ${totalItems}`);
}

main().catch((err) => {
  console.error("\n💥 Smoke test failed:", err);
  process.exit(1);
});
