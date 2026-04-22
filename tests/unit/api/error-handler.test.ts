import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  AppError, 
  sendErrorResponse, 
  sendSuccessResponse, 
  validateRequestBody 
} from '../../../server/error-handler';
import { z } from 'zod';

describe('API: Error Handler Utilities', () => {
  let res: any;

  beforeEach(() => {
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
  });

  it('AppError should create correct error object', () => {
    const error = new AppError('Test error', 400, 'TEST_CODE', { detail: 'more info' });
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('TEST_CODE');
    expect(error.details).toEqual({ detail: 'more info' });
    expect(error.isOperational).toBe(true);
  });

  it('sendErrorResponse should format error correctly', () => {
    sendErrorResponse(res, 'Error message', 404, 'Detail info', 'NOT_FOUND');
    
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: 'Error message',
      details: 'Detail info',
      code: 'NOT_FOUND',
      timestamp: expect.any(String)
    }));
  });

  it('sendSuccessResponse should format success correctly', () => {
    sendSuccessResponse(res, { id: 1 }, 'Created', 201);
    
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: { id: 1 },
      message: 'Created',
      timestamp: expect.any(String)
    }));
  });

  it('validateRequestBody should return data on success', () => {
    const schema = z.object({ name: z.string() });
    const result = validateRequestBody(schema, { name: 'John' });
    
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: 'John' });
  });

  it('validateRequestBody should return error on failure', () => {
    const schema = z.object({ name: z.string() });
    const result = validateRequestBody(schema, { age: 30 });
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
