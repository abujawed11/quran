// src/components/WordOverlay.jsx
import { useEffect, useState, useRef, useMemo } from "react";

/**
 * Renders clickable ayah highlights as per-LINE segments.
 *
 * Instead of one big rectangle per ayah (which overlaps neighbouring ayahs
 * on shared lines), we group each ayah's words by their y-value (= one line)
 * and draw one box per line-segment. This gives a text-selection shape that
 * starts and ends exactly where the ayah text does.
 *
 * Hover state is tracked in JS so all line-segments of the same ayah
 * highlight together on mouse-over.
 */
export default function WordOverlay({ page, debug, onAyahClick, onStatus }) {
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
      .then((data) => {
        console.log(`[Overlay] page ${page} — ${Object.keys(data).length} words`);
        setCoords(data);
      })
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

  // ── Page bounding box (for coordinate normalisation) ──────────────────────
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
  // Normal pages (3+): image dimensions ≈ coord span → use independent scaleX/scaleY.
  //
  // Pages 1–2 (and any page whose image is proportionally TALLER than its
  // coord span): the image contains a surah-title header above the text area
  // that has no corresponding coords. Symptom: scaleY >> scaleX.
  //
  // Fix: use the X-axis scale uniformly for both axes, then push boxes down
  // by the leftover height (= the header's pixel height in the displayed image).
  const scaleInfo = useMemo(() => {
    if (!pageBBox || !displaySize?.w) return null;
    const sX = displaySize.w / pageBBox.w;
    const sY = displaySize.h / pageBBox.h;
    if (sY > sX) {
      // Image has header above text — uniform scale + top offset
      const contentH = pageBBox.h * sX;
      return { scaleX: sX, scaleY: sX, yOffset: displaySize.h - contentH };
    }
    // Normal case — independent scales, no vertical offset
    return { scaleX: sX, scaleY: sY, yOffset: 0 };
  }, [pageBBox, displaySize]);

  // ── Build per-LINE segments per ayah ─────────────────────────────────────
  //
  // Each entry in ayahLines:
  //   { surah, ayah, ayahKey, lineKey, minX, maxX, y, h }
  //
  // Words on the same line share the same y value, so grouping by y gives
  // the exact horizontal span of that ayah on that line.
  const ayahLines = useMemo(() => {
    if (!coords) return [];

    // Step 1: build  ayahKey → lineY → [boxes]
    const ayahLineMap = {};
    Object.entries(coords).forEach(([key, box]) => {
      const [s, a] = key.split(":");
      const ayahKey = `${s}:${a}`;
      if (!ayahLineMap[ayahKey]) ayahLineMap[ayahKey] = { surah: +s, ayah: +a, lines: {} };
      const lines = ayahLineMap[ayahKey].lines;
      if (!lines[box.y]) lines[box.y] = [];
      lines[box.y].push(box);
    });

    // Step 2: flatten into one entry per line-segment
    const result = [];
    Object.entries(ayahLineMap).forEach(([ayahKey, { surah, ayah, lines }]) => {
      Object.entries(lines).forEach(([yStr, boxes]) => {
        const y    = +yStr;
        const minX = Math.min(...boxes.map((b) => b.x));
        const maxX = Math.max(...boxes.map((b) => b.x + b.w));
        const h    = Math.max(...boxes.map((b) => b.h));
        result.push({ surah, ayah, ayahKey, lineKey: `${ayahKey}:${y}`, minX, maxX, y, h });
      });
    });

    return result;
  }, [coords]);

  // ── Status reporting ──────────────────────────────────────────────────────
  useEffect(() => {
    const ayahCount = new Set(ayahLines.map((l) => l.ayahKey)).size;
    onStatus?.({
      coordsLoaded: !!coords,
      wordCount:    coords ? Object.keys(coords).length : null,
      ayahCount,
      displayW: displaySize?.w,
      displayH: displaySize?.h,
      yOffset:  scaleInfo?.yOffset ?? 0,
    });
  }, [coords, ayahLines, displaySize, scaleInfo, onStatus]);

  const canRender = !!(coords && displaySize?.w && pageBBox && scaleInfo);

  return (
    <div className="wo-layer" ref={layerRef}>
      {canRender && ayahLines.map(({ surah, ayah, ayahKey, lineKey, minX, maxX, y, h }) => {
        const isHovered = hoveredAyah === ayahKey;
        const { scaleX, scaleY, yOffset } = scaleInfo;
        return (
          <div
            key={lineKey}
            className={[
              "wo-line",
              isHovered  ? "wo-line--hover" : "",
              debug      ? "wo-line--debug" : "",
            ].join(" ").trim()}
            style={{
              left:   (minX - pageBBox.minX) * scaleX,
              top:    (y    - pageBBox.minY) * scaleY + yOffset,
              width:  (maxX - minX)          * scaleX,
              height: h                      * scaleY,
            }}
            title={debug ? `${surah}:${ayah}` : undefined}
            onMouseEnter={() => setHoveredAyah(ayahKey)}
            onMouseLeave={() => setHoveredAyah(null)}
            onClick={() => {
              console.log("Ayah clicked →", { surah, ayah });
              onAyahClick(surah, ayah);

              // ── PHASE 3: trigger audio here ──────────────────────────────
              // surah and ayah are ready. Build the URL and play:
              //
              //   const url =
              //     `https://everyayah.com/data/Husary_128kbps/` +
              //     `${String(surah).padStart(3,'0')}${String(ayah).padStart(3,'0')}.mp3`;
              //   audioRef.current.pause();
              //   audioRef.current.src = url;
              //   audioRef.current.play();
              // ─────────────────────────────────────────────────────────────
            }}
          />
        );
      })}
    </div>
  );
}
