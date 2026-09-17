

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, Upload, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";
import { useStudentProfile } from '../Hooks/useStudentProfile'; 
// ── Constants ─────────────────────────────────────────────────────────────────

const PASSPORT_W = 413;   // 35mm @ 300dpi
const PASSPORT_H = 531;   // 45mm @ 300dpi
const MAX_FILE_MB = 15;
const MAX_DETECT_SIZE = 1280; // resize before detection to avoid OOM on huge images

// Padding around detected face bounding box
const PAD_TOP    = 0.65;  // forehead + hair room
const PAD_SIDES  = 0.50;
const PAD_BOTTOM = 0.30;

// MediaPipe CDN
const MEDIAPIPE_VISION_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PassportPhotoUploaderProps {
  onPhotoReady: (blob: Blob, dataUrl: string) => void;
  currentPhotoUrl?: string;
  disabled?: boolean;
}

// ── MediaPipe singleton ───────────────────────────────────────────────────────

let _detector: any = null;
let _loadPromise: Promise<any> | null = null;

async function getFaceDetector(): Promise<any> {
  if (_detector) return _detector;
  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_VISION_URL);

    _detector = await FaceDetector.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
        delegate: 'GPU',
      },
      runningMode: 'IMAGE',
      minDetectionConfidence: 0.4,
    });

    return _detector;
  })();

  return _loadPromise;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Shrink canvas to maxSize while keeping aspect ratio — prevents OOM on large photos */
function resizeCanvas(src: HTMLCanvasElement, maxSize: number): HTMLCanvasElement {
  const scale = Math.min(1, maxSize / Math.max(src.width, src.height));
  if (scale === 1) return src;

  const out = document.createElement('canvas');
  out.width  = Math.round(src.width  * scale);
  out.height = Math.round(src.height * scale);
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingEnabled  = true;
  ctx.imageSmoothingQuality  = 'high';
  ctx.drawImage(src, 0, 0, out.width, out.height);
  return out;
}

/** High-quality crop from originalCanvas using float coordinates */
function cropHighQuality(
  src: HTMLCanvasElement,
  sx: number, sy: number, sw: number, sh: number
): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width  = PASSPORT_W;
  out.height = PASSPORT_H;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PASSPORT_W, PASSPORT_H);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, sx, sy, sw, sh, 0, 0, PASSPORT_W, PASSPORT_H);
  return out;
}

// ── Core crop function ────────────────────────────────────────────────────────

async function cropToPassport(file: File): Promise<{ blob: Blob; dataUrl: string }> {
  const detector = await getFaceDetector();

  // 1. Decode original image (full resolution)
  const img = await createImageBitmap(file, { colorSpaceConversion: 'default' });
  const origCanvas = document.createElement('canvas');
  origCanvas.width  = img.width;
  origCanvas.height = img.height;
  const origCtx = origCanvas.getContext('2d')!;
  origCtx.drawImage(img, 0, 0);
  img.close();

  // 2. Resize DOWN for detection only (not for final crop)
  const detectCanvas = resizeCanvas(origCanvas, MAX_DETECT_SIZE);
  const scaleX = origCanvas.width  / detectCanvas.width;
  const scaleY = origCanvas.height / detectCanvas.height;

  // 3. Run MediaPipe detection
  const result = detector.detect(detectCanvas);
  const detections: any[] = result?.detections ?? [];

  if (detections.length === 0) {
    throw new Error(
      'Face could not be detected. Please:\n• Use a clear, front-facing photo\n• Take the photo in good lighting\n• Ensure the face is clearly visible'
    );
  }

  // 4. Pick best (highest confidence or largest) detection
  const best = detections.reduce((a: any, b: any) => {
    const areaA = a.boundingBox.width * a.boundingBox.height;
    const areaB = b.boundingBox.width * b.boundingBox.height;
    return areaA >= areaB ? a : b;
  });

  // 5. Scale bounding box back to original image coordinates
  const bb = best.boundingBox;
  const fx = bb.originX * scaleX;
  const fy = bb.originY * scaleY;
  const fw = bb.width   * scaleX;
  const fh = bb.height  * scaleY;

  // 6. Add generous padding
  const padX = fw * PAD_SIDES;
  const padT = fh * PAD_TOP;
  const padB = fh * PAD_BOTTOM;

  let sx = fx - padX;
  let sy = fy - padT;
  let sw = fw + padX * 2;
  let sh = fh + padT + padB;

  // 7. Enforce passport aspect ratio (35:45 = 0.7778)
  const targetRatio = PASSPORT_W / PASSPORT_H;
  const currentRatio = sw / sh;

  if (currentRatio > targetRatio) {
    const newH = sw / targetRatio;
    sy -= (newH - sh) / 2;
    sh = newH;
  } else {
    const newW = sh * targetRatio;
    sx -= (newW - sw) / 2;
    sw = newW;
  }

  // 8. Clamp to original image bounds
  const clampedSx = Math.max(0, sx);
  const clampedSy = Math.max(0, sy);
  const clampedSw = Math.min(sw, origCanvas.width  - clampedSx);
  const clampedSh = Math.min(sh, origCanvas.height - clampedSy);

  // 9. High-quality render to passport canvas
  const passportCanvas = cropHighQuality(origCanvas, clampedSx, clampedSy, clampedSw, clampedSh);

  // 10. Export as high-quality JPEG
  const blob = await new Promise<Blob>((resolve, reject) => {
    passportCanvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Canvas export failed'))),
      'image/jpeg',
      0.92  
    );
  });

  const dataUrl = passportCanvas.toDataURL('image/jpeg', 0.92);
  return { blob, dataUrl };
}

// ── Component ─────────────────────────────────────────────────────────────────

export const PassportPhotoUploader: React.FC<PassportPhotoUploaderProps> = ({
  onPhotoReady,
  currentPhotoUrl,
  disabled = false,
}) => {
  const fileInputRef                    = useRef<HTMLInputElement>(null);
  const [preview, setPreview]           = useState<string | null>(currentPhotoUrl || null);
  const [status, setStatus]             = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg]         = useState<string | null>(null);
  const [isDragging, setIsDragging]     = useState(false);
  const [modelReady, setModelReady]     = useState(false);

  // Pre-load MediaPipe model on mount (warm-up)
  useEffect(() => {
    getFaceDetector()
      .then(() => setModelReady(true))
      .catch(() => {}); // silent — will retry on upload
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Only image files are allowed (JPG, PNG, HEIC, WebP)');
        setStatus('error');
        return;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        setErrorMsg(`File ${MAX_FILE_MB}MB se chhoti honi chahiye`);
        setStatus('error');
        return;
      }

      setStatus('processing');
      setErrorMsg(null);

      // Show original preview immediately (good UX while processing)
      const tempUrl = URL.createObjectURL(file);
      setPreview(tempUrl);

      try {
        const { blob, dataUrl } = await cropToPassport(file);
        URL.revokeObjectURL(tempUrl);
        setPreview(dataUrl);
        setStatus('done');
        onPhotoReady(blob, dataUrl);
      } catch (err: any) {
        // Keep the original preview so user can see what was uploaded
        setErrorMsg(err?.message || 'Photo process karne mein error aaya');
        setStatus('error');
      }
    },
    [onPhotoReady]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const clearPhoto = () => {
    setPreview(null);
    setStatus('idle');
    setErrorMsg(null);
  };

  const isProcessing = status === 'processing';

  return (
    <div className="flex flex-col items-center gap-3">

      {/* Upload zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload passport photo"
        className={[
          'relative w-24 h-24 rounded-2xl border-2 overflow-hidden cursor-pointer',
          'transition-all duration-200',
          isDragging
            ? 'border-primary-green bg-green-50 scale-105'
            : preview
            ? 'border-gray-200'
            : 'border-dashed border-gray-300 hover:border-primary-green hover:bg-green-50',
          disabled ? 'opacity-50 pointer-events-none' : '',
        ].join(' ')}
        onClick={() => !disabled && fileInputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt="Passport photo preview"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              aria-label="Remove photo"
              onClick={(e) => { e.stopPropagation(); clearPhoto(); }}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50
                         flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1">
            <Camera className="w-6 h-6 text-gray-300" />
            <span className="text-[9px] text-gray-400 text-center px-1 leading-tight">
              {modelReady ? 'Tap to upload' : 'Loading AI…'}
            </span>
          </div>
        )}

        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-white/85 flex flex-col items-center justify-center gap-1.5">
            <Loader2 className="w-5 h-5 text-primary-green animate-spin" />
            <span className="text-[9px] text-gray-500 text-center px-1 leading-tight">
              Face is detecting....<br />
            </span>
          </div>
        )}
      </div>

      {/* Upload button */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isProcessing}
        className="flex items-center gap-1.5 text-xs font-semibold text-primary-green
                   hover:underline disabled:opacity-40 disabled:cursor-not-allowed
                   transition-opacity"
      >
        <Upload className="w-3.5 h-3.5" />
        {isProcessing ? 'Processing…' : 'Upload Photo'}
      </button>

      {/* Status messages */}
      {status === 'done' && (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Passport size ready ✓
        </div>
      )}

      {status === 'error' && errorMsg && (
        <div className="flex items-start gap-1.5 bg-red-50 border border-red-100
                        text-red-600 text-[11px] rounded-xl px-3 py-2.5 max-w-55">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span className="whitespace-pre-line">{errorMsg}</span>
        </div>
      )}

      <p className="text-[10px] text-gray-400 text-center max-w-47.5 leading-relaxed">
       Any size is OK · Auto face detection · Passport-size crop ·
        The face should be clearly visible
      </p>

     <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}   
        />
    </div>
  );
};

export default PassportPhotoUploader;