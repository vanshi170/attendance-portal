# 📱 SIT Student Portal & Mobile QR Scanner Web App

A dedicated mobile web application engineered for students of **Symbiosis Institute of Technology (SIT), Nagpur** to seamlessly scan classroom QR codes and verify multi-factor attendance in real time.

Built with **Next.js 16**, **React 19**, **Tailwind CSS**, and **Neon Serverless PostgreSQL**, featuring a custom **Light Pastel Blue** glassmorphism design system matching the Teacher Portal.

---

## 🌟 Key Features

### 1. 🔐 Student Authentication & Verification
- **Exact 11-digit PRN:** Validates institutional roll numbers (e.g. `25070521001`).
- **Institutional Email Enforcement:** Strictly restricted to `@sitnagpur.siu.edu.in`.
- **Fast Sign-In & Onboarding:** Section selection (Sections A–E) and instant session persistence.

### 2. 📸 Biometric Passport Photo Baseline
- **Front Camera Alignment:** Uses an opaque frosted glass overlay with an oval head-and-shoulders cut-out guide to capture a standardized passport-style photo.
- **Permanent Profile Lock:** The captured photo serves as the student's permanent profile photo and biometric baseline for attendance matching, locked from future alteration.

### 3. 📊 Real-Time Attendance Analytics Dashboard
- **Direct Neon DB Calculation:** Calculates live overall attendance percentage using:
  $$\text{Attendance \%} = \frac{\text{Classes Present}}{\text{Total Classes Taken}} \times 100$$
- **Safety Indicator:** Highlights attendance status as Safe ($>75\%$) or Critical Shortage ($<75\%$).
- **Activity Log:** Recent attendance history with timestamps, lecture subjects, and classroom halls.

### 4. 📅 Landscape Timetable Manager & Fullscreen Viewer
- **Landscape Aspect Ratio (16:9):** Optimized for portrait phones displaying wide weekly schedules.
- **Persistent Storage:** Uploaded timetable (JPG, PNG, PDF) is saved directly in PostgreSQL and retained across logins.
- **Rotatable Fullscreen Mode:** Tap the timetable to open fullscreen with $90^\circ$ step rotation and zoom controls.

### 5. 🛡️ Dual-Factor Zero-Trust Validation Gate
Before the dual-camera scanner can be accessed, the device must satisfy:
1. **Campus Wi-Fi Check:** Must be connected to `SYMBI_NGP_STUDENT` or `Rishab Thutheja`.
2. **GPS Geofencing:** Device location must be within $1,500\text{ m}$ of SIT Nagpur Campus ($21.1258^\circ\text{ N}, 79.1585^\circ\text{ E}$).
- **Interactive Test / Demo Panel:** Allows developers to toggle simulated campus GPS coordinates and test Wi-Fi SSIDs during offline or remote testing.

### 6. 📷 Dual-Camera Simultaneous QR & Face Scanner
- **Top Viewport (Back Camera):** Points at the classroom projector screen, running real-time `jsQR` barcode recognition.
- **Bottom Viewport (Front Camera):** Captures the student's face, displaying their locked passport photo badge for facial alignment.
- **One-Touch Capture Button:** Captures both viewports simultaneously, verifies the dynamic token, matches facial liveness, and emits instant WebSocket updates to the teacher's podium screen.

---

## 🚀 Getting Started

### 1. Installation
```bash
cd student-scanner
npm install
```

### 2. Environment Configuration
Verify `.env` contains:
```env
DATABASE_URL=postgresql://neondb_owner:npg_LI8eWmaigoH1@ep-dry-river-axmyjobs.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require
NEXT_PUBLIC_TEACHER_BACKEND_URL=http://localhost:10000
NEXT_PUBLIC_APP_URL=http://localhost:3001
JWT_SECRET=super-secret-jwt-key
```

### 3. Running Locally
```bash
npm run dev
```
Open **[http://localhost:3001](http://localhost:3001)** on your mobile browser or desktop device.

---

## 📲 Add to Home Screen (PWA Experience)

1. Open **`http://<your-laptop-ip>:3001`** on Chrome (Android) or Safari (iOS).
2. Tap the browser menu (or Share button on iOS).
3. Select **"Add to Home Screen"**.
4. The scanner web app will launch in standalone, full-screen mode without browser address bars!
