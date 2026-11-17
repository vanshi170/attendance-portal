import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import { toZonedTime } from 'date-fns-tz';

const router = Router();

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const match = timeStr.trim().match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) return 0;
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const ampm = match[3]?.toUpperCase();
  if (ampm === 'PM' && hour < 12) hour += 12;
  if (ampm === 'AM' && hour === 12) hour = 0;
  return hour * 60 + minute;
}

export function getIstTodayRange(): { startOfDay: Date; endOfDay: Date; currentMinutes: number; dayOfWeek: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
  const istDateStr = formatter.format(new Date()); // YYYY-MM-DD
  
  const startOfDay = new Date(`${istDateStr}T00:00:00+05:30`);
  const endOfDay = new Date(`${istDateStr}T23:59:59.999+05:30`);
  
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });
  const parts = timeFormatter.formatToParts(new Date());
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  const currentMinutes = hour * 60 + minute;
  
  const nowInIst = toZonedTime(new Date(), 'Asia/Kolkata');
  const dayOfWeek = nowInIst.getDay();
  
  return { startOfDay, endOfDay, currentMinutes, dayOfWeek };
}

export function isTimeWithinWindow(startTime: string, endTime: string, currentMinutes: number): boolean {
  const startMin = parseTimeToMinutes(startTime);
  const endMin = parseTimeToMinutes(endTime);
  if (endMin < startMin) {
    // Handle edge case spanning midnight
    return currentMinutes >= startMin || currentMinutes <= endMin;
  }
  return currentMinutes >= startMin && currentMinutes <= endMin;
}

router.get('/today', requireAuth, async (req: AuthRequest, res) => {
  try {
    const teacherId = req.teacher!.id;
    const { startOfDay, endOfDay, currentMinutes, dayOfWeek } = getIstTodayRange();

    const lectures = await prisma.lecture.findMany({
      where: {
        teacherId,
        dayOfWeek,
      },
      include: {
        classroom: true,
        sessions: {
          where: {
            startedAt: {
              gte: startOfDay,
              lte: endOfDay,
            }
          },
          orderBy: { startedAt: 'desc' },
          select: {
            id: true,
            status: true,
            startedAt: true,
            closedAt: true,
            section: true,
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    const enrichedLectures = lectures.map(lec => {
      const isWithinTimeWindow = isTimeWithinWindow(lec.startTime, lec.endTime, currentMinutes);
      // If any session was closed today for this lecture, attendance is completed
      const hasClosedSession = lec.sessions.some(s => s.status === 'closed');
      const activeSession = lec.sessions.find(s => s.status === 'active');

      return {
        id: lec.id,
        subject: lec.subject,
        startTime: lec.startTime,
        endTime: lec.endTime,
        dayOfWeek: lec.dayOfWeek,
        isTemporary: lec.isTemporary,
        classroom: lec.classroom,
        isWithinTimeWindow,
        attendanceDone: hasClosedSession,
        activeSessionId: activeSession ? activeSession.id : null,
        latestSessionId: lec.sessions[0]?.id || null,
      };
    });

    res.json(enrichedLectures);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const teacherId = req.teacher!.id;
    const lectures = await prisma.lecture.findMany({
      where: { teacherId },
      include: {
        classroom: true,
        sessions: {
          select: { id: true, status: true, startedAt: true },
          orderBy: { startedAt: 'desc' },
          take: 1
        }
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });

    const enriched = lectures.map(lec => ({
      id: lec.id,
      subject: lec.subject,
      startTime: lec.startTime,
      endTime: lec.endTime,
      dayOfWeek: lec.dayOfWeek,
      isTemporary: lec.isTemporary,
      classroomId: lec.classroomId,
      classroom: lec.classroom,
      hasAttendance: lec.sessions.length > 0,
      latestSessionId: lec.sessions[0]?.id || null,
      latestSessionStatus: lec.sessions[0]?.status || null,
    }));

    res.json(enriched);
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
