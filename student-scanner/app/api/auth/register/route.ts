import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName, lastName, rollNo, email, password, section, semester } = body;

    // 1. Validation checks
    if (!firstName || !lastName || !rollNo || !email || !password || !section) {
      return NextResponse.json(
        { error: 'All fields are required.' },
        { status: 400 }
      );
    }

    // 2. Validate PRN (must be 11 digits)
    const cleanRollNo = String(rollNo).trim();
    if (!/^\d{11}$/.test(cleanRollNo)) {
      return NextResponse.json(
        { error: 'PRN must be an exact 11-digit number (e.g. 25070521001).' },
        { status: 400 }
      );
    }

    // 3. Validate College Email (must end with @sitnagpur.siu.edu.in)
    const cleanEmail = String(email).trim().toLowerCase();
    if (!cleanEmail.endsWith('@sitnagpur.siu.edu.in')) {
      return NextResponse.json(
        {
          error:
            'Please use your official college email ending with @sitnagpur.siu.edu.in. Personal emails (Gmail, Yahoo) are not permitted.',
        },
        { status: 400 }
      );
    }

    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const studentSemester = semester ? parseInt(semester) : 3;

    // 4. Strict PRN existence check in DB (No new unregistered students can be added)
    const existingStudent = await prisma.student.findUnique({
      where: { rollNo: cleanRollNo },
    });

    if (!existingStudent) {
      return NextResponse.json(
        { error: 'Wrong PRN: Student PRN does not exist in the database.' },
        { status: 404 }
      );
    }

    // 5. Strict Semester 3 check: only semester 3 is allowed
    if (studentSemester !== 3 || (existingStudent.semester && existingStudent.semester !== 3)) {
      return NextResponse.json(
        { error: 'You do not exist in this semester. Students only exist in Semester 3.' },
        { status: 400 }
      );
    }

    // 6. Update existing pre-seeded student record with their credentials
    const student = await prisma.student.update({
      where: { id: existingStudent.id },
      data: {
        name: fullName || existingStudent.name,
        email: cleanEmail,
        password: String(password),
        section: String(section).toUpperCase(),
        semester: 3,
      },
    });

    // Mock simple session token (or JWT)
    const token = `student_token_${student.id}_${Date.now()}`;

    return NextResponse.json({
      message: 'Registration successful. Proceed to passport photo verification.',
      token,
      student: {
        id: student.id,
        name: student.name,
        rollNo: student.rollNo,
        email: student.email,
        section: student.section,
        semester: student.semester,
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
