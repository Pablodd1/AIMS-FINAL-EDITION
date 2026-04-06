import { Router, Request, Response } from 'express';
import { log, logError } from '../logger';
import { storage } from '../storage';
import { getGeminiModel, initGemini } from '../gemini-integration';
import { SYSTEM_PROMPTS } from '../prompts';

export const geminiRouter = Router();

// POST /api/gemini/generate-soap - Generate SOAP notes using Gemini
// Alternative to OpenAI for providers who prefer Gemini

geminiRouter.post('/generate-soap', async (req: Request, res: Response) => {
  try {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { transcript, patientInfo, noteType } = req.body;
    const userId = req.user!.id;

    if (!transcript) {
      return res.json({
        success: false,
        soap: 'No transcript provided. Please provide consultation text to generate SOAP notes.'
      });
    }

    // Check if Gemini is configured
    const gemini = initGemini();
    if (!gemini) {
      return res.status(503).json({
        error: 'Gemini API not configured. Please add GEMINI_API_KEY to your environment variables.',
        provider: 'gemini'
      });
    }

    try {
      // Get patient history if available
      let patientHistory = "";
      if (patientInfo?.id && !isNaN(parseInt(patientInfo.id))) {
        try {
          const patientId = parseInt(patientInfo.id);
          const [notes, medications] = await Promise.all([
            storage.getMedicalNotesByPatient(patientId),
            storage.getPrescriptionsByPatient(patientId)
          ]);

          let contextParts = [];

          if (notes && notes.length > 0) {
            const recent = notes.slice(0, 3).map(n =>
              `Date: ${new Date(n.createdAt).toLocaleDateString()} - ${n.title}`
            ).join('\n');
            contextParts.push(`Recent visits:\n${recent}`);
          }

          if (medications && medications.length > 0) {
            const meds = medications.filter(m => m.isActive).map(m =>
              `- ${m.medicationName}`
            ).join('\n');
            contextParts.push(`Active medications:\n${meds}`);
          }

          if (contextParts.length > 0) {
            patientHistory = `\nPatient History:\n${contextParts.join('\n\n')}`;
          }
        } catch (err) {
          console.error('Error fetching patient history', err);
        }
      }

      // Sanitize inputs
      const sanitizedTranscript = (transcript || '').toString().slice(0, 4000);
      const patientName = patientInfo?.name ||
        `${patientInfo?.firstName || ''} ${patientInfo?.lastName || ''}`.trim() ||
        'Unknown';

      // Get custom prompt if available
      let customPrompt: string | null = null;
      if (noteType) {
        try {
          const prompt = await storage.getCustomNotePrompt(userId, noteType);
          if (prompt?.systemPrompt) {
            customPrompt = prompt.systemPrompt;
          }
        } catch (error) {
          // Continue with default
        }
      }

      const systemPrompt = customPrompt || SYSTEM_PROMPTS.SOAP_NOTE;

      // Use Gemini Pro for SOAP note generation
      const model = getGeminiModel('gemini-1.5-pro');

      const prompt = `${systemPrompt}

Generate comprehensive medical documentation for this consultation.

Patient: ${patientName}${patientHistory}

TRANSCRIPT:
${sanitizedTranscript}

Return the complete JSON object with ehr_payload and human_note fields.`;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 3000,
          responseMimeType: 'application/json'
        }
      });

      const response = await result.response;
      const text = response.text();

      if (!text) {
        return res.json({
          success: false,
          soap: 'Could not generate SOAP notes from the provided transcript.'
        });
      }

      try {
        // Parse the JSON response
        const aimsResponse = JSON.parse(text);
        const humanNote = aimsResponse.human_note || '';

        return res.json({
          success: true,
          soap: humanNote,
          structuredData: aimsResponse.ehr_payload,
          provider: 'gemini'
        });
      } catch (parseError) {
        logError('Failed to parse Gemini response:', parseError);
        // Return raw response if parsing fails
        return res.json({
          success: true,
          soap: text,
          provider: 'gemini'
        });
      }

    } catch (geminiError) {
      logError('Gemini API error:', geminiError);
      return res.json({
        success: false,
        soap: 'Error connecting to Gemini AI service. Please try again.',
        provider: 'gemini'
      });
    }

  } catch (error) {
    logError('Server error in Gemini SOAP generation:', error);
    return res.status(500).json({
      success: false,
      soap: 'An unexpected error occurred. Please try again later.'
    });
  }
});

// GET /api/gemini/status - Check if Gemini is configured
geminiRouter.get('/status', (req: Request, res: Response) => {
  const gemini = initGemini();
  res.json({
    configured: !!gemini,
    provider: 'gemini'
  });
});

export default geminiRouter;
