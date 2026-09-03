import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Eye, 
  EyeOff, 
  Trash2, 
  RefreshCw, 
  ShieldCheck, 
  Sparkles,
  X
} from 'lucide-react';
import { 
  getStoredGeminiKey, 
  setStoredGeminiKey, 
  removeStoredGeminiKey, 
  validateGeminiKey 
} from '../services/api';

export default function GeminiKeyModal({
  isOpen,
  onClose,
  onKeyUpdated
}) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredGeminiKey();
      setApiKey(stored);
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveAndActivate = async (e) => {
    e?.preventDefault();
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      setStatusMessage({ type: 'error', text: 'Vui lòng nhập API Key trước khi kích hoạt.' });
      return;
    }

    setIsValidating(true);
    setStatusMessage(null);

    try {
      const res = await validateGeminiKey(cleanKey);
      setStoredGeminiKey(cleanKey);
      setStatusMessage({ 
        type: 'success', 
        text: res.message || 'Gemini API Key đã được kích hoạt và lưu thành công!' 
      });
      if (onKeyUpdated) onKeyUpdated(cleanKey);
      
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err) {
      setStatusMessage({ 
        type: 'error', 
        text: err.message || 'Xác thực thất bại. Vui lòng kiểm tra lại API Key.' 
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveKey = () => {
    removeStoredGeminiKey();
    setApiKey('');
    setStatusMessage({ type: 'success', text: 'Đã xóa API Key khỏi bộ nhớ trình duyệt.' });
    if (onKeyUpdated) onKeyUpdated('');
  };

  const hasExistingKey = Boolean(getStoredGeminiKey());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-[#0f172a] border border-sky-500/30 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Header */}
        <div className="bg-gradient-to-r from-sky-950/60 via-indigo-950/40 to-slate-900 border-b border-slate-800 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/20 border border-sky-400/30 rounded-xl text-sky-400">
              <KeyRound className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">Cấu hình Gemini API Key</h3>
                {hasExistingKey && (
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Đang hoạt động
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Kích hoạt phân tích chiến thuật và trí nhớ tự học của AI
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Status Alert */}
          {statusMessage && (
            <div className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs font-sans animate-fadeIn ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : 'bg-red-950/40 border-red-500/40 text-red-200'
            }`}>
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 leading-relaxed">{statusMessage.text}</div>
            </div>
          )}

          {/* Form Input */}
          <form onSubmit={handleSaveAndActivate} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-semibold text-slate-300 flex items-center justify-between">
                <span>Google Gemini API Key:</span>
                <span className="text-[11px] text-slate-500 font-normal">Lưu cục bộ trong browser</span>
              </label>

              <div className="relative flex items-center">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-950 border border-slate-700 focus:border-sky-500 rounded-xl px-3.5 py-2.5 pr-20 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  autoFocus
                />
                
                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                    title={showKey ? 'Ẩn key' : 'Hiện key'}
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  {apiKey && (
                    <button
                      type="button"
                      onClick={() => setApiKey('')}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                      title="Xóa trắng"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              {hasExistingKey ? (
                <button
                  type="button"
                  onClick={handleRemoveKey}
                  className="px-3 py-2 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 rounded-xl text-xs font-mono transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa Key</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-mono transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isValidating || !apiKey.trim()}
                  className={`px-5 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-mono text-xs font-bold rounded-xl shadow-lg shadow-sky-500/25 transition-all flex items-center gap-2 ${
                    isValidating || !apiKey.trim() ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'
                  }`}
                >
                  {isValidating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang kiểm tra...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Kích hoạt & Lưu</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Quick Guide Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs text-slate-300">
            <div className="font-mono font-bold text-sky-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              Cách lấy Gemini API Key miễn phí:
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-[11px] leading-relaxed text-slate-400">
              <li>
                Truy cập cổng Google AI Studio tại{' '}
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-sky-400 hover:underline font-semibold inline-flex items-center gap-0.5"
                >
                  aistudio.google.com/app/apikey <ExternalLink className="w-3 h-3 ml-0.5 inline" />
                </a>
              </li>
              <li>Đăng nhập tài khoản Google và bấm nút <strong>"Create API Key"</strong>.</li>
              <li>Sao chép mã Key (dạng <code>AIzaSy...</code>) và dán vào ô trên, sau đó bấm <strong>"Kích hoạt & Lưu"</strong>.</li>
            </ol>
            <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-800">
              🔒 Key chỉ được lưu trong trình duyệt của bạn (LocalStorage) và chỉ được gửi khi bạn yêu cầu phân tích AI.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
