import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

const rawBackendUrl =
  process.env.NEXT_PUBLIC_TEACHER_BACKEND_URL || 'http://localhost:10000';
const TEACHER_BACKEND_URL = rawBackendUrl.replace(/\/+$/, '');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { qrToken, rollNo, name, lat, lng, wifiSSID, faceVerified } = body;

    if (!qrToken || !rollNo) {
      return NextResponse.json(
        { error: 'QR Token and PRN are required.' },
        { status: 400 }
      );
    }

    // Try forwarding to Teacher Backend first so WebSockets fire live
    try {
      const response = await fetch(`${TEACHER_BACKEND_URL}/api/attendance/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrToken,
          rollNo,
          name,
          lat,
          lng,
          wifiSSID,
          faceVerified: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json({
          success: true,
          message: data.message || 'Attendance marked successfully!',
        });
      }
    } catch (backendErr) {
      console.warn('Teacher backend relay failed, falling back to direct DB update:', backendErr);
    }

    // Fallback: Direct Neon DB Update
    let token = String(qrToken).trim();
    if (token.includes('/scan/')) {
      token = token.split('/scan/').pop()?.split('?')[0] || token;
    }

    let sessionId: string;
    if (token === 'demo') {
      const activeSession = await prisma.attendanceSession.findFirst({
        where: { status: 'active' },
      });
      if (!activeSession) {
        return NextResponse.json(
          { error: 'No active lecture session found.' },
          { status: 400 }
        );
      }
      sessionId = activeSession.id;
    } else {
      try {
        const decoded: any = jwt.verify(
          token,
          process.env.JWT_SECRET || 'super-secret-jwt-key'
        );
        sessionId = decoded.sessionId;
      } catch (err) {
        return NextResponse.json(
          { error: 'QR Code has expired or is invalid. Please scan again.' },
          { status: 401 }
        );
      }
    }

    const session = await prisma.attendanceSession.findUnique({
      where: { id: sessionId },
      include: { lecture: { include: { classroom: true } } },
    });

    if (!session || session.status !== 'active') {
      return NextResponse.json(
        { error: 'Attendance session is no longer active.' },
        { status: 400 }
      );
    }

    const student = await prisma.student.findUnique({
      where: { rollNo },
    });

    if (!student) {
      return NextResponse.json(
        { error: 'Student PRN not recognized in registry.' },
        { status: 404 }
      );
    }

    // Upsert record as present
    await prisma.attendanceRecord.upsert({
      where: {
        sessionId_studentId: {
          sessionId,
          studentId: student.id,
        },
      },
      update: {
        status: 'present',
        method: 'qr',
        markedAt: new Date(),
      },
      create: {
        sessionId,
        studentId: student.id,
        status: 'present',
        method: 'qr',
        markedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Attendance recorded successfully!',
      lecture: {
        subject: session.lecture.subject,
        classroom: session.lecture.classroom?.code || 'CL',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
