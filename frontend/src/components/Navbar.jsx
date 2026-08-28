import React, { useState, useEffect } from 'react';
import { Calendar, Activity, Zap, Clock, Globe } from 'lucide-react';

export function getLocalDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getOffsetLocalDateString(daysOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return getLocalDateString(d);
}

export default function Navbar({
  selectedDate,
  onDateChange,
  raceCode,
  onRaceCodeChange,
  healthStatus,
}) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real-time ticking clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      // Check if day rolled over and user was on previous today
      const todayStr = getLocalDateString(now);
      const yesterdayStr = getOffsetLocalDateString(-1);
      if (selectedDate === yesterdayStr && now.getHours() === 0 && now.getMinutes() === 0 && now.getSeconds() <= 2) {
        onDateChange(todayStr);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedDate, onDateChange]);

  // Accurate local date presets (independent of UTC)
  const today = getLocalDateString(currentTime);
  const yesterday = getOffsetLocalDateString(-1);
  const tomorrow = getOffsetLocalDateString(1);

  // Timezone string
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
  const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const formattedDate = currentTime.toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <header className="border-b border-slate-800 bg-[#0f172a]/95 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-3 gap-3">
          
          {/* Logo & Platform Info */}
          <div className="flex items-center justify-between sm:justify-start space-x-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Zap className="w-6 h-6 text-black" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-xl tracking-tight text-white">HorseRacing<span className="text-amber-400">Live</span></span>
                  <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    C++ OOP &bull; Monte Carlo
                  </span>
                </div>
                <p className="text-xs text-slate-400">Powered by FormFav Data Feed & C++ Predictive Engine</p>
              </div>
            </div>

            {/* Live Real-time Clock on Mobile */}
            <div className="lg:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-amber-400">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              <span>{formattedTime}</span>
            </div>
          </div>

          {/* Controls: Real-time clock, Race Types, Date Picker */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            
            {/* Live Clock & Timezone Widget (Desktop) */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="text-slate-200 font-bold">{formattedTime}</span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400 text-[11px]">{formattedDate}</span>
              <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-800 text-amber-400/90 border border-slate-700">
                {userTimezone}
              </span>
            </div>

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

            {/* Quick Date Presets (Accurate Local Time) */}
            <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => onDateChange(yesterday)}
                className={`px-2.5 py-1.5 rounded text-slate-400 hover:text-white transition-colors ${
                  selectedDate === yesterday ? 'bg-slate-800 text-white font-bold' : ''
                }`}
              >
                Yesterday
              </button>
              <button
                onClick={() => onDateChange(today)}
                className={`px-2.5 py-1.5 rounded text-slate-400 hover:text-white transition-colors ${
                  selectedDate === today ? 'bg-slate-800 text-amber-400 font-bold shadow-sm' : ''
                }`}
              >
                Today
              </button>
              <button
                onClick={() => onDateChange(tomorrow)}
                className={`px-2.5 py-1.5 rounded text-slate-400 hover:text-white transition-colors ${
                  selectedDate === tomorrow ? 'bg-slate-800 text-white font-bold' : ''
                }`}
              >
                Tomorrow
              </button>
            </div>

            {/* Date Picker Input */}
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
              <span className="font-semibold hidden sm:inline">Engine Active</span>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
