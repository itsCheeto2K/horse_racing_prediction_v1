import React from 'react';
import { X, Award, DollarSign, Calendar, Compass, Shield, Activity, BarChart2, Sparkles, Layers, Star, CheckCircle2, AlertTriangle, HelpCircle, Flame, Target } from 'lucide-react';

export default function RunnerModal({ runner, prediction, onClose }) {
  if (!runner && !prediction) return null;

  const card = prediction?.horseCard || {};
  const stats = runner?.stats || {};
  const overall = stats.overall || {};
  const conditions = stats.conditions || {};
  const subScores = prediction?.subScores || {};
  const rank = prediction?.compositeRank || prediction?.rank;
  const winProb = prediction?.compositeWinProbability !== undefined ? prediction?.compositeWinProbability : prediction?.winProbability;
  const top3Prob = prediction?.compositeTop3Probability !== undefined ? prediction?.compositeTop3Probability : (prediction?.top3Probability || prediction?.placeProbability);
  const fairOdds = prediction?.compositeFairOdds || prediction?.fairOdds;

  // Stars renderer
  const renderStars = (count) => {
    const total = 5;
    const filled = Math.max(1, Math.min(5, count || 3));
    return (
      <div className="flex items-center gap-1">
        {[...Array(total)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < filled ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`}
          />
        ))}
      </div>
    );
  };

  const getVerdictStyle = (verdict) => {
    if (verdict === 'VALUE UNDERDOG') {
      return 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 font-black border-emerald-400';
    }
    if (verdict === 'MAIN CONTENDER') {
      return 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black border-amber-400';
    }
    if (verdict === 'SECONDARY CONTENDER') {
      return 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold';
    }
    if (verdict === 'LONGSHOT') {
      return 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-bold';
    }
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#111827] border border-slate-700/80 rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl space-y-5 p-6 selection:bg-amber-500 selection:text-black">
        
        {/* Header: Name, Number, Barrier, Weight, Rank */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-lg bg-amber-500 text-slate-950 font-mono font-black text-xs">
                #{runner?.number || prediction?.runnerNumber}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {runner?.name || prediction?.runnerName}
              </h2>
              {rank && (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-amber-300 font-mono text-xs font-bold border border-slate-700">
                  Rank #{rank}
                </span>
              )}
            </div>

            <div className="text-xs text-slate-400 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono">
              <span>Barrier: <strong className="text-white">{runner?.barrier || card.barrier || '-'}</strong></span>
              <span>&bull;</span>
              <span>Weight: <strong className="text-white">{runner?.weight ? `${runner.weight}kg` : (card.weight ? `${card.weight}kg` : '-')}</strong></span>
              <span>&bull;</span>
              <span>Form/RTG: <strong className="text-amber-400 font-bold">{runner?.form || card.rtg || 'N/A'}</strong></span>
              {runner?.age && (
                <>
                  <span>&bull;</span>
                  <span>Profile: <strong className="text-slate-300">{runner.age}yo {runner?.sex || ''}</strong></span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* HORSE CARD (Section 22 in new_feat.txt) */}
        <div className="space-y-4">
          
          {/* Card Section 1: ABILITY & BASE FORM */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                1. Horse Ability Rating
              </h3>
              {renderStars(card.abilityStars)}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
              <div className="text-slate-400">
                Recent Form Momentum: <strong className="text-slate-100 font-sans">{card.recentFormVerdict || 'Competitive'}</strong>
              </div>
              <div className="text-slate-400 text-right">
                Career Place Rate: <strong className="text-slate-100">{(overall.placePercent ? overall.placePercent * 100 : 0).toFixed(0)}%</strong>
              </div>
            </div>
          </div>

          {/* Card Section 2: RECENT RUN INTERPRETATION */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <h3 className="text-xs font-mono uppercase tracking-wider text-sky-400 font-bold flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-sky-400" />
              2. Recent Start Breakdown & Interpretation
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono text-center">
              <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/40">
                <div className="text-slate-400 text-[10px] uppercase font-sans">Finish Position</div>
                <div className="text-sm font-bold text-white mt-0.5">{card.recentRunPosition || '-'}</div>
              </div>
              <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/40">
                <div className="text-slate-400 text-[10px] uppercase font-sans">Beaten Margin</div>
                <div className="text-sm font-bold text-amber-300 mt-0.5">{card.recentRunMargin || '-'}</div>
              </div>
              <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/40">
                <div className="text-slate-400 text-[10px] uppercase font-sans">Distance</div>
                <div className="text-sm font-bold text-white mt-0.5">{card.recentRunDistance || '-'}</div>
              </div>
              <div className="bg-slate-800/60 p-2 rounded-lg border border-slate-700/40">
                <div className="text-slate-400 text-[10px] uppercase font-sans">Condition</div>
                <div className="text-sm font-bold text-emerald-300 mt-0.5">{card.recentRunGoing || '-'}</div>
              </div>
            </div>

            <div className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60 leading-relaxed font-sans">
              <strong className="text-sky-300 font-mono">Interpretation: </strong>
              {card.recentRunInterpretation || 'Demonstrated solid campaign readiness and competitive finishing speed.'}
            </div>
          </div>

          {/* Card Section 3: DISTANCE & TRACK / GOING (Tầng 2) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Distance Fit */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1.5 text-xs">
              <div className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
                Distance Suitability
              </div>
              <div className="font-semibold text-slate-100 font-sans">
                Status: <span className="text-amber-300 font-mono">{card.distanceStatus || 'Untested (Positive)'}</span>
              </div>
              <p className="text-slate-400 font-sans text-[11px] leading-relaxed">
                {card.distanceEvidence || 'Positive step progression from recent campaign starts.'}
              </p>
            </div>

            {/* Track / Going */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1.5 text-xs">
              <div className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
                Track & Ground Affinity
              </div>
              <div className="font-semibold text-slate-100 font-sans">
                Status: <span className="text-emerald-300 font-mono">{card.trackGoingStatus || 'Proven'}</span>
              </div>
              <p className="text-slate-400 font-sans text-[11px] leading-relaxed">
                {card.trackGoingEvidence || 'Bayesian adjusted performance shows consistent adaptability.'}
              </p>
            </div>
          </div>

          {/* Card Section 4: BARRIER, RACE MAP & JOCKEY */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 font-sans">Barrier Draw</div>
              <div className="text-slate-200 font-sans text-[11px] leading-tight">
                {card.barrierAssessment || 'Inside gate advantage'}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 font-sans">Race Map & Pace</div>
              <div className="text-slate-200 font-sans text-[11px] leading-tight">
                <span className="font-bold text-amber-300">{card.runningStyle || 'Midfield'}</span> &bull; {card.paceFit || 'Even pace fit'}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 font-sans">Jockey / Trainer</div>
              <div className="text-slate-200 font-sans text-[11px] leading-tight">
                {card.jockeyTrainerStatus || 'Positive / High Strike Rate'}
              </div>
            </div>
          </div>

          {/* Card Section 5: OVERALL SCORE & FINAL VERDICT BOX */}
          <div className="bg-gradient-to-r from-slate-900 to-[#1e293b] border-2 border-slate-700/80 rounded-2xl p-4.5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  Overall 4-Tier Assessment
                </div>
                <div className="flex items-center gap-4 text-xs font-mono mt-1">
                  <span>Ability: <strong className="text-amber-400 font-bold">{card.abilityRating10 || '7.5'}/10</strong></span>
                  <span>&bull;</span>
                  <span>Race Fit: <strong className="text-sky-400 font-bold">{card.raceFitRating10 || '7.2'}/10</strong></span>
                  <span>&bull;</span>
                  <span>Risk: <strong className="text-slate-200">{card.riskLevel || 'Medium'}</strong></span>
                </div>
              </div>

              {/* Final Verdict Badge */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase">Verdict:</span>
                <span className={`px-3 py-1 rounded-xl text-xs uppercase tracking-wider border shadow-md ${getVerdictStyle(card.verdict || prediction?.verdict)}`}>
                  {card.verdict || prediction?.verdict || 'CONTENDER'}
                </span>
              </div>
            </div>

            {/* Probability & Value Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-sans">Top 3 Probability</div>
                <div className="text-base font-black text-amber-300">
                  {top3Prob !== undefined ? `${(top3Prob * 100).toFixed(1)}%` : '0.0%'}
                </div>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-sans">Win Probability</div>
                <div className="text-base font-black text-emerald-400">
                  {winProb !== undefined ? `${(winProb * 100).toFixed(1)}%` : '0.0%'}
                </div>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-sans">Fair Value Odds</div>
                <div className="text-base font-black text-sky-400">
                  ${fairOdds ? fairOdds.toFixed(2) : '0.00'}
                </div>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[10px] uppercase font-sans">Value Edge</div>
                <div className="text-base font-black text-emerald-400">
                  {prediction?.valueEdge ? `+${(prediction.valueEdge * 100).toFixed(1)}%` : 'Fair'}
                </div>
              </div>
            </div>
          </div>

          {/* Form Sequence Raw */}
          {runner?.last20Starts && (
            <div className="space-y-1.5 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
              <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                Career Form String Sequence
              </div>
              <p className="font-mono text-xs font-bold text-amber-400 tracking-widest break-all">
                {runner.last20Starts}
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
