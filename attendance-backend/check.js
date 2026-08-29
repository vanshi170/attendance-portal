const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.classroom.findMany().then(console.log).finally(() => prisma.$disconnect());
