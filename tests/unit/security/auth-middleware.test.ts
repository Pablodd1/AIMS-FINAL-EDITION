import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth, requireAdmin, requireDoctor } from '../../../server/error-handler';
import * as authUtils from '../../../server/auth-utils';

describe('Security: Authorization Middleware', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    req = {
      headers: {},
      isAuthenticated: vi.fn().mockReturnValue(false),
      user: null
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    next = vi.fn();
  });

  it('requireAuth should reject unauthenticated requests', async () => {
    vi.spyOn(authUtils, 'getAuthenticatedUserFromRequest').mockResolvedValue(null);
    
    await requireAuth(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'AUTH_REQUIRED'
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('requireAuth should pass authenticated requests', async () => {
    const mockUser = { id: 1, username: 'testuser', role: 'doctor' };
    vi.spyOn(authUtils, 'getAuthenticatedUserFromRequest').mockResolvedValue(mockUser);
    
    await requireAuth(req, res, next);
    
    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalled();
  });

  it('requireAdmin should reject non-admin roles', async () => {
    const mockUser = { id: 1, username: 'doctor', role: 'doctor' };
    vi.spyOn(authUtils, 'getAuthenticatedUserFromRequest').mockResolvedValue(mockUser);
    
    await requireAdmin(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'INSUFFICIENT_PRIVILEGES'
    }));
  });

  it('requireAdmin should accept admin and administrator roles', async () => {
    const adminUser = { id: 1, username: 'admin', role: 'admin' };
    vi.spyOn(authUtils, 'getAuthenticatedUserFromRequest').mockResolvedValue(adminUser);
    
    await requireAdmin(req, res, next);
    expect(next).toHaveBeenCalled();

    next.mockClear();
    
    const administratorUser = { id: 2, username: 'superadmin', role: 'administrator' };
    vi.spyOn(authUtils, 'getAuthenticatedUserFromRequest').mockResolvedValue(administratorUser);
    
    await requireAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('requireDoctor should reject patient role', async () => {
    const patientUser = { id: 1, username: 'patient', role: 'patient' };
    vi.spyOn(authUtils, 'getAuthenticatedUserFromRequest').mockResolvedValue(patientUser);
    
    await requireDoctor(req, res, next);
    
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
