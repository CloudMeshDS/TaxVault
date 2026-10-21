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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none modal-backdrop-animation">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden modal-enter-animation">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Database className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">Supabase SQL Migration Script</h2>
              <p className="text-[10px] text-neutral-400">PostgreSQL Schema for NZ, Australia, Canada, USA & India</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Instructions */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1 text-xs">
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>How to Run in Supabase (1-Minute Setup)</span>
            </div>
            <ol className="list-decimal list-inside text-[11px] text-neutral-300 space-y-1 pl-1 leading-relaxed">
              <li>Open your Supabase project dashboard ({supabaseUrl || 'https://supabase.com/dashboard'}).</li>
              <li>Click on <strong className="text-white">SQL Editor</strong> on the left sidebar.</li>
              <li>Click <strong className="text-white">+ New Query</strong>.</li>
              <li>Paste the SQL script below and click <strong className="text-emerald-400">Run</strong>.</li>
            </ol>
            <div className="text-[10px] text-neutral-400 pt-1">
              ✨ Safe to run anytime: Uses <code className="text-emerald-300">ADD COLUMN IF NOT EXISTS</code> to safely upgrade your existing database without deleting any data.
            </div>
          </div>

          {/* Supported countries badge */}
          <div className="flex items-center gap-2 text-[11px] text-neutral-300 bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800">
            <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Includes 🇳🇿 New Zealand (IRD), 🇦🇺 Australia (ATO), 🇨🇦 Canada (CRA), 🇺🇸 USA (IRS), and 🇮🇳 India (GST)</span>
          </div>

          {/* Copy Button */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] font-bold text-neutral-400 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>Complete PostgreSQL DDL</span>
            </span>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                copied
                  ? 'bg-emerald-500 text-neutral-950 font-black'
                  : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30'
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
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 max-h-64 overflow-y-auto font-mono text-[11px] text-neutral-300 whitespace-pre leading-relaxed select-text">
            {SUPABASE_MULTI_COUNTRY_SQL}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between">
          <a
            href={supabaseUrl ? `${supabaseUrl}/project/sql` : 'https://supabase.com/dashboard'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-neutral-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
          >
            <span>Open Supabase SQL Editor</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={onClose}
            className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
