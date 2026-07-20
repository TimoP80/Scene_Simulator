/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ShaderEditor — code editor for writing custom procedural shaders.
 * Users write in the shader DSL and see a live preview render.
 *
 * Features:
 *   - Syntax-highlighted code editor (built-in, no external dep)
 *   - Live preview canvas rendering the shader in real-time
 *   - Error display for compilation issues
 *   - Save/delete/rename shader management
 *   - Example shader gallery to get started
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import {
  Code,
  Play,
  Save,
  Trash2,
  Plus,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import type { CustomShader } from "@packages/types";
import {
  compileShader,
  estimateShaderComplexity,
  estimateShaderVisualImpact,
  DEFAULT_SHADER_CODE,
  TUNNEL_SHADER_CODE,
  type ShaderFn,
} from "@sim/utils/shaderEngine";

interface ShaderEditorProps {
  /** All custom shaders the user has created. */
  shaders: Record<string, CustomShader>;
  /** Save a new or updated shader. */
  onSaveShader: (shader: CustomShader) => void;
  /** Delete a shader by id. */
  onDeleteShader: (id: string) => void;
  /** IDs of shaders currently selected in the demo. */
  selectedShaderIds: string[];
  /** Toggle a shader effect on/off (like toggling a demo effect). */
  onToggleShader: (id: string) => void;
  /** Close the editor modal. */
  onClose: () => void;
}

export default function ShaderEditor({
  shaders,
  onSaveShader,
  onDeleteShader,
  selectedShaderIds,
  onToggleShader,
  onClose,
}: ShaderEditorProps) {
  const [activeShaderId, setActiveShaderId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [compileError, setCompileError] = useState<string | null>(null);
  const [isPreviewRunning, setIsPreviewRunning] = useState(true);
  const [showExamples, setShowExamples] = useState(false);

  const previewRef = useRef<HTMLCanvasElement | null>(null);
  const shaderFnRef = useRef<ShaderFn | null>(null);
  const frameRef = useRef(0);
  const animRef = useRef<number>(0);

  // Current shader list sorted by updatedAt
  const shaderList = useMemo(
    () => Object.values(shaders).sort((a, b) => b.updatedAt - a.updatedAt),
    [shaders]
  );

  // Select first shader by default
  useEffect(() => {
    if (!activeShaderId && shaderList.length > 0) {
      selectShader(shaderList[0].id);
    }
  }, [shaderList]);

  const selectShader = useCallback((id: string) => {
    const shader = shaders[id];
    if (!shader) return;
    setActiveShaderId(id);
    setEditCode(shader.code);
    setEditName(shader.name);
    setEditDescription(shader.description);
    setCompileError(null);
  }, [shaders]);

  // Compile on code change
  useEffect(() => {
    if (!editCode) return;
    const result = compileShader(editCode);
    if (typeof result === "string") {
      setCompileError(result);
      shaderFnRef.current = null;
    } else {
      setCompileError(null);
      shaderFnRef.current = result;
    }
  }, [editCode]);

  // Preview animation loop
  useEffect(() => {
    if (!isPreviewRunning || !previewRef.current) return;
    const canvas = previewRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const run = () => {
      if (!isPreviewRunning) return;
      const fn = shaderFnRef.current;
      if (fn) {
        try {
          fn(ctx, canvas.width, canvas.height, frameRef.current++);
        } catch (err) {
          // Silently handle runtime errors in preview
        }
      } else {
        // Fallback: show checkerboard
        ctx.fillStyle = "#111";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#222";
        for (let x = 0; x < canvas.width; x += 16) {
          for (let y = 0; y < canvas.height; y += 16) {
            if ((x + y) % 32 === 0) {
              ctx.fillRect(x, y, 16, 16);
            }
          }
        }
        ctx.fillStyle = "#555";
        ctx.font = "11px monospace";
        ctx.fillText(compileError ? "COMPILE ERROR" : "NO SHADER", 10, 20);
        if (compileError) {
          ctx.fillStyle = "#f44";
          ctx.font = "9px monospace";
          const lines = compileError.split("\n");
          lines.forEach((line, i) => {
            ctx.fillText(line, 10, 35 + i * 14);
          });
        }
      }
      animRef.current = requestAnimationFrame(run);
    };
    animRef.current = requestAnimationFrame(run);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPreviewRunning, compileError]);

  const handleSave = () => {
    if (!editName.trim()) return;
    const id = activeShaderId || `custom_shader_${Date.now()}`;
    const complexity = estimateShaderComplexity(editCode);
    const visualImpact = estimateShaderVisualImpact(editCode);
    onSaveShader({
      id,
      name: editName.trim(),
      description: editDescription.trim(),
      code: editCode,
      updatedAt: Date.now(),
      complexity,
      visualImpact,
    });
    setActiveShaderId(id);
  };

  const handleNew = () => {
    setActiveShaderId(null);
    setEditCode(DEFAULT_SHADER_CODE);
    setEditName("My Custom Shader");
    setEditDescription("A custom procedural effect");
    setCompileError(null);
  };

  const handleDelete = () => {
    if (!activeShaderId) return;
    onDeleteShader(activeShaderId);
    setActiveShaderId(null);
    setEditCode("");
    setEditName("");
    setEditDescription("");
    setCompileError(null);
  };

  const handleExample = (code: string) => {
    setEditCode(code);
    setEditName(code === TUNNEL_SHADER_CODE ? "Tunnel Effect" : "Plasma Wave");
    setEditDescription(code === TUNNEL_SHADER_CODE
      ? "Psychedelic rotating tunnel with distance-based coloring"
      : "Classic demoscene plasma with trigonometric color blending");
    setActiveShaderId(null);
    setShowExamples(false);
  };

  const activeShader = activeShaderId ? shaders[activeShaderId] : null;
  const hasChanges = activeShader
    ? editCode !== activeShader.code || editName !== activeShader.name
    : editCode.length > 0;
  const isValid = editName.trim().length > 0 && editCode.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 font-mono select-none"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#18181b] border-2 border-[#22d3ee]/50 shadow-[0_0_40px_rgba(34,211,238,0.15)] rounded-lg max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#27272a] px-4 py-3">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-[#22d3ee]" />
            <h2 className="font-bold text-[#d4d4d8] text-sm tracking-wider uppercase">
              Custom Shader Editor
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExamples(!showExamples)}
              className="flex items-center gap-1 bg-[#27272a] hover:bg-[#3f3f46] text-[#a1a1aa] hover:text-white px-2.5 py-1.5 rounded text-[10px] font-bold transition cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
              <span>EXAMPLES</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-[#27272a] rounded text-[#71717a] hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Example gallery dropdown */}
        {showExamples && (
          <div className="border-b border-[#27272a] px-4 py-2 bg-[#09090b]/50">
            <p className="text-[10px] text-[#71717a] mb-2">Choose a starter template:</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => handleExample(DEFAULT_SHADER_CODE)}
                className="bg-[#22d3ee]/10 hover:bg-[#22d3ee]/20 border border-[#22d3ee]/30 hover:border-[#22d3ee]/60 rounded px-3 py-1.5 text-[10px] text-[#22d3ee] font-bold transition cursor-pointer"
              >
                <Wand2 className="w-3 h-3 inline mr-1" />
                PLASMA WAVE
              </button>
              <button
                onClick={() => handleExample(TUNNEL_SHADER_CODE)}
                className="bg-[#a855f7]/10 hover:bg-[#a855f7]/20 border border-[#a855f7]/30 hover:border-[#a855f7]/60 rounded px-3 py-1.5 text-[10px] text-[#c084fc] font-bold transition cursor-pointer"
              >
                <Wand2 className="w-3 h-3 inline mr-1" />
                TUNNEL EFFECT
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left panel: shader list */}
          <div className="w-52 border-r border-[#27272a] overflow-y-auto bg-[#09090b]/30 flex flex-col">
            <div className="p-2 border-b border-[#27272a]">
              <button
                onClick={handleNew}
                className="w-full flex items-center justify-center gap-1.5 bg-[#22d3ee]/10 hover:bg-[#22d3ee]/20 text-[#22d3ee] border border-[#22d3ee]/30 rounded px-2 py-1.5 text-[10px] font-bold transition cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>NEW SHADER</span>
              </button>
            </div>
            {shaderList.length === 0 && (
              <div className="p-3 text-[10px] text-[#71717a] text-center">
                No shaders yet.<br />Click "NEW SHADER" to start.
              </div>
            )}
            {shaderList.map((s) => (
              <div
                key={s.id}
                onClick={() => selectShader(s.id)}
                className={`px-3 py-2 text-[10px] border-b border-[#27272a]/50 cursor-pointer transition flex items-center gap-2 ${
                  activeShaderId === s.id
                    ? "bg-[#22d3ee]/10 text-white border-l-2 border-l-[#22d3ee]"
                    : "text-[#a1a1aa] hover:bg-[#18181b] hover:text-white"
                }`}
              >
                <Code className="w-3 h-3 shrink-0 text-[#22d3ee]" />
                <span className="truncate font-bold">{s.name}</span>
                {selectedShaderIds.includes(s.id) && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
                )}
              </div>
            ))}
          </div>

          {/* Center: code editor */}
          <div className="flex-1 flex flex-col min-w-0">
            {activeShaderId || !shaderList.length || !activeShaderId ? (
              <>
                {/* Shader metadata header */}
                <div className="flex items-center gap-2 p-2 border-b border-[#27272a] bg-[#09090b]/40">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Shader Name"
                    className="bg-transparent border-b border-transparent hover:border-[#3f3f46] focus:border-[#22d3ee] text-white text-[11px] font-bold px-1 py-0.5 outline-none w-40"
                  />
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Short description"
                    className="bg-transparent border-b border-transparent hover:border-[#3f3f46] focus:border-[#22d3ee] text-[#a1a1aa] text-[9px] px-1 py-0.5 outline-none flex-1"
                  />
                  {compileError ? (
                    <span className="flex items-center gap-1 text-[#ef4444] text-[9px]">
                      <AlertTriangle className="w-3 h-3" />
                      ERRORS
                    </span>
                  ) : editCode ? (
                    <span className="flex items-center gap-1 text-[#4ade80] text-[9px]">
                      <CheckCircle2 className="w-3 h-3" />
                      OK
                    </span>
                  ) : null}
                </div>

                {/* Code textarea */}
                <textarea
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="flex-1 bg-[#09090b] text-[#d4d4d8] text-[11px] font-mono p-3 resize-none outline-none border-none focus:ring-0 leading-relaxed"
                  placeholder="// Write your shader code here..."
                  spellCheck={false}
                />

                {/* Error display */}
                {compileError && (
                  <div className="px-3 py-2 bg-[#ef4444]/10 border-t border-[#ef4444]/30 text-[#fca5a5] text-[9px] font-mono leading-relaxed max-h-20 overflow-y-auto">
                    <span className="font-bold text-[#ef4444]">ERROR: </span>
                    {compileError}
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-[#71717a] text-[11px]">
                Select or create a shader to edit
              </div>
            )}

            {/* Bottom toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-[#27272a] bg-[#09090b]/60">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={!isValid}
                  className="flex items-center gap-1 bg-[#22d3ee]/10 hover:bg-[#22d3ee]/25 text-[#22d3ee] border border-[#22d3ee]/30 hover:border-[#22d3ee] rounded px-2.5 py-1 text-[10px] font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Save className="w-3 h-3" />
                  <span>SAVE</span>
                </button>
                {hasChanges && (
                  <span className="text-[9px] text-[#fb923c]">UNSAVED CHANGES</span>
                )}
                {editCode && (
                  <span className="text-[9px] text-[#71717a]">
                    CPX: {estimateShaderComplexity(editCode)} · VIS: {estimateShaderVisualImpact(editCode)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {activeShaderId && (
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-1 bg-[#ef4444]/10 hover:bg-[#ef4444]/25 text-[#ef4444] border border-[#ef4444]/30 hover:border-[#ef4444] rounded px-2 py-1 text-[10px] font-bold transition cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>DELETE</span>
                  </button>
                )}
                {activeShaderId && (
                  <button
                    onClick={() => onToggleShader(activeShaderId!)}
                    className={`flex items-center gap-1 rounded px-2.5 py-1 text-[10px] font-bold transition cursor-pointer border ${
                      selectedShaderIds.includes(activeShaderId!)
                        ? "bg-[#4ade80]/15 text-[#4ade80] border-[#4ade80]/50 hover:bg-[#4ade80]/25"
                        : "bg-[#27272a] text-[#a1a1aa] border-[#3f3f46] hover:bg-[#3f3f46]"
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>{selectedShaderIds.includes(activeShaderId!) ? "IN DEMO" : "ADD TO DEMO"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right panel: live preview */}
          <div className="w-56 border-l border-[#27272a] bg-[#09090b] flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#27272a]">
              <span className="text-[9px] text-[#71717a] font-bold uppercase tracking-wider">Preview</span>
              <button
                onClick={() => setIsPreviewRunning(!isPreviewRunning)}
                className={`p-1 rounded transition cursor-pointer ${
                  isPreviewRunning ? "text-[#4ade80]" : "text-[#71717a]"
                }`}
                title={isPreviewRunning ? "Pause preview" : "Resume preview"}
              >
                <Play className={`w-3 h-3 ${isPreviewRunning ? "fill-current" : ""}`} />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-2">
              <canvas
                ref={previewRef}
                width={200}
                height={150}
                className="w-full h-auto rounded border border-[#27272a]"
                style={{ imageRendering: "pixelated" }}
              />
            </div>
            {activeShaderId && selectedShaderIds.includes(activeShaderId) && (
              <div className="px-3 py-1.5 bg-[#4ade80]/10 border-t border-[#4ade80]/30 text-[9px] text-[#4ade80] text-center font-bold">
                ACTIVE IN DEMO · TOGGLE OFF TO REMOVE
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
