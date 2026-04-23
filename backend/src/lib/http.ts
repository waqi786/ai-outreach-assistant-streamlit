import type { Response } from 'express';
import { ZodError } from 'zod';

export function sendValidationError(res: Response, error: ZodError) {
  return res.status(400).json({
    error: 'Validation failed.',
    details: error.flatten(),
  });
}

export function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  const sameSite: 'lax' | 'none' = isProduction ? 'none' : 'lax';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  };
}
