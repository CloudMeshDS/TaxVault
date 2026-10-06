import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor, BatteryMedium, Wifi } from 'lucide-react';

interface MobileSimulatorProps {
  children: React.ReactNode;
  activePlatform: 'ios' | 'android' | 'desktop';
  onPlatformChange: (p: 'ios' | 'android' | 'desktop') => void;
}

export const MobileSimulator: React.FC<MobileSimulatorProps> = ({
  children,
  activePlatform,
  onPlatformChange,
}) => {
  const [currentTime, setCurrentTime] = useState('09:41');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  if (activePlatform === 'desktop') {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
        {/* Top platform bar */}
        <div className="bg-neutral-900 border-b border-neutral-800 px-4 py-2 flex items-center justify-between text-xs z-50">
          <div className="flex items-center gap-2 text-neutral-400">
            <span className="font-semibold text-neutral-200">TaxVault Viewport</span>
            <span>·</span>
            <span>Accountant Fullscreen Workspace</span>
          </div>
          <div className="flex items-center gap-1 bg-neutral-800 p-1 rounded-md">
            <button
              onClick={() => onPlatformChange('ios')}
              className="px-2.5 py-1 rounded text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>iOS Frame</span>
            </button>
            <button
              onClick={() => onPlatformChange('android')}
              className="px-2.5 py-1 rounded text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android Frame</span>
            </button>
            <button
              onClick={() => onPlatformChange('desktop')}
              className="px-2.5 py-1 rounded bg-neutral-700 text-white font-medium flex items-center gap-1.5 shadow-xs"
            >
              <Monitor className="w-3.5 h-3.5 text-emerald-400" />
              <span>Full Screen</span>
            </button>
          </div>
        </div>

        {/* Content container */}
        <div className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 flex flex-col">
          {children}
        </div>
      </div>
    );
  }

  const isIos = activePlatform === 'ios';

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-2 sm:p-6 overflow-x-hidden">
      {/* Platform Switcher Controls */}
      <div className="mb-4 flex items-center gap-2 bg-neutral-900 border border-neutral-800 p-1.5 rounded-xl shadow-lg z-50">
        <button
          onClick={() => onPlatformChange('ios')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
            isIos
              ? 'bg-neutral-800 text-emerald-400 shadow-sm border border-emerald-500/30'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>iOS (iPhone 16 Pro)</span>
        </button>

        <button
          onClick={() => onPlatformChange('android')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
            activePlatform === 'android'
              ? 'bg-neutral-800 text-emerald-400 shadow-sm border border-emerald-500/30'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Android (Pixel 9 Pro)</span>
        </button>

        <button
          onClick={() => onPlatformChange('desktop')}
          className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-neutral-200 flex items-center gap-1.5 transition-all"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>Accountant Desktop</span>
        </button>
      </div>

      {/* Mobile Device Chassis */}
      <div
        className={`relative w-full max-w-[410px] h-[840px] max-h-[92vh] bg-black border-[10px] sm:border-[12px] ${
          isIos ? 'border-neutral-800 rounded-[52px]' : 'border-neutral-800 rounded-[38px]'
        } shadow-2xl overflow-hidden flex flex-col ring-1 ring-white/10`}
      >
        {/* Status Bar */}
        <div className="h-10 bg-neutral-900/90 text-white px-6 flex items-center justify-between text-xs select-none z-40 relative">
          <span className="font-semibold text-[13px] tracking-tight">{currentTime}</span>

          {/* iOS Dynamic Island or Android Camera Punch-hole */}
          {isIos ? (
            <div className="absolute left-1/2 -translate-x-1/2 top-2 w-28 h-6 bg-black rounded-full flex items-center justify-center gap-2 ring-1 ring-white/5 shadow-inner">
              <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-700/50" />
              <div className="w-2 h-2 rounded-full bg-emerald-500/30 animate-pulse" />
            </div>
          ) : (
            <div className="absolute left-1/2 -translate-x-1/2 top-2.5 w-4 h-4 bg-black rounded-full border border-neutral-800 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-neutral-900" />
            </div>
          )}

          <div className="flex items-center gap-2 text-neutral-300">
            <Wifi className="w-3.5 h-3.5" />
            <BatteryMedium className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        {/* Scrollable Mobile App Screen */}
        <div className="flex-1 flex flex-col overflow-y-auto bg-neutral-950 relative">
          {children}
        </div>

        {/* iOS Home Indicator Bar or Android Nav Gesture Bar */}
        <div className="h-5 bg-neutral-900/95 flex items-center justify-center select-none z-40">
          {isIos ? (
            <div className="w-32 h-1 bg-neutral-500/60 rounded-full" />
          ) : (
            <div className="w-20 h-1 bg-neutral-600 rounded-full" />
          )}
        </div>
      </div>
    </div>
  );
};
