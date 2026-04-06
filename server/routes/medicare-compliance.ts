import { Router, Request, Response } from 'express';
import { log, logError } from '../logger';
import { storage } from '../storage';

export const medicareComplianceRouter = Router();

// POST /api/medicare/audit-log - Log compliance-related events
medicareComplianceRouter.post('/audit-log', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { 
      noteId, 
      eventType, 
      eventData,
      providerName,
      patientId 
    } = req.body;

    const userId = req.user!.id;

    // Log the compliance event
    const auditEntry = {
      timestamp: new Date().toISOString(),
      userId,
      providerName: providerName || req.user!.name || req.user!.email,
      patientId,
      noteId,
      eventType, // 'NOTE_CREATED', 'NOTE_SIGNED', 'CODE_ADDED', 'CODE_MODIFIED', 'SIGNATURE_CAPTURED'
      eventData,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    };

    // Store audit log (you might want to create a separate audit_logs table)
    log('Medicare Compliance Audit', auditEntry);

    // For now, we'll log to console/file. In production, store in database
    res.json({ success: true, auditId: Date.now() });
  } catch (error) {
    logError('Error logging audit event:', error);
    res.status(500).json({ error: 'Failed to log audit event' });
  }
});

// GET /api/medicare/compliance-check/:noteId - Check compliance status
medicareComplianceRouter.get('/compliance-check/:noteId', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const noteId = parseInt(req.params.noteId);
    
    // Get the note
    const note = await storage.getMedicalNote(noteId);
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    // Get associated codes
    const coding = await storage.getMedicalNoteCoding(noteId);
    const cptCodes = coding.filter(c => c.cptCodeId);
    const icd10Codes = coding.filter(c => c.icd10CodeId);

    // Medicare compliance checks
    const compliance = {
      hasTranscript: !!note.transcript && note.transcript.length > 10,
      hasNoteContent: !!note.content && note.content.length > 50,
      hasSignature: !!note.signature,
      hasCptCodes: cptCodes.length > 0,
      hasIcd10Codes: icd10Codes.length > 0,
      hasLinkedDx: cptCodes.every(c => c.icd10CodeId), // Every CPT has a linked DX
      hasProviderName: !!note.providerName,
      hasDate: !!note.createdAt,
      meetsEmLevel: true, // Would need E/M calculation logic
      
      // Overall compliance
      isCompliant: false,
      missingRequirements: [] as string[]
    };

    // Check overall compliance
    const required = [
      { check: compliance.hasTranscript, name: 'Transcript/Documentation' },
      { check: compliance.hasNoteContent, name: 'SOAP Note Content' },
      { check: compliance.hasSignature, name: 'Provider Signature' },
      { check: compliance.hasCptCodes, name: 'CPT Codes' },
      { check: compliance.hasIcd10Codes, name: 'ICD-10 Codes' },
      { check: compliance.hasProviderName, name: 'Provider Name' }
    ];

    compliance.missingRequirements = required
      .filter(r => !r.check)
      .map(r => r.name);
    
    compliance.isCompliant = compliance.missingRequirements.length === 0;

    res.json(compliance);
  } catch (error) {
    logError('Error checking compliance:', error);
    res.status(500).json({ error: 'Failed to check compliance' });
  }
});

// POST /api/medicare/validate-codes - Validate coding for Medicare
medicareComplianceRouter.post('/validate-codes', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { cptCodes, icd10Codes } = req.body;
    
    const validation = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[]
    };

    // Validate CPT codes
    if (!cptCodes || cptCodes.length === 0) {
      validation.errors.push('At least one CPT code is required for billing');
      validation.valid = false;
    } else {
      // Check for E/M codes (99201-99499)
      const emCodes = cptCodes.filter((c: any) => {
        const code = c.code || c;
        const num = parseInt(code);
        return num >= 99201 && num <= 99499;
      });
      
      if (emCodes.length === 0) {
        validation.warnings.push('No E/M code found. Most visits require an E/M code.');
      }

      // Check for modifiers on certain codes
      cptCodes.forEach((cpt: any) => {
        const code = cpt.code || cpt;
        const modifier = cpt.modifier;
        
        // Common modifier requirements
        if (code.startsWith('992') && !modifier) {
          // Some E/M codes might need modifier 25 if procedure also billed
        }
      });
    }

    // Validate ICD-10 codes
    if (!icd10Codes || icd10Codes.length === 0) {
      validation.errors.push('At least one ICD-10 diagnosis code is required');
      validation.valid = false;
    } else {
      // Check for unspecified codes (generally not preferred)
      icd10Codes.forEach((dx: any) => {
        const code = dx.code || dx;
        if (code.endsWith('9') || code.includes('.9')) {
          validation.warnings.push(`Code ${code} appears to be unspecified. Consider using a more specific code.`);
        }
      });

      // Should have a primary diagnosis
      const hasPrimary = icd10Codes.some((dx: any) => 
        dx.type === 'primary' || dx.isPrimary
      );
      
      if (!hasPrimary && icd10Codes.length > 0) {
        validation.warnings.push('Consider marking one diagnosis as primary');
      }
    }

    // Validate code linkage
    if (cptCodes && icd10Codes) {
      // Every procedure should have at least one diagnosis
      const unlinkedProcedures = cptCodes.filter((cpt: any) => 
        !cpt.linkedDx || cpt.linkedDx.length === 0
      );
      
      if (unlinkedProcedures.length > 0) {
        validation.warnings.push('Some procedures are not linked to diagnoses. Link CPT codes to ICD-10 codes for proper billing.');
      }
    }

    res.json(validation);
  } catch (error) {
    logError('Error validating codes:', error);
    res.status(500).json({ error: 'Failed to validate codes' });
  }
});

// GET /api/medicare/documentation-guidelines - Get Medicare documentation requirements
medicareComplianceRouter.get('/documentation-guidelines', (req: Request, res: Response) => {
  const guidelines = {
    emLevels: {
      '99211': { description: 'Level 1 - Minimal', requirements: ['Office/clinical staff only'] },
      '99212': { description: 'Level 2 - Straightforward', requirements: ['Problem focused history', 'Problem focused exam', 'Straightforward MDM'] },
      '99213': { description: 'Level 3 - Low Complexity', requirements: ['Expanded problem focused history', 'Expanded problem focused exam', 'Low complexity MDM'] },
      '99214': { description: 'Level 4 - Moderate Complexity', requirements: ['Detailed history', 'Detailed exam', 'Moderate complexity MDM'] },
      '99215': { description: 'Level 5 - High Complexity', requirements: ['Comprehensive history', 'Comprehensive exam', 'High complexity MDM'] }
    },
    requirements: {
      history: ['Chief complaint', 'History of present illness', 'Review of systems', 'Past/family/social history'],
      exam: ['1995 or 1997 guidelines', 'Document abnormal findings', 'Note negative pertinent findings'],
      mdm: ['Number of diagnoses/management options', 'Amount/complexity of data', 'Risk of complications']
    },
    reminders: [
      'Always document medical necessity',
      'Link ICD-10 codes to CPT codes',
      'Sign and date all notes',
      'Use specific rather than unspecified codes',
      'Document time if counseling dominates (>50%)'
    ]
  };

  res.json(guidelines);
});

export default medicareComplianceRouter;
