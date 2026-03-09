// src/components/MushafViewer.jsx
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { SURAHS } from "../data/quranMeta";
import WordOverlay      from "./WordOverlay";
import Sidebar          from "./Sidebar";
import AyahContextMenu  from "./AyahContextMenu";

const RECITERS = [
  { id: "Alafasy_128kbps",                label: "Mishary Alafasy" },
  { id: "AbdullaahJuhaynee_128kbps",      label: "Abdullaah Al-Juhaynee" },
  { id: "Abdurrahmaan_As-Sudais_192kbps", label: "Abdurrahmaan As-Sudais" },
];
const TOTAL_PAGES = 610;

// ── Pure helpers (no closures, safe to call from event handlers) ──────────────
const audioUrl = (reciter, surah, ayah) => {
  const file = `${String(surah).padStart(3,"0")}${String(ayah).padStart(3,"0")}`;
  return `/api/audio?r=${encodeURIComponent(reciter)}&f=${file}`;
};

const fullSurahUrl = (reciter, surah) => {
  const file = `full/${String(surah).padStart(3,"0")}`;
  return `/api/audio?r=${encodeURIComponent(reciter)}&f=${file}`;
};

const displayAyahNum = (surah, ayah) => (surah === 1 ? ayah - 1 : ayah);

// Surah 1: Bismillah is ayah 1 (already in the audio). Surah 9: no Bismillah.
const needsBismillah = (surah) => surah !== 1 && surah !== 9;
const bismillahUrl   = (reciter) => audioUrl(reciter, 1, 1); // Surah 1 Ayah 1 = Bismillah

const nextAyah = (surah, ayah) => {
  const max = SURAHS[surah]?.ayahs;
  if (!max) return null;
  if (ayah < max) return { surah, ayah: ayah + 1 };
  if (surah < 114) return { surah: surah + 1, ayah: 1 };
  return null;
};

const prevAyah = (surah, ayah) => {
  if (ayah > 1) return { surah, ayah: ayah - 1 };
  if (surah > 1) {
    const s = surah - 1;
    return { surah: s, ayah: SURAHS[s]?.ayahs ?? 1 };
  }
  return null;
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function MushafViewer() {
  // ── UI state ──────────────────────────────────────────────────────────────
  const [page,          setPage]          = useState(1);
  const [reciter,       setReciter]       = useState(RECITERS[0].id);
  const [imgError,      setImgError]      = useState(false);
  const [clickedAyah,   setClickedAyah]   = useState(null);
  const [debugMode,     setDebugMode]     = useState(false);
  const [overlayStatus, setOverlayStatus] = useState(null);
  const [contextMenu,   setContextMenu]   = useState(null); // { x, y, surah, ayah, displayAyah }

  // ── Audio state ───────────────────────────────────────────────────────────
  const [playingAyah,  setPlayingAyah]  = useState(null); // { surah, ayah, displayAyah }
  const [isPlaying,    setIsPlaying]    = useState(false);
  const [autoAdvance,  setAutoAdvance]  = useState(true);
  const [currentTime,  setCurrentTime]  = useState(0);
  const [duration,     setDuration]     = useState(0);

  // ── Refs (for use inside event handlers to avoid stale closures) ──────────
  const audioRef       = useRef(null); // main player
  const preloadRef     = useRef(null); // silent preload buffer
  const playingRef     = useRef(null); // mirrors playingAyah
  const autoAdvRef     = useRef(true); // mirrors autoAdvance
  const playModeRef    = useRef("single"); // "single" | "continuous"
  const reciterRef     = useRef(RECITERS[0].id); // mirrors reciter
  const pageRef        = useRef(1);    // mirrors page
  const ayahKeysRef    = useRef(new Set()); // ayah keys on current page
  const timestampsRef          = useRef(null); // loaded timestamps for full-surah highlighting
  const pendingAfterBismillah  = useRef(null); // { type:"ayah"|"surah", surah, ayah, dAyah, mode }

  // ── Sync refs with state ──────────────────────────────────────────────────
  useEffect(() => { reciterRef.current  = reciter;     }, [reciter]);
  useEffect(() => { autoAdvRef.current  = autoAdvance; }, [autoAdvance]);
  useEffect(() => { pageRef.current     = page;        }, [page]);

  // ── Wake media pipeline when returning to tab after idle ──────────────────
  useEffect(() => {
    const handle = () => {
      if (document.visibilityState !== "visible") return;
      const a = audioRef.current;
      if (!a || !a.paused) return;
      a.volume = 0;
      a.play().then(() => { a.pause(); a.volume = 1; }).catch(() => { a.volume = 1; });
    };
    document.addEventListener("visibilitychange", handle);
    return () => document.removeEventListener("visibilitychange", handle);
  }, []);

  // ── Audio event listeners ─────────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;

    const onEnded = () => {
      const cur  = playingRef.current;
      const mode = playModeRef.current;

      // ── Bismillah just finished — play the pending content ────────────────
      if (mode === "bismillah") {
        const pending = pendingAfterBismillah.current;
        pendingAfterBismillah.current = null;
        if (!pending) { setIsPlaying(false); return; }

        if (pending.type === "ayah") {
          const np = { surah: pending.surah, ayah: pending.ayah, displayAyah: pending.dAyah };
          setPlayingAyah(np);
          playingRef.current  = np;
          playModeRef.current = pending.mode;
          audio.src = audioUrl(reciterRef.current, pending.surah, pending.ayah);
          audio.load();
          audio.play().catch((e) => console.warn("[Audio]", e.message));
          const after = nextAyah(pending.surah, pending.ayah);
          if (after && preloadRef.current) {
            preloadRef.current.src = audioUrl(reciterRef.current, after.surah, after.ayah);
            preloadRef.current.load();
          }
        } else { // "surah"
          playModeRef.current = "surah-full";
          audio.src = fullSurahUrl(reciterRef.current, pending.surah);
          audio.load();
          audio.play().catch((e) => console.warn("[Audio]", e.message));
        }
        return;
      }

      // ── Full-surah mode ──────────────────────────────────────────────────
      if (mode === "surah-full") {
        if (!autoAdvRef.current || !cur || cur.surah >= 114) {
          setPlayingAyah(null);
          playingRef.current = null;
          timestampsRef.current = null;
          setIsPlaying(false);
          return;
        }
        const nextSurah = cur.surah + 1;
        const np = { surah: nextSurah, ayah: null, displayAyah: null };
        setPlayingAyah(np);
        playingRef.current = np;
        // Pre-fetch timestamps for next surah
        timestampsRef.current = null;
        fetch(`/timestamps/${nextSurah}.json`)
          .then((r) => r.ok ? r.json() : null)
          .then((data) => { if (data?.timestamps) timestampsRef.current = data.timestamps; })
          .catch(() => {});
        if (needsBismillah(nextSurah)) {
          pendingAfterBismillah.current = { type: "surah", surah: nextSurah };
          playModeRef.current = "bismillah";
          audio.src = bismillahUrl(reciterRef.current);
        } else {
          audio.src = fullSurahUrl(reciterRef.current, nextSurah);
        }
        audio.load();
        audio.play().catch((e) => console.warn("[Audio]", e.message));
        return;
      }

      // ── Ayah mode ────────────────────────────────────────────────────────
      if (!cur || mode === "single" || !autoAdvRef.current) {
        setIsPlaying(false);
        return;
      }

      const next = nextAyah(cur.surah, cur.ayah);
      if (!next) {
        // Reached end of Quran
        setPlayingAyah(null);
        playingRef.current = null;
        setIsPlaying(false);
        return;
      }

      const dAyah = displayAyahNum(next.surah, next.ayah);
      const np    = { surah: next.surah, ayah: next.ayah, displayAyah: dAyah };
      setPlayingAyah(np);
      playingRef.current = np;

      // Auto-navigate if this ayah is not on the current page
      const key = `${next.surah}:${next.ayah}`;
      if (!ayahKeysRef.current.has(key)) {
        const surahPage = SURAHS[next.surah]?.page ?? 0;
        const curr      = pageRef.current;
        const target    = surahPage > curr ? surahPage : curr + 1;
        const clamped   = Math.max(1, Math.min(TOTAL_PAGES, target));
        pageRef.current = clamped;
        setPage(clamped);
        setImgError(false);
        setOverlayStatus(null);
      }

      // Play bismillah first when entering a new surah
      if (next.ayah === 1 && needsBismillah(next.surah)) {
        pendingAfterBismillah.current = { type: "ayah", surah: next.surah, ayah: next.ayah, dAyah, mode: playModeRef.current };
        playModeRef.current = "bismillah";
        audio.src = bismillahUrl(reciterRef.current);
        audio.load();
        audio.play().catch((e) => console.warn("[Audio]", e.message));
        return;
      }

      // Play next ayah
      audio.src = audioUrl(reciterRef.current, next.surah, next.ayah);
      audio.load();
      audio.play().catch((e) => console.warn("[Audio]", e.message));

      // Preload the one after
      const after = nextAyah(next.surah, next.ayah);
      if (after && preloadRef.current) {
        preloadRef.current.src = audioUrl(reciterRef.current, after.surah, after.ayah);
        preloadRef.current.load();
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      // Timestamp-based ayah highlighting for full-surah mode
      if (playModeRef.current !== "surah-full") return;
      const ts = timestampsRef.current;
      if (!ts || ts.length === 0) return;
      const active = ts.find((t) => t.time > audio.currentTime) ?? ts[ts.length - 1];
      const cur = playingRef.current;
      if (!cur || (cur.ayah === active.ayah && cur.ayahEnd === (active.ayahEnd ?? null))) return;
      const np = { surah: cur.surah, ayah: active.ayah, ayahEnd: active.ayahEnd ?? null, displayAyah: active.ayah };
      setPlayingAyah(np);
      playingRef.current = np;
    };
    const onDurationChange  = () => { if (isFinite(audio.duration)) setDuration(audio.duration); };
    const onPlay            = () => setIsPlaying(true);
    const onPause           = () => setIsPlaying(false);

    audio.addEventListener("ended",          onEnded);
    audio.addEventListener("timeupdate",     onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("play",           onPlay);
    audio.addEventListener("pause",          onPause);
    return () => {
      audio.removeEventListener("ended",          onEnded);
      audio.removeEventListener("timeupdate",     onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("play",           onPlay);
      audio.removeEventListener("pause",          onPause);
    };
  }, []); // empty deps — uses refs only

  // ── Core play function ────────────────────────────────────────────────────
  const playAyah = useCallback((surah, ayah, dAyah, mode = "single") => {
    const np = { surah, ayah, displayAyah: dAyah };
    setPlayingAyah(np);
    playingRef.current  = np;
    playModeRef.current = mode;
    setCurrentTime(0);
    setDuration(0);

    const audio = audioRef.current;
    audio.pause();
    audio.src = audioUrl(reciterRef.current, surah, ayah);
    audio.load();
    audio.play().catch((e) => console.warn("[Audio]", e.message));

    // Preload next
    const next = nextAyah(surah, ayah);
    if (next && preloadRef.current) {
      preloadRef.current.src = audioUrl(reciterRef.current, next.surah, next.ayah);
      preloadRef.current.load();
    }
  }, []);

  // ── Full-surah play ───────────────────────────────────────────────────────
  const playFullSurah = useCallback((surahNum) => {
    const np = { surah: surahNum, ayah: null, displayAyah: null };
    setPlayingAyah(np);
    playingRef.current = np;
    setCurrentTime(0);
    setDuration(0);

    // Load timestamps for ayah-level highlighting
    timestampsRef.current = null;
    fetch(`/timestamps/${surahNum}.json`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.timestamps) timestampsRef.current = data.timestamps; })
      .catch(() => {});

    const audio = audioRef.current;
    audio.pause();
    if (needsBismillah(surahNum)) {
      pendingAfterBismillah.current = { type: "surah", surah: surahNum };
      playModeRef.current = "bismillah";
      audio.src = bismillahUrl(reciterRef.current);
    } else {
      playModeRef.current = "surah-full";
      audio.src = fullSurahUrl(reciterRef.current, surahNum);
    }
    audio.load();
    audio.play().catch((e) => console.warn("[Audio]", e.message));
  }, []);

  // ── Navigation ────────────────────────────────────────────────────────────
  const goToPage = (n) => {
    const clamped = Math.max(1, Math.min(TOTAL_PAGES, n));
    pageRef.current = clamped;
    setPage(clamped);
    setImgError(false);
    setClickedAyah(null);
    setOverlayStatus(null);
  };

  // ── Reciter ───────────────────────────────────────────────────────────────
  const handleReciterChange = (id) => {
    reciterRef.current = id; // update immediately for event handlers
    setReciter(id);
    audioRef.current?.pause();
  };

  // ── Ayah interactions ─────────────────────────────────────────────────────
  const handleAyahClick = (surah, ayah, dAyah) => {
    setClickedAyah({ surah, ayah, displayAyah: dAyah });
    playAyah(surah, ayah, dAyah, "single");
  };

  const handleAyahRightClick = (surah, ayah, dAyah, x, y) => {
    setContextMenu({ x, y, surah, ayah, displayAyah: dAyah });
  };

  // ── Player controls ───────────────────────────────────────────────────────
  const handlePlay = () => {
    if (playingRef.current) audioRef.current?.play().catch(() => {});
  };

  const handlePause = () => audioRef.current?.pause();

  const handleStop = () => {
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.src = ""; }
    setPlayingAyah(null);
    playingRef.current = null;
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };

  const handleNext = () => {
    const cur = playingRef.current;
    if (!cur) return;
    if (playModeRef.current === "surah-full") {
      if (cur.surah < 114) playFullSurah(cur.surah + 1);
      return;
    }
    const next = nextAyah(cur.surah, cur.ayah);
    if (!next) return;
    playAyah(next.surah, next.ayah, displayAyahNum(next.surah, next.ayah), playModeRef.current);
  };

  const handlePrev = () => {
    const cur = playingRef.current;
    if (!cur) return;
    // If > 3s in, restart; otherwise go to previous
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    if (playModeRef.current === "surah-full") {
      if (cur.surah > 1) playFullSurah(cur.surah - 1);
      return;
    }
    const prev = prevAyah(cur.surah, cur.ayah);
    if (!prev) return;
    playAyah(prev.surah, prev.ayah, displayAyahNum(prev.surah, prev.ayah), playModeRef.current);
  };

  const handleSeek  = (t) => { if (audioRef.current) audioRef.current.currentTime = t; };

  const handleToggleAutoAdvance = () => {
    setAutoAdvance((v) => {
      autoAdvRef.current = !v;
      return !v;
    });
  };

  // ── Status from overlay ───────────────────────────────────────────────────
  const handleStatus = useCallback((s) => {
    setOverlayStatus(s);
    if (s?.ayahKeys) ayahKeysRef.current = s.ayahKeys;
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const playingAyahKey = useMemo(() => {
    if (!playingAyah?.ayah) return null;
    const s = playingAyah.surah;
    const end = playingAyah.ayahEnd ?? playingAyah.ayah;
    const keys = new Set();
    for (let a = playingAyah.ayah; a <= end; a++) keys.add(`${s}:${a}`);
    return keys;
  }, [playingAyah]);

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
        onPlayFullSurah={playFullSurah}
        // Audio player props
        playingAyah={playingAyah}
        isPlaying={isPlaying}
        autoAdvance={autoAdvance}
        currentTime={currentTime}
        duration={duration}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onNext={handleNext}
        onPrev={handlePrev}
        onToggleAutoAdvance={handleToggleAutoAdvance}
        onSeek={handleSeek}
      />

      <main className="mv-page-panel">
        <div className="mv-page-frame">
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
                  playingAyahKey={playingAyahKey}
                  onAyahClick={handleAyahClick}
                  onAyahRightClick={handleAyahRightClick}
                  onStatus={handleStatus}
                />
              </>
            )}
          </div>
        </div>
      </main>

      {/* Right-click context menu */}
      <AyahContextMenu
        menu={contextMenu}
        onPlaySingle={(s, a, d) => { setClickedAyah({ surah: s, ayah: a, displayAyah: d }); playAyah(s, a, d, "single"); }}
        onPlayFrom={(s, a, d)   => { setClickedAyah({ surah: s, ayah: a, displayAyah: d }); playAyah(s, a, d, "continuous"); }}
        onClose={() => setContextMenu(null)}
      />

      {/* Hidden audio elements */}
      <audio ref={audioRef}   />
      <audio ref={preloadRef} />

    </div>
  );
}
