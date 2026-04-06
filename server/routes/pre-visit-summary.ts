import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { z } from 'zod';

const preVisitRouter = Router();

const preVisitSchema = z.object({
  patientId: z.number(),
  doctorId: z.number().optional(),
});

preVisitRouter.get('/:patientId', async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const doctorId = req.user?.id;
    
    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID required' });
    }

    const patientIdNum = parseInt(patientId);
    if (isNaN(patientIdNum)) {
      return res.status(400).json({ error: 'Invalid patient ID' });
    }

    // Get patient info
    const patient = await storage.getPatient(patientIdNum);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Get active medications (prescriptions)
    const prescriptions = await storage.getPrescriptions(patientIdNum);
    const activeMeds = prescriptions.filter(p => p.isActive);

    // Get active diagnoses (alerts)
    const alerts = await storage.getMedicalAlertsByPatient(patientIdNum);
    const activeConditions = alerts.filter(a => a.isActive && a.type === 'condition');
    const allergies = alerts.filter(a => a.isActive && a.type === 'allergy');

    // Get recent medical history
    const history = await storage.getMedicalHistoryEntries(patientIdNum);
    const recentHistory = history
      .filter(h => h.isActive)
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      .slice(0, 5);

    // Get last 3 visit notes
    const notes = await storage.getMedicalNotes(patientIdNum);
    const recentNotes = notes
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3)
      .map(note => ({
        id: note.id,
        title: note.title,
        type: note.type,
        date: note.createdAt,
        preview: note.content.substring(0, 300) + (note.content.length > 300 ? '...' : '')
      }));

    // Get recent appointments
    const appointments = await storage.getAppointments(patientIdNum);
    const upcomingAppt = appointments
      .filter(a => new Date(a.date) >= new Date() && a.status === 'scheduled')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

    // Get latest vital signs from readings
    const bpReadings = await storage.getBpReadings(patientIdNum);
    const latestBP = bpReadings[0];
    
    const glucoseReadings = await storage.getGlucoseReadings(patientIdNum);
    const latestGlucose = glucoseReadings[0];

    // Build summary
    const summary = {
      patient: {
        id: patient.id,
        name: `${patient.firstName} ${patient.lastName}`,
        dob: patient.dateOfBirth,
        email: patient.email,
        phone: patient.phone
      },
      chiefComplaint: upcomingAppt?.reason || 'General visit',
      appointmentDate: upcomingAppt?.date || null,
      
      // 3-bullet summary for quick review
      quickSummary: {
        conditions: activeConditions.slice(0, 3).map(c => c.title),
        allergies: allergies.map(a => a.title),
        lastVitals: latestBP ? {
          date: latestBP.timestamp,
          bp: `${latestBP.systolic}/${latestBP.diastolic}`,
          pulse: latestBP.pulse
        } : latestGlucose ? {
          date: latestGlucose.timestamp,
          glucose: latestGlucose.value,
          type: latestGlucose.type
        } : null
      },

      // Detailed sections
      activeMedications: activeMeds.map(m => ({
        name: m.medicationName,
        dosage: m.dosage,
        frequency: m.frequency,
        instructions: m.instructions
      })),
      
      activeDiagnoses: activeConditions.map(c => ({
        title: c.title,
        severity: c.severity,
        description: c.description
      })),
      
      allergies: allergies.map(a => ({
        title: a.title,
        severity: a.severity,
        description: a.description
      })),
      
      recentHistory: recentHistory.map(h => ({
        title: h.title,
        category: h.category,
        date: h.date,
        description: h.description
      })),
      
      recentVisits: recentNotes,

      // Allergies warning
      allergyWarning: allergies.length > 0 
        ? `⚠️ ALLERGIES: ${allergies.map(a => a.title).join(', ')}`
        : null
    };

    res.json(summary);
  } catch (error) {
    console.error('Pre-visit summary error:', error);
    res.status(500).json({ error: 'Failed to generate pre-visit summary' });
  }
});

export default preVisitRouter;
