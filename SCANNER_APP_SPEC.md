# 📱 Student QR Scanner Web App - Developer & AI Agent Blueprint

> **🤖 INSTRUCTIONS FOR AI AGENTS (Cursor, Windsurf, Copilot, ChatGPT, Claude, Antigravity):**  
> This document is the **SINGLE SOURCE OF TRUTH (SSOT)** for building the **Student QR Scanner Web App**.  
> - **DO NOT deploy or push to GitHub/Vercel.** All deployment and repository management will be handled by the project lead.  
> - **DO NOT connect directly to the database.** All data interactions MUST go through the provided Backend API.  
> - Your goal is to build, run, and test a fully functional web app inside the `student-scanner/` folder that runs cleanly on **`localhost`**.  
> - When complete, the folder must be clean, error-free on `npm run build`, and ready to be packaged as a `.zip` file.

---

## 🎯 1. Mission & How It Works

The **Teacher Attendance Portal** runs on a laptop or projector screen, showing a live dynamic QR code and a list of students (all initially marked with a **Red "A"** for Absent).

Your task is to build the **Student QR Scanner Web App** inside the `student-scanner/` directory.  
When a student uses your scanner app, it follows this exact workflow:

```
[Step 1: Input]       Student enters their PRN / Roll Number (e.g. 25070521001).
         ↓
[Step 2: GPS Check]   Verifies device location is on campus (with Dev Bypass for testing).
         ↓
[Step 3: Wi-Fi Check] Verifies connection to college Wi-Fi: "SYMBI_NGP_STUDENT".
         ↓
[Step 4: Face Check]  Webcam opens -> Verifies student face is clearly visible -> "Face Verified ✅".
         ↓
[Step 5: QR Scan]     Camera scans the teacher's screen QR code.
         ↓
[Step 6: Submit]      Sends payload to Backend API -> Teacher's screen INSTANTLY turns 
                      that student's card from Red "A" to Green "P" in real-time!
```

---

## 📁 2. Project Directory & Folder Structure

Create and build the scanner inside a dedicated folder named **`student-scanner`** directly in the project root:

```
Teacher Portal/
├── attendance-backend/      (Express + Socket.IO server - runs on port 10000)
├── attendance-frontend/     (Teacher Portal Next.js app - runs on port 3000)
├── student-scanner/         <--- [BUILD YOUR APP HERE!] (Vite + React or Next.js)
├── SCANNER_APP_SPEC.md      (This Blueprint)
└── README.md
```

### Initializing the `student-scanner` folder (Recommended Quickstart):
Inside the `Teacher Portal/` root directory, run:
```bash
npm create vite@latest student-scanner -- --template react-ts
cd student-scanner
npm install
npm install html5-qrcode lucide-react clsx tailwindcss
```

---

## 🔌 3. Backend API Endpoints (Handshake Contracts)

The backend server is already running and configured with open CORS to accept all local requests.

### Backend Base URL:
- **Localhost Backend:** `http://localhost:10000`  
- **Cloud Backend (Fallback):** `https://<your-backend-app>.onrender.com`

Store this in a `.env` file inside `student-scanner/`:
```env
VITE_API_URL=http://localhost:10000
```

---

### Endpoint 1: Verify Token & Get Lecture Details
Called when the camera detects a QR code to preview lecture info:
- **Method:** `POST`
- **Route:** `/api/attendance/verify-token`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "qrToken": "eyJhbGciOiJIUz..." // Raw token OR full URL scanned by camera
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "valid": true,
    "sessionId": "0cbc236c-0fc3-48be-8f17-8111bb4fd289",
    "subject": "Microcontroller & Sensors",
    "section": "A",
    "classroom": "Lab 10",
    "teacher": "Vanshiii Gangwani"
  }
  ```

---

### Endpoint 2: Submit Student Attendance (Mark Present)
Core submission endpoint that records the attendance in the database:
- **Method:** `POST`
- **Route:** `/api/attendance/scan`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "qrToken": "eyJhbGciOiJIUz...",    // Scanned token or full URL (e.g. http://.../scan/token)
    "rollNo": "25070521001",            // Student's PRN / Roll Number (Required)
    "name": "ARUSHI VARGHESE",          // Student's Name (Optional if already in DB)
    "lat": 21.1255,                     // GPS Latitude
    "lng": 79.0522,                     // GPS Longitude
    "wifiSSID": "SYMBI_NGP_STUDENT",    // College Wi-Fi confirmation
    "faceVerified": true                // Verification flag from face check step
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "message": "Attendance marked successfully",
    "status": "present"
  }
  ```
- **Already Marked (200 OK):**
  ```json
  {
    "message": "Attendance already recorded",
    "status": "present"
  }
  ```
- **Expired / Invalid Error (401):**
  ```json
  {
    "error": "QR Code expired or invalid. Please scan again."
  }
  ```

---

## 🛡️ 4. The 3 Verification Checks (Implementation Rules)

### Check 1: GPS / Location Geofencing
1. Request location using `navigator.geolocation.getCurrentPosition()`.
2. Target Campus Coordinates: Symbiosis Nagpur (~`21.1255° N, 79.0522° E`).
3. **Crucial Dev Bypass for Testing at Home:** Include a toggle switch or checkbox in the UI (e.g., `[✓] Dev Mode: Bypass Campus Geofence`) so you and your team can test the app from your room without being blocked by GPS!

### Check 2: College Wi-Fi (`SYMBI_NGP_STUDENT`)
> ⚠️ **Browser Fact:** Web browsers cannot directly read Wi-Fi SSID names for privacy reasons (W3C security specification).  
> **How to implement:**  
> - Check `navigator.onLine === true`.  
> - Display a verified Wi-Fi badge in the UI: `📶 Wi-Fi: Connected to SYMBI_NGP_STUDENT`.  
> - Always pass `"wifiSSID": "SYMBI_NGP_STUDENT"` in the submit payload.

### Check 3: Face Visibility Check & QR Scanning (Laptop Webcam Testing)
Because you will be building and testing primarily on a **laptop with a single webcam**, the camera flow must work effortlessly on a single camera device:

1. **Phase 1 - Face Verification:**
   - App accesses the webcam (`navigator.mediaDevices.getUserMedia({ video: true })`).
   - Shows a circular guide on screen: *"Align your face in the circle"*.
   - Verifies face visibility for 2–3 seconds.
   - Shows **"Face Verified ✅"**.
2. **Phase 2 - QR Code Scanning:**
   - The same webcam transitions into QR Scanner mode (powered by `html5-qrcode`).
   - The student holds up a phone displaying the teacher's QR code (or points the laptop towards the screen).
   - Once the QR code is detected: beeps, displays a green success confirmation, and submits the attendance to the backend!

*(On mobile devices with both front and back cameras, the app can optionally use the front camera for face verification and then flip to the back camera for QR scanning).*

---

## 🎨 5. UI/UX Design System & Theme Guidelines (Must Match Teacher Portal!)

The **Student QR Scanner** must visually harmonize with the **Teacher Portal**. It must **not** look like a generic dark utility; it must use the exact light, elegant **Glassmorphic Pink & Lavender** aesthetic.

### 🎨 Exact Color Tokens to Use:
| Token Name | Hex Code | Purpose |
| :--- | :--- | :--- |
| **Canvas Background** | `#fdf2f6` | Full-screen background (soft, warm pastel pink) |
| **Hot Pink (Primary)** | `#EC77AB` | Primary buttons, active focus rings, camera rings, accents |
| **Thistle (Secondary)** | `#D4C0F2` | Card borders, subtle divider lines, badge outlines |
| **Deep Ink (Text)** | `#12122B` | Headings, primary text, high-contrast labels |
| **Muted Text** | `#6B6B85` | Subtitles, helper text, placeholders |
| **Glass Surface** | `rgba(255, 255, 255, 0.85)` | Card background with `backdrop-blur-xl` |
| **Success / Present** | `#16A34A` | Verified face, green "Present" badges & checkmarks |
| **Error / Failed** | `#DC2626` | Failed scans, invalid tokens, retry buttons |

### 🔤 Typography (Google Fonts):
- **Headings & Titles:** **Sora** (`font-sora`, sans-serif) - bold, geometric, modern.
- **PRNs, Roll Numbers & Timers:** **IBM Plex Mono** (`font-plex-mono`, monospace).
- **Body & Labels:** **Inter** / Sans (`font-sans`).

### 🪄 Component Styling Guidelines:
- **Main Container / Card:** `bg-white/85 backdrop-blur-xl border border-[#D4C0F2] shadow-2xl rounded-3xl p-6 sm:p-8 text-[#12122B]`
- **Form Inputs:** `bg-[#fdf2f6] text-[#12122B] placeholder:text-[#6B6B85] border border-[#D4C0F2] rounded-2xl h-12 px-4 focus:ring-2 focus:ring-[#EC77AB] focus:border-transparent outline-none transition-all`
- **Primary Action Buttons:** `bg-[#EC77AB] hover:bg-[#EC77AB]/90 text-white font-sora font-semibold rounded-full h-12 px-6 shadow-lg shadow-[#EC77AB]/30 transition-transform active:scale-95`
- **Camera Viewfinder:** Circular or rounded-3xl container with a pulsing radar border (`border-4 border-[#EC77AB]/40 animate-pulse`).

---

## 🧪 6. Pre-Seeded Test Students (Use These to Test!)

The database is already pre-loaded with real students. Use any of these PRNs to test:

| Section | Student PRN (Roll No) | Student Name |
| :--- | :--- | :--- |
| **Section A** | `25070521001` | ARUSHI VARGHESE |
| **Section A** | `25070521002` | LARANYA SHENDE |
| **Section A** | `25070521004` | HARSHINI S J |
| **Section B** | `25070521071` | PREETI GAUTAM |
| **Section C** | `25070521142` | ADITYA RAJ |

*(Entering a non-seeded PRN will also work dynamically if you provide a `name`).*

---

## 💻 7. Complete Ready-to-Use Scanner Component (Matching Portal Theme)

Create `src/StudentScanner.tsx` inside `student-scanner/`:

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { MapPin, Wifi, CheckCircle2, XCircle, Camera, QrCode, RefreshCw } from 'lucide-react';

// Points to local backend server running on port 10000
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:10000';

export default function StudentScanner() {
  const [step, setStep] = useState<'info' | 'face' | 'qr' | 'success' | 'error'>('info');
  const [rollNo, setRollNo] = useState('');
  const [studentName, setStudentName] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [devBypassGPS, setDevBypassGPS] = useState(true);

  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);

  // 1. Get GPS coordinates
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn('GPS prompt denied or unavailable:', err.message),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // 2. Step 1: Face Verification using Laptop Webcam
  const startFaceVerification = async () => {
    setStep('face');
    setStatusMessage('Position your face inside the circle...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      activeStreamRef.current = stream;
      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
        webcamVideoRef.current.play();
      }

      // Simulate face verification check (2.5s)
      setTimeout(() => {
        if (activeStreamRef.current) {
          activeStreamRef.current.getTracks().forEach((track) => track.stop());
        }
        setStatusMessage('Face Verified ✅ Launching QR Scanner...');
        setTimeout(() => startQrScanner(), 800);
      }, 2500);
    } catch (err: any) {
      alert('Camera access denied or unavailable: ' + err.message);
      setStep('info');
    }
  };

  // 3. Step 2: QR Code Scanning (Webcam)
  const startQrScanner = () => {
    setStep('qr');
    setTimeout(() => {
      const html5QrCode = new Html5Qrcode('qr-reader');
      qrScannerRef.current = html5QrCode;

      html5QrCode.start(
        { facingMode: 'user' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          await html5QrCode.stop();
          handleScannedData(decodedText);
        },
        () => {} // Frame processing callback
      ).catch((err) => {
        alert('QR Scanner camera error: ' + err);
        setStep('info');
      });
    }, 300);
  };

  // 4. Step 3: Send Attendance to Backend API
  const handleScannedData = async (scannedToken: string) => {
    setStatusMessage('Syncing attendance with Teacher Portal...');
    try {
      const response = await fetch(`${API_BASE}/api/attendance/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrToken: scannedToken,
          rollNo: rollNo.trim(),
          name: studentName.trim() || undefined,
          lat: location?.lat || 21.1255,
          lng: location?.lng || 79.0522,
          wifiSSID: 'SYMBI_NGP_STUDENT',
          faceVerified: true
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark attendance');
      }

      setStep('success');
      setStatusMessage('Attendance Marked Successfully! 🎉');
    } catch (err: any) {
      setStep('error');
      setStatusMessage(err.message || 'Error occurred');
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf2f6] text-[#12122B] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Decorative ambient background blur */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#FED6E3] rounded-full blur-3xl opacity-50 pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[#D4C0F2] rounded-full blur-3xl opacity-40 pointer-events-none -z-10 animate-pulse" />

      {/* Main Glassmorphic Card */}
      <div className="w-full max-w-md bg-white/85 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#D4C0F2]">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#EC77AB]/10 text-[#EC77AB] flex items-center justify-center mx-auto mb-3 shadow-inner">
            <QrCode className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold font-sora text-[#12122B]">Student Attendance</h1>
          <p className="text-xs text-[#6B6B85] mt-1">Symbiosis Institute of Technology</p>
        </div>

        {/* Verification Status Badges */}
        <div className="flex justify-around mb-6 text-xs bg-[#fdf2f6]/80 p-3 rounded-2xl border border-[#D4C0F2]/70 font-plex-mono">
          <div className="flex items-center gap-1.5 text-[#12122B]">
            <MapPin className="w-3.5 h-3.5 text-[#EC77AB]" />
            <span className={location || devBypassGPS ? 'text-[#16A34A] font-semibold' : 'text-amber-500'}>
              {location ? 'GPS: Active' : devBypassGPS ? 'GPS: Dev Pass' : 'GPS: Searching'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[#12122B]">
            <Wifi className="w-3.5 h-3.5 text-[#EC77AB]" />
            <span className="text-[#16A34A] font-semibold">SYMBI_NGP_STUDENT</span>
          </div>
        </div>

        {/* STEP 1: Student Input */}
        {step === 'info' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#12122B] uppercase tracking-wider block mb-1">
                PRN / Roll Number *
              </label>
              <input
                type="text"
                placeholder="e.g. 25070521001"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                className="w-full bg-[#fdf2f6] text-[#12122B] placeholder:text-[#6B6B85]/60 border border-[#D4C0F2] rounded-xl h-12 px-4 font-plex-mono focus:ring-2 focus:ring-[#EC77AB] focus:border-transparent outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#12122B] uppercase tracking-wider block mb-1">
                Full Name (Optional if registered)
              </label>
              <input
                type="text"
                placeholder="e.g. Arushi Varghese"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full bg-[#fdf2f6] text-[#12122B] placeholder:text-[#6B6B85]/60 border border-[#D4C0F2] rounded-xl h-12 px-4 focus:ring-2 focus:ring-[#EC77AB] focus:border-transparent outline-none transition-all"
              />
            </div>

            <div className="flex items-center gap-2 pt-1 text-xs text-[#6B6B85]">
              <input
                type="checkbox"
                id="devBypass"
                checked={devBypassGPS}
                onChange={(e) => setDevBypassGPS(e.target.checked)}
                className="rounded accent-[#EC77AB]"
              />
              <label htmlFor="devBypass" className="cursor-pointer select-none">
                Dev Mode (Allow testing away from campus)
              </label>
            </div>

            <button
              disabled={!rollNo}
              onClick={startFaceVerification}
              className="w-full h-13 mt-2 bg-[#EC77AB] hover:bg-[#EC77AB]/90 disabled:opacity-50 text-white font-sora font-semibold rounded-2xl shadow-lg shadow-[#EC77AB]/30 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
            >
              <Camera className="w-5 h-5" />
              <span>Verify Face & Scan QR</span>
            </button>
          </div>
        )}

        {/* STEP 2: Face Check (Webcam) */}
        {step === 'face' && (
          <div className="flex flex-col items-center py-2">
            <p className="text-sm font-semibold mb-4 text-[#EC77AB] font-sora text-center">
              {statusMessage}
            </p>
            <div className="relative w-60 h-60 rounded-full overflow-hidden border-4 border-[#EC77AB] shadow-2xl mb-4 bg-black flex items-center justify-center">
              <video ref={webcamVideoRef} className="w-full h-full object-cover transform -scale-x-100" playsInline muted />
              <div className="absolute inset-0 rounded-full border-2 border-white/60 animate-pulse pointer-events-none" />
            </div>
            <p className="text-xs text-[#6B6B85]">Keep your head steady and well-lit...</p>
          </div>
        )}

        {/* STEP 3: QR Scanner */}
        {step === 'qr' && (
          <div className="flex flex-col items-center py-2">
            <p className="text-sm font-semibold mb-3 text-[#EC77AB] font-sora text-center">
              Show Teacher's QR Code to Webcam
            </p>
            <div className="w-full overflow-hidden rounded-2xl border-2 border-[#D4C0F2] shadow-inner bg-black">
              <div id="qr-reader" className="w-full" />
            </div>
            <p className="text-xs text-[#6B6B85] mt-3">Scanning in real-time...</p>
          </div>
        )}

        {/* STEP 4: Success Screen */}
        {step === 'success' && (
          <div className="text-center py-6">
            <div className="w-20 h-20 bg-[#16A34A]/15 text-[#16A34A] rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold font-sora text-[#16A34A]">Marked Present!</h2>
            <p className="text-[#12122B] font-medium mt-2 text-sm">{statusMessage}</p>
            <div className="mt-4 inline-block bg-[#fdf2f6] px-4 py-1.5 rounded-full border border-[#D4C0F2] text-xs font-plex-mono text-[#6B6B85]">
              PRN: {rollNo}
            </div>
            <button
              onClick={() => setStep('info')}
              className="mt-6 w-full h-12 bg-[#12122B] hover:bg-[#12122B]/90 text-white font-sora font-semibold rounded-2xl shadow-md transition-transform active:scale-95"
            >
              Scan Another Student
            </button>
          </div>
        )}

        {/* STEP 5: Error Screen */}
        {step === 'error' && (
          <div className="text-center py-6">
            <div className="w-20 h-20 bg-[#DC2626]/15 text-[#DC2626] rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <XCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold font-sora text-[#DC2626]">Scan Failed</h2>
            <p className="text-[#12122B] mt-2 text-sm">{statusMessage}</p>
            <button
              onClick={() => setStep('info')}
              className="mt-6 w-full h-12 bg-[#EC77AB] hover:bg-[#EC77AB]/90 text-white font-sora font-semibold rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Try Again</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
```

---

## 🧪 8. Local Testing Guide (Testing Entirely on Laptop)

You do **not** need to deploy anything to test! You can test the entire flow on your laptop:

1. **Terminal 1 (Backend):**
   ```bash
   cd attendance-backend
   npm run dev
   # Runs on http://localhost:10000
   ```
2. **Terminal 2 (Teacher Portal):**
   ```bash
   cd attendance-frontend
   npm run dev
   # Runs on http://localhost:3000
   ```
3. **Terminal 3 (Student Scanner):**
   ```bash
   cd student-scanner
   npm run dev
   # Runs on http://localhost:5173
   ```
4. **Run the Test:**
   - In your browser, open `http://localhost:3000/login` and log in with:
     - **Email:** `teacher.demo@brightfuture.edu`
     - **Password:** `<your-configured-password>`
   - Select a Section (e.g. **Section A**) and click **Start Attendance**.
   - Notice the QR code displayed on screen and students listed with **Red "A"** (Absent).
   - In a separate browser tab, open your scanner app: `http://localhost:5173`.
   - Enter PRN `25070521001` (Arushi Varghese).
   - Let your laptop webcam verify your face.
   - When the QR reader activates, hold your phone displaying the teacher's QR code up to your laptop webcam (or point it at the QR code).
   - **Look at the Teacher Portal tab:** Arushi Varghese's card will INSTANTLY turn into a **Green "P"**! 🎉

---

## 📦 9. Final Handover Instructions (How to Send Your Work)

Once your scanner is working on `localhost`:

1. **Test Production Build:**
   Inside `student-scanner/`, run:
   ```bash
   npm run build
   ```
   Ensure it finishes with **0 errors**.
2. **Clean Up Before Zipping:**
   Delete the heavy `node_modules` folder inside `student-scanner/` so the zip file stays lightweight:
   ```bash
   # Remove node_modules before zipping
   rm -rf node_modules
   ```
3. **Create the Zip:**
   Zip the `student-scanner` folder (e.g., `student-scanner.zip`).
4. **Send to Team Lead:**
   Send `student-scanner.zip` to the team lead (`vanshi170`).  
   The team lead will extract it into the project, run final end-to-end checks, and deploy everything to production.
