import 'dotenv/config';
import { storage } from '../server/storage';

async function seedMockPatients() {
  console.log('Seeding comprehensive mock patients...');

  // Get first doctor/user to associate with
  const doctors = await storage.getUsers();
  const doctor = doctors.find(u => u.role === 'doctor' || u.role === 'administrator');

  if (!doctor) {
    console.error('No doctor found in the database. Please seed users first.');
    process.exit(1);
  }
  const doctorId = doctor.id;

  const mockPatients = [
    {
      firstName: 'Carlos',
      lastName: 'Rodriguez',
      email: 'carlos.rod@example.com',
      phone: '555-010-2020',
      dateOfBirth: '1975-05-12',
      address: 'Calle 10, Caracas, Venezuela',
      medicalHistory: 'History of Type 2 Diabetes and Hypertension.',
      createdBy: doctorId
    },
    {
      firstName: 'Maria',
      lastName: 'Garcia',
      email: 'maria.garcia@example.com',
      phone: '555-010-3030',
      dateOfBirth: '1988-11-22',
      address: 'Av. Bolivar, Valencia, Venezuela',
      medicalHistory: 'Asthma since childhood. Recent appendectomy.',
      createdBy: doctorId
    },
    {
      firstName: 'Juan',
      lastName: 'Perez',
      email: 'juan.perez@example.com',
      phone: '555-010-4040',
      dateOfBirth: '1962-03-15',
      address: 'Sector 5, Maracaibo, Venezuela',
      medicalHistory: 'Chronic lower back pain. Penicillin allergy.',
      createdBy: doctorId
    }
  ];

  for (const patientData of mockPatients) {
    // Check if patient exists
    const allPatients = await storage.getPatients(doctorId);
    const existing = allPatients.find(p => p.email === patientData.email);
    let patientId: number;

    if (!existing) {
      const newPatient = await storage.createPatient(patientData);
      patientId = newPatient.id;
      console.log(`✓ Created patient: ${patientData.firstName} ${patientData.lastName}`);
    } else {
      patientId = existing.id;
      console.log(`- Patient already exists: ${patientData.firstName} ${patientData.lastName}`);
    }

    // Add Medical Alerts
    const alerts = [
      { patientId, type: 'condition', severity: 'high', title: 'Type 2 Diabetes', createdBy: doctorId, isActive: true },
      { patientId, type: 'condition', severity: 'medium', title: 'Hypertension', createdBy: doctorId, isActive: true },
      { patientId, type: 'allergy', severity: 'critical', title: 'Penicillin', createdBy: doctorId, isActive: true }
    ].filter(a => (patientData.firstName === 'Carlos' && (a.title === 'Type 2 Diabetes' || a.title === 'Hypertension')) ||
                  (patientData.firstName === 'Juan' && a.title === 'Penicillin'));

    for (const alert of alerts) {
      await storage.createMedicalAlert(alert as any);
    }

    // Add History Entries
    const history = [
      { patientId, category: 'condition', title: 'Diabetes Diagnosis', date: '2015-06-01', createdBy: doctorId, isActive: true },
      { patientId, category: 'surgery', title: 'Appendectomy', date: '2023-10-15', createdBy: doctorId, isActive: true }
    ].filter(h => (patientData.firstName === 'Carlos' && h.title === 'Diabetes Diagnosis') ||
                  (patientData.firstName === 'Maria' && h.title === 'Appendectomy'));

    for (const h of history) {
      await storage.createMedicalHistoryEntry(h as any);
    }

    // Add Prescriptions
    const meds = [
      { patientId, medicationName: 'Metformin', dosage: '500mg', frequency: 'Twice daily', prescribedBy: doctorId, isActive: true },
      { patientId, medicationName: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', prescribedBy: doctorId, isActive: true },
      { patientId, medicationName: 'Albuterol Inhaler', dosage: '2 puffs', frequency: 'As needed', prescribedBy: doctorId, isActive: true }
    ].filter(m => (patientData.firstName === 'Carlos' && (m.medicationName === 'Metformin' || m.medicationName === 'Lisinopril')) ||
                  (patientData.firstName === 'Maria' && m.medicationName === 'Albuterol Inhaler'));

    for (const m of meds) {
      await storage.createPrescription(m as any);
    }

    // Add a Medical Note
    await storage.createMedicalNote({
      patientId,
      doctorId,
      title: 'Routine Follow-up',
      content: `Patient ${patientData.firstName} presented for a routine follow-up. Vital signs stable. Continuing current treatment plan.`,
      type: 'soap',
    });

    // Add an Appointment
    await storage.createAppointment({
      patientId,
      doctorId,
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
      status: 'scheduled',
      type: 'in-person',
      reason: 'Regular checkup',
      notes: ''
    });
  }

  console.log('\nMock patient seeding complete!');
  process.exit(0);
}

seedMockPatients().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
