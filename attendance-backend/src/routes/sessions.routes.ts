import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import { io } from '../index';
import jwt from 'jsonwebtoken';

const router = Router();

// Start session
router.post('/start', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { lectureId, section } = req.body;
    
    if (!section) {
      return res.status(400).json({ error: 'Section is required' });
    }
    
    // Check if session already active
    const existingSession = await prisma.attendanceSession.findFirst({
      where: { lectureId: String(lectureId), status: 'active' }
    });
    if (existingSession) {
      return res.status(400).json({ error: 'Session already active for this lecture' });
    }

    // Find students for the given section
    const students = await prisma.student.findMany({
      where: { section: String(section) }
    });

    const qrTokenBase = `session_${lectureId}_${Date.now()}`;

    const session = await prisma.attendanceSession.create({
      data: {
        lectureId: String(lectureId),
        section: String(section),
        status: 'active',
        qrToken: qrTokenBase,
        records: {
          create: students.map(s => ({
            studentId: s.id,
            status: 'absent'
          }))
        }
      }
    });

    res.json(session);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get active session
router.get('/active', requireAuth, async (req: AuthRequest, res) => {
  try {
    const session = await prisma.attendanceSession.findFirst({
      where: {
        status: 'active',
        lecture: {
          teacherId: req.teacher?.id
        }
      }
    });
    res.json(session || { error: 'No active session' }); // return error string or 404, we'll handle gracefully on frontend
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate rotating short-lived QR token
router.get('/:id/token', requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = String(req.params.id);
    const session = await prisma.attendanceSession.findUnique({ where: { id: sessionId } });
    if (!session || session.status !== 'active') {
      return res.status(400).json({ error: 'Session not active' });
    }

    // 30 seconds token
    const token = jwt.sign({ sessionId }, process.env.JWT_SECRET || 'super-secret-jwt-key', { expiresIn: '30s' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get session state
router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = String(req.params.id);
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: {
        lecture: {
          include: { classroom: true }
        },
        records: {
          include: { student: true }
        }
      }
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Manual override
router.patch('/:id/students/:studentId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    const studentId = String(req.params.studentId);
    const { status } = req.body;

    const record = await prisma.attendanceRecord.findUnique({
      where: { sessionId_studentId: { sessionId: id, studentId } }
    });

    if (!record) return res.status(404).json({ error: 'Record not found' });

    const updated = await prisma.attendanceRecord.update({
      where: { id: record.id },
      data: { status: String(status), method: 'manual', markedAt: new Date() }
    });

    // Emit event
    io.to(`session:${id}`).emit('attendance:update', {
      studentId,
      status,
      method: 'manual',
      timestamp: updated.markedAt
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Close session
router.post('/:id/close', requireAuth, async (req: AuthRequest, res) => {
  try {
    const sessionId = String(req.params.id);
    
    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: { records: true }
    });

    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.status === 'closed') return res.status(400).json({ error: 'Session already closed' });

    const records = (session as any).records || [];
    const totalCount = records.length;
    const presentCount = records.filter((r: any) => r.status === 'present' || r.status === 'late').length;
    // Calculate strength percentage
    const strengthPct = totalCount > 0 ? (presentCount / totalCount) * 100 : 0;

    const closed = await prisma.attendanceSession.update({
      where: { id: sessionId },
      data: {
        status: 'closed',
        closedAt: new Date(),
        totalCount,
        presentCount,
        strengthPct
      }
    });

    // Emit event
    io.to(`session:${sessionId}`).emit('session:closed', { summary: closed });

    res.json(closed);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Unit test export
export const calculateStrength = (present: number, total: number) => {
  if (total === 0) return 0;
  return Number(((present / total) * 100).toFixed(2));
};

export default router;
