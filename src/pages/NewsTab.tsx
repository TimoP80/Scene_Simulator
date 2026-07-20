import React from 'react';
import { Newspaper, Terminal } from 'lucide-react';


interface NewsTabProps {
  newsLog: any[];
  getMonthName: (month: number) => string;
}

export default function NewsTab(props: NewsTabProps) {
  const { newsLog, getMonthName } = props;
  return (
              <div className="bg-[#18181b] p-4 rounded border border-[#27272a] space-y-6 shadow-lg font-mono">
                <div className="flex items-center justify-between border-b border-[#27272a] pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <Newspaper className="text-[#facc15] w-4 h-4" />
                    <h3 className="font-bold text-[#d4d4d8] text-xs uppercase">Underground Scene Magazines Feed</h3>
                  </div>
                </div>

                <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                  {newsLog.map((log) => {
                    const isBbsAlert = log.title && log.title.includes("BBS");
                    return (
                      <div
                        key={log.id}
                        className={`p-3.5 rounded text-xs leading-relaxed transition-all border ${
                          isBbsAlert
                            ? "bg-[#0c0813] border-[#a855f7]/40 shadow-[0_0_15px_rgba(168,85,247,0.06)] hover:border-[#a855f7]"
                            : "bg-[#09090b] border-[#27272a] hover:border-[#3f3f46]"
                        }`}
                      >
                        <div className="flex items-center justify-between border-b border-[#27272a]/70 pb-2 mb-2 text-[10px]">
                          <span className={`font-bold uppercase flex items-center gap-1.5 ${
                            isBbsAlert ? "text-[#c084fc]" : "text-[#fb923c]"
                          }`}>
                            {isBbsAlert ? (
                              <Terminal className="w-3.5 h-3.5 text-[#a855f7]" />
                            ) : (
                              <Newspaper className="w-3.5 h-3.5" />
                            )}
                            {log.title}
                          </span>
                          <span className="text-[#71717a] font-bold uppercase tracking-wider">
                            {getMonthName(log.month).toUpperCase()} {log.year}
                          </span>
                        </div>
                        <h4 className={`font-bold text-xs mb-1.5 uppercase tracking-wide ${
                          isBbsAlert ? "text-[#e9d5ff]" : "text-white"
                        }`}>{log.headline}</h4>
                        <p className="text-[#a1a1aa] pl-0.5 leading-relaxed">{log.body}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
  );
}
