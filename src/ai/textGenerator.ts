/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LLM text generator — generates contextual demoscene text via the Gemini API.
 *
 * ARCHITECTURE:
 *   - `generateText()` is the single public entry point — takes a `TextGenRequest`
 *     and returns a `TextGenResult`.
 *   - Prompt templates are organized by `TextGenType` for each use case.
 *   - The API key is retrieved via the Electron IPC bridge (same as imageGenerator).
 *   - Falls back gracefully when no API key is available (returns a fallback string).
 *
 * TEXT TYPES:
 *   - `bbs_reply`        — A BBS thread reply in character
 *   - `judge_comment`    — A judge's comment on a demo production
 *   - `news_article`     — A short disk-magazine style news article
 *   - `npc_dialogue`     — An NPC dialogue line given their personality
 *   - `interview_answer` — An interview answer about a production
 *   - `scene_event`      — A living-world scene event description
 *
 * USAGE IN COMPONENTS:
 *   Components should use the `useTextGenerator` hook (see hooks/useTextGenerator.ts)
 *   for loading/error state management, not this module directly.
 *
 * SECURITY:
 *   Same as imageGenerator — API key is never logged, passed directly to the SDK.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The type of text to generate — each type has its own prompt template. */
export type TextGenType =
  | "bbs_reply"
  | "judge_comment"
  | "news_article"
  | "npc_dialogue"
  | "interview_answer"
  | "scene_event";

/**
 * Request to generate text.
 *
 * @property type - The type of text to generate.
 * @property context - Key-value pairs that fill the prompt template (varies by type).
 * @property maxTokens - Maximum tokens in the response (default 200).
 */
export interface TextGenRequest {
  type: TextGenType;
  context: Record<string, string>;
  maxTokens?: number;
}

/** Result from a successful text generation. */
export interface TextGenResult {
  text: string;
}

/** Result from a text generation that may have failed. */
export type TextGenOutcome =
  | { ok: true; result: TextGenResult }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Prompt templates
// ---------------------------------------------------------------------------

/**
 * Build a chat-style prompt for the Gemini model.
 * Each text type has a system instruction and a user prompt filled from context.
 */
function buildPrompt(request: TextGenRequest): string {
  switch (request.type) {
    case "bbs_reply": {
      const { board, topic, senderHandle, senderSpecialty, era, previousMessages, playerHandle } = request.context;
      return [
        `You are ${senderHandle}, a ${senderSpecialty || "demoscene"} enthusiast in the ${era || "1980s"} demoscene on the BBS board "${board}".`,
        `The thread topic is: "${topic}"`,
        previousMessages ? `Previous messages:\n${previousMessages}` : "",
        playerHandle ? `${playerHandle} has just joined the discussion.` : "",
        `Write a short BBS-style reply (2-4 sentences) in the voice of a ${era || "retro"} demoscener. Use period-appropriate jargon (copper, raster, tracker, blitter, SID, etc.). Be opinionated but authentic. Do NOT include any hashtags, emoji, or modern slang.`,
      ].filter(Boolean).join("\n");
    }

    case "judge_comment": {
      const { demoName, groupName, productionType, score, categories, partyName, year } = request.context;
      return [
        `You are a judge at the "${partyName || "demoparty"}" competition in ${year || "1992"}.`,
        `You are judging a ${productionType || "demo"} titled "${demoName}" by ${groupName || "a demo group"}.`,
        `The production scored ${score || "75"}/100 overall.`,
        categories ? `Category breakdown: ${categories}` : "",
        `Write 2-3 sentences of judge feedback. Be specific about what worked and what didn't. Mention technical details (effects, music, graphics, optimization) in demoscene style. Be critical but fair. The demoscene audience is technical and appreciates honest feedback.`,
      ].filter(Boolean).join("\n");
    }

    case "news_article": {
      const { headline, subject, event, location, year, month } = request.context;
      return [
        `Write a short disk-magazine style news article for the demoscene.`,
        `Headline: "${headline}"`,
        subject ? `Subject: ${subject}` : "",
        event ? `Event: ${event}` : "",
        location ? `Location: ${location}` : "",
        `Year: ${year || "1992"}, Month: ${month || "January"}`,
        `Write 4-6 sentences in the style of an underground scene disk-mag (like Hugi, Pain, or Imphobia). Be enthusiastic, use period-appropriate jargon, and include a strong opinion. End with a signature like "- Scene Reporter"`,
      ].filter(Boolean).join("\n");
    }

    case "npc_dialogue": {
      const { npcName, specialty, situation, mood, targetName, playerReputation } = request.context;
      return [
        `You are ${npcName}, a ${specialty || "scener"} in the demoscene.`,
        mood ? `Your mood: ${mood}` : "",
        situation ? `Situation: ${situation}` : "",
        targetName ? `Speaking to: ${targetName}` : "",
        playerReputation ? `The person you're addressing has a reputation of ${playerReputation}/100 in the scene.` : "",
        `Write 2-3 sentences of dialogue in the voice of your character. Use technical demoscene language appropriate to your specialty. Be concise and authentic to the demoscene subculture.`,
      ].filter(Boolean).join("\n");
    }

    case "interview_answer": {
      const { question, intervieweeName, intervieweeSpecialty, productionName, productionType, year } = request.context;
      return [
        `You are ${intervieweeName}, a ${intervieweeSpecialty || "demoscene coder"} being interviewed for a disk-magazine in ${year || "1993"}.`,
        `You recently released "${productionName}" (${productionType || "demo"}).`,
        `The interviewer asks: "${question}"`,
        `Write 3-5 sentences answering the question. Be passionate about the demoscene. Mention specific technical challenges, tools used (trackers, assemblers, paint programs), or creative decisions. Use authentic early-90s coder tone - confident, slightly rebellious, technically focused.`,
      ].filter(Boolean).join("\n");
    }

    case "scene_event": {
      const { eventType, groupName, rivalGroup, location, year, playerGroup } = request.context;
      const templates: Record<string, string> = {
        rival_release: [
          `Write a dramatic scene description about ${groupName || "a rival group"} releasing a new production in ${year || "1992"}.`,
          rivalGroup ? `Their main rival, ${rivalGroup}, is watching closely.` : "",
          playerGroup ? `${playerGroup} hears about this through the BBS network.` : "",
          `Describe the release, the reaction, and what it means for the scene. 2-3 sentences, dramatic but authentic demoscene tone.`,
        ].filter(Boolean).join("\n"),
        party: [
          `Describe the atmosphere at a demoparty in ${location || "Europe"} in ${year || "1992"}.`,
          groupName ? `${groupName} is attending with their latest production.` : "",
          `Capture the excitement, the hardware setup, the projector flicker, the smell of warm CRTs. 3-4 sentences, immersive and nostalgic.`,
        ].filter(Boolean).join("\n"),
        default: [
          `Describe a moment in the demoscene in ${year || "1992"}.`,
          groupName ? `${groupName} is involved.` : "",
          `Capture the atmosphere, the technology, and the creative energy. 2-3 sentences, period-appropriate.`,
        ].filter(Boolean).join("\n"),
      };
      return templates[eventType || "default"] || templates.default;
    }

    default:
      return `Write a short paragraph about the demoscene in 1992. Use period-appropriate language and technical jargon.`;
  }
}

// ---------------------------------------------------------------------------
// Core generation
// ---------------------------------------------------------------------------

/**
 * Generate text via the Gemini API.
 *
 * @param request - The generation request (type + context)
 * @param apiKey  - Gemini API key (optional — if omitted, falls back to window.electronAPI)
 * @returns TextGenOutcome — either ok with text, or failed with error message
 */
export async function generateText(
  request: TextGenRequest,
  apiKey?: string,
): Promise<TextGenOutcome> {
  // Resolve API key
  let key = apiKey;
  if (!key) {
    try {
      key =
        typeof window !== "undefined" && window.electronAPI
          ? await window.electronAPI.getApiKey()
          : null;
    } catch {
      key = null;
    }
  }

  if (!key) {
    return {
      ok: false,
      error:
        "No Gemini API key found. Open Settings and enter your Gemini API key to enable AI text generation.",
    };
  }

  // Build the prompt
  const prompt = buildPrompt(request);
  const maxTokens = request.maxTokens ?? 200;

  // Call Gemini
  try {
    let GoogleGenAI: typeof import("@google/genai").GoogleGenAI;
    try {
      GoogleGenAI = (await import("@google/genai")).GoogleGenAI;
    } catch {
      return {
        ok: false,
        error:
          "Failed to load @google/genai SDK. Ensure the dependency is installed.",
      };
    }

    const genAI = new GoogleGenAI({ apiKey: key });

    const response = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        maxOutputTokens: maxTokens,
        temperature: 0.85,
        topP: 0.95,
      },
    });

    const candidate = response.candidates?.[0];
    const text = candidate?.content?.parts?.map((p) => p.text).filter(Boolean).join("\n");

    if (!text || text.trim().length === 0) {
      return {
        ok: false,
        error: "Gemini returned an empty response. Try rephrasing the request.",
      };
    }

    return { ok: true, result: { text: text.trim() } };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `AI generation failed: ${message}` };
  }
}

/**
 * Check whether the Gemini API key is available.
 * Useful for UI to conditionally show AI-generation buttons.
 */
export async function hasAiKey(): Promise<boolean> {
  try {
    if (typeof window !== "undefined" && window.electronAPI) {
      return await window.electronAPI.hasApiKey();
    }
    return false;
  } catch {
    return false;
  }
}
