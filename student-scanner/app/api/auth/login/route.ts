import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Email/PRN and password are required.' },
        { status: 400 }
      );
    }

    const cleanInput = String(identifier).trim();

    // Find student by PRN or by email
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { rollNo: cleanInput },
          { email: cleanInput.toLowerCase() },
        ],
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'No student found with this PRN or Email. Please register.' },
        { status: 401 }
      );
    }

    // If password was set, verify it
    if (student.password && student.password !== String(password)) {
      return NextResponse.json(
        { error: 'Incorrect password. Please try again.' },
        { status: 401 }
      );
    }

    // If student was pre-seeded and has no password yet, set it now
    if (!student.password) {
      await prisma.student.update({
        where: { id: student.id },
        data: { password: String(password) },
      });
    }

    const token = `student_token_${student.id}_${Date.now()}`;

    return NextResponse.json({
      message: 'Logged in successfully',
      token,
      student: {
        id: student.id,
        name: student.name,
        rollNo: student.rollNo,
        email: student.email,
        section: student.section,
        photoUrl: student.photoUrl,
        timetableUrl: student.timetableUrl,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
