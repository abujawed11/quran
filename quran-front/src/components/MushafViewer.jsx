// src/components/MushafViewer.jsx
import { useState, useRef, useCallback } from "react";
import WordOverlay from "./WordOverlay";
import Sidebar from "./Sidebar";

const RECITERS = [
  { id: "Alafasy_128kbps",           label: "Mishary Alafasy" },
  { id: "AbdullaahJuhaynee_128kbps", label: "Abdullaah Al-Juhaynee" },
];

const TOTAL_PAGES = 610;

export default function MushafViewer() {
  const [page, setPage]             = useState(1);
  const [reciter, setReciter]       = useState(RECITERS[0].id);
  const [imgError, setImgError]     = useState(false);
  const [clickedAyah, setClickedAyah] = useState(null);
  const [debugMode, setDebugMode]   = useState(false);
  const [overlayStatus, setOverlayStatus] = useState(null);

  const audioRef = useRef(null);

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
      </main>

      <audio ref={audioRef} />

    </div>
  );
}
