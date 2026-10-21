import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';

interface UseDoubleBackToExitOptions {
  /**
   * Called when a back action occurs (hardware back on Android or browser popstate).
   * Should return `true` if an internal UI action was handled (such as closing a modal
   * or navigating back to the Home tab), or `false` if the user is at the root screen.
   */
  onBackAction: () => boolean;
  /**
   * Milliseconds window to trigger double-back exit. Default is 2000ms (2 seconds).
   */
  exitTimeoutMs?: number;
}

export function useDoubleBackToExit({
  onBackAction,
  exitTimeoutMs = 2000,
}: UseDoubleBackToExitOptions) {
  const [showExitToast, setShowExitToast] = useState(false);
  const lastBackPressTimeRef = useRef<number>(0);
  const toastTimeoutRef = useRef<any>(null);
  const onBackActionRef = useRef(onBackAction);
  onBackActionRef.current = onBackAction;

  useEffect(() => {
    // 0. On iOS (Native Capacitor or iOS Web/PWA), Apple strictly forbids programmatic app termination (exitApp)
    // and iOS users navigate via standard gesture swipes. Skip back trapping on iOS entirely.
    if (Capacitor.getPlatform() === 'ios' || (typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent))) {
      return;
    }

    // 1. Establish initial browser history trap for Web & PWA on Android
    try {
      window.history.replaceState({ app: 'taxvault-root' }, '', window.location.href);
      window.history.pushState({ app: 'taxvault-active' }, '', window.location.href);
    } catch {
      // Ignore in restricted environments
    }

    const processBackNavigation = () => {
      // Ask app if any internal view/modal handled the back action
      const handled = onBackActionRef.current();

      if (handled) {
        // Internal navigation or modal close was performed.
        // Re-push history entry so the browser history trap stays armed.
        try {
          window.history.pushState({ app: 'taxvault-active' }, '', window.location.href);
        } catch {}
        return;
      }

      // User is at root screen (Home tab and no open overlays).
      const now = Date.now();
      const elapsed = now - lastBackPressTimeRef.current;

      if (elapsed < exitTimeoutMs) {
        // Double back pressed within 2 seconds -> EXIT APP
        setShowExitToast(false);
        lastBackPressTimeRef.current = 0;

        if (Capacitor.isNativePlatform()) {
          CapApp.exitApp();
        } else {
          // In Web / PWA: allow navigation back or close
          try {
            window.history.go(-2);
          } catch {
            window.close();
          }
        }
      } else {
        // First back press -> trigger toast & start exit timer
        lastBackPressTimeRef.current = now;
        setShowExitToast(true);

        if (toastTimeoutRef.current) {
          clearTimeout(toastTimeoutRef.current);
        }
        toastTimeoutRef.current = setTimeout(() => {
          setShowExitToast(false);
          lastBackPressTimeRef.current = 0;
        }, exitTimeoutMs);

        // Re-arm history trap for the second back click
        try {
          window.history.pushState({ app: 'taxvault-active' }, '', window.location.href);
        } catch {}
      }
    };

    // 2. Web / PWA popstate listener (Chrome / Firefox / Samsung Internet on Android)
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault?.();
      processBackNavigation();
    };
    window.addEventListener('popstate', handlePopState);

    // 3. Native Android Capacitor hardware back button listener
    let removeCapacitorListener: (() => void) | null = null;
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('backButton', () => {
        processBackNavigation();
      }).then((listener) => {
        removeCapacitorListener = () => {
          listener.remove();
        };
      }).catch(() => {});
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (removeCapacitorListener) {
        removeCapacitorListener();
      }
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, [exitTimeoutMs]);

  return {
    showExitToast,
  };
}
