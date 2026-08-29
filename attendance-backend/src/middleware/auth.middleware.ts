import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';

export interface AuthRequest extends Request {
  teacher?: { id: string; name: string; email: string };
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super-secret-jwt-key') as { id: string };

    const teacher = await prisma.teacher.findUnique({
      where: { id: decoded.id },
      select: { id: true, name: true, email: true },
    });

    if (!teacher) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.teacher = teacher;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
