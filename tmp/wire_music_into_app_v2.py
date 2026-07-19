#!/usr/bin/env python3
"""Wire the music player into App.tsx — fixed version.

The previous script failed because the App component's closing
indentation is 2 spaces (`  );`) not 4. This script uses a more
robust anchor: the last `<footer>` element, which is unique in
the file. We insert the MusicPlayer + PlaylistManager right
before the footer (so they render at the same nesting level as
the main content, but the modal portals to document.body so z-index
isn't an issue).
"""

import sys
from pathlib import Path

APP_TSX = Path("src/App.tsx")
src = APP_TSX.read_text(encoding="utf-8")
original = src

# ---- Step 1: add new props to <MainMenu> (if not already done) ----
old_mainmenu_open = (
    '      <MainMenu\n'
    '        hasLocalSave={mainMenuSaveInfo !== null}\n'
    '        localSaveTimestamp={mainMenuSaveInfo?.timestamp ?? null}\n'
    '        localSaveSummary={mainMenuSaveInfo?.summary ?? null}\n'
    '        onNewGame={handleNewGame}\n'
    '        onContinue={handleContinue}\n'
    '        onLoadFromFile={handleLoadFromFile}\n'
    '        schemaVersion={1}\n'
    '      />'
)
new_mainmenu_open = (
    '      <MainMenu\n'
    '        hasLocalSave={mainMenuSaveInfo !== null}\n'
    '        localSaveTimestamp={mainMenuSaveInfo?.timestamp ?? null}\n'
    '        localSaveSummary={mainMenuSaveInfo?.summary ?? null}\n'
    '        onNewGame={handleNewGame}\n'
    '        onContinue={handleContinue}\n'
    '        onLoadFromFile={handleLoadFromFile}\n'
    '        schemaVersion={1}\n'
    '        onOpenMusicLibrary={() => setShowPlaylistModal(true)}\n'
    '        musicTrackCount={playerState.playlist.length}\n'
    '      />'
)
if old_mainmenu_open in src:
    src = src.replace(old_mainmenu_open, new_mainmenu_open, 1)
    print("  [OK]   Added onOpenMusicLibrary + musicTrackCount props to <MainMenu>")
else:
    print("  [SKIP] <MainMenu> already has new props (step 1)")

# ---- Step 2: wrap showMainMenu return in fragment + player + modal ---
old_block = (
    '  if (showMainMenu) {\n'
    '    return (\n'
    '      <MainMenu\n'
    '        hasLocalSave={mainMenuSaveInfo !== null}\n'
    '        localSaveTimestamp={mainMenuSaveInfo?.timestamp ?? null}\n'
    '        localSaveSummary={mainMenuSaveInfo?.summary ?? null}\n'
    '        onNewGame={handleNewGame}\n'
    '        onContinue={handleContinue}\n'
    '        onLoadFromFile={handleLoadFromFile}\n'
    '        schemaVersion={1}\n'
    '        onOpenMusicLibrary={() => setShowPlaylistModal(true)}\n'
    '        musicTrackCount={playerState.playlist.length}\n'
    '      />\n'
    '    );\n'
    '  }'
)
new_block = (
    '  if (showMainMenu) {\n'
    '    return (\n'
    '      <>\n'
    '        <MainMenu\n'
    '          hasLocalSave={mainMenuSaveInfo !== null}\n'
    '          localSaveTimestamp={mainMenuSaveInfo?.timestamp ?? null}\n'
    '          localSaveSummary={mainMenuSaveInfo?.summary ?? null}\n'
    '          onNewGame={handleNewGame}\n'
    '          onContinue={handleContinue}\n'
    '          onLoadFromFile={handleLoadFromFile}\n'
    '          schemaVersion={1}\n'
    '          onOpenMusicLibrary={() => setShowPlaylistModal(true)}\n'
    '          musicTrackCount={playerState.playlist.length}\n'
    '        />\n'
    '        <MusicPlayer onOpenPlaylist={() => setShowPlaylistModal(true)} />\n'
    '        <PlaylistManager\n'
    '          open={showPlaylistModal}\n'
    '          onClose={() => setShowPlaylistModal(false)}\n'
    '        />\n'
    '      </>\n'
    '    );\n'
    '  }'
)
if old_block in src:
    src = src.replace(old_block, new_block, 1)
    print("  [OK]   Wrapped showMainMenu return in fragment with <MusicPlayer> + <PlaylistManager>")
else:
    print("  [SKIP] showMainMenu already wrapped (step 2)")

# ---- Step 3: add <MusicPlayer> + <PlaylistManager> to the main app ---
# Anchor on the unique footer element. We insert the player + modal
# right before it so they render at the same nesting level as the
# main content. The MusicPlayer uses `fixed bottom-0` so it
# positions at the viewport bottom regardless of tree position;
# the PlaylistManager portals to document.body via createPortal.
footer_anchor = '      {/* Footer credits and references */}\n'
player_modal = (
    '      {/* Floating music player + playlist modal — mounted at the\n'
    '          App root so the AudioContext + worklet survive navigation\n'
    '          between tabs. The modal is shared with the main menu via\n'
    '          the lifted showPlaylistModal state. */}\n'
    '      <MusicPlayer onOpenPlaylist={() => setShowPlaylistModal(true)} />\n'
    '      <PlaylistManager\n'
    '        open={showPlaylistModal}\n'
    '        onClose={() => setShowPlaylistModal(false)}\n'
    '      />\n'
    '\n'
    '      {/* Footer credits and references */}\n'
)
if footer_anchor in src:
    src = src.replace(footer_anchor, player_modal, 1)
    print("  [OK]   Added <MusicPlayer> + <PlaylistManager> to the main app return")
else:
    print("ABORT: footer anchor not found — main app wiring skipped.", file=sys.stderr)
    sys.exit(1)

# ---- Write back ------------------------------------------------------
if src == original:
    print("\nNo changes were made.")
    sys.exit(0)
APP_TSX.write_text(src, encoding="utf-8")
print(f"\nAll edits applied. {len(src.splitlines())} lines total.")
