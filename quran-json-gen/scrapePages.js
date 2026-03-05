import fetch from "node-fetch";
import * as cheerio from "cheerio";
import fs from "fs";

const url = "https://qul.tarteel.ai/mushaf_layouts/6";

const html = await fetch(url).then(r => r.text());

const $ = cheerio.load(html);

const pages = [];

$("table tbody tr").each((i, row) => {
  const cols = $(row).find("td");

  const page = parseInt($(cols[0]).text().trim());
  const range = $(cols[1]).text().trim();

  const [start, end] = range.split(" - ");

  const [startSurah, startAyah] = start.split(":").map(Number);
  const [endSurah, endAyah] = end.split(":").map(Number);

  pages.push({
    page,
    start_surah: startSurah,
    start_ayah: startAyah,
    end_surah: endSurah,
    end_ayah: endAyah
  });
});

fs.writeFileSync("pages_layout.json", JSON.stringify(pages, null, 2));