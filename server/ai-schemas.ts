import { z } from 'zod';

/**
 * Schema for generative SOAP notes (ai.ts)
 */
export const SoapResponseSchema = z.object({
  human_note: z.string().optional().default(''),
  ehr_payload: z.any().optional().default({})
});

export type SoapResponse = z.infer<typeof SoapResponseSchema>;

/**
 * Schema for extracted intake answers (ai.ts)
 */
export const IntakeAnswersSchema = z.object({
  answers: z.record(z.any()).optional().default({}),
  summary: z.string().optional().default('')
});

export type IntakeAnswers = z.infer<typeof IntakeAnswersSchema>;

/**
 * Schema for lab report analysis (lab-interpreter.ts)
 */
export const LabAnalysisSchema = z.object({
  summary: z.string().optional().default(''),
  abnormalValues: z.array(z.string()).optional().default([]),
  interpretation: z.string().optional().default(''),
  diagnoses: z.array(z.object({
    code: z.string(),
    description: z.string()
  })).optional().default([]),
  cptCodes: z.array(z.object({
    code: z.string(),
    description: z.string()
  })).optional().default([]),
  recommendations: z.array(z.object({
    product: z.string(),
    dosage: z.string(),
    reason: z.string()
  })).optional().default([]),
  additionalTesting: z.array(z.string()).optional().default([]),
  knowledgeBaseUsed: z.number().optional().default(0),
  complianceNote: z.string().optional().default(''),
  dataQuality: z.string().optional().default('Not assessed')
});

export type LabAnalysis = z.infer<typeof LabAnalysisSchema>;
