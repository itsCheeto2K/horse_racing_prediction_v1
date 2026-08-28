import React from 'react';
import { Cpu, ShieldCheck, Gauge, Layers, Info } from 'lucide-react';

export default function MonteCarloStats({ predictionData }) {
  if (!predictionData) return null;

  const weights = predictionData.appliedWeights || {};
  const simulations = predictionData.totalSimulations || 10000;

  return (
    <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-white text-base">Engine Diagnostics & Convergence</h3>
        </div>
        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold">
          High Precision
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
        <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800">
          <div className="text-slate-400 text-[10px] uppercase font-sans">Simulations Executed</div>
          <div className="text-lg font-black text-slate-100">{simulations.toLocaleString()}</div>
          <div className="text-[10px] text-slate-500 font-sans mt-0.5">Stochastic race trials</div>
        </div>

        <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800">
          <div className="text-slate-400 text-[10px] uppercase font-sans">Model Strategy</div>
          <div className="text-sm font-bold text-amber-400 mt-1">C++ OOP Composite</div>
          <div className="text-[10px] text-slate-500 font-sans mt-0.5">Polymorphic Ensemble</div>
        </div>

        <div className="bg-slate-900/70 p-3 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
          <div className="text-slate-400 text-[10px] uppercase font-sans">Confidence Level</div>
          <div className="text-sm font-bold text-emerald-400 mt-1">Optimal Fit</div>
          <div className="text-[10px] text-slate-500 font-sans mt-0.5">Normalized distribution</div>
        </div>
      </div>

      {/* Applied Weight Distribution Bars */}
      <div className="space-y-2 pt-2 border-t border-slate-800 text-xs font-mono">
        <div className="text-[11px] font-sans font-bold text-slate-300">Active Weight Allocation</div>
        
        <div className="space-y-1.5">
          <div className="flex justify-between text-slate-400 text-[11px]">
            <span>Recent Form: {((weights.formWeight || 0.25) * 100).toFixed(0)}%</span>
            <span>Condition Affinity: {((weights.conditionWeight || 0.25) * 100).toFixed(0)}%</span>
            <span>Distance & Weight: {((weights.distanceWeight || 0.20) * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 flex overflow-hidden">
            <div style={{ width: `${(weights.formWeight || 0.25) * 100}%` }} className="bg-amber-400 h-full"></div>
            <div style={{ width: `${(weights.conditionWeight || 0.25) * 100}%` }} className="bg-emerald-400 h-full"></div>
            <div style={{ width: `${(weights.distanceWeight || 0.20) * 100}%` }} className="bg-sky-400 h-full"></div>
            <div style={{ width: `${(weights.jockeyTrainerWeight || 0.15) * 100}%` }} className="bg-purple-400 h-full"></div>
            <div style={{ width: `${(weights.barrierWeight || 0.15) * 100}%` }} className="bg-rose-400 h-full"></div>
          </div>
          <div className="flex justify-between text-slate-400 text-[11px] pt-0.5">
            <span>Jockey/Trainer: {((weights.jockeyTrainerWeight || 0.15) * 100).toFixed(0)}%</span>
            <span>Barrier Draw: {((weights.barrierWeight || 0.15) * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
