import { Router } from "express";
import { db } from "../db";
import { patients, appointments, prescriptions, medicalNotes } from "@shared/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../error-handler";
import { log, logError } from "../logger";

const patientPortalRouter = Router();

// Middleware to inject patient based on logged-in user email
const injectPatient = async (req: any, res: any, next: any) => {
  if (req.user?.role !== 'patient') {
    return res.status(403).json({ error: "Access denied. Only patients can access the portal." });
  }
  
  try {
    const patientList = await db.select().from(patients).where(eq(patients.email, req.user.email));
    
    if (!patientList || patientList.length === 0) {
       return res.status(404).json({ error: "Patient profile not found. Please contact your clinic." });
    }
    
    req.patient = patientList[0];
    next();
  } catch (err) {
    logError("Error finding patient for portal:", err);
    res.status(500).json({ error: "Server error resolving patient profile" });
  }
};

// All routes require auth and the patient role
patientPortalRouter.use(requireAuth);
patientPortalRouter.use(injectPatient);

// GET /api/patient-portal/profile
patientPortalRouter.get("/profile", (req: any, res) => {
  res.json(req.patient);
});

// PATCH /api/patient-portal/profile
patientPortalRouter.patch("/profile", async (req: any, res) => {
  try {
    const { phone, address } = req.body;
    
    const [updated] = await db.update(patients)
      .set({
        ...(phone && { phone }),
        ...(address && { address })
      })
      .where(eq(patients.id, req.patient.id))
      .returning();
      
    // Write audit log
    try {
      const { createAuditLog, AUDIT_ACTIONS } = await import('../audit');
      await createAuditLog({
        userId: req.user.id,
        action: AUDIT_ACTIONS.PATIENT_UPDATE,
        resource: 'patient_portal',
        resourceId: req.patient.id,
        details: { updatedFields: Object.keys(req.body) },
        ipAddress: req.ip,
      });
    } catch (auditErr) {
      logError("Failed to write patient portal audit log:", auditErr);
    }
    
    res.json(updated);
  } catch (err) {
    logError("Error updating patient profile:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// GET /api/patient-portal/appointments
patientPortalRouter.get("/appointments", async (req: any, res) => {
  try {
    const patientAppointments = await db.select()
      .from(appointments)
      .where(eq(appointments.patientId, req.patient.id));
    res.json(patientAppointments);
  } catch (err) {
    logError("Error fetching patient portal appointments:", err);
    res.status(500).json({ error: "Failed to fetch appointments" });
  }
});

// GET /api/patient-portal/prescriptions
patientPortalRouter.get("/prescriptions", async (req: any, res) => {
  try {
    const patientPrescriptions = await db.select()
      .from(prescriptions)
      .where(eq(prescriptions.patientId, req.patient.id));
    res.json(patientPrescriptions);
  } catch (err) {
    logError("Error fetching patient portal prescriptions:", err);
    res.status(500).json({ error: "Failed to fetch prescriptions" });
  }
});

// GET /api/patient-portal/medical-records
patientPortalRouter.get("/medical-records", async (req: any, res) => {
  try {
    const records = await db.select()
      .from(medicalNotes)
      .where(eq(medicalNotes.patientId, req.patient.id));
    res.json(records);
  } catch (err) {
    logError("Error fetching patient portal records:", err);
    res.status(500).json({ error: "Failed to fetch medical records" });
  }
});

export default patientPortalRouter;
