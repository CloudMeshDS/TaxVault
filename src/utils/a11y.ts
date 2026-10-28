import type React from 'react';

/**
 * Props that make a non-button element (a card or row that contains its own
 * buttons, so it can't be a <button>) behave like one for screen readers and
 * keyboards: announced as a button, focusable, and activated by Enter/Space.
 */
export const pressable = (onPress: () => void) => ({
  role: 'button' as const,
  tabIndex: 0,
  onClick: onPress,
  onKeyDown: (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPress();
    }
  },
});
