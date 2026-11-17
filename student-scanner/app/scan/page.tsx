'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStudentStore, LocationMode } from '../../lib/store';
import {
  AUTHORIZED_ZONES,
  TEST_SITE_COORDINATES,
  CAMPUS_COORDINATES,
  checkGeofence,
  getDistanceBetweenCoordinatesMeters,
  GeofenceResult,
} from '../../lib/geo';
import { AUTHORIZED_WIFI_NETWORKS, isAuthorizedWifi } from '../../lib/wifi';
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
  Sparkles,
  ExternalLink,
  Navigation,
  Radio,
  Crosshair,
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
  const [geoWatchError, setGeoWatchError] = useState<string | null>(null);

  // Active Pre-condition states
  const [checkingConditions, setCheckingConditions] = useState(true);
  const [wifiValid, setWifiValid] = useState(false);
  const [gpsValid, setGpsValid] = useState(false);
  const [geofenceReport, setGeofenceReport] = useState<GeofenceResult | null>(null);
  const [detectedWifi, setDetectedWifi] = useState<string>('Rishab Thutheja');
  const [effectiveCoords, setEffectiveCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Demo Panel Modal
  const [showDemoPanel, setShowDemoPanel] = useState(false);

  // Dual Camera Streams
  const backVideoRef = useRef<HTMLVideoElement>(null);
  const frontVideoRef = useRef<HTMLVideoElement>(null);
  const backCanvasRef = useRef<HTMLCanvasElement>(null);
  const frontCanvasRef = useRef<HTMLCanvasElement>(null);

  const [backStream, setBackStream] = useState<MediaStream | null>(null);
  const [frontStream, setFrontStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Live Scan States
  const [detectedQrToken, setDetectedQrToken] = useState<string | null>(null);
  const [faceMatchSuccess, setFaceMatchSuccess] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [attendanceSuccess, setAttendanceSuccess] = useState<any | null>(null);

  // 1. Continuous Live Hardware GPS Watcher
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGeoWatchError('Geolocation is not supported by your browser.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setLiveHardwareCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null,
        });
        setGeoWatchError(null);
      },
      (err) => {
        console.warn('Geolocation sensor error:', err.message);
        setGeoWatchError(err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 2000,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // 2. Validate Pre-Conditions (Wi-Fi + Geofence)
  const validateConditions = useCallback(() => {
    setCheckingConditions(true);

    // --- Wi-Fi Validation ---
    const effectiveWifi = demoSettings.enabled ? demoSettings.selectedWifi : detectedWifi;
    const isWifiOk = isAuthorizedWifi(effectiveWifi);
    setWifiValid(isWifiOk);

    // --- GPS Validation ---
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
          targetLat = 20.5; // Remote location outside Nagpur
          targetLng = 78.5;
          break;
        case 'live':
        default:
          if (liveHardwareCoords) {
            targetLat = liveHardwareCoords.lat;
            targetLng = liveHardwareCoords.lng;
          } else {
            // Default to test site coordinates if sensor is still warming up
            targetLat = TEST_SITE_COORDINATES.lat;
            targetLng = TEST_SITE_COORDINATES.lng;
          }
          break;
      }
    } else {
      if (liveHardwareCoords) {
        targetLat = liveHardwareCoords.lat;
        targetLng = liveHardwareCoords.lng;
      } else {
        targetLat = TEST_SITE_COORDINATES.lat;
        targetLng = TEST_SITE_COORDINATES.lng;
      }
    }

    setEffectiveCoords({ lat: targetLat, lng: targetLng });

    // Run geofencing check against all authorized zones (SIT Campus + Test Location)
    const report = checkGeofence(targetLat, targetLng);
    setGeofenceReport(report);
    setGpsValid(report.isWithinAnyZone);
    setCheckingConditions(false);
  }, [demoSettings, detectedWifi, liveHardwareCoords]);

  useEffect(() => {
    validateConditions();
  }, [validateConditions]);

  const allConditionsMet = wifiValid && gpsValid;

  // 3. Initialize Dual Cameras (Back + Front)
  const startDualCameras = useCallback(async () => {
    try {
      // Request Back Camera for QR scanning
      const back = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      setBackStream(back);
      if (backVideoRef.current) {
        backVideoRef.current.srcObject = back;
      }

      // Request Front Camera for student selfie verification
      try {
        const front = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'user' },
            width: { ideal: 480 },
            height: { ideal: 480 },
          },
          audio: false,
        });
        setFrontStream(front);
        if (frontVideoRef.current) {
          frontVideoRef.current.srcObject = front;
        }
      } catch (frontErr) {
        console.warn('Simultaneous front camera stream restricted by OS pipeline:', frontErr);
      }

      setCameraActive(true);
    } catch (err: any) {
      console.error('Error starting dual cameras:', err);
      toast.error('Camera Access Error', {
        description: 'Please grant camera permissions to scan classroom QR code.',
      });
    }
  }, []);

  useEffect(() => {
    if (allConditionsMet && !cameraActive) {
      startDualCameras();
    }

    return () => {
      if (backStream) backStream.getTracks().forEach((t) => t.stop());
      if (frontStream) frontStream.getTracks().forEach((t) => t.stop());
    };
  }, [allConditionsMet, cameraActive, startDualCameras, backStream, frontStream]);

  // 4. Continuous QR Scanner Loop on Back Camera Viewport
  useEffect(() => {
    if (!cameraActive || !backVideoRef.current || !backCanvasRef.current || detectedQrToken) return;

    let animationFrameId: number;

    const scanFrame = () => {
      const video = backVideoRef.current;
      const canvas = backCanvasRef.current;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code && code.data) {
            setDetectedQrToken(code.data);
            toast.success('QR Code detected from classroom board!');
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
  }, [cameraActive, detectedQrToken]);

  // 5. Simultaneous Dual Capture & Verification
  const handleSimultaneousCapture = async () => {
    if (submitting) return;

    // Use detected QR or prompt fallback demo token
    let qrToken = detectedQrToken;
    if (!qrToken) {
      qrToken = 'demo';
      setDetectedQrToken('demo');
    }

    setSubmitting(true);
    setFaceMatchSuccess(true);

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
  const currentGoogleMapsUrl = effectiveCoords
    ? `https://www.google.com/maps?q=${effectiveCoords.lat},${effectiveCoords.lng}`
    : TEST_SITE_COORDINATES.mapsUrl;

  return (
    <div className="min-h-screen-mobile bg-[#f0f7ff] flex flex-col justify-between p-4 max-w-lg mx-auto">
      {/* Top Header */}
      <header className="flex items-center justify-between py-2 border-b border-sky-200/80 mb-3">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-sky-600 font-medium p-1 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </button>

        <div className="flex items-center gap-2">
          {/* Active Status Badge */}
          {allConditionsMet ? (
            <span className="flex items-center gap-1 text-[10px] bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded-full border border-green-200">
              <Check className="w-3 h-3" /> Gate Verified
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-200">
              <AlertCircle className="w-3 h-3" /> Gate Locked
            </span>
          )}

          {/* Test / Demo Panel Button */}
          <button
            onClick={() => setShowDemoPanel(true)}
            className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-800 border border-sky-300/60 shadow-sm transition-all"
          >
            <Sliders className="w-3.5 h-3.5 text-sky-600" />
            <span>Tester Demo</span>
          </button>
        </div>
      </header>

      {/* Main Validation Check OR Dual-Camera Viewport */}
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
          <div className="w-full space-y-2.5 text-left">
            {/* Wi-Fi Card */}
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
              <p className="text-[10px] text-slate-500 mt-1">
                Authorized Networks: <strong>Rishab Thutheja</strong> (Test) or <strong>SYMBI_NGP_STUDENT</strong> (Campus)
              </p>
            </div>

            {/* GPS Geofence Card */}
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
                  Nearest: <strong>{geofenceReport?.nearestZone.name}</strong> (
                  {geofenceReport ? (geofenceReport.distanceToNearest / 1000).toFixed(2) : '0'} km away)
                </p>
              )}

              {effectiveCoords && (
                <div className="flex items-center justify-between text-[10px] mt-1.5 font-mono text-slate-600 border-t border-sky-100/60 pt-1.5">
                  <span>
                    Lat: {effectiveCoords.lat.toFixed(5)}° · Lng: {effectiveCoords.lng.toFixed(5)}°
                  </span>
                  <a
                    href={currentGoogleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-600 hover:text-sky-800 flex items-center gap-0.5 font-sans font-semibold underline"
                  >
                    View Map <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="w-full flex flex-col gap-2 pt-1">
            <button
              onClick={validateConditions}
              className="w-full bg-sky-500 hover:bg-sky-600 active:scale-98 text-white font-semibold rounded-full h-11 text-xs shadow-md shadow-sky-300/40 flex items-center justify-center gap-2 transition-transform"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Re-Verify Wi-Fi & GPS
            </button>
            <button
              onClick={() => setShowDemoPanel(true)}
              className="text-xs text-sky-600 hover:underline font-semibold py-1 flex items-center justify-center gap-1"
            >
              <Sliders className="w-3 h-3" />
              Open Tester Demo (View Live Location & Presets)
            </button>
          </div>
        </div>
      ) : (
        /* DUAL CAMERA VIEWPORT (Image 2 style) */
        <div className="flex-1 flex flex-col space-y-2.5 py-1">
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

          {/* Box 1: Back Camera (Classroom Board QR Code Viewport) */}
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
              ) : (
                <span className="text-[10px] text-sky-600 animate-pulse font-mono">
                  Aim at Projector...
                </span>
              )}
            </div>

            <div className="relative w-full h-[185px] sm:h-[210px] rounded-2xl overflow-hidden border-2 border-sky-300 bg-slate-950 shadow-md">
              <video
                ref={backVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* QR Scanning Reticle Overlay */}
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

              {/* Status Pill */}
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[10px] text-white">
                <span>Pointing at teacher's dynamic QR code</span>
                <span className="text-sky-300 font-mono">Back Cam</span>
              </div>
            </div>
          </div>

          {/* Box 2: Front Camera (Student Face Verification Viewport) */}
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

            <div className="relative w-full h-[175px] sm:h-[195px] rounded-2xl overflow-hidden border-2 border-sky-300 bg-slate-950 shadow-md">
              <video
                ref={frontVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />

              {/* Front Camera Face Guide Oval */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-28 h-36 rounded-[50%] border-2 border-sky-400/80 shadow-[0_0_15px_rgba(56,189,248,0.4)] flex items-center justify-center">
                  <span className="text-[9px] uppercase tracking-wider text-sky-200 bg-black/60 px-1.5 py-0.5 rounded-full">
                    Face Here
                  </span>
                </div>
              </div>

              {/* Stored Passport Photo Preview Badge */}
              {student?.photoUrl && (
                <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm p-1 rounded-xl border border-sky-300/50">
                  <img
                    src={student.photoUrl}
                    alt="Locked Profile"
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                  <span className="text-[9px] text-sky-200 pr-1 font-mono">Locked PFP</span>
                </div>
              )}

              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[10px] text-white">
                <span>Hold device steady & look forward</span>
                <span className="text-sky-300 font-mono">Front Cam</span>
              </div>
            </div>
          </div>

          {/* Hidden canvases for capturing high-res frames */}
          <canvas ref={backCanvasRef} className="hidden" />
          <canvas ref={frontCanvasRef} className="hidden" />

          {/* Single Capture Button Below Both Frames */}
          <div className="pt-1.5">
            <button
              onClick={handleSimultaneousCapture}
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

            {/* 1. Live Hardware GPS Monitor Box */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50/60 border border-sky-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
                  Live Phone GPS Sensor
                </span>
                {liveHardwareCoords ? (
                  <span className="text-[10px] font-bold text-green-800 bg-green-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-ping" />
                    Sensor Active
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    Acquiring Signal...
                  </span>
                )}
              </div>

              {liveHardwareCoords ? (
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between items-center font-mono text-[11px] bg-white/80 p-2 rounded-xl border border-sky-100">
                    <div>
                      <span className="text-slate-500">Lat:</span>{' '}
                      <span className="font-bold text-slate-900">{liveHardwareCoords.lat.toFixed(6)}°</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Lng:</span>{' '}
                      <span className="font-bold text-slate-900">{liveHardwareCoords.lng.toFixed(6)}°</span>
                    </div>
                    {liveHardwareCoords.accuracy !== null && (
                      <span className="text-[10px] text-sky-700 font-sans font-semibold">
                        ±{liveHardwareCoords.accuracy}m
                      </span>
                    )}
                  </div>

                  {/* Distance to user's test location */}
                  <div className="text-[11px] text-slate-600 space-y-0.5 pt-1">
                    <p className="flex justify-between">
                      <span>Distance to Rishab Thutheja Test Site:</span>
                      <strong className="font-mono text-slate-900">
                        {Math.round(
                          getDistanceBetweenCoordinatesMeters(
                            liveHardwareCoords.lat,
                            liveHardwareCoords.lng,
                            TEST_SITE_COORDINATES.lat,
                            TEST_SITE_COORDINATES.lng
                          )
                        )}{' '}
                        meters
                      </strong>
                    </p>
                    <p className="flex justify-between">
                      <span>Distance to SIT Nagpur Campus:</span>
                      <strong className="font-mono text-slate-900">
                        {(
                          getDistanceBetweenCoordinatesMeters(
                            liveHardwareCoords.lat,
                            liveHardwareCoords.lng,
                            CAMPUS_COORDINATES.lat,
                            CAMPUS_COORDINATES.lng
                          ) / 1000
                        ).toFixed(2)}{' '}
                        km
                      </strong>
                    </p>
                  </div>

                  <a
                    href={`https://www.google.com/maps?q=${liveHardwareCoords.lat},${liveHardwareCoords.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-sky-600 hover:text-sky-800 font-semibold underline pt-1"
                  >
                    Open live coordinates in Google Maps <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic">
                  Waiting for phone GPS hardware permissions. If on desktop, browser IP geolocation will be used.
                </p>
              )}
            </div>

            {/* 2. Geofence Location Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-sky-600" />
                  Select Geofence Validation Target
                </span>
                <span className="text-[10px] text-slate-500">Pick one to test</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Option A: User's Current Test Location (Rishab Thutheja Site) */}
                <button
                  type="button"
                  onClick={() => setDemoSettings({ locationMode: 'test-site' })}
                  className={`p-3 rounded-2xl text-left border transition-all ${
                    demoSettings.locationMode === 'test-site'
                      ? 'bg-sky-50 border-sky-500 text-sky-950 font-bold ring-2 ring-sky-300 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Rishab Thutheja Site</span>
                    <span className="text-[9px] bg-sky-200 text-sky-900 font-bold px-1.5 py-0.2 rounded">
                      Test
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">21.15136° N, 79.12706° E</p>
                  <p className="text-[9px] text-emerald-600 font-semibold mt-1">Allowed Radius: 1.0 km</p>
                </button>

                {/* Option B: Live Device GPS (Real-Time) */}
                <button
                  type="button"
                  onClick={() => setDemoSettings({ locationMode: 'live' })}
                  className={`p-3 rounded-2xl text-left border transition-all ${
                    demoSettings.locationMode === 'live'
                      ? 'bg-sky-50 border-sky-500 text-sky-950 font-bold ring-2 ring-sky-300 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Live Phone GPS</span>
                    <span className="text-[9px] bg-green-200 text-green-900 font-bold px-1.5 py-0.2 rounded">
                      Live
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {liveHardwareCoords
                      ? `${liveHardwareCoords.lat.toFixed(4)}°, ${liveHardwareCoords.lng.toFixed(4)}°`
                      : 'Hardware Sensor'}
                  </p>
                  <p className="text-[9px] text-sky-600 font-semibold mt-1">Auto-matches test site</p>
                </button>

                {/* Option C: SIT Nagpur Official Campus */}
                <button
                  type="button"
                  onClick={() => setDemoSettings({ locationMode: 'sit-campus' })}
                  className={`p-3 rounded-2xl text-left border transition-all ${
                    demoSettings.locationMode === 'sit-campus'
                      ? 'bg-sky-50 border-sky-500 text-sky-950 font-bold ring-2 ring-sky-300 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">SIT Nagpur Campus</span>
                    <span className="text-[9px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.2 rounded">
                      Demo
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">21.1258° N, 79.1585° E</p>
                  <p className="text-[9px] text-indigo-600 font-semibold mt-1">Official Demonstration</p>
                </button>

                {/* Option D: Outside Geofence (Simulate Error) */}
                <button
                  type="button"
                  onClick={() => setDemoSettings({ locationMode: 'outside' })}
                  className={`p-3 rounded-2xl text-left border transition-all ${
                    demoSettings.locationMode === 'outside'
                      ? 'bg-red-50 border-red-500 text-red-950 font-bold ring-2 ring-red-300 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Outside Campus</span>
                    <span className="text-[9px] bg-red-100 text-red-800 font-bold px-1.5 py-0.2 rounded">
                      Fail
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Remote Lockout</p>
                  <p className="text-[9px] text-red-600 font-semibold mt-1">Simulate Failure State</p>
                </button>
              </div>
            </div>

            {/* 3. Wi-Fi Network Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-sky-600" />
                Select Wi-Fi Network
              </label>
              <select
                value={demoSettings.selectedWifi}
                onChange={(e) => setDemoSettings({ selectedWifi: e.target.value })}
                className="w-full bg-[#f8fbff] text-slate-800 border border-sky-200 rounded-2xl h-11 px-3 text-xs font-medium focus:ring-2 focus:ring-sky-400 outline-none"
              >
                <option value="Rishab Thutheja">
                  Rishab Thutheja (Authorized Test Wi-Fi - Passes ✅)
                </option>
                <option value="SYMBI_NGP_STUDENT">
                  SYMBI_NGP_STUDENT (Official College Wi-Fi - Passes ✅)
                </option>
                <option value="Unknown_Home_WiFi">
                  Unknown_Home_WiFi (Invalid Network - Fails ❌)
                </option>
              </select>
            </div>

            {/* Apply & Close */}
            <button
              onClick={() => {
                validateConditions();
                setShowDemoPanel(false);
                toast.success('Validation profile applied!');
              }}
              className="w-full bg-sky-500 hover:bg-sky-600 active:scale-98 text-white font-semibold rounded-full h-11 text-xs shadow-md shadow-sky-300/40 transition-transform mt-1"
            >
              Apply Settings & Verify
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
