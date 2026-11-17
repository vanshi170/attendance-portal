import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rollNo, photoUrl } = body;

    if (!rollNo || !photoUrl) {
      return NextResponse.json(
        { error: 'PRN and photo data are required.' },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { rollNo },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
    }

    // Save passport photo permanently
    const updated = await prisma.student.update({
      where: { rollNo },
      data: { photoUrl },
    });

    return NextResponse.json({
      message: 'Passport profile photo saved successfully.',
      photoUrl: updated.photoUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
