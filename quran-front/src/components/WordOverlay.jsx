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
      // Image has a surah-title header above the text area (no coords for header).
      // Use uniform X-scale for both axes + push boxes down by the header height.
      const contentH = pageBBox.h * sX;
      let yOffset = displaySize.h - contentH;

      // Page 1 special case: Surah Al-Fatiha's Bismillah (ayah 1:1) is rendered
      // in a large decorative font in the image — much taller than h=61 in the
      // coord data. This shifts every subsequent line downward in the image.
      // Add an empirical correction to compensate for the extra Bismillah height.
      if (page === 1) yOffset += displaySize.h * 0.06;

      return { scaleX: sX, scaleY: sX, yOffset };
    }
    // Normal case — independent scales, no vertical offset
    return { scaleX: sX, scaleY: sY, yOffset: 0 };
  }, [pageBBox, displaySize, page]);

  // ── Build per-LINE segments per ayah ─────────────────────────────────────
  //
  // Each entry in ayahLines:
  //   { surah, ayah, ayahKey, lineKey, minX, maxX, y, h, displayAyah }
  //
  // Words on the same line share the same y value, so grouping by y gives
  // the exact horizontal span of that ayah on that line.
  //
  // Numbering note — Surah 1 (Al-Fatiha):
  //   The coord JSON uses the digital standard: Bismillah = 1:1, Alhamdulillah = 1:2.
  //   The Hafizi Mushaf treats Bismillah as a decorative header (not a numbered ayah),
  //   so visually Alhamdulillah = Ayah 1.
  //   Fix: skip rendering a box for 1:1 (it's shown as a header image, not clickable text),
  //   and display 1:2 as "Ayah 1", 1:3 as "Ayah 2", etc. (displayAyah = ayah - 1).
  //   The internal ayah number (1:2, 1:3…) is kept unchanged for audio compatibility.
  const ayahLines = useMemo(() => {
    if (!coords) return [];

    // Step 1: build  ayahKey → lineY → [boxes]
    const ayahLineMap = {};
    Object.entries(coords).forEach(([key, box]) => {
      const [s, a] = key.split(":");
      // Skip Bismillah of Al-Fatiha — it's a decorative header in the Hafizi mushaf,
      // not a numbered ayah. It has no clickable overlay.
      if (s === "1" && a === "1") return;
      const ayahKey = `${s}:${a}`;
      if (!ayahLineMap[ayahKey]) ayahLineMap[ayahKey] = { surah: +s, ayah: +a, lines: {} };
      const lines = ayahLineMap[ayahKey].lines;
      if (!lines[box.y]) lines[box.y] = [];
      lines[box.y].push(box);
    });

    // Step 2: flatten into one entry per line-segment
    const result = [];
    Object.entries(ayahLineMap).forEach(([ayahKey, { surah, ayah, lines }]) => {
      // For Surah 1: coord ayah 2 = mushaf ayah 1, ayah 3 = mushaf ayah 2, etc.
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
      {canRender && ayahLines.map(({ surah, ayah, displayAyah, ayahKey, lineKey, minX, maxX, y, h }) => {
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
            title={debug ? `${surah}:${displayAyah}` : undefined}
            onMouseEnter={() => setHoveredAyah(ayahKey)}
            onMouseLeave={() => setHoveredAyah(null)}
            onClick={() => onAyahClick(surah, ayah, displayAyah)}
          />
        );
      })}
    </div>
  );
}
