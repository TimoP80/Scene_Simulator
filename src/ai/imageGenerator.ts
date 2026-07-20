/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AI image generator for ArtSlide (Slide Show) productions.
 *
 * Uses the @google/genai SDK (v2.x) to call Gemini 2.0 Flash with
 * native image output. Each slide gets a carefully crafted prompt
 * based on its style, title, and the production name, producing
 * a demoscene-appropriate digital artwork.
 *
 * ARCHITECTURE:
 *   - `generateAiSlideImages()` is the public entry point — it takes
 *     the production's metadata + slide metadata, generates prompts
 *     for each slide, and calls Gemini sequentially (to avoid hitting
 *     per-project rate limits).
 *   - `generateSingleSlideImage()` wraps a single Gemini call.
 *   - The API key is retrieved via the Electron IPC bridge
 *     (`window.electronAPI?.getApiKey()`). In a plain browser context
 *     (Vite dev with no Electron), the user provides it through
 *     ApiKeyBootstrap — the key is stored in settings.json and read
 *     back via the bridge.
 *   - Images are returned as "data:image/png;base64,..." URLs that
 *     DemoScreen renders directly onto the CRT canvas.
 *
 * FALLBACK BEHAVIOUR:
 *   - If no API key is available, the function throws a descriptive
 *     error so the UI can show a "Set your Gemini API key" prompt.
 *   - If the API call fails (network, rate-limit, content-blocked),
 *     the error propagates up and the UI falls back to procedural
 *     slide rendering.
 *
 * SECURITY:
 *   The API key is never logged or exposed outside the Electron bridge.
 *   The Gemini SDK itself handles HTTPS transport; we pass the key
 *   directly to the constructor.
 */

import type { SlideStyle } from "../components/SlideShowRenderer";

// ---------------------------------------------------------------------------
// Style → visual description mapping (used to build image prompts)
// ---------------------------------------------------------------------------

const STYLE_VISUAL_DESCRIPTIONS: Record<SlideStyle, string> = {
  pixel_sunset:
    "a retro pixel art sunset landscape over a mountain range with a glowing gradient sun and twinkling stars, 8-bit style, vibrant warm colors",
  synthwave_retro:
    "a synthwave outrun style retro scene with a neon grid horizon, a large setting sun over geometric grid lines, and a car silhouette, 80s vaporwave aesthetic",
  geometric_mandala:
    "a colorful geometric mandala with concentric rotating polygon rings and radiating symmetry lines on a dark cosmic background, sacred geometry style",
  vector_portrait:
    "a minimalist wireframe vector portrait study of a human face with geometric features, glowing eyes, and a data-grid overlay, cyberpunk aesthetic",
  algorithmic_noise:
    "an abstract algorithmic noise field with voronoi cells, organic color regions, and glowing connection webs, generative art style",
  pixel_skull:
    "a pixel art human skull with glowing red eyes, gothic ornamental details, on a dark background, retro game over screen style",
  glitch_tunnel:
    "a psychedelic glitch art infinite tunnel with chromatic aberration, warped spiral patterns, and scanline distortion, VHS corruption aesthetic",
  hex_grid_pattern:
    "a glowing neon hex grid organic pattern with pulsating cells on a dark background, sci-fi HUD interface style",
  voxel_mountains:
    "a voxel-style mountain range at twilight with layered stepped terrain blocks, snow-capped peaks and a starry sky, Minecraft aesthetic",
  retro_space_scene:
    "a retro sci-fi deep space scene featuring a colorful ringed planet, distant stars, a glowing nebula, and a small spacecraft silhouette",
};

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

function buildSlidePrompt(
  demoName: string,
  slideTitle: string,
  style: SlideStyle,
  index: number,
): string {
  const visualDesc = STYLE_VISUAL_DESCRIPTIONS[style] ?? "digital artwork";

  return `Create a demoscene-style digital artwork titled "${slideTitle || `${demoName} Slide ${index + 1}`}" from the production "${demoName}".

The image should be: ${visualDesc}.

Art direction:
- Use vibrant, saturated retro colors (cyan, magenta, yellow, orange on dark/black backgrounds)
- High contrast, sharp edges, chunky pixels where appropriate
- Demoscene aesthetic: technical, minimalist yet visually striking
- No text, no logos, no watermarks
- Framing: full-bleed composition, no borders or margins
- Aspect ratio: 4:3 landscape

Output the image directly — no description, no commentary, just the picture.`;
}

// ---------------------------------------------------------------------------
// Gemini image generation
// ---------------------------------------------------------------------------

/**
 * Generate a single slide image via the Gemini API.
 *
 * @param apiKey - Gemini API key
 * @param prompt - The text prompt describing the image to generate
 * @returns A "data:image/png;base64,..." URL
 */
async function generateSingleSlideImage(
  apiKey: string,
  prompt: string,
): Promise<string> {
  // Dynamic import so tree-shaking doesn't pull the SDK into bundles
  // that never reach this code path. We also try-catch the import so
  // a missing @google/genai dependency doesn't crash the whole app.
  let GoogleGenAI: typeof import("@google/genai").GoogleGenAI;
  try {
    GoogleGenAI = (await import("@google/genai")).GoogleGenAI;
  } catch {
    throw new Error(
      "Failed to load @google/genai SDK. Ensure the dependency is installed.",
    );
  }

  const genAI = new GoogleGenAI({ apiKey });

  const response = await genAI.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
    config: {
      responseModalities: ["Text", "Image"],
    },
  });

  // Extract the image part from the response
  const candidate = response.candidates?.[0];
  if (!candidate) {
    throw new Error("Gemini returned no candidates for the slide image.");
  }

  const parts = candidate.content?.parts;
  if (!parts || parts.length === 0) {
    throw new Error("Gemini returned no content parts for the slide image.");
  }

  for (const part of parts) {
    if (part.inlineData && part.inlineData.data && part.inlineData.mimeType) {
      const { data, mimeType } = part.inlineData;
      return `data:${mimeType};base64,${data}`;
    }
  }

  // If the model returns text instead of an image, throw a helpful error
  const textParts = parts.filter((p) => p.text).map((p) => p.text);
  throw new Error(
    `Gemini did not generate an image for this prompt. ` +
      (textParts.length > 0
        ? `Model response: "${textParts[0]?.slice(0, 200)}"`
        : "The model returned neither image nor text data."),
  );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface AiSlideResult {
  index: number;
  dataUrl: string;
  style: SlideStyle;
  title: string;
  prompt: string;
}

/**
 * Generate all slide images for a Slide Show production.
 *
 * Images are generated SEQUENTIALLY (one at a time) to avoid hitting
 * Gemini's per-project QPS limit. Each slide receives a unique prompt
 * that incorporates its style, title, and the demo name.
 *
 * @param demoName           - Production name (used in prompts)
 * @param slideCount         - How many slides to generate
 * @param slideStyles        - Array of SlideStyle values, one per slide
 * @param slideTitles        - Array of display titles, one per slide
 * @param onProgress         - Optional callback called after each slide is generated (index, total)
 * @returns Array of AiSlideResult (index + dataUrl + style + title + prompt)
 */
export async function generateAiSlideImages(
  demoName: string,
  slideCount: number,
  slideStyles: SlideStyle[],
  slideTitles: string[],
  onProgress?: (current: number, total: number) => void,
): Promise<AiSlideResult[]> {
  // Retrieve API key
  const apiKey: string | null =
    typeof window !== "undefined" && window.electronAPI
      ? await window.electronAPI.getApiKey()
      : null;

  if (!apiKey) {
    throw new Error(
      "No Gemini API key found. Open Settings and enter your Gemini API key to enable AI image generation.",
    );
  }

  const results: AiSlideResult[] = [];

  for (let i = 0; i < slideCount; i++) {
    const style = slideStyles[i] ?? "retro_space_scene";
    const title = slideTitles[i] ?? `${demoName} Slide ${i + 1}`;
    const prompt = buildSlidePrompt(demoName, title, style, i);

    let dataUrl: string;
    try {
      dataUrl = await generateSingleSlideImage(apiKey, prompt);
    } catch (err) {
      // Wrap the error with slide context for better debugging
      throw new Error(
        `Failed to generate slide ${i + 1}/${slideCount} ("${title}"): ` +
          (err instanceof Error ? err.message : String(err)),
      );
    }

    results.push({ index: i, dataUrl, style, title, prompt });

    onProgress?.(i + 1, slideCount);
  }

  return results;
}

/**
 * Generate a set of preview prompts for each slide (without calling the API).
 * Useful for showing the user what the prompts will be before they commit
 * to generating images.
 */
export function previewSlidePrompts(
  demoName: string,
  slideStyles: SlideStyle[],
  slideTitles: string[],
): string[] {
  return slideStyles.map((style, i) => {
    const title = slideTitles[i] ?? `${demoName} Slide ${i + 1}`;
    return buildSlidePrompt(demoName, title, style, i);
  });
}
