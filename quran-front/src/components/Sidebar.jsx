// src/components/Sidebar.jsx
import { useState, useEffect, useRef, useMemo } from "react";
import { SURAHS, JUZS, getPageMeta } from "../data/quranMeta";
import AudioPlayer from "./AudioPlayer";

export default function Sidebar({
  page, totalPages, reciter, reciters, clickedAyah,
  debugMode, overlayStatus,
  onPageChange, onReciterChange, onDebugToggle, onPlayFullSurah,
  // Translation
  translationMode, translationOnlyMode, translator, translators,
  onTranslationModeChange, onTranslationOnlyModeChange, onTranslatorChange,
  // Audio player
  playingAyah, isPlaying, autoAdvance, currentTime, duration, playPhase,
  onPlay, onPause, onStop, onNext, onPrev, onToggleAutoAdvance, onSeek,
}) {
  const [pageInput, setPageInput] = useState(String(page));

  // Keep page input in sync when page changes via other controls (prev/next, etc.)
  useEffect(() => setPageInput(String(page)), [page]);

  // Track selected surah independently so that when multiple surahs share a page
  // (e.g. 103/104/105 all on page 607), picking surah 103 doesn't snap back to 105.
  const meta0 = useMemo(() => getPageMeta(page), [page]);
  const [selectedSurah, setSelectedSurah] = useState(meta0.surahNum);
  const skipSurahSync = useRef(false);
  useEffect(() => {
    if (skipSurahSync.current) { skipSurahSync.current = false; return; }
    setSelectedSurah(meta0.surahNum);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const meta = meta0;

  const handlePageGo = () => {
    const n = parseInt(pageInput, 10);
    if (!isNaN(n)) onPageChange(n);
  };

  const debugLine = (() => {
    if (!overlayStatus) return "Waiting…";
    const { coordsLoaded, wordCount, ayahCount, displayW, displayH, yOffset } = overlayStatus;
    return [
      coordsLoaded ? `${wordCount} words · ${ayahCount} ayahs` : "Coords ✗",
      displayW ? `${Math.round(displayW)}×${Math.round(displayH)}px` : "Layer ✗",
      yOffset > 0 ? `offset: ${Math.round(yOffset)}px` : null,
    ].filter(Boolean).join("  ·  ");
  })();

  return (
    <aside className="sb">

      {/* ── Header ── */}
      <div className="sb-header">
        <div className="sb-title-ar">المصحف الشريف</div>
        <div className="sb-title-en">The Holy Quran</div>
      </div>

      {/* ── Location card ── */}
      <div className="sb-section">
        <div className="sb-section-label">Current Location</div>
        <div className="sb-location-grid">
          <div className="sb-loc-item">
            <span className="sb-loc-label">Juz</span>
            <span className="sb-loc-value">{meta.juz}</span>
          </div>
          <div className="sb-loc-item">
            <span className="sb-loc-label">Page</span>
            <span className="sb-loc-value">{page}</span>
          </div>
          <div className="sb-loc-item sb-loc-item--wide">
            <span className="sb-loc-label">Surah</span>
            <span className="sb-loc-value sb-loc-value--surah">
              <span className="sb-loc-ar">{meta.surahAr}</span>
              <span className="sb-loc-en">{meta.surahEn}</span>
            </span>
          </div>
          <div className="sb-loc-item">
            <span className="sb-loc-label">Ayah</span>
            <span className="sb-loc-value">
              {clickedAyah ? clickedAyah.displayAyah ?? clickedAyah.ayah : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <div className="sb-section">
        <div className="sb-section-label">Navigate</div>

        <div className="sb-field">
          <label className="sb-label">Surah</label>
          <select
            className="sb-select"
            value={selectedSurah}
            onChange={(e) => {
              const num = +e.target.value;
              setSelectedSurah(num);
              skipSurahSync.current = true;
              onPageChange(SURAHS[num].page);
            }}
          >
            {SURAHS.slice(1).map((s) => (
              <option key={s.number} value={s.number}>
                {s.number}. {s.nameEn} — {s.nameAr}
              </option>
            ))}
          </select>
          <button
            className="sb-btn sb-btn--play-surah"
            onClick={() => onPlayFullSurah(selectedSurah)}
            title={`Play full Surah ${SURAHS[selectedSurah]?.nameEn}`}
          >
            ▶ Play Full Surah
          </button>
        </div>

        <div className="sb-field">
          <label className="sb-label">Juz</label>
          <select
            className="sb-select"
            value={meta.juz}
            onChange={(e) => onPageChange(JUZS[+e.target.value].page)}
          >
            {JUZS.slice(1).map((j) => (
              <option key={j.number} value={j.number}>
                Juz {j.number} — {j.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sb-field">
          <label className="sb-label">Page <span className="sb-label-hint">/ {totalPages}</span></label>
          <div className="sb-row">
            <input
              className="sb-input"
              type="number"
              min={1}
              max={totalPages}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePageGo()}
            />
            <button className="sb-btn sb-btn--go" onClick={handlePageGo}>Go</button>
          </div>
        </div>

        <div className="sb-row sb-prevnext">
          <button
            className="sb-btn sb-btn--nav"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            ← Prev
          </button>
          <button
            className="sb-btn sb-btn--nav"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next →
          </button>
        </div>
      </div>

      {/* ── Audio Player ── */}
      {playingAyah && (
        <div className="sb-section sb-section--player">
          <AudioPlayer
            playingAyah={playingAyah}
            isPlaying={isPlaying}
            autoAdvance={autoAdvance}
            currentTime={currentTime}
            duration={duration}
            playPhase={playPhase}
            translationOnlyMode={translationOnlyMode}
            onPlay={onPlay}
            onPause={onPause}
            onStop={onStop}
            onNext={onNext}
            onPrev={onPrev}
            onToggleAutoAdvance={onToggleAutoAdvance}
            onSeek={onSeek}
          />
        </div>
      )}

      {/* ── Reciter ── */}
      <div className="sb-section">
        <div className="sb-section-label">Reciter</div>
        <select
          className="sb-select"
          value={reciter}
          onChange={(e) => onReciterChange(e.target.value)}
        >
          {reciters.map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* ── Translation Audio ── */}
      <div className="sb-section">
        <div className="sb-section-label">Translation Audio</div>
        <div className="sb-translation-options">
          <label className="sb-radio-label">
            <input
              type="radio"
              name="translationAudioMode"
              checked={!translationMode && !translationOnlyMode}
              onChange={() => { onTranslationModeChange(false); onTranslationOnlyModeChange(false); }}
            />
            <span>Off</span>
          </label>
          <label className="sb-radio-label">
            <input
              type="radio"
              name="translationAudioMode"
              checked={translationMode}
              onChange={() => onTranslationModeChange(true)}
            />
            <span>After each Ayah</span>
          </label>
          <label className="sb-radio-label">
            <input
              type="radio"
              name="translationAudioMode"
              checked={translationOnlyMode}
              onChange={() => onTranslationOnlyModeChange(true)}
            />
            <span>Translation Only</span>
          </label>
        </div>
        {(translationMode || translationOnlyMode) && (
          <select
            className="sb-select"
            value={translator}
            onChange={(e) => onTranslatorChange(e.target.value)}
          >
            {translators.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* ── Footer / Debug ── */}
      <div className="sb-footer">
        <button
          className={`sb-debug-btn${debugMode ? " sb-debug-btn--on" : ""}`}
          onClick={onDebugToggle}
        >
          {debugMode ? "Debug ON" : "Debug"}
        </button>
        {debugMode && (
          <div className="sb-debug-info">{debugLine}</div>
        )}
      </div>

    </aside>
  );
}
