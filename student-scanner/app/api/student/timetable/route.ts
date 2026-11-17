import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rollNo, studentId, timetableUrl } = body;

    if ((!rollNo && !studentId) || !timetableUrl) {
      return NextResponse.json(
        { error: 'PRN or studentId and timetable file data are required.' },
        { status: 400 }
      );
    }

    const student = await prisma.student.findFirst({
      where: {
        OR: [
          ...(rollNo ? [{ rollNo: String(rollNo).trim() }] : []),
          ...(studentId ? [{ id: String(studentId).trim() }] : []),
        ],
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
    }

    const updated = await prisma.student.update({
      where: { id: student.id },
      data: { timetableUrl },
    });

    return NextResponse.json({
      message: 'Timetable saved successfully.',
      timetableUrl: updated.timetableUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rollNo = searchParams.get('rollNo');

    if (!rollNo) {
      return NextResponse.json({ error: 'PRN is required.' }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { rollNo },
      select: { timetableUrl: true },
    });

    return NextResponse.json({ timetableUrl: student?.timetableUrl || null });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
