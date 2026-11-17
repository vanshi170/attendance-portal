import { Router } from 'express';
import { prisma } from '../utils/prisma';

const router = Router();

// GET /api/student/dashboard?studentId=... or ?rollNo=...
router.get('/dashboard', async (req, res) => {
  try {
    const studentId = req.query.studentId as string;
    const rollNo = req.query.rollNo as string;

    if (!studentId && !rollNo) {
      return res.status(400).json({ error: 'studentId or rollNo is required' });
    }

    const student = await prisma.student.findFirst({
      where: {
        OR: [
          ...(studentId ? [{ id: studentId }] : []),
          ...(rollNo ? [{ rollNo }] : []),
        ],
      },
      include: {
        records: {
          include: {
            session: {
              include: {
                lecture: {
                  include: { classroom: true },
                },
              },
            },
          },
          orderBy: { markedAt: 'desc' },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const validRecords = student.records.filter((r) => r.session != null);
    const presentRecords = validRecords.filter(
      (r) => r.status === 'present' || r.status === 'late'
    );
    const absentRecords = validRecords.filter((r) => r.status === 'absent');

    const presentCount = presentRecords.length;
    const absentCount = absentRecords.length;
    const totalCount = presentCount + absentCount;

    const percentage =
      totalCount > 0 ? Number(((presentCount / totalCount) * 100).toFixed(1)) : 0.0;

    const recentLogs = validRecords.slice(0, 15).map((r) => ({
      id: r.id,
      subject: r.session.lecture.subject,
      classroom: r.session.lecture.classroom?.code || 'N/A',
      startTime: r.session.lecture.startTime,
      endTime: r.session.lecture.endTime,
      status: r.status,
      date: r.markedAt ? r.markedAt.toISOString() : r.session.startedAt.toISOString(),
      method: r.method || 'qr',
    }));

    return res.json({
      student: {
        id: student.id,
        name: student.name,
        rollNo: student.rollNo,
        email: student.email,
        section: student.section,
        photoUrl: student.photoUrl,
        timetableUrl: student.timetableUrl,
      },
      attendance: {
        totalClasses: totalCount,
        attendedClasses: presentCount,
        percentage,
      },
      stats: {
        presentCount,
        absentCount,
        totalCount,
        percentage,
        isSafe: percentage >= 75.0,
      },
      recentLogs,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /api/student/photo
router.post('/photo', async (req, res) => {
  try {
    const { studentId, photoUrl, photoBase64 } = req.body;
    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' });
    }

    const finalPhoto = photoUrl || photoBase64 || `https://api.dicebear.com/7.x/initials/svg?seed=${studentId}`;

    const student = await prisma.student.update({
      where: { id: studentId },
      data: { photoUrl: finalPhoto },
    });

    return res.json({ success: true, photoUrl: student.photoUrl });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update photo' });
  }
});

// POST /api/student/timetable
router.post('/timetable', async (req, res) => {
  try {
    const { studentId, rollNo, timetableUrl } = req.body;
    if (!studentId && !rollNo) {
      return res.status(400).json({ error: 'studentId or rollNo is required' });
    }

    const student = await prisma.student.findFirst({
      where: {
        OR: [
          ...(studentId ? [{ id: studentId }] : []),
          ...(rollNo ? [{ rollNo }] : []),
        ],
      },
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const updated = await prisma.student.update({
      where: { id: student.id },
      data: { timetableUrl: timetableUrl || '' },
    });

    return res.json({ success: true, timetableUrl: updated.timetableUrl });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update timetable' });
  }
});

export default router;
