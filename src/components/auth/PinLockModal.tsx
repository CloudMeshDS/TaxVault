import React, { useState } from 'react';
import { Lock, Fingerprint, ShieldCheck, KeyRound, AlertCircle } from 'lucide-react';

interface PinLockModalProps {
  isOpen: boolean;
  correctPin: string;
  onUnlock: () => void;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  isOpen,
  correctPin,
  onUnlock,
}) => {
  const [enteredPin, setEnteredPin] = useState('');
  const [errorMsg, setErrorMsg] = useState(false);

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (enteredPin.length < 4) {
      const next = enteredPin + num;
      setEnteredPin(next);
      setErrorMsg(false);

      if (next.length === 4) {
        if (next === (correctPin || '1234')) {
          onUnlock();
          setEnteredPin('');
        } else {
          setErrorMsg(true);
          setTimeout(() => setEnteredPin(''), 600);
        }
      }
    }
  };

  const handleBackspace = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setErrorMsg(false);
  };

  const handleBiometricSimulate = () => {
    onUnlock();
  };

  return (
    <div className="fixed inset-0 z-90 bg-slate-50 flex flex-col justify-between p-6 select-none animate-in fade-in">
      {/* Top Branding */}
      <div className="text-center pt-8 space-y-2">
        <div className="w-16 h-16 rounded-3xl bg-brand mx-auto flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-emerald-500/20 ring-4 ring-emerald-500/20">
          ₹
        </div>
        <h2 className="text-xl font-extrabold text-white tracking-tight">TaxVault Secure Lock</h2>
        <p className="text-xs text-slate-500">Enter your 4-digit security PIN to unlock</p>
      </div>

      {/* PIN Dots Display */}
      <div className="text-center space-y-4 my-auto">
        <div className="flex items-center justify-center gap-4">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = enteredPin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? errorMsg
                      ? 'bg-rose-500 scale-125'
                      : 'bg-emerald-400 scale-125 shadow-lg shadow-emerald-500/50'
                    : 'bg-slate-100 border border-slate-300'
                }`}
              />
            );
          })}
        </div>

        {errorMsg ? (
          <p className="text-xs font-semibold text-rose-700 animate-shake">Incorrect PIN. Try again.</p>
        ) : (
          <p className="text-xs text-slate-500 font-mono">Default PIN: {correctPin || '1234'}</p>
        )}
      </div>

      {/* Numeric Keypad */}
      <div className="max-w-xs mx-auto w-full space-y-3 pb-6">
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleKeyPress(digit)}
              className="h-16 rounded-2xl bg-white hover:bg-slate-100 active:scale-95 text-white font-bold text-xl flex items-center justify-center transition-all cursor-pointer shadow-md"
            >
              {digit}
            </button>
          ))}

          {/* Biometric Icon */}
          <button
            onClick={handleBiometricSimulate}
            className="h-16 rounded-2xl bg-white shadow-xs hover:bg-slate-100 active:scale-95 text-emerald-700 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
            title="Use Face ID / Fingerprint"
          >
            <Fingerprint className="w-6 h-6" />
            <span className="text-xs font-semibold">Touch ID</span>
          </button>

          {/* 0 */}
          <button
            onClick={() => handleKeyPress('0')}
            className="h-16 rounded-2xl bg-white hover:bg-slate-100 active:scale-95 text-white font-bold text-xl flex items-center justify-center transition-all cursor-pointer shadow-md"
          >
            0
          </button>

          {/* Backspace */}
          <button
            onClick={handleBackspace}
            className="h-16 rounded-2xl bg-white shadow-xs hover:bg-slate-100 active:scale-95 text-slate-500 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
};
