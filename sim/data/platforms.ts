/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Historical platform reference data — moved verbatim from src/data.ts.
 * Pure static lookup. No React, no LLM, no side effects.
 */

import { PlatformId, PlatformConfig } from "@packages/types";

export const HISTORICAL_PLATFORMS: Record<PlatformId, PlatformConfig> = {
  [PlatformId.C64]: {
    id: PlatformId.C64,
    name: "Commodore 64",
    year: 1982,
    cost: 150,
    cpuLimit: 12,
    ramLimitKb: 64,
    graphicsMaxColors: 16,
    audioChannels: 3,
    audioTech: "MOS 6581 SID Chip (Legendary analog filters, 3 voice synth)",
    graphicsTech: "VIC-II (Hardware sprites, scroll registers, raster interrupts)",
    description: "The multi-million selling 8-bit wonder. Mastering its custom chips requires hardcore 6502 assembly and extreme clock-cycle counting."
  },
  [PlatformId.ZX_SPECTRUM]: {
    id: PlatformId.ZX_SPECTRUM,
    name: "Sinclair ZX Spectrum",
    year: 1982,
    cost: 90,
    cpuLimit: 10,
    ramLimitKb: 48,
    graphicsMaxColors: 8,
    audioChannels: 1,
    audioTech: "Single Beeper Port / AY-3-8912 synth on 128k model",
    graphicsTech: "Bitmap video buffer (Strict color attribute grid, 32x24 cells)",
    description: "The iconic British rubber-keyed micro. Highly limited graphics with notorious attribute clash\u2014yet hackers push it to incredible limits."
  },
  [PlatformId.AMIGA_500]: {
    id: PlatformId.AMIGA_500,
    name: "Commodore Amiga 500",
    year: 1987,
    cost: 500,
    cpuLimit: 40,
    ramLimitKb: 512,
    graphicsMaxColors: 32, // or 4096 in HAM
    audioChannels: 4,
    audioTech: "Paula custom audio (4 hardware channels of stereophonic 8-bit PCM)",
    graphicsTech: "OCS chipset (Denis, Agnus, Copper processor & Blitter coprocessor)",
    description: "The absolute darling of the 16-bit scene. Features a Copper chip that runs in sync with video beam, and the Blitter for warp speed pixel operations."
  },
  [PlatformId.ATARI_ST]: {
    id: PlatformId.ATARI_ST,
    name: "Atari 520ST",
    year: 1985,
    cost: 400,
    cpuLimit: 38,
    ramLimitKb: 512,
    graphicsMaxColors: 16,
    audioChannels: 3,
    audioTech: "Yamaha YM2149 PSG programmable sound generator",
    graphicsTech: "Simple frame buffer (No scroll registers, no copper, raw CPU power)",
    description: "The competitor to the Amiga. Lacks custom graphics chips and scroll hardware, so programmers must invent 'borderless' overscans manually."
  },
  [PlatformId.AMIGA_1200]: {
    id: PlatformId.AMIGA_1200,
    name: "Commodore Amiga 1200",
    year: 1992,
    cost: 800,
    cpuLimit: 90,
    ramLimitKb: 2048,
    graphicsMaxColors: 256, // and up to 262,144 in HAM8
    audioChannels: 4,
    audioTech: "Paula sound with 14-bit synthesis tricks",
    graphicsTech: "AGA (Advanced Graphics Architecture, fast page-mode memory)",
    description: "The next-gen Amiga. High bandwidth and gorgeous color palettes. The ultimate playground for chunky-to-planar texture effects."
  },
  [PlatformId.PC_386]: {
    id: PlatformId.PC_386,
    name: "Intel 386 DX PC",
    year: 1989,
    cost: 1500,
    cpuLimit: 80,
    ramLimitKb: 4096,
    graphicsMaxColors: 256,
    audioChannels: 1, // PC Speaker or AdLib
    audioTech: "AdLib FM Music Synthesizer / PC Internal Speaker bleeps",
    graphicsTech: "VGA Mode 13h (320x200 linear pixels, 256 colors from 262k palette)",
    description: "Early PC demoscene era. No custom screen sync chips\u2014just raw CPU speed, flat frame buffers, and sound synthesis adapters."
  },
  [PlatformId.PC_486]: {
    id: PlatformId.PC_486,
    name: "Intel 486 DX2-66 PC",
    year: 1992,
    cost: 2000,
    cpuLimit: 180,
    ramLimitKb: 8192,
    graphicsMaxColors: 256,
    audioChannels: 8,
    audioTech: "Grave UltraSound (Native wavetables, HW mixing) / SoundBlaster 16",
    graphicsTech: "VESA Local Bus SVGA (640x480 high resolution frames, flat buffers)",
    description: "The engine that propelled PCs past Amiga in raw compute. Gravis Ultrasound introduces hardware audio wavetables, fueling multi-track MOD players."
  },
  [PlatformId.PC_PENTIUM]: {
    id: PlatformId.PC_PENTIUM,
    name: "Intel Pentium 133 PC",
    year: 1995,
    cost: 2200,
    cpuLimit: 350,
    ramLimitKb: 16384,
    graphicsMaxColors: 65536,
    audioChannels: 16,
    audioTech: "SoundBlaster AWE32 / Gravis UltraSound MAX stereophonic sound",
    graphicsTech: "PCI Graphic Bus architecture (Fast write buffers, early voxel heights)",
    description: "An absolute powerhouse. The Pentium architecture allows dual assembly instruction pipelining, enabling software texture mapping."
  },
  [PlatformId.PC_PENTIUM_II]: {
    id: PlatformId.PC_PENTIUM_II,
    name: "Intel Pentium II 400 PC",
    year: 1998,
    cost: 1800,
    cpuLimit: 750,
    ramLimitKb: 65536,
    graphicsMaxColors: 16777216,
    audioChannels: 32,
    audioTech: "AC'97 Audio Codecs (High speed streaming, real-time MP3 decoding)",
    graphicsTech: "AGP Bus with 3DFX Voodoo Graphics, Riva TNT (Early 3D hardware)",
    description: "The era of 3D accelerators. Relies on graphics APIs (Glide, Direct3D, early OpenGL) to render hundreds of thousands of textured polygons."
  },
  [PlatformId.PC_PENTIUM_III]: {
    id: PlatformId.PC_PENTIUM_III,
    name: "Pentium III + GeForce 2600",
    year: 2001,
    cost: 1600,
    cpuLimit: 1200,
    ramLimitKb: 262144,
    graphicsMaxColors: 16777216,
    audioChannels: 64,
    audioTech: "DirectSound3D acceleration, software digital DSP filters",
    graphicsTech: "NVIDIA GeForce (Hardware transform & lighting, custom vertex shaders)",
    description: "The peak of the historical demoscene. Graphics cards handle lights, normals, vertex coordinates, and early procedural generation loops."
  }
};
