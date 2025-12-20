/**
 * @file error.classes.ts
 * @description Defines custom error classes for the application.
 */

/**
 * Base class for application-specific errors.
 * Allows us to attach a status code to an error.
 */
export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
  }
}