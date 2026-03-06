// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import "./App.css";

// Pages 1–2 are special in IndoPak Hifzi mushaf (no forced 15-line grid)
const SPECIAL_PAGES = new Set([1, 2]);

// Convert Western digits → Eastern Arabic digits (٠١٢٣...)
const toArabicNum = (n) =>
  String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);

// Return marker tokens to prepend before a verse.
// Only emit a marker when the value actually changes from the previous verse.
// Never emit on the first verse (page may start mid-ruku/mid-juz — no marker needed).
function getMarkers(meta, prevMeta) {
  if (!prevMeta) return [];

  const markers = [];

  if (meta.juz !== prevMeta.juz)
    markers.push({ type: "juz", text: `الجزء ${toArabicNum(meta.juz)}` });

  if (meta.ruku !== prevMeta.ruku)
    markers.push({ type: "ruku", text: "ع" });

  // rub_el_hizb changes at every quarter-hizb (includes hizb boundaries)
  if (meta.rub_el_hizb !== prevMeta.rub_el_hizb)
    markers.push({ type: "rub", text: "۞" });

  return markers;
}

// Render a single token as JSX
function Token({ tok, idx }) {
  switch (tok.type) {
    case "juz":    return <span key={idx} className="mkJuz">{tok.text}</span>;
    case "ruku":   return <span key={idx} className="mkRuku">{tok.text}</span>;
    case "rub":    return <span key={idx} className="mkRub">{tok.text}</span>;
    case "sajdah": return <span key={idx} className="mkSajdah">{tok.text}</span>;
    case "ayah":   return <span key={idx} className="ayahMarker">{tok.text}</span>;
    default:       return <span key={idx}>{tok.text}</span>;
  }
}

export default function App() {
  const [layout,    setLayout]    = useState(null);
  const [quranData, setQuranData] = useState(null);
  const [verseMeta, setVerseMeta] = useState(null);
  const [error,     setError]     = useState("");
  const [page,      setPage]      = useState(3);

  // Load all three static files once on mount
  useEffect(() => {
    Promise.all([
      fetch("/pages_layout.json").then((r) => {
        if (!r.ok) throw new Error("Failed to load pages_layout.json");
        return r.json();
      }),
      fetch("/quran_text_uthmani.json").then((r) => {
        if (!r.ok) throw new Error("Failed to load quran_text_uthmani.json");
        return r.json();
      }),
      fetch("/verse_meta.json").then((r) => {
        if (!r.ok) throw new Error("Failed to load verse_meta.json");
        return r.json();
      }),
    ])
      .then(([layoutData, qData, metaData]) => {
        setLayout(layoutData);
        setQuranData(qData);
        setVerseMeta(metaData);
      })
      .catch((e) => setError(e.message || "Failed to load data"));
  }, []);

  const loading = !layout || !quranData || !verseMeta;

  // Metadata for the current page from pages_layout.json
  const pageData = useMemo(
    () => layout?.find((p) => p.page === page) ?? null,
    [layout, page]
  );

  // Extract verses for the page from local JSON, attaching verse_meta
  const verses = useMemo(() => {
    if (!quranData || !verseMeta || !pageData) return [];

    const { start_surah, start_ayah, end_surah, end_ayah } = pageData;
    const bySurah = quranData.verses_by_surah;

    const extract = (surah, from, to) =>
      (bySurah[String(surah)] ?? [])
        .filter((v) => v.ayah >= from && v.ayah <= to)
        .map((v) => ({
          id:           v.verse_key,
          verse_number: v.ayah,
          text_uthmani: v.text_uthmani,
          meta:         verseMeta[v.verse_key] ?? {},
        }));

    if (start_surah === end_surah)
      return extract(start_surah, start_ayah, end_ayah);

    // Cross-surah page
    return [
      ...extract(start_surah, start_ayah, Infinity),
      ...extract(end_surah,   1,          end_ayah),
    ];
  }, [quranData, verseMeta, pageData]);

  const isSpecial = SPECIAL_PAGES.has(page);

  // Meta of the verse immediately BEFORE this page starts.
  // Used so we can detect ruku/juz changes at the very first verse of a page.
  const prevPageMeta = useMemo(() => {
    if (!verseMeta || !quranData || !pageData) return null;
    const { start_surah, start_ayah } = pageData;

    if (start_ayah > 1) {
      // Previous verse is in the same surah
      return verseMeta[`${start_surah}:${start_ayah - 1}`] ?? null;
    } else if (start_surah > 1) {
      // Previous verse is the last ayah of the previous surah
      const prevSurahVerses = quranData.verses_by_surah[String(start_surah - 1)];
      if (prevSurahVerses?.length) {
        const lastAyah = prevSurahVerses[prevSurahVerses.length - 1].ayah;
        return verseMeta[`${start_surah - 1}:${lastAyah}`] ?? null;
      }
    }
    return null; // very first verse of the Quran
  }, [verseMeta, quranData, pageData]);

  // For grid pages: flatten all words + markers into tokens, then split into 15 rows
  const gridLines = useMemo(() => {
    if (isSpecial || !verses.length) return [];

    const ROWS = 15;
    const tokens = [];

    verses.forEach((v, idx) => {
      // Use prevPageMeta for the first verse so page-start ruku changes are detected
      const prevMeta = idx > 0 ? verses[idx - 1].meta : prevPageMeta;

      // Structure markers before this verse's text
      getMarkers(v.meta, prevMeta).forEach((m) => tokens.push(m));

      // Arabic words
      v.text_uthmani
        .split(" ")
        .forEach((w) => tokens.push({ type: "word", text: w }));

      // Ayah end marker ﴿n﴾
      tokens.push({ type: "ayah", text: `﴿${v.verse_number}﴾` });

      // Sajdah indicator (if this verse has a sajdah)
      if (v.meta.sajdah_number != null)
        tokens.push({ type: "sajdah", text: "۩" });
    });

    // Distribute tokens evenly: floor per row, spread the remainder across
    // the first `remainder` rows so no row is ever empty.
    const perRow    = Math.floor(tokens.length / ROWS);
    const remainder = tokens.length % ROWS;
    let offset = 0;
    return Array.from({ length: ROWS }, (_, i) => {
      const count = perRow + (i < remainder ? 1 : 0);
      const line  = tokens.slice(offset, offset + count);
      offset += count;
      return line;
    });
  }, [verses, isSpecial, prevPageMeta]);

  const canPrev = page > 1;
  const canNext = page < 610;

  const loadingPlaceholder = <div className="mushafLoading">Loading…</div>;

  return (
    <div className="appShell">

      {/* ── Header ── */}
      <div className="pageHeader">
        <span className="pageNumber">Page {page}</span>
        {pageData && (
          <span className="pageRange">
            {pageData.start_surah}:{pageData.start_ayah}
            {" → "}
            {pageData.end_surah}:{pageData.end_ayah}
          </span>
        )}
      </div>

      {error && <div className="errorMsg">⚠ {error}</div>}

      {/* ── Pages 1–2: free-flow ── */}
      {isSpecial && (
        <div className="mushafPage mushafFree">
          {loading ? loadingPlaceholder : (
            <p className="freeText">
              {verses.map((v, idx) => {
                const prevMeta = idx > 0 ? verses[idx - 1].meta : prevPageMeta;
                return (
                  <span key={v.id}>
                    {getMarkers(v.meta, prevMeta).map((m, j) => (
                      <Token key={j} tok={m} idx={j} />
                    ))}
                    {v.text_uthmani}
                    <span className="ayahMarker">﴿{v.verse_number}﴾</span>
                    {v.meta.sajdah_number != null && (
                      <span className="mkSajdah">۩</span>
                    )}
                    {" "}
                  </span>
                );
              })}
            </p>
          )}
        </div>
      )}

      {/* ── Pages 3+: 15-row grid ── */}
      {!isSpecial && (
        <div className="mushafPage mushafGrid">
          {loading ? loadingPlaceholder : (
            gridLines.map((rowTokens, i) => (
              <div key={i} className="mushafLine">
                {rowTokens.map((tok, j) => (
                  <Token key={j} tok={tok} idx={j} />
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Navigation ── */}
      <div className="navBar">
        <button disabled={!canPrev} onClick={() => setPage((p) => p - 1)}>
          ← Prev
        </button>
        <span>{page} / 610</span>
        <button disabled={!canNext} onClick={() => setPage((p) => p + 1)}>
          Next →
        </button>
      </div>

    </div>
  );
}
