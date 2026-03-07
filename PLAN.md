# Quran App — Complete Development Plan

## Current State (Done)
- Mushaf page images served from `public/mushaf/pages/{page}.png`
- Word-level coordinate overlays from `public/mushaf/coords/{page}.json`
- Clickable ayah highlights (per-line segments, not one big box)
- Ayah click reports surah + ayah number
- Page navigation (prev/next, go-to-page input)
- Debug mode toggle (shows overlay boxes + coord stats)
- Audio playback on ayah click (Alafasy_128kbps, offline files)
- Multiple reciter support (Alafasy + AbdullaahJuhaynee folders ready)
- Reciter selector in top bar
- Page 1 & 2 header offset correction (Bismillah decorative header handling)

---

## Phase 1 — Layout Redesign (Next)

### Goal
Two-panel layout. Quran page never shifts or jumps.

### Layout
```
+------------------+-----------------------------+
|                  |                             |
|   SIDEBAR        |      QURAN PAGE             |
|   (left panel)   |      (fixed viewport)       |
|                  |      image + overlay only   |
|                  |                             |
+------------------+-----------------------------+
```

- Sidebar is scrollable independently
- Page panel is fixed height = 100vh, nothing above or below
- Clicking an ayah updates sidebar info, page never moves
- Responsive: sidebar collapses to drawer on mobile

### Sidebar Contents
1. **Current Location Info**
   - Juz number (1–30)
   - Surah name (Arabic + English) + number
   - Ayah number (updates on click)
   - Page number / 610

2. **Navigation Controls**
   - Juz selector (dropdown, 1–30) → jumps to first page of that Juz
   - Surah selector (dropdown, 1–114 with names) → jumps to first page of that Surah
   - Ayah selector (number input, based on selected surah) → jumps to page containing that ayah
   - Page input (direct page number) → jumps to that page
   - Prev / Next page buttons

3. **Reciter Selector**

4. **Audio Player** (Phase 3)

5. **Bookmarks** (Phase 4)

6. **Translation Toggle** (Phase 5)

7. **Settings** (Phase 6) — theme, zoom, speed

---

## Phase 2 — Quran Metadata

### Data File: `src/data/quranMeta.js`

#### Contents
- `SURAHS` — array of 114 entries:
  ```js
  { number, nameAr, nameEn, startPage, ayahCount }
  ```
- `JUZS` — array of 30 entries:
  ```js
  { number, startPage, startSurah, startAyah }
  ```
- `PAGE_META` — array of 610 entries (derived):
  ```js
  { page, juz, surah, firstAyah }
  ```

#### Navigation Logic
- Select Juz N → `JUZS[N].startPage`
- Select Surah N → `SURAHS[N].startPage`
- Select Ayah A in Surah S → find page from coords or PAGE_META lookup
- All navigation just calls `goToPage(n)`

---

## Phase 3 — Audio Player

### Features
- Play / Pause button in sidebar
- Seek bar with current time / total duration
- Playback speed: 0.75x, 1x, 1.25x, 1.5x
- Loop single ayah toggle
- Auto-advance: when ayah finishes, play next ayah automatically
  - At end of page, auto-navigate to next page and continue
- Keyboard shortcut: Space = play/pause

### Highlighted Ayah While Playing
- The currently playing ayah stays highlighted (different color from hover)
- Highlight moves as audio auto-advances

### Audio State
- `playingAyah` state: `{ surah, ayah }` or null
- Separate from `clickedAyah` so clicking to select vs playing are independent

---

## Phase 4 — Bookmarks & Reading Progress

### Last Read
- On every page change, save page to `localStorage`
- On app load, offer "Continue from page X"

### Bookmarks
- Add/remove bookmark on current page (button in sidebar)
- Bookmarks list in sidebar — click to jump
- Stored in `localStorage` as array of `{ page, surah, ayah, label, date }`
- Max 50 bookmarks
- Optional: custom label/note per bookmark

---

## Phase 5 — Translation

### Layout Options
- **Option A**: Translation panel below the Quran page (resizable split)
- **Option B**: Translation shown in sidebar when ayah is clicked

### Implementation
- Translation data as static JSON files per surah (or a single bundled file)
- Support multiple languages: English, Urdu (at minimum)
- Language selector in sidebar
- Clicking ayah → shows that ayah's translation instantly
- Auto-scroll translation to current ayah

### Tafsir (optional, later)
- Short tafsir per ayah (Ibn Kathir summary or similar)
- Shown below translation on click

---

## Phase 6 — Visual Polish & Themes

### Themes
- Dark (current default)
- Light (white bg, dark text)
- Sepia (warm parchment tones)
- Theme saved to localStorage

### Page Display
- Zoom in / out on Quran page (10% steps, 70%–150%)
- Smooth page transition animation (fade or slide)
- Full-screen mode: hide sidebar, page takes full width (toggle with F or button)

### Sidebar
- Collapsible on desktop (icon-only mode)
- Slide-in drawer on mobile

---

## Phase 7 — Search

- Search by Surah name (Arabic or English)
- Search by page number
- Future: full-text ayah search (requires text data)

---

## Data Files Needed

| File | Purpose | Status |
|------|---------|--------|
| `public/mushaf/pages/{1-610}.png` | Page images | Done |
| `public/mushaf/coords/{1-610}.json` | Word coordinates | Done |
| `public/audio/Alafasy_128kbps/*.mp3` | Audio — Alafasy | Done |
| `public/audio/AbdullaahJuhaynee_128kbps/*.mp3` | Audio — Juhaynee | Folder ready, copy files |
| `src/data/quranMeta.js` | Juz/Surah/Page metadata | To build (Phase 2) |
| `src/data/translation_en.json` | English translation | To add (Phase 5) |
| `src/data/translation_ur.json` | Urdu translation | To add (Phase 5) |

---

## Component Structure (Target)

```
App
└── MushafViewer
    ├── Sidebar
    │   ├── LocationInfo       (Juz / Surah / Ayah / Page display)
    │   ├── Navigator          (dropdowns + inputs + prev/next)
    │   ├── ReciterSelector
    │   ├── AudioPlayer        (Phase 3)
    │   ├── BookmarkPanel      (Phase 4)
    │   └── TranslationPanel   (Phase 5)
    └── PagePanel
        ├── <img> (Quran page)
        └── WordOverlay (clickable ayah highlights)
```

---

## Build Order

| # | Phase | Description |
|---|-------|-------------|
| 1 | Layout | Two-panel layout, sidebar + fixed page panel |
| 2 | Metadata | quranMeta.js + Juz/Surah/Ayah navigation |
| 3 | Audio | Player UI, auto-advance, highlight playing ayah |
| 4 | Bookmarks | Last read + bookmark list |
| 5 | Translation | Ayah translation in sidebar |
| 6 | Polish | Themes, zoom, animations, full-screen |
| 7 | Search | Surah/page search |
