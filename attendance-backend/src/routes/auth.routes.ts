import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    
    const existing = await prisma.teacher.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const teacher = await prisma.teacher.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
      },
    });

    const token = jwt.sign({ id: teacher.id }, process.env.JWT_SECRET || 'super-secret-jwt-key', { expiresIn: '7d' });

    res.status(201).json({ message: 'Registration successful', token, teacher: { id: teacher.id, name: teacher.name, email: teacher.email, subjects: teacher.subjects, profilePic: teacher.profilePic } });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const teacher = await prisma.teacher.findUnique({ where: { email } });
    if (!teacher) {
      return res.status(401).json({ error: 'That email or password doesn\'t match our records.' });
    }

    const isValid = await bcrypt.compare(password, teacher.password);
    if (!isValid) {
      return res.status(401).json({ error: 'That email or password doesn\'t match our records.' });
    }

    const token = jwt.sign({ id: teacher.id }, process.env.JWT_SECRET || 'super-secret-jwt-key', { expiresIn: '7d' });

    res.json({ token, teacher: { id: teacher.id, name: teacher.name, email: teacher.email, subjects: teacher.subjects, profilePic: teacher.profilePic } });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

const settingsSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  profilePic: z.string().optional().nullable(),
});

router.put('/settings', requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = settingsSchema.parse(req.body);
    
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email;
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }
    if (data.profilePic !== undefined) updateData.profilePic = data.profilePic;

    const teacher = await prisma.teacher.update({
      where: { id: req.teacher?.id },
      data: updateData
    });

    res.json({ message: 'Settings updated', teacher: { id: teacher.id, name: teacher.name, email: teacher.email, subjects: teacher.subjects, profilePic: teacher.profilePic } });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', requireAuth, (req: AuthRequest, res) => {
  res.json(req.teacher);
});

export default router;
