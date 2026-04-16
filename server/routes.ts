import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from 'ws';
import { randomBytes, createHash } from 'crypto';
import { setupAuth } from "./auth";
import jwt from 'jsonwebtoken';
import { storage } from "./storage";
import { pool } from "./db";
import { FileStorage } from "./file-storage";
import { CloudinaryStorage } from "./cloudinary-storage";
import { aiRouter } from "./routes/ai";
import { emailRouter, sendPatientEmail } from "./routes/email";
import { monitoringRouter } from "./routes/monitoring";
import { labInterpreterRouter } from "./routes/lab-interpreter";
import { patientDocumentsRouter } from "./routes/patient-documents-updated";
import { adminRouter } from "./routes/admin";
import { createPublicRouter } from "./routes/public";
import { notificationSettingsRouter } from "./routes/notification-settings";
import { createKioskRouter } from "./routes/kiosk";
import patientImportRouter from "./routes/patient-import";
import medicalCodesRouter from "./routes/medical-codes";
import geminiRouter from "./routes/gemini-routes";
import medicareComplianceRouter from "./routes/medicare-compliance";
import healthRouter from "./routes/health";
import preVisitRouter from "./routes/pre-visit-summary";
import ocrRouter from "./routes/ocr";
import patientPortalRouter from "./routes/patient-portal";
import {
  globalErrorHandler,
  requireAuth,
  sendErrorResponse,
  sendSuccessResponse,
  asyncHandler,
  validateRequestBody,
  handleDatabaseOperation,
  AppError
} from "./error-handler";
import multer from "multer";
import * as XLSX from 'xlsx';

import { log, logError } from './logger';
import { createAuditLog, AUDIT_ACTIONS } from './audit';

// Extend the global namespace to include our media storage
declare global {
  var mediaStorage: Map<string, {
    data: Buffer,
    contentType: string,
    filename: string
  }>;
}
import {
  insertPatientSchema,
  insertAppointmentSchema,
  insertMedicalNoteSchema,
  insertConsultationNoteSchema,
  insertInvoiceSchema,
  insertIntakeFormSchema,
  insertIntakeFormResponseSchema,
  insertMedicalNoteTemplateSchema,
  type RecordingSession
} from "@shared/schema";
import { startLiveTranscription, sendAudioToDeepgram, stopLiveTranscription, getSessionTranscript } from './live-transcription';
import { runMigrations } from './migrations/run-migrations';

// Define the interface for telemedicine rooms
interface VideoChatRoom {
  id: string;
  participants: {
    id: string;
    socket: WebSocket;
    name: string;
    isDoctor: boolean;
  }[];
}

// Store active rooms in memory
const activeRooms = new Map<string, VideoChatRoom>();

// JWT_SECRET for manual JWT verification in inline auth checks
const JWT_SECRET = process.env.JWT_SECRET || "aims-default-secret-change-in-production";

// Helper function to get authenticated user from request (supports both JWT Bearer and session)
async function getAuthenticatedUser(req: Request): Promise<any> {
  // First check JWT Bearer token (used by frontend for API calls)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = await storage.getUser(decoded.id);
      return user;
    } catch {
      return null;
    }
  }
  // Fallback: session-based auth
  if (req.isAuthenticated()) {
    return req.user;
  }
  return null;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Run database migrations on startup (safe to run multiple times)
  try {
    await runMigrations();
  } catch (error) {
    logError('Warning: Migration runner error (app will continue):', error, { requestId: 'db-migration' });
  }

  setupAuth(app);

  // Setup/Seed endpoint - creates default users if they don't exist
  app.post('/api/setup', asyncHandler(async (req, res) => {
    const { hashPassword } = await import('./auth');

    const defaultUsers = [
      {
        username: 'admin',
        password: 'admin123',
        name: 'System Administrator',
        role: 'administrator' as const,
        email: 'admin@aims.medical',
        specialty: 'Administration',
        isActive: true,
      },
      {
        username: 'provider',
        password: 'provider123',
        name: 'Dr. John Smith',
        role: 'doctor' as const,
        email: 'provider@aims.medical',
        specialty: 'Internal Medicine',
        licenseNumber: 'MD-12345',
        isActive: true,
      },
      {
        username: 'doctor',
        password: 'doctor123',
        name: 'Dr. Sarah Johnson',
        role: 'doctor' as const,
        email: 'doctor@aims.medical',
        specialty: 'Family Medicine',
        licenseNumber: 'MD-67890',
        isActive: true,
      },
      {
        username: 'clinic_main',
        password: 'clinic123',
        name: 'Main Clinic',
        role: 'clinic' as const,
        email: 'main@aims.medical',
        clinicLocation: 'Main Clinic',
        isActive: true,
      }
    ];

    const results = [];
    for (const userData of defaultUsers) {
      try {
        const existing = await storage.getUserByUsername(userData.username);
        if (!existing) {
          const hashedPassword = await hashPassword(userData.password);
          // Update clinic location for default doctors if creating them
          const userToCreate: any = { ...userData };
          if (userToCreate.role === 'doctor') {
            userToCreate.clinicLocation = 'Main Clinic';
          }
          const user = await storage.createUser({
            ...userToCreate,
            password: hashedPassword,
          });
          results.push({ username: userData.username, status: 'created' });
        } else {
          results.push({ username: userData.username, status: 'exists' });
          // If existing doctor, we should update their clinic location for the demo
          if (existing.role === 'doctor' && !existing.clinicLocation) {
            await storage.updateUser(existing.id, { clinicLocation: 'Main Clinic' });
            results.push({ username: userData.username, status: 'updated_location' });
          }
        }
      } catch (error: any) {
        results.push({ username: userData.username, status: 'error', message: error.message });
      }
    }

    // Seed 5 embedded demo patients (only if patients table is empty)
    const patientResults: any[] = [];
    try {
      // Find the first doctor user to assign as createdBy
      const providerUser = await storage.getUserByUsername('provider');
      const doctorUser = await storage.getUserByUsername('doctor');
      const createdById = providerUser?.id || doctorUser?.id || 1;

      const existingPatients = await storage.getPatients(createdById);
      if (!existingPatients || existingPatients.length === 0) {
        const demoPatients = [
          {
            firstName: 'Maria',
            lastName: 'Rodriguez',
            email: 'maria.rodriguez@email.com',
            phone: '(305) 555-0142',
            dateOfBirth: '1978-06-15',
            address: '742 Palm Ave, Miami, FL 33130',
            medicalHistory: 'Type 2 Diabetes (diagnosed 2019), Hypertension (controlled with Lisinopril 10mg daily), Seasonal allergies. Family history: Father had coronary artery disease. Last A1C: 7.2% (Dec 2025). Current medications: Metformin 500mg BID, Lisinopril 10mg daily, Cetirizine 10mg PRN.',
          },
          {
            firstName: 'James',
            lastName: 'Thompson',
            email: 'james.thompson@email.com',
            phone: '(212) 555-0198',
            dateOfBirth: '1985-03-22',
            address: '158 W 72nd St, New York, NY 10023',
            medicalHistory: 'Asthma (mild persistent, well-controlled), GERD. No known drug allergies. Non-smoker, social drinker. BMI 24.3. Current medications: Albuterol HFA inhaler PRN, Omeprazole 20mg daily. Last PFT: FEV1 92% predicted (Oct 2025).',
          },
          {
            firstName: 'Aisha',
            lastName: 'Patel',
            email: 'aisha.patel@email.com',
            phone: '(713) 555-0267',
            dateOfBirth: '1992-11-08',
            address: '3201 Westheimer Rd, Houston, TX 77098',
            medicalHistory: 'Hypothyroidism (Hashimoto\'s, diagnosed 2020), Anxiety disorder (managed). Allergy: Penicillin (rash). Vegetarian. Family history: Mother with thyroid disease. Current medications: Levothyroxine 75mcg daily, Sertraline 50mg daily. Last TSH: 2.8 mIU/L (Jan 2026).',
          },
          {
            firstName: 'Robert',
            lastName: 'Chen',
            email: 'robert.chen@email.com',
            phone: '(415) 555-0334',
            dateOfBirth: '1960-09-30',
            address: '890 Market St, San Francisco, CA 94102',
            medicalHistory: 'Hyperlipidemia, Benign prostatic hyperplasia, Osteoarthritis (bilateral knees). Allergy: Sulfa drugs. Former smoker (quit 2010, 15 pack-year history). Family history: Brother with prostate cancer. Current medications: Atorvastatin 40mg daily, Tamsulosin 0.4mg daily, Acetaminophen 500mg PRN. Last lipid panel: TC 198, LDL 110, HDL 52, TG 145 (Nov 2025).',
          },
          {
            firstName: 'Sofia',
            lastName: 'Williams',
            email: 'sofia.williams@email.com',
            phone: '(404) 555-0421',
            dateOfBirth: '2001-01-17',
            address: '456 Peachtree St NE, Atlanta, GA 30308',
            medicalHistory: 'Iron deficiency anemia (recurrent), Migraines with aura. NKDA. Non-smoker, no alcohol. BMI 21.5. Current medications: Ferrous sulfate 325mg daily, Sumatriptan 50mg PRN for migraines, Oral contraceptive. Last CBC: Hgb 11.8 g/dL, MCV 78 fL (Dec 2025). Migraine frequency: 2-3 per month.',
          },
        ];

        for (const patientData of demoPatients) {
          try {
            const patient = await storage.createPatient({
              ...patientData,
              createdBy: createdById,
            });
            patientResults.push({ name: `${patientData.firstName} ${patientData.lastName || ''}`.trim(), status: 'created', id: patient.id });
          } catch (patientError: any) {
            patientResults.push({ name: `${patientData.firstName} ${patientData.lastName || ''}`.trim(), status: 'error', message: patientError.message });
          }
        }
      } else {
        patientResults.push({ status: 'skipped', message: `${existingPatients.length} patients already exist` });
      }
    } catch (patientSetupError: any) {
      patientResults.push({ status: 'error', message: patientSetupError.message });
    }

    sendSuccessResponse(res, {
      message: 'Setup complete',
      users: results,
      patients: patientResults,
      credentials: {
        administrator: { username: 'admin', password: 'admin123' },
        admin: { username: 'admin', password: 'admin123' },
        provider: { username: 'provider', password: 'provider123' },
        doctor: { username: 'doctor', password: 'doctor123' },
      }
    });
  }));

  // Register public routes (no auth required)
  app.use('/api/public', createPublicRouter(storage));

  // Register kiosk routes
  app.use('/api/kiosk', createKioskRouter());

  // Register AI routes
  app.use('/api/ai', aiRouter);

  // Register Email settings routes
  app.use('/api/settings', emailRouter);

  // Register Patient Monitoring routes
  app.use('/api/monitoring', monitoringRouter);

  // Register Lab Interpreter routes
  app.use('/api/lab-interpreter', labInterpreterRouter);

  // Register Patient Documents routes
  app.use('/api/patient-documents', requireAuth, patientDocumentsRouter);

  // Register Admin routes
  app.use('/api/admin', adminRouter);

  // Register Notification Settings routes
  app.use('/api/notifications', notificationSettingsRouter);

  // Register Patient Import routes (Excel upload)
  app.use('/api/patients/import', requireAuth, patientImportRouter);

  // Register Medical Codes routes (CPT/ICD-10)
  app.use('/api/medical-codes', requireAuth, medicalCodesRouter);

  // Register Gemini routes (alternative AI provider)
  app.use('/api/gemini', requireAuth, geminiRouter);

  // Register Medicare Compliance routes
  app.use('/api/medicare', requireAuth, medicareComplianceRouter);
  app.use('/api/health', healthRouter);
  app.use('/api/pre-visit', requireAuth, preVisitRouter);
  app.use('/api/ocr', requireAuth, ocrRouter);
  app.use('/api/patient-portal', patientPortalRouter); // Inside patient portal router it checks auth and role


  // 🚀 PERFORMANCE OPTIMIZATION: Lazy-load notification scheduler only if enabled
  // This reduces startup time and memory usage when notifications are not configured
  if (process.env.ENABLE_NOTIFICATIONS === 'true' ||
    process.env.senderEmail ||
    process.env.daily_patient_list_email_1) {
    const { initializeScheduler } = await import('./notification-scheduler');
    initializeScheduler();
    log('✅ Automated notification system initialized', { requestId: 'notification-scheduler' });
  } else {
    log('ℹ️ Notification system disabled (configure email settings to enable)', { requestId: 'notification-scheduler' });
  }

  // Test error handling endpoint for validation
  app.get('/api/test-error', asyncHandler(async (req, res) => {
    throw new AppError('This is a test error', 400, 'TEST_ERROR');
  }));

  // Patients routes
  app.get("/api/patients", requireAuth, asyncHandler(async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;
    
    let patients;
    let total;
    const user = req.user as any;

    if (user.role === 'clinic' && user.clinicLocation) {
      patients = await handleDatabaseOperation(
        () => storage.getClinicPatients(user.clinicLocation!, limit, offset),
        'Failed to fetch clinic patients'
      );
      total = await handleDatabaseOperation(
        () => storage.getClinicPatientsCount(user.clinicLocation!),
        'Failed to fetch clinic patients count'
      );
    } else if (user.role === 'admin' || user.role === 'administrator') {
      patients = await handleDatabaseOperation(
        () => storage.getPatients(0, limit, offset, true),
        'Failed to fetch all patients'
      );
      total = await handleDatabaseOperation(
        () => storage.getPatientsCount(0, true),
        'Failed to fetch all patients count'
      );
    } else {
      patients = await handleDatabaseOperation(
        () => storage.getPatients(req.user!.id, limit, offset),
        'Failed to fetch patients'
      );
      total = await handleDatabaseOperation(
        () => storage.getPatientsCount(req.user!.id),
        'Failed to fetch patients count'
      );
    }

    if (limit === undefined && offset === undefined) {
      sendSuccessResponse(res, patients);
    } else {
      sendSuccessResponse(res, { data: patients, total });
    }
  }));

  app.get("/api/patients/:id", requireAuth, asyncHandler(async (req, res) => {
    const patientId = parseInt(req.params.id);
    if (isNaN(patientId)) {
      throw new AppError('Invalid patient ID', 400, 'INVALID_PATIENT_ID');
    }

    const patient = await handleDatabaseOperation(
      () => storage.getPatient(patientId),
      'Failed to fetch patient'
    );

    if (!patient) {
      throw new AppError('Patient not found', 404, 'PATIENT_NOT_FOUND');
    }

    // Create audit log and activity log
    try {
      await createAuditLog({
        userId: req.user!.id,
        action: AUDIT_ACTIONS.PATIENT_VIEW,
        resource: 'patient',
        resourceId: patient.id,
        ipAddress: req.ip
      });
      await storage.createPatientActivity({
        patientId: patient.id,
        activityType: 'view',
        title: 'Patient Record Accessed',
        description: `Patient record viewed by ${req.user!.name || req.user!.username}`,
        createdBy: req.user!.id,
      });
    } catch (err) {
      logError('Failed to create audit/activity log:', err as Error);
    }

    sendSuccessResponse(res, patient);
  }));

  app.post("/api/patients", requireAuth, asyncHandler(async (req, res) => {
    const validation = validateRequestBody(insertPatientSchema, req.body);
    if (!validation.success) {
      throw new AppError(validation.error!, 400, 'VALIDATION_ERROR');
    }

    const patient = await handleDatabaseOperation(
      () => storage.createPatient({
        ...validation.data,
        createdBy: req.user!.id,
      }),
      'Failed to create patient'
    );

    // Audit logging
    try {
      await createAuditLog({
        userId: req.user!.id,
        action: AUDIT_ACTIONS.PATIENT_CREATE,
        resource: 'patient',
        resourceId: patient.id,
        ipAddress: req.ip
      });
    } catch (err) {
      logError('Failed to create audit log for patient creation:', err as Error);
    }

    sendSuccessResponse(res, patient, 'Patient created successfully', 201);
  }));

  // Patient import from Excel
  const excelUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max file size
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/octet-stream',
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only Excel files (.xls, .xlsx) are allowed'));
      }
    },
  });

  app.post("/api/patients/import", requireAuth, excelUpload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError('No file uploaded', 400, 'NO_FILE');
    }

    try {
      // Parse the Excel file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON
      const rawData: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (!rawData || rawData.length === 0) {
        throw new AppError('Excel file is empty or has no valid data', 400, 'EMPTY_FILE');
      }

      const successfulImports: any[] = [];
      const failedImports: any[] = [];

      // Helper function to get value from row with various column name formats
      const getColumnValue = (row: any, ...columnNames: string[]): string => {
        for (const name of columnNames) {
          // Try exact match
          if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
            return String(row[name]).trim();
          }
          // Try trimmed version of all keys
          const trimmedKey = Object.keys(row).find(key => key.trim().toLowerCase() === name.toLowerCase());
          if (trimmedKey && row[trimmedKey] !== undefined && row[trimmedKey] !== null && row[trimmedKey] !== '') {
            return String(row[trimmedKey]).trim();
          }
        }
        return '';
      };

      // Process each row
      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];

        try {
          // Map Excel columns to patient schema
          // Expected columns: First Name, Last Name, Email, Phone, Date of Birth, Address, Medical History
          const patientData = {
            firstName: getColumnValue(row, 'First Name', 'firstName', 'first_name'),
            lastName: getColumnValue(row, 'Last Name', 'lastName', 'last_name'),
            email: getColumnValue(row, 'Email', 'email'),
            phone: getColumnValue(row, 'Phone', 'phone', 'phoneNumber', 'phone_number'),
            dateOfBirth: getColumnValue(row, 'Date of Birth', 'dateOfBirth', 'date_of_birth', 'DOB', 'dob'),
            address: getColumnValue(row, 'Address', 'address'),
            medicalHistory: getColumnValue(row, 'Medical History', 'medicalHistory', 'medical_history'),
          };

          // Validate required fields
          if (!patientData.firstName || !patientData.email) {
            failedImports.push({
              row: i + 2, // Excel row number (header is row 1)
              data: row,
              error: 'Missing required fields: First Name and Email are required',
            });
            continue;
          }

          // Validate with schema
          const validation = validateRequestBody(insertPatientSchema, patientData);
          if (!validation.success) {
            failedImports.push({
              row: i + 2,
              data: row,
              error: validation.error,
            });
            continue;
          }

          // Create patient
          const patient = await storage.createPatient({
            ...validation.data,
            createdBy: req.user!.id,
          });
          successfulImports.push({
            row: i + 2,
            patient: {
              id: patient.id,
              firstName: patient.firstName,
              lastName: patient.lastName,
              email: patient.email,
            },
          });
        } catch (error) {
          failedImports.push({
            row: i + 2,
            data: row,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Send response with summary
      sendSuccessResponse(res, {
        summary: {
          totalRows: rawData.length,
          successful: successfulImports.length,
          failed: failedImports.length,
        },
        successfulImports,
        failedImports,
      }, `Successfully imported ${successfulImports.length} of ${rawData.length} patients`, 200);

    } catch (error) {
      logError('Error processing Excel file:', error, { requestId: (req as any).id });
      throw new AppError(
        error instanceof Error ? error.message : 'Failed to process Excel file',
        400,
        'EXCEL_PROCESSING_ERROR'
      );
    }
  }));

  // Appointments routes
  app.get("/api/appointments", requireAuth, asyncHandler(async (req, res) => {
    let appointments;
    const user = req.user as any;
    if (user.role === 'clinic' && user.clinicLocation) {
      appointments = await handleDatabaseOperation(
        () => storage.getClinicAppointments(user.clinicLocation!),
        'Failed to fetch clinic appointments'
      );
    } else if (user.role === 'admin' || user.role === 'administrator') {
      appointments = await handleDatabaseOperation(
        () => storage.getAppointments(0, true),
        'Failed to fetch all appointments'
      );
    } else {
      appointments = await handleDatabaseOperation(
        () => storage.getAppointments(req.user!.id),
        'Failed to fetch appointments'
      );
    }
    sendSuccessResponse(res, appointments);
  }));

  app.post("/api/appointments", requireAuth, asyncHandler(async (req, res) => {
    // Convert numeric timestamp to Date object for PostgreSQL timestamp
    let appointmentData = req.body;
    if (typeof appointmentData.date === 'number') {
      appointmentData = {
        ...appointmentData,
        date: new Date(appointmentData.date)
      };
    }

    const validation = validateRequestBody(insertAppointmentSchema, appointmentData);
    if (!validation.success) {
      throw new AppError(validation.error!, 400, 'VALIDATION_ERROR');
    }

    // Generate unique confirmation token
    const confirmationToken = randomBytes(32).toString('hex');
    const hashedToken = createHash('sha256').update(confirmationToken).digest('hex');

    const appointment = await handleDatabaseOperation(
      () => storage.createAppointment({
        ...validation.data,
        doctorId: req.user!.id,
        confirmationToken: hashedToken,
      }),
      'Failed to create appointment'
    );

    // Send confirmation email to patient with confirm/decline buttons
    try {
      const patient = await storage.getPatient(appointment.patientId);
      if (patient && patient.email) {
        const appointmentDate = new Date(appointment.date);

        // Get the correct base URL
        // Use custom domain in production, localhost in development
        const baseUrl = process.env.REPLIT_DEPLOYMENT === '1'
          ? 'https://aimstalk.live'
          : 'http://localhost:5000';

        await sendPatientEmail(
          patient.email,
          `${patient.firstName} ${patient.lastName || ''}`.trim(),
          'appointmentConfirmation',
          {
            patientName: `${patient.firstName} ${patient.lastName || ''}`.trim(),
            appointmentDate: appointmentDate.toLocaleDateString(),
            appointmentTime: appointmentDate.toLocaleTimeString(),
            notes: appointment.notes || 'No additional notes',
            confirmUrl: `${baseUrl}/confirm-appointment?token=${confirmationToken}`,
            declineUrl: `${baseUrl}/decline-appointment?token=${confirmationToken}`
          }
        );
      }
    } catch (emailError) {
      logError('Failed to send confirmation email:', emailError, { requestId: (req as any).id });
      // Don't fail the request if email fails
    }

    sendSuccessResponse(res, appointment, 'Appointment created successfully', 201);
  }));

  // Update appointment status
  app.patch("/api/appointments/:id", requireAuth, asyncHandler(async (req, res) => {
    const appointmentId = parseInt(req.params.id);
    if (isNaN(appointmentId)) {
      throw new AppError('Invalid appointment ID', 400, 'INVALID_APPOINTMENT_ID');
    }

    const { status } = req.body;
    if (!status) {
      throw new AppError('Status is required', 400, 'STATUS_REQUIRED');
    }

    const updatedAppointment = await handleDatabaseOperation(
      () => storage.updateAppointmentStatus(appointmentId, status),
      'Failed to update appointment status'
    );

    if (!updatedAppointment) {
      throw new AppError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }

    // Audit logging
    try {
      await createAuditLog({
        userId: req.user!.id,
        action: AUDIT_ACTIONS.APPOINTMENT_UPDATE,
        resource: 'appointment',
        resourceId: updatedAppointment.id,
        details: `Status updated to ${status}`,
        ipAddress: req.ip
      });
    } catch (err) {
      logError('Failed to create audit log for appointment update:', err as Error);
    }

    sendSuccessResponse(res, updatedAppointment, 'Appointment status updated successfully');
  }));

  // Update appointment (date, time, patient, notes)
  app.put("/api/appointments/:id", requireAuth, asyncHandler(async (req, res) => {
    const appointmentId = parseInt(req.params.id);
    if (isNaN(appointmentId)) {
      throw new AppError('Invalid appointment ID', 400, 'INVALID_APPOINTMENT_ID');
    }

    // Convert numeric timestamp to Date object for PostgreSQL timestamp
    let updates = req.body;
    if (typeof updates.date === 'number') {
      updates = {
        ...updates,
        date: new Date(updates.date)
      };
    }

    const updatedAppointment = await handleDatabaseOperation(
      () => storage.updateAppointment(appointmentId, updates),
      'Failed to update appointment'
    );

    if (!updatedAppointment) {
      throw new AppError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }

    // Send rescheduled email to patient
    try {
      const patient = await storage.getPatient(updatedAppointment.patientId);
      if (patient && patient.email) {
        const appointmentDate = new Date(updatedAppointment.date);
        await sendPatientEmail(
          patient.email,
          `${patient.firstName} ${patient.lastName || ''}`.trim(),
          'appointmentRescheduled',
          {
            patientName: `${patient.firstName} ${patient.lastName || ''}`.trim(),
            appointmentDate: appointmentDate.toLocaleDateString(),
            appointmentTime: appointmentDate.toLocaleTimeString(),
            notes: updatedAppointment.notes || 'No additional notes'
          }
        );
      }
    } catch (emailError) {
      logError('Failed to send rescheduled email:', emailError, { requestId: (req as any).id });
      // Don't fail the request if email fails
    }

    sendSuccessResponse(res, updatedAppointment, 'Appointment updated successfully');
  }));

  // Delete appointment
  app.delete("/api/appointments/:id", requireAuth, asyncHandler(async (req, res) => {
    const appointmentId = parseInt(req.params.id);
    if (isNaN(appointmentId)) {
      throw new AppError('Invalid appointment ID', 400, 'INVALID_APPOINTMENT_ID');
    }

    // Get appointment details before deleting (for email notification)
    const appointment = await handleDatabaseOperation(
      () => storage.getAppointment(appointmentId),
      'Failed to fetch appointment'
    );

    if (!appointment) {
      throw new AppError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }

    const deleted = await handleDatabaseOperation(
      () => storage.deleteAppointment(appointmentId),
      'Failed to delete appointment'
    );

    if (!deleted) {
      throw new AppError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND');
    }

    // Send cancellation email to patient
    try {
      const patient = await storage.getPatient(appointment.patientId);
      if (patient && patient.email) {
        const appointmentDate = new Date(appointment.date);
        await sendPatientEmail(
          patient.email,
          `${patient.firstName} ${patient.lastName || ''}`.trim(),
          'appointmentCancellation',
          {
            patientName: `${patient.firstName} ${patient.lastName || ''}`.trim(),
            appointmentDate: appointmentDate.toLocaleDateString(),
            appointmentTime: appointmentDate.toLocaleTimeString(),
            notes: appointment.notes || 'No additional notes'
          }
        );
      }
    } catch (emailError) {
      logError('Failed to send cancellation email:', emailError, { requestId: (req as any).id });
      // Don't fail the request if email fails
    }

    sendSuccessResponse(res, { id: appointmentId }, 'Appointment deleted successfully');
  }));

  // Medical Notes routes
  app.get("/api/medical-notes", requireAuth, asyncHandler(async (req, res) => {
    const user = req.user as any;
    let notes;
    if (user.role === 'admin' || user.role === 'administrator') {
      notes = await handleDatabaseOperation(
        () => storage.getMedicalNotes(0, true),
        'Failed to fetch all medical notes'
      );
    } else {
      notes = await handleDatabaseOperation(
        () => storage.getMedicalNotes(req.user!.id),
        'Failed to fetch medical notes'
      );
    }
    sendSuccessResponse(res, notes);
  }));

  app.get("/api/patients/:patientId/medical-notes", requireAuth, asyncHandler(async (req, res) => {
    const patientId = parseInt(req.params.patientId);
    if (isNaN(patientId)) {
      throw new AppError('Invalid patient ID', 400, 'INVALID_PATIENT_ID');
    }

    const notes = await handleDatabaseOperation(
      () => storage.getMedicalNotesByPatient(patientId),
      'Failed to fetch medical notes'
    );

    sendSuccessResponse(res, notes);
  }));

  app.get("/api/patients/:patientId/lab-reports", requireAuth, asyncHandler(async (req, res) => {
    const patientId = parseInt(req.params.patientId);
    if (isNaN(patientId)) {
      throw new AppError('Invalid patient ID', 400, 'INVALID_PATIENT_ID');
    }

    const labReports = await handleDatabaseOperation(
      () => storage.getLabReportsByPatient(patientId),
      'Failed to fetch lab reports'
    );

    sendSuccessResponse(res, labReports);
  }));

  app.get("/api/medical-notes/:id", requireAuth, async (req: any, res: any) => {
    const note = await storage.getMedicalNote(parseInt(req.params.id));
    if (!note) return res.sendStatus(404);
    
    try {
      await createAuditLog({
        userId: req.user!.id,
        action: AUDIT_ACTIONS.NOTE_VIEW,
        resource: 'medical_note',
        resourceId: note.id,
        ipAddress: req.ip
      });
      if (note.patientId) {
        await storage.createPatientActivity({
          patientId: note.patientId,
          activityType: 'note',
          title: 'Medical Note Accessed',
          description: `Medical note accessed by ${req.user!.name || req.user!.username}`,
          createdBy: req.user!.id,
        });
      }
    } catch (err) {
      logError('Failed to create audit/activity log:', err as Error);
    }
    
    res.json(note);
  });

  // Download medical note as Word document
  app.get("/api/medical-notes/:id/download", requireAuth, asyncHandler(async (req, res) => {
    const noteId = parseInt(req.params.id);
    if (isNaN(noteId)) {
      throw new AppError('Invalid note ID', 400, 'INVALID_NOTE_ID');
    }

    const note = await handleDatabaseOperation(
      () => storage.getMedicalNote(noteId),
      'Failed to fetch medical note'
    );

    if (!note) {
      throw new AppError('Medical note not found', 404, 'NOTE_NOT_FOUND');
    }

    // Get patient info if available
    let patient = null;
    if (note.patientId) {
      patient = await handleDatabaseOperation(
        () => storage.getPatient(note.patientId!),
        'Failed to fetch patient'
      );
    }

    try {
      // Generate DOCX using the docx library
      const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');

      const docSections = [];

      // Title
      docSections.push(
        new Paragraph({
          text: note.title || "Medical Note",
          heading: HeadingLevel.TITLE,
        })
      );

      // Note type and date info
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${note.type?.toUpperCase() || 'MEDICAL'} Note • Generated ${new Date().toLocaleDateString()}`,
              italics: true,
              size: 20,
            }),
          ],
        })
      );

      docSections.push(new Paragraph({ text: "" })); // Empty line

      // Patient information if available
      if (patient) {
        docSections.push(
          new Paragraph({
            text: "Patient Information",
            heading: HeadingLevel.HEADING_1,
          })
        );

        const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
        if (patientName) {
          docSections.push(
            new Paragraph({
              children: [
                new TextRun({ text: "Name: ", bold: true }),
                new TextRun({ text: patientName }),
              ],
            })
          );
        }

        if (patient.email) {
          docSections.push(
            new Paragraph({
              children: [
                new TextRun({ text: "Email: ", bold: true }),
                new TextRun({ text: patient.email }),
              ],
            })
          );
        }

        if (patient.phone) {
          docSections.push(
            new Paragraph({
              children: [
                new TextRun({ text: "Phone: ", bold: true }),
                new TextRun({ text: patient.phone }),
              ],
            })
          );
        }

        docSections.push(new Paragraph({ text: "" })); // Empty line
      }

      // Note content
      docSections.push(
        new Paragraph({
          text: "Medical Note Content",
          heading: HeadingLevel.HEADING_1,
        })
      );

      // Split content by lines and create paragraphs
      const contentLines = (note.content || '').split('\n');
      contentLines.forEach(line => {
        docSections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: line,
                size: 24,
              }),
            ],
          })
        );
      });

      // Add timestamp
      docSections.push(new Paragraph({ text: "" })); // Empty line
      docSections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Created: ${note.createdAt ? new Date(note.createdAt).toLocaleString() : 'Unknown'}`,
              italics: true,
              size: 20,
            }),
          ],
        })
      );

      // Create the document
      const doc = new Document({
        sections: [{
          properties: {},
          children: docSections,
        }],
      });

      // Generate the DOCX buffer
      const docxBuffer = await Packer.toBuffer(doc);

      // Set headers and send file
      const filename = `medical-note-${note.id}-${new Date().toISOString().split('T')[0]}.docx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(docxBuffer);

    } catch (error) {
      logError('Error generating medical note document:', error, { requestId: (req as any).id });
      throw new AppError('Failed to generate document', 500, 'DOCUMENT_GENERATION_FAILED');
    }
  }));

  app.post("/api/medical-notes", async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    (req as any).user = user;
    const doctorId = user.id;

    const validation = insertMedicalNoteSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(validation.error);
    }

    // Verify patient exists
    if (validation.data.patientId) {
      const patient = await storage.getPatient(validation.data.patientId);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
    }

    const note = await storage.createMedicalNote({
      ...validation.data,
      doctorId: doctorId,
    });

    // Audit logging
    try {
      await createAuditLog({
        userId: req.user!.id,
        action: AUDIT_ACTIONS.NOTE_CREATE,
        resource: 'medical_note',
        resourceId: note.id,
        ipAddress: req.ip
      });
      if (note.patientId) {
        await storage.createPatientActivity({
          patientId: note.patientId,
          activityType: 'note',
          title: 'Medical Note Created',
          description: `Medical note created by ${req.user!.name || req.user!.username}`,
          createdBy: req.user!.id,
        });
      }
    } catch (err) {
      logError('Failed to create audit/activity log for note creation:', err as Error);
    }

    // Automatically complete today's appointment for this patient if it exists
    try {
      const today = new Date().toDateString();
      const appointments = await storage.getAppointments(doctorId);
      const todayAppt = appointments.find(a =>
        a.patientId === validation.data.patientId &&
        new Date(a.date).toDateString() === today &&
        a.status !== 'completed' && a.status !== 'cancelled'
      );

      if (todayAppt) {
        await storage.updateAppointmentStatus(todayAppt.id, 'completed');
        log(`✓ Appointment #${todayAppt.id} automatically marked as COMPLETED for patient #${validation.data.patientId}`);
      }
    } catch (err) {
      logError("Failed to auto-complete appointment:", err);
    }

    res.status(201).json(note);
  });

  // Quick Notes routes (notes without patient association)
  app.get("/api/quick-notes", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;
      const doctorId = user.id;

      const notes = await storage.getQuickNotes(doctorId);
      sendSuccessResponse(res, notes);
    } catch (error) {
      logError("Error fetching quick notes:", error, { requestId: (req as any).id });
      res.status(500).json({ message: "Failed to fetch quick notes" });
    }
  });

  app.post("/api/quick-notes", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;
      const doctorId = user.id;

      // Create a modified schema for quick notes that doesn't require patientId
      const quickNoteData = {
        ...req.body,
        doctorId: doctorId,
        isQuickNote: true
      };

      const note = await storage.createQuickNote(quickNoteData);
      sendSuccessResponse(res, note, 'Quick note created successfully', 201);
    } catch (error: any) {
      logError("Error creating quick note:", error, { requestId: (req as any).id });
      res.status(400).json({ message: "Failed to create quick note", error: error.message });
    }
  });

  // Consultation Notes routes
  app.get("/api/consultation-notes", async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    (req as any).user = user;
    const doctorId = user.id;

    const notes = await storage.getConsultationNotes(doctorId);
    sendSuccessResponse(res, notes);
  });

  app.get("/api/patients/:patientId/consultation-notes", async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    (req as any).user = user;

    const patientId = parseInt(req.params.patientId);
    const patient = await storage.getPatient(patientId);
    if (!patient) return res.sendStatus(404);

    const notes = await storage.getConsultationNotesByPatient(patientId);
    sendSuccessResponse(res, notes);
  });

  app.get("/api/consultation-notes/:id", async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    (req as any).user = user;

    const noteId = parseInt(req.params.id);
    if (isNaN(noteId)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    const note = await storage.getConsultationNote(noteId);
    if (!note) return res.sendStatus(404);
    sendSuccessResponse(res, note);
  });

  app.post("/api/consultation-notes", async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    (req as any).user = user;
    const doctorId = user.id;

    const validation = insertConsultationNoteSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json(validation.error);
    }

    // Verify patient exists
    const patient = await storage.getPatient(validation.data.patientId);
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    const note = await storage.createConsultationNote({
      ...validation.data,
      doctorId: doctorId,
    });

    sendSuccessResponse(res, note, 'Consultation note created successfully', 201);
  });

  // Create medical note from consultation
  app.post("/api/medical-notes/from-consultation", async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    (req as any).user = user;
    const doctorId = user.id;

    // Extract required fields from request
    const { consultationId, patientId, content, type, title } = req.body;

    // Basic validation
    if (!consultationId || !patientId || !content || !title) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    try {
      const consultationIdNum = parseInt(consultationId);
      if (isNaN(consultationIdNum)) {
        return res.status(400).json({ message: "Invalid consultation ID format" });
      }

      // Create a medical note linked to the consultation
      const medicalNote = await storage.createMedicalNoteFromConsultation(
        {
          patientId,
          doctorId: doctorId,
          content,
          type: type || 'soap',
          title
        },
        consultationIdNum
      );

      // Automatically complete today's appointment for this patient if it exists
      try {
        const today = new Date().toDateString();
        const appointments = await storage.getAppointments(doctorId);
        const todayAppt = appointments.find(a =>
          a.patientId === patientId &&
          new Date(a.date).toDateString() === today &&
          a.status !== 'completed' && a.status !== 'cancelled'
        );

        if (todayAppt) {
          await storage.updateAppointmentStatus(todayAppt.id, 'completed');
          log(`✓ Appointment #${todayAppt.id} automatically marked as COMPLETED after consultation for patient #${patientId}`);
        }
      } catch (err) {
        logError("Failed to auto-complete appointment after consultation:", err);
      }

      res.status(201).json(medicalNote);
    } catch (error: any) {
      logError("Error creating medical note from consultation:", error, { requestId: (req as any).id });
      res.status(500).json({ message: "Failed to create medical note from consultation" });
    }
  });

  // Medical Note Templates routes
  app.get("/api/medical-note-templates", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;

      const templates = await storage.getMedicalNoteTemplates();
      sendSuccessResponse(res, templates);
    } catch (error) {
      logError("Error fetching medical note templates:", error, { requestId: (req as any).id });
      res.status(500).json({ message: "Failed to fetch medical note templates" });
    }
  });

  app.get("/api/medical-note-templates/type/:type", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;

      const type = req.params.type;
      const templates = await storage.getMedicalNoteTemplatesByType(type);
      sendSuccessResponse(res, templates);
    } catch (error) {
      logError("Error fetching medical note templates by type:", error, { requestId: (req as any).id });
      res.status(500).json({ message: "Failed to fetch medical note templates" });
    }
  });

  app.get("/api/medical-note-templates/:id", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;

      const id = parseInt(req.params.id);
      const template = await storage.getMedicalNoteTemplate(id);

      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      sendSuccessResponse(res, template);
    } catch (error) {
      logError("Error fetching medical note template:", error, { requestId: (req as any).id });
      res.status(500).json({ message: "Failed to fetch medical note template" });
    }
  });

  app.post("/api/medical-note-templates", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;

      const validation = insertMedicalNoteTemplateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json(validation.error);
      }

      const template = await storage.createMedicalNoteTemplate(validation.data);
      sendSuccessResponse(res, template, 'Template created successfully', 201);
    } catch (error) {
      logError("Error creating medical note template:", error, { requestId: (req as any).id });
      res.status(500).json({ message: "Failed to create medical note template" });
    }
  });

  app.put("/api/medical-note-templates/:id", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;

      const id = parseInt(req.params.id);
      const template = await storage.getMedicalNoteTemplate(id);

      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      const updatedTemplate = await storage.updateMedicalNoteTemplate(id, req.body);
      sendSuccessResponse(res, updatedTemplate, 'Template updated successfully');
    } catch (error) {
      logError("Error updating medical note template:", error, { requestId: (req as any).id });
      res.status(500).json({ message: "Failed to update medical note template" });
    }
  });

  app.delete("/api/medical-note-templates/:id", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;

      const id = parseInt(req.params.id);
      const result = await storage.deleteMedicalNoteTemplate(id);

      if (!result) {
        return res.status(404).json({ message: "Template not found" });
      }

      sendSuccessResponse(res, { id }, 'Template deleted successfully');
    } catch (error) {
      logError("Error deleting medical note template:", error, { requestId: (req as any).id });
      res.status(500).json({ message: "Failed to delete medical note template" });
    }
  });

  // Custom note prompts routes
  app.get("/api/custom-note-prompts", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;

      const userId = user.id;
      const prompts = await storage.getCustomNotePrompts(userId);
      sendSuccessResponse(res, prompts);
    } catch (error) {
      logError("Error fetching custom note prompts:", error, { requestId: (req as any).id });
      res.status(500).json({ message: "Failed to fetch custom note prompts" });
    }
  });

  // Get all active global prompts (for dropdown menus)
  // Note: This feature requires the extended custom_note_prompts schema with is_global column
  // If the column doesn't exist, returns an empty array gracefully
  app.get("/api/global-prompts", async (req, res) => {
    try {
      // Check if the is_global column exists first
      const columnCheck = await pool.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'custom_note_prompts' AND column_name = 'is_global'
      `);

      if (columnCheck.rows.length === 0) {
        // Column doesn't exist, return empty array (feature not enabled)
        return res.json([]);
      }

      const result = await pool.query(`
        SELECT id, note_type as "noteType", name, description, 
               system_prompt as "systemPrompt", template_content as "templateContent",
               is_active as "isActive", version
        FROM custom_note_prompts 
        WHERE is_global = true AND is_active = true
        ORDER BY note_type
      `);
      res.json(result.rows);
    } catch (error) {
      logError("Error fetching global prompts:", error, { requestId: (req as any).id });
      // Return empty array instead of error to allow the app to function
      res.json([]);
    }
  });

  app.get("/api/custom-note-prompts/:noteType", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;

      const userId = user.id;
      const { noteType } = req.params;

      // First, try to get user's custom prompt
      const userPrompt = await storage.getCustomNotePrompt(userId, noteType);

      if (userPrompt) {
        return sendSuccessResponse(res, userPrompt);
      }

      // If no user prompt, return null (no global prompts in current schema)
      sendSuccessResponse(res, null);
    } catch (error) {
      logError("Error fetching custom note prompt:", error, { requestId: (req as any).id });
      res.status(500).json({ message: "Failed to fetch custom note prompt" });
    }
  });

  app.post("/api/custom-note-prompts", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;

      const userId = user.id;
      const { noteType, systemPrompt, templateContent } = req.body;

      const prompt = await storage.saveCustomNotePrompt({
        userId,
        noteType,
        systemPrompt,
        templateContent,
      });

      sendSuccessResponse(res, prompt, 'Custom prompt saved successfully');
    } catch (error) {
      logError("Error saving custom note prompt:", error, { requestId: (req as any).id });
      res.status(500).json({ message: "Failed to save custom note prompt" });
    }
  });

  app.delete("/api/custom-note-prompts/:noteType", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;

      const userId = user.id;
      const { noteType } = req.params;
      await storage.deleteCustomNotePrompt(userId, noteType);
      sendSuccessResponse(res, { success: true }, 'Custom prompt deleted successfully');
    } catch (error) {
      logError("Error deleting custom note prompt:", error, { requestId: (req as any).id });
      res.status(500).json({ message: "Failed to delete custom note prompt" });
    }
  });

  // User API Key management routes
  app.get("/api/user/api-key", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;

      const userId = user.id;
      const userData = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Only return API key info if user is configured to use their own API key
      if (!user.useOwnApiKey) {
        return res.json({
          canUseOwnApiKey: false,
          useOwnApiKey: false,
          message: "Your account is configured to use the global API key. Contact your administrator to enable personal API key usage."
        });
      }

      const apiKey = await storage.getUserApiKey(userId);

      // Return masked key for security (only show first 6 chars)
      const maskedKey = apiKey ? `${apiKey.substring(0, 6)}...` : null;
      res.json({
        canUseOwnApiKey: true,
        useOwnApiKey: true,
        hasApiKey: !!apiKey,
        maskedKey
      });
    } catch (error) {
      logError("Error fetching user API key:", error, { requestId: (req as any).id });
      res.status(500).json({ message: "Failed to fetch API key" });
    }
  });

  app.post("/api/user/api-key", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;

      const { apiKey } = req.body;
      const userId = user.id;
      const userData = await storage.getUser(userId);

      if (!userData) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user is allowed to use their own API key
      if (!userData.useOwnApiKey) {
        return res.status(403).json({
          message: "Your account is not configured to use personal API keys. Contact your administrator to enable this feature."
        });
      }

      if (!apiKey || typeof apiKey !== 'string') {
        return res.status(400).json({ message: "Valid API key is required" });
      }

      // Basic validation for OpenAI API key format
      if (!apiKey.startsWith('sk-') || apiKey.length < 40) {
        return res.status(400).json({ message: "Invalid OpenAI API key format" });
      }

      await storage.updateUserApiKey(userId, apiKey);
      res.json({ success: true, message: "API key updated successfully" });
    } catch (error) {
      logError("Error updating user API key:", error, { requestId: (req as any).id });
      res.status(500).json({ message: "Failed to update API key" });
    }
  });

  // Delete user API key
  app.delete("/api/user/api-key", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;

      const userId = user.id;
      const userData = await storage.getUser(userId);

      if (!userData) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if user is allowed to use their own API key
      if (!userData.useOwnApiKey) {
        return res.status(403).json({
          message: "Your account is not configured to use personal API keys. Contact your administrator to enable this feature."
        });
      }

      await storage.updateUserApiKey(userId, null);
      res.json({ success: true, message: "API key removed successfully" });
    } catch (error) {
      logError("Error removing user API key:", error, { requestId: (req as any).id });
      res.status(500).json({ message: "Failed to remove API key" });
    }
  });

  // Telemedicine routes

  // Invoice routes
  app.get("/api/invoices", async (req, res) => {
    try {
      // Support both JWT Bearer token and session auth
      const authHeader = req.headers.authorization;
      let userId = req.user?.id;
      
      if (!userId && authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const jwt = await import('jsonwebtoken');
          const token = authHeader.substring(7);
          const decoded = jwt.verify(token, process.env.JWT_SECRET || "aims-default-secret-change-in-production") as any;
          userId = decoded.id;
        } catch {
          return res.status(401).json({ message: "Invalid or expired token" });
        }
      }
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const invoices = await storage.getInvoices(userId);
      sendSuccessResponse(res, invoices);
    } catch (error) {
      logError("Error fetching invoices:", error, { requestId: (req as any).id });
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/patient/:patientId", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;

      const patientId = parseInt(req.params.patientId);
      const invoices = await storage.getInvoicesByPatient(patientId);
      sendSuccessResponse(res, invoices);
    } catch (error) {
      logError("Error fetching patient invoices:", error, { requestId: (req as any).id });
      res.status(500).json({ message: "Failed to fetch patient invoices" });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;

      const invoiceId = parseInt(req.params.id);
      const invoice = await storage.getInvoice(invoiceId);

      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      sendSuccessResponse(res, invoice);
    } catch (error) {
      logError("Error fetching invoice:", error, { requestId: (req as any).id });
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;
      const doctorId = user.id;

      // Create a modified request body to ensure proper types
      let dueDate;
      try {
        // Try to parse the date string in a simpler format
        if (typeof req.body.dueDate === 'string') {
          // If it's a simple YYYY-MM-DD format
          if (req.body.dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            dueDate = new Date(req.body.dueDate);
          } else {
            // Try to extract just the date part
            const dateParts = req.body.dueDate.split(/[^0-9]/);
            if (dateParts.length >= 3) {
              const year = parseInt(dateParts[0]);
              const month = parseInt(dateParts[1]) - 1; // JavaScript months are 0-based
              const day = parseInt(dateParts[2]);
              dueDate = new Date(year, month, day);
            } else {
              dueDate = new Date(); // Fallback to current date if parsing fails
            }
          }
        } else {
          dueDate = new Date(req.body.dueDate);
        }
      } catch (e) {
        logError("Error parsing date:", e, { requestId: (req as any).id });
        dueDate = new Date(); // Fallback to current date
      }

      const modifiedBody = {
        ...req.body,
        doctorId: doctorId,
        // Set the parsed date
        dueDate: dueDate
      };

      const validation = insertInvoiceSchema.safeParse(modifiedBody);
      if (!validation.success) {
        return res.status(400).json(validation.error);
      }

      const invoice = await storage.createInvoice(validation.data);
      sendSuccessResponse(res, invoice, 'Invoice created successfully', 201);
    } catch (error) {
      logError("Error creating invoice:", error, { requestId: (req as any).id });
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  app.patch("/api/invoices/:id/status", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;

      const invoiceId = parseInt(req.params.id);
      const { status } = req.body;

      const invoice = await storage.updateInvoiceStatus(invoiceId, status);

      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      sendSuccessResponse(res, invoice, 'Invoice status updated successfully');
    } catch (error) {
      logError("Error updating invoice status:", error, { requestId: (req as any).id });
      res.status(500).json({ message: "Failed to update invoice status" });
    }
  });

  app.patch("/api/invoices/:id/payment", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;

      const invoiceId = parseInt(req.params.id);
      const { amountPaid } = req.body;

      const invoice = await storage.updateInvoicePayment(invoiceId, amountPaid);

      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      sendSuccessResponse(res, invoice, 'Invoice payment updated successfully');
    } catch (error) {
      logError("Error updating invoice payment:", error, { requestId: (req as any).id });
      res.status(500).json({ message: "Failed to update invoice payment" });
    }
  });

  app.get('/api/telemedicine/rooms', (req, res) => {
    // For development, we're not requiring authentication
    // This would be required in production: if (!req.isAuthenticated()) {
    //  return res.status(401).json({ message: 'Unauthorized' });
    // }

    // Convert activeRooms to array of room objects (without socket objects for serialization)
    const rooms = Array.from(activeRooms.entries()).map(([id, room]) => ({
      id,
      participants: room.participants.map(p => ({
        id: p.id,
        name: p.name,
        isDoctor: p.isDoctor
      }))
    }));

    res.json(rooms);
  });

  // Get recording sessions (history of telemedicine consultations)
  app.get('/api/telemedicine/recordings', async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;
      const doctorId = user.id;

      const recordings = await storage.getRecordingSessions(doctorId);

      // Get patient details for each recording
      const recordingsWithPatients = await Promise.all(
        recordings.map(async (recording) => {
          const patient = await storage.getPatient(recording.patientId);
          return {
            ...recording,
            patient: patient || null
          };
        })
      );

      sendSuccessResponse(res, recordingsWithPatients);
    } catch (error) {
      logError('Error fetching recording sessions:', error, { requestId: (req as any).id });
      res.status(500).json({ message: 'Failed to fetch recording sessions' });
    }
  });

  // Create a new recording session
  app.post('/api/telemedicine/recordings', async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;
      const doctorId = user.id;
      const { roomId, patientId, startTime, endTime, duration, status, recordingType, mediaFormat, language } = req.body;

      log('Creating recording session:', { requestId: (req as any).id, roomId, patientId, duration, recordingType, mediaFormat, language });

      if (!roomId || !patientId) {
        return res.status(400).json({ message: 'Missing required fields: roomId and patientId' });
      }

      const recording = await storage.createRecordingSession({
        roomId,
        patientId,
        doctorId,
        startTime: startTime ? new Date(startTime) : new Date(),
        endTime: endTime ? new Date(endTime) : new Date(),
        duration: duration || 0,
        status: status || 'completed',
        recordingType: recordingType || 'both',
        mediaFormat: mediaFormat || 'webm',
        language: language || 'en-US',
        transcript: null,
        notes: null
      });

      log('Recording session created:', { requestId: (req as any).id, recordingId: recording.id });

      sendSuccessResponse(res, recording, 'Recording session created successfully', 201);
    } catch (error) {
      logError('Error creating recording session:', error, { requestId: (req as any).id });
      res.status(500).json({ message: 'Failed to create recording session' });
    }
  });

  // Get a specific recording session
  app.get('/api/telemedicine/recordings/:id', async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid recording ID format' });
      }

      const recording = await storage.getRecordingSession(id);
      if (!recording) {
        return res.status(404).json({ message: 'Recording session not found' });
      }

      const patient = await storage.getPatient(recording.patientId);

      sendSuccessResponse(res, {
        ...recording,
        patient: patient || { name: 'Unknown Patient' }
      });
    } catch (error) {
      logError('Error fetching recording session:', error, { requestId: (req as any).id });
      res.status(500).json({ message: 'Failed to fetch recording session' });
    }
  });

  // Update transcript or notes for a recording session
  app.patch('/api/telemedicine/recordings/:id', async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid recording ID format' });
      }

      const { transcript, notes } = req.body;
      if (!transcript && !notes) {
        return res.status(400).json({ message: 'Must provide transcript or notes to update' });
      }

      const updates: Partial<RecordingSession> = {};
      if (transcript) updates.transcript = transcript;
      if (notes) updates.notes = notes;

      const updatedRecording = await storage.updateRecordingSession(id, updates);
      if (!updatedRecording) {
        return res.status(404).json({ message: 'Recording session not found' });
      }

      // Automatically delete audio recording after transcription is generated
      if (transcript && updatedRecording.audioUrl) {
        try {
          await FileStorage.deleteRecording(id, 'audio');
          // Update database to remove audioUrl since file is deleted
          const finalRecording = await storage.updateRecordingSession(id, { audioUrl: null });
          log(`Deleted audio recording for session ${id} after transcription`, { requestId: (req as any).id });
          // Return the updated recording with audioUrl set to null
          return res.json(finalRecording);
        } catch (error) {
          logError(`Failed to delete audio recording for session ${id}:`, error, { requestId: (req as any).id });
          // Don't fail the request if cleanup fails
        }
      }

      res.json(updatedRecording);
    } catch (error) {
      logError('Error updating recording session:', error, { requestId: (req as any).id });
      res.status(500).json({ message: 'Failed to update recording session' });
    }
  });

  // Generate transcript from video recording using Deepgram
  app.patch('/api/telemedicine/recordings/:id/generate-transcript', async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid recording ID format' });
      }

      const recording = await storage.getRecordingSession(id);
      if (!recording) {
        return res.status(404).json({ message: 'Recording session not found' });
      }

      if (!recording.videoUrl) {
        return res.status(400).json({ message: 'No video recording available for transcription' });
      }

      // Check if Deepgram API key is available
      if (!process.env.DEEPGRAM_API_KEY) {
        return res.status(500).json({ message: 'Deepgram API key not configured' });
      }

      try {
        // Import Deepgram SDK
        const { createClient } = await import('@deepgram/sdk');
        const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

        // Get the video file URL (Cloudinary URL)
        const videoUrl = recording.videoUrl;

        // Transcribe using Deepgram's URL source
        const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
          { url: videoUrl },
          {
            model: 'nova-2',
            smart_format: true,
            punctuate: true,
            paragraphs: true,
            utterances: true,
            language: recording.language || 'en'
          }
        );

        if (error) {
          logError('Deepgram transcription error:', error, { requestId: (req as any).id });
          return res.status(500).json({ message: 'Failed to transcribe video: ' + error.message });
        }

        // Extract transcript from Deepgram response
        const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript ||
          result?.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.transcript ||
          '';

        if (!transcript) {
          return res.status(500).json({ message: 'No transcript generated from video' });
        }

        // Update the recording with the transcript
        const updatedRecording = await storage.updateRecordingSession(id, { transcript });

        res.json({
          ...updatedRecording,
          message: 'Transcript generated successfully'
        });
      } catch (deepgramError: any) {
        logError('Deepgram API error:', deepgramError, { requestId: (req as any).id });
        return res.status(500).json({
          message: 'Transcription failed: ' + (deepgramError.message || 'Unknown error')
        });
      }
    } catch (error) {
      logError('Error generating transcript:', error, { requestId: (req as any).id });
      res.status(500).json({ message: 'Failed to generate transcript' });
    }
  });

  // Delete a recording session
  app.delete('/api/telemedicine/recordings/:id', async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;
      const doctorId = user.id;
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid recording ID format' });
      }

      const recording = await storage.getRecordingSession(id);

      if (!recording) {
        return res.status(404).json({ message: 'Recording not found' });
      }

      // Security check: Only allow the doctor who owns the recording to delete it
      if (recording.doctorId !== doctorId) {
        return res.status(403).json({ message: 'Not authorized to delete this recording' });
      }

      // Delete the recording
      const deleted = await storage.deleteRecordingSession(id);

      if (!deleted) {
        return res.status(500).json({ message: 'Failed to delete recording' });
      }

      res.status(200).json({ message: 'Recording deleted successfully' });
    } catch (error) {
      logError('Error deleting recording:', error, { requestId: (req as any).id });
      res.status(500).json({ message: 'Failed to delete recording' });
    }
  });

  // Upload media (audio or video) for a telemedicine recording
  const uploadMediaMiddleware = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 500 * 1024 * 1024, // 500MB limit for long video recordings (45+ minutes)
    }
  }).single('media');

  app.post('/api/telemedicine/recordings/:id/media', uploadMediaMiddleware, async (req, res) => {
    // Increase timeout for large file uploads (30 minutes for 45+ min recordings)
    req.setTimeout(1800000); // 30 minutes
    res.setTimeout(1800000); // 30 minutes

    try {
      log(`=== MEDIA UPLOAD START ===`, { requestId: (req as any).id });
      log(`Received media upload request for recording ${req.params.id}`, { requestId: (req as any).id });
      log(`Request authenticated: ${req.isAuthenticated()}`, { requestId: (req as any).id });

      const user = await getAuthenticatedUser(req);
      if (!user) {
        log('Upload rejected: not authenticated', { requestId: (req as any).id });
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;
      const doctorId = user.id;
      const recordingId = parseInt(req.params.id);
      log(`Doctor ID: ${doctorId}, Recording ID: ${recordingId}`, { requestId: (req as any).id });

      if (isNaN(recordingId)) {
        log('Upload rejected: invalid recording ID', { requestId: (req as any).id });
        return res.status(400).json({ message: 'Invalid recording ID format' });
      }

      if (!req.file) {
        log('Upload rejected: no file uploaded', { requestId: (req as any).id });
        log('Request body:', { requestId: (req as any).id, body: req.body });
        return res.status(400).json({ message: 'No file uploaded' });
      }

      log(`File received: ${req.file.originalname}, size: ${req.file.size} bytes (${(req.file.size / 1024 / 1024).toFixed(2)} MB)`, { requestId: (req as any).id });
      log(`File mimetype: ${req.file.mimetype}`, { requestId: (req as any).id });

      // Get the recording session
      const recording = await storage.getRecordingSession(recordingId);

      if (!recording) {
        log(`Upload rejected: recording ${recordingId} not found in database`, { requestId: (req as any).id });
        return res.status(404).json({ message: 'Recording not found' });
      }

      log(`Recording found - Doctor ID: ${recording.doctorId}, Status: ${recording.status}`, { requestId: (req as any).id });

      // Security check: Only allow the doctor who owns the recording to upload to it
      if (recording.doctorId !== doctorId) {
        log(`Upload rejected: doctor ${doctorId} does not own recording ${recordingId} (owner: ${recording.doctorId})`, { requestId: (req as any).id });
        return res.status(403).json({ message: 'You do not have permission to modify this recording' });
      }

      const mediaType = (req.body.type || 'audio') as 'audio' | 'video';
      const fileBuffer = req.file.buffer;
      const extension = req.file.originalname.split('.').pop() || 'webm';

      log(`Starting Cloudinary upload - Type: ${mediaType}, Extension: ${extension}`, { requestId: (req as any).id });
      log(`Buffer size: ${fileBuffer.length} bytes`, { requestId: (req as any).id });

      // Upload the file to Cloudinary
      const cloudinaryUrl = await CloudinaryStorage.uploadRecording(
        recordingId,
        fileBuffer,
        mediaType,
        extension
      );

      log(`✓ Successfully uploaded to Cloudinary: ${cloudinaryUrl}`, { requestId: (req as any).id });

      // Update the recording session with the Cloudinary URL
      const updateData: any = {};
      if (mediaType === 'audio') {
        updateData.audioUrl = cloudinaryUrl;
      } else {
        updateData.videoUrl = cloudinaryUrl;
      }

      log(`Updating database with ${mediaType}Url...`, { requestId: (req as any).id });

      // Update the database record
      await storage.updateRecordingSession(recordingId, updateData);

      log(`✓ Database updated successfully`, { requestId: (req as any).id });
      log(`=== MEDIA UPLOAD COMPLETE ===`, { requestId: (req as any).id });

      res.status(200).json({
        message: `${mediaType} recording uploaded successfully`,
        recordingId,
        url: cloudinaryUrl
      });
    } catch (error) {
      logError(`❌ Error uploading recording:`, error, { requestId: (req as any).id });
      logError(`Error stack:`, error instanceof Error ? error.stack : 'No stack trace', { requestId: (req as any).id });
      res.status(500).json({
        message: 'Failed to upload recording',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Retrieve audio recording for a telemedicine session
  app.get('/api/telemedicine/recordings/:id/audio', async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;
      const doctorId = user.id;
      const recordingId = parseInt(req.params.id);

      if (isNaN(recordingId)) {
        return res.status(400).json({ message: 'Invalid recording ID format' });
      }

      const recording = await storage.getRecordingSession(recordingId);

      if (!recording) {
        return res.status(404).json({ message: 'Recording not found' });
      }

      // Security check: Only allow the doctor who owns the recording to access it
      if (recording.doctorId !== doctorId) {
        return res.status(403).json({ message: 'You do not have permission to access this recording' });
      }

      // If we have a Cloudinary URL, redirect to it
      if (recording.audioUrl && recording.audioUrl.includes('cloudinary.com')) {
        return res.redirect(recording.audioUrl);
      }

      // Fallback: try to retrieve from local file storage
      const audioBuffer = await FileStorage.getRecording(recordingId, 'audio');

      if (!audioBuffer) {
        return res.status(404).json({ message: 'Audio recording not found' });
      }

      const filepath = await FileStorage.getFilePath(recordingId, 'audio');
      if (!filepath) {
        return res.status(404).json({ message: 'Audio recording filepath not found' });
      }

      const contentType = await FileStorage.getContentType(filepath);
      const filename = filepath.split('/').pop() || 'audio.webm';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(audioBuffer);
    } catch (error) {
      logError('Error retrieving audio recording:', error, { requestId: (req as any).id });
      res.status(500).json({ message: 'Failed to retrieve audio recording' });
    }
  });

  // Retrieve video recording for a telemedicine session
  app.get('/api/telemedicine/recordings/:id/video', async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;
      const doctorId = user.id;
      const recordingId = parseInt(req.params.id);

      if (isNaN(recordingId)) {
        return res.status(400).json({ message: 'Invalid recording ID format' });
      }

      const recording = await storage.getRecordingSession(recordingId);

      if (!recording) {
        return res.status(404).json({ message: 'Recording not found' });
      }

      // Security check: Only allow the doctor who owns the recording to access it
      if (recording.doctorId !== doctorId) {
        return res.status(403).json({ message: 'You do not have permission to access this recording' });
      }

      // If we have a Cloudinary URL, redirect to it
      if (recording.videoUrl && recording.videoUrl.includes('cloudinary.com')) {
        return res.redirect(recording.videoUrl);
      }

      // Fallback: try to retrieve from local file storage
      const videoBuffer = await FileStorage.getRecording(recordingId, 'video');

      if (!videoBuffer) {
        return res.status(404).json({ message: 'Video recording not found' });
      }

      const filepath = await FileStorage.getFilePath(recordingId, 'video');
      if (!filepath) {
        return res.status(404).json({ message: 'Video recording filepath not found' });
      }

      const contentType = await FileStorage.getContentType(filepath);
      const filename = filepath.split('/').pop() || 'video.webm';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(videoBuffer);
    } catch (error) {
      logError('Error retrieving video recording:', error, { requestId: (req as any).id });
      res.status(500).json({ message: 'Failed to retrieve video recording' });
    }
  });

  // Store video recording for a telemedicine session
  app.post('/api/telemedicine/recordings/:id/video', async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;
      const doctorId = user.id;
      const recordingId = parseInt(req.params.id);

      if (isNaN(recordingId)) {
        return res.status(400).json({ message: 'Invalid recording ID format' });
      }

      const recording = await storage.getRecordingSession(recordingId);

      if (!recording) {
        return res.status(404).json({ message: 'Recording not found' });
      }

      // Security check: Only allow the doctor who owns the recording to modify it
      if (recording.doctorId !== doctorId) {
        return res.status(403).json({ message: 'You do not have permission to modify this recording' });
      }

      // In a production environment, we would:
      // 1. Get the video file from the request
      // 2. Store it in blob storage
      // 3. Update the recording record with the URL

      // For now, update the recording to indicate it has video
      const updatedRecording = await storage.updateRecordingSession(recordingId, {
        recordingType: req.body.hasVideo ? 'both' : 'audio',
        mediaFormat: req.body.mediaFormat || 'webm',
        videoUrl: req.body.videoUrl || null
      });

      res.status(200).json(updatedRecording);
    } catch (error) {
      logError('Error storing video recording:', error, { requestId: (req as any).id });
      res.status(500).json({ message: 'Failed to store video recording' });
    }
  });

  app.post('/api/telemedicine/rooms', async (req, res) => {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    (req as any).user = user;
    const doctorId = user.id;

    const { patientId, patientName } = req.body;

    if (!patientId || !patientName) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Generate room ID
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    try {
      // Create new room
      activeRooms.set(roomId, {
        id: roomId,
        participants: []
      });

      // Create recording session in database
      const recordingSession = await storage.createRecordingSession({
        roomId,
        patientId,
        doctorId: doctorId,
        status: 'active',
        transcript: null,
        notes: null
      });

      res.status(201).json({ roomId, recordingSessionId: recordingSession.id });
    } catch (error) {
      logError('Error creating telemedicine room:', error, { requestId: (req as any).id });
      res.status(500).json({ message: 'Failed to create telemedicine room' });
    }
  });

  const httpServer = createServer(app);

  // Create WebSocket server on the same HTTP server but with a distinct path
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/ws/telemedicine'
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws: any) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('connection', (socket: any) => {
    log('New WebSocket connection established', { requestId: 'ws-connection' });

    socket.isAlive = true;
    socket.on('pong', () => {
      socket.isAlive = true;
    });

    // Initialize participant data
    let participantId: string | null = null;
    let roomId: string | null = null;

    socket.on('message', async (message: any) => {
      try {
        const data = JSON.parse(message.toString());

        switch (data.type) {
          case 'join':
            // User joining a room
            roomId = data.roomId;
            participantId = data.userId;
            const room = activeRooms.get(roomId as string);

            if (!room) {
              socket.send(JSON.stringify({
                type: 'error',
                message: 'Room not found'
              }));
              return;
            }

            // Add participant to room
            room.participants.push({
              id: data.userId,
              socket,
              name: data.name,
              isDoctor: data.isDoctor
            });

            // Notify other participants in the room about the new participant
            room.participants.forEach(participant => {
              if (participant.id !== data.userId) {
                participant.socket.send(JSON.stringify({
                  type: 'user-joined',
                  userId: data.userId,
                  name: data.name,
                  isDoctor: data.isDoctor
                }));
              }
            });

            // Send the list of existing participants to the new participant
            socket.send(JSON.stringify({
              type: 'room-users',
              users: room.participants.map(p => ({
                id: p.id,
                name: p.name,
                isDoctor: p.isDoctor
              }))
            }));

            break;

          case 'start-transcription':
            // Doctor initiates live transcription
            if (data.isDoctor && data.roomId) {
              try {
                await startLiveTranscription(data.roomId, socket);
                log(`📝 Live transcription started for room: ${data.roomId}`, { requestId: 'ws-transcription' });
              } catch (error) {
                logError('Error starting transcription:', error, { requestId: 'ws-transcription' });
                socket.send(JSON.stringify({
                  type: 'transcription-error',
                  message: 'Failed to start live transcription'
                }));
              }
            }
            break;

          case 'audio-data':
            // Stream audio data to Deepgram for live transcription
            if (data.roomId && data.audioData) {
              try {
                const audioBuffer = Buffer.from(data.audioData, 'base64');
                sendAudioToDeepgram(data.roomId, audioBuffer);
              } catch (error) {
                logError('Error processing audio data:', error, { requestId: 'ws-transcription' });
              }
            }
            break;

          case 'stop-transcription':
            // Stop live transcription and get full transcript
            if (data.roomId) {
              try {
                const fullTranscript = await stopLiveTranscription(data.roomId);
                socket.send(JSON.stringify({
                  type: 'transcription-complete',
                  roomId: data.roomId,
                  transcript: fullTranscript
                }));
              } catch (error) {
                logError('Error stopping transcription:', error, { requestId: 'ws-transcription' });
              }
            }
            break;

          case 'visual-frame':
            // AI visual health assessment of patient video frame
            // Only doctors can request visual assessment
            if (data.isDoctor && data.imageData && data.roomId) {
              try {
                const { analyzePatientVisual } = await import('./visual-health-assessment');

                // Extract base64 image data (remove data:image/jpeg;base64, prefix if present)
                const base64Image = data.imageData.replace(/^data:image\/\w+;base64,/, '');

                const assessment = await analyzePatientVisual(base64Image, {
                  name: data.patientName,
                  chiefComplaint: data.chiefComplaint,
                  currentSymptoms: data.currentSymptoms
                });

                // Send assessment back to doctor only
                socket.send(JSON.stringify({
                  type: 'visual-assessment',
                  roomId: data.roomId,
                  assessment
                }));

                log(`🔍 Visual health assessment completed for room: ${data.roomId}`, { requestId: 'ws-visual-assessment' });
              } catch (error) {
                logError('Error in visual assessment:', error, { requestId: 'ws-visual-assessment' });
                socket.send(JSON.stringify({
                  type: 'visual-assessment-error',
                  message: 'Failed to analyze visual frame'
                }));
              }
            }
            break;

          case 'offer':
          case 'answer':
          case 'ice-candidate':
          case 'chat-message':
            // Handle WebRTC signaling and chat messages

            // Make sure roomId is taken from message if not already set in socket connection
            const messageRoomId = data.roomId || roomId;
            if (!messageRoomId) {
              logError('No room ID found in message or socket state:', data, { requestId: 'ws-webrtc' });
              socket.send(JSON.stringify({
                type: 'error',
                message: 'No room ID provided. Please join a room first.'
              }));
              return;
            }

            const targetRoom = activeRooms.get(messageRoomId);
            if (!targetRoom) {
              logError('Room not found with ID:', messageRoomId, { requestId: 'ws-webrtc' });
              socket.send(JSON.stringify({
                type: 'error',
                message: 'Room not found with ID: ' + messageRoomId
              }));
              return;
            }

            // For chat messages, broadcast to all participants in the room
            if (data.type === 'chat-message') {
              log('Broadcasting chat message in room:', { requestId: 'ws-chat', roomId: messageRoomId });
              targetRoom.participants.forEach(participant => {
                if (participant.id !== data.sender) {
                  participant.socket.send(JSON.stringify({
                    type: 'chat-message',
                    sender: data.sender,
                    senderName: data.senderName,
                    text: data.text,
                    roomId: messageRoomId
                  }));
                }
              });
              break;
            }

            // For WebRTC signals, find the target participant
            const targetParticipant = targetRoom.participants.find(p => p.id === data.target);
            if (targetParticipant) {
              // Forward the WebRTC signaling message with proper formatting
              // Always pass the roomId to ensure proper room tracking
              if (data.type === 'offer') {
                log('Server forwarding offer with room ID:', { requestId: 'ws-webrtc', roomId: messageRoomId });
                targetParticipant.socket.send(JSON.stringify({
                  type: 'offer',
                  from: data.sender,
                  roomId: messageRoomId,
                  offer: data.data
                }));
              } else if (data.type === 'answer') {
                log('Server forwarding answer with room ID:', { requestId: 'ws-webrtc', roomId: messageRoomId });
                targetParticipant.socket.send(JSON.stringify({
                  type: 'answer',
                  from: data.sender,
                  roomId: messageRoomId,
                  answer: data.data
                }));
              } else if (data.type === 'ice-candidate') {
                log('Server forwarding ICE candidate with room ID:', { requestId: 'ws-webrtc', roomId: messageRoomId });
                targetParticipant.socket.send(JSON.stringify({
                  type: 'ice-candidate',
                  from: data.sender,
                  roomId: messageRoomId,
                  candidate: data.data
                }));
              }
            } else {
              log('Target participant not found:', { requestId: 'ws-webrtc', target: data.target });
            }
            break;

          case 'ping':
            socket.send(JSON.stringify({ type: 'pong' }));
            break;

          case 'pong':
            // Heartbeat received from client
            socket.isAlive = true;
            break;

          default:
            log('Unknown message type:', { requestId: 'ws-unknown', type: data.type });
        }
      } catch (error) {
        logError('Error processing WebSocket message:', error, { requestId: 'ws-error' });
      }
    });

    socket.on('close', async () => {
      log('WebSocket connection closed', { requestId: 'ws-connection' });

      // Remove participant from room when they disconnect
      if (roomId && participantId) {
        const room = activeRooms.get(roomId as string);
        if (room) {
          // Remove participant
          room.participants = room.participants.filter(p => p.id !== participantId);

          // Notify other participants
          room.participants.forEach(participant => {
            participant.socket.send(JSON.stringify({
              type: 'user-left',
              userId: participantId
            }));
          });

          // If room is empty, delete it and update recording session
          if (room.participants.length === 0) {
            activeRooms.delete(roomId);

            try {
              // Get recording session by room ID
              const session = await storage.getRecordingSessionByRoomId(roomId);
              if (session) {
                // Update session with end time and status
                const endTime = new Date();
                const duration = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000); // in seconds

                await storage.updateRecordingSession(session.id, {
                  endTime,
                  duration,
                  status: 'completed'
                });
              }
            } catch (error) {
              logError('Error updating recording session on room close:', error, { requestId: 'ws-connection' });
            }
          }
        }
      }
    });
  });

  // Patient intake form routes
  app.get("/api/intake-forms", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;
      const doctorId = user.id;

      const forms = await storage.getIntakeForms(doctorId);
      res.json(forms);
    } catch (error: any) {
      logError("Error fetching intake forms:", error, { requestId: (req as any).id });
      res.status(500).json({ message: "Failed to fetch intake forms" });
    }
  });

  app.get("/api/intake-forms/:id", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;

      const formId = parseInt(req.params.id);
      if (isNaN(formId)) {
        return res.status(400).json({ message: "Invalid ID format" });
      }

      const form = await storage.getIntakeForm(formId);
      if (!form) {
        return res.status(404).json({ message: "Intake form not found" });
      }

      // Get responses for this form
      const responses = await storage.getIntakeFormResponses(formId);

      res.json({
        ...form,
        responses
      });
    } catch (error: any) {
      logError("Error fetching intake form:", error, { requestId: (req as any).id });
      res.status(500).json({ message: "Failed to fetch intake form" });
    }
  });

  app.post("/api/intake-forms", async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      (req as any).user = user;
      const doctorId = user.id;

      log("Creating intake form with data:", { requestId: (req as any).id, body: req.body });

      // Set the authenticated doctor ID
      req.body.doctorId = doctorId;

      if (!req.body.uniqueLink) {
        // Generate a unique link for the form if not provided
        req.body.uniqueLink = `intake_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }

      if (!req.body.status) {
        req.body.status = "pending"; // Set default status
      }

      // One week expiration by default if not set
      if (!req.body.expiresAt) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        req.body.expiresAt = expiresAt;
      }

      const validation = insertIntakeFormSchema.safeParse(req.body);
      if (!validation.success) {
        logError("Validation error:", validation.error.format(), { requestId: (req as any).id });
        return res.status(400).json({
          message: "Invalid form data",
          issues: validation.error.format()
        });
      }

      const intakeForm = await storage.createIntakeForm(validation.data);

      res.status(201).json(intakeForm);
    } catch (error: any) {
      logError("Error creating intake form:", error, { requestId: (req as any).id });
      res.status(500).json({ message: "Failed to create intake form: " + (error.message || "Unknown error") });
    }
  });

  // Public endpoint to access the intake form by its unique link
  app.get("/api/public/intake-form/:uniqueLink", async (req, res) => {
    try {
      const { uniqueLink } = req.params;

      const form = await storage.getIntakeFormByLink(uniqueLink);
      if (!form) {
        return res.status(404).json({ message: "Intake form not found" });
      }

      // Check if form is expired
      if (form.status === "expired" || (form.expiresAt && new Date(form.expiresAt) < new Date())) {
        return res.status(403).json({ message: "This intake form has expired" });
      }

      // Check if form is already completed
      if (form.status === "completed") {
        return res.status(403).json({ message: "This intake form has already been completed" });
      }

      // Get existing responses for this form
      const responses = await storage.getIntakeFormResponses(form.id);

      res.json({
        ...form,
        responses
      });
    } catch (error: any) {
      logError("Error fetching public intake form:", error, { requestId: (req as any).id });
      res.status(500).json({ message: "Failed to fetch intake form" });
    }
  });

  // Submit response for a specific intake form
  app.post("/api/public/intake-form/:formId/responses", async (req, res) => {
    try {
      const formId = parseInt(req.params.formId);

      if (isNaN(formId)) {
        return res.status(400).json({ message: "Invalid form ID" });
      }

      // Make sure the form exists and is valid for submission
      const form = await storage.getIntakeForm(formId);
      if (!form) {
        return res.status(404).json({ message: "Intake form not found" });
      }

      // Check if form is expired or completed
      if (form.status === "expired" || form.status === "completed") {
        return res.status(403).json({ message: "This intake form cannot accept responses" });
      }

      // Validate the response data
      const responseData = {
        ...req.body,
        formId
      };

      const validation = insertIntakeFormResponseSchema.safeParse(responseData);
      if (!validation.success) {
        return res.status(400).json(validation.error);
      }

      // Save the response
      const response = await storage.createIntakeFormResponse(validation.data);

      res.status(201).json(response);
    } catch (error: any) {
      logError("Error saving intake form response:", error, { requestId: (req as any).id });
      res.status(500).json({ message: "Failed to save response" });
    }
  });

  // Complete an intake form
  app.post("/api/public/intake-form/:formId/submit-continuous", async (req, res) => {
    try {
      const formId = parseInt(req.params.formId);

      if (isNaN(formId)) {
        return res.status(400).json({ message: "Invalid form ID" });
      }

      const { answers, summary, transcript, language, consentGiven, signature, audioUrl } = req.body;

      // Make sure the form exists
      const form = await storage.getIntakeForm(formId);
      if (!form) {
        return res.status(404).json({ message: "Intake form not found" });
      }

      // Save all extracted answers as individual responses
      if (answers && typeof answers === 'object') {
        let questionId = 1;
        for (const [key, value] of Object.entries(answers)) {
          if (value && typeof value === 'string' && value !== 'Not provided') {
            await storage.createIntakeFormResponse({
              formId,
              questionId: key,
              question: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              answer: value,
              answerType: 'voice_extracted',
              audioUrl: null
            });
          }
          questionId++;
        }
      }

      // Save the summary as a special response
      if (summary) {
        await storage.createIntakeFormResponse({
          formId,
          questionId: 'ai_summary',
          question: 'AI Clinical Summary',
          answer: summary,
          answerType: 'ai_summary',
          audioUrl: null
        });
      }

      // Save the full transcript
      if (transcript) {
        await storage.createIntakeFormResponse({
          formId,
          questionId: 'full_transcript',
          question: 'Full Voice Transcript',
          answer: transcript,
          answerType: 'transcript',
          audioUrl: audioUrl || null
        });
      }

      // Save consent and signature info
      if (consentGiven) {
        await storage.createIntakeFormResponse({
          formId,
          questionId: 'consent',
          question: 'Patient Consent',
          answer: `Consent given on ${new Date().toISOString()} for language: ${language}`,
          answerType: 'consent',
          audioUrl: null
        });
      }

      if (signature) {
        await storage.createIntakeFormResponse({
          formId,
          questionId: 'signature',
          question: 'Patient Signature',
          answer: 'Signature provided (image data stored)',
          answerType: 'signature',
          audioUrl: signature // Store signature data URL
        });
      }

      res.json({ success: true, message: "Intake form data saved successfully" });
    } catch (error: any) {
      logError("Error saving continuous intake form:", error, { requestId: (req as any).id });
      res.status(500).json({ message: "Failed to save intake form data" });
    }
  });

  app.post("/api/public/intake-form/:formId/complete", async (req, res) => {
    try {
      const formId = parseInt(req.params.formId);

      if (isNaN(formId)) {
        return res.status(400).json({ message: "Invalid form ID" });
      }

      // Make sure the form exists
      const form = await storage.getIntakeForm(formId);
      if (!form) {
        return res.status(404).json({ message: "Intake form not found" });
      }

      // Update the form status to completed
      const updatedForm = await storage.updateIntakeFormStatus(formId, "completed");

      res.json(updatedForm);
    } catch (error: any) {
      logError("Error completing intake form:", error, { requestId: (req as any).id });
      res.status(500).json({ message: "Failed to complete intake form" });
    }
  });

  // Medical Alerts routes
  app.get('/api/patients/:patientId/medical-alerts', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const patientId = parseInt(req.params.patientId);
    const alerts = await handleDatabaseOperation(() =>
      storage.getMedicalAlertsByPatient(patientId)
    );
    sendSuccessResponse(res, alerts);
  }));

  app.post('/api/patients/:patientId/medical-alerts', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const patientId = parseInt(req.params.patientId);
    const user = req.user!;
    const alertData = {
      ...req.body,
      patientId,
      createdBy: user.id
    };
    const alert = await handleDatabaseOperation(() =>
      storage.createMedicalAlert(alertData)
    );
    sendSuccessResponse(res, alert);
  }));

  app.put('/api/medical-alerts/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const alert = await handleDatabaseOperation(() =>
      storage.updateMedicalAlert(id, req.body)
    );
    sendSuccessResponse(res, alert);
  }));

  app.delete('/api/medical-alerts/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    await handleDatabaseOperation(() =>
      storage.deleteMedicalAlert(id)
    );
    sendSuccessResponse(res, { success: true });
  }));

  // Patient Activity routes
  app.get('/api/patients/:patientId/activity', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const patientId = parseInt(req.params.patientId);
    const activities = await handleDatabaseOperation(() =>
      storage.getPatientActivity(patientId)
    );
    sendSuccessResponse(res, activities);
  }));

  app.post('/api/patients/:patientId/activity', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const patientId = parseInt(req.params.patientId);
    const user = req.user!;
    const activityData = {
      ...req.body,
      patientId,
      createdBy: user.id
    };
    const activity = await handleDatabaseOperation(() =>
      storage.createPatientActivity(activityData)
    );
    sendSuccessResponse(res, activity);
  }));

  app.delete('/api/patient-activity/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    await handleDatabaseOperation(() =>
      storage.deletePatientActivity(id)
    );
    sendSuccessResponse(res, { success: true });
  }));

  // Prescriptions routes
  app.get('/api/patients/:patientId/prescriptions', requireAuth, asyncHandler(async (req: any, res: any) => {
    const patientId = parseInt(req.params.patientId);
    const prescriptions = await handleDatabaseOperation(() =>
      storage.getPrescriptionsByPatient(patientId)
    );
    
    try {
      await createAuditLog({
        userId: req.user!.id,
        action: AUDIT_ACTIONS.PRESCRIPTION_VIEW,
        resource: 'patient',
        resourceId: patientId,
        ipAddress: req.ip
      });
      await storage.createPatientActivity({
        patientId: patientId,
        activityType: 'view',
        title: 'Prescriptions Accessed',
        description: `Prescriptions accessed by ${req.user!.name || req.user!.username}`,
        createdBy: req.user!.id,
      });
    } catch (err) {
      logError('Failed to create audit/activity log:', err as Error);
    }
    
    sendSuccessResponse(res, prescriptions);
  }));

  app.post('/api/patients/:patientId/prescriptions', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const patientId = parseInt(req.params.patientId);
    const user = req.user!;
    const prescriptionData = {
      ...req.body,
      patientId,
      prescribedBy: user.id
    };
    const prescription = await handleDatabaseOperation(() =>
      storage.createPrescription(prescriptionData)
    );
    sendSuccessResponse(res, prescription);
  }));

  app.put('/api/prescriptions/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const prescription = await handleDatabaseOperation(() =>
      storage.updatePrescription(id, req.body)
    );
    sendSuccessResponse(res, prescription);
  }));

  app.delete('/api/prescriptions/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    await handleDatabaseOperation(() =>
      storage.deletePrescription(id)
    );
    sendSuccessResponse(res, { success: true });
  }));

  // Medical History Entries routes
  app.get('/api/patients/:patientId/medical-history', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const patientId = parseInt(req.params.patientId);
    const entries = await handleDatabaseOperation(() =>
      storage.getMedicalHistoryEntriesByPatient(patientId)
    );
    sendSuccessResponse(res, entries);
  }));

  app.post('/api/patients/:patientId/medical-history', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const patientId = parseInt(req.params.patientId);
    const user = req.user!;
    const entryData = {
      ...req.body,
      patientId,
      createdBy: user.id
    };
    const entry = await handleDatabaseOperation(() =>
      storage.createMedicalHistoryEntry(entryData)
    );
    sendSuccessResponse(res, entry);
  }));

  app.put('/api/medical-history/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const entry = await handleDatabaseOperation(() =>
      storage.updateMedicalHistoryEntry(id, req.body)
    );
    sendSuccessResponse(res, entry);
  }));

  app.delete('/api/medical-history/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    await handleDatabaseOperation(() =>
      storage.deleteMedicalHistoryEntry(id)
    );
    sendSuccessResponse(res, { success: true });
  }));

  // TEMPORARY: Fix missing created_at column in patients table
  app.post('/api/admin/fix-patients-schema', asyncHandler(async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = await storage.getUser(decoded.id);
      if (!user || !['admin', 'administrator'].includes(user.role)) {
        return res.status(403).json({ error: 'Admin access required' });
      }
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
    try {
      await db.execute(sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW() NOT NULL`);
      await db.execute(sql`ALTER TABLE patients ALTER COLUMN created_at DROP DEFAULT`);
      await db.execute(sql`UPDATE patients SET created_at = NOW() WHERE created_at IS NULL`);
      sendSuccessResponse(res, { message: 'patients created_at column added' });
    } catch (err: any) {
      sendErrorResponse(res, 500, err.message);
    }
  }));

  return httpServer;
}
