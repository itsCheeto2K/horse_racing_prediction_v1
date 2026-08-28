import React from 'react';
import { Trophy, TrendingUp, Sparkles, Crosshair, Award, Shield, ChevronRight, Ban } from 'lucide-react';

export default function PredictionMatrix({ predictions, rawRunners, onSelectRunner }) {
  if (!predictions || predictions.length === 0) {
    return (
      <div className="bg-[#131b2e] border border-slate-800 rounded-xl p-8 text-center text-slate-400">
        <p>No predictions available for this race.</p>
      </div>
    );
  }

  // Create a lookup for raw runner form details (stats, career prize money, last 20 starts)
  const runnerLookup = {};
  if (rawRunners) {
    rawRunners.forEach(r => {
      runnerLookup[r.number] = r;
    });
  }

  return (
    <div className="bg-[#131b2e] border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Matrix Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Ensemble & C++ Monte Carlo Prediction Matrix
          </h2>
          <p className="text-xs text-slate-400">
            Ranked by Composite Ensemble Probability (Monte Carlo + Recency Decay + Bayesian Form + Class Percentile)
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Top Pick</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Value Overlay</span>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/80 text-[11px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <th className="py-3 px-4 text-center">Rank</th>
              <th className="py-3 px-4">Runner & Details</th>
              <th className="py-3 px-3 text-center">Barrier / Wgt</th>
              <th className="py-3 px-4">Win Prob %</th>
              <th className="py-3 px-4">Place Prob %</th>
              <th className="py-3 px-3 text-center">Power Rating</th>
              <th className="py-3 px-4 text-right">Fair Odds</th>
              <th className="py-3 px-4 text-center">Analysis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {predictions.map((pred) => {
              const fullRunner = runnerLookup[pred.runnerNumber] || {};
              const isScratched = pred.isScratched || fullRunner.scratched;
              const displayRank = pred.compositeRank || pred.rank;
              const winProb = pred.compositeWinProbability !== undefined ? pred.compositeWinProbability : pred.winProbability;
              const placeProb = pred.compositePlaceProbability !== undefined ? pred.compositePlaceProbability : pred.placeProbability;
              const fairOdds = pred.compositeFairOdds || pred.fairOdds;

              return (
                <tr
                  key={pred.runnerNumber}
                  className={`transition-colors ${
                    isScratched
                      ? 'bg-red-950/10 opacity-50'
                      : pred.isTopPick
                      ? 'bg-amber-500/5 hover:bg-amber-500/10'
                      : pred.isValuePick
                      ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  {/* Rank Badge */}
                  <td className="py-3.5 px-4 text-center">
                    {isScratched ? (
                      <span className="px-2 py-0.5 rounded bg-red-900/30 text-red-400 text-xs font-mono font-bold">
                        SCR
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-black font-mono text-xs ${
                          displayRank === 1
                            ? 'bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 shadow-md shadow-amber-500/20'
                            : displayRank === 2
                            ? 'bg-slate-700 text-slate-100'
                            : displayRank === 3
                            ? 'bg-amber-900/60 text-amber-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {displayRank}
                      </span>
                    )}
                  </td>

                  {/* Runner Name & Jockey/Trainer */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-start gap-2.5">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-xs font-bold shrink-0 mt-0.5">
                        #{pred.runnerNumber}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => onSelectRunner(fullRunner, pred)}
                            className="font-bold text-slate-100 hover:text-amber-400 text-base text-left transition-colors"
                          >
                            {pred.runnerName}
                          </button>
                          
                          {/* Badges */}
                          {pred.isTopPick && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                              Top Pick
                            </span>
                          )}
                          {pred.isValuePick && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                              Value Bet
                            </span>
                          )}
                          {pred.isDarkHorse && (
                            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                              Dark Horse
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2">
                          <span>J: <strong className="text-slate-300">{pred.jockey || 'N/A'}</strong></span>
                          <span>&bull;</span>
                          <span>T: <strong className="text-slate-300">{pred.trainer || 'N/A'}</strong></span>
                          {fullRunner.form && (
                            <>
                              <span>&bull;</span>
                              <span className="font-mono text-amber-400/90 font-semibold">Form: {fullRunner.form}</span>
                            </>
                          )}
                        </div>

                        {/* Factor Badges */}
                        {pred.badges && pred.badges.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {pred.badges.map((b, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800/90 text-slate-300 border border-slate-700">
                                {b}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Barrier & Weight */}
                  <td className="py-3.5 px-3 text-center font-mono text-xs text-slate-300">
                    <div>B: <strong className="text-white">{pred.barrier || '-'}</strong></div>
                    <div className="text-[11px] text-slate-400">{pred.weight ? `${pred.weight}kg` : '-'}</div>
                  </td>

                  {/* Win Probability % Bar */}
                  <td className="py-3.5 px-4 min-w-[120px]">
                    {isScratched ? (
                      <span className="text-slate-500 text-xs">-</span>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-mono">
                          <span className="font-bold text-slate-100">
                            {(winProb * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              displayRank === 1
                                ? 'bg-gradient-to-r from-amber-500 to-amber-300'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(2, winProb * 100))}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Place Probability % Bar */}
                  <td className="py-3.5 px-4 min-w-[110px]">
                    {isScratched ? (
                      <span className="text-slate-500 text-xs">-</span>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-mono">
                          <span className="font-bold text-slate-300">
                            {(placeProb * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full bg-sky-500 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(2, placeProb * 100))}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Power Rating */}
                  <td className="py-3.5 px-3 text-center">
                    {isScratched ? (
                      <span className="text-slate-500 text-xs">-</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800/90 text-slate-100 font-mono font-black text-xs border border-slate-700">
                        {pred.powerRating}
                      </span>
                    )}
                  </td>

                  {/* Calculated Fair Odds */}
                  <td className="py-3.5 px-4 text-right font-mono">
                    {isScratched ? (
                      <span className="text-slate-500 text-xs">-</span>
                    ) : (
                      <div>
                        <span className="text-base font-bold text-emerald-400">
                          ${fairOdds?.toFixed(2) || '0.00'}
                        </span>
                        <div className="text-[10px] text-slate-400">Fair Value</div>
                      </div>
                    )}
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => onSelectRunner(fullRunner, pred)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Inspect Subscores & Form Profile"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
