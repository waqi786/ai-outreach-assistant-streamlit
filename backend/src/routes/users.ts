import { Router } from 'express';
import { ZodError, z } from 'zod';
import { sendValidationError } from '../lib/http';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { encryptApiKey } from '../services/encryption.service';
import type { AuthenticatedRequest } from '../types';

const router = Router();

const apiKeySchema = z.object({
  apiKey: z
    .string()
    .trim()
    .min(20)
    .max(300)
    .regex(/^[\x20-\x7E]*$/, 'API key contains unsupported non-ASCII characters. Please paste the exact Anthropic key again.'),
});

router.post('/api-key', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { apiKey } = apiKeySchema.parse(req.body);

    await prisma.user.update({
      where: { id: req.userId },
      data: { encryptedApiKey: encryptApiKey(apiKey) },
    });

    return res.json({ message: 'API key saved successfully.', hasApiKey: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return sendValidationError(res, error);
    }

    console.error('Save API key error', error);
    return res.status(500).json({ error: 'Unable to save API key.' });
  }
});

router.delete('/api-key', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    await prisma.user.update({
      where: { id: req.userId },
      data: { encryptedApiKey: null },
    });

    return res.json({ message: 'API key deleted successfully.', hasApiKey: false });
  } catch (error) {
    console.error('Delete API key error', error);
    return res.status(500).js