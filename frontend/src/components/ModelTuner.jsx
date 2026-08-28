import React, { useState, useEffect } from 'react';
import { Sliders, RefreshCw, Cpu, CheckCircle2, RotateCcw, Zap, Sparkles } from 'lucide-react';

export default function ModelTuner({
  currentWeights,
  distanceCategory,
  isDynamicWeights,
  onReSimulate,
  isSimulating
}) {
  const defaultWeights = {
    formWeight: 25,
    conditionWeight: 25,
    distanceWeight: 20,
    jockeyTrainerWeight: 15,
    barrierWeight: 15
  };

  const [weights, setWeights] = useState(defaultWeights);
  const [simulations, setSimulations] = useState(10000);

  // Sync state when currentWeights from prediction changes
  useEffect(() => {
    if (currentWeights) {
      setWeights({
        formWeight: Math.round((currentWeights.formWeight || 0.25) * 100),
        conditionWeight: Math.round((currentWeights.conditionWeight || 0.25) * 100),
        distanceWeight: Math.round((currentWeights.distanceWeight || 0.20) * 100),
        jockeyTrainerWeight: Math.round((currentWeights.jockeyTrainerWeight || 0.15) * 100),
        barrierWeight: Math.round((currentWeights.barrierWeight || 0.15) * 100),
      });
    }
  }, [currentWeights]);

  const handleSliderChange = (key, value) => {
    setWeights(prev => ({
      ...prev,
      [key]: Number(value)
    }));
  };

  const handleResetAuto = () => {
    // Passing null weights re-triggers C++ automatic distance weight calculation
    onReSimulate(null, simulations);
  };

  const handlePresetSelect = (presetWeights) => {
    setWeights(presetWeights);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Normalize weights to 0.0 - 1.0
    const sum = weights.formWeight + weights.conditionWeight + weights.distanceWeight + weights.jockeyTrainerWeight + weights.barrierWeight;
    const normalized = {
      formWeight: (weights.formWeight / sum),
      conditionWeight: (weights.conditionWeight / sum),
      distanceWeight: (weights.distanceWeight / sum),
      jockeyTrainerWeight: (weights.jockeyTrainerWeight / sum),
      barrierWeight: (weights.barrierWeight / sum)
    };
    onReSimulate(normalized, simulations);
  };

  const presets = [
    { label: 'Sprint (1000-1200m)', w: { formWeight: 28, conditionWeight: 18, distanceWeight: 17, jockeyTrainerWeight: 15, barrierWeight: 22 } },
    { label: 'Middle (1300-1400m)', w: { formWeight: 25, conditionWeight: 21, distanceWeight: 22, jockeyTrainerWeight: 17, barrierWeight: 15 } },
    { label: 'Mile (1500-1600m)', w: { formWeight: 22, conditionWeight: 24, distanceWeight: 25, jockeyTrainerWeight: 17, barrierWeight: 12 } },
    { label: 'Staying (2000m+)', w: { formWeight: 16, conditionWeight: 27, distanceWeight: 32, jockeyTrainerWeight: 17, barrierWeight: 8 } }
  ];

  return (
    <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-white text-base">C++ OOP Model Tuner Studio</h3>
        </div>
        <button
          type="button"
          onClick={handleResetAuto}
          className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20"
          title="Auto-calculate weights using Australian Racing Distance Curve"
        >
          <Zap className="w-3.5 h-3.5" />
          Auto (Distance)
        </button>
      </div>

      {/* Distance Profile Indicator */}
      <div className="bg-slate-900/80 border border-slate-700/60 rounded-xl p-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-400" />
          <div>
            <span className="text-slate-400">Distance Profile: </span>
            <span className="font-bold text-white font-mono">{distanceCategory || 'AU Standard'}</span>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${isDynamicWeights !== false ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
          {isDynamicWeights !== false ? '⚡ AUTO CALIBRATED' : '🛠️ CUSTOM TUNED'}
        </span>
      </div>

      {/* Quick Distance Presets */}
      <div className="space-y-1.5">
        <span className="text-[11px] text-slate-400 font-sans">Quick Distance Milestones:</span>
        <div className="grid grid-cols-2 gap-1.5">
          {presets.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handlePresetSelect(p.w)}
              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-amber-300 rounded-lg text-[10px] font-mono border border-slate-800 transition-colors text-left truncate"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed pt-1">
        Feature strategy weights are automatically interpolated based on distance. You can also customize them below:
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
        {/* Form Recency */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-slate-300">
            <span className="font-sans font-semibold">Form Recency & Momentum</span>
            <span className="font-bold text-amber-400">{weights.formWeight}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="60"
            value={weights.formWeight}
            onChange={(e) => handleSliderChange('formWeight', e.target.value)}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        {/* Track Condition */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-slate-300">
            <span className="font-sans font-semibold">Track & Ground Condition Affinity</span>
            <span className="font-bold text-emerald-400">{weights.conditionWeight}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="60"
            value={weights.conditionWeight}
            onChange={(e) => handleSliderChange('conditionWeight', e.target.value)}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
          />
        </div>

        {/* Distance & Weight */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-slate-300">
            <span className="font-sans font-semibold">Distance Fit & Weight Advantage</span>
            <span className="font-bold text-sky-400">{weights.distanceWeight}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="60"
            value={weights.distanceWeight}
            onChange={(e) => handleSliderChange('distanceWeight', e.target.value)}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
          />
        </div>

        {/* Jockey / Trainer */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-slate-300">
            <span className="font-sans font-semibold">Jockey Strike Rate & Trainer Form</span>
            <span className="font-bold text-purple-400">{weights.jockeyTrainerWeight}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="60"
            value={weights.jockeyTrainerWeight}
            onChange={(e) => handleSliderChange('jockeyTrainerWeight', e.target.value)}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-400"
          />
        </div>

        {/* Barrier Draw */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-slate-300">
            <span className="font-sans font-semibold">Barrier / Gate Draw Advantage</span>
            <span className="font-bold text-amber-300">{weights.barrierWeight}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="60"
            value={weights.barrierWeight}
            onChange={(e) => handleSliderChange('barrierWeight', e.target.value)}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-300"
          />
        </div>

        {/* Iterations selector */}
        <div className="pt-2 flex items-center justify-between border-t border-slate-800">
          <span className="font-sans text-slate-300">Simulations Count:</span>
          <select
            value={simulations}
            onChange={(e) => setSimulations(Number(e.target.value))}
            className="bg-slate-900 text-slate-200 rounded-lg px-2.5 py-1 border border-slate-700 focus:outline-none focus:border-amber-500 font-mono text-xs"
          >
            <option value={5000}>5,000 Runs</option>
            <option value={10000}>10,000 Runs (Default)</option>
            <option value={25000}>25,000 Runs (High Precision)</option>
          </select>
        </div>

        {/* Submit Re-run Button */}
        <button
          type="submit"
          disabled={isSimulating}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold font-sans flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
          <span>{isSimulating ? 'Running C++ Engine...' : 'Re-Run C++ Monte Carlo'}</span>
        </button>
      </form>
    </div>
  );
}
