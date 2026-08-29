import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import { toZonedTime } from 'date-fns-tz';

const router = Router();

router.get('/today', requireAuth, async (req: AuthRequest, res) => {
  try {
    const teacherId = req.teacher!.id;
    
    // Convert current time to IST to determine the day of the week accurately for IST
    const nowInIst = toZonedTime(new Date(), 'Asia/Kolkata');
    const dayOfWeek = nowInIst.getDay(); // 0 (Sun) to 6 (Sat)

    const lectures = await prisma.lecture.findMany({
      where: {
        teacherId,
        dayOfWeek,
      },
      include: {
        classroom: true,
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    res.json(lectures);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const teacherId = req.teacher!.id;
    const lectures = await prisma.lecture.findMany({
      where: { teacherId },
      include: { classroom: true },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });
    res.json(lectures);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const teacherId = req.teacher!.id;
    const { subject, startTime, endTime, dayOfWeek, classroomId, isTemporary } = req.body;
    
    const lecture = await prisma.lecture.create({
      data: {
        subject,
        startTime,
        endTime,
        dayOfWeek: parseInt(dayOfWeek),
        isTemporary: !!isTemporary,
        teacherId,
        classroomId,
      },
      include: { classroom: true }
    });
    res.status(201).json(lecture);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const teacherId = req.teacher!.id;
    const lectureId = String(req.params.id);
    const { subject, startTime, endTime, dayOfWeek, classroomId, isTemporary } = req.body;

    const existing = await prisma.lecture.findUnique({ where: { id: lectureId } });
    if (!existing || existing.teacherId !== teacherId) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    const lecture = await prisma.lecture.update({
      where: { id: lectureId },
      data: {
        subject,
        startTime,
        endTime,
        dayOfWeek: parseInt(dayOfWeek),
        isTemporary: !!isTemporary,
        classroomId,
      },
      include: { classroom: true }
    });
    res.json(lecture);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const teacherId = req.teacher!.id;
    const lectureId = String(req.params.id);

    const existing = await prisma.lecture.findUnique({ where: { id: lectureId } });
    if (!existing || existing.teacherId !== teacherId) {
      return res.status(404).json({ error: 'Lecture not found' });
    }

    await prisma.lecture.delete({ where: { id: lectureId } });
    res.json({ message: 'Lecture deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
