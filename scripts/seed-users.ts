import 'dotenv/config';
import { db } from '../server/db';
import { users, patients, appointments } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../server/auth';
import { addDays, subDays, setHours, setMinutes } from 'date-fns';

async function seedUsers() {
  console.log('Seeding initial clinical data...');

  // 1. Seed Users
  const defaultUsers = [
    {
      username: 'admin',
      password: 'admin123',
      name: 'System Administrator',
      role: 'administrator' as const,
      email: 'admin@aims.medical',
      phone: '555-000-0001',
      specialty: 'Administration',
      isActive: true,
      useOwnApiKey: false,
    },
    {
      username: 'provider',
      password: 'provider123',
      name: 'Dr. John Smith',
      role: 'doctor' as const,
      email: 'provider@aims.medical',
      phone: '555-000-0002',
      specialty: 'Internal Medicine',
      licenseNumber: 'MD-12345',
      isActive: true,
      useOwnApiKey: false,
    },
    {
      username: 'doctor',
      password: 'doctor123',
      name: 'Dr. Sarah Johnson',
      role: 'doctor' as const,
      email: 'doctor@aims.medical',
      phone: '555-000-0003',
      specialty: 'Family Medicine',
      licenseNumber: 'MD-67890',
      isActive: true,
      useOwnApiKey: false,
    },
  ];

  let adminId = 1;
  for (const user of defaultUsers) {
    try {
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.username, user.username))
        .limit(1);

      if (existing.length === 0) {
        const hashedPassword = await hashPassword(user.password);
        const [newUser] = await db.insert(users).values({
          ...user,
          password: hashedPassword,
          createdAt: new Date(),
        }).returning();
        if (user.username === 'admin') adminId = newUser.id;
        console.log(`✓ Created user: ${user.username} (${user.role})`);
      } else {
        if (user.username === 'admin') adminId = existing[0].id;
        console.log(`- User already exists: ${user.username}`);
      }
    } catch (error: any) {
      console.error(`✗ Error creating user ${user.username}:`, error.message);
    }
  }

  // 2. Seed Patients
  console.log('\nSeeding patients...');
  const demoPatients = [
    {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@email.com',
      phone: '555-0101',
      dateOfBirth: '1985-05-15',
      gender: 'male',
      address: '123 Medical Way, Health City',
      medicalHistory: 'Hypertension, Type 2 Diabetes',
    },
    {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@email.com',
      phone: '555-0102',
      dateOfBirth: '1992-08-22',
      gender: 'female',
      address: '456 Wellness Ave, Care Town',
      medicalHistory: 'Asthma, Seasonal Allergies',
    },
    {
      firstName: 'Robert',
      lastName: 'Brown',
      email: 'robert.b@email.com',
      phone: '555-0103',
      dateOfBirth: '1970-11-30',
      gender: 'male',
      address: '789 Recovery St, Medic Village',
      medicalHistory: 'Hyperlipidemia, Chronic Back Pain',
    },
  ];

  const seededPatients = [];
  for (const patient of demoPatients) {
    try {
      const existing = await db
        .select()
        .from(patients)
        .where(eq(patients.email, patient.email))
        .limit(1);

      if (existing.length === 0) {
        const [newPatient] = await db.insert(patients).values({
          ...patient,
          createdAt: new Date(),
          createdBy: adminId,
        }).returning();
        seededPatients.push(newPatient);
        console.log(`✓ Created patient: ${patient.firstName} ${patient.lastName}`);
      } else {
        seededPatients.push(existing[0]);
        console.log(`- Patient already exists: ${patient.firstName} ${patient.lastName}`);
      }
    } catch (error: any) {
      console.error(`✗ Error creating patient:`, error.message);
    }
  }

  // 3. Seed Appointments
  console.log('\nSeeding appointments...');
  const drSmith = await db.select().from(users).where(eq(users.username, 'provider')).limit(1);
  
  if (drSmith.length > 0 && seededPatients.length > 0) {
    const today = new Date();
    const demoAppointments = [
      {
        patientId: seededPatients[0].id,
        doctorId: drSmith[0].id,
        date: setMinutes(setHours(today, 9), 0),
        duration: 30,
        type: 'initial',
        status: 'completed',
        reason: 'Initial consultation for hypertension management',
      },
      {
        patientId: seededPatients[1].id,
        doctorId: drSmith[0].id,
        date: setMinutes(setHours(today, 10), 30),
        duration: 20,
        type: 'followup',
        status: 'scheduled',
        reason: 'Routine asthma follow-up',
      },
      {
        patientId: seededPatients[2].id,
        doctorId: drSmith[0].id,
        date: setMinutes(setHours(today, 14), 0),
        duration: 45,
        type: 'physical',
        status: 'scheduled',
        reason: 'Annual wellness exam',
      },
      {
        patientId: seededPatients[0].id,
        doctorId: drSmith[0].id,
        date: setMinutes(setHours(addDays(today, 1), 11), 0),
        duration: 15,
        type: 'reevaluation',
        status: 'scheduled',
        reason: 'Blood pressure check',
      },
    ];

    for (const appt of demoAppointments) {
      try {
        await db.insert(appointments).values({
          ...appt,
          createdAt: new Date(),
        });
        console.log(`✓ Created appointment: ${appt.reason}`);
      } catch (error: any) {
        console.error(`✗ Error creating appointment:`, error.message);
      }
    }
  }

  console.log('\nClinical seed complete!');
  process.exit(0);
}

seedUsers().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
