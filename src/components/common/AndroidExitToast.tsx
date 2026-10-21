import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface AndroidExitToastProps {
  isVisible: boolean;
}

export const AndroidExitToast: React.FC<AndroidExitToastProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none select-none animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      <div className="bg-neutral-900/95 border border-neutral-700/90 text-white shadow-2xl backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-2.5">
        <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
          <ArrowLeft className="w-3 h-3 text-emerald-400 stroke-[2.5]" />
        </div>
        <span className="text-xs font-semibold text-neutral-100 tracking-wide">
          Press back again to exit
        </span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
      </div>
    </div>
  );
};
