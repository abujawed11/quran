// src/components/WordOverlay.jsx
import { useEffect, useState, useRef, useMemo } from "react";

export default function WordOverlay({ page, debug, playingAyahKey, onAyahClick, onAyahRightClick, onStatus }) {
  const [coords, setCoords]           = useState(null);
  const [displaySize, setDisplaySize] = useState(null);
  const [hoveredAyah, setHoveredAyah] = useState(null);
  const layerRef                      = useRef(null);

  // ── Fetch coords ──────────────────────────────────────────────────────────
  useEffect(() => {
    setCoords(null);
    setHoveredAyah(null);
    fetch(`/mushaf/coords/${page}.json`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => setCoords(data))
      .catch((err) => { console.error("[Overlay] fetch failed:", err.message); setCoords(null); });
  }, [page]);

  // ── Measure layer via ResizeObserver ──────────────────────────────────────
  useEffect(() => {
    const el = layerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDisplaySize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Page bounding box ──────────────────────────────────────────────────────
  const pageBBox = useMemo(() => {
    if (!coords) return null;
    const vals = Object.values(coords);
    const minX = Math.min(...vals.map((b) => b.x));
    const minY = Math.min(...vals.map((b) => b.y));
    const maxX = Math.max(...vals.map((b) => b.x + b.w));
    const maxY = Math.max(...vals.map((b) => b.y + b.h));
    return { minX, minY, w: maxX - minX, h: maxY - minY };
  }, [coords]);

  // ── Adaptive scale ────────────────────────────────────────────────────────
  const scaleInfo = useMemo(() => {
    if (!pageBBox || !displaySize?.w) return null;
    const sX = displaySize.w / pageBBox.w;
    const sY = displaySize.h / pageBBox.h;
    if (sY > sX) {
      const contentH = pageBBox.h * sX;
      let yOffset = displaySize.h - contentH;
      if (page === 1) yOffset += displaySize.h * 0.06;
      return { scaleX: sX, scaleY: sX, yOffset };
    }
    return { scaleX: sX, scaleY: sY, yOffset: 0 };
  }, [pageBBox, displaySize, page]);

  // ── Build per-LINE segments per ayah ─────────────────────────────────────
  const ayahLines = useMemo(() => {
    if (!coords) return [];

    const ayahLineMap = {};
    Object.entries(coords).forEach(([key, box]) => {
      const [s, a] = key.split(":");

      const ayahKey = `${s}:${a}`;
      if (!ayahLineMap[ayahKey]) ayahLineMap[ayahKey] = { surah: +s, ayah: +a, lines: {} };
      const lines = ayahLineMap[ayahKey].lines;
      if (!lines[box.y]) lines[box.y] = [];
      lines[box.y].push(box);
    });

    const result = [];
    Object.entries(ayahLineMap).forEach(([ayahKey, { surah, ayah, lines }]) => {
      const displayAyah = surah === 1 ? ayah - 1 : ayah;
      Object.entries(lines).forEach(([yStr, boxes]) => {
        const y    = +yStr;
        const minX = Math.min(...boxes.map((b) => b.x));
        const maxX = Math.max(...boxes.map((b) => b.x + b.w));
        const h    = Math.max(...boxes.map((b) => b.h));
        result.push({ surah, ayah, displayAyah, ayahKey, lineKey: `${ayahKey}:${y}`, minX, maxX, y, h });
      });
    });

    return result;
  }, [coords]);

  // ── Status reporting (includes ayahKeys for auto-advance page detection) ──
  useEffect(() => {
    const ayahCount = new Set(ayahLines.map((l) => l.ayahKey)).size;
    const ayahKeys  = new Set(ayahLines.map((l) => l.ayahKey));
    onStatus?.({
      coordsLoaded: !!coords,
      wordCount:    coords ? Object.keys(coords).length : null,
      ayahCount,
      ayahKeys,
      displayW: displaySize?.w,
      displayH: displaySize?.h,
      yOffset:  scaleInfo?.yOffset ?? 0,
    });
  }, [coords, ayahLines, displaySize, scaleInfo, onStatus]);

  const canRender = !!(coords && displaySize?.w && pageBBox && scaleInfo);

  return (
    <div className="wo-layer" ref={layerRef}>
      {canRender && ayahLines.map(({ surah, ayah, displayAyah, ayahKey, lineKey, minX, maxX, y, h }) => {
        const isHovered = hoveredAyah === ayahKey;
        const isPlaying = playingAyahKey?.has(ayahKey) ?? false;
        const { scaleX, scaleY, yOffset } = scaleInfo;
        return (
          <div
            key={lineKey}
            className={[
              "wo-line",
              isPlaying  ? "wo-line--playing" : "",
              isHovered  ? "wo-line--hover"   : "",
              debug      ? "wo-line--debug"   : "",
            ].join(" ").trim()}
            style={{
              left:   (minX - pageBBox.minX) * scaleX,
              top:    (y    - pageBBox.minY) * scaleY + yOffset,
              width:  (maxX - minX)          * scaleX,
              height: h                      * scaleY,
            }}
            title={debug ? `${surah}:${displayAyah}` : undefined}
            onMouseEnter={() => setHoveredAyah(ayahKey)}
            onMouseLeave={() => setHoveredAyah(null)}
            onClick={() => onAyahClick(surah, ayah, displayAyah)}
            onContextMenu={(e) => {
              e.preventDefault();
              onAyahRightClick?.(surah, ayah, displayAyah, e.clientX, e.clientY);
            }}
          />
        );
      })}
    </div>
  );
}
