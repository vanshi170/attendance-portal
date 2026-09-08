# 🎓 Teacher Attendance Portal

A modern, full-stack web application designed for educational institutions to streamline the attendance tracking process. It features a real-time QR code scanning system that eliminates proxy attendance, complete with a comprehensive dashboard for teachers to manage lectures, timetables, and student analytics.

![Teacher Portal Dashboard Placeholder](https://via.placeholder.com/1000x500.png?text=Teacher+Portal+Dashboard)

## 🌟 Key Features

### 📡 Real-Time QR Attendance
- **Dynamic QR Generation**: Projects a live, frequently refreshing QR code on the classroom screen.
- **WebSocket Integration**: Uses Socket.io to instantly reflect student scans on the teacher's dashboard without refreshing.
- **Anti-Proxy System**: QR tokens expire rapidly, preventing students from sending screenshots to absent friends.

### 👩‍🏫 Teacher Dashboard
- **Session Management**: Start and stop attendance sessions for specific subjects and classrooms.
- **Live Analytics**: View a live, auto-updating roster of "Present" and "Absent" students during a lecture.
- **Manual Override**: Allows teachers to manually mark students present or late.

### 📅 Timetable & Rosters
- **Classroom Allocation**: Assign specific lecture halls (e.g., CL-101, CL-102) and timings.
- **Section Parsing**: Automatically loads pre-configured student rosters (Sections A-E) based on the database.

## 🛠️ Technology Stack

**Frontend (Vercel):**
- **Framework**: Next.js (App Router)
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **Icons**: Lucide React
- **QR Scanner**: `react-qr-scanner` (or similar)

**Backend (Render):**
- **Framework**: Node.js & Express.js
- **Real-Time**: Socket.io
- **Database ORM**: Prisma
- **Database**: PostgreSQL (hosted on Neon)
- **Security**: JWT Authentication, Bcrypt password hashing, Helmet, Express Rate Limit.

## 🚀 Getting Started Locally

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database (or Neon connection string)

### 1. Clone the repository
```bash
git clone https://github.com/vanshi170/attendance-portal.git
cd attendance-portal
```

### 2. Backend Setup
```bash
cd attendance-backend
npm install
```
Create a `.env` file in the `attendance-backend` directory:
```env
DATABASE_URL="postgresql://username:password@your-neon-db-url"
JWT_SECRET="your-super-secret-jwt-key"
PORT=10000
CORS_ORIGIN="http://localhost:3000"
```
Initialize the database and start the server:
```bash
npx prisma generate
npx prisma db push
npm run seed  # Populates demo teacher, classrooms, and 300+ students
npm run dev
```

### 3. Frontend Setup
Open a new terminal and navigate to the frontend:
```bash
cd attendance-frontend
npm install
```
Create a `.env.local` file in the `attendance-frontend` directory:
```env
NEXT_PUBLIC_API_URL="http://localhost:10000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:10000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```
Start the development server:
```bash
npm run dev
```

Visit `http://localhost:3000` to access the application. Log in with the seeded credentials (if using the demo seed):
- **Email**: `teacher.demo@brightfuture.edu`
- **Password**: `Teacher@2026`

## 🌐 Production Deployment
- **Database**: Hosted on [Neon Serverless Postgres](https://neon.tech/)
- **Backend**: Hosted on [Render](https://render.com/) (Web Service)
- **Frontend**: Hosted on [Vercel](https://vercel.com/)

Ensure that production environment variables are correctly mapped between Vercel and Render, specifically the `CORS_ORIGIN` and the `NEXT_PUBLIC_API_URL` to avoid connection drops.

## 🤝 Contributing
1. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
2. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
3. Push to the Branch (`git push origin feature/AmazingFeature`)
4. Open a Pull Request on GitHub.

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
