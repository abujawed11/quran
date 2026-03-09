// src/components/AudioPlayer.jsx
import { SURAHS } from "../data/quranMeta";

const fmt = (s) => {
  if (!s || !isFinite(s)) return "0:00";
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

export default function AudioPlayer({
  playingAyah,
  isPlaying,
  autoAdvance,
  currentTime,
  duration,
  onPlay,
  onPause,
  onStop,
  onNext,
  onPrev,
  onToggleAutoAdvance,
  onSeek,
}) {
  if (!playingAyah) return null;

  const { surah, displayAyah } = playingAyah;
  const surahName  = SURAHS[surah]?.nameEn ?? "";
  const isFullMode = displayAyah === null;
  const title      = isFullMode ? `${surahName} · Full Surah` : `${surahName} · Ayah ${displayAyah}`;

  return (
    <div className="ap">

      {/* Now playing info */}
      <div className="ap-now-playing">
        <span className="ap-label">{isFullMode ? "Now Playing · Full Surah" : "Now Playing"}</span>
        <span className="ap-title">{title}</span>
      </div>

      {/* Progress bar */}
      <div className="ap-progress">
        <span className="ap-time">{fmt(currentTime)}</span>
        <input
          className="ap-seek"
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={(e) => onSeek(+e.target.value)}
        />
        <span className="ap-time">{fmt(duration)}</span>
      </div>

      {/* Controls */}
      <div className="ap-controls">
        <button className="ap-btn" onClick={onPrev}  title="Previous Ayah">⏮</button>
        <button
          className="ap-btn ap-btn--main"
          onClick={isPlaying ? onPause : onPlay}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button className="ap-btn" onClick={onStop}  title="Stop">⏹</button>
        <button className="ap-btn" onClick={onNext}  title="Next Ayah">⏭</button>
        <button
          className={`ap-btn ap-btn--advance${autoAdvance ? " ap-btn--on" : ""}`}
          onClick={onToggleAutoAdvance}
          title={autoAdvance ? "Auto-advance ON" : "Auto-advance OFF"}
        >
          ↻
        </button>
      </div>

    </div>
  );
}
