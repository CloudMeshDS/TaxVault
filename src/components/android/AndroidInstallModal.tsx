import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Download,
  CheckCircle2,
  X,
  ExternalLink,
  ShieldCheck,
  Zap,
  ArrowRight,
  Info,
  Layers,
  Copy,
  Check
} from 'lucide-react';

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt: any;
  onInstallNativePrompt: () => void;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallNativePrompt,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [activeTab, setActiveTab] = useState<'direct_install' | 'apk_download' | 'instructions'>('direct_install');

  if (!isOpen) return null;

  const currentAppUrl = window.location.href;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentAppUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDownloadApkBundle = () => {
    setDownloadStarted(true);
    const link = document.createElement('a');
    link.href = '/app-debug.apk';
    link.setAttribute('download', 'TaxVault-v2.5.0-debug.apk');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloadStarted(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 modal-backdrop-animation">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md max-h-[92vh] overflow-y-auto flex flex-col text-neutral-100 shadow-2xl relative modal-enter-animation">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 cursor-pointer z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header */}
        <div className="p-5 border-b border-neutral-800 text-center relative overflow-hidden bg-gradient-to-b from-emerald-950/40 to-transparent">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-2.5 text-emerald-400">
            <Smartphone className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-lg text-white">Install TaxVault on Android</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-xs mx-auto">
            Install the verified Android WebAPK directly onto your device with full offline support and camera scanner.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 flex items-center justify-center">
          <div className="flex items-center p-1 bg-neutral-950 border border-neutral-800 rounded-xl text-xs w-full">
            <button
              onClick={() => setActiveTab('direct_install')}
              className={`flex-1 py-1.5 rounded-lg font-medium transition-colors cursor-pointer text-center ${
                activeTab === 'direct_install'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              1-Tap Install
            </button>
            <button
              onClick={() => setActiveTab('apk_download')}
              className={`flex-1 py-1.5 rounded-lg font-medium transition-colors cursor-pointer text-center ${
                activeTab === 'apk_download'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              APK Package
            </button>
            <button
              onClick={() => setActiveTab('instructions')}
              className={`flex-1 py-1.5 rounded-lg font-medium transition-colors cursor-pointer text-center ${
                activeTab === 'instructions'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Guide
            </button>
          </div>
        </div>

        {/* Tab 1: Direct 1-Click Install */}
        {activeTab === 'direct_install' && (
          <div className="p-5 space-y-4">
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified Android WebAPK (Zero Security Warnings)</span>
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed">
                Google Chrome and Android compile TaxVault directly into a verified native app package on your device. No untrusted developer certificates or sideloading warnings.
              </p>

              <button
                onClick={() => {
                  if (deferredPrompt) {
                    onInstallNativePrompt();
                    onClose();
                  } else {
                    setActiveTab('instructions');
                  }
                }}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer active:scale-98"
              >
                <Zap className="w-4 h-4" />
                <span>{deferredPrompt ? 'Install TaxVault App Now' : 'Show Instant Browser Install Steps'}</span>
              </button>
            </div>

            {/* Quick Share Link for Phone */}
            <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl space-y-2 text-xs">
              <div className="text-neutral-400 font-medium">Opening on your Android Phone:</div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={currentAppUrl}
                  className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-neutral-300 truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-emerald-400 font-medium text-xs flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: APK Package & TWA Bundle */}
        {activeTab === 'apk_download' && (
          <div className="p-5 space-y-4">
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Standalone Android APK / TWA Package</span>
              </div>

              <div className="text-xs text-neutral-300 space-y-1 font-mono text-[11px] bg-neutral-900 p-2.5 rounded-lg border border-neutral-800/80">
                <div>Package: <span className="text-emerald-400">nz.taxvault.mobile</span></div>
                <div>Target SDK: <span className="text-neutral-200">Android 15 (API 35)</span></div>
                <div>Min SDK: <span className="text-neutral-200">Android 8.0 (API 26)</span></div>
                <div>Architecture: <span className="text-neutral-200">Universal (ARM64 / x86_64)</span></div>
              </div>

              <button
                onClick={handleDownloadApkBundle}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>{downloadStarted ? 'Downloading Package...' : 'Download Android Package Config'}</span>
              </button>
            </div>

            <div className="text-[11px] text-neutral-400 bg-neutral-950 p-3 rounded-xl border border-neutral-800 leading-relaxed">
              <span className="font-semibold text-neutral-200">Official PWABuilder / Bubblewrap APK: </span>
              You can also paste the app URL into <span className="text-emerald-400 font-mono">pwabuilder.com</span> to generate a signed APK or Google Play AAB bundle in 10 seconds.
            </div>
          </div>
        )}

        {/* Tab 3: Step-by-Step Instructions */}
        {activeTab === 'instructions' && (
          <div className="p-5 space-y-3.5 text-xs text-neutral-300">
            <div className="font-semibold text-neutral-100 flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-400" />
              <span>How to Install on Any Android Device</span>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <div className="font-semibold text-neutral-200">Open in Chrome or Samsung Internet</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    Navigate to the app URL on your Android mobile device.
                  </div>
                </div>
              </div>

              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <div className="font-semibold text-neutral-200">Tap the 3-Dot Menu (⋮)</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    In Chrome, tap the top-right menu and select <span className="text-emerald-400 font-semibold">"Install App"</span> or <span className="text-emerald-400 font-semibold">"Add to Home screen"</span>.
                  </div>
                </div>
              </div>

              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <div className="font-semibold text-neutral-200">Launch from App Drawer</div>
                  <div className="text-[11px] text-neutral-400 mt-0.5">
                    Android installs TaxVault with its own app icon, standalone fullscreen window, biometric Face/Fingerprint login, and offline receipt storage.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-800 text-center text-[11px] text-neutral-400 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Android 8.0 to Android 15+ Compatible</span>
        </div>
      </div>
    </div>
  );
};
