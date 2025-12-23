import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from './logger.service.js';
import { AppError } from './error.classes.js';

// Estendendo a interface Request do Express para incluir a propriedade 'user'
declare global {
  namespace Express {
    interface Request {
      user?: { address: string };
    }
  }
}

export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1]; // Formato "Bearer TOKEN"

    jwt.verify(token, process.env.JWT_SECRET as string, (err: any, user: any) => {
      if (err) {
        logger.warn('[AuthMiddleware] Invalid or expired token received.');
        return next(new AppError('Invalid or expired token.', 403)); // Forbidden
      }
      req.user = user;
      next();
    });
  } else {
    next(new AppError('Authorization header is missing.', 401)); // Unauthorized
  }
}