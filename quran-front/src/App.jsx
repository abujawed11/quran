// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import "./App.css";

// Pages 1–2 are special title/surah pages in IndoPak Hifzi mushaf
const SPECIAL_PAGES = new Set([1, 2]);

export default function App() {
  const [layout,    setLayout]    = useState(null);
  const [quranData, setQuranData] = useState(null);
  const [error,     setError]     = useState("");
  const [page,      setPage]      = useState(3);

  // Load both static files once on mount
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
    ])
      .then(([layoutData, qData]) => {
        setLayout(layoutData);
        setQuranData(qData);
      })
      .catch((e) => setError(e.message || "Failed to load data"));
  }, []);

  const loading = !layout || !quranData;

  // Page metadata from layout
  const pageData = useMemo(
    () => layout?.find((p) => p.page === page) ?? null,
    [layout, page]
  );

  // Extract verses for the current page directly from local JSON
  const verses = useMemo(() => {
    if (!quranData || !pageData) return [];

    const { start_surah, start_ayah, end_surah, end_ayah } = pageData;
    const bySurah = quranData.verses_by_surah;

    // Returns normalized verse objects compatible with rendering below
    const extract = (surah, from, to) =>
      (bySurah[String(surah)] ?? [])
        .filter((v) => v.ayah >= from && v.ayah <= to)
        .map((v) => ({
          id:           v.verse_key,
          verse_number: v.ayah,
          text_uthmani: v.text_uthmani,
        }));

    if (start_surah === end_surah) {
      return extract(start_surah, start_ayah, end_ayah);
    }

    // Cross-surah: tail of start_surah + head of end_surah
    return [
      ...extract(start_surah, start_ayah, Infinity),
      ...extract(end_surah,   1,          end_ayah),
    ];
  }, [quranData, pageData]);

  const isSpecial = SPECIAL_PAGES.has(page);

  // For grid pages (3+): flatten words + ayah-end markers into 15 row buckets
  const gridLines = useMemo(() => {
    if (isSpecial || !verses.length) return [];

    const ROWS = 15;
    const tokens = [];

    verses.forEach((v) => {
      v.text_uthmani
        .split(" ")
        .forEach((w) => tokens.push({ text: w, marker: false }));
      tokens.push({ text: `﴿${v.verse_number}﴾`, marker: true });
    });

    const perRow = Math.ceil(tokens.length / ROWS);
    return Array.from({ length: ROWS }, (_, i) =>
      tokens.slice(i * perRow, (i + 1) * perRow)
    );
  }, [verses, isSpecial]);

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

      {/* ── Page 1–2: free-flow ── */}
      {isSpecial && (
        <div className="mushafPage mushafFree">
          {loading ? loadingPlaceholder : (
            <p className="freeText">
              {verses.map((v) => (
                <span key={v.id}>
                  {v.text_uthmani}
                  <span className="ayahMarker">﴿{v.verse_number}﴾</span>
                  {" "}
                </span>
              ))}
            </p>
          )}
        </div>
      )}

      {/* ── Page 3+: 15-row grid ── */}
      {!isSpecial && (
        <div className="mushafPage mushafGrid">
          {loading ? loadingPlaceholder : (
            gridLines.map((rowTokens, i) => (
              <div key={i} className="mushafLine">
                {rowTokens.map((tok, j) =>
                  tok.marker
                    ? <span key={j} className="ayahMarker">{tok.text}</span>
                    : <span key={j}>{tok.text}</span>
                )}
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
