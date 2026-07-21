/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * src/pages/index.ts — barrel re-export for tab page components.
 *
 * Import from here instead of individual page files:
 *
 *   import { WorkspaceTab } from "./pages";
 *
 * As new tabs are extracted from App.tsx, add their exports here.
 * The barrel keeps the import path clean and consistent.
 */

export { default as WorkspaceTab } from "./WorkspaceTab";
export { default as CrewTab } from "./CrewTab";
export { default as ResearchTab } from "./ResearchTab";
export { default as PartyTab } from "./PartyTab";
export { default as NewsTab } from "./NewsTab";
export { default as ScenariosTab } from "./ScenariosTab";
export { default as BbsTab } from "./BbsTab";
export { default as HistoryTab } from "./HistoryTab";
