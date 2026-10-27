import React, { useState } from 'react';
import { Database, Copy, CheckCircle2, X, ExternalLink, ShieldCheck, Terminal, Globe } from 'lucide-react';

interface SupabaseSqlModalProps {
  isOpen: boolean;
  onClose: () => void;
  supabaseUrl: string;
}

import { SUPABASE_SQL_SCHEMA } from '../../constants/supabaseSchema';

export const SUPABASE_MULTI_COUNTRY_SQL = SUPABASE_SQL_SCHEMA;

export const SupabaseSqlModal: React.FC<SupabaseSqlModalProps> = ({
  isOpen,
  onClose,
  supabaseUrl,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SUPABASE_MULTI_COUNTRY_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs backdrop-blur-md flex items-center justify-center p-4 select-none modal-backdrop-animation">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden modal-enter-animation">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Database className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">Supabase SQL Migration Script</h2>
              <p className="text-xs text-slate-500">PostgreSQL Schema for NZ, Australia, Canada, USA & India</p>
            </div>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Instructions */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
          <div className="bg-emerald-50 border border-emerald-500/30 rounded-2xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>How to Run in Supabase (1-Minute Setup)</span>
            </div>
            <ol className="list-decimal list-inside text-xs text-slate-700 space-y-1 pl-1 leading-relaxed">
              <li>Open your Supabase project dashboard ({supabaseUrl || 'https://supabase.com/dashboard'}).</li>
              <li>Click on <strong className="text-white">SQL Editor</strong> on the left sidebar.</li>
              <li>Click <strong className="text-white">+ New Query</strong>.</li>
              <li>Paste the SQL script below and click <strong className="text-emerald-600">Run</strong>.</li>
            </ol>
            <div className="text-xs text-slate-500 pt-1">
              ✨ Safe to run anytime: Uses <code className="text-emerald-600">ADD COLUMN IF NOT EXISTS</code> to safely upgrade your existing database without deleting any data.
            </div>
          </div>

          {/* Supported countries badge */}
          <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-50/60 p-2.5 rounded-xl border border-slate-200">
            <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Includes 🇳🇿 New Zealand (IRD), 🇦🇺 Australia (ATO), 🇨🇦 Canada (CRA), 🇺🇸 USA (IRS), and 🇮🇳 India (GST)</span>
          </div>

          {/* Copy Button */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-600" />
              <span>Complete PostgreSQL DDL</span>
            </span>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                copied
                  ? 'bg-emerald-500 text-slate-900 font-black'
                  : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 border border-emerald-500/30'
              }`}
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy SQL Script</span>
                </>
              )}
            </button>
          </div>

          {/* Code Container */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-64 overflow-y-auto font-mono text-xs text-slate-700 whitespace-pre leading-relaxed select-text">
            {SUPABASE_MULTI_COUNTRY_SQL}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between">
          <a
            href={supabaseUrl ? `${supabaseUrl}/project/sql` : 'https://supabase.com/dashboard'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-500 hover:text-emerald-600 flex items-center gap-1 transition-colors"
          >
            <span>Open Supabase SQL Editor</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={onClose}
            className="bg-slate-100 hover:bg-slate-200 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
