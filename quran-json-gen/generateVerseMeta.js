// quran-json-gen/generateVerseMeta.js
// Node 18+ (fetch built-in). Generates verse_meta.json keyed by verse_key.

import fs from "fs";

const API_BASE = "https://api.quran.com/api/v4";
// Keep per_page modest to avoid rate limits.
const PER_PAGE = 50;

// Verse-level fields supported by Quran Foundation / Quran.com API docs
// include: juz_number, hizb_number, rub_el_hizb_number, ruku_number, manzil_number :contentReference[oaicite:2]{index=2}
// sajdah_number also appears in verse examples :contentReference[oaicite:3]{index=3}
const FIELDS = [
  "juz_number",
  "hizb_number",
  "rub_el_hizb_number",
  "ruku_number",
  "manzil_number",
  "sajdah_number",
].join(",");

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} for ${url}\n${text}`);
  }
  return res.json();
}

async function main() {
  console.log("Fetching chapters...");
  const chapters = (await fetchJson(`${API_BASE}/chapters?language=en`)).chapters || [];
  if (!chapters.length) throw new Error("No chapters returned.");

  const metaByKey = {}; // { "2:255": { ... } }

  for (const ch of chapters) {
    const surah = ch.id;
    console.log(`Surah ${surah}...`);

    let page = 1;
    let totalPages = 1;

    while (page <= totalPages) {
      const url =
        `${API_BASE}/verses/by_chapter/${surah}` +
        `?fields=${encodeURIComponent(FIELDS)}` +
        `&words=false&translations=false&audio=false` +
        `&page=${page}&per_page=${PER_PAGE}`;

      const data = await fetchJson(url);
      const verses = data.verses || [];

      for (const v of verses) {
        metaByKey[v.verse_key] = {
          juz: v.juz_number ?? null,
          hizb: v.hizb_number ?? null,
          rub_el_hizb: v.rub_el_hizb_number ?? null,
          ruku: v.ruku_number ?? null,
          manzil: v.manzil_number ?? null,
          sajdah_number: v.sajdah_number ?? null,
        };
      }

      totalPages = data.pagination?.total_pages ?? totalPages;
      page += 1;
    }
  }

  fs.writeFileSync("verse_meta.json", JSON.stringify(metaByKey, null, 2), "utf8");
  console.log("✅ Saved verse_meta.json");
  console.log(`Total verses: ${Object.keys(metaByKey).length} (expected ~6236)`);
}

main().catch((e) => {
  console.error("❌ Failed:", e);
  process.exit(1);
});