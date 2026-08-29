import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning database...');
  await prisma.attendanceRecord.deleteMany({});
  await prisma.attendanceSession.deleteMany({});
  await prisma.studentLecture.deleteMany({});
  await prisma.lecture.deleteMany({});
  await prisma.classroom.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.teacher.deleteMany({});

  console.log('Creating demo teacher...');
  const hashedPassword = await bcrypt.hash('Teacher@2026', 10);
  
  const teacher = await prisma.teacher.create({
    data: {
      name: 'Demo Teacher',
      email: 'teacher.demo@brightfuture.edu',
      password: hashedPassword,
    },
  });

  console.log('Creating classrooms...');
  const cl101 = await prisma.classroom.create({ data: { code: 'CL-101', building: 'Tech Block' } });
  const cl102 = await prisma.classroom.create({ data: { code: 'CL-102', building: 'Tech Block' } });
  const cl103 = await prisma.classroom.create({ data: { code: 'CL-103', building: 'Tech Block' } });

  console.log('Creating lectures for each day of week...');
  const lectureData = [];
  for (let i = 0; i <= 6; i++) {
    lectureData.push({
      subject: 'AIML',
      startTime: '09:00 AM',
      endTime: '10:00 AM',
      dayOfWeek: i,
      teacherId: teacher.id,
      classroomId: cl101.id,
    });
    lectureData.push({
      subject: 'Data Structures',
      startTime: '11:30 AM',
      endTime: '12:30 PM',
      dayOfWeek: i,
      teacherId: teacher.id,
      classroomId: cl102.id,
    });
    lectureData.push({
      subject: 'Web Development',
      startTime: '02:00 PM',
      endTime: '03:00 PM',
      dayOfWeek: i,
      teacherId: teacher.id,
      classroomId: cl103.id,
    });
  }
  await prisma.lecture.createMany({ data: lectureData });

  const dsLectures = await prisma.lecture.findMany({
    where: { subject: 'Data Structures' }
  });

  console.log('Creating 70 students...');
  const studentData = [];
  for (let i = 1; i <= 70; i++) {
    studentData.push({
      name: `Student ${i}`,
      rollNo: `DS${i.toString().padStart(3, '0')}`,
    });
  }
  await prisma.student.createMany({ data: studentData });

  const students = await prisma.student.findMany();

  console.log('Adding 70 students to Data Structures rosters...');
  const studentLectureData = [];
  for (const lecture of dsLectures) {
    for (const student of students) {
      studentLectureData.push({
        studentId: student.id,
        lectureId: lecture.id,
      });
    }
  }
  await prisma.studentLecture.createMany({ data: studentLectureData });

  console.log('Seed completed successfully in record time!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
