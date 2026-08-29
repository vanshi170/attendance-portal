import { Router } from 'express';
import { prisma } from '../utils/prisma';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const classrooms = await prisma.classroom.findMany({
      orderBy: { code: 'asc' }
    });
    res.json(classrooms);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
