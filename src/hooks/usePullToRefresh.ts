import { useEffect, useRef, useState } from 'react';

interface PullToRefreshOptions {
  /** Called when the user pulls past the threshold and lets go. */
  onRefresh: () => Promise<unknown>;
  enabled?: boolean;
  /** Finger travel (after resistance) needed to trigger a refresh. */
  threshold?: number;
  /** Furthest the indicator can be pulled down. */
  maxPull?: number;
}

/**
 * Touch pull-to-refresh for the page scroll. A pull only starts when the page is scrolled to
 * the very top and the touch begins outside pop-ups and horizontally scrolling rows, so it
 * never fights normal scrolling, modals or carousels.
 */
export function usePullToRefresh({ onRefresh, enabled = true, threshold = 70, maxPull = 110 }: PullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const startX = useRef(0);
  const pulling = useRef(false);
  const distance = useRef(0);
  const refreshing = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled) return;

    const atTop = () => (window.scrollY || document.documentElement.scrollTop || 0) <= 0;

    const isExcludedTarget = (target: EventTarget | null) => {
      const el = target as HTMLElement | null;
      if (!el?.closest) return false;
      // Pop-ups, sheets and anything that scrolls on its own
      return Boolean(
        el.closest('[role="dialog"], .fixed, [data-no-pull-refresh], input, textarea, select, [contenteditable="true"]')
      );
    };

    const reset = () => {
      startY.current = null;
      pulling.current = false;
      distance.current = 0;
      setPullDistance(0);
    };

    const onTouchStart = (e: TouchEvent) => {
      if (refreshing.current || e.touches.length !== 1 || !atTop() || isExcludedTarget(e.target)) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
      pulling.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === null || refreshing.current) return;
      const dy = e.touches[0].clientY - startY.current;
      const dx = Math.abs(e.touches[0].clientX - startX.current);

      if (!pulling.current) {
        // Only claim clearly downward, mostly vertical drags that start at the top
        if (dy < 8 || dx > dy || !atTop()) {
          if (dy < 0 || dx > dy) startY.current = null;
          return;
        }
        pulling.current = true;
      }

      // Rubber-band resistance so the indicator slows down as it travels
      const resisted = Math.min(maxPull, dy * 0.5);
      distance.current = resisted;
      setPullDistance(resisted);
      if (e.cancelable) e.preventDefault(); // stop the page bouncing / browser reload gesture
    };

    const onTouchEnd = async () => {
      if (!pulling.current) {
        startY.current = null;
        return;
      }
      const shouldRefresh = distance.current >= threshold;
      startY.current = null;
      pulling.current = false;
      if (!shouldRefresh) {
        reset();
        return;
      }
      refreshing.current = true;
      setIsRefreshing(true);
      setPullDistance(threshold * 0.8); // hold the spinner in view while loading
      try {
        await onRefreshRef.current();
      } finally {
        refreshing.current = false;
        setIsRefreshing(false);
        reset();
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', reset);
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', reset);
    };
  }, [enabled, threshold, maxPull]);

  return { pullDistance, isRefreshing, progress: Math.min(1, pullDistance / threshold) };
}
