import React from 'react';
import { X, Award, DollarSign, Calendar, Compass, Shield, Activity, BarChart2, Sparkles, Layers } from 'lucide-react';

export default function RunnerModal({ runner, prediction, onClose }) {
  if (!runner && !prediction) return null;

  const stats = runner?.stats || {};
  const overall = stats.overall || {};
  const conditions = stats.conditions || {};
  const featureScores = prediction?.featureScores || {};
  const subScores = prediction?.subScores || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#131b2e] border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-5 p-6">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-amber-500 text-slate-950 font-mono font-black text-xs">
                #{runner?.number || prediction?.runnerNumber}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {runner?.name || prediction?.runnerName}
              </h2>
              {prediction?.compositeRank ? (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-500/30">
                  Composite Rank #{prediction.compositeRank}
                </span>
              ) : prediction?.rank && (
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 font-mono text-xs font-bold border border-slate-700">
                  Rank #{prediction.rank}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-x-3">
              <span>Age: <strong className="text-slate-200">{runner?.age || '-'}yo {runner?.sex || ''}</strong></span>
              <span>Sire: <strong className="text-slate-200">{runner?.sire || '-'}</strong></span>
              <span>Dam: <strong className="text-slate-200">{runner?.dam || '-'}</strong></span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Composite Probability & Fair Odds Card */}
        {prediction && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-sky-400" />
                Ensemble Prediction & Monte Carlo Matrix
              </h3>
              {prediction.compositeScore !== undefined && prediction.compositeScore !== null && (
                <span className="text-[11px] font-mono text-slate-400">
                  Composite Score: <strong className="text-white font-bold">{prediction.compositeScore}</strong>
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50">
                <div className="text-slate-400 text-[10px] uppercase font-sans">Ensemble Win %</div>
                <div className="text-base font-black text-emerald-400">
                  {prediction.compositeWinProbability !== undefined
                    ? `${(prediction.compositeWinProbability * 100).toFixed(1)}%`
                    : `${(prediction.winProbability * 100).toFixed(1)}%`}
                </div>
              </div>
              <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50">
                <div className="text-slate-400 text-[10px] uppercase font-sans">Place Prob %</div>
                <div className="text-base font-black text-amber-300">
                  {prediction.compositePlaceProbability !== undefined
                    ? `${(prediction.compositePlaceProbability * 100).toFixed(1)}%`
                    : `${(prediction.placeProbability * 100).toFixed(1)}%`}
                </div>
              </div>
              <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50">
                <div className="text-slate-400 text-[10px] uppercase font-sans">Fair Value Odds</div>
                <div className="text-base font-black text-sky-400">
                  ${(prediction.compositeFairOdds || prediction.fairOdds)?.toFixed(2)}
                </div>
              </div>
              <div className="bg-slate-800/60 p-2.5 rounded-lg border border-slate-700/50">
                <div className="text-slate-400 text-[10px] uppercase font-sans">MC Power Rating</div>
                <div className="text-base font-black text-amber-400">{prediction.powerRating} / 100</div>
              </div>
            </div>

            {/* Sub-Score Breakdown */}
            {subScores && Object.keys(subScores).length > 0 ? (
              <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Ensemble Sub-Score Breakdown (0-100)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Monte Carlo Win Signal:</span>
                    <span className="font-mono font-bold text-slate-100">{subScores.monteCarloScore?.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Recent Form (Recency Decay):</span>
                    <span className="font-mono font-bold text-slate-100">{subScores.recentFormScore?.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Track & Distance (Bayesian):</span>
                    <span className="font-mono font-bold text-slate-100">{subScores.trackDistanceScore?.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Condition Adaptability:</span>
                    <span className="font-mono font-bold text-slate-100">{subScores.conditionScore?.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Class Percentile:</span>
                    <span className="font-mono font-bold text-slate-100">{subScores.classScore?.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span>Consistency Rating:</span>
                    <span className="font-mono font-bold text-slate-100">{subScores.consistencyScore?.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Recent Form Score:</span>
                  <span className="font-mono font-bold text-slate-100">{featureScores.formScore?.toFixed(1)} / 100</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Condition Fit Score:</span>
                  <span className="font-mono font-bold text-slate-100">{featureScores.conditionScore?.toFixed(1)} / 100</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Distance & Weight Score:</span>
                  <span className="font-mono font-bold text-slate-100">{featureScores.distanceScore?.toFixed(1)} / 100</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Career & Track Condition Breakdown */}
        <div className="space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
            Track Conditions Record
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            {['good', 'soft', 'heavy', 'synthetic'].map((cond) => {
              const c = conditions[cond] || {};
              return (
                <div key={cond} className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-center">
                  <div className="text-[11px] font-sans font-bold capitalize text-slate-300">{cond}</div>
                  <div className="text-sm font-black text-slate-100 mt-1">
                    {c.starts ? `${c.wins || 0}-${c.seconds || 0}-${c.thirds || 0} (${c.starts})` : '0-0-0 (0)'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Win: {c.winPercent ? `${(c.winPercent * 100).toFixed(0)}%` : '0%'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form History */}
        {runner?.last20Starts && (
          <div className="space-y-2 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
              Recent Starts Sequence
            </h3>
            <p className="font-mono text-sm font-bold text-amber-400 tracking-widest break-all">
              {runner.last20Starts}
            </p>
            {runner.careerPrizeMoney && (
              <p className="text-xs text-slate-400 font-mono">
                Career Prize Money: <strong className="text-slate-200">{runner.careerPrizeMoney}</strong>
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
