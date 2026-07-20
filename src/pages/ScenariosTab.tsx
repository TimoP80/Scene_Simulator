import React from 'react';
import { Power } from 'lucide-react';

interface ScenariosTabProps {
  loadScenario: (id: string) => void;
}

export default function ScenariosTab(props: ScenariosTabProps) {
  const { loadScenario } = props;
  return (
              <div className="bg-[#18181b] p-4 rounded border border-[#27272a] space-y-6 shadow-lg font-mono">
                <div className="border-b border-[#27272a] pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Power className="text-[#fb923c] w-4 h-4" />
                    <h3 className="font-bold text-[#d4d4d8] text-xs uppercase">Time-Machine Portal Desk</h3>
                  </div>
                  <p className="text-[10px] text-[#a1a1aa] mt-1">Jump directly to iconic milestones of compute hardware and discover specific specialties.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Variant 1 */}
                  <div className="p-4 bg-[#09090b] hover:border-[#3f3f46] border border-[#27272a] rounded text-xs flex flex-col justify-between transition-all">
                    <div>
                      <h4 className="font-bold text-[#fb923c] text-sm tracking-tight">1. BEDROOM 8-BIT AGE (1985)</h4>
                      <p className="text-[#a1a1aa] mt-1.5 pb-2.5 border-b border-[#27272a] leading-normal">
                        Start solo with a micro-budget Commodore 64 and a cassette tape desk, learning the low level registers of 6502 assembly lines.
                      </p>
                      <div className="mt-3.5 text-[10.5px] text-[#71717a] space-y-1 font-mono">
                        <div>MONEY: <strong className="text-white font-bold">$200</strong></div>
                        <div>ACTIVE RIG: <strong className="text-[#fb923c] font-bold">Commodore 64</strong></div>
                        <div>CREW SIZE: <strong className="text-white font-bold">Solo (1)</strong></div>
                      </div>
                    </div>
                    <button
                      id="btn-scen-1985"
                      onClick={() => loadScenario("1985_8bit")}
                      className="mt-5 w-full bg-[#fb923c] hover:bg-[#f97316] text-[#09090b] font-black py-2 rounded text-xs transition cursor-pointer text-center uppercase tracking-wide"
                    >
                      BOOT AGE 1985
                    </button>
                  </div>

                  {/* Variant 2 */}
                  <div className="p-4 bg-[#09090b] hover:border-[#3f3f46] border border-[#27272a] rounded text-xs flex flex-col justify-between transition-all">
                    <div>
                      <h4 className="font-bold text-[#4ade80] text-sm tracking-tight">2. AMIGA OCS GOLDEN AGE (1991)</h4>
                      <p className="text-[#a1a1aa] mt-1.5 pb-2.5 border-b border-[#27272a] leading-normal">
                        Pummel hardware displaying colorful parallax sine patterns with the Amiga Copper List and soundtracker modulator samples.
                      </p>
                      <div className="mt-3.5 text-[10.5px] text-[#71717a] space-y-1 font-mono">
                        <div>MONEY: <strong className="text-white font-bold">$1,400</strong></div>
                        <div>ACTIVE RIG: <strong className="text-[#4ade80] font-bold">Amiga 500</strong></div>
                        <div>CREW SIZE: <strong className="text-white font-bold">Trio (3)</strong></div>
                      </div>
                    </div>
                    <button
                      id="btn-scen-1991"
                      onClick={() => loadScenario("1991_16bit")}
                      className="mt-5 w-full bg-[#4ade80] hover:bg-[#22c55e] text-[#09090b] font-black py-2 rounded text-xs transition cursor-pointer text-center uppercase tracking-wide"
                    >
                      BOOT AGE 1991
                    </button>
                  </div>

                  {/* Variant 3 */}
                  <div className="p-4 bg-[#09090b] hover:border-[#3f3f46] border border-[#27272a] rounded text-xs flex flex-col justify-between transition-all">
                    <div>
                      <h4 className="font-bold text-[#22d3ee] text-sm tracking-tight">3. SVGA & 3D HARDWARE (1998)</h4>
                      <p className="text-[#a1a1aa] mt-1.5 pb-2.5 border-b border-[#27272a] leading-normal">
                        Command modern vertex floating buffers and hardware 3D textures renderer using Direct3D or math-calculated voxel terrain hills.
                      </p>
                      <div className="mt-3.5 text-[10.5px] text-[#71717a] space-y-1 font-mono">
                        <div>MONEY: <strong className="text-white font-bold">$3,200</strong></div>
                        <div>ACTIVE RIG: <strong className="text-[#22d3ee] font-bold">Pentium II + Voodoo</strong></div>
                        <div>CREW SIZE: <strong className="text-white font-bold">Trio (3)</strong></div>
                      </div>
                    </div>
                    <button
                      id="btn-scen-1998"
                      onClick={() => loadScenario("1998_pc3d")}
                      className="mt-5 w-full bg-[#22d3ee] hover:bg-[#06b6d4] text-[#09090b] font-black py-2 rounded text-xs transition cursor-pointer text-center uppercase tracking-wide"
                    >
                      BOOT AGE 1998
                    </button>
                  </div>
                </div>
              </div>
  );
}
