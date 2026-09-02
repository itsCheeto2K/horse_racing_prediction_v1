import React from 'react';
import { Trophy, TrendingUp, Sparkles, Crosshair, Award, Shield, ChevronRight, Ban, Zap, Compass, FileText } from 'lucide-react';

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

  const getStyleBadge = (style) => {
    switch (style) {
      case 'Leader':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'On-pace':
        return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
      case 'Midfield':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'Backmarker':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const formatTierLabel = (tier) => {
    if (!tier) return 'Tier B';
    if (tier.includes('Tier A')) return 'Tier A';
    if (tier.includes('Tier B')) return 'Tier B';
    if (tier.includes('Tier C')) return 'Tier C';
    if (tier.includes('Tier D')) return 'Tier D';
    if (tier.includes('-')) return tier.split('-')[0].trim();
    return tier;
  };

  const getTierBadge = (tier) => {
    if (!tier) return 'bg-slate-800 text-slate-400 border-slate-700';
    if (tier.includes('Tier A')) {
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    }
    if (tier.includes('Tier B')) {
      return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    }
    if (tier.includes('Tier C')) {
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold';
    }
    if (tier.includes('Tier D')) {
      return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
    }
    return 'bg-slate-800 text-slate-400 border-slate-700';
  };

  const getVerdictBadge = (verdict, isValuePick) => {
    if (verdict === 'VALUE UNDERDOG' || isValuePick) {
      return 'bg-emerald-500 text-slate-950 font-black shadow-sm shadow-emerald-500/30';
    }
    if (verdict === 'MAIN CONTENDER') {
      return 'bg-amber-500 text-slate-950 font-black shadow-sm shadow-amber-500/30';
    }
    if (verdict === 'SECONDARY CONTENDER') {
      return 'bg-sky-500/20 text-sky-300 border border-sky-500/40';
    }
    if (verdict === 'LONGSHOT') {
      return 'bg-purple-500/20 text-purple-300 border border-purple-500/40';
    }
    return 'bg-slate-800 text-slate-400 border border-slate-700';
  };

  return (
    <div className="bg-[#131b2e] border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Matrix Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            4-Tier Pipeline & Top 3 Prediction Matrix
          </h2>
          <p className="text-xs text-slate-400">
            Ability (T1) &bull; Race Fit (T2) &bull; Race Map Dynamics (T3) &bull; Value Edge & Top 3 Probability (T4)
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Main Contender</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Value Underdog</span>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/80 text-[11px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <th className="py-3 px-4 text-center">Rank</th>
              <th className="py-3 px-4">Runner & Tactical Style</th>
              <th className="py-3 px-3 text-center">Tier</th>
              <th className="py-3 px-3 text-center">Ability (T1)</th>
              <th className="py-3 px-3 text-center">Race Fit (T2)</th>
              <th className="py-3 px-4">Top 3 Prob %</th>
              <th className="py-3 px-4 text-right">Fair Odds</th>
              <th className="py-3 px-3 text-center">Verdict</th>
              <th className="py-3 px-4 text-center">Horse Card</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm">
            {predictions.map((pred) => {
              const fullRunner = runnerLookup[pred.runnerNumber] || {};
              const isScratched = pred.isScratched || fullRunner.scratched;
              const displayRank = pred.compositeRank || pred.rank;
              const top3Prob = pred.compositeTop3Probability !== undefined ? pred.compositeTop3Probability : (pred.top3Probability || pred.placeProbability || 0.0);
              const winProb = pred.compositeWinProbability !== undefined ? pred.compositeWinProbability : pred.winProbability;
              const fairOdds = pred.compositeFairOdds || pred.fairOdds;
              const abilityScore = pred.abilityScore || pred.subScores?.abilityScore || pred.powerRating;
              const raceFitScore = pred.raceFitScore || pred.subScores?.raceFitScore || pred.featureScores?.distanceScore;
              const runningStyle = pred.runningStyle || pred.horseCard?.runningStyle || 'Midfield';
              const verdict = pred.verdict || (pred.isTopPick ? 'MAIN CONTENDER' : (pred.isValuePick ? 'VALUE UNDERDOG' : 'CONTENDER'));

              return (
                <tr
                  key={pred.runnerNumber}
                  className={`transition-colors ${
                    isScratched
                      ? 'bg-red-950/10 opacity-50'
                      : pred.isTopPick
                      ? 'bg-amber-500/5 hover:bg-amber-500/10'
                      : pred.isValuePick || pred.isBestUnderdog
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

                  {/* Runner Name & Details */}
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
                          
                          {/* Tactical Running Style Tag */}
                          {!isScratched && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${getStyleBadge(runningStyle)}`}>
                              {runningStyle}
                            </span>
                          )}

                          {/* Value Edge Badge if present */}
                          {pred.valueEdge && pred.valueEdge > 0.05 && (
                            <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold font-mono border border-emerald-500/30">
                              +{(pred.valueEdge * 100).toFixed(0)}% Value Edge
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2 font-mono">
                          <span>B: <strong className="text-slate-200">{pred.barrier || '-'}</strong></span>
                          <span>&bull;</span>
                          <span>W: <strong className="text-slate-200">{pred.weight ? `${pred.weight}kg` : '-'}</strong></span>
                          <span>&bull;</span>
                          <span>J: <strong className="text-slate-300">{pred.jockey || 'N/A'}</strong></span>
                          {fullRunner.form && (
                            <>
                              <span>&bull;</span>
                              <span className="text-amber-400/90 font-semibold">Form: {fullRunner.form}</span>
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

                  {/* Tier */}
                  <td className="py-3.5 px-3 text-center">
                    {isScratched ? (
                      <span className="text-slate-500 text-xs">-</span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getTierBadge(pred.tier)}`}>
                        {formatTierLabel(pred.tier)}
                      </span>
                    )}
                  </td>

                  {/* Ability Score (T1) */}
                  <td className="py-3.5 px-3 text-center font-mono">
                    {isScratched ? (
                      <span className="text-slate-500 text-xs">-</span>
                    ) : (
                      <div>
                        <span className="text-xs font-bold text-amber-300">
                          {Number(abilityScore).toFixed(1)}
                        </span>
                        <div className="text-[9px] text-slate-500">/ 100</div>
                      </div>
                    )}
                  </td>

                  {/* Race Fit Score (T2) */}
                  <td className="py-3.5 px-3 text-center font-mono">
                    {isScratched ? (
                      <span className="text-slate-500 text-xs">-</span>
                    ) : (
                      <div>
                        <span className="text-xs font-bold text-sky-300">
                          {Number(raceFitScore).toFixed(1)}
                        </span>
                        <div className="text-[9px] text-slate-500">/ 100</div>
                      </div>
                    )}
                  </td>

                  {/* Top 3 Probability % Bar */}
                  <td className="py-3.5 px-4 min-w-[130px]">
                    {isScratched ? (
                      <span className="text-slate-500 text-xs">-</span>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs font-mono">
                          <span className="font-bold text-slate-100">
                            {(top3Prob * 100).toFixed(1)}%
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Win: {(winProb * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              displayRank <= 3
                                ? 'bg-gradient-to-r from-amber-500 to-emerald-400'
                                : 'bg-sky-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(3, top3Prob * 100))}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </td>

                  {/* Fair Odds */}
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

                  {/* Verdict Tag */}
                  <td className="py-3.5 px-3 text-center">
                    {isScratched ? (
                      <span className="text-slate-500 text-xs">SCR</span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-mono ${getVerdictBadge(verdict, pred.isValuePick)}`}>
                        {verdict}
                      </span>
                    )}
                  </td>

                  {/* Action: View Horse Card */}
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => onSelectRunner(fullRunner, pred)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors inline-flex items-center gap-1 text-xs font-mono"
                      title="Inspect 4-Tier Horse Card"
                    >
                      <FileText className="w-4 h-4 text-amber-400" />
                      <span className="hidden sm:inline">Card</span>
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
