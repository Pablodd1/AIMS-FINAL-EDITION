import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';

const searchRouter = Router();

const searchSchema = z.object({
  query: z.string().min(1),
  type: z.enum(['patients', 'notes', 'all']).optional(),
  limit: z.number().min(1).max(50).optional(),
});

// Tokenize and normalize text for fuzzy matching
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

// Fuzzy match score (0-1)
function fuzzyScore(query: string, target: string): number {
  const queryTokens = tokenize(query);
  const targetTokens = tokenize(target);
  const targetText = target.toLowerCase();

  let score = 0;
  
  for (const token of queryTokens) {
    // Exact substring match
    if (targetText.includes(token)) {
      score += 0.4;
    }
    
    // Token partial match
    for (const targetToken of targetTokens) {
      if (targetToken.includes(token) || token.includes(targetToken)) {
        score += 0.3;
        break;
      }
    }
    
    // Edit distance check (simple)
    for (const targetToken of targetTokens) {
      const minLen = Math.min(token.length, targetToken.length);
      let matches = 0;
      for (let i = 0; i < minLen; i++) {
        if (token[i] === targetToken[i]) matches++;
      }
      if (matches / minLen > 0.6) score += 0.1;
    }
  }

  return Math.min(score / queryTokens.length, 1.0);
}

// Medical synonym mapping
const medicalSynonyms: Record<string, string[]> = {
  'heart': ['cardiac', 'cardiovascular', 'chest', 'angina'],
  'diabetes': ['diabetic', 'hyperglycemia', 'glucose', 'sugar'],
  'hypertension': ['high blood pressure', 'bp', 'blood pressure'],
  'asthma': ['wheezing', 'breathing', 'respiratory'],
  'pain': ['ache', 'discomfort', 'sore'],
  'headache': ['migraine', 'cephalgia'],
  'depression': ['mood', 'depressed', 'sad'],
  'anxiety': ['anxious', 'worry', 'panic'],
};

// Expand query with medical synonyms
function expandQueryWithSynonyms(query: string): string[] {
  const tokens = tokenize(query);
  const expanded = [...tokens];
  
  for (const token of tokens) {
    if (medicalSynonyms[token]) {
      expanded.push(...medicalSynonyms[token]);
    }
  }
  
  return [...new Set(expanded)];
}

// Main search endpoint
searchRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { query, type = 'all', limit = 10 } = searchSchema.parse({
      query: req.query.q,
      type: req.query.type,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
    });

    const doctorId = req.user?.id;
    if (!doctorId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const results: any[] = [];
    const expandedQuery = expandQueryWithSynonyms(query);

    // Search patients
    if (type === 'patients' || type === 'all') {
      const patients = await storage.getPatients(doctorId);
      const patientResults = patients
        .map(patient => {
          const searchText = `${patient.firstName} ${patient.lastName || ''} ${patient.email} ${patient.phone || ''}`;
          const score = fuzzyScore(expandedQuery.join(' '), searchText);
          return { patient, score, type: 'patient' };
        })
        .filter(r => r.score > 0.2)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      results.push(...patientResults);
    }

    // Search medical notes
    if (type === 'notes' || type === 'all') {
      const patients = await storage.getPatients(doctorId);
      const allNotes: any[] = [];

      for (const patient of patients) {
        const notes = await storage.getMedicalNotes(patient.id);
        notes.forEach(note => {
          const searchText = `${note.title} ${note.content} ${patient.firstName} ${patient.lastName || ''}`;
          const score = fuzzyScore(expandedQuery.join(' '), searchText);
          allNotes.push({
            note,
            patient,
            score,
            type: 'note'
          });
        });
      }

      const noteResults = allNotes
        .filter(r => r.score > 0.15)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      results.push(...noteResults);
    }

    // Sort all results by score
    results.sort((a, b) => b.score - a.score);

    res.json({
      query,
      expandedQuery,
      results: results.slice(0, limit),
      count: results.length,
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Semantic search endpoint (natural language)
searchRouter.post('/semantic', async (req: Request, res: Response) => {
  try {
    const { query, type = 'all' } = z.object({
      query: z.string().min(1),
      type: z.enum(['patients', 'notes', 'all']).optional(),
    }).parse(req.body);

    const doctorId = req.user?.id;
    if (!doctorId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Common medical entity patterns
    const patterns = {
      // Patient patterns
      patientName: /patient\s+(?:named?\s+)?(\w+)/i,
      emailPattern: /email\s+(?:is\s+)?([\w.-@]+)/i,
      
      // Condition patterns
      condition: /with\s+(\w+(?:\s+\w+){0,2})\s+condition/i,
      diagnosis: /diagnosed\s+(?:with\s+)?(\w+(?:\s+\w+){0,2})/i,
      
      // Visit patterns
      lastVisit: /last\s+visit/i,
      recentVisit: /recent\s+visit/i,
      
      // Medication patterns
      medication: /on\s+(\w+(?:\s+\w+){0,2})/i,
    };

    const results: any[] = [];

    // Extract intents from query
    if (patterns.patientName.test(query)) {
      const match = query.match(patterns.patientName);
      if (match) {
        const patients = await storage.getPatients(doctorId);
        const patientResults = patients
          .filter(p => 
            p.firstName.toLowerCase().includes(match[1].toLowerCase()) ||
            (p.lastName || '').toLowerCase().includes(match[1].toLowerCase())
          )
          .map(p => ({ patient: p, score: 0.9, type: 'patient' }));
        results.push(...patientResults);
      }
    }

    if (patterns.diagnosis.test(query)) {
      const match = query.match(patterns.diagnosis);
      if (match) {
        // Search medical notes for diagnosis
        const patients = await storage.getPatients(doctorId);
        for (const patient of patients) {
          const notes = await storage.getMedicalNotes(patient.id);
          notes.forEach(note => {
            if (note.content.toLowerCase().includes(match[1].toLowerCase())) {
              results.push({
                note,
                patient,
                score: 0.8,
                type: 'note'
              });
            }
          });
        }
      }
    }

    // Fallback to fuzzy search
    if (results.length === 0) {
      req.query = { q: query, type };
      return searchRouter(req, res, () => {}); // Fallback to main search
    }

    res.json({
      query,
      results: results.slice(0, 10),
      count: results.length,
    });
  } catch (error) {
    console.error('Semantic search error:', error);
    res.status(500).json({ error: 'Semantic search failed' });
  }
});

export default searchRouter;
