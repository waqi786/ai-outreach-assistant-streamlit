import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ZodError, z } from 'zod';
import { sendValidationError, getCookieOptions } from '../lib/http';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types';

const router = Router();

const authSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

function signToken(user: { id: string; email: string }) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is missing.');
  }

  return jwt.sign({ userId: user.id, email: user.email }, secret, {
    expiresIn: '7d',
  });
}

router.post('/register', async (req, res) => {
  try {
    const { email, password } = authSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Email is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash },
      select: {
        id: true,
        email: true,
        encryptedApiKey: true,
      },
    });

    res.cookie('token', signToken(user), getCookieOptions());

    return res.status(201).json({
      id: user.id,
      email: user.email,
      hasApiKey: Boolean(user.encryptedApiKey),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return sendValidationError(res, error);
    }

    console.error('Register error', error);
    return res.status(500).json({ error: 'Unable to register user.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = authSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    res.cookie('token', signToken(user), getCookieOptions());

    return res.json({
      id: user.id,
      email: user.email,
      hasApiKey: Boolean(user.encryptedApiKey),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return sendValidationError(res, error);
    }

    console.error('Login error', error);
    return res.status(500).json({ error: 'Unable to log in.' });
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie('token', { ...getCookieOptions(), maxAge: 0 });
  return res.json({ message: 'Logged out successfully.' });
});

router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        encryptedApiKey: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.json({
      id: user.id,
      email: user.email,
      hasApiKey: Boolean(user.encryptedApiKey),
    });
  } catch (error) {
    console.error('Get current user error', error);
    return res.status(500).json({ error: 'Unable to fetch current user.' });
  }
});

export default router;
