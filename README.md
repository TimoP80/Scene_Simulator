<img width="1536" height="1024" alt="ChatGPT Image 23 6 2026 klo 05 04 58" src="https://github.com/user-attachments/assets/fd2a7fa3-4fdc-4011-b535-ff984d7efc4f" />

# 🎛️ Demoscene Simulator
by T. Pitkänen

Itch.io page: https://timbor80.itch.io/demoscene-simulator

Initial project started with Google AI studio, further development made locally with other AI tools.

A **hybrid simulation + narrative system** that models a living demoscene ecosystem (1985–2005 era) using:

- Event sourcing as the core architecture
- Emergent social graph simulation
- BBS-driven information propagation
- Demo production pipelines
- Optional LLM-based narrative rendering layer

This project simulates the culture, drama, creativity, and technical evolution of the demoscene as a living system rather than a traditional management game.

## 📸 Screenshots & Captures

> v0.1.0 shipped with an SVG mockup of the in-game CRT demo screen. v0.2.0
> added a real `puppeteer-core` capture pipeline that renders the released
> `<DemoScreen>` against a hero effect preset (raster bars + starfield +
> plasma + pixel fire + vector cube + tunnel + sine scroller) and writes
> PNG + WebM + GIF under `build/`:

| Asset | Path | How to refresh |
| --- | --- | --- |
| Single-frame PNG | `build/preview.png` | `npm run capture:preview` |
| 6-second 30fps WebM | `build/preview.webm` | `npm run capture:preview` |
| 30-second 24fps GIF | `build/preview.gif` | `npm run capture:preview` (omit with `--no-gif`) |
| 1920x1080 hi-res PNG | `build/preview.png` (override width) | `npm run capture:preview:hi-res` |

Pre-requisites the capture script needs and your machine must provide:

1. **System Chrome** (the script does not bundle one). The script searches `CHROME_PATH` / `PUPPETEER_EXECUTABLE_PATH`, then the standard Windows / macOS / Linux install paths.
2. **`ffmpeg-static`** — auto-installed as a devDep (no system ffmpeg required). The pipeline uses it ONLY for the `webm → gif` palette-quantized pass; PNG + WebM emit even if ffmpeg is missing.

Capture bootstrap loads the React tree with `/?capture=1` so the headless pipeline bypasses `<ApiKeyBootstrap>` and `<MainMenu>`. See [`src/preview/CapturePreview.tsx`](src/preview/CapturePreview.tsx) for the hero preset and [`scripts/capture-preview.mjs`](scripts/capture-preview.mjs) for the orchestration layer.

---

## 🧠 Core Design Philosophy

This is not a game about making demos.

It is a simulation of a *scene that produces demos*.

Everything in the world emerges from:

> a deterministic event log + reactive simulation layers

There are no mutable “game objects”.

Everything is derived from history.

---

## 🏗️ Architecture Overview

### 🔥 Event Store (Source of Truth)

All simulation state is derived from an immutable event log.

Events include:

- BBS posts and replies
- NPC creation and interactions
- demo creation lifecycle
- party announcements and results
- reputation and relationship changes

Example event:

```ts
{
  type: "BbsPostCreated",
  actorId: "npc_12",
  payload: {
    threadId: "thread_5",
    content: "this intro is pure copper wizardry"
  }
}
```

## 🧾 Simulation Engine (Deterministic Core)

The simulation engine:

processes events
emits new events via reducers
never mutates state directly

Key systems:

NPC behavior model
demo production pipeline
reputation system
party/compo simulation
time progression

## 🧠 Social Graph System

The world is represented as a dynamic graph:

NPCs
demo groups
demos
tools
events

Edges include:

friendship
rivalry
influence
inspiration
collaboration

Graph changes are derived entirely from events.

## 💬 BBS System (Information Layer)

The BBS is a simulated information network:

threads
posts
replies
rumors
drama propagation

All BBS content is event-driven and replayable.

It functions as:

reputation amplifier
rumor network
social pressure system
historical archive

## ✍️ LLM Layer (Optional)

The LLM layer is used ONLY for:

rendering dialogue
formatting BBS posts
generating news articles
stylistic NPC communication

It does NOT influence:

game logic
relationships
scoring
simulation outcomes

Simulation is deterministic. Language is expressive.

## 🔁 Event Sourcing Model
Rules
The event log is immutable
State is always derived
No direct mutations allowed
Core operations:
appendEvent(event)
replayEvents()
buildProjections()

## 🧬 Projections

Derived views of the event log:

NPC Projection
traits
relationships
reputation
memory
BBS Projection
threads
posts
controversy level
engagement score
World Graph Projection
nodes (entities)
edges (relationships)
influence flow

## 🎮 Gameplay Loop
NPCs interact via BBS and scene events
Simulation engine processes events
New events are generated (reactions, consequences)
Graph and projections update
Player observes and influences via posts, demos, and participation
🕹️ Key Systems
🧑 NPC System

Each NPC has:

personality traits
technical skills
memory of events
evolving relationships

## 🧵 BBS System

Simulated forum network where:

posts propagate influence
drama emerges organically
reputation spreads socially

## 🎨 Demo System

Demos are produced via pipeline:

concept
development
optimization
release
competition entry

Outcomes are emergent, not scripted.

## 🏆 Party System

Events simulate demoscene gatherings:

competitions
networking
rivalry escalation
breakthroughs and releases

## 📂 Suggested Project Structure
/sim
  /events
    types.ts
    store.ts

  /engine
    simulationLoop.ts

  /reducers
    npcReducer.ts
    bbsReducer.ts
    graphReducer.ts

  /projections
    npcProjection.ts
    bbsProjection.ts
    worldGraph.ts

  /llm
    renderPost.ts
    renderNews.ts

/ui
  Electron + TypeScript frontend

/docs
  design notes and system evolution

## 🔄 Determinism Requirement

The simulation must be:

fully replayable from the event log

If all events are replayed in order, the world state must be identical.

## 🚧 Current Status
 Event-driven architecture defined
 BBS system implemented (basic)
 NPC interaction system in progress
 Full event sourcing enforcement
 Graph-based world model
 Demo production pipeline
 LLM integration (rendering only)

## 🎯 Long-Term Vision

A fully emergent simulation of:

demoscene culture
creative collaboration
technical innovation evolution
social reputation systems
event-driven storytelling

Where:

demos are not designed — they emerge from a living scene

##⚡ Design Principle Summary
Everything is an event
Nothing is directly edited
All state is derived
LLMs only render, never decide
The scene evolves through interaction, not scripting

## 🧪 License / Experimental Note

This project is experimental simulation software exploring:

event sourcing in game systems
emergent narrative design
AI-assisted storytelling layers
cultural simulation of digital subcultures
