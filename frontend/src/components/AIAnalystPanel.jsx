import React from 'react';
import { Sparkles, Brain, Award, AlertTriangle, ShieldCheck, RefreshCw, Zap, KeyRound } from 'lucide-react';

export default function AIAnalystPanel({
  aiAnalysis,
  isLoadingAI,
  onGenerateAI,
  onOpenPostRaceModal,
  onOpenMemoryModal,
  onOpenGeminiKeyModal,
  hasGeminiKey = false,
  memoryCount = 0
}) {
  return (
    <div className="bg-gradient-to-br from-[#101828] via-[#0d1527] to-[#121f3d] border border-sky-500/30 rounded-2xl p-5 shadow-xl space-y-4 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-sky-500/20 rounded-xl border border-sky-400/30 text-sky-400">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide uppercase font-mono">
                Gemini AI Race Strategy
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 rounded-full flex items-center gap-1">
                <Brain className="w-3 h-3" /> Auto-Memory
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Deep tactical analysis conditioned on accumulated past race lessons
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Gemini Key Config Button */}
          <button
            onClick={onOpenGeminiKeyModal}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-1.5 shadow-sm border ${
              hasGeminiKey
                ? 'bg-slate-800/80 hover:bg-slate-700/80 text-sky-300 border-slate-700 hover:border-sky-500/40'
                : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40 animate-pulse'
            }`}
            title="Nhập và kích hoạt Google Gemini API Key"
          >
            <KeyRound className={`w-3.5 h-3.5 ${hasGeminiKey ? 'text-sky-400' : 'text-amber-400'}`} />
            <span>{hasGeminiKey ? 'Gemini Key' : '🔑 Nhập Key'}</span>
          </button>

          {/* AI Memory Button */}
          <button
            onClick={onOpenMemoryModal}
            className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 text-sky-300 border border-slate-700 hover:border-sky-500/40 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-1.5 shadow-sm"
            title="Xem toàn bộ bài học và quy tắc đã lưu trong bộ nhớ AI"
          >
            <Brain className="w-3.5 h-3.5 text-sky-400" />
            <span>Bộ nhớ AI</span>
            {memoryCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] bg-sky-500 text-slate-950 font-bold rounded-full">
                {memoryCount}
              </span>
            )}
          </button>

          {/* Post Race Feedback Button */}
          <button
            onClick={onOpenPostRaceModal}
            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:border-amber-400/50 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-1.5 shadow-sm"
            title="Nhập kết quả thực tế sau trận để AI tự học và rút kinh nghiệm"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Nhập KQ & Dạy AI</span>
          </button>

          {/* Trigger / Refresh Analysis Button */}
          <button
            onClick={onGenerateAI}
            disabled={isLoadingAI}
            className={`px-3.5 py-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-mono text-xs font-bold rounded-xl shadow-lg shadow-sky-500/20 transition-all flex items-center gap-1.5 ${
              isLoadingAI ? 'opacity-70 cursor-not-allowed' : 'active:scale-95'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAI ? 'animate-spin' : ''}`} />
            <span>{aiAnalysis ? 'Cập nhật AI' : '✨ Phân tích AI'}</span>
          </button>
        </div>
      </div>

      {/* Body Content */}
      {isLoadingAI ? (
        <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800 space-y-3">
          <RefreshCw className="w-7 h-7 mx-auto text-sky-400 animate-spin" />
          <p className="text-sm font-semibold text-slate-200">
            Gemini AI đang nạp bài học quá khứ và phân tích chiến thuật cuộc đua...
          </p>
          <p className="text-xs text-slate-400 font-mono">
            Evaluating Monte Carlo probabilities, track pace, and runner form
          </p>
        </div>
      ) : aiAnalysis ? (
        <div className="space-y-4 pt-1">
          {/* Tactical Summary */}
          {aiAnalysis.raceTacticalSummary && (
            <div className="p-3.5 bg-slate-900/90 border border-slate-700/60 rounded-xl text-xs text-slate-200 leading-relaxed font-sans shadow-sm">
              <strong className="text-sky-300 font-mono uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400" /> Nhận định Chiến thuật & Mặt sân:
              </strong>
              {aiAnalysis.raceTacticalSummary}
            </div>
          )}

          {/* Top 3 AI Picks & Value Bet Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Top Picks Box */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <div className="text-[11px] font-mono font-bold uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                Lựa Chọn Hàng Đầu Của AI
              </div>
              <div className="space-y-2">
                {aiAnalysis.topPicks?.map((pick, idx) => (
                  <div key={idx} className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-xs">
                    <div className="flex items-center justify-between font-mono font-bold text-slate-200 mb-1">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                          idx === 0 ? 'bg-amber-500 text-black font-extrabold' :
                          idx === 1 ? 'bg-slate-400 text-black font-bold' :
                          'bg-amber-700 text-white font-bold'
                        }`}>
                          {pick.rank || idx + 1}
                        </span>
                        <span>#{pick.runnerNumber} {pick.runnerName}</span>
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px] font-sans leading-relaxed">
                      {pick.reasoning}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Value Bet & Memory Insights */}
            <div className="space-y-3">
              {/* Value Bet */}
              {aiAnalysis.valueBet && (
                <div className="bg-slate-900/80 border border-emerald-500/30 rounded-xl p-3.5 space-y-1.5">
                  <div className="text-[11px] font-mono font-bold uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    Kèo Giá Trị Cao (Value Pick)
                  </div>
                  <div className="font-mono font-bold text-emerald-200 text-xs">
                    #{aiAnalysis.valueBet.runnerNumber} {aiAnalysis.valueBet.runnerName}
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed font-sans">
                    {aiAnalysis.valueBet.edgeReason}
                  </p>
                </div>
              )}

              {/* Applied Memory Insights */}
              {aiAnalysis.appliedMemoryInsights && aiAnalysis.appliedMemoryInsights.length > 0 && (
                <div className="bg-slate-900/80 border border-purple-500/30 rounded-xl p-3.5 space-y-1.5">
                  <div className="text-[11px] font-mono font-bold uppercase text-purple-300 tracking-wider flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-purple-400" />
                    Bài Học Quá Khứ Áp Dụng:
                  </div>
                  <ul className="text-slate-300 text-[11px] font-sans space-y-1 list-disc list-inside">
                    {aiAnalysis.appliedMemoryInsights.map((insight, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800/80 flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Brain className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              Bấm nút <strong>"✨ Phân tích AI"</strong> để Gemini đọc toàn bộ thông số và tạo nhận định cá nhân hóa cho từng ngựa kèm bài học quá khứ.
            </span>
          </div>
          {!hasGeminiKey && (
            <button
              onClick={onOpenGeminiKeyModal}
              className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Chưa nhập Key? Kích hoạt ngay</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
