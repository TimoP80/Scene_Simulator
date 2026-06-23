# 🎛️ Demoscene Simulator

A **hybrid simulation + narrative system** that models a living demoscene ecosystem (1985–2005 era) using:

- Event sourcing as the core architecture
- Emergent social graph simulation
- BBS-driven information propagation
- Demo production pipelines
- Optional LLM-based narrative rendering layer

This project simulates the culture, drama, creativity, and technical evolution of the demoscene as a living system rather than a traditional management game.

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
