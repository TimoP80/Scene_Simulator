#!/usr/bin/env python3
"""Wire the music player into App.tsx.

Steps:
  1. Add onOpenMusicLibrary + musicTrackCount props to the <MainMenu> element
     in the showMainMenu if-block.
  2. Wrap the <MainMenu /> in a fragment with <MusicPlayer /> + <PlaylistManager />
     so the floating player + modal are visible on the main menu too.
  3. Add <MusicPlayer /> + <PlaylistManager /> to the main app's return.
"""

import sys
from pathlib import Path

APP_TSX = Path("src/App.tsx")
src = APP_TSX.read_text(encoding="utf-8")
original = src

# ---- Step 1: add new props to <MainMenu> -----------------------------
# The MainMenu element's opening props are unique in the file; we
# anchor on the first prop and inject the two new ones right after
# the last existing one (schemaVersion={1}).
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
if old_mainmenu_open not in src:
    print(f"ABORT: MainMenu element anchor not found.", file=sys.stderr)
    sys.exit(1)
src = src.replace(old_mainmenu_open, new_mainmenu_open, 1)
print("  [OK]   Added onOpenMusicLibrary + musicTrackCount props to <MainMenu>")

# ---- Step 2: wrap showMainMenu return in fragment + player + modal ---
# The showMainMenu block now looks like:
#   if (showMainMenu) {
#     return (
#       <MainMenu ...new props... />
#     );
#   }
# We want to wrap the return content in a fragment with MusicPlayer + PlaylistManager.
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
if old_block not in src:
    print(f"ABORT: showMainMenu block not found after step 1.", file=sys.stderr)
    sys.exit(1)
src = src.replace(old_block, new_block, 1)
print("  [OK]   Wrapped showMainMenu return in fragment with <MusicPlayer> + <PlaylistManager>")

# ---- Step 3: add <MusicPlayer> + <PlaylistManager> to the main app ---
# The main app's return ends with a long JSX tree. We anchor on the
# very last `);` of the App component. But that's hard to match
# uniquely. Instead, we anchor on the closing </div> of the page
# wrapper — the line just before the final `);` of the return.
#
# From the file structure, the main return wraps the whole app in a
# <div className="min-h-screen ..."> ... </div>. The </div> + ); pair
# is unique because it's the outermost div.
#
# The safest anchor: find the last occurrence of
#   </div>\n    );\n  }\n}
# which is the closing of the App component's return + the component's
# closing brace. We insert the player + modal just before the final
# </div>.
#
# We use a marker: the last </div> before the final `  }` (end of App).
# To find it, we look for the pattern:
#   ...some content...\n        </div>\n      </div>\n    );\n  }\n}
# This is the end of the page wrapper.

# Simpler: anchor on the line just before the final `</div>` of the page
# wrapper. The page wrapper is <div className="min-h-screen bg-[#09090b] text-[#d4d4d8] ...">.
# We find the closing `</div>` that matches it by looking for the unique
# pattern: `    );\n  }\n}\n` (the return + function close) and insert before it.
final_close = "    );\n  }\n}\n"
if final_close not in src:
    print(f"ABORT: final_close marker not found.", file=sys.stderr)
    sys.exit(1)

player_modal = (
    '\n'
    '        {/* Floating music player + playlist modal — mounted at the\n'
    '            App root so the AudioContext + worklet survive navigation\n'
    '            between tabs. The modal is shared with the main menu via\n'
    '            the lifted showPlaylistModal state. */}\n'
    '        <MusicPlayer onOpenPlaylist={() => setShowPlaylistModal(true)} />\n'
    '        <PlaylistManager\n'
    '          open={showPlaylistModal}\n'
    '          onClose={() => setShowPlaylistModal(false)}\n'
    '        />\n'
)
src = src.replace(final_close, player_modal + final_close, 1)
print("  [OK]   Added <MusicPlayer> + <PlaylistManager> to the main app return")

# ---- Write back ------------------------------------------------------
if src == original:
    print("ABORT: no changes were made.", file=sys.stderr)
    sys.exit(1)
APP_TSX.write_text(src, encoding="utf-8")
print(f"\nAll edits applied. {len(src.splitlines())} lines total.")
