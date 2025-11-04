import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

/**
 * Validation schema for a new message.
 * Defines the exact structure the request body must have.
 */
export const newMessageSchema = z.object({
  paymentHash: z.string().min(1, { message: 'paymentHash is required' }),
  sender: z.string().min(1, { message: 'sender is required' }),
  recipient: z.string().min(1, { message: 'recipient is required' }),
  timestamp: z.string().datetime({ message: 'Invalid ISO 8601 timestamp' }),
  content: z.string(),
  attachments: z.array(z.unknown()).optional(),
});

export const validateNewMessage = (req: Request, res: Response, next: NextFunction) => {
  try {
    newMessageSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Invalid request body', details: error.errors });
    }
    next(error);
  }
};