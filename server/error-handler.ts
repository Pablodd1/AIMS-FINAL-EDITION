import { Request, Response, NextFunction } from 'express';
import { getAuthenticatedUserFromRequest } from './auth-utils';

// Demo mode - suppress logging for cleaner output
const DEMO_MODE = process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'demo';

export interface ErrorResponse {
  success: false;
  error: string;
  details?: string;
  code?: string;
  statusCode?: number;
  timestamp?: string;
}

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  timestamp: string;
}

export class AppError extends Error {
  public statusCode: number;
  public code?: string;
  public details?: string;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function sendErrorResponse(
  res: Response,
  error: string,
  statusCode: number = 500,
  details?: string,
  code?: string
): void {
  const errorResponse: ErrorResponse = {
    success: false,
    error,
    details,
    code,
    statusCode,
    timestamp: new Date().toISOString()
  };
  if (!DEMO_MODE) {
    console.error(`[${statusCode}] ${error}`, details ? { details } : '');
  }
  res.status(statusCode).json(errorResponse);
}

export function sendSuccessResponse<T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): void {
  const successResponse: SuccessResponse<T> = {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  };
  res.status(statusCode).json(successResponse);
}

// Authentication middleware — supports both JWT Bearer tokens and session auth
// Uses getAuthenticatedUserFromRequest from auth-utils.ts (no circular deps)
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  getAuthenticatedUserFromRequest(req).then((user) => {
    if (!user) {
      return sendErrorResponse(
        res,
        'Authentication required',
        401,
        'Please log in to access this resource',
        'AUTH_REQUIRED'
      );
    }
    (req as any).user = user;
    next();
  }).catch((err) => {
    if (!DEMO_MODE) {
      console.error('Auth error:', err);
    }
    sendErrorResponse(res, 'Authentication error', 401, 'Authentication failed', 'AUTH_ERROR');
  });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  getAuthenticatedUserFromRequest(req).then((user) => {
    if (!user) {
      return sendErrorResponse(
        res,
        'Authentication required',
        401,
        'Please log in to access this resource',
        'AUTH_REQUIRED'
      );
    }
    if (!['admin', 'administrator'].includes(user.role)) {
      return sendErrorResponse(
        res,
        'Admin privileges required',
        403,
        'You do not have permission to access this resource',
        'INSUFFICIENT_PRIVILEGES'
      );
    }
    (req as any).user = user;
    next();
  }).catch((err) => {
    if (!DEMO_MODE) {
      console.error('Auth error:', err);
    }
    sendErrorResponse(res, 'Authentication error', 401, 'Authentication failed', 'AUTH_ERROR');
  });
}

export function requireDoctor(req: Request, res: Response, next: NextFunction): void {
  getAuthenticatedUserFromRequest(req).then((user) => {
    if (!user) {
      return sendErrorResponse(
        res,
        'Authentication required',
        401,
        'Please log in to access this resource',
        'AUTH_REQUIRED'
      );
    }
    if (!['doctor', 'admin', 'administrator'].includes(user.role)) {
      return sendErrorResponse(
        res,
        'Doctor privileges required',
        403,
        'You do not have permission to access this resource',
        'INSUFFICIENT_PRIVILEGES'
      );
    }
    (req as any).user = user;
    next();
  }).catch((err) => {
    if (!DEMO_MODE) {
      console.error('Auth error:', err);
    }
    sendErrorResponse(res, 'Authentication error', 401, 'Authentication failed', 'AUTH_ERROR');
  });
}

export function globalErrorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) {
    return next(err);
  }
  if (err instanceof AppError && err.isOperational) {
    return sendErrorResponse(res, err.message, err.statusCode, err.details, err.code);
  }
  if (err.name === 'ValidationError') {
    return sendErrorResponse(res, 'Validation failed', 400, err.message, 'VALIDATION_ERROR');
  }
  if (err.message?.includes('violates unique constraint')) {
    return sendErrorResponse(res, 'Resource already exists', 409, 'A record with this information already exists', 'DUPLICATE_RESOURCE');
  }
  if (err.message?.includes('foreign key constraint')) {
    return sendErrorResponse(res, 'Invalid reference', 400, 'Referenced resource does not exist', 'INVALID_REFERENCE');
  }
  if (err.message?.includes('API key') || err.message?.includes('Unauthorized')) {
    return sendErrorResponse(res, 'API configuration error', 503, 'Service temporarily unavailable due to configuration issues', 'API_KEY_ERROR');
  }
  if (!DEMO_MODE) {
    console.error('Unexpected error:', err);
  }
  sendErrorResponse(
    res,
    'Internal server error',
    500,
    process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    'INTERNAL_ERROR'
  );
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function validateRequestBody(schema: any, data: any): { success: boolean; error?: string; data?: any } {
  try {
    const result = schema.safeParse(data);
    if (!result.success) {
      const errorMessage = result.error.errors.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ');
      return { success: false, error: `Validation failed: ${errorMessage}` };
    }
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: 'Invalid request data format' };
  }
}

export async function handleDatabaseOperation<T>(
  operation: () => Promise<T>,
  errorMessage: string = 'Database operation failed'
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!DEMO_MODE) {
      console.error(`Database error: ${errorMessage}`, error);
    }
    throw new AppError(
      errorMessage,
      500,
      'DATABASE_ERROR',
      error instanceof Error ? error.message : 'Unknown database error'
    );
  }
}

export function handleOpenAIError(error: any): AppError {
  if (error?.status === 401) {
    return new AppError('Invalid API key configuration', 503, 'OPENAI_AUTH_ERROR', 'Please check your OpenAI API key in settings');
  }
  if (error?.status === 429) {
    return new AppError('API rate limit exceeded', 429, 'OPENAI_RATE_LIMIT', 'Please try again later or check your OpenAI usage limits');
  }
  if (error?.status === 403) {
    return new AppError('API access forbidden', 503, 'OPENAI_ACCESS_ERROR', 'Your API key does not have access to this service');
  }
  return new AppError('AI service temporarily unavailable', 503, 'OPENAI_SERVICE_ERROR', error?.message || 'Please try again later');
}
