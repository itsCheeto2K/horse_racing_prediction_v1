import React, { useState } from 'react';
import { X, Zap, Award, AlertCircle, CheckCircle2, Brain, RefreshCw, ArrowRight } from 'lucide-react';
import { submitPostMortem } from '../services/api';

export default function PostRaceLearningModal({
  isOpen,
  onClose,
  raceData,
  onLearningCompleted
}) {
  if (!isOpen || !raceData) return null;

  const form = raceData.form || {};
  const prediction = raceData.prediction || {};
  const predictionsList = prediction.predictions || [];
  const activeRunners = predictionsList.filter(p => !p.isScratched);

  const [firstPlace, setFirstPlace] = useState('');
  const [secondPlace, setSecondPlace] = useState('');
  const [thirdPlace, setThirdPlace] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [learningResult, setLearningResult] = useState(null);
  const [error, setError] = useState(null);

  // Auto pre-fill with predicted top 3 as suggestions
  const topPicks = activeRunners.slice(0, 3);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firstPlace || !secondPlace || !thirdPlace) {
      setError('Vui lòng chọn hoặc nhập đủ Top 3 con ngựa về đích (1st, 2nd, 3rd).');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const raceInfo = {
      date: form.date || new Date().toISOString().split('T')[0],
      track: form.track || 'Track',
      raceNumber: form.raceNumber || 1,
      distance: form.distance || 1200,
      condition: form.going || form.condition || 'Good 4'
    };

    const predictedTop3 = topPicks.map(p => ({
      runnerNumber: p.runnerNumber,
      runnerName: p.runnerName
    }));

    const actualTop3 = [
      { runnerNumber: 0, runnerName: firstPlace },
      { runnerNumber: 0, runnerName: secondPlace },
      { runnerNumber: 0, runnerName: thirdPlace }
    ];

    try {
      const res = await submitPostMortem(raceInfo, predictedTop3, actualTop3, activeRunners);
      setLearningResult(res);
      if (onLearningCompleted) {
        onLearningCompleted(res);
      }
    } catch (err) {
      console.error('Post-mortem error:', err);
      setError(err.message || 'Không thể gửi kết quả để AI tự học.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5 text-slate-100 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono">
              🏁 Nhập Kết Quả & AI Tự Học (Post-Mortem)
            </h2>
            <p className="text-xs text-slate-400">
              {form.track} - Race {form.raceNumber} ({form.distance}m, {form.going || form.condition || 'Good'})
            </p>
          </div>
        </div>

        {/* Form or Result View */}
        {!learningResult ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="text-xs font-mono text-slate-300">
                Nhập tên hoặc chọn Top 3 chiến kê về đích thực tế:
              </div>

              {/* 1st Place */}
              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400" />
                  🥇 Về Nhất (1st Place):
                </label>
                <input
                  type="text"
                  list="runner-options"
                  placeholder="Chọn hoặc nhập tên ngựa về nhất..."
                  value={firstPlace}
                  onChange={(e) => setFirstPlace(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* 2nd Place */}
              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-slate-300" />
                  🥈 Về Nhì (2nd Place):
                </label>
                <input
                  type="text"
                  list="runner-options"
                  placeholder="Chọn hoặc nhập tên ngựa về nhì..."
                  value={secondPlace}
                  onChange={(e) => setSecondPlace(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* 3rd Place */}
              <div className="space-y-1">
                <label className="text-xs font-mono font-bold text-amber-600 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-600" />
                  🥉 Về Ba (3rd Place):
                </label>
                <input
                  type="text"
                  list="runner-options"
                  placeholder="Chọn hoặc nhập tên ngựa về ba..."
                  value={thirdPlace}
                  onChange={(e) => setThirdPlace(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Datalist for autocomplete from active runners */}
              <datalist id="runner-options">
                {activeRunners.map((r, i) => (
                  <option key={i} value={r.runnerName}>
                    #{r.runnerNumber} {r.runnerName}
                  </option>
                ))}
              </datalist>
            </div>

            {/* Quick prefill buttons */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-mono">Gợi ý dự đoán trước trận:</span>
              <button
                type="button"
                onClick={() => {
                  if (topPicks[0]) setFirstPlace(topPicks[0].runnerName);
                  if (topPicks[1]) setSecondPlace(topPicks[1].runnerName);
                  if (topPicks[2]) setThirdPlace(topPicks[2].runnerName);
                }}
                className="text-sky-400 hover:underline font-mono"
              >
                [Điền theo Top 3 Dự Đoán]
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-xs text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold font-mono rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : 'active:scale-98'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Gemini AI Đang Phân Tích Sai Lầm & Rút Bài Học...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-slate-950" />
                  <span>⚡ Gửi Kết Quả & AI Tự Học (Post-Mortem)</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* Learning Result Display */
          <div className="space-y-4">
            {/* Accuracy Badge */}
            <div className={`p-4 rounded-xl border ${
              learningResult.evaluation?.win_hit 
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                : 'bg-amber-950/40 border-amber-500/50 text-amber-200'
            }`}>
              <div className="flex items-center gap-2 font-mono font-bold text-sm mb-1">
                {learningResult.evaluation?.win_hit ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-400" />
                )}
                <span>
                  {learningResult.evaluation?.win_hit 
                    ? '🎯 DỰ ĐOÁN CHÍNH XÁC QUÁN QUÂN (1st WINNER HIT!)' 
                    : '🔍 TRẬN ĐẤU CÓ BẤT NGỜ / TRƯỢT KÈO (AI AUDIT TRIGGERED)'}
                </span>
              </div>
              <div className="text-xs space-y-0.5 font-mono text-slate-300">
                <div>Top 3 lọt vào thực tế: <strong>{learningResult.evaluation?.top3_hits}/3</strong></div>
                <div>Trạng thái: <strong className="text-white">{learningResult.post_mortem?.outcomeVerdict}</strong></div>
              </div>
            </div>

            {/* Root Cause Analysis */}
            {learningResult.post_mortem?.rootCauseAnalysis && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1.5 text-xs">
                <div className="text-sky-400 font-mono font-bold uppercase tracking-wider">
                  🔬 Phân Tích Nguyên Nhân (Root Cause):
                </div>
                <p className="text-slate-300 leading-relaxed font-sans">
                  {learningResult.post_mortem.rootCauseAnalysis}
                </p>
              </div>
            )}

            {/* Key Missed Factors */}
            {learningResult.post_mortem?.keyMissedFactors?.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-1.5 text-xs">
                <div className="text-amber-400 font-mono font-bold uppercase tracking-wider">
                  ⚠️ Yếu Tố Bị Bỏ Qua / Bất Ngờ:
                </div>
                <ul className="text-slate-300 space-y-1 list-disc list-inside font-sans">
                  {learningResult.post_mortem.keyMissedFactors.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Permanent Lesson Learned */}
            {learningResult.post_mortem?.lessonLearned && (
              <div className="bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border border-purple-500/40 rounded-xl p-4 space-y-2 text-xs">
                <div className="text-purple-300 font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-purple-400" />
                  🧠 BÀI HỌC VĨNH VIỄN ĐÃ LƯU VÀO BỘ NHỚ AI:
                </div>
                <p className="text-white font-semibold leading-relaxed font-sans text-sm bg-black/40 p-3 rounded-lg border border-purple-500/30">
                  "{learningResult.post_mortem.lessonLearned}"
                </p>
                {learningResult.post_mortem?.recommendedWeightAdjustment && (
                  <p className="text-purple-300/80 font-mono text-[11px]">
                    ⚙️ Gợi ý hiệu chỉnh: {learningResult.post_mortem.recommendedWeightAdjustment}
                  </p>
                )}
              </div>
            )}

            {/* Close / Done Button */}
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-mono font-bold rounded-xl transition-colors text-xs"
            >
              Hoàn Tất & Đóng
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
