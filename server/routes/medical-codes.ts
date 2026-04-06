import { Router, Request, Response } from 'express';
import { log, logError } from '../logger';
import { storage } from '../storage';

export const medicalCodesRouter = Router();

// GET /api/medical-codes/cpt - Get all CPT codes with optional search
medicalCodesRouter.get('/cpt', async (req, res) => {
  try {
    const { search, category } = req.query;
    const doctorId = req.user!.id;
    
    let codes = await storage.getCptCodes(doctorId);
    
    if (search) {
      const searchLower = String(search).toLowerCase();
      codes = codes.filter(code => 
        code.code.toLowerCase().includes(searchLower) ||
        code.description.toLowerCase().includes(searchLower)
      );
    }
    
    if (category) {
      codes = codes.filter(code => code.category === category);
    }
    
    return res.json(codes);
  } catch (error) {
    logError('Error fetching CPT codes:', error);
    return res.status(500).json({ error: 'Failed to fetch CPT codes' });
  }
});

// POST /api/medical-codes/cpt - Add new CPT code
medicalCodesRouter.post('/cpt', async (req, res) => {
  try {
    const doctorId = req.user!.id;
    const { code, description, category, modifier, rvu, isCustom } = req.body;
    
    if (!code || !description) {
      return res.status(400).json({ error: 'Code and description are required' });
    }
    
    // Check for duplicate
    const existing = await storage.getCptCodeByCode(code, doctorId);
    if (existing) {
      return res.status(409).json({ error: 'CPT code already exists' });
    }
    
    const cptCode = await storage.createCptCode({
      doctorId,
      code: code.toUpperCase(),
      description,
      category: category || 'General',
      modifier: modifier || null,
      rvu: rvu || null,
      isCustom: isCustom !== false // Default to true unless explicitly false
    });
    
    log(`CPT code added: ${code} by doctor ${doctorId}`);
    return res.status(201).json(cptCode);
  } catch (error) {
    logError('Error adding CPT code:', error);
    return res.status(500).json({ error: 'Failed to add CPT code' });
  }
});

// PUT /api/medical-codes/cpt/:id - Update CPT code
medicalCodesRouter.put('/cpt/:id', async (req, res) => {
  try {
    const doctorId = req.user!.id;
    const codeId = parseInt(req.params.id);
    const updates = req.body;
    
    // Verify ownership
    const existing = await storage.getCptCode(codeId);
    if (!existing) {
      return res.status(404).json({ error: 'CPT code not found' });
    }
    
    if (existing.doctorId !== doctorId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updated = await storage.updateCptCode(codeId, updates);
    return res.json(updated);
  } catch (error) {
    logError('Error updating CPT code:', error);
    return res.status(500).json({ error: 'Failed to update CPT code' });
  }
});

// DELETE /api/medical-codes/cpt/:id - Delete CPT code
medicalCodesRouter.delete('/cpt/:id', async (req, res) => {
  try {
    const doctorId = req.user!.id;
    const codeId = parseInt(req.params.id);
    
    // Verify ownership
    const existing = await storage.getCptCode(codeId);
    if (!existing) {
      return res.status(404).json({ error: 'CPT code not found' });
    }
    
    if (existing.doctorId !== doctorId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await storage.deleteCptCode(codeId);
    return res.json({ success: true });
  } catch (error) {
    logError('Error deleting CPT code:', error);
    return res.status(500).json({ error: 'Failed to delete CPT code' });
  }
});

// GET /api/medical-codes/icd10 - Get all ICD-10 codes with optional search
medicalCodesRouter.get('/icd10', async (req, res) => {
  try {
    const { search, category } = req.query;
    const doctorId = req.user!.id;
    
    let codes = await storage.getIcd10Codes(doctorId);
    
    if (search) {
      const searchLower = String(search).toLowerCase();
      codes = codes.filter(code => 
        code.code.toLowerCase().includes(searchLower) ||
        code.description.toLowerCase().includes(searchLower)
      );
    }
    
    if (category) {
      codes = codes.filter(code => code.category === category);
    }
    
    return res.json(codes);
  } catch (error) {
    logError('Error fetching ICD-10 codes:', error);
    return res.status(500).json({ error: 'Failed to fetch ICD-10 codes' });
  }
});

// POST /api/medical-codes/icd10 - Add new ICD-10 code
medicalCodesRouter.post('/icd10', async (req, res) => {
  try {
    const doctorId = req.user!.id;
    const { code, description, category, laterality, isCustom } = req.body;
    
    if (!code || !description) {
      return res.status(400).json({ error: 'Code and description are required' });
    }
    
    // Check for duplicate
    const existing = await storage.getIcd10CodeByCode(code, doctorId);
    if (existing) {
      return res.status(409).json({ error: 'ICD-10 code already exists' });
    }
    
    const icdCode = await storage.createIcd10Code({
      doctorId,
      code: code.toUpperCase(),
      description,
      category: category || 'General',
      laterality: laterality || null,
      isCustom: isCustom !== false
    });
    
    log(`ICD-10 code added: ${code} by doctor ${doctorId}`);
    return res.status(201).json(icdCode);
  } catch (error) {
    logError('Error adding ICD-10 code:', error);
    return res.status(500).json({ error: 'Failed to add ICD-10 code' });
  }
});

// PUT /api/medical-codes/icd10/:id - Update ICD-10 code
medicalCodesRouter.put('/icd10/:id', async (req, res) => {
  try {
    const doctorId = req.user!.id;
    const codeId = parseInt(req.params.id);
    const updates = req.body;
    
    // Verify ownership
    const existing = await storage.getIcd10Code(codeId);
    if (!existing) {
      return res.status(404).json({ error: 'ICD-10 code not found' });
    }
    
    if (existing.doctorId !== doctorId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updated = await storage.updateIcd10Code(codeId, updates);
    return res.json(updated);
  } catch (error) {
    logError('Error updating ICD-10 code:', error);
    return res.status(500).json({ error: 'Failed to update ICD-10 code' });
  }
});

// DELETE /api/medical-codes/icd10/:id - Delete ICD-10 code
medicalCodesRouter.delete('/icd10/:id', async (req, res) => {
  try {
    const doctorId = req.user!.id;
    const codeId = parseInt(req.params.id);
    
    // Verify ownership
    const existing = await storage.getIcd10Code(codeId);
    if (!existing) {
      return res.status(404).json({ error: 'ICD-10 code not found' });
    }
    
    if (existing.doctorId !== doctorId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await storage.deleteIcd10Code(codeId);
    return res.json({ success: true });
  } catch (error) {
    logError('Error deleting ICD-10 code:', error);
    return res.status(500).json({ error: 'Failed to delete ICD-10 code' });
  }
});

// POST /api/medical-codes/bulk-import - Bulk import codes
medicalCodesRouter.post('/bulk-import', async (req, res) => {
  try {
    const doctorId = req.user!.id;
    const { cptCodes, icd10Codes } = req.body;
    
    const results = {
      cptImported: 0,
      icd10Imported: 0,
      errors: [] as string[]
    };
    
    // Import CPT codes
    if (cptCodes && Array.isArray(cptCodes)) {
      for (const code of cptCodes) {
        try {
          const existing = await storage.getCptCodeByCode(code.code, doctorId);
          if (!existing) {
            await storage.createCptCode({
              doctorId,
              code: code.code.toUpperCase(),
              description: code.description,
              category: code.category || 'General',
              modifier: code.modifier || null,
              rvu: code.rvu || null,
              isCustom: true
            });
            results.cptImported++;
          }
        } catch (error) {
          results.errors.push(`CPT ${code.code}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
    
    // Import ICD-10 codes
    if (icd10Codes && Array.isArray(icd10Codes)) {
      for (const code of icd10Codes) {
        try {
          const existing = await storage.getIcd10CodeByCode(code.code, doctorId);
          if (!existing) {
            await storage.createIcd10Code({
              doctorId,
              code: code.code.toUpperCase(),
              description: code.description,
              category: code.category || 'General',
              laterality: code.laterality || null,
              isCustom: true
            });
            results.icd10Imported++;
          }
        } catch (error) {
          results.errors.push(`ICD-10 ${code.code}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
    
    return res.json({
      success: true,
      message: `Imported ${results.cptImported} CPT and ${results.icd10Imported} ICD-10 codes`,
      results
    });
  } catch (error) {
    logError('Error bulk importing codes:', error);
    return res.status(500).json({ error: 'Failed to import codes' });
  }
});

// GET /api/medical-codes/favorites - Get user's favorite codes
medicalCodesRouter.get('/favorites', async (req, res) => {
  try {
    const doctorId = req.user!.id;
    const favorites = await storage.getFavoriteCodes(doctorId);
    return res.json(favorites);
  } catch (error) {
    logError('Error fetching favorite codes:', error);
    return res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// POST /api/medical-codes/favorites - Add code to favorites
medicalCodesRouter.post('/favorites', async (req, res) => {
  try {
    const doctorId = req.user!.id;
    const { codeId, codeType } = req.body; // codeType: 'cpt' or 'icd10'
    
    if (!codeId || !codeType) {
      return res.status(400).json({ error: 'Code ID and type are required' });
    }
    
    const favorite = await storage.addFavoriteCode({
      doctorId,
      codeId,
      codeType
    });
    
    return res.status(201).json(favorite);
  } catch (error) {
    logError('Error adding favorite:', error);
    return res.status(500).json({ error: 'Failed to add favorite' });
  }
});

// DELETE /api/medical-codes/favorites/:id - Remove from favorites
medicalCodesRouter.delete('/favorites/:id', async (req, res) => {
  try {
    const doctorId = req.user!.id;
    const favoriteId = parseInt(req.params.id);
    
    await storage.removeFavoriteCode(favoriteId, doctorId);
    return res.json({ success: true });
  } catch (error) {
    logError('Error removing favorite:', error);
    return res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

export default medicalCodesRouter;
