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
1. **Campus Wi-Fi Check:** Must be connected to `SYMBI_NGP_STUDENT`.
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
Create a `.env` file inside `student-scanner/` with the following variables:
```env
DATABASE_URL="postgresql://<username>:<password>@<neon-hostname>/neondb?sslmode=require"
NEXT_PUBLIC_TEACHER_BACKEND_URL="http://localhost:10000"
NEXT_PUBLIC_APP_URL="http://localhost:3001"
JWT_SECRET="<your-secure-random-jwt-secret-key>"
```

### 3. Running Locally
```bash
npm run dev
```
Open **[http://localhost:3001](http://localhost:3001)** on your mobile browser or desktop device.

---

## 🚀 Cloud Deployment Guide (Standalone QR Scanner)

The student scanner is fully decoupled from the teacher frontend and backend, enabling independent deployment to any cloud hosting provider (e.g., **Vercel**, **Render**, or **Netlify**).

### Deploying to Vercel (Recommended)

1. **Push your code to GitHub** (or connect your existing Git repository).
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import your GitHub repository.
4. In the **Configure Project** screen:
   - **Project Name:** `sit-student-scanner` (or your preferred name)
   - **Framework Preset:** `Next.js`
   - **Root Directory:** Click **Edit** and select `student-scanner`.
5. Under **Environment Variables**, add the following 4 variables:
   | Variable | Value | Notes |
   | :--- | :--- | :--- |
   | `DATABASE_URL` | `postgresql://<user>:<pwd>@<neon-host>/neondb?sslmode=require` | Your Neon serverless PostgreSQL connection string |
   | `NEXT_PUBLIC_TEACHER_BACKEND_URL` | `https://<your-backend>.onrender.com` | Live URL of the Express/Socket.IO backend |
   | `NEXT_PUBLIC_APP_URL` | `https://sit-student-scanner.vercel.app` | The public Vercel production URL for this scanner app |
   | `JWT_SECRET` | `<your-secure-jwt-secret>` | Must match the `JWT_SECRET` configured in `attendance-backend` |
6. Click **Deploy**. Vercel will build and deploy the application in under 60 seconds.

---

## 📲 Add to Home Screen (PWA Experience)

Once deployed (or running locally on Wi-Fi):
1. Open the scanner web app URL on Chrome (Android) or Safari (iOS).
2. Tap the browser menu (or the Share button on iOS).
3. Select **"Add to Home Screen"**.
4. The scanner will install as a standalone mobile web app without browser address bars, offering a native mobile experience!
