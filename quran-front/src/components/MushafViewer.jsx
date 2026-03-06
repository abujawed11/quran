// src/components/MushafViewer.jsx
import { useState, useRef, useCallback } from "react";
import WordOverlay from "./WordOverlay";

const TOTAL_PAGES = 610;

export default function MushafViewer() {
  const [page, setPage]               = useState(1);
  const [inputVal, setInputVal]       = useState("1");
  const [imgError, setImgError]       = useState(false);
  const [clickedAyah, setClickedAyah] = useState(null); // { surah, ayah }
  const [debugMode, setDebugMode]     = useState(false);
  const [overlayStatus, setOverlayStatus] = useState(null);

  const inputRef = useRef(null);

  const goToPage = (n) => {
    const clamped = Math.max(1, Math.min(TOTAL_PAGES, n));
    setPage(clamped);
    setInputVal(String(clamped));
    setImgError(false);
    setClickedAyah(null);
    setOverlayStatus(null);
  };

  const handleGoClick = () => {
    const parsed = parseInt(inputVal, 10);
    if (!isNaN(parsed)) goToPage(parsed);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") handleGoClick();
  };

  const handleAyahClick = (surah, ayah) => setClickedAyah({ surah, ayah });
  const handleStatus    = useCallback((s) => setOverlayStatus(s), []);

  const canPrev  = page > 1;
  const canNext  = page < TOTAL_PAGES;
  const imageUrl = `/mushaf/pages/${page}.png`;

  const statusLine = (() => {
    if (!overlayStatus) return "Waiting…";
    const { coordsLoaded, wordCount, ayahCount, displayW, displayH } = overlayStatus;
    return [
      coordsLoaded ? `Coords ✓  (${wordCount} words, ${ayahCount} ayahs)` : "Coords ✗",
      displayW     ? `Layer ✓  (${Math.round(displayW)}×${Math.round(displayH)} px)` : "Layer ✗",
    ].join("   |   ");
  })();

  return (
    <div className="mv-shell">

      {/* ── Top bar ── */}
      <header className="mv-topbar">
        <span className="mv-title">المصحف الشريف</span>
        <div className="mv-topbar-right">
          <button
            className={`mv-debug-toggle${debugMode ? " mv-debug-toggle--on" : ""}`}
            onClick={() => setDebugMode((d) => !d)}
          >
            {debugMode ? "Debug ON" : "Debug"}
          </button>
          <span className="mv-page-label">Page {page} of {TOTAL_PAGES}</span>
        </div>
      </header>

      {/* ── Debug status bar ── */}
      {debugMode && (
        <div className="mv-status-bar">{statusLine}</div>
      )}

      {/* ── Clicked ayah display ── */}
      {clickedAyah && (
        <div className="mv-word-info">
          Selected → Surah <strong>{clickedAyah.surah}</strong> · Ayah{" "}
          <strong>{clickedAyah.ayah}</strong>
          {/* PHASE 3: use clickedAyah.surah + clickedAyah.ayah to build audio URL and play */}
        </div>
      )}

      {/* ── Page image card ── */}
      <main className="mv-main">
        <div className="mv-page-card">
          {imgError ? (
            <div className="mv-img-error">Image not found for page {page}</div>
          ) : (
            <>
              <img
                key={page}
                src={imageUrl}
                alt={`Quran page ${page}`}
                className="mv-page-img"
                onError={() => setImgError(true)}
                draggable={false}
              />
              <WordOverlay
                page={page}
                debug={debugMode}
                onAyahClick={handleAyahClick}
                onStatus={handleStatus}
              />
            </>
          )}
        </div>
      </main>

      {/* ── Navigation bar ── */}
      <nav className="mv-navbar">
        <button className="mv-btn" disabled={!canPrev} onClick={() => goToPage(page - 1)}>
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
          />
          <button className="mv-btn mv-btn-go" onClick={handleGoClick}>Go</button>
        </div>
        <button className="mv-btn" disabled={!canNext} onClick={() => goToPage(page + 1)}>
          Next &rarr;
        </button>
      </nav>

    </div>
  );
}
