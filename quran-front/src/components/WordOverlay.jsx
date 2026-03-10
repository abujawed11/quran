// src/components/WordOverlay.jsx
//
// Supports TWO coordinate formats:
//
// FORMAT A — legacy word-level (existing files):
//   { "2:255:1": {x,y,w,h}, "2:255:2": {x,y,w,h}, ... }
//
// FORMAT B — coord-gen ayah-level (exported from quran-coordinate-gen):
//   { page, image: {width, height}, ayahs: { "2:255": [{x,y,w,h}, ...] } }
//
// Detection: if the root object has an "ayahs" key → Format B, else → Format A.

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

  // ── Detect format ─────────────────────────────────────────────────────────
  const isNewFormat = coords && typeof coords === "object" && "ayahs" in coords;

  // ══════════════════════════════════════════════════════════════════════════
  // FORMAT B — coord-gen ayah-level
  // Coords are already in original-image pixels (top-left = 0,0).
  // Scale = displaySize / image.{width,height}
  // ══════════════════════════════════════════════════════════════════════════

  const newFormatLines = useMemo(() => {
    if (!isNewFormat) return [];
    const result = [];
    Object.entries(coords.ayahs).forEach(([ayahKey, boxes]) => {
      const [s, a] = ayahKey.split(":");
      const surah = +s, ayah = +a;
      const displayAyah = surah === 1 ? ayah - 1 : ayah;
      boxes.forEach((box, idx) => {
        result.push({
          surah, ayah, displayAyah, ayahKey,
          lineKey: `${ayahKey}:${idx}`,
          x: box.x, y: box.y, w: box.w, h: box.h,
        });
      });
    });
    return result;
  }, [coords, isNewFormat]);

  const newFormatScale = useMemo(() => {
    if (!isNewFormat || !displaySize?.w) return null;
    const imgW = coords.image?.width;
    const imgH = coords.image?.height;
    if (!imgW || !imgH) return null;
    return { scaleX: displaySize.w / imgW, scaleY: displaySize.h / imgH };
  }, [coords, displaySize, isNewFormat]);

  // ══════════════════════════════════════════════════════════════════════════
  // FORMAT A — legacy word-level (unchanged logic)
  // ══════════════════════════════════════════════════════════════════════════

  const pageBBox = useMemo(() => {
    if (isNewFormat || !coords) return null;
    const vals = Object.values(coords);
    const minX = Math.min(...vals.map((b) => b.x));
    const minY = Math.min(...vals.map((b) => b.y));
    const maxX = Math.max(...vals.map((b) => b.x + b.w));
    const maxY = Math.max(...vals.map((b) => b.y + b.h));
    return { minX, minY, w: maxX - minX, h: maxY - minY };
  }, [coords, isNewFormat]);

  const scaleInfo = useMemo(() => {
    if (isNewFormat || !pageBBox || !displaySize?.w) return null;
    const sX = displaySize.w / pageBBox.w;
    const sY = displaySize.h / pageBBox.h;
    if (sY > sX) {
      const contentH = pageBBox.h * sX;
      let yOffset = displaySize.h - contentH;
      if (page === 1) yOffset += displaySize.h * 0.06;
      return { scaleX: sX, scaleY: sX, yOffset };
    }
    return { scaleX: sX, scaleY: sY, yOffset: 0 };
  }, [pageBBox, displaySize, page, isNewFormat]);

  const ayahLines = useMemo(() => {
    if (isNewFormat || !coords) return [];
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
  }, [coords, isNewFormat]);

  // ── Status reporting ──────────────────────────────────────────────────────
  useEffect(() => {
    const lines   = isNewFormat ? newFormatLines : ayahLines;
    const ayahCount = new Set(lines.map((l) => l.ayahKey)).size;
    const ayahKeys  = new Set(lines.map((l) => l.ayahKey));
    onStatus?.({
      coordsLoaded: !!coords,
      wordCount:    coords
        ? isNewFormat
          ? Object.values(coords.ayahs).reduce((n, boxes) => n + boxes.length, 0)
          : Object.keys(coords).length
        : null,
      ayahCount,
      ayahKeys,
      displayW: displaySize?.w,
      displayH: displaySize?.h,
      yOffset:  scaleInfo?.yOffset ?? 0,
    });
  }, [coords, ayahLines, newFormatLines, displaySize, scaleInfo, onStatus, isNewFormat]);

  // ── Render ────────────────────────────────────────────────────────────────
  const canRenderNew = isNewFormat && displaySize?.w && newFormatScale;
  const canRenderOld = !isNewFormat && coords && displaySize?.w && pageBBox && scaleInfo;

  return (
    <div className="wo-layer" ref={layerRef}>

      {/* FORMAT B — coord-gen ayah-level boxes */}
      {canRenderNew && newFormatLines.map(({ surah, ayah, displayAyah, ayahKey, lineKey, x, y, w, h }) => {
        const isHovered = hoveredAyah === ayahKey;
        const isPlaying = playingAyahKey?.has(ayahKey) ?? false;
        const { scaleX, scaleY } = newFormatScale;
        return (
          <div
            key={lineKey}
            className={[
              "wo-line",
              isPlaying ? "wo-line--playing" : "",
              isHovered ? "wo-line--hover"   : "",
              debug     ? "wo-line--debug"   : "",
            ].join(" ").trim()}
            style={{
              left:   x * scaleX,
              top:    y * scaleY,
              width:  w * scaleX,
              height: h * scaleY,
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

      {/* FORMAT A — legacy word-level boxes */}
      {canRenderOld && ayahLines.map(({ surah, ayah, displayAyah, ayahKey, lineKey, minX, maxX, y, h }) => {
        const isHovered = hoveredAyah === ayahKey;
        const isPlaying = playingAyahKey?.has(ayahKey) ?? false;
        const { scaleX, scaleY, yOffset } = scaleInfo;
        return (
          <div
            key={lineKey}
            className={[
              "wo-line",
              isPlaying ? "wo-line--playing" : "",
              isHovered ? "wo-line--hover"   : "",
              debug     ? "wo-line--debug"   : "",
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
