import React from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  progress: number;
  isRefreshing: boolean;
  /** Short message shown after a refresh, e.g. "Updated" or an error. */
  message?: string | null;
}

/** Spinner that slides down from under the header while pulling to refresh. */
export const PullToRefreshIndicator: React.FC<PullToRefreshIndicatorProps> = ({
  pullDistance,
  progress,
  isRefreshing,
  message,
}) => {
  const visible = pullDistance > 0 || isRefreshing;
  return (
    <>
      <div
        aria-hidden={!visible}
        className="fixed left-0 right-0 z-30 flex justify-center pointer-events-none"
        style={{
          top: 'calc(env(safe-area-inset-top) + 64px)',
          transform: `translateY(${Math.max(0, pullDistance - 44)}px)`,
          opacity: visible ? Math.max(0.35, progress) : 0,
          transition: pullDistance === 0 ? 'transform 0.2s ease, opacity 0.2s ease' : 'none',
        }}
      >
        <div className="w-10 h-10 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-emerald-700">
          <RefreshCw
            className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
            style={isRefreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }}
          />
        </div>
      </div>
      <div role="status" aria-live="polite" className="sr-only">
        {isRefreshing ? 'Refreshing' : message || ''}
      </div>
      {message && !isRefreshing && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-lg pointer-events-none keep-white"
          style={{ top: 'calc(env(safe-area-inset-top) + 72px)' }}
        >
          {message}
        </div>
      )}
    </>
  );
};
