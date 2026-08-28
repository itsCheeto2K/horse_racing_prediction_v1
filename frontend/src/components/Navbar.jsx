import React from 'react';
import { Calendar, Activity, Zap, ShieldCheck, Flame, Compass } from 'lucide-react';

export default function Navbar({
  selectedDate,
  onDateChange,
  raceCode,
  onRaceCodeChange,
  healthStatus,
  onRefresh
}) {
  // Quick date presets
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  return (
    <header className="border-b border-slate-800 bg-[#0f172a]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3">
          
          {/* Logo & Platform Info */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Zap className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-white">HorseRacing<span className="text-amber-400">Live</span></span>
                <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  C++ OOP &bull; 10k Monte Carlo
                </span>
              </div>
              <p className="text-xs text-slate-400">Powered by FormFav Data Feed & C++ Predictive Engine</p>
            </div>
          </div>

          {/* Controls: Date Picker & Race Types */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Race Code Selector */}
            <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => onRaceCodeChange('gallops')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  raceCode === 'gallops'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Gallops
              </button>
              <button
                onClick={() => onRaceCodeChange('harness')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  raceCode === 'harness'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Harness
              </button>
              <button
                onClick={() => onRaceCodeChange('greyhounds')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  raceCode === 'greyhounds'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Dogs
              </button>
            </div>

            {/* Quick Date Presets */}
            <div className="hidden sm:flex bg-slate-900/80 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => onDateChange(yesterday)}
                className={`px-2.5 py-1.5 rounded text-slate-400 hover:text-white ${selectedDate === yesterday ? 'bg-slate-800 text-white font-bold' : ''}`}
              >
                Yesterday
              </button>
              <button
                onClick={() => onDateChange(today)}
                className={`px-2.5 py-1.5 rounded text-slate-400 hover:text-white ${selectedDate === today ? 'bg-slate-800 text-amber-400 font-bold' : ''}`}
              >
                Today
              </button>
              <button
                onClick={() => onDateChange(tomorrow)}
                className={`px-2.5 py-1.5 rounded text-slate-400 hover:text-white ${selectedDate === tomorrow ? 'bg-slate-800 text-white font-bold' : ''}`}
              >
                Tomorrow
              </button>
            </div>

            {/* Date Input */}
            <div className="relative flex items-center">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="bg-slate-900 text-slate-200 text-xs rounded-lg px-3 py-2 border border-slate-700 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            {/* Health & Engine Status */}
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-semibold">Engine Active</span>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
