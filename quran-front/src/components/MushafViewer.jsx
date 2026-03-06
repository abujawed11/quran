// src/components/MushafViewer.jsx
import { useState, useRef } from "react";

const TOTAL_PAGES = 610;

export default function MushafViewer() {
  const [page, setPage] = useState(1);
  const [inputVal, setInputVal] = useState("1");
  const [imgError, setImgError] = useState(false);
  const inputRef = useRef(null);

  const goToPage = (n) => {
    const clamped = Math.max(1, Math.min(TOTAL_PAGES, n));
    setPage(clamped);
    setInputVal(String(clamped));
    setImgError(false);
  };

  const handleGoClick = () => {
    const parsed = parseInt(inputVal, 10);
    if (!isNaN(parsed)) goToPage(parsed);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") handleGoClick();
  };

  const canPrev = page > 1;
  const canNext = page < TOTAL_PAGES;

  // Image URL for the current page
  const imageUrl = `/mushaf/pages/${page}.png`;

  // ── PHASE 2: fetch coords here ──────────────────────────────────────────
  // When you are ready to add clickable word overlays, fetch the coords JSON:
  //
  //   useEffect(() => {
  //     fetch(`/mushaf/coords/${page}.json`)
  //       .then(r => r.json())
  //       .then(data => setCoords(data));
  //   }, [page]);
  //
  // Then render <WordOverlay coords={coords} /> on top of the <img> below,
  // inside the .mushaf-page-card div, using position:absolute.
  // ────────────────────────────────────────────────────────────────────────

  return (
    <div className="mv-shell">

      {/* ── Top bar ── */}
      <header className="mv-topbar">
        <span className="mv-title">المصحف الشريف</span>
        <span className="mv-page-label">Page {page} of {TOTAL_PAGES}</span>
      </header>

      {/* ── Page image card ── */}
      <main className="mv-main">
        <div className="mv-page-card">
          {imgError ? (
            <div className="mv-img-error">
              Image not found for page {page}
            </div>
          ) : (
            <img
              key={page}
              src={imageUrl}
              alt={`Quran page ${page}`}
              className="mv-page-img"
              onError={() => setImgError(true)}
              draggable={false}
            />
          )}

          {/* PHASE 2: place <WordOverlay /> here, absolutely positioned over the img */}
        </div>
      </main>

      {/* ── Navigation bar ── */}
      <nav className="mv-navbar">
        <button
          className="mv-btn"
          disabled={!canPrev}
          onClick={() => goToPage(page - 1)}
          aria-label="Previous page"
        >
          &larr; Prev
        </button>

        <div className="mv-goto">
          <input
            ref={inputRef}
            type="number"
            min={1}
            max={TOTAL_PAGES}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleInputKeyDown}
            className="mv-page-input"
            aria-label="Page number"
          />
          <button className="mv-btn mv-btn-go" onClick={handleGoClick}>
            Go
          </button>
        </div>

        <button
          className="mv-btn"
          disabled={!canNext}
          onClick={() => goToPage(page + 1)}
          aria-label="Next page"
        >
          Next &rarr;
        </button>
      </nav>

    </div>
  );
}
