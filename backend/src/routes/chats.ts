import { Router } from 'express';
import { ZodError, z } from 'zod';
import { sendValidationError } from '../lib/http';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/auth';
import { ClaudeService } from '../services/claude.service';
import { decryptApiKey } from '../services/encryption.service';
import type { AuthenticatedRequest, ClaudeMessage } from '../types';

const router = Router();

const createChatSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
});

const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(10000),
});

const idSchema = z.object({
  id: z.string().uuid(),
});

const projectIdSchema = z.object({
  projectId: z.string().uuid(),
});

router.get('/project/:projectId', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { projectId } = projectIdSchema.parse(req.params);

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.userId },
      select: { id: true },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const chats = await prisma.chat.findMany({
      where: { projectId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    return res.json(chats);
  } catch (error) {
    if (error instanceof ZodError) {
      return sendValidationError(res, error);
    }

    console.error('List chats error', error);
    return res.status(500).json({ error: 'Unable to fetch chats.' });
  }
});

router.post('/project/:projectId', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { projectId } = projectIdSchema.parse(req.params);
    const body = createChatSchema.parse(req.body ?? {});

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.userId },
      select: { id: true },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found.' });
    }

    const chat = await prisma.chat.create({
      data: {
        projectId,
        title: body.title || 'New Chat',
      },
    });

    return res.status(201).json(chat);
  } catch (error) {
    if (error instanceof ZodError) {
      return sendValidationError(res, error);
    }

    console.error('Create chat error', error);
    return res.status(500).json({ error: 'Unable to create chat.' });
  }
});

router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = idSchema.parse(req.params);

    const chat = await prisma.chat.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            systemPrompt: true,
            userId: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!chat || chat.project.userId !== req.userId) {
      return res.status(404).json({ error: 'Chat not found.' });
    }

    return res.json(chat);
  } catch (error) {
    if (error instanceof ZodError) {
      return sendValidationError(res, error);
    }

    console.error('Get chat error', error);
    return res.status(500).json({ error: 'Unable to fetch chat.' });
  }
});

router.post('/:id/messages', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { id } = idSchema.parse(req.params);
    const { content } = sendMessageSchema.parse(req.body);

    const chat = await prisma.chat.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            userId: true,
            systemPrompt: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!chat || chat.project.userId !== req.userId) {
      return res.status(404).json({ error: 'Chat not found.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { encryptedApiKey: true },
    });

    if (!user?.encryptedApiKey) {
      return res.status(400).json({ error: 'Please save your Anthropic API key in settings first.' });
    }

    const userMessage = await prisma.message.create({
      data: {
        chatId: chat.id,
        role: 'user',
        content,
      },
    });

    const history: ClaudeMessage[] = chat.messages
      .slice()
      .reverse()
      .map((message: { role: string; content: string }) => ({
        role: message.role as 'user' | 'assistant',
        content: message.content,
      }));

    const apiKey = decryptApiKey(user.encryptedApiKey);
    const claudeService = new ClaudeService(apiKey);

    let assistantText = '';
    try {
      assistantText = await claudeService.generateResponse({
        systemPrompt: chat.project.systemPrompt,
        history,
        userInput: content,
      });
    } catch (claudeError) {
      console.error('Claude request error', claudeError);
      
      // Check if it's an authentication error specifically
      if (typeof claudeError === 'object' && claudeError !== null && 'status' in claudeError && claudeError.status === 401) {
        return res.status(401).json({ error: 'The API key is invalid. Please update it in User Settings.' });
      }

      return res.status(502).json({ error: 'Claude request failed. Please check your API key and model access.' });
    }

    const assistantMessage = await prisma.message.create({
      data: {
        chatId: chat.id,
        role: 'assistant',
        content: assistantText,
      },
    });

    const nextTitle =
      chat.messages.length === 0
        ? content.slice(0, 50).trim() + (content.length > 50 ? '...' : '')
        : chat.title;

    await prisma.chat.update({
      where: { id: chat.id },
      data: {
        title: nextTitle || 'New Chat',
        updatedAt: new Date(),
      },
    });

    return res.json({
      userMessage,
      assistantMessage,
    });
  } catch (error) {
    if (error instan