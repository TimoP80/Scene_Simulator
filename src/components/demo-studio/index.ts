/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * demo-studio barrel export — re-exports all Demo Studio components.
 */

export { default as DemoStudioModal } from "./DemoStudioModal";
export { default as DemoStudioSidebar } from "./DemoStudioSidebar";
export { default as SceneTimeline } from "./SceneTimeline";
export { default as BuildConsole } from "./BuildConsole";
export { default as PropertyInspector } from "./PropertyInspector";
export { useDemoStudio } from "./useDemoStudio";
export type { StudioSection, BuildStage, BuildStageInfo } from "./useDemoStudio";
