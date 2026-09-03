import React, { useState, useEffect } from 'react';
import { X, Brain, Trash2, RotateCcw, Award, CheckCircle2, AlertTriangle, BookOpen, Search } from 'lucide-react';
import { fetchAIMemory, deleteAILesson, resetAIMemory } from '../services/api';

export default function AIMemoryModal({ isOpen, onClose, onMemoryUpdated }) {
  if (!isOpen) return null;

  const [memory, setMemory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionError, setActionError] = useState(null);

  const loadMemory = async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const data = await fetchAIMemory();
      setMemory(data);
    } catch (err) {
      console.error('Error fetching memory:', err);
      setActionError('Không thể tải bộ nhớ AI.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMemory();
  }, [isOpen]);

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài học này khỏi bộ nhớ AI?')) return;
    try {
      await deleteAILesson(id);
      await loadMemory();
      if (onMemoryUpdated) onMemoryUpdated();
    } catch (err) {
      alert(`Xóa thất bại: ${err.message}`);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('CẢNH BÁO: Bạn có chắc chắn muốn RESET toàn bộ bộ nhớ và thống kê AI về mặc định?')) return;
    try {
      await resetAIMemory();
      await loadMemory();
      if (onMemoryUpdated) onMemoryUpdated();
    } catch (err) {
      alert(`Reset thất bại: ${err.message}`);
    }
  };

  const lessons = memory?.lessons || [];
  const stats = memory?.stats || {};
  const rules = memory?.system_rules || [];

  const filteredLessons = lessons.filter(l => {
    const term = searchTerm.toLowerCase();
    return (
      (l.track && l.track.toLowerCase().includes(term)) ||
      (l.condition && l.condition.toLowerCase().includes(term)) ||
      (l.lesson_learned && l.lesson_learned.toLowerCase().includes(term)) ||
      (l.outcomeVerdict && l.outcomeVerdict.toLowerCase().includes(term))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0f172a] border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5 text-slate-100 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono">
                🧠 Bộ Nhớ & Kho Tri Thức AI (AI Knowledge Base)
              </h2>
              <p className="text-xs text-slate-400">
                Các quy tắc và bài học kinh nghiệm AI tích lũy từ các trận đua thực chiến
              </p>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="px-3 py-1 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/60 rounded-lg text-xs font-mono flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Bộ Nhớ</span>
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center font-mono">
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
            <div className="text-[10px] text-slate-400 uppercase font-sans">Tổng Trận Tự Học</div>
            <div className="text-lg font-bold text-white mt-0.5">{stats.total_evaluated || lessons.length || 0}</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
            <div className="text-[10px] text-slate-400 uppercase font-sans">Dự Đoán Chuẩn 1st</div>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">{stats.win_hits || 0}</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
            <div className="text-[10px] text-slate-400 uppercase font-sans">Tỉ Lệ Thắng (Win Rate)</div>
            <div className="text-lg font-bold text-sky-400 mt-0.5">{stats.win_accuracy_rate || 0}%</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl">
            <div className="text-[10px] text-slate-400 uppercase font-sans">Tỉ Lệ Top 3 (Place Rate)</div>
            <div className="text-lg font-bold text-amber-400 mt-0.5">{stats.place_accuracy_rate || 0}%</div>
          </div>
        </div>

        {/* Core System Rules */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-sky-400" />
            Quy Tắc Cốt Lõi Được Lập Trình Cho AI:
          </div>
          <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside font-sans">
            {rules.map((rule, idx) => (
              <li key={idx} className="leading-relaxed">{rule}</li>
            ))}
          </ul>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm kiếm bài học theo tên sân đua, điều kiện sân, nội dung bài học..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Lessons List */}
        <div className="space-y-3">
          <div className="text-xs font-mono font-bold text-slate-300 flex items-center justify-between">
            <span>Danh Sách Bài Học Thực Chiến ({filteredLessons.length}):</span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Đang tải bộ nhớ...</div>
          ) : filteredLessons.length === 0 ? (
            <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800/80 text-xs text-slate-400 space-y-1">
              <p>Chưa có bài học nào được lưu.</p>
              <p className="text-slate-500 text-[11px]">
                Sau mỗi trận đua, hãy mở mục <strong>"Nhập KQ & Dạy AI"</strong> để AI tự động đúc kết bài học.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {filteredLessons.map((item) => (
                <div key={item.id} className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 space-y-2 relative group hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between flex-wrap gap-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">
                        {item.track} R{item.raceNumber} ({item.distance}m, {item.condition})
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">{item.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        item.win_hit ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {item.outcomeVerdict || (item.win_hit ? 'WIN_HIT' : 'EVALUATED')}
                      </span>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                        title="Xóa bài học này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-[11px] font-mono text-slate-400 grid grid-cols-1 sm:grid-cols-2 gap-1 bg-slate-950/50 p-2 rounded-lg">
                    <div>Dự đoán Top 3: <span className="text-slate-200">{item.predicted_top3?.join(' • ')}</span></div>
                    <div>Thực tế: <span className="text-amber-300 font-bold">{item.actual_top3?.join(' • ')}</span></div>
                  </div>

                  {item.rootCauseAnalysis && (
                    <div className="text-xs text-slate-300 font-sans leading-relaxed">
                      <strong className="text-sky-300 font-mono text-[11px]">Nguyên nhân: </strong>
                      {item.rootCauseAnalysis}
                    </div>
                  )}

                  <div className="text-xs bg-purple-950/40 border border-purple-500/30 p-2.5 rounded-lg text-purple-200 font-sans leading-relaxed">
                    <strong className="text-purple-300 font-mono text-[11px] block mb-0.5">💡 Bài Học Rút Ra:</strong>
                    "{item.lesson_learned}"
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
