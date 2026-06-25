/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tools barrel \u2014 void stubs marking where dev-only utilities live.
 *
 * These scripts are run from the project root and use the EventStore singleton
 * from /sim/events to inspect or replay. They are NOT bundled into the UI.
 *
 * Future concrete files:
 *   - replayDebugger.ts: step the EventStore forward, inspect diffs
 *   - eventInspector.ts: pretty-print filterable event timeline
 *   - graphVisualizer.ts: dump social graph to DOT/JSON for graphviz
 *   - bbsReplayViewer.ts: per-thread mutation/viral timeline
 */
export {};
