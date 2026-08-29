import { Router } from 'express';
import { prisma } from '../utils/prisma';
import jwt from 'jsonwebtoken';
import { io } from '../index';

const router = Router();

router.post('/scan', async (req, res) => {
  try {
    const { qrToken, rollNo, name, lat, lng } = req.body;

    if (!qrToken || !rollNo) {
      return res.status(400).json({ error: 'qrToken and rollNo are required' });
    }

    let sessionId: string;

    if (qrToken === 'demo') {
      const activeSession = await prisma.attendanceSession.findFirst({ where: { status: 'active' } });
      if (!activeSession) {
        return res.status(400).json({ error: 'No active session found to demonstrate scanning' });
      }
      sessionId = activeSession.id;
    } else {
      try {
        const decoded: any = jwt.verify(qrToken, process.env.JWT_SECRET || 'super-secret-jwt-key');
        sessionId = decoded.sessionId;
      } catch (err) {
        return res.status(401).json({ error: 'QR Code expired or invalid. Please scan again.' });
      }
    }

    const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
    if (!session || session.status !== 'active') {
      return res.status(400).json({ error: 'Session is not active' });
    }

    // Dynamic Student Registration
    let student = await prisma.student.findUnique({ where: { rollNo } });
    if (!student) {
      if (!name) {
        return res.status(400).json({ error: 'Student not found. Name is required to register a new student.' });
      }
      student = await prisma.student.create({
        data: { rollNo, name }
      });
    }

    let record = await prisma.attendanceRecord.findUnique({
      where: { sessionId_studentId: { sessionId, studentId: student.id } }
    });

    if (!record) {
      // If student is new to this lecture, we could add them to the roster if we wanted
      // await prisma.studentLecture.upsert({ ... })
      
      // Create the record dynamically as present
      record = await prisma.attendanceRecord.create({
        data: {
          sessionId,
          studentId: student.id,
          status: 'present',
          method: 'qr',
          markedAt: new Date()
        }
      });
    } else {
      if (record.status === 'present' || record.status === 'late') {
        return res.json({ message: 'Attendance already recorded', status: record.status });
      }
      
      record = await prisma.attendanceRecord.update({
        where: { id: record.id },
        data: { status: 'present', method: 'qr', markedAt: new Date() }
      });
    }

    io.to(`session:${sessionId}`).emit('attendance:update', {
      studentId: student.id,
      status: 'present',
      method: 'qr',
      timestamp: record.markedAt,
      // For dynamic rosters, we also need to send the student details so the frontend can add them to the list
      student: { id: student.id, name: student.name, rollNo: student.rollNo }
    });

    res.json({ message: 'Attendance marked successfully', status: 'present' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
