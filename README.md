# 🎓 Smart Attendance Management System Using QR Codes

> 📱 **Looking to build the Student Camera QR Scanner Web App?**  
> Check out the complete developer specification and AI prompt blueprint in [SCANNER_APP_SPEC.md](SCANNER_APP_SPEC.md).

A modern, full-stack cyber-physical web application designed for educational institutions to eliminate proxy attendance. It combines dynamic, short-lived cryptographic QR codes with spatial geofencing, institutional Wi-Fi binding, and facial liveness verification, complete with a comprehensive instructor dashboard for real-time lecture management, timetabling, and automated section-based roster tracking.

---

## 🌟 Key Features

* **📡 Real-Time Anti-Proxy QR Attendance:**
  - **Dynamic Ephemeral Tokens:** Cryptographic JWT tokens generated with 25–30 second lifespans, displayed on classroom projectors; screenshots shared via messaging apps expire instantly.
  - **Sub-100ms WebSocket Sync:** Uses Socket.IO rooms to immediately broadcast verified scans to the teacher's screen without requiring page refreshes.
  - **Zero-Trust Client Verification:** Student scanner enforces GPS campus boundary geofencing, institutional Wi-Fi binding (`SYMBI_NGP_STUDENT`), and front-camera facial attentiveness verification.

* **👩‍🏫 Instructor Dashboard & Live Roster:**
  - **Automated Section Rosters:** Initializing a lecture session auto-loads the complete student list for the designated section (Sections A–E, ~330+ seeded records), defaulting all records to Absent (`[A]`).
  - **Live State Transitions:** The moment a student scans, their visual card flips from a Red `[A]` (Absent) to a vibrant Green `[P]` (Present) in real time.
  - **Manual Intervention & Late Mode:** One-click faculty override allows instructors to manually mark students Present or Late in case of student device battery failure or camera hardware defects.

* **📅 7-Day Timetable & Classroom Scheduler:**
  - **Comprehensive Weekly Planning:** Full weekly scheduler covering Monday through Sunday.
  - **Venue Allocation:** Assigns specific halls (`CL-101` to `CL-106`), studios, and engineering laboratories (`Lab 1` to `Lab 14`) with time-conflict prevention.

---

## 🛠️ Essential Tools, Technologies, and Software Used in the Project

A detailed breakdown of all software packages, libraries, architectural frameworks, and cloud infrastructure powering this system:

### 1. Frontend Technologies & Software
* **Next.js 16 (App Router & Turbopack):** Core React production framework providing server-side rendering, client-side hydration, route handlers, and optimized edge bundling.
* **React 19:** Component-based UI library delivering reactive state management and high-performance DOM reconciliation.
* **TypeScript:** End-to-end static type enforcement, ensuring rigorous data contract validation across views and API utilities.
* **Tailwind CSS:** Utility-first CSS engine implementing the custom glassmorphism design system (Canvas Pink `#fdf2f6`, Hot Pink `#EC77AB`, and Thistle Lavender `#D4C0F2`).
* **Framer Motion:** Hardware-accelerated animation engine used for reactive layout transitions and ambient cursor tracking.
* **Socket.IO Client (`socket.io-client` v4.8):** Real-time client library establishing persistent bi-directional WebSocket connections to session rooms.
* **QRCode.react (`qrcode.react` v4.2):** High-density, scalable vector graphics (SVG) QR code generation engine with error correction Level H.
* **Lucide React:** Scalable, accessible SVG iconography library.
* **Sonner:** Accessible notification toast framework for contextual feedback.

### 2. Backend Technologies & Software
* **Node.js Runtime (v18+ / v24):** High-throughput, event-driven asynchronous JavaScript server runtime.
* **Express.js (v4.21):** Fast, minimalist REST API framework orchestrating routing, middleware pipelines, and controller logic.
* **Socket.IO Server (`socket.io` v4.8):** Event-driven server engine managing WebSocket channels, client connection lifecycles, and session room broadcasts (`io.to('session:id').emit`).
* **JSON Web Tokens (`jsonwebtoken` v9.0):** Cryptographic engine generating signed, tamper-proof bearer tokens for teacher authentication and rotating QR payloads.
* **Bcrypt (`bcrypt` v5.1):** Adaptive one-way cryptographic hashing function with configurable salt rounds for secure password storage.
* **Helmet (`helmet` v8.0):** Comprehensive security middleware configuring standard HTTP headers (X-Frame-Options, CSP, HSTS, Sniff-guard).
* **Express Rate Limit (`express-rate-limit` v7.5):** API protection mechanism limiting client traffic (1500 requests per 15-minute window) against DDoS and brute-force attempts.
* **CORS (`cors` v2.8):** Configured with dynamic origin reflection to permit communication across local networks, mobile devices, and deployed domains.
* **Zod (`zod` v3.24):** Schema declaration and runtime validation library validating all incoming auth and session payloads.

### 3. Database & Cloud Infrastructure
* **Neon.tech Serverless PostgreSQL:** Cloud-native, auto-scaling relational database hosted on AWS (`us-east-2` Ohio) providing secure SSL connectivity, point-in-time recovery, and connection pooling.
* **Prisma ORM v6 (`@prisma/client` & `prisma`):** Type-safe object-relational mapping layer defining relational data models, automated migrations, and schema seeding.
* **Vercel:** Cloud platform hosting the Next.js frontend with global edge CDN caching and automatic HTTPS SSL certificates.
* **Render:** Cloud hosting platform running the Node.js / Express web service container.

### 4. Developer Tooling & Utilities
* **Nodemon:** File-watching daemon that automatically restarts the Node.js application when source changes are detected.
* **OpenPyXL & Pandas:** Python data tooling used for automated student roster extraction and multi-sheet Excel generation.
* **Playwright:** Headless browser automation library utilized for high-resolution 1920&times;1080 poster capture and end-to-end rendering.
* **Git & GitHub:** Distributed version control and collaboration ecosystem.

---

## 🚀 Step-by-Step Instructions: How to Execute and Use the Project

Follow these comprehensive, step-by-step instructions to set up, launch, and operate the complete project locally.

### Prerequisites
Before running the application, ensure your computer has the following software installed:
1. **Node.js** (v18.0.0 or higher, v20/v24 recommended) &rarr; [Download Node.js](https://nodejs.org/)
2. **npm** (comes bundled with Node.js)
3. **Git** &rarr; [Download Git](https://git-scm.com/)
4. A web browser (Google Chrome, Microsoft Edge, Brave, or Safari)

---

### Phase 1: Step-by-Step Execution Guide (Local Setup)

#### Step 1: Clone the Repository
Open your terminal (PowerShell, Command Prompt, or Bash) and clone the repository:
```bash
git clone https://github.com/vanshi170/attendance-portal.git
cd attendance-portal
```

#### Step 2: Setup and Start the Backend Server
Navigate to the `attendance-backend` directory and install its dependencies:
```bash
cd attendance-backend
npm install
```

Create a `.env` file inside the `attendance-backend/` directory with the following variables:
```env
DATABASE_URL="postgresql://<username>:<password>@<your-neon-hostname>.aws.neon.tech/neondb?sslmode=require"
JWT_SECRET="super-secret-jwt-key"
PORT=10000
CORS_ORIGIN="http://localhost:3000"
FRONTEND_URL="http://localhost:3000"
```

Initialize Prisma, synchronize database schemas, and seed demo records:
```bash
# 1. Generate the Prisma TypeScript client
npx prisma generate

# 2. Push schema to the database (creates tables if needed)
npx prisma db push

# 3. Seed database with Demo Teacher, Classrooms, and 320+ Students across Sections A-E
npm run seed
```

Start the backend development server:
```bash
npm run dev
```
> ✅ *The backend will start and print `Server running on port 10000`.*

---

#### Step 3: Setup and Start the Frontend Application
Open a **new, separate terminal window**, navigate to the `attendance-frontend` directory, and install its dependencies:
```bash
cd "attendance-frontend"
npm install
```

Create a `.env.local` file inside the `attendance-frontend/` directory with the following variables:
```env
NEXT_PUBLIC_API_URL="http://localhost:10000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:10000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

Start the frontend Next.js development server:
```bash
npm run dev
```
> ✅ *The frontend will compile and start on [http://localhost:3000](http://localhost:3000).*

---

### Phase 2: Step-by-Step User Guide (How to Use the Application)

#### 1. Teacher Authentication
1. Open your browser and navigate to [http://localhost:3000/login](http://localhost:3000/login).
2. Log in using the pre-seeded faculty credentials:
   - **Email:** `teacher.demo@brightfuture.edu`
   - **Password:** `<your-configured-password>`
3. *(Alternative)* Click **"Register"** to create a custom faculty account with your name, institution email, and password.

#### 2. Managing the 7-Day Timetable
1. After logging in, select **"Timetable"** from the navigation bar or top-right profile dropdown.
2. View your weekly schedule organized from **Monday through Sunday**.
3. To schedule a new lecture:
   - Click the pink **`+`** button under any day of the week.
   - Select the Subject (e.g., *Microcontroller & Sensors*, *Design Analysis & Algorithms*, *Machine Learning Fundamentals*).
   - Select the Lecture Hall or Lab (e.g., `CL-101`, `CL-104`, `Studio 1`, `Lab 10`).
   - Choose the Start and End times.
   - Click **Save**. The lecture card will instantly appear on your timetable.

#### 3. Starting an Active Attendance Session
1. Navigate to the **Teacher Dashboard** at [http://localhost:3000/dashboard](http://localhost:3000/dashboard).
2. Under **"Today's Lectures"**, choose the subject you are currently teaching.
3. In the **"Select Section"** dropdown, select your class section (**Section A, B, C, D, or E**).
4. Click **"Start Attendance"**.
5. The live Session Screen will launch:
   - **Left Screen Panel:** Displays a dynamic, large QR code with pulsing radar animation that auto-rotates every 25 seconds.
   - **Right Screen Panel:** Displays the full roster of students for the selected section (~60–65 students), all initialized with a red **`[A]`** (Absent) badge.

#### 4. Marking Attendance via Student QR Scanner
Students can record their attendance through either of the following methods:
* **Option A — Real-Time Scanner Demo Tester (On Laptop):**
  1. Open a new browser tab and navigate to [http://localhost:3000/scan/demo](http://localhost:3000/scan/demo) (or select **"Scanner Demo"** from the teacher profile dropdown).
  2. Enter any pre-seeded student PRN from that section:
     - *Section A Sample PRNs:* `25070521001` (Arushi Varghese), `25070521002` (Laranya Shende), `25070521004` (Harshini S J).
     - *Section B Sample PRN:* `25070521071` (Preeti Gautam).
     - *Section C Sample PRN:* `25070521142` (Aditya Raj).
  3. Click **"Mark Attendance"**.
* **Option B — Mobile Phone Camera Scanning:**
  - When students scan the rotating QR code displayed on the classroom screen, their phone scanner validates GPS location, verifies connection to `SYMBI_NGP_STUDENT`, checks facial visibility, and sends the attendance payload.

#### 5. Observing Real-Time Synchronized State Transitions
1. Return to the **Teacher Session Screen**.
2. Notice that the student who just submitted their scan has their red **`[A]`** badge **instantly flip to a vibrant green `[P]` (Present)** in sub-100ms latency without refreshing the page!
3. The top counter (`Present / Total`) automatically updates in real time.

#### 6. Faculty Manual Override (Failsafe for Hardware Issues)
1. If a student forgets their phone or has a drained battery, locate the student's name on the roster.
2. Click the **"Late"** button next to their red `[A]` badge.
3. Select **"Present"** to manually grant attendance, or **"Absent"** to revert.
4. The database and UI update immediately.

#### 7. Ending Attendance & Session Finalization
1. When the lecture period is over, click **"Close Attendance"** in the top-right corner.
2. Confirm the action in the prompt dialog.
3. The session status switches to `closed`, the rotating QR code is revoked, and the final attendance log is archived in the cloud PostgreSQL database.

---

## 🌐 Production Deployment Architecture

* **Database:** Hosted serverless in the cloud on [Neon Serverless PostgreSQL](https://neon.tech/) (AWS `us-east-2`).
* **Backend Web Service:** Hosted on [Render](https://render.com/) running containerized Node.js / Express.
* **Frontend Web Application:** Hosted on [Vercel](https://vercel.com/) with global edge CDN routing.

Ensure production environment variables match:
* `CORS_ORIGIN` on Render must equal your exact Vercel frontend URL (without trailing slashes).
* `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL` on Vercel must equal your Render web service URL.

---

## 📄 License
This project is distributed under the MIT License. See `LICENSE` for more information.
