// src/components/AyahContextMenu.jsx
import { useEffect } from "react";
import { SURAHS } from "../data/quranMeta";

export default function AyahContextMenu({ menu, onPlaySingle, onPlayFrom, onClose }) {
  useEffect(() => {
    if (!menu) return;
    const onKey   = (e) => { if (e.key === "Escape") onClose(); };
    const onClick = () => onClose();
    document.addEventListener("keydown",   onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown",   onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  const { x, y, surah, ayah, displayAyah } = menu;
  const surahName = SURAHS[surah]?.nameEn ?? "";

  // Keep menu inside viewport
  const menuW = 210, menuH = 110;
  const left = Math.min(x, window.innerWidth  - menuW - 10);
  const top  = Math.min(y, window.innerHeight - menuH - 10);

  return (
    <div
      className="ctx-menu"
      style={{ left, top }}
      onMouseDown={(e) => e.stopPropagation()} // prevent closing when clicking inside
    >
      <div className="ctx-header">
        {surahName} &middot; Ayah {displayAyah}
      </div>
      <button
        className="ctx-item"
        onClick={() => { onPlaySingle(surah, ayah, displayAyah); onClose(); }}
      >
        ▶&nbsp;&nbsp;Play this Ayah
      </button>
      <button
        className="ctx-item"
        onClick={() => { onPlayFrom(surah, ayah, displayAyah); onClose(); }}
      >
        ▶▶&nbsp;Play from here
      </button>
    </div>
  );
}
