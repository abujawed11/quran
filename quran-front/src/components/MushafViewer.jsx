// src/components/MushafViewer.jsx
import { useState, useRef, useCallback, useEffect } from "react";
import WordOverlay from "./WordOverlay";
import Sidebar from "./Sidebar";

const RECITERS = [
  { id: "Alafasy_128kbps",                label: "Mishary Alafasy" },
  { id: "AbdullaahJuhaynee_128kbps",      label: "Abdullaah Al-Juhaynee" },
  { id: "Abdurrahmaan_As-Sudais_192kbps", label: "Abdurrahmaan As-Sudais" },
];

const TOTAL_PAGES = 610;

export default function MushafViewer() {
  const [page, setPage]               = useState(1);
  const [reciter, setReciter]         = useState(RECITERS[0].id);
  const [imgError, setImgError]       = useState(false);
  const [clickedAyah, setClickedAyah] = useState(null);
  const [debugMode, setDebugMode]     = useState(false);
  const [overlayStatus, setOverlayStatus] = useState(null);

  const audioRef = useRef(null);

  // Resume the browser's media pipeline when returning to the tab after idle.
  // Browsers can throttle/suspend audio after long inactivity — this wakes it up
  // before the user clicks, so the beginning of the ayah isn't cut off.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const audio = audioRef.current;
        if (!audio || !audio.paused) return;
        // Silent play+pause wakes the media pipeline without audible output
        audio.volume = 0;
        audio.play().then(() => {
          audio.pause();
          audio.volume = 1;
        }).catch(() => {
          audio.volume = 1;
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const goToPage = (n) => {
    const clamped = Math.max(1, Math.min(TOTAL_PAGES, n));
    setPage(clamped);
    setImgError(false);
    setClickedAyah(null);
    setOverlayStatus(null);
  };

  const handleReciterChange = (id) => {
    setReciter(id);
    if (audioRef.current) audioRef.current.pause();
  };

  const handleAyahClick = (surah, ayah, displayAyah) => {
    setClickedAyah({ surah, ayah, displayAyah });
    const file = `${String(surah).padStart(3, "0")}${String(ayah).padStart(3, "0")}.mp3`;
    const audio = audioRef.current;
    audio.pause();
    audio.src = `/audio/${reciter}/${file}`;
    audio.load(); // explicitly buffer before play so beginning isn't cut off
    audio.play().catch((err) => console.warn("[Audio] play failed:", err.message));
  };

  const handleStatus = useCallback((s) => setOverlayStatus(s), []);

  return (
    <div className="mv-shell">

      <Sidebar
        page={page}
        totalPages={TOTAL_PAGES}
        reciter={reciter}
        reciters={RECITERS}
        clickedAyah={clickedAyah}
        debugMode={debugMode}
        overlayStatus={overlayStatus}
        onPageChange={goToPage}
        onReciterChange={handleReciterChange}
        onDebugToggle={() => setDebugMode((d) => !d)}
      />

      <main className="mv-page-panel">
        <div className="mv-page-frame">
          {/* Corner ornaments */}
          <span className="mv-corner mv-corner--tl" />
          <span className="mv-corner mv-corner--tr" />
          <span className="mv-corner mv-corner--bl" />
          <span className="mv-corner mv-corner--br" />

          <div className="mv-page-card">
            {imgError ? (
              <div className="mv-img-error">Image not found for page {page}</div>
            ) : (
              <>
                <img
                  key={page}
                  src={`/mushaf/pages/${page}.png`}
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
        </div>
      </main>

      <audio ref={audioRef} />

    </div>
  );
}
