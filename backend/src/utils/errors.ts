/**
 * Centralized Error Classes — Issue #127
 *
 * All application errors extend AppError, which carries:
 *  - statusCode  : HTTP status to be sent to the client
 *  - errorCode   : machine-readable string used in API responses
 *  - isOperational: true for expected/anticipated errors (4xx, known 5xx)
 *                   false for programmer/unexpected errors
 *  - details     : optional field-level validation data (ValidationError only)
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number,
    errorCode: string,
    isOperational = true,
    details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;
    this.details = details;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);

    // Capture a clean stack trace (omits this constructor frame)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// ─── 404 ──────────────────────────────────────────────────────────────────────

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

// ─── 400 ──────────────────────────────────────────────────────────────────────

/**
 * ValidationError accepts an optional `details` payload to carry
 * field-level errors (e.g. Joi / express-validator output).
 *
 * @example
 *   throw new ValidationError('Validation failed', [
 *     { field: 'email', message: '"email" must be a valid email' }
 *   ]);
 */
export class ValidationError extends AppError {
  constructor(
    message = 'Validation failed',
    details?: Record<string, unknown> | unknown[],
  ) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }
}

// ─── 401 ──────────────────────────────────────────────────────────────────────

export class AuthError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

// ─── 403 ──────────────────────────────────────────────────────────────────────

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden action') {
    super(message, 403, 'FORBIDDEN');
  }
}

// ─── 409 ──────────────────────────────────────────────────────────────────────

export class ConflictError extends AppError {
  constructor(message = 'Conflict detected') {
    super(message, 409, 'CONFLICT');
  }
}

// ─── 500 ──────────────────────────────────────────────────────────────────────

/**
 * InternalError represents unexpected server-side failures.
 * isOperational is false so the handler treats it as a critical error.
 */
export class InternalError extends AppError {
  constructor(message = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR', false);
  }
}
