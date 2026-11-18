import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

router.post('/register', async (req, res) => {
  try {
    const { rollNo, section, semester, firstName, lastName } = req.body;
    
    // Check if this is a Student Registration
    if (rollNo || req.body.isStudent || section) {
      const cleanRollNo = String(rollNo || '').trim();
      const cleanEmail = String(req.body.email || '').trim().toLowerCase();
      const rawPassword = String(req.body.password || '');
      const fullName = (req.body.name || `${firstName || ''} ${lastName || ''}`).trim();
      const studentSection = String(section || 'AIML-A').toUpperCase();
      const studentSemester = semester ? parseInt(semester) : 1;

      if (!cleanRollNo || !/^\d{11}$/.test(cleanRollNo)) {
        return res.status(400).json({ error: 'PRN must be an exact 11-digit number (e.g. 25070521001).' });
      }

      if (!cleanEmail.endsWith('@sitnagpur.siu.edu.in')) {
        return res.status(400).json({
          error: 'Please use your official college email ending with @sitnagpur.siu.edu.in.',
        });
      }

      if (!rawPassword || rawPassword.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }

      const student = await prisma.student.upsert({
        where: { rollNo: cleanRollNo },
        update: {
          name: fullName || 'Student',
          email: cleanEmail,
          password: rawPassword,
          section: studentSection,
          semester: studentSemester,
        },
        create: {
          rollNo: cleanRollNo,
          name: fullName || 'Student',
          email: cleanEmail,
          password: rawPassword,
          section: studentSection,
          semester: studentSemester,
        },
      });

      const token = `student_token_${student.id}_${Date.now()}`;
      return res.status(201).json({
        message: 'Registration successful',
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
    }

    // Teacher Registration Fallback
    const data = registerSchema.parse(req.body);
    const existing = await prisma.teacher.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const teacher = await prisma.teacher.create({
      data: {
        name: data.name || 'Instructor',
        email: data.email,
        password: hashedPassword,
      },
    });

    const token = jwt.sign({ id: teacher.id }, process.env.JWT_SECRET || 'super-secret-jwt-key', { expiresIn: '7d' });
    return res.status(201).json({
      message: 'Registration successful',
      token,
      teacher: { id: teacher.id, name: teacher.name, email: teacher.email, subjects: teacher.subjects, profilePic: teacher.profilePic },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const rawInput = req.body.identifier || req.body.email || req.body.rollNo;
    const password = req.body.password;

    if (!rawInput || !password) {
      return res.status(400).json({ error: 'Email/PRN and password are required.' });
    }

    const cleanInput = String(rawInput).trim();

    // 1. Try finding Teacher first
    const teacher = await prisma.teacher.findUnique({ where: { email: cleanInput.toLowerCase() } });
    if (teacher) {
      const isValid = await bcrypt.compare(String(password), teacher.password);
      if (isValid) {
        const token = jwt.sign({ id: teacher.id }, process.env.JWT_SECRET || 'super-secret-jwt-key', { expiresIn: '7d' });
        return res.json({
          token,
          teacher: { id: teacher.id, name: teacher.name, email: teacher.email, subjects: teacher.subjects, profilePic: teacher.profilePic },
        });
      }
    }

    // 2. Try finding Student by PRN or Email
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { rollNo: cleanInput },
          { email: cleanInput.toLowerCase() },
        ],
      },
    });

    if (student) {
      if (student.password && student.password !== String(password)) {
        return res.status(401).json({ error: 'Incorrect password. Please try again.' });
      }

      if (!student.password) {
        await prisma.student.update({
          where: { id: student.id },
          data: { password: String(password) },
        });
      }

      const token = `student_token_${student.id}_${Date.now()}`;
      return res.json({
        message: 'Logged in successfully',
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
    }

    return res.status(401).json({ error: 'No account found with this PRN or Email.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
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
