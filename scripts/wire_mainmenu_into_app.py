#!/usr/bin/env python3
"""
One-shot surgical edits to wire MainMenu into src/App.tsx.

Source-fix version (this turn). The two latent anchor bugs were:
  - Step 3 used to anchor on a 4-space-indent inner line, landing handlers
    INSIDE the autosave-hydration useEffect's closure. The handlers were
    then invisible to the early-return block (App body scope).
  - Step 5 used to anchor on `<div className="min-h-screen ...">` which is
    INSIDE App's `return (...)`, so the early-return landed inside a JSX
    expression and broke syntax.

The new anchors are stable single/dual-line text patterns that match lines
OUTSIDE the JSX expression, on App's body scope:
  - Step 3: the autosave useEffect's OPEN + the line that contains
    `const raw = localStorage.getItem("demoscene_sim_autosave");` — so
    mode="before" places handlers on App's body scope, ABOVE the useEffect.
  - Step 5: a single line `  return (` — likely unique in App.tsx (only
    the App function's main return). mode="before" places the early-return
    guard ABOVE App's `return (` open, on App's body scope, NOT inside
    a JSX expression.

Uses sentinel comments so the script is idempotent (re-runs abort).
"""
from __future__ import annotations
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / "src" / "App.tsx"

# Anchor -> payload table (anchor_raw, mode, payload).
EDIT_PLAN: list[tuple[str, str, str]] = []


# -------------------------------------------------------------------- step 1
# Add MainMenu import right after the SocialGraphTab import line.
EDIT_PLAN.append((
    'import SocialGraphTab from "./components/SocialGraphTab";',
    "after",
    '\nimport MainMenu from "./components/MainMenu";',
))


# -------------------------------------------------------------------- step 2
# Add the splash overlay state right after the playerGroupName decl.
EDIT_PLAN.append((
    'const [playerGroupName, setPlayerGroupName] = useState<string>("Tricycle Crews");',
    "after",
    (
        '\n\n'
        "  // ----- Main-menu / identity-setup splash overlay -----\n"
        "  // True on mount so NEW GAME always prompts the player for a scener\n"
        "  // handle + crew group name. Continue / Load-from-file auto-dismiss\n"
        "  // via the autosave-hydration effect further down.\n"
        "  const [showMainMenu, setShowMainMenu] = useState<boolean>(true);\n"
        "  // Snapshot of the localStorage autosave so MainMenu can show a\n"
        "  // one-line summary next to its Continue button.\n"
        "  const [mainMenuSaveInfo, setMainMenuSaveInfo] = useState<\n"
        "    { timestamp: string; summary: string } | null\n"
        "  >(null);\n"
    ),
))


# -------------------------------------------------------------------- step 3
# Inject MainMenu handlers on App's BODY scope (NOT inside the autosave-
# hydration useEffect's closure). The two-line anchor matches the
# useEffect's OPEN plus its first body line. With mode="before" the
# handlers block lands BEFORE the useEffect closure, on App's body
# scope, alongside other top-level const handlers.
EDIT_PLAN.append((
    '  useEffect(() => {\n    const raw = localStorage.getItem("demoscene_sim_autosave");',
    "before",
    (
        "  // --------- MAIN-MENU HANDLERS ---------\n"
        "  // New Game: dismiss splash and apply the player-supplied identity.\n"
        "  const handleNewGame = (handle: string, groupName: string) => {\n"
        "    setPlayerHandle(handle);\n"
        "    setPlayerGroupName(groupName);\n"
        "    setShowMainMenu(false);\n"
        "  };\n"
        "\n"
        "  // Continue: dismiss splash -- the autosave-hydration effect below\n"
        "  // already populated state from localStorage on mount.\n"
        "  const handleContinue = () => {\n"
        "    setShowMainMenu(false);\n"
        "  };\n"
        "\n"
        "  // Load from file: stash the parsed snapshot under the same key the\n"
        "  // hydration effect reads from, so the existing setter sequence\n"
        "  // can re-apply it. If localStorage write fails (private mode) we\n"
        "  // still dismiss the splash so the user isn't trapped on it.\n"
        "  const handleLoadFromFile = (snapshot: unknown) => {\n"
        "    try {\n"
        "      if (snapshot && typeof snapshot === \"object\") {\n"
        "        localStorage.setItem(\n"
        "          \"demoscene_sim_autosave\",\n"
        "          JSON.stringify(snapshot)\n"
        "        );\n"
        "      }\n"
        "    } catch {\n"
        "      // localStorage unavailable; fall through with splash dismissal.\n"
        "    }\n"
        "    setShowMainMenu(false);\n"
        "  };\n"
        "\n"
    ),
))


# -------------------------------------------------------------------- step 4
# Inside the autosave-hydration useEffect, populate mainMenuSaveInfo so
# MainMenu can display the Continue button with the correct summary, and
# auto-dismiss the splash when a save exists.
EDIT_PLAN.append((
    'setSaveNotice("Autosave Loaded Successfully!");',
    "after",
    (
        "\n"
        "      try {\n"
        "        const parsed = JSON.parse(raw);\n"
        "        const handle =\n"
        "          (parsed && typeof parsed === \"object\" && (parsed as Record<string, unknown>).playerHandle) || \"AssemblyKid\";\n"
        "        const group =\n"
        "          (parsed && typeof parsed === \"object\" && (parsed as Record<string, unknown>).playerGroupName) || \"Tricycle Crews\";\n"
        "        const year =\n"
        "          (parsed && typeof parsed === \"object\" && (parsed as Record<string, unknown>).currentYear) || 1985;\n"
        "        const month =\n"
        "          (parsed && typeof parsed === \"object\" && (parsed as Record<string, unknown>).currentMonth) || 1;\n"
        "        setMainMenuSaveInfo({\n"
        "          summary: `${group} \u00b7 ${year}/${String(month).padStart(2, \"0\")} \u00b7 ${handle}`,\n"
        "          timestamp: new Date().toISOString(),\n"
        "        });\n"
        "        setShowMainMenu(false);\n"
        "      } catch {\n"
        "        // Best-effort parse; if parse fails, MainMenu still\n"
        "        // renders with hasLocalSave=false and the splash stays up.\n"
        "      }\n"
    ),
))


# -------------------------------------------------------------------- step 5
# Mount <MainMenu /> via an early-return guard before App's main JSX
# render. Anchor on the SINGLE line `--return (` (2-space indent). A
# App-body-level return is rare; this anchor matches exactly once in
# App.tsx (App's main return). mode="before" inserts the if/return block
# ABOVE `return (`, on App's body scope, NOT inside any JSX expression.
EDIT_PLAN.append((
    '  return (',
    "before",
    (
        "  // Short-circuit: if the splash overlay is active, render only\n"
        "  // the MainMenu and exit early. The handlers above (handleNewGame,\n"
        "  // handleContinue, handleLoadFromFile) control showMainMenu.\n"
        "  if (showMainMenu) {\n"
        "    return (\n"
        "      <MainMenu\n"
        "        hasLocalSave={mainMenuSaveInfo !== null}\n"
        "        localSaveTimestamp={mainMenuSaveInfo?.timestamp ?? null}\n"
        "        localSaveSummary={mainMenuSaveInfo?.summary ?? null}\n"
        "        onNewGame={handleNewGame}\n"
        "        onContinue={handleContinue}\n"
        "        onLoadFromFile={handleLoadFromFile}\n"
        "        schemaVersion={1}\n"
        "      />\n"
        "    );\n"
        "  }\n"
        "\n"
        "  "
    ),
))


# Idempotency sentinels: if any of these strings are already present in
# App.tsx we abort so a re-run doesn't double-insert.
SENTINELS = [
    "// --------- MAIN-MENU HANDLERS ---------",
    "// ----- Main-menu / identity-setup splash overlay -----",
]


def main() -> int:
    if not APP.exists():
        print(f"ABORT: {APP} not found", file=sys.stderr)
        return 1
    original = APP.read_text(encoding="utf-8")

    # Idempotency check
    for sentinel in SENTINELS:
        if sentinel in original:
            print(
                f"ABORT: sentinel already present in {APP}: {sentinel!r}",
                file=sys.stderr,
            )
            return 1

    updated = original
    for i, (anchor, mode, payload) in enumerate(EDIT_PLAN, 1):
        if mode == "after":
            idx = updated.find(anchor)
            if idx < 0:
                print(
                    f"ABORT: step {i} could not find anchor: {anchor[:80]!r}",
                    file=sys.stderr,
                )
                return 1
            insert_at = idx + len(anchor)
            if updated[insert_at:insert_at + 1] == "\n":
                insert_at += 1
            updated = updated[:insert_at] + payload + updated[insert_at:]
        elif mode == "before":
            idx = updated.find(anchor)
            if idx < 0:
                print(
                    f"ABORT: step {i} could not find anchor: {anchor[:80]!r}",
                    file=sys.stderr,
                )
                return 1
            updated = updated[:idx] + payload + updated[idx:]
        elif mode == "replace":
            if anchor not in updated:
                print(
                    f"ABORT: step {i} could not find anchor: {anchor[:80]!r}",
                    file=sys.stderr,
                )
                return 1
            updated = updated.replace(anchor, payload, 1)
        else:
            print(f"ABORT: step {i} has unknown mode {mode!r}", file=sys.stderr)
            return 1

    if updated == original:
        print("ABORT: produced no change -- anchors may have drifted", file=sys.stderr)
        return 1

    APP.write_text(updated, encoding="utf-8")
    print(f"OK: wrote {APP} (now {len(updated):,} chars, was {len(original):,})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
