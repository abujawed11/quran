// quran-json-gen/downloadQuranText.js
// Downloads the whole Quran (Arabic Uthmani) and saves it locally.
// Node 18+ recommended (built-in fetch).

import fs from "fs";

const API_BASE = "https://api.quran.com/api/v4";
const PER_PAGE = 300; // max-ish; if API rejects, lower to 100/200

function pad3(n) {
  return String(n).padStart(3, "0");
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} for ${url}\n${text}`);
  }
  return res.json();
}

async function main() {
  console.log("Fetching chapters list...");
  const chaptersData = await fetchJson(`${API_BASE}/chapters?language=en`);
  const chapters = chaptersData.chapters || [];
  if (!chapters.length) throw new Error("No chapters returned.");

  const out = {
    meta: {
      source: "api.quran.com v4",
      fields: ["text_uthmani"],
      generated_at: new Date().toISOString(),
    },
    // index by verse_key e.g. "2:255"
    verses_by_key: {},
    // optional convenience index by surah -> array of verses
    verses_by_surah: {},
  };

  for (const ch of chapters) {
    const surah = ch.id;
    console.log(`Downloading Surah ${surah} (${ch.name_simple})...`);

    let page = 1;
    let totalPages = 1;
    const surahVerses = [];

    while (page <= totalPages) {
      const url =
        `${API_BASE}/verses/by_chapter/${surah}` +
        `?fields=text_uthmani` +
        `&per_page=${PER_PAGE}` +
        `&page=${page}`;

      const data = await fetchJson(url);

      const verses = data.verses || [];
      for (const v of verses) {
        // v.verse_key like "2:255"
        out.verses_by_key[v.verse_key] = {
          surah,
          ayah: v.verse_number,
          text_uthmani: v.text_uthmani,
        };
        surahVerses.push({
          verse_key: v.verse_key,
          ayah: v.verse_number,
          text_uthmani: v.text_uthmani,
        });
      }

      // pagination.total_pages exists in many responses
      totalPages = data.pagination?.total_pages ?? totalPages;
      page += 1;
    }

    out.verses_by_surah[surah] = surahVerses;
  }

  const file = "quran_text_uthmani.json";
  fs.writeFileSync(file, JSON.stringify(out, null, 2), "utf8");
  console.log(`✅ Saved: ${file}`);
  console.log(
    `Total verses: ${Object.keys(out.verses_by_key).length} (expected ~6236)`
  );
}

main().catch((e) => {
  console.error("❌ Failed:", e);
  process.exit(1);
});