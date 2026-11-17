'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStudentStore } from '../../lib/store';
import { toast } from 'sonner';
import { Camera, RefreshCw, Check, ShieldAlert, ArrowLeft, User } from 'lucide-react';

function PhotoCaptureContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rollNoParam = searchParams.get('rollNo') || '';

  const student = useStudentStore((s) => s.student);
  const updateStudent = useStudentStore((s) => s.updateStudent);

  const rollNo = rollNoParam || student?.rollNo || '';

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Start front camera
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        'Unable to access front selfie camera. Please allow camera permissions in your browser settings.'
      );
    }
  }, []);

  useEffect(() => {
    startCamera();

    return () => {
      // Clean up camera tracks on unmount
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  // Capture frame to canvas
  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 480;
    canvas.height = 480;

    // Draw square image cropped from video center
    const size = Math.min(video.videoWidth, video.videoHeight);
    const startX = (video.videoWidth - size) / 2;
    const startY = (video.videoHeight - size) / 2;

    ctx.drawImage(video, startX, startY, size, size, 0, 0, 480, 480);

    const base64Data = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(base64Data);
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    if (!stream) {
      startCamera();
    }
  };

  const handleConfirmAndSave = async () => {
    if (!capturedPhoto || !rollNo) {
      toast.error('Missing photo or student PRN.');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/student/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rollNo,
          photoUrl: capturedPhoto,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save photo');
      }

      // Update store and localStorage
      updateStudent({ photoUrl: capturedPhoto });

      // Stop camera
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }

      toast.success('Passport photo locked & verified!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error('Error saving photo', { description: err.message });
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen-mobile bg-[#f0f7ff] flex flex-col items-center justify-between p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="w-full pt-4 pb-2 flex items-center justify-between">
        <button
          onClick={() => router.push('/login')}
          className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-sky-600 font-medium p-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-sky-100 text-sky-700">
          PRN: {rollNo || 'Student'}
        </span>
      </div>

      <div className="text-center my-2">
        <h1 className="text-xl sm:text-2xl font-sora font-extrabold text-slate-900">
          Capture Passport Photo
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
          Align your head and shoulders inside the oval guide below.
        </p>
      </div>

      {/* Camera Viewport with Opaque Passport Oval Overlay */}
      <div className="relative w-[320px] h-[360px] sm:w-[340px] sm:h-[390px] rounded-3xl overflow-hidden shadow-2xl border-2 border-sky-300 bg-black flex items-center justify-center">
        {capturedPhoto ? (
          <img
            src={capturedPhoto}
            alt="Captured Passport"
            className="w-full h-full object-cover"
          />
        ) : cameraError ? (
          <div className="p-6 text-center text-white space-y-3">
            <Camera className="w-10 h-10 text-red-400 mx-auto" />
            <p className="text-xs text-red-200">{cameraError}</p>
            <button
              onClick={startCamera}
              className="px-4 py-2 bg-sky-500 text-white rounded-full text-xs font-medium"
            >
              Retry Camera Permission
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />

            {/* Opaque Mask with Transparent Passport Oval in the middle */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* SVG Mask for crisp rounded oval window */}
              <svg className="w-full h-full absolute inset-0">
                <defs>
                  <mask id="passport-mask">
                    <rect width="100%" height="100%" fill="white" />
                    {/* The cutout oval */}
                    <ellipse cx="50%" cy="46%" rx="90" ry="118" fill="black" />
                  </mask>
                </defs>
                {/* Dark semi-opaque backdrop around the oval */}
                <rect
                  width="100%"
                  height="100%"
                  fill="rgba(15, 23, 42, 0.65)"
                  mask="url(#passport-mask)"
                />
              </svg>

              {/* Glowing Outline Ring for alignment */}
              <div
                className="w-[180px] h-[236px] rounded-[50%] border-2 border-dashed border-sky-400/90 shadow-[0_0_20px_rgba(56,189,248,0.5)] flex flex-col items-center justify-between py-4 pointer-events-none"
                style={{ transform: 'translateY(-14px)' }}
              >
                <span className="text-[10px] font-medium tracking-wider text-sky-200 uppercase bg-slate-900/60 px-2 py-0.5 rounded-full">
                  Top of Head
                </span>
                <span className="text-[10px] font-medium tracking-wider text-sky-200 uppercase bg-slate-900/60 px-2 py-0.5 rounded-full">
                  Chin Level
                </span>
              </div>
            </div>
          </>
        )}

        {/* Hidden Canvas for High-Resolution Capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Security Note Alert */}
      <div className="w-full max-w-sm mt-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] leading-relaxed flex items-start gap-2 shadow-sm">
        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p>
          <strong>Permanent Profile Photo:</strong> This photo serves as your permanent biometric
          baseline for QR attendance and <strong>can never be changed</strong> once confirmed.
        </p>
      </div>

      {/* Bottom Action Controls */}
      <div className="w-full max-w-sm pt-4 pb-6 flex items-center justify-center gap-3">
        {!capturedPhoto ? (
          <button
            onClick={handleCapture}
            disabled={!stream}
            className="w-full bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-semibold rounded-full h-13 shadow-lg shadow-sky-300/50 flex items-center justify-center gap-2 text-sm transition-all"
          >
            <Camera className="w-5 h-5" />
            Capture Photo
          </button>
        ) : (
          <div className="w-full flex gap-3">
            <button
              onClick={handleRetake}
              disabled={saving}
              className="flex-1 bg-white border border-sky-300 hover:bg-sky-50 text-slate-700 font-semibold rounded-full h-12 text-xs flex items-center justify-center gap-1.5 shadow-sm"
            >
              <RefreshCw className="w-4 h-4 text-sky-600" />
              Retake
            </button>
            <button
              onClick={handleConfirmAndSave}
              disabled={saving}
              className="flex-[1.5] bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-semibold rounded-full h-12 text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-300/40"
            >
              {saving ? (
                'Saving...'
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Confirm & Lock PFP
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PhotoCapturePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen-mobile flex items-center justify-center bg-[#f0f7ff]">
          <div className="w-8 h-8 border-4 border-t-sky-500 border-r-transparent border-b-sky-200 border-l-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <PhotoCaptureContent />
    </Suspense>
  );
}
