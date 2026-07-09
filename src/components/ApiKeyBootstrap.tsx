/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * One-shot API-key bootstrap. Wraps the renderer subtree and either:
 *   - shows a centered "set your Gemini key" dialog (first launch, missing
 *     key, or when the user explicitly opens settings), OR
 *   - returns the children untouched.
 *
 * The key is persisted by the Electron main process at
 * `app.getPath('userData')/settings.json` and read back on next launch,
 * so the dialog only re-appears if the user clears the key.
 *
 * OUTSIDE ELECTRON (Vite dev, browser preview):
 *   `window.electronAPI` is absent, so the component returns children
 *   silently. The legacy env-injection flow keeps working as before.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Cpu, KeyRound, ShieldCheck, Sparkles } from 'lucide-react';
import { ElectronApi, isElectronHost } from '../electronApi';

type BootstrapState =
  | { kind: 'pending' }
  | { kind: 'no-host' }
  | { kind: 'needs-key' }
  | { kind: 'have-key' };

interface ApiKeyBootstrapProps {
  children: React.ReactNode;
}

export default function ApiKeyBootstrap({ children }: ApiKeyBootstrapProps) {
  const [state, setState] = useState<BootstrapState>(() =>
    isElectronHost() ? { kind: 'pending' } : { kind: 'no-host' }
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const api = (): ElectronApi | null =>
    typeof window !== 'undefined' ? window.electronAPI ?? null : null;

  // Probe whether a key already exists. We do this exactly once at mount
  // so we don't `setState` after unmount under StrictMode double-mount.
  useEffect(() => {
    let cancelled = false;
    const bridge = api();
    if (!bridge) {
      setState({ kind: 'no-host' });
      return;
    }
    void bridge
      .hasApiKey()
      .then((present) => {
        if (cancelled) return;
        setState(present ? { kind: 'have-key' } : { kind: 'needs-key' });
      })
      .catch(() => {
        if (cancelled) return;
        // Treat IPC failure as "no host" rather than blocking the app.
        // The renderer falls through to the no-key flow silently and
        // the user can still proceed in a Vite-only dev environment.
        setState({ kind: 'no-host' });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autofocus the input once the dialog becomes visible.
  useEffect(() => {
    if (state.kind !== 'needs-key') return;
    let raf = 0;
    raf = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [state.kind]);

  const submit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const trimmed = inputValue.trim();
      if (trimmed.length < 8) {
        setSubmitError('That key looks too short - paste the full Gemini API key.');
        return;
      }
      const bridge = api();
      if (!bridge) {
        setSubmitError('Electron host unavailable.');
        return;
      }
      setSubmitting(true);
      setSubmitError(null);
      try {
        await bridge.setApiKey(trimmed);
        setInputValue('');
        setState({ kind: 'have-key' });
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : String(err));
      } finally {
        setSubmitting(false);
      }
    },
    [inputValue]
  );

  const clear = useCallback(async () => {
    const bridge = api();
    if (!bridge) return;
    await bridge.clearApiKey();
    setInputValue('');
    setState({ kind: 'needs-key' });
  }, []);

  // No host (browser dev) or already-provisioned: render children.
  if (state.kind === 'no-host' || state.kind === 'have-key') {
    return <>{children}</>;
  }

  // First IPC round-trip in flight: don't pop a flash of content.
  if (state.kind === 'pending') {
    return (
      <div
        id="apikey-bootstrap-pending"
        className="fixed inset-0 z-[60] flex items-center justify-center bg-[#09090b] text-[#a1a1aa] font-mono text-xs tracking-widest"
      >
        <span className="animate-pulse">probing electron bridge\u2026</span>
      </div>
    );
  }

  // Needs key: render the dialog as a centered modal. We keep the rest
  // of the app paint below it (you can see the MainMenu) so first-time
  // users understand what's gated.
  return (
    <>
      {children}
      <div
        id="apikey-bootstrap-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="apikey-bootstrap-title"
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm font-mono"
      >
        <form
          onSubmit={submit}
          className="w-[min(480px,92vw)] flex flex-col gap-4 px-5 py-5 rounded border-2 border-[#22d3ee] bg-[#0c0c10]/95 shadow-[0_0_30px_rgba(34,211,238,0.45)]"
        >
          <div className="flex items-center gap-2 text-[#22d3ee] text-[11px] tracking-[0.35em] uppercase border-b border-[#22d3ee]/30 pb-2">
            <Cpu className="w-3.5 h-3.5" />
            <span className="font-bold">SETUP REQUIRED</span>
          </div>

          <h2
            id="apikey-bootstrap-title"
            className="text-[15px] font-bold text-[#22d3ee] tracking-[0.18em] uppercase"
          >
            Provide Gemini API Key
          </h2>

          <p className="text-[12px] leading-relaxed text-[#d4d4d8]">
            Demoscene Simulator bundles the <span className="text-[#fb923c]">@google/genai</span>{' '}
            SDK. Enter your personal Gemini API key once - the demo stores it in
            your local user profile (<code className="text-[#22d3ee]">userData/settings.json</code>) and{' '}
            prompts only again if you clear it.
          </p>

          <label htmlFor="apikey-bootstrap-input" className="flex flex-col gap-1.5">
            <span className="text-[10px] tracking-[0.3em] text-[#a1a1aa] uppercase font-bold flex items-center gap-1.5">
              <KeyRound className="w-3 h-3 text-[#22d3ee]" />
              Gemini API Key
            </span>
            <input
              id="apikey-bootstrap-input"
              ref={inputRef}
              type="password"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="AIza\u2026"
              autoComplete="off"
              spellCheck={false}
              disabled={submitting}
              aria-invalid={Boolean(submitError)}
              aria-describedby={submitError ? 'apikey-bootstrap-error' : undefined}
              className="bg-[#09090b] border border-[#3f3f46] focus:border-[#22d3ee] focus:outline-none focus:shadow-[0_0_8px_rgba(34,211,238,0.55)] text-[#22d3ee] text-[12px] font-mono px-3 py-2 rounded placeholder-[#3f3f46] disabled:opacity-50"
            />
            <span className="text-[9px] text-[#71717a] tracking-widest flex items-center gap-1.5 mt-1">
              <ShieldCheck className="w-3 h-3" />
              stored locally - never transmitted except to Google APIs
            </span>
          </label>

          {submitError && (
            <div
              id="apikey-bootstrap-error"
              role="alert"
              aria-live="polite"
              className="px-3 py-2 text-[11px] border border-[#ef4444] bg-[#ef4444]/15 text-[#fca5a5] rounded"
            >
              {'\u26a0 '}
              {submitError}
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              id="apikey-bootstrap-save"
              disabled={submitting || inputValue.trim().length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded border-2 border-[#22d3ee] bg-[#22d3ee]/15 hover:bg-[#22d3ee]/30 active:scale-[0.98] transition font-bold text-[12px] tracking-[0.22em] text-[#22d3ee] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{submitting ? 'SAVING\u2026' : 'SAVE & CONTINUE'}</span>
            </button>
          </div>

          <p className="text-[10px] text-[#71717a] leading-relaxed pt-1 border-t border-[#27272a]">
            Get a key at{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-[#22d3ee] hover:text-[#67e8f9] underline"
            >
              aistudio.google.com/apikey
            </a>
            . The simulator never logs the value; only the SDK consumes it.
            <br />
            <span className="text-[#71717a]">To change or clear an existing key, edit{' '}
            <code className="text-[#a1a1aa]">userData\settings.json</code> on disk and relaunch.</span>
          </p>
        </form>
      </div>
    </>
  );
}
