import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning old dummy lectures...');
  const lectures = await prisma.lecture.findMany({
    where: {
      subject: { in: ['AIML', 'Data Structures', 'Web Development'] }
    },
    select: { id: true }
  });
  const lectureIds = lectures.map(l => l.id);

  if (lectureIds.length > 0) {
    const sessions = await prisma.attendanceSession.findMany({
      where: { lectureId: { in: lectureIds } },
      select: { id: true }
    });
    const sessionIds = sessions.map(s => s.id);

    if (sessionIds.length > 0) {
      await prisma.attendanceRecord.deleteMany({
        where: { sessionId: { in: sessionIds } }
      });
      await prisma.attendanceSession.deleteMany({
        where: { id: { in: sessionIds } }
      });
    }

    await prisma.studentLecture.deleteMany({
      where: { lectureId: { in: lectureIds } }
    });
    
    await prisma.lecture.deleteMany({
      where: { id: { in: lectureIds } }
    });
  }

  console.log('Adding new classrooms...');
  const newClassrooms = [
    'CL-104', 'CL-105', 'CL-106',
    'Studio 1', 'Studio 2',
    'S0-1', 'S0-2', 'S0-8',
    'S10', 'S10-A', 'S15', 'S15-A'
  ];
  for (let i = 1; i <= 14; i++) {
    newClassrooms.push(`Lab ${i}`);
  }

  for (const code of newClassrooms) {
    await prisma.classroom.upsert({
      where: { code },
      update: {},
      create: { code, building: 'Main Campus' }
    });
  }

  console.log('Update complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
