import React from 'react';
import { Compass, Zap, Activity, Info, Users, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function RaceMapVisualizer({ raceMap, predictions }) {
  if (!raceMap) return null;

  const {
    paceScenario,
    paceDescription,
    leaderCount,
    onPaceCount,
    midfieldCount,
    backmarkerCount,
    leaders = [],
    onPaceRunners = [],
    midfieldRunners = [],
    backmarkers = []
  } = raceMap;

  // Pace scenario theme
  const getPaceTheme = () => {
    if (paceScenario?.includes('Fast')) {
      return {
        badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
        barColor: 'from-rose-500 to-amber-500',
        advantageText: 'Favors Backmarkers & patient Midfielders (Leaders risk late fatigue)',
        benefitedStyle: 'Backmarker'
      };
    }
    if (paceScenario?.includes('Slow')) {
      return {
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        barColor: 'from-emerald-500 to-sky-500',
        advantageText: 'Favors Front-runners / On-Pace (Soft tempo crawl & sprint finish)',
        benefitedStyle: 'Leader'
      };
    }
    return {
      badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
      barColor: 'from-sky-500 to-amber-500',
      advantageText: 'Balanced True Tempo — Even opportunity across tactical styles',
      benefitedStyle: 'OnPace'
    };
  };

  const theme = getPaceTheme();

  return (
    <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-sky-400" />
          <h3 className="font-bold text-white text-base">Race Map & Pace Dynamics</h3>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${theme.badgeBg}`}>
          {paceScenario || 'Moderate Pace'}
        </span>
      </div>

      {/* Pace Shape Commentary */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3.5 space-y-1.5 text-xs">
        <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Tactical Pace Analysis:</span>
        </div>
        <p className="text-slate-400 leading-relaxed font-sans">
          {paceDescription || 'Evenly matched field with standard tactical positioning.'}
        </p>
        <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 pt-1">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>{theme.advantageText}</span>
        </div>
      </div>

      {/* Visual Race Map Lanes */}
      <div className="space-y-2 font-mono text-xs">
        <div className="text-[11px] font-sans font-bold text-slate-400 uppercase tracking-wider">
          Field Tactical Map (Front to Rear)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
          {/* Lane 1: Leaders */}
          <div className={`p-3 rounded-xl border ${leaderCount > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-900/50 border-slate-800'}`}>
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-300 mb-1.5">
              <span>⚡ LEADERS ({leaderCount})</span>
              <span className="text-[10px] text-slate-400">Front Speed</span>
            </div>
            {leaders.length > 0 ? (
              <div className="space-y-1">
                {leaders.map((name, i) => (
                  <div key={i} className="px-2 py-1 rounded bg-slate-900 text-slate-200 text-xs font-sans truncate font-medium border border-slate-800">
                    {name}
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-[11px] text-slate-500 italic font-sans">No confirmed leader</span>
            )}
          </div>

          {/* Lane 2: On-Pace */}
          <div className={`p-3 rounded-xl border ${onPaceCount > 0 ? 'bg-sky-500/10 border-sky-500/30' : 'bg-slate-900/50 border-slate-800'}`}>
            <div className="flex items-center justify-between text-[11px] font-bold text-sky-300 mb-1.5">
              <span>🏃 ON-PACE ({onPaceCount})</span>
              <span className="text-[10px] text-slate-400">Handy (2-4)</span>
            </div>
            {onPaceRunners.length > 0 ? (
              <div className="space-y-1">
                {onPaceRunners.map((name, i) => (
                  <div key={i} className="px-2 py-1 rounded bg-slate-900 text-slate-200 text-xs font-sans truncate font-medium border border-slate-800">
                    {name}
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-[11px] text-slate-500 italic font-sans">No on-pace runners</span>
            )}
          </div>

          {/* Lane 3: Midfield */}
          <div className={`p-3 rounded-xl border ${midfieldCount > 0 ? 'bg-purple-500/10 border-purple-500/30' : 'bg-slate-900/50 border-slate-800'}`}>
            <div className="flex items-center justify-between text-[11px] font-bold text-purple-300 mb-1.5">
              <span>🏇 MIDFIELD ({midfieldCount})</span>
              <span className="text-[10px] text-slate-400">Tracking (5-8)</span>
            </div>
            {midfieldRunners.length > 0 ? (
              <div className="space-y-1">
                {midfieldRunners.map((name, i) => (
                  <div key={i} className="px-2 py-1 rounded bg-slate-900 text-slate-200 text-xs font-sans truncate font-medium border border-slate-800">
                    {name}
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-[11px] text-slate-500 italic font-sans">No midfield stalkers</span>
            )}
          </div>

          {/* Lane 4: Backmarkers */}
          <div className={`p-3 rounded-xl border ${backmarkerCount > 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900/50 border-slate-800'}`}>
            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-300 mb-1.5">
              <span>🚀 BACKMARKERS ({backmarkerCount})</span>
              <span className="text-[10px] text-slate-400">Closers (9+)</span>
            </div>
            {backmarkers.length > 0 ? (
              <div className="space-y-1">
                {backmarkers.map((name, i) => (
                  <div key={i} className="px-2 py-1 rounded bg-slate-900 text-slate-200 text-xs font-sans truncate font-medium border border-slate-800">
                    {name}
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-[11px] text-slate-500 italic font-sans">No deep closers</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
