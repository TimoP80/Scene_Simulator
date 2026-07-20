/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useTextGenerator — React hook for components that need LLM-generated text.
 *
 * Manages loading/error/result state so components don't have to.
 * Components call `generate()` with a TextGenRequest and read the result
 * from the returned state.
 *
 * Usage:
 * ```tsx
 * const { generate, generating, result, error, clear } = useTextGenerator();
 *
 * return (
 *   <button onClick={() => generate({ type: "bbs_reply", context: {...} })}>
 *     {generating ? "Generating..." : "Ask AI"}
 *   </button>
 * );
 * ```
 */

import { useState, useCallback, useRef } from "react";
import { generateText, hasAiKey } from "../ai/textGenerator";
import type { TextGenRequest, TextGenResult, TextGenOutcome, TextGenType } from "../ai/textGenerator";

interface UseTextGeneratorState {
  generating: boolean;
  result: string | null;
  error: string | null;
  keyAvailable: boolean | null; // null = not yet checked
}

interface UseTextGeneratorReturn extends UseTextGeneratorState {
  /** Generate text. Resets previous result/error. Returns the outcome. */
  generate: (request: TextGenRequest) => Promise<TextGenOutcome>;
  /** Check whether an API key is configured. */
  checkKey: () => Promise<void>;
  /** Clear the current result and error. */
  clear: () => void;
}

export function useTextGenerator(): UseTextGeneratorReturn {
  const [state, setState] = useState<UseTextGeneratorState>({
    generating: false,
    result: null,
    error: null,
    keyAvailable: null,
  });
  const abortRef = useRef(false);

  const generate = useCallback(async (request: TextGenRequest): Promise<TextGenOutcome> => {
    abortRef.current = false;
    setState((prev) => ({ ...prev, generating: true, result: null, error: null }));

    const outcome = await generateText(request);

    if (abortRef.current) {
      return outcome; // don't update state if aborted
    }

    const isOk = outcome.ok;
    if (isOk) {
      setState((prev) => ({
        ...prev,
        generating: false,
        result: (outcome as { ok: true; result: TextGenResult }).result.text,
        error: null,
      }));
    } else {
      const errMsg = (outcome as { ok: false; error: string }).error;
      setState((prev) => ({
        ...prev,
        generating: false,
        result: null,
        error: errMsg,
      }));
    }

    return outcome;
  }, []);

  const checkKey = useCallback(async () => {
    const available = await hasAiKey();
    setState((prev) => ({ ...prev, keyAvailable: available }));
  }, []);

  const clear = useCallback(() => {
    abortRef.current = true;
    setState((prev) => ({ ...prev, generating: false, result: null, error: null }));
  }, []);

  return { ...state, generate, checkKey, clear };
}
