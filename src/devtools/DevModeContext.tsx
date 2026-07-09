/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DevModeContext — React context that exposes the dev mode flag and
 * a setter. The flag is initialized from:
 *   1. The `?dev=1` URL query string (for ad-hoc toggling)
 *   2. localStorage `devMode` ("true" / "false")
 *
 * Hidden during normal gameplay. The DevMenu component reads this
 * context and only renders when the flag is true.
 */

import React, { createContext, useContext, useEffect, useState } from "react";

interface DevModeContextValue {
  isDevMode: boolean;
  setDevMode: (next: boolean) => void;
}

const DevModeContext = createContext<DevModeContextValue>({
  isDevMode: false,
  setDevMode: () => {},
});

const STORAGE_KEY = "devMode";

function readInitial(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const url = new URLSearchParams(window.location.search);
    if (url.has("dev")) return url.get("dev") === "1";
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function DevModeProvider({ children }: { children: React.ReactNode }) {
  const [isDevMode, setIsDevMode] = useState<boolean>(readInitial);

  const setDevMode = (next: boolean) => {
    setIsDevMode(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "true" : "false");
    } catch {
      // localStorage may be unavailable (SSR, private mode); ignore.
    }
  };

  // Keep the URL in sync so reloads preserve the toggle.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (isDevMode) {
      url.searchParams.set("dev", "1");
    } else {
      url.searchParams.delete("dev");
    }
    window.history.replaceState({}, "", url.toString());
  }, [isDevMode]);

  return (
    <DevModeContext.Provider value={{ isDevMode, setDevMode }}>
      {children}
    </DevModeContext.Provider>
  );
}

export function useDevMode(): DevModeContextValue {
  return useContext(DevModeContext);
}
