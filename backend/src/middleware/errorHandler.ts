/**
 * Centralized Error Handler Middleware — Issue #127
 *
 * This is the single Express error-handling middleware for the entire app.
 * Register it LAST, after all routes, in index.ts.
 *
 * Response contract (always):
 * {
 *   "success": false,
 *   "error": {
 *     "code":      string,   // machine-readable error code
 *     "message":   string,   // human-friendly message
 *     "details":   any,      // field-level validation errors (optional)
 *     "requestId": string    // from x-request-id header or auto-generated UUID
 *   }
 * }
 *
 * Stack traces are only included when NODE_ENV === 'development'.
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { AppError, InternalError } from '../utils/errors';
import logger from '../utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ErrorResponseBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId: string;
    stack?: string;
  };
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Extract or generate a stable request-id for correlation.
 * The requestLogger middleware already sets res.getHeader('x-request-id'),
 * so we prefer that. Fall back to the raw incoming header, then generate one.
 */
function resolveRequestId(req: Request, res: Response): string {
  const fromResponse = res.getHeader('x-request-id');
  if (fromResponse && typeof fromResponse === 'string') return fromResponse;

  const fromRequest = req.headers['x-request-id'];
  if (fromRequest) return Array.isArray(fromRequest) ? fromRequest[0] : fromRequest;

  return randomUUID();
}

/**
 * Normalise any thrown value into an AppError so the rest of the handler
 * is always dealing with a known shape.
 */
function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  // Preserve the original message in development but mask it in production
  const isDev = process.env.NODE_ENV === 'development';
  const message = isDev && err instanceof Error ? err.message : 'Internal server error';

  const appError = new InternalError(message);

  // Carry over the original stack so we can log it properly
  if (err instanceof Error && err.stack) {
    appError.stack = err.stack;
  }

  return appError;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const appError = toAppError(err);
  const requestId = resolveRequestId(req, res);
  const isDev = process.env.NODE_ENV === 'development';

  // ── Logging ────────────────────────────────────────────────────────────────
  if (appError.statusCode >= 500 || !appError.isOperational) {
    // Unexpected / programmer errors — high severity
    logger.error('Unhandled application error', {
      requestId,
      statusCode: appError.statusCode,
      errorCode: appError.errorCode,
      method: req.method,
      path: req.originalUrl,
      error: appError,
    });
  } else if (appError.statusCode >= 400) {
    // Expected operational errors — low severity
    logger.warn('Operational error', {
      requestId,
      statusCode: appError.statusCode,
      errorCode: appError.errorCode,
      message: appError.message,
      method: req.method,
      path: req.originalUrl,
    });
  }

  // ── Response ───────────────────────────────────────────────────────────────
  const body: ErrorResponseBody = {
    success: false,
    error: {
      code: appError.errorCode,
      message: appError.isOperational
        ? appError.message
        : 'An unexpected error occurred. Please try again later.',
      requestId,
      ...(appError.details !== undefined && { details: appError.details }),
      ...(isDev && { stack: appError.stack }),
    },
  };

  // Guard against writing headers after the response has already been sent
  if (res.headersSent) {
    return;
  }

  res.status(appError.statusCode).json(body);
};

// ─── Async wrapper utility ───────────────────────────────────────────────────

/**
 * Wraps an async Express route handler so that any rejection is automatically
 * forwarded to next(err), routing it into the centralised errorHandler.
 *
 * Usage:
 *   router.get('/path', catchAsync(async (req, res) => { ... }));
 */
export const catchAsync = <
  T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
>(
  fn: T,
): ((req: Request, res: Response, next: NextFunction) => void) =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

export default errorHandler;
