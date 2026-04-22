import { describe, it, expect, beforeEach } from 'vitest';
import { MockStorage } from '../../../server/mock-storage';
import { insertUserSchema } from '../../../shared/schema';

describe('Storage: User CRUD (MockStorage)', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  it('should create and retrieve a user by ID', async () => {
    const userData = {
      username: 'testuser',
      password: 'password123',
      name: 'Test User',
      email: 'test@example.com',
      role: 'doctor'
    };
    const user = await storage.createUser(userData);
    expect(user).toHaveProperty('id');
    expect(user.username).toBe('testuser');

    const fetchedUser = await storage.getUser(user.id);
    expect(fetchedUser).toEqual(user);
  });

  it('should retrieve a user by username', async () => {
    const userData = {
      username: 'findme',
      password: 'password',
      name: 'Find Me',
      email: 'find@example.com',
      role: 'admin'
    };
    await storage.createUser(userData);
    
    const user = await storage.getUserByUsername('findme');
    expect(user).toBeDefined();
    expect(user?.username).toBe('findme');
  });

  it('should retrieve a user by email', async () => {
    const email = 'email@example.com';
    await storage.createUser({
      username: 'emailuser',
      password: 'password',
      name: 'Email User',
      email,
      role: 'patient'
    });
    
    const user = await storage.getUserByEmail(email);
    expect(user).toBeDefined();
    expect(user?.email).toBe(email);
  });

  it('should return undefined for non-existent user', async () => {
    const user = await storage.getUser(999);
    expect(user).toBeUndefined();
  });

  it('should list all users', async () => {
    await storage.createUser({ username: 'u1', password: 'p', name: 'N1', email: 'e1@e.com', role: 'doctor' });
    await storage.createUser({ username: 'u2', password: 'p', name: 'N2', email: 'e2@e.com', role: 'patient' });
    
    const users = await storage.getUsers();
    // MockStorage might have seeded users, so we check for at least 2
    expect(users.length).toBeGreaterThanOrEqual(2);
    expect(users.some(u => u.username === 'u1')).toBe(true);
  });

  it('should update a user', async () => {
    const user = await storage.createUser({ username: 'updateme', password: 'p', name: 'Old Name', email: 'o@e.com', role: 'doctor' });
    
    const updatedUser = await storage.updateUser(user.id, { name: 'New Name' });
    expect(updatedUser?.name).toBe('New Name');
    
    const fetched = await storage.getUser(user.id);
    expect(fetched?.name).toBe('New Name');
  });

  it('should delete a user', async () => {
    const user = await storage.createUser({ username: 'deleteme', password: 'p', name: 'N', email: 'd@e.com', role: 'doctor' });
    
    const deleted = await storage.deleteUser(user.id);
    expect(deleted).toBe(true);
    
    const fetched = await storage.getUser(user.id);
    expect(fetched).toBeUndefined();
  });
});
