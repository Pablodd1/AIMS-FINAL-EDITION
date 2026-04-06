import { Router, Request, Response } from 'express';
import { log, logError } from '../logger';
import { storage } from '../storage';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { randomUUID } from 'crypto';

export const patientImportRouter = Router();

// Configure multer for Excel file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) or CSV files are allowed'));
    }
  }
});

// Expected column mappings (flexible)
const COLUMN_MAPPINGS = {
  firstName: ['first_name', 'firstname', 'first name', 'fname', 'name_first'],
  lastName: ['last_name', 'lastname', 'last name', 'lname', 'name_last'],
  email: ['email', 'email_address', 'email address', 'e_mail'],
  phone: ['phone', 'phone_number', 'phone number', 'telephone', 'mobile', 'cell'],
  dateOfBirth: ['date_of_birth', 'dob', 'birth_date', 'birthdate', 'date of birth', 'birth date'],
  gender: ['gender', 'sex'],
  address: ['address', 'street_address', 'street address', 'street'],
  city: ['city', 'town'],
  state: ['state', 'province', 'st'],
  zipCode: ['zip', 'zipcode', 'zip_code', 'postal_code', 'postal code'],
  insuranceProvider: ['insurance', 'insurance_provider', 'insurance provider', 'carrier'],
  insurancePolicyNumber: ['policy_number', 'policy number', 'policy', 'insurance_number'],
  emergencyContactName: ['emergency_contact', 'emergency contact', 'emergency_name', 'ec_name'],
  emergencyContactPhone: ['emergency_phone', 'emergency phone', 'ec_phone', 'emergency_contact_phone'],
  medicalRecordNumber: ['mrn', 'medical_record_number', 'medical record number', 'patient_id', 'patient id']
};

// Helper function to find column index
function findColumnIndex(headers: string[], possibleNames: string[]): number {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  for (const name of possibleNames) {
    const index = lowerHeaders.indexOf(name.toLowerCase());
    if (index !== -1) return index;
  }
  return -1;
}

// Helper function to parse date
function parseDate(dateValue: any): Date | null {
  if (!dateValue) return null;
  
  // If it's already a Date object
  if (dateValue instanceof Date) return dateValue;
  
  // Try parsing as string
  const dateStr = String(dateValue).trim();
  
  // Handle MM/DD/YYYY format
  const usDateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usDateMatch) {
    return new Date(parseInt(usDateMatch[3]), parseInt(usDateMatch[1]) - 1, parseInt(usDateMatch[2]));
  }
  
  // Handle DD/MM/YYYY format
  const euDateMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (euDateMatch) {
    return new Date(parseInt(euDateMatch[3]), parseInt(euDateMatch[2]) - 1, parseInt(euDateMatch[1]));
  }
  
  // Handle YYYY-MM-DD format
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
  }
  
  // Try native Date parsing
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// Helper function to clean phone number
function cleanPhoneNumber(phone: any): string {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
}

// POST /api/patients/import - Import patients from Excel
patientImportRouter.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const doctorId = req.user!.id;
    
    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
    
    if (rawData.length < 2) {
      return res.status(400).json({ error: 'File appears to be empty or missing data rows' });
    }
    
    const headers = (rawData[0] as string[]).map(h => String(h || '').trim());
    const rows = rawData.slice(1);
    
    // Map column indices
    const columnMap: Record<string, number> = {};
    for (const [field, possibleNames] of Object.entries(COLUMN_MAPPINGS)) {
      const index = findColumnIndex(headers, possibleNames);
      columnMap[field] = index;
    }
    
    // Validate required fields
    if (columnMap.firstName === -1 || columnMap.lastName === -1) {
      return res.status(400).json({ 
        error: 'Required columns not found',
        message: 'The file must contain columns for First Name and Last Name',
        foundHeaders: headers,
        expectedMappings: COLUMN_MAPPINGS
      });
    }
    
    // Process rows
    const results = {
      total: rows.length,
      imported: 0,
      skipped: 0,
      errors: [] as Array<{ row: number; error: string; data: any }>
    };
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as any[];
      const rowNumber = i + 2; // +2 because Excel is 1-indexed and we skip header
      
      try {
        const firstName = columnMap.firstName !== -1 ? String(row[columnMap.firstName] || '').trim() : '';
        const lastName = columnMap.lastName !== -1 ? String(row[columnMap.lastName] || '').trim() : '';
        
        // Skip empty rows
        if (!firstName && !lastName) {
          results.skipped++;
          continue;
        }
        
        // Check for duplicate by name and DOB
        const dob = columnMap.dateOfBirth !== -1 ? parseDate(row[columnMap.dateOfBirth]) : null;
        const existingPatients = await storage.getPatientsByDoctor(doctorId);
        const isDuplicate = existingPatients.some(p => 
          p.firstName?.toLowerCase() === firstName.toLowerCase() &&
          p.lastName?.toLowerCase() === lastName.toLowerCase() &&
          (!dob || p.dateOfBirth?.getTime() === dob.getTime())
        );
        
        if (isDuplicate) {
          results.skipped++;
          continue;
        }
        
        // Create patient
        const patient = await storage.createPatient({
          doctorId,
          firstName,
          lastName,
          email: columnMap.email !== -1 ? String(row[columnMap.email] || '').trim() : null,
          phone: columnMap.phone !== -1 ? cleanPhoneNumber(row[columnMap.phone]) : null,
          dateOfBirth: dob,
          gender: columnMap.gender !== -1 ? String(row[columnMap.gender] || '').trim() : null,
          address: columnMap.address !== -1 ? String(row[columnMap.address] || '').trim() : null,
          city: columnMap.city !== -1 ? String(row[columnMap.city] || '').trim() : null,
          state: columnMap.state !== -1 ? String(row[columnMap.state] || '').trim() : null,
          zipCode: columnMap.zipCode !== -1 ? String(row[columnMap.zipCode] || '').trim() : null,
          insuranceProvider: columnMap.insuranceProvider !== -1 ? String(row[columnMap.insuranceProvider] || '').trim() : null,
          insurancePolicyNumber: columnMap.insurancePolicyNumber !== -1 ? String(row[columnMap.insurancePolicyNumber] || '').trim() : null,
          emergencyContactName: columnMap.emergencyContactName !== -1 ? String(row[columnMap.emergencyContactName] || '').trim() : null,
          emergencyContactPhone: columnMap.emergencyContactPhone !== -1 ? cleanPhoneNumber(row[columnMap.emergencyContactPhone]) : null,
          medicalRecordNumber: columnMap.medicalRecordNumber !== -1 ? String(row[columnMap.medicalRecordNumber] || '').trim() : null,
          status: 'active'
        });
        
        results.imported++;
      } catch (error) {
        results.errors.push({
          row: rowNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: row
        });
      }
    }
    
    log(`Patient import completed: ${results.imported} imported, ${results.skipped} skipped, ${results.errors.length} errors`);
    
    return res.status(200).json({
      success: true,
      message: `Import completed: ${results.imported} patients imported`,
      results
    });
    
  } catch (error) {
    logError('Error importing patients:', error);
    return res.status(500).json({ 
      error: 'Failed to import patients',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/patients/import/template - Download template Excel file
patientImportRouter.get('/template', (req, res) => {
  try {
    // Create template workbook
    const workbook = XLSX.utils.book_new();
    
    // Sample data with all possible columns
    const templateData = [
      {
        'First Name': 'John',
        'Last Name': 'Doe',
        'Email': 'john.doe@email.com',
        'Phone': '555-123-4567',
        'Date of Birth': '01/15/1980',
        'Gender': 'Male',
        'Address': '123 Main St',
        'City': 'Anytown',
        'State': 'CA',
        'Zip Code': '12345',
        'Insurance Provider': 'Blue Cross',
        'Insurance Policy Number': 'BC123456',
        'Emergency Contact Name': 'Jane Doe',
        'Emergency Contact Phone': '555-987-6543',
        'Medical Record Number': 'MRN12345'
      }
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Patient Template');
    
    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=patient_import_template.xlsx');
    res.send(buffer);
    
  } catch (error) {
    logError('Error generating template:', error);
    return res.status(500).json({ error: 'Failed to generate template' });
  }
});

// POST /api/patients/import/validate - Validate file without importing
patientImportRouter.post('/validate', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
    
    if (rawData.length < 1) {
      return res.status(400).json({ error: 'File appears to be empty' });
    }
    
    const headers = (rawData[0] as string[]).map(h => String(h || '').trim());
    
    // Find matched columns
    const matchedColumns: Record<string, string> = {};
    const unmatchedColumns: string[] = [];
    
    for (const [field, possibleNames] of Object.entries(COLUMN_MAPPINGS)) {
      const index = findColumnIndex(headers, possibleNames);
      if (index !== -1) {
        matchedColumns[field] = headers[index];
      }
    }
    
    // Check for columns we couldn't match
    for (const header of headers) {
      let isMatched = false;
      for (const [field, possibleNames] of Object.entries(COLUMN_MAPPINGS)) {
        if (possibleNames.includes(header.toLowerCase())) {
          isMatched = true;
          break;
        }
      }
      if (!isMatched) {
        unmatchedColumns.push(header);
      }
    }
    
    return res.json({
      valid: headers.length > 0,
      totalRows: rawData.length - 1,
      matchedColumns,
      unmatchedColumns: unmatchedColumns.length > 0 ? unmatchedColumns : undefined,
      requiredFieldsPresent: {
        firstName: matchedColumns.hasOwnProperty('firstName'),
        lastName: matchedColumns.hasOwnProperty('lastName')
      }
    });
    
  } catch (error) {
    logError('Error validating file:', error);
    return res.status(500).json({ error: 'Failed to validate file' });
  }
});

export default patientImportRouter;
