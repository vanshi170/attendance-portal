import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rollNo, timetableUrl } = body;

    if (!rollNo || !timetableUrl) {
      return NextResponse.json(
        { error: 'PRN and timetable file data are required.' },
        { status: 400 }
      );
    }

    const updated = await prisma.student.update({
      where: { rollNo },
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
