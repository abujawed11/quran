# Planned Features

---

## Feature: "Play from here" Mode Selection

### Summary
Currently "Play from here" (right-click context menu) always uses **ayah-by-ayah** mode — it loads individual ayah audio files and plays them sequentially. The user wants to be able to choose between two playback modes.

### Desired Behavior
Add a persistent UI control that lets the user select the playback mode used by "Play from here":

| Mode | Behavior |
|------|----------|
| **Ayah by Ayah** (current) | Plays individual ayah `.mp3` files one after another (`continuous` mode) |
| **Full Surah** (new) | Loads the full surah audio + timestamps, seeks to the clicked ayah's timestamp, plays from there with timestamp-based highlighting |

### How "Full Surah" mode would work for "Play from here"
1. User right-clicks ayah N in surah S → selects "Play from here"
2. `playFullSurah(S)` is called (same as "Play Full Surah" button)
3. After timestamps load, seek `audioRef.currentTime` to `timestamps[N].time`
4. Audio plays from ayah N with the usual highlight tracking

### Open Questions
- **Where should the UI control live?** Options:
  - Persistent toggle in the sidebar or player bar (set once, applies to all right-clicks)
  - Two separate context menu items: "Play from here (ayah by ayah)" and "Play from here (full surah)"
- **Should this mode also affect left-click on an ayah?** (Currently plays single ayah only)

### Files to Touch
- `src/components/MushafViewer.jsx` — add mode state + update `onPlayFrom` handler
- `src/components/AyahContextMenu.jsx` — possibly split into two menu items
- `src/components/Sidebar.jsx` — if adding a persistent toggle in the sidebar
- `src/components/AudioPlayer.jsx` — if adding toggle in the player bar

### Related
- `playFullSurah()` is already implemented in `MushafViewer.jsx`
- Timestamp files live in `public/timestamps/{surah}.json`
- The seek-to-ayah logic needs timestamps to be loaded first (async) — may need a `pendingSeekAyah` ref similar to `pendingAfterBismillah`













 Got it. Here's what I understand:                                                                                                                                                
                                                                                                                                                                                     Current behavior: "Play from here" always uses ayah-by-ayah mode (continuous) — plays one ayah, ends, loads next ayah audio, repeat.                                                                                                                                                                                                                                
  What you want: A UI control (toggle/radio/selector) that lets the user pick the mode for "Play from here":                                                                                                                                                                                                                                                          
  - Mode A — Ayah by Ayah (current): Plays individual ayah audio files sequentially
  - Mode B — Full Surah (new): Loads the full surah audio file + timestamps, seeks the audio to the timestamp of the clicked ayah, and plays from there with timestamp-based       
  highlighting

  So clicking "Play from here" on ayah 50 in Mode B would:
  1. Call playFullSurah(surah)
  2. Once audio + timestamps load, seek audioRef.current.currentTime to the timestamp of ayah 50
  3. Play from that point with the usual timestamp-based ayah highlighting

  The UI control would live somewhere persistent (sidebar or player bar) so the user sets it once and it applies to all "Play from here" right-clicks.

  Two questions before I implement:
  1. Where do you want the UI control? In the sidebar? Or in the right-click context menu itself (e.g., two separate options: "Play from here (ayah by ayah)" and "Play from here  
  (full surah)")?
  2. Should this mode also affect the regular left-click on an ayah (which currently plays single ayah)?

❯ yes..can u make a md file regarding this feature, we will do this later                                                                                                          
                                                                          
● Read 1 file (ctrl+o to expand)                                                                                                                                                   

● Write(FEATURES.md)                                                                                                                                                               
  ⎿  Wrote 39 lines to FEATURES.md                                                                                                                                                 
     # Planned Features                                                                                                                                                            
                                                                                                                                                                                        ---                                                                                                                                                                                                                                                                                                                                                              
     ## Feature: "Play from here" Mode Selection                                                                                                                                   

     ### Summary
     Currently "Play from here" (right-click context menu) always uses **ayah-by-ayah** mode — it loads individual ayah audio files and plays them sequentially. The user
     wants to be able to choose between two playback modes.

     ### Desired Behavior
     … +29 lines (ctrl+o to expand)

● Created D:/react/quran/FEATURES.md. It documents:

  - The two modes and their behavior                                                                                                                                                 - How the full surah seek would work step by step
  - Open questions (UI placement, left-click behavior)                                                                                                                             
  - All files that would need to be touched
  - A note about the pendingSeekAyah ref needed since timestamp loading is async

  We can pick it up anytime.

────────────────────────────────────────────────────────────────────