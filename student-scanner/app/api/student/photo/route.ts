import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentId, rollNo, photoUrl, photoBase64 } = body || {};
    const finalPhoto = photoUrl || photoBase64;

    if (!finalPhoto || (!rollNo && !studentId)) {
      return NextResponse.json(
        { error: 'PRN/Student ID and photo data are required.' },
        { status: 400 }
      );
    }

    const cleanRollNo = rollNo ? String(rollNo).trim() : undefined;
    const cleanStudentId = studentId ? String(studentId).trim() : undefined;

    const student = await prisma.student.findFirst({
      where: {
        OR: [
          ...(cleanStudentId ? [{ id: cleanStudentId }] : []),
          ...(cleanRollNo ? [{ rollNo: cleanRollNo }] : []),
        ],
      },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found in database.' }, { status: 404 });
    }

    // Save passport photo permanently
    const updated = await prisma.student.update({
      where: { id: student.id },
      data: { photoUrl: finalPhoto },
    });

    return NextResponse.json({
      success: true,
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
