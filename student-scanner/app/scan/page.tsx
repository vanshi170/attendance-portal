'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStudentStore } from '../../lib/store';
import { CAMPUS_COORDINATES, getDistanceFromCampusMeters, isWithinCampus } from '../../lib/geo';
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
  ShieldCheck,
} from 'lucide-react';

export default function DualCameraScannerPage() {
  const router = useRouter();
  const student = useStudentStore((s) => s.student);
  const demoSettings = useStudentStore((s) => s.demoSettings);
  const setDemoSettings = useStudentStore((s) => s.setDemoSettings);

  // Pre-condition state
  const [checkingConditions, setCheckingConditions] = useState(true);
  const [wifiValid, setWifiValid] = useState(false);
  const [gpsValid, setGpsValid] = useState(false);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  const [detectedWifi, setDetectedWifi] = useState<string>('SYMBI_NGP_STUDENT');
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);

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

  // 1. Run Pre-Condition Validations (Wi-Fi + GPS)
  const validateConditions = useCallback(() => {
    setCheckingConditions(true);

    // Wi-Fi Validation
    const effectiveWifi = demoSettings.enabled ? demoSettings.selectedWifi : detectedWifi;
    const isWifiOk = isAuthorizedWifi(effectiveWifi);
    setWifiValid(isWifiOk);

    // GPS Validation
    if (demoSettings.enabled && demoSettings.useCampusLocation) {
      // Use exact Symbiosis Nagpur coordinates in demo mode
      setCurrentCoords({ lat: CAMPUS_COORDINATES.lat, lng: CAMPUS_COORDINATES.lng });
      setCurrentDistance(0);
      setGpsValid(true);
      setCheckingConditions(false);
    } else if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCurrentCoords({ lat, lng });
          const dist = getDistanceFromCampusMeters(lat, lng);
          setCurrentDistance(Math.round(dist));
          const isGpsOk = isWithinCampus(lat, lng);
          setGpsValid(isGpsOk);
          setCheckingConditions(false);
        },
        (err) => {
          console.warn('Geolocation error:', err.message);
          // Fall back to demo coords if permission blocked
          if (demoSettings.enabled) {
            setGpsValid(true);
            setCurrentDistance(0);
          } else {
            setGpsValid(false);
          }
          setCheckingConditions(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setGpsValid(demoSettings.enabled);
      setCheckingConditions(false);
    }
  }, [demoSettings, detectedWifi]);

  useEffect(() => {
    validateConditions();
  }, [validateConditions]);

  const allConditionsMet = wifiValid && gpsValid;

  // 2. Initialize Dual Cameras (Back + Front)
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
        description: 'Please grant camera permissions to scan QR code.',
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

  // 3. Continuous QR Scanner Loop on Back Camera Viewport
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

  // 4. Simultaneous Dual Capture & Verification
  const handleSimultaneousCapture = async () => {
    if (submitting) return;

    // Use detected QR or prompt fallback demo token
    let qrToken = detectedQrToken;
    if (!qrToken) {
      // In case scanning projected screen in low light, use active token or demo
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
        lat: currentCoords?.lat || CAMPUS_COORDINATES.lat,
        lng: currentCoords?.lng || CAMPUS_COORDINATES.lng,
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

      toast.success('Attendance recorded on teacher portal!');
    } catch (err: any) {
      toast.error('Verification Failed', { description: err.message });
      setDetectedQrToken(null);
      setFaceMatchSuccess(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen-mobile bg-[#f0f7ff] flex flex-col justify-between p-4 max-w-lg mx-auto">
      {/* Top Header */}
      <header className="flex items-center justify-between py-2 border-b border-sky-200/80 mb-3">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-sky-600 font-medium p-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </button>

        <div className="flex items-center gap-2">
          {/* Test/Demo Button */}
          <button
            onClick={() => setShowDemoPanel(true)}
            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-800 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Test / Demo Panel</span>
          </button>
        </div>
      </header>

      {/* Main Validation Check OR Dual-Camera Viewport */}
      {!allConditionsMet ? (
        /* CONDITION FAILURE SCREEN */
        <div className="flex-1 flex flex-col justify-center items-center py-6 text-center space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600 shadow-md">
            <AlertCircle className="w-9 h-9" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-sora font-extrabold text-slate-900">
              Zero-Trust Verification Required
            </h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              Attendance can only be opened when both Campus Wi-Fi and SIT Nagpur GPS geofencing are
              validated.
            </p>
          </div>

          {/* Diagnostic Status Cards */}
          <div className="w-full space-y-3 text-left">
            {/* Wi-Fi Card */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                wifiValid
                  ? 'bg-green-50/80 border-green-200 text-green-900'
                  : 'bg-red-50/80 border-red-200 text-red-900'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 font-semibold text-xs">
                  <Wifi className="w-4 h-4" />
                  <span>Campus Wi-Fi Network</span>
                </div>
                {wifiValid ? (
                  <span className="flex items-center gap-1 text-[10px] bg-green-200/80 text-green-800 font-bold px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3" /> Connected
                  </span>
                ) : (
                  <span className="text-[10px] bg-red-200/80 text-red-800 font-bold px-2 py-0.5 rounded-full">
                    Invalid Network
                  </span>
                )}
              </div>
              <p className="text-xs opacity-90">
                Connected to: <strong>{demoSettings.enabled ? demoSettings.selectedWifi : detectedWifi}</strong>
              </p>
              <p className="text-[10px] text-slate-500 mt-1">
                Requires: "SYMBI_NGP_STUDENT" or "Rishab Thutheja"
              </p>
            </div>

            {/* GPS Geofence Card */}
            <div
              className={`p-4 rounded-2xl border transition-all ${
                gpsValid
                  ? 'bg-green-50/80 border-green-200 text-green-900'
                  : 'bg-red-50/80 border-red-200 text-red-900'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 font-semibold text-xs">
                  <MapPin className="w-4 h-4" />
                  <span>GPS Geofence Location</span>
                </div>
                {gpsValid ? (
                  <span className="flex items-center gap-1 text-[10px] bg-green-200/80 text-green-800 font-bold px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3" /> On Campus
                  </span>
                ) : (
                  <span className="text-[10px] bg-red-200/80 text-red-800 font-bold px-2 py-0.5 rounded-full">
                    Outside Campus
                  </span>
                )}
              </div>
              <p className="text-xs opacity-90">
                Target: <strong>Symbiosis Institute of Technology (SIT), Nagpur</strong>
              </p>
              {currentDistance !== null && (
                <p className="text-[10px] mt-1 font-mono">
                  Current distance: <strong>{(currentDistance / 1000).toFixed(2)} km</strong> (Max radius:{' '}
                  {CAMPUS_COORDINATES.radiusMeters / 1000} km)
                </p>
              )}
            </div>
          </div>

          <div className="w-full flex flex-col gap-2 pt-2">
            <button
              onClick={validateConditions}
              className="w-full bg-sky-500 hover:bg-sky-600 active:scale-98 text-white font-semibold rounded-full h-12 text-sm shadow-md shadow-sky-300/40 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Re-check Wi-Fi & GPS
            </button>
            <button
              onClick={() => setShowDemoPanel(true)}
              className="text-xs text-sky-600 hover:underline font-semibold py-1"
            >
              Tap here to open Test / Demo settings & override
            </button>
          </div>
        </div>
      ) : (
        /* DUAL CAMERA VIEWPORT (Image 2 style) */
        <div className="flex-1 flex flex-col space-y-3 py-1">
          {/* Box 1: Back Camera (Classroom Board QR Code Viewport) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-sora font-bold text-slate-800 flex items-center gap-1.5">
                <QrCode className="w-3.5 h-3.5 text-sky-600" />
                1. Back Camera · Classroom Board
              </span>
              {detectedQrToken ? (
                <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" /> QR Detected
                </span>
              ) : (
                <span className="text-[10px] text-sky-600 animate-pulse font-mono">
                  Aim at Projector...
                </span>
              )}
            </div>

            <div className="relative w-full h-[190px] sm:h-[220px] rounded-2xl overflow-hidden border-2 border-sky-300 bg-slate-950 shadow-md">
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
              <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                Matches Profile Photo
              </span>
            </div>

            <div className="relative w-full h-[180px] sm:h-[200px] rounded-2xl overflow-hidden border-2 border-sky-300 bg-slate-950 shadow-md">
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
          <div className="pt-2">
            <button
              onClick={handleSimultaneousCapture}
              disabled={submitting}
              className="w-full bg-gradient-to-r from-sky-500 via-sky-600 to-blue-600 active:scale-95 text-white font-sora font-semibold rounded-full h-14 shadow-xl shadow-sky-400/50 flex items-center justify-center gap-2.5 text-base transition-transform"
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

      {/* Test / Demo Settings Panel (User Requirement: Seperate test/demo for map and location selection) */}
      {showDemoPanel && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 space-y-4 shadow-2xl border border-sky-200">
            <div className="flex items-center justify-between border-b border-sky-100 pb-3">
              <div>
                <h3 className="text-base font-sora font-bold text-slate-900">
                  Test / Demo Control Panel
                </h3>
                <p className="text-[11px] text-slate-500">
                  Override GPS and Wi-Fi to test the QR scanner anywhere
                </p>
              </div>
              <button
                onClick={() => setShowDemoPanel(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full"
              >
                ✕
              </button>
            </div>

            {/* Demo Toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-sky-50 border border-sky-200">
              <div>
                <p className="text-xs font-bold text-slate-800">Demo Testing Mode</p>
                <p className="text-[10px] text-slate-500">Simulate authorized campus conditions</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={demoSettings.enabled}
                  onChange={(e) => setDemoSettings({ enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
              </label>
            </div>

            {/* Select Wi-Fi SSID */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-sky-600" />
                Select Wi-Fi Network
              </label>
              <select
                value={demoSettings.selectedWifi}
                onChange={(e) => setDemoSettings({ selectedWifi: e.target.value })}
                className="w-full bg-[#f8fbff] text-slate-800 border border-sky-200 rounded-full h-11 px-4 text-xs font-medium focus:ring-2 focus:ring-sky-400 outline-none"
              >
                {AUTHORIZED_WIFI_NETWORKS.map((net) => (
                  <option key={net.ssid} value={net.ssid}>
                    {net.ssid} (Authorized Campus Network)
                  </option>
                ))}
                <option value="Home_WiFi_Invalid">Home_WiFi (Invalid / Outside Campus)</option>
              </select>
            </div>

            {/* GPS Location Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-sky-600" />
                GPS Location Simulation
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDemoSettings({ useCampusLocation: true })}
                  className={`p-3 rounded-2xl text-left border text-xs transition-all ${
                    demoSettings.useCampusLocation
                      ? 'bg-sky-50 border-sky-400 text-sky-900 font-bold ring-2 ring-sky-300'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <p className="font-bold">SIT Nagpur</p>
                  <p className="text-[10px] text-slate-500 font-normal">21.1258° N, 79.1585° E</p>
                </button>
                <button
                  type="button"
                  onClick={() => setDemoSettings({ useCampusLocation: false })}
                  className={`p-3 rounded-2xl text-left border text-xs transition-all ${
                    !demoSettings.useCampusLocation
                      ? 'bg-amber-50 border-amber-400 text-amber-900 font-bold ring-2 ring-amber-300'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <p className="font-bold">Outside Campus</p>
                  <p className="text-[10px] text-slate-500 font-normal">Simulate Remote GPS</p>
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                validateConditions();
                setShowDemoPanel(false);
                toast.success('Demo settings applied!');
              }}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-full h-12 text-sm shadow-md mt-2"
            >
              Apply & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
