import { Router, Request, Response } from 'express';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { z } from 'zod';
import multer from 'multer';

const ocrRouter = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Google Vision client
let visionClient: ImageAnnotatorClient | null = null;

function getClient(): ImageAnnotatorClient {
  if (!visionClient) {
    if (!process.env.GOOGLE_CLOUD_PROJECT) {
      throw new Error('GOOGLE_CLOUD_PROJECT environment variable is required');
    }
    visionClient = new ImageAnnotatorClient({
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
  }
  return visionClient;
}

// Insurance card field mapping
const INSURANCE_FIELDS = {
  MEMBER_ID: /member\s*id|subscriber\s*id|member\s*number|member\s*#/i,
  GROUP_NUMBER: /group\s*id|group\s*number|group\s*#/i,
  POLICY_NUMBER: /policy\s*number|policy\s*id/i,
  INSURER_NAME: /insurance\s*company|payer|insurer|blue|cigna|aetna|united/i,
  PLAN_TYPE: /ppo|hma|hmo|pos|epo/i,
  EXPIRY_DATE: /expir|effect|until/i,
  DEPENDENT_ID: /dependent|child|spouse/i,
};

// Parse extracted text for insurance fields
function parseInsuranceFields(text: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);

  lines.forEach((line, index) => {
    const lowerLine = line.toLowerCase();

    // Check each field type
    for (const [fieldName, pattern] of Object.entries(INSURANCE_FIELDS)) {
      if (pattern.test(lowerLine)) {
        // Value is often on the same line or next line
        const valueMatch = line.match(/[:\s]+([A-Za-z0-9\-]+)/);
        if (valueMatch) {
          fields[fieldName] = valueMatch[1];
        } else if (index + 1 < lines.length) {
          // Try next line
          const nextLine = lines[index + 1];
          if (nextLine && nextLine.length < 50 && !/[A-Z]/.test(nextLine.charAt(0))) {
            fields[fieldName] = nextLine;
          }
        }
      }
    }
  });

  // Try to extract member name (often at top)
  const namePattern = /(?:member|subscriber|patient)\s+(?:name|:)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i;
  const nameMatch = text.match(namePattern);
  if (nameMatch) {
    fields['MEMBER_NAME'] = nameMatch[1];
  }

  // Extract dates (MM/DD/YYYY or YYYY-MM-DD)
  const datePattern = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/;
  const dateMatch = text.match(datePattern);
  if (dateMatch) {
    fields['EXPIRY_DATE'] = dateMatch[1];
  }

  return fields;
}

/**
 * POST /api/ocr/insurance-card
 * Upload insurance card image and extract text
 */
ocrRouter.post('/insurance-card', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const client = getClient();
    const imageBuffer = req.file.buffer;

    // Perform text detection
    const [result] = await client.textDetection({
      image: { content: imageBuffer },
    });

    const detections = result.textAnnotations;
    if (!detections || detections.length === 0) {
      return res.status(400).json({ error: 'No text detected in image' });
    }

    const fullText = detections[0].description || '';
    const fields = parseInsuranceFields(fullText);

    // Also extract individual words for debugging
    const words = detections.slice(1).map(d => ({
      text: d.description,
      confidence: d.confidence || 0,
      vertices: d.boundingPoly?.vertices,
    }));

    res.json({
      success: true,
      fullText,
      fields,
      words: words.slice(0, 50), // Limit for response size
      wordCount: words.length,
    });
  } catch (error) {
    console.error('OCR error:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

/**
 * POST /api/ocr/id-card
 * Upload ID card and extract information
 */
ocrRouter.post('/id-card', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const client = getClient();
    const imageBuffer = req.file.buffer;

    const [result] = await client.textDetection({
      image: { content: imageBuffer },
    });

    const text = result.textAnnotations?.[0]?.description || '';

    // Parse ID-specific fields
    const fields: Record<string, string> = {};

    // Name pattern (typically last, first)
    const nameMatch = text.match(/([A-Z][A-Z\s]+)\n([A-Z][A-Z\s]+)/);
    if (nameMatch) {
      fields.lastName = nameMatch[1].trim();
      fields.firstName = nameMatch[2].trim();
    }

    // Date of birth (often DD/MM/YYYY or MM/DD/YYYY)
    const dobPattern = /(?:DOB|BIRTH|DATE\s+OF\s+BIRTH)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i;
    const dobMatch = text.match(dobPattern);
    if (dobMatch) {
      fields.dateOfBirth = dobMatch[1];
    }

    // ID number
    const idPattern = /(?:DL|ID|LICENSE)[:\s]*([A-Z0-9]+)/i;
    const idMatch = text.match(idPattern);
    if (idMatch) {
      fields.idNumber = idMatch[1];
    }

    res.json({
      success: true,
      fullText: text,
      fields,
    });
  } catch (error) {
    console.error('OCR error:', error);
    res.status(500).json({ error: 'Failed to process ID card' });
  }
});

export default ocrRouter;
