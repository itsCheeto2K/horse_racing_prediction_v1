import React, { useState } from 'react';
import { Sliders, RefreshCw, Cpu, CheckCircle2, RotateCcw } from 'lucide-react';

export default function ModelTuner({
  currentWeights,
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

  const handleSliderChange = (key, value) => {
    setWeights(prev => ({
      ...prev,
      [key]: Number(value)
    }));
  };

  const handleReset = () => {
    setWeights(defaultWeights);
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

  return (
    <div className="bg-[#131b2e] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-amber-400" />
          <h3 className="font-bold text-white text-base">C++ OOP Model Tuner Studio</h3>
        </div>
        <button
          onClick={handleReset}
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        Tune the Object-Oriented feature strategy weights and re-execute the Monte Carlo stochastic engine in real time.
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
