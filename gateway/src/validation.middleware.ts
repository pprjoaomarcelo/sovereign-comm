import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

/**
 * Validation schema for a new message.
 * Defines the exact structure the request body must have.
 */
export const newMessageSchema = z.object({
  payment_hash: z.string().min(1, { message: 'payment_hash is required' }),
  sender: z.string().min(1, { message: 'sender is required' }),
  recipient: z.string().min(1, { message: 'recipient is required' }),
  timestamp: z.string().datetime({ message: 'Invalid ISO 8601 timestamp' }),
  content: z.string(),
  attachments: z.array(z.unknown()).optional(), // Can be more specific if we know the structure
});

/**
 * Middleware that uses the schema to validate the request body.
 */
export const validateNewMessage = (req: Request, res: Response, next: NextFunction) => {
  try {
    newMessageSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      // Returns a 400 Bad Request error with validation details.
      return res.status(400).json({ error: 'Invalid request body', details: error.errors });
    }
    next(error);
  }
};