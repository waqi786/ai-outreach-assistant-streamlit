import { Router } from 'express';
import { ZodError, z } from 'zod';
import { sendValidationError } from '../lib/http';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types';

const router = Router();

const projectBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  systemPrompt: z.string().trim().min(1).max(12000),
});

const projectIdSchema = z.object({
  id: z.string().uuid(),
});

router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        chats: {
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            title: true,
            updatedAt: true,
          },
        },
      },
    });

    return res.json(projects);
  } catch (error) {
    console.error('List projects error', error);
    return res.status(500).json({ error: 'Unable to fetch projects.' });
  }
});

router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = projectIdSchema.parse(req.params);

    const project = await prisma.project.findFirst({
      where: { id, userId: req.userId },
      include: {
        chats: {
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            title: true,
            updatedAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    return res.json(project);
  } catch (error) {
    if (error instanceof ZodError) {
      return sendValidationError(res, error);
    }

    console.error('Get project error', error);
    return res.status(500).json({ error: 'Unable to fetch project.' });
  }
});

router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const body = projectBodySchema.parse(req.body);

    const project = await prisma.project.create({
      data: {
        ...body,
        userId: req.userId as string,
      },
      include: {
        chats: true,
      },
    });

    return res.status(201).json(project);
  } catch (error) {
    if (error instanceof ZodError) {
      return sendValidationError(res, error);
    }

    console.error('Create project error', error);
    return res.status(500).json({ error: 'Unable to create project.' });
  }
});

router.put('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = projectIdSchema.parse(req.params);
    const body = projectBodySchema.parse(req.body);

    const existing = await prisma.project.findFirst({
      where: { id, userId: req.userId },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const project = await prisma.project.update({
      where: { id },
      data: body,
      include: {
        chats: {
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            title: true,
            updatedAt: true,
            createdAt: true,
          },
        },
      },
    });

    return res.json(project);
  } catch (error) {
    if (error instanceof ZodError) {
      return sendValidationError(res, error);
    }

    console.error('Update project error', error);
    return res.status(500).json({ error: 'Unable to update project.' });
  }
});

router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = projectIdSchema.parse(req.params);

    const existing = await prisma.project.findFirst({
      where: { id, userId: req.userId },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    await prisma.project.delete({ where: { id } });
    return res.json({ message: 'Project deleted successfully.' });
  } catch (error) {
    if (error instanceof ZodError) {
      return sendValidationError(res, error);
    }

    console.error('Delete project error', error);
    return res.status(500).json({ error: 'Unable to delete project.' });
  }
});

export default router;
