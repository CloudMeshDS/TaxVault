import React, { useState } from 'react';
import { Camera, FolderArchive, ShieldCheck, CheckCircle2, X } from 'lucide-react';
import { devicePermissions } from '../../services/devicePermissions';

interface DevicePermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionsGranted?: () => void;
}

export const DevicePermissionModal: React.FC<DevicePermissionModalProps> = ({
  isOpen,
  onClose,
  onPermissionsGranted,
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [grantedSuccess, setGrantedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGrantPermissions = async () => {
    setIsRequesting(true);
    setErrorMessage(null);

    try {
      await devicePermissions.requestCameraPermission();
      devicePermissions.markPromptShown();
      setGrantedSuccess(true);
      setTimeout(() => {
        onPermissionsGranted?.();
        onClose();
      }, 700);
    } catch {
      devicePermissions.markPromptShown();
      setGrantedSuccess(true);
      setTimeout(() => {
        onPermissionsGranted?.();
        onClose();
      }, 700);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleSkip = () => {
    devicePermissions.markPromptShown();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs backdrop-blur-md flex items-center justify-center p-4 select-none modal-backdrop-animation">
      <div className="bg-white border border-slate-200 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative space-y-5 modal-enter-animation text-center">
        {/* Dismiss Button */}
        <button
          aria-label="Close"
          onClick={handleSkip}
          className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 shadow-lg shadow-emerald-500/10">
          {grantedSuccess ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-600 animate-in zoom-in" />
          ) : (
            <ShieldCheck className="w-8 h-8 text-emerald-600" />
          )}
        </div>

        {/* Title & Description */}
        <div className="space-y-1.5">
          <h3 className="text-lg font-black tracking-tight text-white">
            {grantedSuccess ? 'Permissions Granted!' : 'Enable Device Permissions'}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {grantedSuccess
              ? 'TaxVault is ready to scan paper receipts and process your tax documents.'
              : 'To give you the best experience, TaxVault requires camera and document storage permissions.'}
          </p>
        </div>

        {/* Permission Item Breakdown */}
        {!grantedSuccess && (
          <div className="space-y-2.5 text-left pt-1">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/70 border border-slate-200">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0 mt-0.5">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Camera Access</div>
                <div className="text-xs text-slate-500 mt-0.5 leading-snug">
                  Scan physical receipts & tax invoices instantly with auto-edge detection.
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/70 border border-slate-200">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-700 shrink-0 mt-0.5">
                <FolderArchive className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Storage & Files</div>
                <div className="text-xs text-slate-500 mt-0.5 leading-snug">
                  Upload PDF tax bills from device files and save annual tax audit packs.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Notification if Denied */}
        {errorMessage && (
          <div className="space-y-2">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs text-left animate-in fade-in">
              {errorMessage}
            </div>
            <button
              onClick={handleSkip}
              className="w-full bg-slate-100 hover:bg-slate-200 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              Continue with Upload
            </button>
          </div>
        )}

        {/* Actions */}
        {!grantedSuccess && (
          <div className="space-y-2 pt-2">
            <button
              onClick={handleGrantPermissions}
              disabled={isRequesting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-black py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">{isRequesting ? 'Requesting...' : 'Grant Permissions'}</span>
            </button>

            <button
              onClick={handleSkip}
              className="w-full text-slate-500 hover:text-slate-700 font-semibold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer whitespace-nowrap text-center"
            >
              Maybe Later
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
