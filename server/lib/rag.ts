import { storage } from '../storage';

interface PatientContext {
  patientId: number;
  medications: string[];
  allergies: string[];
  diagnoses: string[];
  recentNotes: string[];
  vitalSigns: string[];
}

interface Chunk {
  content: string;
  metadata: {
    patientId: number;
    source: string;
    timestamp: Date;
    section: string;
  };
}

// Generate vector embedding (placeholder - use real embedding service in production)
export async function generateEmbedding(text: string): Promise<number[]> {
  // In production, call OpenAI, Cohere, or local embedding model
  // For now, return simple frequency-based vector as placeholder
  const tokens = text.toLowerCase().split(/\s+/);
  const uniqueTokens = [...new Set(tokens)];
  
  // Simple hash-based vector (8 dimensions for demo)
  return uniqueTokens.slice(0, 8).map((token, i) => {
    let hash = 0;
    for (let j = 0; j < token.length; j++) {
      hash = ((hash << 5) - hash) + token.charCodeAt(j);
      hash = hash & hash;
    }
    return Math.abs(hash % 1000) / 1000;
  });
}

// Create patient context chunks for RAG
export async function createPatientContext(patientId: number): Promise<PatientContext> {
  const patient = await storage.getPatient(patientId);
  if (!patient) throw new Error('Patient not found');

  // Gather all relevant data
  const [medications, allergies, diagnoses, notes, vitals] = await Promise.all([
    storage.getPrescriptions(patientId),
    storage.getMedicalAlertsByPatient(patientId).then(alerts => 
      alerts.filter(a => a.type === 'allergy').map(a => a.title)
    ),
    storage.getMedicalAlertsByPatient(patientId).then(alerts =>
      alerts.filter(a => a.type === 'condition').map(a => a.title)
    ),
    storage.getMedicalNotes(patientId),
    Promise.all([
      storage.getBpReadings(patientId).then(readings => 
        readings.slice(0, 3).map(r => `BP: ${r.systolic}/${r.diastolic}`)
      ),
      storage.getGlucoseReadings(patientId).then(readings =>
        readings.slice(0, 3).map(r => `Glucose: ${r.value}`)
      ),
    ]).then(v => v.flat()),
  ]);

  return {
    patientId,
    medications: medications.filter(m => m.isActive).map(m => `${m.medicationName} ${m.dosage} ${m.frequency}`),
    allergies,
    diagnoses,
    recentNotes: notes.slice(0, 5).map(n => n.title + ': ' + n.content.substring(0, 200)),
    vitalSigns: vitals,
  };
}

// Chunk patient data for RAG
export function chunkPatientData(context: PatientContext): Chunk[] {
  const chunks: Chunk[] = [];
  const timestamp = new Date();

  // Medications chunk
  context.medications.forEach(med => {
    chunks.push({
      content: `Medication: ${med}`,
      metadata: {
        patientId: context.patientId,
        source: 'prescriptions',
        timestamp,
        section: 'medications',
      },
    });
  });

  // Allergies chunk
  context.allergies.forEach(allergy => {
    chunks.push({
      content: `Allergy: ${allergy}`,
      metadata: {
        patientId: context.patientId,
        source: 'alerts',
        timestamp,
        section: 'allergies',
      },
    });
  });

  // Diagnoses chunk
  context.diagnoses.forEach(diagnosis => {
    chunks.push({
      content: `Diagnosis: ${diagnosis}`,
      metadata: {
        patientId: context.patientId,
        source: 'alerts',
        timestamp,
        section: 'diagnoses',
      },
    });
  });

  // Recent notes chunks
  context.recentNotes.forEach(note => {
    chunks.push({
      content: note,
      metadata: {
        patientId: context.patientId,
        source: 'medical_notes',
        timestamp,
        section: 'notes',
      },
    });
  });

  // Vitals chunks
  context.vitalSigns.forEach(vital => {
    chunks.push({
      content: vital,
      metadata: {
        patientId: context.patientId,
        source: 'vitals',
        timestamp,
        section: 'vitals',
      },
    });
  });

  return chunks;
}

// Retrieve relevant context for a query
export async function retrieveRelevantContext(
  patientId: number,
  query: string,
  topK: number = 5
): Promise<Chunk[]> {
  const context = await createPatientContext(patientId);
  const chunks = chunkPatientData(context);

  // Simple semantic search using embedding similarity
  const queryEmbedding = await generateEmbedding(query);

  const scoredChunks = chunks.map(chunk => {
    const chunkEmbedding = generateEmbedding(chunk.content);
    
    // Calculate cosine similarity (placeholder)
    const dotProduct = queryEmbedding.reduce((sum, val, i) => 
      sum + val * (chunkEmbedding[i] || 0), 0
    );
    
    return {
      chunk,
      score: dotProduct,
    };
  });

  return scoredChunks
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(c => c.chunk);
}

// Build system prompt with retrieved context
export function buildSystemPrompt(
  patientContext: PatientContext,
  relevantChunks: Chunk[]
): string {
  const contextText = relevantChunks.map(c => c.content).join('\n');

  return `You are a clinical assistant AI helping a doctor with patient care.
IMPORTANT: Only use information from the provided context.
NEVER make up information not in the context.

Patient Context:
- Name: ${patientContext.medications.length > 0 ? 'Patient data loaded' : 'No additional data'}
- Conditions: ${patientContext.diagnoses.join(', ') || 'None recorded'}
- Allergies: ${patientContext.allergies.join(', ') || 'None recorded'}
- Medications: ${patientContext.medications.length > 0 ? patientContext.medications.join(', ') : 'None active'}

Relevant Information:
${contextText}

Answer questions only using this context. If the answer isn't in the context, say "I don't have that information in the patient's record."`;
}

// Main RAG retrieval function
export async function ragRetrieval(
  patientId: number,
  query: string
): Promise<{
  context: PatientContext;
  chunks: Chunk[];
  systemPrompt: string;
}> {
  const context = await createPatientContext(patientId);
  const relevantChunks = await retrieveRelevantContext(patientId, query);
  const systemPrompt = buildSystemPrompt(context, relevantChunks);

  return {
    context,
    chunks: relevantChunks,
    systemPrompt,
  };
}
