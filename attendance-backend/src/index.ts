import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { prisma } from './utils/prisma';

dotenv.config();

const app = express();
const server = http.createServer(app);

export const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH']
  }
});

// Fast health check endpoints - respond in <1ms without hitting DB
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'Attendance Portal API', uptime: process.uptime() });
});

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(cors({
  origin: true, // Allow any origin dynamically (handles localhost, local network IPs, mobile browsers, vercel, etc.)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1500
});
app.use('/api', limiter);

// Socket.io
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join_session', (sessionId) => {
    socket.join(`session:${sessionId}`);
    console.log(`Socket ${socket.id} joined session ${sessionId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Routes
import authRoutes from './routes/auth.routes';
import lecturesRoutes from './routes/lectures.routes';
import sessionsRoutes from './routes/sessions.routes';
import attendanceRoutes from './routes/attendance.routes';
import classroomsRoutes from './routes/classrooms.routes';
import studentRoutes from './routes/student.routes';

app.use('/api/auth', authRoutes);
app.use('/api/lectures', lecturesRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/classrooms', classroomsRoutes);
app.use('/api/student', studentRoutes);

const PORT = process.env.PORT || 10000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Pre-warm database connection on startup to avoid cold-query delays
  prisma.$connect()
    .then(() => console.log('Prisma database connection initialized & warmed'))
    .catch((err) => console.error('Database connection pre-warm warning:', err.message));

  // Self keep-alive ping for cloud free tiers (e.g. Render) to prevent idle sleep
  const keepAliveUrl = process.env.RENDER_EXTERNAL_URL || process.env.KEEP_ALIVE_URL;
  if (keepAliveUrl) {
    const pingTarget = keepAliveUrl.endsWith('/health') ? keepAliveUrl : `${keepAliveUrl}/health`;
    console.log(`Keep-alive ping enabled for ${pingTarget}`);
    setInterval(async () => {
      try {
        await fetch(pingTarget);
        console.log(`[Keep-Alive] Ping sent to ${pingTarget}`);
      } catch (e: any) {
        console.log(`[Keep-Alive] Ping warning: ${e.message}`);
      }
    }, 13 * 60 * 1000); // Every 13 minutes (Render sleeps at 15 minutes)
  }
});
