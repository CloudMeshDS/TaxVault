import React, { useState } from 'react';
import { Sparkles, Key, CheckCircle2, ExternalLink, X, Shield, AlertCircle } from 'lucide-react';
import { getGeminiApiKey, setGeminiApiKey } from '../../services/receiptOcr';

interface GeminiApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: (key: string) => void;
}

export const GeminiApiKeyModal: React.FC<GeminiApiKeyModalProps> = ({
  isOpen,
  onClose,
  onKeySaved,
}) => {
  const currentKey = getGeminiApiKey() || '';
  const [apiKeyInput, setApiKeyInput] = useState(currentKey);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed) {
      setGeminiApiKey('');
      setSaveSuccess(true);
      setTimeout(() => {
        onKeySaved?.('');
        onClose();
      }, 700);
      return;
    }

    if (trimmed.length < 20) {
      setError('Please enter a valid Google Gemini API Key.');
      return;
    }

    setGeminiApiKey(trimmed);
    setSaveSuccess(true);
    setError(null);
    setTimeout(() => {
      onKeySaved?.(trimmed);
      onClose();
    }, 800);
  };

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) setApiKeyInput(text.trim());
      }
    } catch {
      // Clipboard access blocked
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none modal-backdrop-animation">
      <div className="bg-neutral-900 border border-neutral-800 w-full max-w-md rounded-3xl p-6 shadow-2xl relative space-y-5 modal-enter-animation">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Heading */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
            {saveSuccess ? (
              <CheckCircle2 className="w-7 h-7 text-emerald-400 animate-in zoom-in" />
            ) : (
              <Sparkles className="w-7 h-7 text-emerald-400" />
            )}
          </div>
          <h3 className="text-base font-black text-white tracking-tight">
            {saveSuccess ? 'API Key Activated!' : 'Gemini AI Vision Receipt Scanner'}
          </h3>
          <p className="text-xs text-neutral-400 leading-relaxed max-w-sm mx-auto">
            Automate receipt reading with Google Gemini 2.5 Flash. Reads store name, totals, date, invoice #, and tax breakdowns in 1.5 seconds.
          </p>
        </div>

        {/* Key Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-300">
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-emerald-400" />
              <span>Google Gemini API Key</span>
            </span>
            <button
              onClick={handlePaste}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 cursor-pointer font-bold"
            >
              Paste from clipboard
            </button>
          </div>

          <div className="relative">
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => {
                setApiKeyInput(e.target.value);
                setError(null);
              }}
              placeholder="AIzaSy..."
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder:text-neutral-600 focus:outline-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-rose-400 text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Free API Key Instruction Card */}
        <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-2xl p-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-neutral-200">Get a Free Key in 15 seconds:</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">
              Free Tier
            </span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-neutral-400 text-[11px] leading-relaxed">
            <li>Visit Google AI Studio</li>
            <li>Click <strong>&quot;Create API Key&quot;</strong></li>
            <li>Copy &amp; paste it into the box above</li>
          </ol>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 pt-1"
          >
            <span>Open Google AI Studio</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleSave}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 active:scale-[0.98] text-neutral-950 font-black py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer whitespace-nowrap"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="whitespace-nowrap">{apiKeyInput.trim() ? 'Save & Activate AI Key' : 'Clear Key'}</span>
          </button>

          <button
            onClick={onClose}
            className="w-full text-neutral-400 hover:text-neutral-200 font-semibold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer text-center whitespace-nowrap"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
