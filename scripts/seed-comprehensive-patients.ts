import 'dotenv/config';
import { storage } from '../server/storage';

async function seedComprehensiveMockData() {
  console.log('=== Seeding Comprehensive Mock Data for Demo ===\n');

  const doctors = await storage.getUsers();
  const doctor = doctors.find(u => u.role === 'doctor' || u.role === 'administrator');

  if (!doctor) {
    console.error('No doctor found. Please seed users first: npm run db:seed');
    process.exit(1);
  }
  const doctorId = doctor.id;
  console.log(`Using doctor: ${doctor.name} (ID: ${doctorId})\n`);

  const mockPatients = [
    {
      firstName: 'Roberto',
      lastName: 'Martinez',
      email: 'roberto.martinez@email.com',
      phone: '555-201-0001',
      dateOfBirth: '1958-03-22',
      address: 'Av. Principal 123, San Antonio, Caracas',
      medicalHistory: 'Long-standing history of Type 2 Diabetes Mellitus (diagnosed 2010), Hypertension (diagnosed 2008), Hyperlipidemia. Previous smoker (quit 2015). No known drug allergies.',
      createdBy: doctorId
    },
    {
      firstName: 'Ana',
      lastName: 'Castillo',
      email: 'ana.castillo@email.com',
      phone: '555-201-0002',
      dateOfBirth: '1985-07-14',
      address: 'Calle Los Samanes, Urb. Tercer Milenio, Valencia',
      medicalHistory: 'Asthma since childhood (mild persistent). Anxiety disorder diagnosed 2019. Appendectomy in 2020. Allergic to Penicillin and Shellfish.',
      createdBy: doctorId
    },
    {
      firstName: 'Miguel',
      lastName: 'Hernandez',
      email: 'miguel.hernandez@email.com',
      phone: '555-201-0003',
      dateOfBirth: '1972-11-08',
      address: 'Urbanización Las Mercedes, Casa 45, Maracaibo',
      medicalHistory: 'Chronic Lower Back Pain (Lumbar Disc Herniation L4-L5). Osteoarthritis. GERD. Former alcohol use (abstinent 3 years).',
      createdBy: doctorId
    },
    {
      firstName: 'Sofia',
      lastName: 'Ramirez',
      email: 'sofia.ramirez@email.com',
      phone: '555-201-0004',
      dateOfBirth: '1992-04-30',
      address: 'Residencias Paraiso, Piso 3, Barquisimeto',
      medicalHistory: 'Polycystic Ovary Syndrome (PCOS). Hypothyroidism. Migraine with aura. Depression (on Sertraline). No allergies.',
      createdBy: doctorId
    },
    {
      firstName: 'Carlos Eduardo',
      lastName: 'Jimenez Torres',
      email: 'carlos.jimenez@email.com',
      phone: '555-201-0005',
      dateOfBirth: '1965-09-12',
      address: 'Calle Comercio, Sector Centro, Ciudad Bolivar',
      medicalHistory: 'COMPLEX CASE: Type 2 Diabetes (15 years), Coronary Artery Disease (s/p stent 2020), Stage 3 CKD, Peripheral Neuropathy, Diabetic Retinopathy. Hypertension, Hyperlipidemia. Allergic to Sulfa drugs and Aspirin.',
      createdBy: doctorId
    }
  ];

  for (const patientData of mockPatients) {
    const allPatients = await storage.getPatients(doctorId);
    const existing = allPatients.find(p => p.email === patientData.email);
    let patientId: number;

    if (!existing) {
      const newPatient = await storage.createPatient(patientData);
      patientId = newPatient.id;
      console.log(`✓ Created patient: ${patientData.firstName} ${patientData.lastName}`);
    } else {
      patientId = existing.id;
      console.log(`- Patient exists: ${patientData.firstName} ${patientData.lastName}`);
    }

    const patientName = `${patientData.firstName} ${patientData.lastName}`;

    // ==================== MEDICAL ALERTS ====================
    const alerts = [];
    if (patientData.firstName === 'Roberto') {
      alerts.push(
        { patientId, type: 'condition', severity: 'high', title: 'Type 2 Diabetes', description: 'HbA1c 8.2% (Oct 2024)', createdBy: doctorId, isActive: true },
        { patientId, type: 'condition', severity: 'high', title: 'Hypertension', description: 'BP controlled on medication', createdBy: doctorId, isActive: true },
        { patientId, type: 'condition', severity: 'medium', title: 'Hyperlipidemia', description: 'On statins', createdBy: doctorId, isActive: true }
      );
    } else if (patientData.firstName === 'Ana') {
      alerts.push(
        { patientId, type: 'condition', severity: 'medium', title: 'Asthma', description: 'Mild persistent, uses rescue inhaler', createdBy: doctorId, isActive: true },
        { patientId, type: 'allergy', severity: 'critical', title: 'Penicillin', description: 'Anaphylaxis reaction in 2015', createdBy: doctorId, isActive: true },
        { patientId, type: 'allergy', severity: 'critical', title: 'Shellfish', description: 'Hives and swelling', createdBy: doctorId, isActive: true },
        { patientId, type: 'condition', severity: 'medium', title: 'Anxiety Disorder', description: 'On daily medication', createdBy: doctorId, isActive: true }
      );
    } else if (patientData.firstName === 'Miguel') {
      alerts.push(
        { patientId, type: 'condition', severity: 'high', title: 'Chronic Back Pain', description: 'Lumbar disc herniation L4-L5', createdBy: doctorId, isActive: true },
        { patientId, type: 'condition', severity: 'medium', title: 'Osteoarthritis', description: 'Affecting lumbar spine and knees', createdBy: doctorId, isActive: true },
        { patientId, type: 'condition', severity: 'medium', title: 'GERD', description: 'On PPI therapy', createdBy: doctorId, isActive: true }
      );
    } else if (patientData.firstName === 'Sofia') {
      alerts.push(
        { patientId, type: 'condition', severity: 'medium', title: 'PCOS', description: 'Irregular menses, hirsutism', createdBy: doctorId, isActive: true },
        { patientId, type: 'condition', severity: 'medium', title: 'Hypothyroidism', description: 'On levothyroxine', createdBy: doctorId, isActive: true },
        { patientId, type: 'condition', severity: 'medium', title: 'Migraine', description: 'With aura, 2-3/month', createdBy: doctorId, isActive: true },
        { patientId, type: 'condition', severity: 'medium', title: 'Depression', description: 'On Sertraline', createdBy: doctorId, isActive: true }
      );
    } else if (patientData.firstName === 'Carlos Eduardo') {
      alerts.push(
        { patientId, type: 'condition', severity: 'critical', title: 'Type 2 Diabetes', description: '15 years duration, complications', createdBy: doctorId, isActive: true },
        { patientId, type: 'condition', severity: 'critical', title: 'Coronary Artery Disease', description: 's/p stent 2020', createdBy: doctorId, isActive: true },
        { patientId, type: 'condition', severity: 'critical', title: 'Stage 3 CKD', description: 'eGFR 45 mL/min', createdBy: doctorId, isActive: true },
        { patientId, type: 'condition', severity: 'high', title: 'Peripheral Neuropathy', description: 'Diabetic neuropathy', createdBy: doctorId, isActive: true },
        { patientId, type: 'condition', severity: 'high', title: 'Diabetic Retinopathy', description: 'Moderate NPDR', createdBy: doctorId, isActive: true },
        { patientId, type: 'allergy', severity: 'high', title: 'Sulfa Drugs', description: 'Rash', createdBy: doctorId, isActive: true },
        { patientId, type: 'allergy', severity: 'high', title: 'Aspirin', description: 'GI bleeding', createdBy: doctorId, isActive: true }
      );
    }

    for (const alert of alerts) {
      await storage.createMedicalAlert(alert as any);
    }
    console.log(`  ✓ Added ${alerts.length} medical alerts`);

    // ==================== MEDICAL HISTORY ENTRIES ====================
    const historyEntries = [];
    if (patientData.firstName === 'Roberto') {
      historyEntries.push(
        { patientId, category: 'condition', title: 'Type 2 Diabetes Diagnosis', description: 'Started on Metformin', date: '2010-06-15', createdBy: doctorId, isActive: true },
        { patientId, category: 'condition', title: 'Hypertension Diagnosis', description: 'Started on Lisinopril', date: '2008-02-20', createdBy: doctorId, isActive: true },
        { patientId, category: 'surgery', title: 'Cataract Surgery (OD)', description: 'Right eye phacoemulsification', date: '2022-08-10', createdBy: doctorId, isActive: true },
        { patientId, category: 'family_history', title: 'Father - MI', description: 'Father died of MI at age 62', createdBy: doctorId, isActive: true },
        { patientId, category: 'social_history', title: 'Smoking History', description: 'Former smoker, 20 pack-years, quit 2015', createdBy: doctorId, isActive: true }
      );
    } else if (patientData.firstName === 'Ana') {
      historyEntries.push(
        { patientId, category: 'condition', title: 'Asthma Diagnosis', description: 'Since childhood, mild persistent', date: '1995-01-01', createdBy: doctorId, isActive: true },
        { patientId, category: 'condition', title: 'Anxiety Disorder', description: 'Started on Escitalopram', date: '2019-05-15', createdBy: doctorId, isActive: true },
        { patientId, category: 'surgery', title: 'Appendectomy', description: 'Laparoscopic', date: '2020-11-20', createdBy: doctorId, isActive: true },
        { patientId, category: 'social_history', title: 'Alcohol Use', description: 'Social drinker, 1-2 drinks/week', createdBy: doctorId, isActive: true }
      );
    } else if (patientData.firstName === 'Miguel') {
      historyEntries.push(
        { patientId, category: 'condition', title: 'Lumbar Disc Herniation', description: 'L4-L5, conservative management', date: '2018-03-10', createdBy: doctorId, isActive: true },
        { patientId, category: 'condition', title: 'Osteoarthritis', description: 'Lumbar spine and bilateral knees', date: '2020-07-22', createdBy: doctorId, isActive: true },
        { patientId, category: 'condition', title: 'GERD', description: 'On Omeprazole 20mg daily', date: '2019-01-15', createdBy: doctorId, isActive: true },
        { patientId, category: 'social_history', title: 'Alcohol Use', description: 'Former heavy use, abstinent 3 years', createdBy: doctorId, isActive: true }
      );
    } else if (patientData.firstName === 'Sofia') {
      historyEntries.push(
        { patientId, category: 'condition', title: 'PCOS Diagnosis', description: 'Based on Rotterdam criteria', date: '2018-09-10', createdBy: doctorId, isActive: true },
        { patientId, category: 'condition', title: 'Hypothyroidism', description: 'On Levothyroxine 75mcg', date: '2020-02-14', createdBy: doctorId, isActive: true },
        { patientId, category: 'condition', title: 'Migraine with Aura', description: 'About 3 episodes/month', date: '2015-06-01', createdBy: doctorId, isActive: true },
        { patientId, category: 'condition', title: 'Depression', description: 'On Sertraline 50mg', date: '2021-01-10', createdBy: doctorId, isActive: true }
      );
    } else if (patientData.firstName === 'Carlos Eduardo') {
      historyEntries.push(
        { patientId, category: 'condition', title: 'Type 2 Diabetes Diagnosis', description: 'Started on oral agents', date: '2009-04-20', createdBy: doctorId, isActive: true },
        { patientId, category: 'condition', title: 'CAD Diagnosis', description: 'Cath showing 70% LAD stenosis', date: '2020-01-15', createdBy: doctorId, isActive: true },
        { patientId, category: 'surgery', title: 'PCI with Stent', description: 'DES to LAD, successful', date: '2020-01-22', createdBy: doctorId, isActive: true },
        { patientId, category: 'condition', title: 'CKD Stage 3', description: 'eGFR declined over 2 years', date: '2022-06-10', createdBy: doctorId, isActive: true },
        { patientId, category: 'condition', title: 'Diabetic Retinopathy', description: 'Moderate NPDR, both eyes', date: '2023-02-05', createdBy: doctorId, isActive: true },
        { patientId, category: 'family_history', title: 'Mother - Diabetes', description: 'Type 2 DM, diagnosed age 55', createdBy: doctorId, isActive: true },
        { patientId, category: 'family_history', title: 'Father - Hypertension', description: 'HTN since age 50', createdBy: doctorId, isActive: true }
      );
    }

    for (const h of historyEntries) {
      await storage.createMedicalHistoryEntry(h as any);
    }
    console.log(`  ✓ Added ${historyEntries.length} medical history entries`);

    // ==================== PRESCRIPTIONS ====================
    const prescriptions = [];
    if (patientData.firstName === 'Roberto') {
      prescriptions.push(
        { patientId, medicationName: 'Metformin', dosage: '1000mg', frequency: 'Twice daily with meals', prescribedBy: doctorId, isActive: true, refills: 3 },
        { patientId, medicationName: 'Lisinopril', dosage: '20mg', frequency: 'Once daily in morning', prescribedBy: doctorId, isActive: true, refills: 3 },
        { patientId, medicationName: 'Atorvastatin', dosage: '40mg', frequency: 'Once daily at bedtime', prescribedBy: doctorId, isActive: true, refills: 3 },
        { patientId, medicationName: 'Aspirin', dosage: '81mg', frequency: 'Once daily with breakfast', prescribedBy: doctorId, isActive: true, refills: 6 }
      );
    } else if (patientData.firstName === 'Ana') {
      prescriptions.push(
        { patientId, medicationName: 'Albuterol Inhaler', dosage: '90mcg', frequency: '2 puffs PRN shortness of breath', prescribedBy: doctorId, isActive: true, refills: 2 },
        { patientId, medicationName: 'Fluticasone Nasal Spray', dosage: '50mcg', frequency: '1 spray each nostril daily', prescribedBy: doctorId, isActive: true, refills: 2 },
        { patientId, medicationName: 'Escitalopram', dosage: '10mg', frequency: 'Once daily in morning', prescribedBy: doctorId, isActive: true, refills: 3 }
      );
    } else if (patientData.firstName === 'Miguel') {
      prescriptions.push(
        { patientId, medicationName: 'Tramadol', dosage: '50mg', frequency: 'Every 6 hours PRN pain', prescribedBy: doctorId, isActive: true, refills: 1 },
        { patientId, medicationName: 'Gabapentin', dosage: '300mg', frequency: 'Three times daily', prescribedBy: doctorId, isActive: true, refills: 3 },
        { patientId, medicationName: 'Omeprazole', dosage: '20mg', frequency: 'Once daily before breakfast', prescribedBy: doctorId, isActive: true, refills: 3 },
        { patientId, medicationName: 'Acetaminophen', dosage: '500mg', frequency: 'Every 6 hours PRN pain, max 3000mg/day', prescribedBy: doctorId, isActive: true, refills: 2 }
      );
    } else if (patientData.firstName === 'Sofia') {
      prescriptions.push(
        { patientId, medicationName: 'Metformin', dosage: '500mg', frequency: 'Twice daily', prescribedBy: doctorId, isActive: true, refills: 3 },
        { patientId, medicationName: 'Levothyroxine', dosage: '75mcg', frequency: 'Once daily on empty stomach', prescribedBy: doctorId, isActive: true, refills: 3 },
        { patientId, medicationName: 'Sertraline', dosage: '50mg', frequency: 'Once daily in morning', prescribedBy: doctorId, isActive: true, refills: 3 },
        { patientId, medicationName: 'Sumatriptan', dosage: '50mg', frequency: '1 tablet PRN migraine, max 200mg/day', prescribedBy: doctorId, isActive: true, refills: 2 }
      );
    } else if (patientData.firstName === 'Carlos Eduardo') {
      prescriptions.push(
        { patientId, medicationName: 'Metformin', dosage: '1000mg', frequency: 'Twice daily', prescribedBy: doctorId, isActive: true, refills: 3 },
        { patientId, medicationName: 'Glipizide', dosage: '5mg', frequency: 'Once daily with breakfast', prescribedBy: doctorId, isActive: true, refills: 3 },
        { patientId, medicationName: 'Lisinopril', dosage: '10mg', frequency: 'Once daily (CKD dose)', prescribedBy: doctorId, isActive: true, refills: 3 },
        { patientId, medicationName: 'Atorvastatin', dosage: '80mg', frequency: 'Once daily at bedtime', prescribedBy: doctorId, isActive: true, refills: 3 },
        { patientId, medicationName: 'Clopidogrel', dosage: '75mg', frequency: 'Once daily (post-stent)', prescribedBy: doctorId, isActive: true, refills: 6 },
        { patientId, medicationName: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', prescribedBy: doctorId, isActive: true, refills: 3 },
        { patientId, medicationName: 'Pregabalin', dosage: '75mg', frequency: 'Twice daily for neuropathy', prescribedBy: doctorId, isActive: true, refills: 3 }
      );
    }

    for (const p of prescriptions) {
      await storage.createPrescription(p as any);
    }
    console.log(`  ✓ Added ${prescriptions.length} prescriptions`);

    // ==================== VISITS & MEDICAL NOTES ====================
    const visitNotes = [];

    // Initial Visit
    if (patientData.firstName === 'Roberto') {
      visitNotes.push({
        patientId, doctorId,
        title: 'Annual Physical Examination',
        type: 'soap',
        content: `SUBJECTIVE: 66-year-old male presents for annual physical. Reports good overall health. Denies chest pain, shortness of breath, or edema. Managing diabetes with Metformin, checking fasting glucose daily (range 110-140). Denies hypoglycemic episodes. Blood pressure running 130s/80s on Lisinopril.

OBJECTIVE:
- Vitals: BP 138/84, HR 72, Temp 98.4°F, Weight 198 lbs, BMI 28.4
- General: Alert, oriented, no acute distress
- HEENT: Normocephalic, PERRLA, EOMI
- Lungs: Clear to auscultation bilaterally
- CV: RRR, no murmurs
- Abd: Soft, non-tender, no organomegaly
- Extremities: Pulses 2+ bilaterally, no edema

ASSESSMENT:
1. Type 2 Diabetes Mellitus - reasonably controlled
2. Hypertension - controlled on current regimen
3. Hyperlipidemia - on statin therapy
4. Tobacco use disorder - former smoker

PLAN:
1. Continue Metformin 1000mg BID
2. Continue Lisinopril 20mg daily
3. Continue Atorvastatin 40mg daily
4. Order HbA1c, lipid panel, BMP
5. Schedule ophthalmology follow-up for diabetic retinopathy screening
6. Patient educated on diet and exercise
7. Return in 3 months or PRN`
      });
      // Follow-up Visit
      visitNotes.push({
        patientId, doctorId,
        title: 'Diabetes Follow-up',
        type: 'soap',
        content: `SUBJECTIVE: 66-year-old male returns for diabetes follow-up. Reports occasional fasting glucose 150-160. No symptoms of hyperglycemia or hypoglycemia. Compliant with medications and diet. Walking 20 minutes 3x/week.

OBJECTIVE:
- Vitals: BP 134/80, HR 70
- General: No acute distress
- Lungs: Clear
- CV: RRR

ASSESSMENT:
1. Type 2 Diabetes Mellitus - suboptimal control
2. Hypertension - controlled

PLAN:
1. Increase Metformin to 1000mg BID (already on max dose)
2. Consider adding SGLT2 inhibitor for cardiovascular benefit
3. Reinforce dietary modifications
4. Repeat HbA1c in 3 months
5. Return visit in 3 months`
      });
    } else if (patientData.firstName === 'Ana') {
      visitNotes.push({
        patientId, doctorId,
        title: 'Asthma and Anxiety Follow-up',
        type: 'soap',
        content: `SUBJECTIVE: 39-year-old female presents for asthma and anxiety follow-up. Reports good asthma control, using rescue inhaler 1-2 times/week. Anxiety well-controlled on Escitalopram, denies panic attacks or worsening symptoms. Sleep 7-8 hours, mood stable.

OBJECTIVE:
- Vitals: BP 118/76, HR 68, RR 14
- General: Well-appearing, relaxed mood
- Lungs: Clear to auscultation, no wheezes
- Psychiatric: Affect appropriate, organized thought process

ASSESSMENT:
1. Asthma, mild persistent - well-controlled
2. Anxiety disorder - well-controlled on medication

PLAN:
1. Continue Fluticasone nasal spray daily
2. Continue Albuterol inhaler PRN
3. Continue Escitalopram 10mg daily
4. Follow-up in 6 months
5. Annual spirometry scheduled`
      });
    } else if (patientData.firstName === 'Miguel') {
      visitNotes.push({
        patientId, doctorId,
        title: 'Chronic Back Pain Management',
        type: 'soap',
        content: `SUBJECTIVE: 52-year-old male presents for chronic low back pain follow-up. Reports pain 6/10, worse with prolonged sitting and bending. Currently on Gabapentin 300mg TID and Tramadol 50mg PRN. Physical therapy completed 12 sessions with moderate improvement. Denies bowel or bladder dysfunction.

OBJECTIVE:
- Vitals: BP 126/82, HR 74
- General: Antalgic gait, moves carefully
- Back: Mild paraspinal muscle spasm L4-S1, limited ROM due to pain
- Neuro: Sensation intact, DTRs 2+ bilaterally, strength 5/5 all groups

ASSESSMENT:
1. Lumbar disc herniation L4-L5 with radiculopathy
2. Chronic pain syndrome
3. Osteoarthritis

PLAN:
1. Continue Gabapentin 300mg TID
2. Continue Tramadol 50mg PRN (max 200mg/day)
3. Continue Acetaminophen PRN
4. Continue Omeprazole 20mg daily for GI protection
5. Refer to pain management for consideration of epidural steroid injection
6. Home exercise program prescribed
7. Follow-up in 4 weeks`
      });
    } else if (patientData.firstName === 'Sofia') {
      visitNotes.push({
        patientId, doctorId,
        title: 'PCOS and Thyroid Follow-up',
        type: 'soap',
        content: `SUBJECTIVE: 32-year-old female returns for PCOS and hypothyroidism follow-up. Reports regular menses on current regimen (every 32-35 days). Hypothyroidism symptoms resolved on levothyroxine. Migraines occurring 2-3x/month, responding to Sumatriptan. Depression stable on Sertraline.

OBJECTIVE:
- Vitals: BP 112/70, HR 64, Weight 145 lbs
- General: Well-appearing
- Thyroid: No goiter, no nodules
- Skin: No hirsutism noted (patient doing laser treatment)

ASSESSMENT:
1. PCOS - controlled
2. Hypothyroidism - euThyroid on replacement
3. Migraine with aura - well-controlled
4. Depression - stable

PLAN:
1. Continue Metformin 500mg BID
2. Continue Levothyroxine 75mcg daily on empty stomach
3. Continue Sertraline 50mg daily
4. Continue Sumatriptan 50mg PRN migraine
5. Labs: TSH, free T4 in 3 months
6. Return in 6 months`
      });
    } else if (patientData.firstName === 'Carlos Eduardo') {
      visitNotes.push({
        patientId, doctorId,
        title: 'Complex Diabetes and CAD Follow-up',
        type: 'soap',
        content: `SUBJECTIVE: 59-year-old male presents for comprehensive diabetes and cardiovascular follow-up. Reports doing well overall. No chest pain since stent placement. Mild burning sensation in feet (neuropathy symptoms). Checking glucose 2-3x/day, fasting typically 140-160. Denies hypoglycemia. Compliant with medications. Walking 15 minutes daily.

OBJECTIVE:
- Vitals: BP 138/86, HR 68, Weight 192 lbs
- General: Alert, appears stated age
- CV: RRR, no murmurs, stent in place (2020)
- Lungs: Clear bilaterally
- Abd: Soft, non-tender
- Feet: Decreased sensation to monofilament bilaterally, no ulcers

ASSESSMENT:
1. Type 2 Diabetes Mellitus with microvascular complications - suboptimal control
2. Coronary Artery Disease, s/p PCI with DES to LAD (2020) - stable
3. Stage 3 Chronic Kidney Disease - stable
4. Diabetic peripheral neuropathy
5. Diabetic retinopathy (ophthalmology following)
6. Hypertension - controlled
7. Hyperlipidemia - controlled on high-intensity statin

PLAN:
1. Continue Metformin 1000mg BID
2. Add Glipizide 5mg daily (SGLT2 held due to CKD)
3. Continue Lisinopril 10mg daily (renal protective dose)
4. Continue Atorvastatin 80mg daily
5. Continue Clopidogrel 75mg daily
6. Continue Amlodipine 5mg daily
7. Continue Pregabalin 75mg BID for neuropathy
8. Labs: HbA1c, BMP, lipid panel in 2 weeks
9. Ophthalmology follow-up in 3 months
10. Cardiology follow-up in 6 months
11. Nephrology referral for CKD management
12. Return in 1 month to review labs`
      });
      // Second visit for complex case
      visitNotes.push({
        patientId, doctorId,
        title: 'CKD and Diabetes Management Review',
        type: 'soap',
        content: `SUBJECTIVE: 59-year-old male returns for CKD and diabetes review. Labs showed HbA1c 8.4%, eGFR 42 mL/min (declined from 45). No new complaints. Blood pressure running 130s/80s. Taking all medications as prescribed.

OBJECTIVE:
- Vitals: BP 134/82, HR 66
- General: Stable, no acute changes
- Labs: HbA1c 8.4%, eGFR 42, BUN 28, Creatinine 1.8, K+ 4.8

ASSESSMENT:
1. Type 2 Diabetes - suboptimal control despite dual therapy
2. CKD Stage 3 - progressive, eGFR declined 3 points
3. CAD s/p stent - stable

PLAN:
1. Diabetes: Consider insulin initiation at next visit if HbA1c remains elevated
2. Nephrology: Continue monitoring, avoid nephrotoxins
3. Cardiology: Continue dual antiplatelet therapy
4. Blood pressure: Consider increasing Lisinopril if tolerated (currently on renal-protective dose)
5. Patient educated on CKD progression and importance of glycemic control
6. Labs in 3 months
7. Return in 3 months`
      });
    }

    for (const note of visitNotes) {
      await storage.createMedicalNote(note);
    }
    console.log(`  ✓ Added ${visitNotes.length} medical notes/visits`);

    // ==================== APPOINTMENTS ====================
    const appointmentDates = [
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),  // Next week
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next month
    ];

    for (let i = 0; i < appointmentDates.length; i++) {
      const isPast = appointmentDates[i] < new Date();
      await storage.createAppointment({
        patientId,
        doctorId,
        date: appointmentDates[i],
        status: isPast ? 'completed' : 'scheduled',
        type: i % 2 === 0 ? 'in-person' : 'telemedicine',
        reason: i === 0 ? 'Initial comprehensive visit' : i === 1 ? 'Follow-up' : 'Scheduled follow-up',
        notes: isPast ? 'Visit completed, patient stable' : ''
      });
    }
    console.log(`  ✓ Added ${appointmentDates.length} appointments`);

    // ==================== PATIENT DOCUMENTS ====================
    const documents = [];
    if (patientData.firstName === 'Roberto') {
      documents.push(
        { patientId, doctorId, filename: 'lab_results_2024.pdf', originalFilename: 'lab_results_2024.pdf', filePath: '/documents/labs/roberto_labs.pdf', fileType: 'pdf', fileSize: 245000, title: 'Laboratory Results - October 2024', description: 'CBC, BMP, Lipid Panel, HbA1c', tags: ['lab', 'diabetes'] },
        { patientId, doctorId, filename: 'cardio_report.pdf', originalFilename: 'cardio_report.pdf', filePath: '/documents/cardio/roberto_cardio.pdf', fileType: 'pdf', fileSize: 180000, title: 'Cardiology Consultation', description: 'EKG and stress test results', tags: ['cardiology', 'heart'] }
      );
    } else if (patientData.firstName === 'Carlos Eduardo') {
      documents.push(
        { patientId, doctorId, filename: 'cath_report.pdf', originalFilename: 'cath_report.pdf', filePath: '/documents/procedures/carlos_cath.pdf', fileType: 'pdf', fileSize: 520000, title: 'Cardiac Catheterization Report', description: 'Diagnostic cath with PCI to LAD, DES placed', tags: ['procedure', 'cardiology'] },
        { patientId, doctorId, filename: 'nephro_notes.pdf', originalFilename: 'nephro_notes.pdf', filePath: '/documents/referrals/carlos_nephro.pdf', fileType: 'pdf', fileSize: 125000, title: 'Nephrology Consultation Notes', description: 'Initial CKD evaluation', tags: ['nephrology', 'referral'] },
        { patientId, doctorId, filename: 'optho_eval.pdf', originalFilename: 'optho_eval.pdf', filePath: '/documents/referrals/carlos_optho.pdf', fileType: 'pdf', fileSize: 98000, title: 'Ophthalmology - Diabetic Retinopathy', description: 'Dilated exam findings', tags: ['ophthalmology', 'diabetes'] }
      );
    }

    for (const doc of documents) {
      await storage.createPatientDocument(doc as any);
    }
    console.log(`  ✓ Added ${documents.length} patient documents\n`);
  }

  console.log('=== Mock Patient Seeding Complete ===');
  console.log('Summary:');
  console.log('- 5 comprehensive patients with full medical records');
  console.log('- Medical alerts, history, prescriptions, visits, documents');
  console.log('- Complex demo case: Carlos Eduardo Jimenez Torres');
  console.log('\nRun: npm run db:seed to seed users first if needed');
  process.exit(0);
}

seedComprehensiveMockData().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
