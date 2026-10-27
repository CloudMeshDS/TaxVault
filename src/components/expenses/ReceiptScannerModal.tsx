import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  X,
  RotateCw,
  Sparkles,
  Crop,
  CheckCircle2,
  FileText,
  AlertCircle,
  ScanLine,
  Layers,
  ArrowRight,
  Eye,
  RefreshCw,
  Image as ImageIcon,
  ShieldCheck,
  PenTool,
  Loader2,
} from 'lucide-react';
import { ExtractedReceiptData, parseReceiptData, getGeminiApiKey } from '../../services/receiptOcr';
import { UserProfile } from '../../types';
import { GeminiApiKeyModal } from '../common/GeminiApiKeyModal';
import { Capacitor } from '@capacitor/core';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { SubscriptionService } from '../../services/subscriptionService';
import { ScanLimitModal } from '../subscription/ScanLimitModal';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onReceiptProcessed: (extracted: ExtractedReceiptData) => void;
  onBatchReceiptsProcessed?: (extractedList: ExtractedReceiptData[]) => void;
  initialMode?: 'camera' | 'upload' | 'picker';
  onOpenManualEntry?: () => void;
  onOpenSubscription?: (reason?: string) => void;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  profile,
  onReceiptProcessed,
  onBatchReceiptsProcessed,
  initialMode = 'camera',
  onOpenManualEntry,
  onOpenSubscription,
}) => {
  const [mode, setMode] = useState<'camera' | 'preview' | 'processing' | 'batch_queue'>('camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [rotation, setRotation] = useState<number>(0);
  const [imageFilter, setImageFilter] = useState<'none' | 'enhanced' | 'high_contrast' | 'grayscale'>('none');
  const [isLimitModalOpen, setIsLimitModalOpen] = useState<boolean>(false);
  const [isScanningBatch, setIsScanningBatch] = useState<boolean>(false);
  const [batchCount, setBatchCount] = useState<number>(0);
  const [batchQueue, setBatchQueue] = useState<ExtractedReceiptData[]>([]);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [processingStatus, setProcessingStatus] = useState<string>('Reading invoice text...');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isVideoStreaming, setIsVideoStreaming] = useState<boolean>(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const cameraCaptureInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Set when the user leaves mid-scan, so a late OCR result is discarded
  const cancelledRef = useRef<boolean>(false);

  // Helper to read file as Data URL
  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Helper to cleanly close and reset all scanner state
  const handleClose = () => {
    cancelledRef.current = true;
    stopCamera();
    setMode('camera');
    setCapturedImage(null);
    setRotation(0);
    setImageFilter('none');
    setProcessingStatus('Reading invoice text...');
    setCameraError(null);
    setIsVideoStreaming(false);
    setBatchQueue([]);
    setBatchCount(0);
    setIsScanningBatch(false);
    onClose();
  };

  // Initialize camera stream when open
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setMode('camera');
      setCapturedImage(null);
      setRotation(0);
      setImageFilter('none');
      setProcessingStatus('Reading invoice text...');
      setCameraError(null);
      setIsVideoStreaming(false);
      return;
    }

    // Modal was opened: ALWAYS start in clean 'camera' mode
    cancelledRef.current = false;
    setMode('camera');
    setCapturedImage(null);
    setRotation(0);
    setImageFilter('none');
    setProcessingStatus('Reading invoice text...');
    setCameraError(null);
    setIsVideoStreaming(false);
    setBatchQueue([]);
    setBatchCount(0);
    setIsScanningBatch(false);

    if (initialMode === 'upload') {
      const scanCheck = SubscriptionService.canScanReceipt(profile);
      if (!scanCheck.allowed) {
        setIsLimitModalOpen(true);
      } else {
        fileInputRef.current?.click();
      }
    } else if (initialMode === 'picker') {
      // Opened after a camera error: show clean fallback options without re-prompting
      setCameraError('Camera access was not granted. Tap below to retry, choose from your gallery, or upload a PDF.');
    } else if (Capacitor.isNativePlatform()) {
      takePhotoNative();
    } else {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, initialMode]);

  const startCamera = async () => {
    setCameraError(null);
    setIsVideoStreaming(false);

    // On native mobile platform, native camera plugin is used instead of WebView getUserMedia
    if (Capacitor.isNativePlatform()) {
      setCameraError('Tap "Take Photo with Camera" below to scan your receipt.');
      return;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false,
          });
        } catch {
          // Fast fallback to any available camera feed
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        if (stream) {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().then(() => {
              setIsVideoStreaming(true);
            }).catch(() => {});
          }
          return;
        }
      }
      setCameraError('Direct camera feed unavailable. Tap below to select an image or PDF.');
    } catch (e: any) {
      console.warn('Camera stream error:', e);
      if (e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError') {
        setCameraError('Camera access was not allowed in browser permissions. You can choose a photo from your gallery below.');
      } else {
        setCameraError('Live video viewfinder unavailable. Tap "Take Photo with Camera" or choose from gallery.');
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsVideoStreaming(false);
  };

  const takePhotoNative = async () => {
    const scanCheck = SubscriptionService.canScanReceipt(profile);
    if (!scanCheck.allowed) {
      setIsLimitModalOpen(true);
      return;
    }

    try {
      const photo = await CapCamera.getPhoto({
        quality: 92,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });
      if (photo?.dataUrl) {
        setCapturedImage(photo.dataUrl);
        setRotation(0);
        setImageFilter('none');
        setMode('preview');
        stopCamera();
        return;
      }
    } catch (err: any) {
      const msg = String(err?.message || err || '').toLowerCase();
      if (msg.includes('cancel') || msg.includes('user cancelled') || msg.includes('cancelled')) {
        return;
      }
      console.warn('Capacitor native camera error:', err);
      // Do NOT trigger fallback HTML input automatically (it causes a second redundant permission prompt)
      setCameraError('Camera access was not granted. Tap below to retry, choose from your gallery, or upload a PDF.');
    }
  };

  const pickPhotoFromGallery = async () => {
    const scanCheck = SubscriptionService.canScanReceipt(profile);
    if (!scanCheck.allowed) {
      setIsLimitModalOpen(true);
      return;
    }

    try {
      const photo = await CapCamera.getPhoto({
        quality: 92,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
      });
      if (photo?.dataUrl) {
        setCapturedImage(photo.dataUrl);
        setRotation(0);
        setImageFilter('none');
        setMode('preview');
        stopCamera();
        return;
      }
    } catch {
      fileInputRef.current?.click();
    }
  };

  // Capture frame from video feed or trigger native camera
  const handleCapturePhoto = () => {
    const scanCheck = SubscriptionService.canScanReceipt(profile);
    if (!scanCheck.allowed) {
      setIsLimitModalOpen(true);
      return;
    }

    if (videoRef.current && streamRef.current && videoRef.current.videoWidth > 0) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 800;
      canvas.height = video.videoHeight || 1000;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);
        setRotation(0);
        setImageFilter('none');
        setMode('preview');
        stopCamera();
      }
    } else {
      // Direct native camera capture
      takePhotoNative();
    }
  };

  // Handle uploaded file (image or PDF, single or multiple)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const scanCheck = SubscriptionService.canScanReceipt(profile);
    if (!scanCheck.allowed) {
      setIsLimitModalOpen(true);
      if (e.target) e.target.value = '';
      return;
    }

    if (files.length > 1) {
      // Multi-file batch upload queue
      setMode('processing');
      setProcessingStatus(`Queued ${files.length} receipts for AI scan...`);
      const extractedList: ExtractedReceiptData[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setBatchProgress({ current: i + 1, total: files.length });
        setProcessingStatus(`Reading receipt ${i + 1} of ${files.length} (${file.name})...`);
        try {
          const dataUrl = await readFileAsDataUrl(file);
          const data = await parseReceiptData(
            dataUrl,
            profile.taxId || profile.gstin || '',
            profile.country || 'NZ'
          );
          data.originalImage = dataUrl;
          data.receiptFileName = file.name;
          extractedList.push(data);
        } catch {
          // ignore error
        }
      }

      if (cancelledRef.current) return;
      setBatchQueue(extractedList);
      setMode('batch_queue');
      stopCamera();
      return;
    }

    const file = files[0];
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    try {
      const dataUrl = await readFileAsDataUrl(file);
      if (isPdf) {
        // PDF invoice extraction
        setProcessingStatus(`Parsing invoice ${file.name}...`);
        setMode('processing');
        const data = await parseReceiptData(
          dataUrl,
          profile.taxId || profile.gstin || '',
          profile.country || 'NZ'
        );
        if (cancelledRef.current) return;
        data.originalImage = dataUrl;
        data.receiptFileName = file.name;
        stopCamera();
        setMode('camera');
        setCapturedImage(null);
        onReceiptProcessed(data);
        onClose();
      } else {
        setCapturedImage(dataUrl);
        setRotation(0);
        setImageFilter('none');
        setMode('preview');
        stopCamera();
      }
    } catch {
      setMode('camera');
    }
  };

  // Rotate preview 90 deg clockwise
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Toggle image enhancement filter
  const handleImproveImage = () => {
    const filters: ('none' | 'enhanced' | 'high_contrast' | 'grayscale')[] = [
      'none',
      'enhanced',
      'high_contrast',
      'grayscale',
    ];
    const nextIdx = (filters.indexOf(imageFilter) + 1) % filters.length;
    setImageFilter(filters[nextIdx]);
  };

  // Process the captured/uploaded image with OCR + AI
  const handleConfirmAndProcess = async () => {
    if (!capturedImage) return;

    setMode('processing');
    setProcessingStatus('Reading receipt and detecting tax details...');

    try {
      const extracted = await parseReceiptData(
        capturedImage,
        profile.taxId || profile.gstin || '',
        profile.country || 'NZ'
      );
      if (cancelledRef.current) return;
      extracted.originalImage = capturedImage;

      if (isScanningBatch) {
        setBatchCount((prev) => prev + 1);
        onReceiptProcessed(extracted);
        // Continue scanning next receipt
        setCapturedImage(null);
        setMode('camera');
        startCamera();
      } else {
        stopCamera();
        setMode('camera');
        setCapturedImage(null);
        onReceiptProcessed(extracted);
        onClose();
      }
    } catch (err) {
      setMode('preview');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs backdrop-blur-md flex flex-col justify-between overflow-x-hidden select-none modal-backdrop-animation">
      {/* Top Header Bar */}
      <div className="px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] flex items-center justify-between gap-2 text-white border-b border-slate-200 bg-slate-50/80 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <ScanLine className="w-5 h-5 text-emerald-700 shrink-0" />
          <span className="font-extrabold text-sm tracking-tight truncate">Scan Receipt</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {mode !== 'processing' && (
            <>
              {/* AI Vision Key Setup */}
              <button
                onClick={() => setIsApiKeyModalOpen(true)}
                className="text-xs px-2 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer border bg-emerald-50 border-emerald-500/40 text-emerald-700 font-bold"
                title={
                  getGeminiApiKey()
                    ? 'AI reading is on (using your personal Gemini key as backup)'
                    : 'AI reading is on. Optionally add a personal Gemini key as backup.'
                }
              >
                AI On
              </button>

              {/* Multiple receipts toggle */}
              <button
                onClick={() => setIsScanningBatch(!isScanningBatch)}
                className={`text-xs px-2 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer border ${
                  isScanningBatch
                    ? 'bg-emerald-50 border-emerald-500/50 text-emerald-700 font-bold'
                    : 'bg-white shadow-xs border-slate-200 text-slate-500 hover:text-white'
                }`}
                title="Scan multiple receipts in succession"
              >
                Batch{batchCount > 0 ? ` (${batchCount})` : ''}
              </button>
            </>
          )}

          {/* Manual Entry Button */}
          <button
            onClick={() => {
              handleClose();
              onOpenManualEntry?.();
            }}
            className="text-xs px-2 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer border bg-white shadow-xs border-slate-200 text-slate-700 hover:text-white hover:border-emerald-500/50"
            title="Enter expense manually without scanning"
          >
            {mode === 'processing' ? 'Enter Manually' : 'Manual'}
          </button>

          {mode !== 'processing' && (
            <button
              aria-label="Close"
              onClick={handleClose}
              className="p-1.5 rounded-lg bg-white shadow-xs hover:bg-slate-100 text-slate-500 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Hidden File Inputs (Supports Single or Multi-Select Batch Upload) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraCaptureInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Center Viewport */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-slate-50">
        {mode === 'batch_queue' && (
          <div className="p-4 max-w-md mx-auto w-full space-y-3.5 animate-in fade-in">
            <div className="p-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-md">
              <div>
                <h4 className="font-extrabold text-sm text-white flex items-center gap-2">
                  <span>Batch Upload Queue</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                    {batchQueue.length} Ready
                  </span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Multi-receipt OCR scan completed successfully
                </p>
              </div>
            </div>

            {/* List of extracted receipts in batch */}
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {batchQueue.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-white truncate">{item.merchant}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {item.date} · <span className="text-slate-700">{item.category}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-xs font-extrabold text-emerald-700">
                      ${item.totalAmount.toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      Conf: {item.confidenceScores.total}%
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Batch Action Buttons */}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setBatchQueue([]);
                  setMode('camera');
                  startCamera();
                }}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onBatchReceiptsProcessed) {
                    onBatchReceiptsProcessed(batchQueue);
                  } else {
                    batchQueue.forEach((item) => onReceiptProcessed(item));
                  }
                  onClose();
                }}
                className="flex-1 bg-brand hover:bg-brand-strong active:scale-[0.98] text-white font-black py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20 transition-all"
              >
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Save All ({batchQueue.length}) to Vault</span>
              </button>
            </div>
          </div>
        )}

        {mode === 'camera' && (
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            {cameraError ? (
              <div className="p-6 text-center max-w-sm space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-700 mx-auto">
                  <Camera className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-bold text-white">Camera Scanner</div>
                  <div className="text-xs text-slate-700 leading-relaxed">
                    {cameraError}
                  </div>
                </div>
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    onClick={takePhotoNative}
                    className="w-full bg-brand hover:bg-brand-strong active:scale-[0.98] text-white font-black py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Camera className="w-4 h-4 text-white shrink-0" />
                    <span className="whitespace-nowrap">Take Camera Photo</span>
                  </button>
                  <button
                    onClick={pickPhotoFromGallery}
                    className="w-full bg-white shadow-xs hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Upload className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="whitespace-nowrap">Choose from Gallery</span>
                  </button>
                  <button
                    onClick={() => pdfInputRef.current?.click()}
                    className="w-full bg-slate-50 hover:bg-white border border-slate-200 text-slate-500 font-semibold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="whitespace-nowrap">Upload PDF Receipt</span>
                  </button>
                  <button
                    onClick={() => {
                      stopCamera();
                      onClose();
                      onOpenManualEntry?.();
                    }}
                    className="w-full bg-white shadow-xs hover:bg-slate-50 border border-emerald-500/40 text-emerald-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <PenTool className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="whitespace-nowrap">Enter Expense Manually</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={startCamera}
                  className="text-xs text-slate-500 hover:text-slate-600 underline cursor-pointer"
                >
                  Retry Live Viewfinder
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  onPlaying={() => setIsVideoStreaming(true)}
                  onLoadedMetadata={() => {
                    videoRef.current?.play().catch(() => {});
                    setIsVideoStreaming(true);
                  }}
                  className="w-full h-full object-cover"
                />

                {/* Receipt Boundary Detection Overlay Animation - Only when video is actively streaming */}
                {isVideoStreaming && (
                  <>
                    <div className="absolute inset-x-8 inset-y-16 pointer-events-none border-2 border-emerald-500/60 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between p-4">
                      {/* Corner accents */}
                      <div className="flex justify-between">
                        <div className="w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                        <div className="w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                      </div>

                      {/* Scanning Laser Line */}
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10b981] animate-pulse" />

                      <div className="flex justify-between">
                        <div className="w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                        <div className="w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                      </div>
                    </div>

                    <div className="absolute bottom-6 inset-x-0 text-center pointer-events-none">
                      <span className="bg-black/50 backdrop-blur-xs backdrop-blur-md text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-500/30">
                        Align receipt within border · Auto-focus active
                      </span>
                    </div>
                  </>
                )}

                {!isVideoStreaming && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-slate-700 text-xs gap-2.5">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-700" />
                    <span className="font-medium text-slate-700">Connecting camera...</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {mode === 'preview' && capturedImage && (
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <div
              className={`max-w-full max-h-[80vh] rounded-2xl overflow-hidden transition-all shadow-2xl border border-slate-200 ${
                imageFilter === 'enhanced'
                  ? 'contrast-125 brightness-110 saturate-110'
                  : imageFilter === 'high_contrast'
                  ? 'contrast-150 brightness-95'
                  : imageFilter === 'grayscale'
                  ? 'grayscale contrast-125'
                  : ''
              }`}
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              <img
                src={capturedImage}
                alt="Captured Receipt"
                className="max-h-[75vh] w-auto object-contain rounded-2xl"
              />
            </div>
          </div>
        )}

        {mode === 'processing' && (
          <div className="p-8 text-center space-y-4 max-w-sm">
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping" />
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500 flex items-center justify-center text-emerald-700 shadow-xl">
                <ScanLine className="w-10 h-10 animate-bounce" />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-white">AI OCR Reading Receipt</h3>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                {processingStatus}
              </p>
            </div>

            <div className="text-xs text-emerald-700/90 font-mono bg-emerald-50 border border-emerald-200 py-1.5 px-3 rounded-full">
              Checking GSTIN & Financial Totals...
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-slate-50 border-t border-slate-200 z-20">
        {mode === 'camera' && (
          <div className="flex items-center justify-around max-w-sm mx-auto">
            {/* Upload PDF */}
            <button
              onClick={() => {
                const scanCheck = SubscriptionService.canScanReceipt(profile);
                if (!scanCheck.allowed) {
                  setIsLimitModalOpen(true);
                  return;
                }
                pdfInputRef.current?.click();
              }}
              className="flex flex-col items-center gap-1 text-slate-500 hover:text-white transition-colors cursor-pointer"
            >
              <div className="w-11 h-11 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-700" />
              </div>
              <span className="text-xs font-medium">Upload PDF</span>
            </button>

            {/* Shutter Button (Capture) */}
            <button
              onClick={handleCapturePhoto}
              className="w-18 h-18 rounded-full bg-brand hover:bg-brand-strong active:scale-95 p-1 flex items-center justify-center shadow-xl shadow-emerald-500/30 cursor-pointer transition-transform"
            >
              <div className="w-full h-full rounded-full border-2 border-slate-200 flex items-center justify-center bg-white">
                <Camera className="w-7 h-7 text-slate-900 stroke-[2.5]" />
              </div>
            </button>

            {/* Upload Photo from gallery */}
            <button
              onClick={pickPhotoFromGallery}
              className="flex flex-col items-center gap-1 text-slate-500 hover:text-white transition-colors cursor-pointer"
            >
              <div className="w-11 h-11 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-teal-700" />
              </div>
              <span className="text-xs font-medium">Gallery</span>
            </button>

            {/* Manual Entry */}
            <button
              onClick={() => {
                stopCamera();
                onClose();
                onOpenManualEntry?.();
              }}
              className="flex flex-col items-center gap-1 text-slate-500 hover:text-white transition-colors cursor-pointer"
              title="Add expense without scanning"
            >
              <div className="w-11 h-11 rounded-2xl bg-white shadow-xs border border-slate-200 flex items-center justify-center hover:border-emerald-500/50">
                <PenTool className="w-5 h-5 text-amber-700" />
              </div>
              <span className="text-xs font-medium">Manual</span>
            </button>
          </div>
        )}

        {mode === 'preview' && (
          <div className="space-y-3 max-w-md mx-auto">
            {/* Image Adjustment Bar: Retake, Rotate, Improve Filter */}
            <div className="flex items-center justify-around border-b border-slate-200 pb-2.5 text-xs text-slate-700">
              <button
                onClick={() => {
                  setCapturedImage(null);
                  setMode('camera');
                  startCamera();
                }}
                className="flex items-center gap-1.5 hover:text-white cursor-pointer whitespace-nowrap shrink-0"
              >
                <RefreshCw className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="whitespace-nowrap">Retake</span>
              </button>

              <button
                onClick={handleRotate}
                className="flex items-center gap-1.5 hover:text-white cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCw className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="whitespace-nowrap">Rotate 90°</span>
              </button>

              <button
                onClick={handleImproveImage}
                className="flex items-center gap-1.5 hover:text-white cursor-pointer whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="whitespace-nowrap">
                  Improve ({imageFilter === 'none' ? 'Normal' : imageFilter})
                </span>
              </button>
            </div>

            {/* Proceed to OCR Check Button */}
            <button
              onClick={handleConfirmAndProcess}
              className="w-full bg-brand hover:bg-brand-strong active:scale-[0.98] text-white font-black py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 cursor-pointer transition-all whitespace-nowrap"
            >
              <CheckCircle2 className="w-5 h-5 text-white stroke-[2.5] shrink-0" />
              <span className="text-sm font-black whitespace-nowrap">Read Receipt with AI</span>
              <ArrowRight className="w-4 h-4 text-white shrink-0" />
            </button>
          </div>
        )}
      </div>

      {/* Gemini AI Key Setup Modal */}
      <GeminiApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
      />

      {/* Scan Limit Alert Modal */}
      <ScanLimitModal
        isOpen={isLimitModalOpen}
        onClose={() => setIsLimitModalOpen(false)}
        profile={profile}
        onUpgradeToPro={() => {
          setIsLimitModalOpen(false);
          stopCamera();
          onClose();
          onOpenSubscription?.('AI Receipt Scan Limit Reached');
        }}
        onEnterManually={() => {
          setIsLimitModalOpen(false);
          stopCamera();
          onClose();
          onOpenManualEntry?.();
        }}
      />
    </div>
  );
};
