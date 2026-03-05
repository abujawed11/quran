// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import "./App.css";

export default function App() {
  const [layout, setLayout] = useState([]);
  const [page, setPage] = useState(3);
  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load pages_layout.json once
  useEffect(() => {
    fetch("/pages_layout.json")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load pages_layout.json");
        return r.json();
      })
      .then((data) => setLayout(data))
      .catch((e) => setError(e.message || "Failed to load layout"));
  }, []);

  const pageData = useMemo(
    () => layout.find((p) => p.page === page),
    [layout, page]
  );

  // Fetch verses for current page
  useEffect(() => {
    const loadVerses = async () => {
      if (!pageData) return;

      setLoading(true);
      setError("");

      try {
        // Fetch only the API pages that contain our ayah range.
        // Quran API max per_page is 50, so calculate which pages we need.
        const PER_PAGE = 50;

        const fetchRange = async (surah, startAyah, endAyah) => {
          const firstApiPage = Math.ceil(startAyah / PER_PAGE);
          const lastApiPage  = Math.ceil(endAyah  / PER_PAGE);

          const requests = [];
          for (let p = firstApiPage; p <= lastApiPage; p++) {
            requests.push(
              fetch(
                `https://api.quran.com/api/v4/verses/by_chapter/${surah}` +
                `?fields=text_uthmani&per_page=${PER_PAGE}&page=${p}`
              ).then((r) => {
                if (!r.ok) throw new Error(`Quran API failed for surah ${surah} page ${p}`);
                return r.json();
              }).then((d) => d.verses || [])
            );
          }

          const pages = await Promise.all(requests);
          return pages.flat();
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
          // Cross-surah: fetch tail of start_surah + head of end_surah
          const [startAll, endAll] = await Promise.all([
            fetchRange(pageData.start_surah, pageData.start_ayah, 9999),
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

  // Split all verse text into exactly 15 lines by word count
  const lines = useMemo(() => {
    const LINES = 15;
    if (!verses.length) return Array(LINES).fill([]);

    const words = [];
    verses.forEach((v) => {
      v.text_uthmani.split(" ").forEach((w) => words.push(w));
      words.push(`﴿${v.verse_number}﴾`);
    });

    const perLine = Math.ceil(words.length / LINES);
    return Array.from({ length: LINES }, (_, i) =>
      words.slice(i * perLine, (i + 1) * perLine)
    );
  }, [verses]);

  const canPrev = page > 1;
  const canNext = page < 610;

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ marginBottom: 6 }}>Page {page}</h1>

      {pageData && (
        <div style={{ opacity: 0.85 }}>
          {pageData.start_surah}:{pageData.start_ayah} → {pageData.end_surah}:
          {pageData.end_ayah}
        </div>
      )}

      {error && (
        <div style={{ marginTop: 10, color: "#ff8080" }}>⚠️ {error}</div>
      )}

      <div className="mushafPage">
        {loading ? (
          <div className="mushafLoading">Loading…</div>
        ) : (
          lines.map((lineWords, i) => (
            <div key={i} className="mushafLine">
              {lineWords.map((word, j) => (
                <span key={j}>{word}</span>
              ))}
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
        <button disabled={!canPrev} onClick={() => setPage((p) => p - 1)}>
          Prev
        </button>
        <button disabled={!canNext} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}