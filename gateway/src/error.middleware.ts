import { Request, Response, NextFunction } from 'express';
import logger from './logger.service.js';

/**
 * Interface for a structured API error.
 */
interface ApiError extends Error {
  statusCode: number;
}

/**
 * Centralized error handling middleware.
 * This should be the last middleware added to the Express app.
 */
export function errorMiddleware(
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Something went wrong';

  logger.error(`[${req.method}] ${req.path} >> StatusCode: ${statusCode}, Message: ${message}`, { stack: error.stack });

  res.status(statusCode).json({ error: message });
}