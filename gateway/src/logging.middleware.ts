import { Request, Response, NextFunction } from 'express';
import logger from './logger.service.js';

/**
 * Middleware to log incoming HTTP requests using the centralized logger.
 * It captures the method, path, IP address, and User-Agent.
 */
export function loggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const { method, path, ip, headers } = req;
  const userAgent = headers['user-agent'] || 'No User-Agent';

  logger.info(`[Request] ${method} ${path} - IP: ${ip}`, { userAgent });

  // Pass control to the next middleware in the chain
  next();
}