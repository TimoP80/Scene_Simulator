/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ModalPortal — shared wrapper for the standard centered-modal pattern.
 * Handles ESC-to-close, click-outside-to-close, consistent glass backdrop,
 * and Portal rendering to document.body.
 *
 * For non-standard modals (full-viewport like LogoGenerator, or inline
 * overlays like ShaderEditor), use the hook for state management but
 * render a custom backdrop — ModalPortal is optional.
 *
 * Usage:
 *
 *   <ModalPortal onClose={modal.close}>
 *     <div className="...">modal content</div>
 *   </ModalPortal>
 */

import React, { useEffect } from "react";
import { createPortal } from "react-dom";

interface ModalPortalProps {
  /** Called when the user clicks outside or presses ESC. */
  onClose: () => void;
  /** Modal content. */
  children: React.ReactNode;
  /**
   * Additional classes applied to the inner content wrapper.
   * The backdrop always has `fixed inset-0 z-50 flex items-center justify-center
   * bg-black/80 backdrop-blur-sm`.
   */
  className?: string;
  /**
   * If true, clicking the backdrop does NOT close the modal.
   * Default false. ESC always closes.
   */
  persistent?: boolean;
  /**
   * Override the id attribute on the backdrop div.
   * Useful for testing selectors.
   */
  id?: string;
}

export default function ModalPortal({
  onClose,
  children,
  className = "",
  persistent = false,
  id,
}: ModalPortalProps) {
  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <div
      id={id}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm font-mono animate-[fadeIn_200ms_ease-out]"
      onClick={persistent ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`animate-[scaleIn_200ms_cubic-bezier(0.16,1,0.3,1)] ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
