import React from 'react';
import { Flag, Wind, Award, DollarSign, Users, Sparkles, Crosshair, HelpCircle, Activity, Gauge, Flame } from 'lucide-react';

export default function RaceHeader({ formData, predictionData }) {
  if (!formData) return null;

  const topPick = predictionData?.topPickName;
  const valuePick = predictionData?.valuePickName || predictionData?.bestUnderdogName;
  const darkHorse = predictionData?.darkHorseName || predictionData?.bestLongshotName;
  const top3List = predictionData?.top3Candidates || [];
  const raceMap = predictionData?.raceMap;
  const effectiveField = raceMap?.effectiveFieldCount || formData.runners?.length || 0;

  return (
    <div className="bg-gradient-to-r from-[#131b2e] to-[#1c2742] border border-slate-700/80 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4">
      {/* Top Banner: Track, Race #, Name */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-700/50 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider">
              Race {formData.raceNumber}
            </span>
            <span className="text-sm font-bold text-amber-400 font-mono tracking-wide">
              {formData.track}
            </span>
            {formData.raceClass && (
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                {formData.raceClass}
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {formData.raceName || `Race ${formData.raceNumber} Handicap`}
          </h1>
        </div>

        {/* 4-Tier Pipeline Key Picks Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {topPick && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-semibold shadow-lg shadow-amber-500/10">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>#1 Contender: <strong className="text-white font-bold">{topPick}</strong></span>
            </div>
          )}
          {valuePick && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-lg shadow-emerald-500/10">
              <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
              <span>Best Underdog: <strong className="text-white font-bold">{valuePick}</strong></span>
            </div>
          )}
          {darkHorse && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/40 text-purple-300 text-xs font-semibold shadow-lg shadow-purple-500/10">
              <Flame className="w-3.5 h-3.5 text-purple-400" />
              <span>Best Longshot: <strong className="text-white font-bold">{darkHorse}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Top 3 Candidates Overview Banner */}
      {top3List.length > 0 && (
        <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-black font-mono text-[11px] uppercase">
              Top 3 Candidates
            </span>
            <div className="flex items-center gap-2 font-mono">
              {top3List.map((name, idx) => (
                <span key={idx} className="flex items-center gap-1 text-slate-200">
                  <strong className="text-amber-400 font-bold">{idx + 1}.</strong> {name}
                  {idx < top3List.length - 1 && <span className="text-slate-600 ml-1">&bull;</span>}
                </span>
              ))}
            </div>
          </div>
          {raceMap?.paceScenario && (
            <div className="flex items-center gap-1.5 font-mono text-slate-300">
              <Gauge className="w-3.5 h-3.5 text-sky-400" />
              <span>Pace Shape: <strong className="text-sky-300">{raceMap.paceScenario}</strong></span>
            </div>
          )}
        </div>
      )}

      {/* Race Metadata Metric Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs font-mono">
        <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-2.5 flex items-center gap-2.5">
          <Flag className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <div className="text-slate-400 text-[10px] uppercase font-sans">Distance</div>
            <div className="font-bold text-slate-100 flex items-center gap-1.5">
              <span>{formData.distance || 'N/A'}</span>
              {predictionData?.distanceCategory && (
                <span className="text-[10px] text-amber-400 font-sans font-normal">({predictionData.distanceCategory})</span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-2.5 flex items-center gap-2.5">
          <Award className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <div className="text-slate-400 text-[10px] uppercase font-sans">Track Condition</div>
            <div className="font-bold text-slate-100">{formData.condition || 'Good'}</div>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-2.5 flex items-center gap-2.5">
          <Wind className="w-4 h-4 text-sky-400 shrink-0" />
          <div>
            <div className="text-slate-400 text-[10px] uppercase font-sans">Weather</div>
            <div className="font-bold text-slate-100">{formData.weather || 'Fine'}</div>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-2.5 flex items-center gap-2.5">
          <DollarSign className="w-4 h-4 text-amber-300 shrink-0" />
          <div>
            <div className="text-slate-400 text-[10px] uppercase font-sans">Prize Purse</div>
            <div className="font-bold text-slate-100">{formData.prizeMoney ? `$${Number(formData.prizeMoney).toLocaleString()}` : 'Standard'}</div>
          </div>
        </div>

        <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-2.5 flex items-center gap-2.5">
          <Users className="w-4 h-4 text-purple-400 shrink-0" />
          <div>
            <div className="text-slate-400 text-[10px] uppercase font-sans">Effective Field</div>
            <div className="font-bold text-slate-100">{effectiveField} / {formData.runners?.length || 0} Runners</div>
          </div>
        </div>

        {/* Venue Timezone / Start Time Badge */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-lg p-2.5 flex items-center gap-2.5">
          <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
          <div>
            <div className="text-slate-400 text-[10px] uppercase font-sans">Timezone & Place</div>
            <div className="font-bold text-slate-100 text-[11px] truncate">
              {formData.timezone ? formData.timezone.split('/').pop().replace(/_/g, ' ') : (formData.country ? formData.country.toUpperCase() : 'Live')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
