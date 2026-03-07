#!/usr/bin/env node
// =============================================================================
// gen_quran_meta.js
// Reads all 610 coords JSON files and derives exact page mappings for the
// Hafizi mushaf, then writes the corrected src/data/quranMeta.js
//
// Usage:
//   node scripts/gen_quran_meta.js
// =============================================================================

const fs   = require("fs");
const path = require("path");

const COORDS_DIR = path.join(__dirname, "../quran-front/public/mushaf/coords");
const OUT_FILE   = path.join(__dirname, "../quran-front/src/data/quranMeta.js");
const TOTAL_PAGES = 610;

// ── Juz boundaries (surah:ayah that starts each Juz) ─────────────────────────
// These are fixed across ALL mushaf editions — only the page number changes.
const JUZ_BOUNDARIES = [
  null,           // index 0 unused
  "1:1",          // Juz 1
  "2:142",        // Juz 2
  "2:253",        // Juz 3
  "3:92",         // Juz 4
  "4:24",         // Juz 5
  "4:148",        // Juz 6
  "5:82",         // Juz 7  (some editions use 5:81 — script will find nearest)
  "6:111",        // Juz 8
  "7:88",         // Juz 9
  "8:41",         // Juz 10
  "9:93",         // Juz 11
  "11:6",         // Juz 12
  "12:53",        // Juz 13
  "15:1",         // Juz 14
  "17:1",         // Juz 15
  "18:75",        // Juz 16
  "21:1",         // Juz 17
  "23:1",         // Juz 18
  "25:21",        // Juz 19  (some: 25:20)
  "27:56",        // Juz 20
  "29:46",        // Juz 21
  "33:31",        // Juz 22
  "36:28",        // Juz 23  (some: 36:27)
  "39:32",        // Juz 24
  "41:47",        // Juz 25
  "46:1",         // Juz 26
  "51:31",        // Juz 27
  "58:1",         // Juz 28
  "67:1",         // Juz 29
  "78:1",         // Juz 30
];

// ── Surah metadata (names + ayah counts — fixed across all editions) ─────────
const SURAH_INFO = [
  null,
  { nameAr: "الفاتحة",      nameEn: "Al-Fatiha",       ayahs:   7 },
  { nameAr: "البقرة",       nameEn: "Al-Baqarah",      ayahs: 286 },
  { nameAr: "آل عمران",     nameEn: "Al-Imran",        ayahs: 200 },
  { nameAr: "النساء",       nameEn: "An-Nisa",         ayahs: 176 },
  { nameAr: "المائدة",      nameEn: "Al-Ma'ida",       ayahs: 120 },
  { nameAr: "الأنعام",      nameEn: "Al-An'am",        ayahs: 165 },
  { nameAr: "الأعراف",      nameEn: "Al-A'raf",        ayahs: 206 },
  { nameAr: "الأنفال",      nameEn: "Al-Anfal",        ayahs:  75 },
  { nameAr: "التوبة",       nameEn: "At-Tawba",        ayahs: 129 },
  { nameAr: "يونس",         nameEn: "Yunus",           ayahs: 109 },
  { nameAr: "هود",          nameEn: "Hud",             ayahs: 123 },
  { nameAr: "يوسف",         nameEn: "Yusuf",           ayahs: 111 },
  { nameAr: "الرعد",        nameEn: "Ar-Ra'd",         ayahs:  43 },
  { nameAr: "إبراهيم",      nameEn: "Ibrahim",         ayahs:  52 },
  { nameAr: "الحجر",        nameEn: "Al-Hijr",         ayahs:  99 },
  { nameAr: "النحل",        nameEn: "An-Nahl",         ayahs: 128 },
  { nameAr: "الإسراء",      nameEn: "Al-Isra",         ayahs: 111 },
  { nameAr: "الكهف",        nameEn: "Al-Kahf",         ayahs: 110 },
  { nameAr: "مريم",         nameEn: "Maryam",          ayahs:  98 },
  { nameAr: "طه",           nameEn: "Ta-Ha",           ayahs: 135 },
  { nameAr: "الأنبياء",     nameEn: "Al-Anbiya",       ayahs: 112 },
  { nameAr: "الحج",         nameEn: "Al-Hajj",         ayahs:  78 },
  { nameAr: "المؤمنون",     nameEn: "Al-Mu'minun",     ayahs: 118 },
  { nameAr: "النور",        nameEn: "An-Nur",          ayahs:  64 },
  { nameAr: "الفرقان",      nameEn: "Al-Furqan",       ayahs:  77 },
  { nameAr: "الشعراء",      nameEn: "Ash-Shu'ara",     ayahs: 227 },
  { nameAr: "النمل",        nameEn: "An-Naml",         ayahs:  93 },
  { nameAr: "القصص",        nameEn: "Al-Qasas",        ayahs:  88 },
  { nameAr: "العنكبوت",     nameEn: "Al-Ankabut",      ayahs:  69 },
  { nameAr: "الروم",        nameEn: "Ar-Rum",          ayahs:  60 },
  { nameAr: "لقمان",        nameEn: "Luqman",          ayahs:  34 },
  { nameAr: "السجدة",       nameEn: "As-Sajda",        ayahs:  30 },
  { nameAr: "الأحزاب",      nameEn: "Al-Ahzab",        ayahs:  73 },
  { nameAr: "سبأ",          nameEn: "Saba",            ayahs:  54 },
  { nameAr: "فاطر",         nameEn: "Fatir",           ayahs:  45 },
  { nameAr: "يس",           nameEn: "Ya-Sin",          ayahs:  83 },
  { nameAr: "الصافات",      nameEn: "As-Saffat",       ayahs: 182 },
  { nameAr: "ص",            nameEn: "Sad",             ayahs:  88 },
  { nameAr: "الزمر",        nameEn: "Az-Zumar",        ayahs:  75 },
  { nameAr: "غافر",         nameEn: "Ghafir",          ayahs:  85 },
  { nameAr: "فصلت",         nameEn: "Fussilat",        ayahs:  54 },
  { nameAr: "الشورى",       nameEn: "Ash-Shura",       ayahs:  53 },
  { nameAr: "الزخرف",       nameEn: "Az-Zukhruf",      ayahs:  89 },
  { nameAr: "الدخان",       nameEn: "Ad-Dukhan",       ayahs:  59 },
  { nameAr: "الجاثية",      nameEn: "Al-Jathiya",      ayahs:  37 },
  { nameAr: "الأحقاف",      nameEn: "Al-Ahqaf",        ayahs:  35 },
  { nameAr: "محمد",         nameEn: "Muhammad",        ayahs:  38 },
  { nameAr: "الفتح",        nameEn: "Al-Fath",         ayahs:  29 },
  { nameAr: "الحجرات",      nameEn: "Al-Hujurat",      ayahs:  18 },
  { nameAr: "ق",            nameEn: "Qaf",             ayahs:  45 },
  { nameAr: "الذاريات",     nameEn: "Adh-Dhariyat",    ayahs:  60 },
  { nameAr: "الطور",        nameEn: "At-Tur",          ayahs:  49 },
  { nameAr: "النجم",        nameEn: "An-Najm",         ayahs:  62 },
  { nameAr: "القمر",        nameEn: "Al-Qamar",        ayahs:  55 },
  { nameAr: "الرحمن",       nameEn: "Ar-Rahman",       ayahs:  78 },
  { nameAr: "الواقعة",      nameEn: "Al-Waqi'a",       ayahs:  96 },
  { nameAr: "الحديد",       nameEn: "Al-Hadid",        ayahs:  29 },
  { nameAr: "المجادلة",     nameEn: "Al-Mujadila",     ayahs:  22 },
  { nameAr: "الحشر",        nameEn: "Al-Hashr",        ayahs:  24 },
  { nameAr: "الممتحنة",     nameEn: "Al-Mumtahina",    ayahs:  13 },
  { nameAr: "الصف",         nameEn: "As-Saf",          ayahs:  14 },
  { nameAr: "الجمعة",       nameEn: "Al-Jumu'a",       ayahs:  11 },
  { nameAr: "المنافقون",    nameEn: "Al-Munafiqun",    ayahs:  11 },
  { nameAr: "التغابن",      nameEn: "At-Taghabun",     ayahs:  18 },
  { nameAr: "الطلاق",       nameEn: "At-Talaq",        ayahs:  12 },
  { nameAr: "التحريم",      nameEn: "At-Tahrim",       ayahs:  12 },
  { nameAr: "الملك",        nameEn: "Al-Mulk",         ayahs:  30 },
  { nameAr: "القلم",        nameEn: "Al-Qalam",        ayahs:  52 },
  { nameAr: "الحاقة",       nameEn: "Al-Haqqa",        ayahs:  52 },
  { nameAr: "المعارج",      nameEn: "Al-Ma'arij",      ayahs:  44 },
  { nameAr: "نوح",          nameEn: "Nuh",             ayahs:  28 },
  { nameAr: "الجن",         nameEn: "Al-Jinn",         ayahs:  28 },
  { nameAr: "المزمل",       nameEn: "Al-Muzzammil",    ayahs:  20 },
  { nameAr: "المدثر",       nameEn: "Al-Muddaththir",  ayahs:  56 },
  { nameAr: "القيامة",      nameEn: "Al-Qiyama",       ayahs:  40 },
  { nameAr: "الإنسان",      nameEn: "Al-Insan",        ayahs:  31 },
  { nameAr: "المرسلات",     nameEn: "Al-Mursalat",     ayahs:  50 },
  { nameAr: "النبأ",        nameEn: "An-Naba",         ayahs:  40 },
  { nameAr: "النازعات",     nameEn: "An-Nazi'at",      ayahs:  46 },
  { nameAr: "عبس",          nameEn: "Abasa",           ayahs:  42 },
  { nameAr: "التكوير",      nameEn: "At-Takwir",       ayahs:  29 },
  { nameAr: "الانفطار",     nameEn: "Al-Infitar",      ayahs:  19 },
  { nameAr: "المطففين",     nameEn: "Al-Mutaffifin",   ayahs:  36 },
  { nameAr: "الانشقاق",     nameEn: "Al-Inshiqaq",     ayahs:  25 },
  { nameAr: "البروج",       nameEn: "Al-Buruj",        ayahs:  22 },
  { nameAr: "الطارق",       nameEn: "At-Tariq",        ayahs:  17 },
  { nameAr: "الأعلى",       nameEn: "Al-A'la",         ayahs:  19 },
  { nameAr: "الغاشية",      nameEn: "Al-Ghashiya",     ayahs:  26 },
  { nameAr: "الفجر",        nameEn: "Al-Fajr",         ayahs:  30 },
  { nameAr: "البلد",        nameEn: "Al-Balad",        ayahs:  20 },
  { nameAr: "الشمس",        nameEn: "Ash-Shams",       ayahs:  15 },
  { nameAr: "الليل",        nameEn: "Al-Layl",         ayahs:  21 },
  { nameAr: "الضحى",        nameEn: "Ad-Duha",         ayahs:  11 },
  { nameAr: "الشرح",        nameEn: "Ash-Sharh",       ayahs:   8 },
  { nameAr: "التين",        nameEn: "At-Tin",          ayahs:   8 },
  { nameAr: "العلق",        nameEn: "Al-Alaq",         ayahs:  19 },
  { nameAr: "القدر",        nameEn: "Al-Qadr",         ayahs:   5 },
  { nameAr: "البينة",       nameEn: "Al-Bayyina",      ayahs:   8 },
  { nameAr: "الزلزلة",      nameEn: "Az-Zalzala",      ayahs:   8 },
  { nameAr: "العاديات",     nameEn: "Al-Adiyat",       ayahs:  11 },
  { nameAr: "القارعة",      nameEn: "Al-Qari'a",       ayahs:  11 },
  { nameAr: "التكاثر",      nameEn: "At-Takathur",     ayahs:   8 },
  { nameAr: "العصر",        nameEn: "Al-Asr",          ayahs:   3 },
  { nameAr: "الهمزة",       nameEn: "Al-Humaza",       ayahs:   9 },
  { nameAr: "الفيل",        nameEn: "Al-Fil",          ayahs:   5 },
  { nameAr: "قريش",         nameEn: "Quraysh",         ayahs:   4 },
  { nameAr: "الماعون",      nameEn: "Al-Ma'un",        ayahs:   7 },
  { nameAr: "الكوثر",       nameEn: "Al-Kawthar",      ayahs:   3 },
  { nameAr: "الكافرون",     nameEn: "Al-Kafirun",      ayahs:   6 },
  { nameAr: "النصر",        nameEn: "An-Nasr",         ayahs:   3 },
  { nameAr: "المسد",        nameEn: "Al-Masad",        ayahs:   5 },
  { nameAr: "الإخلاص",      nameEn: "Al-Ikhlas",       ayahs:   4 },
  { nameAr: "الفلق",        nameEn: "Al-Falaq",        ayahs:   5 },
  { nameAr: "الناس",        nameEn: "An-Nas",          ayahs:   6 },
];

const JUZ_LABELS = [
  null,
  "الم", "سَيَقُولُ", "تِلْكَ الرُّسُلُ", "لَنْ تَنَالُوا", "وَالْمُحْصَنَاتُ",
  "لَا يُحِبُّ اللَّهُ", "وَإِذَا سَمِعُوا", "وَلَوْ أَنَّنَا", "قَالَ الْمَلَأُ", "وَاعْلَمُوا",
  "يَعْتَذِرُونَ", "وَمَا مِنْ دَابَّةٍ", "وَمَا أُبَرِّئُ", "رُبَمَا", "سُبْحَانَ الَّذِي",
  "قَالَ أَلَمْ", "اقْتَرَبَ لِلنَّاسِ", "قَدْ أَفْلَحَ", "وَقَالَ الَّذِينَ", "أَمَّنْ خَلَقَ",
  "اتْلُ مَا أُوحِيَ", "وَمَنْ يَقْنُتْ", "وَمَا لِيَ", "فَمَنْ أَظْلَمُ", "إِلَيْهِ يُرَدُّ",
  "حم", "قَالَ فَمَا خَطْبُكُمْ", "قَدْ سَمِعَ اللَّهُ", "تَبَارَكَ الَّذِي", "عَمَّ",
];

// =============================================================================
// Main
// =============================================================================

console.log("Reading coords files...");

// Maps: "surah:ayah" → first page it appears on
const ayahToPage = {};
// Maps: surahNumber → first page it appears on
const surahToPage = {};
// Maps: page → first ayah key on that page (lowest surah:ayah)
const pageFirstAyah = {};

let pagesRead = 0;
let pagesMissing = 0;

for (let page = 1; page <= TOTAL_PAGES; page++) {
  const filePath = path.join(COORDS_DIR, `${page}.json`);
  if (!fs.existsSync(filePath)) {
    pagesMissing++;
    continue;
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (e) {
    console.warn(`  [WARN] Failed to parse page ${page}: ${e.message}`);
    continue;
  }

  pagesRead++;

  // Collect unique ayah keys on this page, then find the first one
  let firstSurah = Infinity, firstAyah = Infinity;

  for (const key of Object.keys(data)) {
    const parts = key.split(":");
    const surah = parseInt(parts[0]);
    const ayah  = parseInt(parts[1]);
    if (isNaN(surah) || isNaN(ayah)) continue;

    const ayahKey = `${surah}:${ayah}`;

    if (!ayahToPage[ayahKey]) ayahToPage[ayahKey] = page;
    if (!surahToPage[surah])  surahToPage[surah]  = page;

    // Track the smallest surah:ayah on this page
    if (surah < firstSurah || (surah === firstSurah && ayah < firstAyah)) {
      firstSurah = surah;
      firstAyah  = ayah;
    }
  }

  if (firstSurah !== Infinity) {
    pageFirstAyah[page] = `${firstSurah}:${firstAyah}`;
  }
}

console.log(`Read ${pagesRead} pages (${pagesMissing} missing).`);
console.log(`Found ${Object.keys(surahToPage).length} surahs, ${Object.keys(ayahToPage).length} unique ayahs.\n`);

// ── Surah start pages ─────────────────────────────────────────────────────────
console.log("=== SURAH START PAGES ===");
const surahPages = [];
for (let s = 1; s <= 114; s++) {
  const pg = surahToPage[s];
  if (!pg) {
    console.warn(`  [WARN] Surah ${s} not found in any coords file!`);
  }
  surahPages.push(pg ?? null);
  console.log(`  Surah ${String(s).padStart(3)}  ${(SURAH_INFO[s]?.nameEn ?? "").padEnd(20)}  page ${pg ?? "NOT FOUND"}`);
}

// ── Juz start pages ───────────────────────────────────────────────────────────
console.log("\n=== JUZ START PAGES ===");
const juzPages = [];
for (let j = 1; j <= 30; j++) {
  const boundary = JUZ_BOUNDARIES[j];
  let pg = ayahToPage[boundary];

  if (!pg) {
    // Boundary ayah not found — try nearby ayahs (±5) in case of coord gaps
    const [s, a] = boundary.split(":").map(Number);
    for (let delta = 1; delta <= 5; delta++) {
      pg = ayahToPage[`${s}:${a + delta}`] || ayahToPage[`${s}:${a - delta}`];
      if (pg) {
        console.warn(`  [WARN] Juz ${j}: exact boundary ${boundary} not found, using nearby ayah (±${delta}) → page ${pg}`);
        break;
      }
    }
  }

  // If the boundary ayah is NOT the first ayah on its page, the juz header
  // appears at the top of the NEXT page in the Hafizi mushaf layout.
  if (pg && pageFirstAyah[pg] !== boundary) {
    console.log(`  [INFO] Juz ${j}: boundary ${boundary} is not first on page ${pg} (first is ${pageFirstAyah[pg]}) → using page ${pg + 1}`);
    pg = pg + 1;
  }

  juzPages.push(pg ?? null);
  console.log(`  Juz ${String(j).padStart(2)}  starts at ${boundary.padEnd(8)}  page ${pg ?? "NOT FOUND"}`);
}

// ── Write quranMeta.js ────────────────────────────────────────────────────────
console.log("\nWriting quranMeta.js...");

const surahsArray = SURAH_INFO.slice(1).map((s, i) => {
  const num = i + 1;
  const pg  = surahPages[i];
  return `  { number:${String(num).padStart(3)}, nameAr: "${s.nameAr}", nameEn: "${s.nameEn}", page: ${String(pg ?? "null").padStart(3)}, ayahs: ${String(s.ayahs).padStart(3)} },`;
}).join("\n");

const juzArray = JUZ_LABELS.slice(1).map((label, i) => {
  const num = i + 1;
  const pg  = juzPages[i];
  return `  { number:${String(num).padStart(3)}, page: ${String(pg ?? "null").padStart(3)}, label: "${label}" },`;
}).join("\n");

const output = `// src/data/quranMeta.js
// AUTO-GENERATED by scripts/gen_quran_meta.js
// Page mappings derived from actual coords files — Hafizi 15-line 610-page mushaf.
// DO NOT edit manually. Re-run the script to regenerate.

export const SURAHS = [
  null, // index 0 unused
${surahsArray}
];

export const JUZS = [
  null, // index 0 unused
${juzArray}
];

/** Returns { juz, surahNum, surahEn, surahAr } for a given page number */
export function getPageMeta(page) {
  let surahNum = 1;
  for (let i = 1; i <= 114; i++) {
    if (SURAHS[i].page <= page) surahNum = i;
    else break;
  }

  let juz = 1;
  for (let i = 1; i <= 30; i++) {
    if (JUZS[i].page <= page) juz = i;
    else break;
  }

  return {
    juz,
    surahNum,
    surahEn: SURAHS[surahNum].nameEn,
    surahAr: SURAHS[surahNum].nameAr,
  };
}
`;

fs.writeFileSync(OUT_FILE, output, "utf8");
console.log(`Done! Written to ${OUT_FILE}`);
