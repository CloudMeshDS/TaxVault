import React, { useEffect, useState } from 'react';

interface PinLockModalProps {
  isOpen: boolean;
  /** The user's own 4-digit PIN. There is no default PIN. */
  correctPin: string;
  onUnlock: () => void;
  /** Turns the lock off and signs out; getting back in then needs the account password. */
  onForgotPin: () => void;
}

const MAX_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 30;

export const PinLockModal: React.FC<PinLockModalProps> = ({ isOpen, correctPin, onUnlock, onForgotPin }) => {
  const [enteredPin, setEnteredPin] = useState('');
  const [errorMsg, setErrorMsg] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [confirmForgot, setConfirmForgot] = useState(false);

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const timer = setTimeout(() => setCooldownLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldownLeft]);

  if (!isOpen) return null;

  const isCoolingDown = cooldownLeft > 0;

  const handleKeyPress = (num: string) => {
    if (isCoolingDown || enteredPin.length >= 4) return;
    const next = enteredPin + num;
    setEnteredPin(next);
    setErrorMsg(false);

    if (next.length === 4) {
      if (correctPin && next === correctPin) {
        setFailedAttempts(0);
        setEnteredPin('');
        onUnlock();
      } else {
        const attempts = failedAttempts + 1;
        setFailedAttempts(attempts);
        setErrorMsg(true);
        // Slow down guessing after repeated wrong PINs
        if (attempts % MAX_ATTEMPTS === 0) setCooldownLeft(COOLDOWN_SECONDS);
        setTimeout(() => setEnteredPin(''), 600);
      }
    }
  };

  const handleBackspace = () => {
    if (isCoolingDown) return;
    setEnteredPin((prev) => prev.slice(0, -1));
    setErrorMsg(false);
  };

  const keyClass =
    'h-16 rounded-2xl bg-white hover:bg-slate-100 active:scale-95 text-white font-bold text-xl flex items-center justify-center transition-all cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="fixed inset-0 z-90 bg-slate-50 flex flex-col justify-between p-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] select-none animate-in fade-in">
      {/* Top Branding */}
      <div className="text-center pt-8 space-y-2">
        <div className="w-16 h-16 rounded-3xl bg-brand mx-auto flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-emerald-500/20 ring-4 ring-emerald-500/20">
          ₹
        </div>
        <h2 className="text-xl font-extrabold text-white tracking-tight">TaxVault is locked</h2>
        <p className="text-xs text-slate-500">Enter your 4-digit PIN to unlock</p>
      </div>

      {/* PIN Dots Display */}
      <div className="text-center space-y-4 my-auto">
        <div className="flex items-center justify-center gap-4" aria-label={`${enteredPin.length} of 4 digits entered`}>
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

        <p className="text-xs font-semibold min-h-[1rem]" role="status">
          {isCoolingDown ? (
            <span className="text-rose-700">Too many attempts. Try again in {cooldownLeft}s.</span>
          ) : errorMsg ? (
            <span className="text-rose-700 animate-shake">Incorrect PIN. Try again.</span>
          ) : null}
        </p>
      </div>

      {/* Numeric Keypad */}
      <div className="max-w-xs mx-auto w-full space-y-3 pb-2">
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button key={digit} onClick={() => handleKeyPress(digit)} disabled={isCoolingDown} className={keyClass}>
              {digit}
            </button>
          ))}

          <div aria-hidden="true" />

          <button onClick={() => handleKeyPress('0')} disabled={isCoolingDown} className={keyClass}>
            0
          </button>

          <button
            onClick={handleBackspace}
            disabled={isCoolingDown}
            aria-label="Delete last digit"
            className="h-16 rounded-2xl bg-white shadow-xs hover:bg-slate-100 active:scale-95 text-slate-500 flex items-center justify-center transition-all cursor-pointer disabled:opacity-40"
          >
            ⌫
          </button>
        </div>

        {/* Forgot PIN: turn the lock off and sign out, so the account password is needed to get back in */}
        <div className="text-center pt-2">
          {confirmForgot ? (
            <div className="space-y-2 text-xs">
              <p className="text-slate-600">
                You'll be signed out and the PIN lock will be turned off. Sign in again with your password.
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setConfirmForgot(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={onForgotPin}
                  className="px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-strong text-white font-semibold cursor-pointer"
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmForgot(true)}
              className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
            >
              Forgot PIN?
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
