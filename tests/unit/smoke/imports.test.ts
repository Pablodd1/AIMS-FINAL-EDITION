import { describe, it, expect } from 'vitest';
import * as schema from '../../../shared/schema';
import { MockStorage } from '../../../server/mock-storage';
import * as errorHandler from '../../../server/error-handler';
import * as logger from '../../../server/logger';
import { CONFIG } from '../../../server/config';
import { SYSTEM_PROMPTS } from '../../../server/prompts';

describe('Smoke Test: Imports and Initialization', () => {
  it('should successfully import shared schema and schemas should be valid', () => {
    expect(schema).toBeDefined();
    expect(schema.insertPatientSchema).toBeDefined();
    expect(schema.insertUserSchema).toBeDefined();
    expect(schema.userRoleEnum).toBeDefined();
  });

  it('should successfully instantiate MockStorage', () => {
    const storage = new MockStorage();
    expect(storage).toBeDefined();
    expect(storage.createUser).toBeInstanceOf(Function);
  });

  it('should successfully import server utilities', () => {
    expect(errorHandler).toBeDefined();
    expect(logger).toBeDefined();
    expect(CONFIG).toBeDefined();
    expect(SYSTEM_PROMPTS).toBeDefined();
  });

  it('should have valid system prompts', () => {
    expect(SYSTEM_PROMPTS.SOAP_NOTE).toBeTypeOf('string');
    expect(SYSTEM_PROMPTS.SOAP_NOTE.length).toBeGreaterThan(500);
    expect(SYSTEM_PROMPTS.LAB_INTERPRETER).toBeTypeOf('string');
    expect(SYSTEM_PROMPTS.INTAKE_SUMMARY).toBeTypeOf('string');
  });
});
