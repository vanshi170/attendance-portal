import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rollNo = searchParams.get('rollNo');

    if (!rollNo) {
      return NextResponse.json({ error: 'PRN is required' }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { rollNo },
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
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Filter valid lecture session records (sessions that are closed or active)
    const validRecords = student.records.filter((r) => r.session != null);
    const presentRecords = validRecords.filter(
      (r) => r.status === 'present' || r.status === 'late'
    );
    const absentRecords = validRecords.filter((r) => r.status === 'absent');

    const presentCount = presentRecords.length;
    const absentCount = absentRecords.length;
    const totalCount = presentCount + absentCount;

    // Overall attendance calculation from neondb data:
    // [ no of classes present in / total classes taken (present+absent) ] * 100
    const percentage = totalCount > 0 ? Number(((presentCount / totalCount) * 100).toFixed(1)) : 100.0;

    // Format recent attendance logs
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

    return NextResponse.json({
      student: {
        id: student.id,
        name: student.name,
        rollNo: student.rollNo,
        email: student.email,
        section: student.section,
        photoUrl: student.photoUrl,
        timetableUrl: student.timetableUrl,
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
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
