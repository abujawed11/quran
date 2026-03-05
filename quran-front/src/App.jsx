// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import "./App.css";

// Pages 1–2 are special title/surah pages in IndoPak Hifzi mushaf
const SPECIAL_PAGES = new Set([1, 2]);

export default function App() {
  const [layout, setLayout]   = useState([]);
  const [page, setPage]       = useState(3);
  const [verses, setVerses]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  // Load pages_layout.json once
  useEffect(() => {
    fetch("/pages_layout.json")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load pages_layout.json");
        return r.json();
      })
      .then(setLayout)
      .catch((e) => setError(e.message || "Failed to load layout"));
  }, []);

  const pageData = useMemo(
    () => layout.find((p) => p.page === page),
    [layout, page]
  );

  // Fetch verses for the current page
  useEffect(() => {
    const loadVerses = async () => {
      if (!pageData) return;
      setLoading(true);
      setError("");

      try {
        const PER_PAGE = 50;

        // Fetch only the API pages that cover [startAyah, endAyah].
        // Quran API paginates at 50 verses per page.
        const fetchRange = async (surah, startAyah, endAyah) => {
          const cap          = Math.min(endAyah, 300); // no surah > 286 verses
          const firstApiPage = Math.ceil(startAyah / PER_PAGE);
          const lastApiPage  = Math.ceil(cap       / PER_PAGE);

          const requests = [];
          for (let p = firstApiPage; p <= lastApiPage; p++) {
            requests.push(
              fetch(
                `https://api.quran.com/api/v4/verses/by_chapter/${surah}` +
                `?fields=text_uthmani&per_page=${PER_PAGE}&page=${p}`
              )
                .then((r) => {
                  if (!r.ok)
                    throw new Error(`Quran API error: surah ${surah} page ${p}`);
                  return r.json();
                })
                .then((d) => d.verses || [])
            );
          }

          return (await Promise.all(requests)).flat();
        };

        let result = [];

        if (pageData.start_surah === pageData.end_surah) {
          const all = await fetchRange(
            pageData.start_surah,
            pageData.start_ayah,
            pageData.end_ayah
          );
          result = all.filter(
            (v) =>
              v.verse_number >= pageData.start_ayah &&
              v.verse_number <= pageData.end_ayah
          );
        } else {
          // Cross-surah page: tail of start_surah + head of end_surah
          const [startAll, endAll] = await Promise.all([
            fetchRange(pageData.start_surah, pageData.start_ayah, 300),
            fetchRange(pageData.end_surah,   1,                    pageData.end_ayah),
          ]);
          result = [
            ...startAll.filter((v) => v.verse_number >= pageData.start_ayah),
            ...endAll.filter((v)   => v.verse_number <= pageData.end_ayah),
          ];
        }

        setVerses(result);
      } catch (e) {
        setError(e.message || "Failed to load verses");
        setVerses([]);
      } finally {
        setLoading(false);
      }
    };

    loadVerses();
  }, [pageData]);

  const isSpecial = SPECIAL_PAGES.has(page);

  // For grid pages (3+): flatten words + ayah-end markers into 15 row buckets.
  // Each token knows whether it is an ayah marker so it can be styled.
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
