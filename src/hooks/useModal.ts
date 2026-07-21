/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useModal — single-hook replacement for 7 independent boolean + setState
 * pairs. Consolidates all modal open/close state into one `activeModal`
 * string, reducing boilerplate and preventing state-drift bugs.
 *
 * Usage:
 *
 *   const modal = useModal();
 *
 *   // Open a modal:
 *   modal.open("settings")
 *
 *   // Close the current modal (no-op if already closed):
 *   modal.close()
 *
 *   // Check if a specific modal is open:
 *   modal.isOpen("settings")
 *
 *   // Get the current modal id (null when closed):
 *   modal.activeModal
 *
 * Convenience wrappers are provided for the 7 modals used across the app:
 *
 *   modal.openSettings()
 *   modal.openLogoGen()
 *   modal.openPlaylist()
 *   modal.openDemoSummary()
 *   modal.openEffectGallery()
 *   modal.openShader()
 *   modal.openCompilingOverlay()
 *
 * These are used when passing open-callbacks down to child components
 * that don't need to know the modal ID.
 */

import { useCallback, useState } from "react";

export type ModalId =
  | "settings"
  | "logoGen"
  | "playlist"
  | "demoSummary"
  | "effectGallery"
  | "shader"
  | "compilingOverlay"
  | "monthlySummary";

export function useModal() {
  const [activeModal, setActiveModal] = useState<ModalId | null>(null);

  const open = useCallback((id: ModalId) => setActiveModal(id), []);
  const close = useCallback(() => setActiveModal(null), []);

  const isOpen = useCallback(
    (id: ModalId) => activeModal === id,
    [activeModal],
  );

  // Convenience wrappers for prop-passing to child components.
  // These avoid requiring the child to know the ModalId type.
  const openSettings = useCallback(() => setActiveModal("settings"), []);
  const openLogoGen = useCallback(() => setActiveModal("logoGen"), []);
  const openPlaylist = useCallback(() => setActiveModal("playlist"), []);
  const openDemoSummary = useCallback(() => setActiveModal("demoSummary"), []);
  const openEffectGallery = useCallback(
    () => setActiveModal("effectGallery"),
    [],
  );
  const openShader = useCallback(
    () => setActiveModal("shader"),
    [],
  );
  const openCompilingOverlay = useCallback(
    () => setActiveModal("compilingOverlay"),
    [],
  );

  return {
    /** Current modal name, or null when closed. */
    activeModal,
    /** Open a modal by id. */
    open,
    /** Close the current modal. */
    close,
    /** Check if a specific modal is open. */
    isOpen,
    /** Convenience: open("settings") */
    openSettings,
    /** Convenience: open("logoGen") */
    openLogoGen,
    /** Convenience: open("playlist") */
    openPlaylist,
    /** Convenience: open("demoSummary") */
    openDemoSummary,
    /** Convenience: open("effectGallery") */
    openEffectGallery,
    /** Convenience: open("shader") */
    openShader,
    /** Convenience: open("compilingOverlay") */
    openCompilingOverlay,
  } as const;
}
