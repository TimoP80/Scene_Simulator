/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Virus domain — pure helpers for the Amiga disk virus subsystem.
 * Historically, the Amiga demoscene (especially in the late 80s/early 90s)
 * was plagued by boot-block viruses spread via floppy disks at copy-parties.
 * A compiled demo could become corrupted if the disk it was written to
 * carried a dormant virus strain.
 *
 * Side-effect-free; safe to call from the reducer, projections, /apps/ui,
 * and /tools. NO React / DOM / fetch / LLM imports.
 *
 * Virus risk factors:
 *   - Current year (peak: 1987-1993, the "viral golden age")
 *   - Platform (Amiga most susceptible, PC moderately, 8-bit least)
 *   - BBS activity (downloading cracked software increases risk)
 *   - Optimization focus ("Speed" skips disk sanitation)
 *   - Antivirus research (can dramatically reduce risk)
 */

/**
 * A known Amiga / retro-platform virus strain with thematic data.
 */
export interface VirusStrain {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  /** Year this strain was first detected in the wild. */
  firstSeenYear: number;
  /** Final year this strain was prevalent (sporadic after). */
  lastActiveYear: number;
  /** Severity 0-100 — how devastating the infection is. */
  severity: number;
  /** Platform affinity — which platforms it primarily targets. */
  targetsPlatforms: Array<"c64" | "zx" | "amiga" | "atari_st" | "pc">;
  /** Flavor text shown when the virus manifests. */
  manifestationText: string;
  /** Whether the virus is known to trigger on demo execution vs compile-time. */
  triggerEvent: "compile" | "execute" | "both";
}

/**
 * The outcome of a virus check during compilation or execution.
 */
export interface VirusOutcome {
  /** Whether a virus was detected / triggered. */
  infected: boolean;
  /** The strain that triggered, if any. */
  strain?: VirusStrain;
  /** How the infection manifests — shown as UI flavour. */
  manifestationType?: "crash" | "glitch" | "scrolltext" | "harmless_bootblock" | "corruption";
  /** A human-readable description of what happened. */
  message: string;
  /** Score penalty applied (0 if undetected/unaffected or harmless). */
  scorePenalty: number;
  /** Whether the demo is completely broken (cannot run). */
  isBricked: boolean;
}

// ---------------------------------------------------------------------------
// Virus catalogue — historically inspired Amiga boot-sector and
// file-infecting viruses. These were a real plague in the demoscene.
// ---------------------------------------------------------------------------

export const VIRUS_STRAINS: VirusStrain[] = [
  {
    id: "sca_virus",
    name: "SCA Virus",
    aliases: ["Swiss Cracking Association", "SCA Bootblock", "The Italian Plague"],
    description: "The most infamous Amiga boot-block virus. Originated from the Swiss Cracking Association (SCA) and spread globally through cracked game disks. Infects the boot block of any floppy disk inserted into an infected Amiga.",
    firstSeenYear: 1987,
    lastActiveYear: 1993,
    severity: 65,
    targetsPlatforms: ["amiga"],
    manifestationText: "SOMETHING IS WRITING TO DISK! The SCA bootblock virus has infected your floppy. Your demo now carries the infamous SCA signature — a telltale sign you've been swapping disks at copy parties.",
    triggerEvent: "compile",
  },
  {
    id: "byte_bandit",
    name: "Byte Bandit",
    aliases: ["The Bandit", "Byte Bandit Virus"],
    description: "A stealth boot-block virus that actively tried to hide from detection by intercepting disk read commands. Spread rapidly through the European Amiga BBS scene.",
    firstSeenYear: 1988,
    lastActiveYear: 1992,
    severity: 75,
    targetsPlatforms: ["amiga"],
    manifestationText: "YOUR BYTES HAVE BEEN BANDIT'D! Critical disk sectors are being redirected. The demo may show corrupted raster data or fail to load certain effects. Thank the public-domain disk you downloaded from that BBS.",
    triggerEvent: "both",
  },
  {
    id: "bebe_virus",
    name: "Bebe",
    aliases: ["Russian Bebe", "Bebe's Revenge"],
    description: "An Eastern European boot-block virus that displayed a bouncing baby face animation when triggered. Spread through copied demo disks at The Party and Assembly gatherings.",
    firstSeenYear: 1990,
    lastActiveYear: 1994,
    severity: 45,
    targetsPlatforms: ["amiga", "atari_st"],
    manifestationText: "BEBE? BEBE! A bouncing baby face appears on screen — your disk has been infected by the Bebe virus. The demo still runs but this uninvited guest is now part of your release.",
    triggerEvent: "execute",
  },
  {
    id: "gd_virus",
    name: "GD Virus",
    aliases: ["GD-Boot", "Garbage Death"],
    description: "A destructive virus that would actively corrupt files on the disk after a trigger count. Highly feared in the demoscene for wiping months of work.",
    firstSeenYear: 1989,
    lastActiveYear: 1991,
    severity: 95,
    targetsPlatforms: ["amiga"],
    manifestationText: "GD DETECTED! The Garbage Death virus has activated — disk sectors are being overwritten with random data. Your production pipeline has been compromised. This is why you don't boot untrusted disks at 3AM.",
    triggerEvent: "compile",
  },
  {
    id: "milan_virus",
    name: "Milan Virus",
    aliases: ["The Milan Stress", "Italian Boot Menace"],
    description: "A boot-block virus from the Italian scene that displayed a scrolling message claiming 'Milano Calibri 9'. More annoying than destructive but highly contagious.",
    firstSeenYear: 1988,
    lastActiveYear: 1992,
    severity: 30,
    targetsPlatforms: ["amiga", "atari_st"],
    manifestationText: "MILANO STRESS! A scrolling marquee reads 'Milano Calibri 9 — infected by the Milan Virus'. Your demo is now part of the Italian boot-block epidemic. At least it still compiles.",
    triggerEvent: "compile",
  },
  {
    id: "arne_virus",
    name: "Arne Virus",
    aliases: ["Arne's Playground", "Arne Bootblock"],
    description: "A playful virus that would replace the Amiga's boot screen with a crude animation of a stick figure dancing. Spread through swap disks at European demoparties.",
    firstSeenYear: 1989,
    lastActiveYear: 1993,
    severity: 20,
    targetsPlatforms: ["amiga"],
    manifestationText: "ARNE IS PLAYING! A stick figure dances across the boot screen. The Arne virus hitched a ride on your swap disk from the last copy party. Harmless but embarrassing when showing your demo to other groups.",
    triggerEvent: "execute",
  },
  {
    id: "pc_form_virus",
    name: "FORM Virus",
    aliases: ["Form", "Form Lock", "PC Boot Sector"],
    description: "A PC boot-sector virus that displayed 'The FORM Virus' on infected systems. Spread through floppy disks traded at demoscene gatherings.",
    firstSeenYear: 1990,
    lastActiveYear: 1996,
    severity: 40,
    targetsPlatforms: ["pc"],
    manifestationText: "FORM DETECTED! The FORM virus signature found in the boot sector. Your PC floppy was infected at the last demoparty. Demo may experience intermittent crashes.",
    triggerEvent: "both",
  },
  {
    id: "stoned_virus",
    name: "Stoned/Marijuana",
    aliases: ["Stoned", "Marijuana Virus", "Legalise It"],
    description: "One of the most widespread boot-sector viruses across all platforms. Displayed 'Your PC is now Stoned!' on infected systems.",
    firstSeenYear: 1988,
    lastActiveYear: 1995,
    severity: 50,
    targetsPlatforms: ["pc", "amiga"],
    manifestationText: "YOUR SYSTEM IS STONED! The Stoned virus has been dormant on this disk. 'Legalise Marijuana' scrolls across the screen. The demo is intact but you've effectively just distributed malware.",
    triggerEvent: "execute",
  },
  {
    id: "c64_rabbit_virus",
    name: "Rabbit Virus",
    aliases: ["C64 Rabbit", "Frame Killer"],
    description: "A C64 virus that replicated by hijacking the IRQ interrupt and gradually filling memory with copies of itself. Slowed demos to a crawl.",
    firstSeenYear: 1986,
    lastActiveYear: 1990,
    severity: 55,
    targetsPlatforms: ["c64"],
    manifestationText: "THE RABBIT IS MULTIPLYING! Frame rate is dropping as the Rabbit virus replicates through available memory. Your C64 demo now has an uninvited guest hogging the raster interrupts.",
    triggerEvent: "execute",
  },
];

// ---------------------------------------------------------------------------
// Infection probability helpers
// ---------------------------------------------------------------------------

/**
 * Compute the base infection probability (0-100) for a given year and
 * platform. Higher = more likely to catch a virus.
 *
 * Historical context: Amiga viruses peaked 1988-1992 when floppy disk
 * swapping was the primary distribution method. PC viruses became more
 * common post-1992. 8-bit platforms had fewer (but not zero) viruses.
 */
export function baseInfectionChance(
  year: number,
  platformAffinity: "c64" | "zx" | "amiga" | "atari_st" | "pc",
): number {
  // Platform base susceptibility
  const platformBase: Record<string, number> = {
    amiga: 35,
    atari_st: 20,
    pc: 25,
    c64: 8,
    zx: 3,
  };

  const base = platformBase[platformAffinity] ?? 5;

  // Year modifier — virus prevalence peaked in the late 80s / early 90s
  const yearModifier = (() => {
    if (year < 1986) return 0.2; // Pre-virus era
    if (year <= 1988) return 0.6 + (year - 1986) * 0.2; // Growing
    if (year <= 1991) return 1.0; // Peak
    if (year <= 1995) return 1.0 - (year - 1991) * 0.15; // Declining (antivirus adoption)
    if (year <= 2000) return 0.3 - (year - 1995) * 0.03; // Fading
    return 0.05; // Mostly historical by 2000+
  })();

  return Math.min(100, Math.round(base * yearModifier));
}

/**
 * Determine which strains are active in a given year. Used to pull a random
 * strain for infection flavour.
 */
export function activeStrainsForYear(year: number): VirusStrain[] {
  return VIRUS_STRAINS.filter(
    (s) => year >= s.firstSeenYear && year <= s.lastActiveYear,
  );
}

/**
 * Roll for infection. Returns the outcome of a virus check.
 *
 * @param year        Current game year.
 * @param platformId  The target platform as a string containing platform hints.
 *                    We check if it includes "AMIGA", "C64", "PC", "ATARI", "ZX".
 * @param hasAntivirus Whether the player has researched antivirus tech.
 * @param optimizationFocus Optimization focus — "Speed" skips disk sanitation.
 * @param bbsActivity Whether the player has been active on BBS (increases risk).
 */
export function rollVirusInfection(
  year: number,
  platformId: string,
  hasAntivirus: boolean,
  optimizationFocus: "Speed" | "Balanced" | "Visual Quality",
  bbsActivity: boolean,
): VirusOutcome {
  // Determine platform affinity from platform ID string
  const platformUpper = platformId.toUpperCase();
  const platformAffinity: "c64" | "zx" | "amiga" | "atari_st" | "pc" =
    platformUpper.includes("C64") || platformUpper.includes("COMMODORE")
      ? "c64"
      : platformUpper.includes("ZX") || platformUpper.includes("SPECTRUM")
        ? "zx"
        : platformUpper.includes("AMIGA")
          ? "amiga"
          : platformUpper.includes("ATARI")
            ? "atari_st"
          : platformUpper.includes("PC")
            ? "pc"
          : "pc"; // fallback

  // Get active strains for this year
  const active = activeStrainsForYear(year).filter(
    (s) =>
      s.targetsPlatforms.includes(platformAffinity) &&
      year >= s.firstSeenYear &&
      year <= s.lastActiveYear,
  );

  if (active.length === 0) {
    // No known strains active for this platform/year combo
    return {
      infected: false,
      message: "No virus activity detected in current scene. Disk is clean.",
      scorePenalty: 0,
      isBricked: false,
    };
  }

  // Compute base infection chance
  let chance = baseInfectionChance(year, platformAffinity);

  // Adjust for optimization focus
  if (optimizationFocus === "Speed") {
    chance *= 1.5; // Speed skips disk sanitation
  } else if (optimizationFocus === "Visual Quality") {
    chance *= 0.8; // More careful with source media
  }
  // "Balanced" — no modifier

  // Antivirus tech cuts infection chance drastically
  if (hasAntivirus) {
    chance *= 0.15;
  }

  // BBS activity increases risk (downloading files)
  if (bbsActivity) {
    chance *= 1.3;
  }

  // Roll the dice
  const roll = Math.random() * 100;
  if (roll > chance) {
    return {
      infected: false,
      message: "Disk passed virus scan. All sectors clean. Ready to boot.",
      scorePenalty: 0,
      isBricked: false,
    };
  }

  // INFECTED! Pick a random strain
  const strain = active[Math.floor(Math.random() * active.length)];

  // Determine manifestation based on strain severity + randomness
  const manifestationRoll = Math.random() * 100;
  let manifestationType: VirusOutcome["manifestationType"];
  let isBricked: boolean;
  let scorePenalty: number;

  if (strain.severity >= 80 && manifestationRoll < 40) {
    // High severity + unlucky = full corruption
    manifestationType = "corruption";
    isBricked = true;
    scorePenalty = 100;
  } else if (strain.severity >= 60 && manifestationRoll < 50) {
    manifestationType = "crash";
    isBricked = true;
    scorePenalty = 80;
  } else if (manifestationRoll < 30) {
    manifestationType = "glitch";
    isBricked = false;
    scorePenalty = Math.floor(strain.severity * 0.5);
  } else if (manifestationRoll < 60) {
    manifestationType = "scrolltext";
    isBricked = false;
    scorePenalty = Math.floor(strain.severity * 0.15);
  } else {
    manifestationType = "harmless_bootblock";
    isBricked = false;
    scorePenalty = 0;
  }

  const message = `${strain.manifestationText} ${
    isBricked
      ? "The demo is corrupted and cannot be shown at the party. You'll have to recompile."
      : scorePenalty > 0
        ? `Your demo scores will take a hit (-${scorePenalty}% to overall quality).`
        : "The infection is cosmetic — your demo works fine but the disk is marked."
  }`;

  return {
    infected: true,
    strain,
    manifestationType,
    message,
    scorePenalty,
    isBricked,
  };
}

/**
 * Apply a virus's visual glitch parameters to a demo playback.
 * Returns a set of visual modifiers the renderer can apply.
 */
export interface VirusVisualGlitch {
  /** Whether to introduce random pixel noise. */
  noiseOverlay: boolean;
  /** Whether the raster bars jitter erratically. */
  rasterJitter: boolean;
  /** Whether the scroller text gets random characters swapped. */
  corruptScroller: boolean;
  /** Whether the frame rate stutters. */
  frameSkip: boolean;
  /** Whether a boot message overlay appears. */
  bootMessageOverlay: boolean;
  /** The text of the boot message overlay, if any. */
  bootMessage?: string;
  /** RGB split / chromatic aberration intensity (0-1) */
  colorShift: number;
}

/**
 * Generate visual glitch parameters for an infected demo's playback.
 */
export function virusVisualGlitches(
  outcome: VirusOutcome,
): VirusVisualGlitch | null {
  if (!outcome.infected || outcome.isBricked) return null;

  switch (outcome.manifestationType) {
    case "glitch":
      return {
        noiseOverlay: true,
        rasterJitter: true,
        corruptScroller: true,
        frameSkip: Math.random() > 0.5,
        bootMessageOverlay: Math.random() > 0.6,
        bootMessage: outcome.strain?.name
          ? `[ ${outcome.strain.name.toUpperCase()} ]`
          : "[ VIRUS DETECTED ]",
        colorShift: 0.3 + Math.random() * 0.5,
      };
    case "scrolltext":
      return {
        noiseOverlay: false,
        rasterJitter: false,
        corruptScroller: true,
        frameSkip: false,
        bootMessageOverlay: true,
        bootMessage: outcome.strain
          ? `INFECTED BY ${outcome.strain.name.toUpperCase()}`
          : "INFECTED DISK DETECTED",
        colorShift: 0.1,
      };
    case "harmless_bootblock":
      return {
        noiseOverlay: false,
        rasterJitter: false,
        corruptScroller: false,
        frameSkip: false,
        bootMessageOverlay: true,
        bootMessage: outcome.strain
          ? `${outcome.strain.name} was here`
          : "?:)",
        colorShift: 0,
      };
    case "crash":
    case "corruption":
      return null; // Demo doesn't run at all
    default:
      return null;
  }
}
