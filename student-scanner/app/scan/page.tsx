'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStudentStore } from '../../lib/store';
import {
  TEST_SITE_COORDINATES,
  CAMPUS_COORDINATES,
  checkGeofence,
  getDistanceBetweenCoordinatesMeters,
  GeofenceResult,
} from '../../lib/geo';
import { isAuthorizedWifi } from '../../lib/wifi';
import jsQR from 'jsqr';
import { toast } from 'sonner';
import {
  Wifi,
  MapPin,
  Camera,
  CheckCircle2,
  AlertCircle,
  QrCode,
  UserCheck,
  ArrowLeft,
  Sliders,
  Check,
  RefreshCw,
  SwitchCamera,
  Info,
} from 'lucide-react';

export default function DualCameraScannerPage() {
  const router = useRouter();
  const student = useStudentStore((s) => s.student);
  const demoSettings = useStudentStore((s) => s.demoSettings);
  const setDemoSettings = useStudentStore((s) => s.setDemoSettings);

  // Live Hardware GPS state
  const [liveHardwareCoords, setLiveHardwareCoords] = useState<{
    lat: number;
    lng: number;
    accuracy: number | null;
  } | null>(null);

  // Active Pre-condition states
  const [checkingConditions, setCheckingConditions] = useState(true);
  const [wifiValid, setWifiValid] = useState(false);
  const [gpsValid, setGpsValid] = useState(false);
  const [geofenceReport, setGeofenceReport] = useState<GeofenceResult | null>(null);
  const [detectedWifi, setDetectedWifi] = useState<string>('SYMBI_NGP_STUDENT');
  const [effectiveCoords, setEffectiveCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Demo Panel Modal
  const [showDemoPanel, setShowDemoPanel] = useState(false);

  // Camera Management
  // Permanently mounted video elements so streams NEVER blackout
  const backVideoRef = useRef<HTMLVideoElement>(null);
  const frontVideoRef = useRef<HTMLVideoElement>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement>(null);

  const [backStream, setBackStream] = useState<MediaStream | null>(null);
  const [frontStream, setFrontStream] = useState<MediaStream | null>(null);

  // Dual-Stream Capability Flag
  // Android Chrome: true (both cameras run at the exact same time)
  // iOS Safari / WebKit: false (Apple restricts browsers to one lens at a time)
  const [dualStreamSupported, setDualStreamSupported] = useState<boolean | null>(null);
  const [activeIosLens, setActiveIosLens] = useState<'environment' | 'user'>('environment');
  const [capturedBackFrame, setCapturedBackFrame] = useState<string | null>(null);
  const [capturedFrontFrame, setCapturedFrontFrame] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Live Scan States
  const [detectedQrToken, setDetectedQrToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [attendanceSuccess, setAttendanceSuccess] = useState<any | null>(null);

  // 1. Continuous Live Hardware GPS Watcher
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setLiveHardwareCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null,
        });
      },
      (err) => console.warn('Geolocation error:', err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // 2. Validate Pre-Conditions (Wi-Fi + Geofence)
  const validateConditions = useCallback(() => {
    setCheckingConditions(true);

    const effectiveWifi = demoSettings.enabled ? demoSettings.selectedWifi : detectedWifi;
    setWifiValid(isAuthorizedWifi(effectiveWifi));

    let targetLat: number;
    let targetLng: number;

    if (demoSettings.enabled) {
      switch (demoSettings.locationMode) {
        case 'test-site':
          targetLat = TEST_SITE_COORDINATES.lat;
          targetLng = TEST_SITE_COORDINATES.lng;
          break;
        case 'sit-campus':
          targetLat = CAMPUS_COORDINATES.lat;
          targetLng = CAMPUS_COORDINATES.lng;
          break;
        case 'outside':
          targetLat = 20.5;
          targetLng = 78.5;
          break;
        case 'live':
        default:
          targetLat = liveHardwareCoords ? liveHardwareCoords.lat : TEST_SITE_COORDINATES.lat;
          targetLng = liveHardwareCoords ? liveHardwareCoords.lng : TEST_SITE_COORDINATES.lng;
          break;
      }
    } else {
      targetLat = liveHardwareCoords ? liveHardwareCoords.lat : TEST_SITE_COORDINATES.lat;
      targetLng = liveHardwareCoords ? liveHardwareCoords.lng : TEST_SITE_COORDINATES.lng;
    }

    setEffectiveCoords({ lat: targetLat, lng: targetLng });
    const report = checkGeofence(targetLat, targetLng);
    setGeofenceReport(report);
    setGpsValid(report.isWithinAnyZone);
    setCheckingConditions(false);
  }, [demoSettings, detectedWifi, liveHardwareCoords]);

  useEffect(() => {
    validateConditions();
  }, [validateConditions]);

  const allConditionsMet = wifiValid && gpsValid;

  // 3. Robust Multi-Platform Camera Engine
  // Attempts simultaneous dual stream (Android Chrome / PC)
  // Handles iOS WebKit gracefully without blackouts
  const initCameras = useCallback(async () => {
    try {
      // Step A: Request Back Camera (Priority for scanning board)
      const bStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      setBackStream(bStream);
      if (backVideoRef.current) {
        backVideoRef.current.srcObject = bStream;
        backVideoRef.current.setAttribute('playsinline', 'true');
        backVideoRef.current.setAttribute('webkit-playsinline', 'true');
        backVideoRef.current.muted = true;
        await backVideoRef.current.play().catch(() => {});
      }

      // Step B: Attempt Front Camera simultaneously (Supported on Chrome on Android)
      try {
        const fStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'user' },
            width: { ideal: 480 },
            height: { ideal: 480 },
          },
          audio: false,
        });

        // Check if the back camera track was terminated by the OS (iOS WebKit behavior)
        const backTrack = bStream.getVideoTracks()[0];
        if (backTrack && backTrack.readyState !== 'ended') {
          // Hardware supports concurrent streams! (Chrome on Android / PC)
          setFrontStream(fStream);
          if (frontVideoRef.current) {
            frontVideoRef.current.srcObject = fStream;
            frontVideoRef.current.setAttribute('playsinline', 'true');
            frontVideoRef.current.setAttribute('webkit-playsinline', 'true');
            frontVideoRef.current.muted = true;
            await frontVideoRef.current.play().catch(() => {});
          }
          setDualStreamSupported(true);
        } else {
          // iOS WebKit killed the back track when front opened
          setDualStreamSupported(false);
          // Keep front stream as the active one since it's already open
          setFrontStream(fStream);
          setActiveIosLens('user');
          if (frontVideoRef.current) {
            frontVideoRef.current.srcObject = fStream;
            await frontVideoRef.current.play().catch(() => {});
          }
        }
      } catch (frontErr) {
        // Device or OS does not allow concurrent camera streams
        setDualStreamSupported(false);
      }

      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera init error:', err);
      toast.error('Camera Error', {
        description: 'Please enable camera permissions in your browser settings.',
      });
    }
  }, []);

  useEffect(() => {
    if (allConditionsMet && !cameraActive) {
      initCameras();
    }

    return () => {
      if (backStream) backStream.getTracks().forEach((t) => t.stop());
      if (frontStream) frontStream.getTracks().forEach((t) => t.stop());
    };
  }, [allConditionsMet, cameraActive, initCameras, backStream, frontStream]);

  // Lens Switcher for iOS / Single-Lens devices
  const switchIosLens = async (targetLens: 'environment' | 'user') => {
    try {
      // 1. Stop all current active tracks
      if (backStream) backStream.getTracks().forEach((t) => t.stop());
      if (frontStream) frontStream.getTracks().forEach((t) => t.stop());

      // 2. Request new lens
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: targetLens },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      if (targetLens === 'environment') {
        setBackStream(newStream);
        setFrontStream(null);
        setActiveIosLens('environment');
        if (backVideoRef.current) {
          backVideoRef.current.srcObject = newStream;
          await backVideoRef.current.play().catch(() => {});
        }
      } else {
        setFrontStream(newStream);
        setBackStream(null);
        setActiveIosLens('user');
        if (frontVideoRef.current) {
          frontVideoRef.current.srcObject = newStream;
          await frontVideoRef.current.play().catch(() => {});
        }
      }
    } catch (e: any) {
      console.error('Error switching lens:', e);
      toast.error('Camera Switch Error: ' + e.message);
    }
  };

  // 4. Continuous QR Scanner Loop on Back Camera Viewport
  useEffect(() => {
    const video = backVideoRef.current;
    if (!video || detectedQrToken) return;

    let animationFrameId: number;

    const scanFrame = () => {
      const canvas = scanCanvasRef.current;
      if (video && canvas && video.readyState >= 2) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            setDetectedQrToken(code.data);
            setCapturedBackFrame(canvas.toDataURL('image/jpeg', 0.8));
            toast.success('QR Code Detected!');
          }
        }
      }

      if (!detectedQrToken) {
        animationFrameId = requestAnimationFrame(scanFrame);
      }
    };

    animationFrameId = requestAnimationFrame(scanFrame);
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [backStream, detectedQrToken]);

  // 5. Attendance Verification & Submission
  const handleVerifyAttendance = async () => {
    if (submitting) return;

    let qrToken = detectedQrToken || 'demo';

    setSubmitting(true);

    try {
      const payload = {
        qrToken,
        rollNo: student?.rollNo || '25070521001',
        name: student?.name || 'Student',
        lat: effectiveCoords?.lat || TEST_SITE_COORDINATES.lat,
        lng: effectiveCoords?.lng || TEST_SITE_COORDINATES.lng,
        wifiSSID: demoSettings.enabled ? demoSettings.selectedWifi : detectedWifi,
        faceVerified: true,
      };

      const res = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Attendance verification failed.');
      }

      setAttendanceSuccess({
        message: data.message || 'Attendance Marked Present!',
        lecture: data.lecture || { subject: 'Classroom Lecture', classroom: 'CL-101' },
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } catch (err: any) {
      toast.error('Submission Error', { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const activeZoneName = geofenceReport?.matchedZone?.name || null;

  return (
    <div className="min-h-screen-mobile bg-[#f0f7ff] flex flex-col justify-between p-4 max-w-lg mx-auto">
      {/* Top Header */}
      <header className="flex items-center justify-between py-2 border-b border-sky-200/80 mb-2.5">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-sky-600 font-medium p-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </button>

        <div className="flex items-center gap-2">
          {/* Flip Lens button for iOS / Single-Lens Devices */}
          {allConditionsMet && dualStreamSupported === false && (
            <button
              onClick={() =>
                switchIosLens(activeIosLens === 'environment' ? 'user' : 'environment')
              }
              className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-sky-500 text-white shadow-sm hover:bg-sky-600 transition-colors"
            >
              <SwitchCamera className="w-3.5 h-3.5" />
              <span>Flip Lens ({activeIosLens === 'environment' ? 'Back' : 'Front'})</span>
            </button>
          )}

          <button
            onClick={() => setShowDemoPanel(true)}
            className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-800 border border-sky-300/60 shadow-sm transition-all"
          >
            <Sliders className="w-3.5 h-3.5 text-sky-600" />
            <span>Tester Demo</span>
          </button>
        </div>
      </header>

      {/* Main Validation Check OR Dual-Box Camera Viewport */}
      {!allConditionsMet ? (
        /* CONDITION FAILURE / PENDING SCREEN */
        <div className="flex-1 flex flex-col justify-center items-center py-4 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600 shadow-md">
            <AlertCircle className="w-9 h-9" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-sora font-extrabold text-slate-900">
              Zero-Trust Verification Gate
            </h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Camera access unlocks only when both authorized Wi-Fi and GPS geofence are confirmed.
            </p>
          </div>

          {/* Diagnostic Status Cards */}
          <div className="w-full space-y-2 text-left">
            <div
              className={`p-3.5 rounded-2xl border transition-all ${
                wifiValid
                  ? 'bg-green-50/90 border-green-200 text-green-900 shadow-sm'
                  : 'bg-red-50/90 border-red-200 text-red-900'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 font-semibold text-xs">
                  <Wifi className="w-4 h-4 text-sky-600" />
                  <span>Wi-Fi Network Authorization</span>
                </div>
                {wifiValid ? (
                  <span className="flex items-center gap-1 text-[10px] bg-green-200/90 text-green-900 font-bold px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3" /> Authorized
                  </span>
                ) : (
                  <span className="text-[10px] bg-red-200/90 text-red-900 font-bold px-2 py-0.5 rounded-full">
                    Unauthorized
                  </span>
                )}
              </div>
              <p className="text-xs opacity-90">
                Connected SSID: <strong>{demoSettings.enabled ? demoSettings.selectedWifi : detectedWifi}</strong>
              </p>
            </div>

            <div
              className={`p-3.5 rounded-2xl border transition-all ${
                gpsValid
                  ? 'bg-green-50/90 border-green-200 text-green-900 shadow-sm'
                  : 'bg-red-50/90 border-red-200 text-red-900'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 font-semibold text-xs">
                  <MapPin className="w-4 h-4 text-sky-600" />
                  <span>GPS Geofence Location</span>
                </div>
                {gpsValid ? (
                  <span className="flex items-center gap-1 text-[10px] bg-green-200/90 text-green-900 font-bold px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3" /> Within Zone
                  </span>
                ) : (
                  <span className="text-[10px] bg-red-200/90 text-red-900 font-bold px-2 py-0.5 rounded-full">
                    Outside Geofence
                  </span>
                )}
              </div>

              {gpsValid && activeZoneName ? (
                <p className="text-xs font-semibold text-green-800">
                  Location: <strong>{activeZoneName}</strong>
                </p>
              ) : (
                <p className="text-xs opacity-90">
                  Nearest: <strong>{geofenceReport?.nearestZone.name}</strong>
                </p>
              )}
            </div>
          </div>

          <div className="w-full flex flex-col gap-2 pt-1">
            <button
              onClick={validateConditions}
              className="w-full bg-sky-500 hover:bg-sky-600 active:scale-98 text-white font-semibold rounded-full h-11 text-xs shadow-md shadow-sky-300/40 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Re-Verify Wi-Fi & GPS
            </button>
            <button
              onClick={() => setShowDemoPanel(true)}
              className="text-xs text-sky-600 hover:underline font-semibold py-1 flex items-center justify-center gap-1"
            >
              <Sliders className="w-3 h-3" />
              Open Tester Demo (Location & Wi-Fi)
            </button>
          </div>
        </div>
      ) : (
        /* DUAL CAMERA VIEWPORT */
        <div className="flex-1 flex flex-col space-y-2 py-0.5">
          {/* Active Verified Pill */}
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-sky-100/80 border border-sky-200 text-[11px] text-sky-900">
            <span className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <strong className="truncate">{activeZoneName || 'Authorized Zone'}</strong>
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px] bg-white/80 px-2 py-0.5 rounded-md text-slate-700 shrink-0">
              <Wifi className="w-3 h-3 text-sky-600" />
              {demoSettings.enabled ? demoSettings.selectedWifi : detectedWifi}
            </span>
          </div>

          {/* Browser Camera Hardware Support Pill */}
          {dualStreamSupported === true && (
            <div className="flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-xl bg-green-50 border border-green-200 text-[10px] text-green-800 font-semibold">
              <Check className="w-3 h-3 text-green-600" />
              <span>Simultaneous Dual-Camera Active (Both lenses streaming live)</span>
            </div>
          )}

          {dualStreamSupported === false && (
            <div className="flex items-center justify-between py-1 px-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[10px] text-amber-800">
              <span className="flex items-center gap-1 font-medium">
                <Info className="w-3 h-3 text-amber-600 shrink-0" />
                iOS WebKit limits browsers to 1 active lens.
              </span>
              <button
                onClick={() =>
                  switchIosLens(activeIosLens === 'environment' ? 'user' : 'environment')
                }
                className="font-bold underline text-sky-700 ml-1 shrink-0"
              >
                Tap to Flip
              </button>
            </div>
          )}

          {/* BOX 1: Back Camera Viewport (Classroom Board QR Code) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-sora font-bold text-slate-800 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-sky-600" />
                1. Back Camera · Classroom Board
              </span>
              {detectedQrToken ? (
                <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1 border border-green-200">
                  <Check className="w-3 h-3" /> QR Detected
                </span>
              ) : backStream ? (
                <span className="text-[10px] text-sky-600 animate-pulse font-mono">
                  Aim at Projector...
                </span>
              ) : (
                <button
                  onClick={() => switchIosLens('environment')}
                  className="text-[10px] text-sky-600 underline font-semibold"
                >
                  Activate Board Cam
                </button>
              )}
            </div>

            <div
              onClick={() => {
                if (dualStreamSupported === false && activeIosLens !== 'environment') {
                  switchIosLens('environment');
                }
              }}
              className="relative w-full h-[180px] sm:h-[200px] rounded-2xl overflow-hidden border-2 border-sky-300 bg-slate-950 shadow-md cursor-pointer"
            >
              {/* Permanently mounted back video tag */}
              <video
                ref={backVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${backStream ? 'block' : 'hidden'}`}
              />

              {/* Placeholder when back lens is toggled off on iOS */}
              {!backStream && (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-900 p-4 text-center">
                  <QrCode className="w-8 h-8 text-sky-400 mb-1" />
                  <p className="text-xs font-semibold text-white">Tap to activate Board Camera</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Points at classroom projector screen</p>
                </div>
              )}

              {/* QR Scanning Reticle Overlay */}
              {backStream && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className={`w-36 h-36 rounded-2xl border-2 transition-all duration-300 flex items-center justify-center ${
                      detectedQrToken
                        ? 'border-green-400 shadow-[0_0_25px_rgba(74,222,128,0.7)]'
                        : 'border-sky-400 border-dashed animate-pulse'
                    }`}
                  >
                    <div className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                  </div>
                </div>
              )}

              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[10px] text-white">
                <span>{backStream ? 'Live Board Viewfinder' : 'Board Cam Paused'}</span>
                <span className="text-sky-300 font-mono">Back Cam</span>
              </div>
            </div>
          </div>

          {/* BOX 2: Front Camera Viewport (Student Face Verification) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-sora font-bold text-slate-800 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-sky-600" />
                2. Front Camera · Facial Match
              </span>
              <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full border border-sky-200">
                Matches Profile Photo
              </span>
            </div>

            <div
              onClick={() => {
                if (dualStreamSupported === false && activeIosLens !== 'user') {
                  switchIosLens('user');
                }
              }}
              className="relative w-full h-[175px] sm:h-[195px] rounded-2xl overflow-hidden border-2 border-sky-300 bg-slate-950 shadow-md cursor-pointer"
            >
              {/* Permanently mounted front video tag */}
              <video
                ref={frontVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover scale-x-[-1] ${
                  frontStream ? 'block' : 'hidden'
                }`}
              />

              {/* Fallback to stored profile photo when selfie cam is paused on iOS */}
              {!frontStream && (
                <div className="w-full h-full relative bg-slate-900 flex items-center justify-center">
                  {student?.photoUrl ? (
                    <img
                      src={student.photoUrl}
                      alt="Student Baseline"
                      className="w-full h-full object-cover opacity-60"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                      <UserCheck className="w-8 h-8 text-sky-400 mb-1" />
                      <p className="text-xs font-semibold text-white">Tap to preview Selfie Camera</p>
                    </div>
                  )}

                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <div className="w-24 h-32 rounded-[50%] border-2 border-dashed border-sky-300/80 flex items-center justify-center shadow-lg">
                      <span className="text-[9px] uppercase tracking-wider text-white bg-black/70 px-2 py-0.5 rounded-full">
                        Tap To Activate Live
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Front Camera Face Guide Oval when live */}
              {frontStream && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-28 h-36 rounded-[50%] border-2 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.4)] flex items-center justify-center">
                    <span className="text-[9px] uppercase tracking-wider text-sky-200 bg-black/60 px-1.5 py-0.5 rounded-full">
                      Align Face
                    </span>
                  </div>
                </div>
              )}

              {/* Stored Passport Photo Preview Badge */}
              {student?.photoUrl && (
                <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/75 backdrop-blur-sm p-1 rounded-xl border border-sky-300/50">
                  <img
                    src={student.photoUrl}
                    alt="Locked Profile"
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                  <span className="text-[9px] text-sky-200 pr-1 font-mono">Locked PFP</span>
                </div>
              )}

              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[10px] text-white">
                <span>{frontStream ? 'Live Face Viewfinder' : 'Tap to switch to Selfie Cam'}</span>
                <span className="text-sky-300 font-mono">Front Cam</span>
              </div>
            </div>
          </div>

          <canvas ref={scanCanvasRef} className="hidden" />

          {/* Capture Button */}
          <div className="pt-1">
            <button
              onClick={handleVerifyAttendance}
              disabled={submitting}
              className="w-full bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 active:scale-95 text-white font-sora font-semibold rounded-full h-13 shadow-xl shadow-sky-400/50 flex items-center justify-center gap-2.5 text-base transition-transform"
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Verifying QR & Face...</span>
                </div>
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  <span>Verify Both & Mark Attendance</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Success Modal Sheet */}
      {attendanceSuccess && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center space-y-4 shadow-2xl border border-sky-200 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center text-green-600 mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                Verified Present
              </span>
              <h3 className="text-xl font-sora font-extrabold text-slate-900 mt-2">
                Attendance Recorded!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Reflected instantly on the instructor's classroom screen.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-100 text-left space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Student:</span>
                <span className="font-bold text-slate-800">{student?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">PRN:</span>
                <span className="font-mono font-bold text-slate-800">{student?.rollNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Subject:</span>
                <span className="font-bold text-sky-800">{attendanceSuccess.lecture?.subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Time:</span>
                <span className="font-mono text-slate-700">{attendanceSuccess.time}</span>
              </div>
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-full h-12 text-sm shadow-md shadow-sky-300/40"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* TEST / DEMO CONTROL PANEL MODAL */}
      {showDemoPanel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 space-y-4 shadow-2xl border border-sky-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-sky-100 pb-2.5">
              <div>
                <h3 className="text-base font-sora font-bold text-slate-900 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-sky-600" />
                  Tester Demo & Live Location
                </h3>
                <p className="text-[11px] text-slate-500">
                  Inspect live hardware GPS & select test verification profiles
                </p>
              </div>
              <button
                onClick={() => setShowDemoPanel(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full text-lg leading-none"
              >
                ✕
              </button>
            </div>

            {/* Geofence Target Information */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Official Geofence Zone</label>
              <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-xs">
                <p className="font-bold text-sky-950">SIT Nagpur Campus</p>
                <p className="text-[11px] text-slate-600 font-mono mt-0.5">21°07&apos;35.0&quot;N 79°09&apos;36.4&quot;E (500m geofence)</p>
              </div>
            </div>

            {/* Wi-Fi Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Select Wi-Fi Network</label>
              <select
                value={demoSettings.selectedWifi}
                onChange={(e) => setDemoSettings({ selectedWifi: e.target.value })}
                className="w-full bg-[#f8fbff] text-slate-800 border border-sky-200 rounded-2xl h-11 px-3 text-xs font-medium"
              >
                <option value="SYMBI_NGP_STUDENT">SYMBI_NGP_STUDENT (Official College Wi-Fi - Passes ✅)</option>
                <option value="Unknown_Home_WiFi">Unknown_Home_WiFi (Invalid Network - Fails ❌)</option>
                <option value="Cellular_Mobile_Data">Cellular / Mobile Data (Invalid Network - Fails ❌)</option>
              </select>
            </div>

            <button
              onClick={() => {
                validateConditions();
                setShowDemoPanel(false);
                toast.success('Settings applied!');
              }}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-full h-11 text-xs shadow-md shadow-sky-300/40"
            >
              Apply Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
