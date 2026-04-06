import 'dotenv/config';
import { storage } from '../server/storage';

const DEFAULT_CPT_CODES = [
  // RPM (Remote Patient Monitoring) Codes - Critical for 2024/2025
  {
    code: '99453',
    description: 'Remote patient monitoring: device(s) supply with daily recording or transmission; set-up and patient education',
    category: 'RPM',
    rvu: 0.58,
    modifier: null
  },
  {
    code: '99454',
    description: 'Remote patient monitoring: device(s) supply with daily recording(s) or transmission; per 30 days',
    category: 'RPM',
    rvu: 2.15,
    modifier: null
  },
  {
    code: '99457',
    description: 'Remote patient monitoring: treatment management services, clinical staff/physician/other qualified healthcare professional; first 20 minutes per calendar month',
    category: 'RPM',
    rvu: 3.05,
    modifier: null
  },
  {
    code: '99458',
    description: 'Remote patient monitoring: treatment management services, clinical staff/physician/other qualified healthcare professional; each additional 20 minutes per calendar month',
    category: 'RPM',
    rvu: 2.43,
    modifier: null
  },
  {
    code: '99091',
    description: 'Collection and interpretation of physiologic data (e.g., ECG, EEG, cardiac event recorder) digitally stored and transmitted by patient',
    category: 'RPM',
    rvu: 2.60,
    modifier: null
  },
  {
    code: '99445',
    description: 'Remote patient monitoring: management of home BP cuff/device for 2-15 days',
    category: 'RPM',
    rvu: 1.50,
    modifier: null
  },
  {
    code: '99470',
    description: 'Remote patient monitoring: first 10 minutes of RPM management time with required patient interaction',
    category: 'RPM',
    rvu: 1.75,
    modifier: null
  },
  {
    code: 'G0511',
    description: 'Remote physiologic monitoring treatment management services, clinical staff/physician/other qualified health professional; 20+ minutes per calendar month (for rural health)',
    category: 'RPM',
    rvu: 3.05,
    modifier: null
  },

  // E/M Office Visit Codes
  {
    code: '99202',
    description: 'Office/outpatient visit, new patient: straightforward MDM, 15 minutes',
    category: 'E/M',
    rvu: 2.16,
    modifier: null
  },
  {
    code: '99203',
    description: 'Office/outpatient visit, new patient: low complexity MDM, 30 minutes',
    category: 'E/M',
    rvu: 3.17,
    modifier: null
  },
  {
    code: '99204',
    description: 'Office/outpatient visit, new patient: moderate complexity MDM, 45 minutes',
    category: 'E/M',
    rvu: 4.97,
    modifier: null
  },
  {
    code: '99205',
    description: 'Office/outpatient visit, new patient: high complexity MDM, 60 minutes',
    category: 'E/M',
    rvu: 6.38,
    modifier: null
  },
  {
    code: '99211',
    description: 'Office/outpatient visit, established patient: minimal problem, 10 minutes',
    category: 'E/M',
    rvu: 0.70,
    modifier: null
  },
  {
    code: '99212',
    description: 'Office/outpatient visit, established patient: straightforward MDM, 10 minutes',
    category: 'E/M',
    rvu: 1.39,
    modifier: null
  },
  {
    code: '99213',
    description: 'Office/outpatient visit, established patient: low complexity MDM, 15 minutes',
    category: 'E/M',
    rvu: 2.56,
    modifier: null
  },
  {
    code: '99214',
    description: 'Office/outpatient visit, established patient: moderate complexity MDM, 25 minutes',
    category: 'E/M',
    rvu: 3.82,
    modifier: null
  },
  {
    code: '99215',
    description: 'Office/outpatient visit, established patient: high complexity MDM, 40 minutes',
    category: 'E/M',
    rvu: 5.89,
    modifier: null
  },

  // Telehealth
  {
    code: '99441',
    description: 'Telehealth: E/M office consultation, 15-29 minutes',
    category: 'Telehealth',
    rvu: 2.50,
    modifier: '95'
  },
  {
    code: '99442',
    description: 'Telehealth: E/M office consultation, 30-59 minutes',
    category: 'Telehealth',
    rvu: 3.75,
    modifier: '95'
  },
  {
    code: '99443',
    description: 'Telehealth: E/M office consultation, 60+ minutes',
    category: 'Telehealth',
    rvu: 5.25,
    modifier: '95'
  },

  // Lab & Testing
  {
    code: '80053',
    description: 'Comprehensive metabolic panel',
    category: 'Lab',
    rvu: 3.87,
    modifier: null
  },
  {
    code: '85025',
    description: 'Complete blood count (CBC) with automated differential',
    category: 'Lab',
    rvu: 1.82,
    modifier: null
  },
  {
    code: '83036',
    description: 'Hemoglobin A1c (HbA1c)',
    category: 'Lab',
    rvu: 1.42,
    modifier: null
  },
  {
    code: '80061',
    description: 'Lipid panel',
    category: 'Lab',
    rvu: 2.87,
    modifier: null
  },

  // Procedures
  {
    code: '36415',
    description: 'Venipuncture, routine blood draw',
    category: 'Procedure',
    rvu: 0.35,
    modifier: null
  },
  {
    code: '36416',
    description: 'Finger/heel/ear stick for blood collection',
    category: 'Procedure',
    rvu: 0.18,
    modifier: null
  },
  {
    code: '93000',
    description: 'Electrocardiogram (ECG), complete',
    category: 'Procedure',
    rvu: 1.70,
    modifier: null
  },
  {
    code: '94660',
    description: 'Continuous positive airway pressure (CPAP) ventilation',
    category: 'Procedure',
    rvu: 2.50,
    modifier: null
  },

  //Modifiers
  {
    code: '25',
    description: 'Significant, separate E/M service on same day as procedure',
    category: 'Modifier',
    rvu: 0,
    modifier: '25'
  },
  {
    code: '59',
    description: 'Distinct procedural service',
    category: 'Modifier',
    rvu: 0,
    modifier: '59'
  },
  {
    code: '95',
    description: 'Synchronous telemedicine service',
    category: 'Modifier',
    rvu: 0,
    modifier: '95'
  },
  {
    code: 'GT',
    description: 'Interactive audio and video telecommunications system',
    category: 'Modifier',
    rvu: 0,
    modifier: 'GT'
  },
  {
    code: 'G0',
    description: 'Geographic practice expense (GPE) location modifier',
    category: 'Modifier',
    rvu: 0,
    modifier: 'G0'
  },
  {
    code: 'Q1',
    description: 'Shared split E/M service',
    category: 'Modifier',
    rvu: 0,
    modifier: 'Q1'
  }
];

const DEFAULT_ICD10_CODES = [
  // Essential ICD-10 Codes for Common Conditions
  {
    code: 'E11.9',
    description: 'Type 2 diabetes mellitus without complications',
    category: 'Endocrine',
    laterality: null
  },
  {
    code: 'E11.65',
    description: 'Type 2 diabetes mellitus with hyperglycemia',
    category: 'Endocrine',
    laterality: null
  },
  {
    code: 'I10',
    description: 'Essential (primary) hypertension',
    category: 'Cardiovascular',
    laterality: null
  },
  {
    code: 'I10.0',
    description: 'Essential hypertension, malignant',
    category: 'Cardiovascular',
    laterality: null
  },
  {
    code: 'I25.10',
    description: 'Atherosclerotic heart disease of native coronary artery',
    category: 'Cardiovascular',
    laterality: null
  },
  {
    code: 'I25.5',
    description: 'Ischemic cardiomyopathy',
    category: 'Cardiovascular',
    laterality: null
  },
  {
    code: 'J45.909',
    description: 'Unspecified asthma, uncomplicated',
    category: 'Respiratory',
    laterality: null
  },
  {
    code: 'J44.9',
    description: 'Chronic obstructive pulmonary disease, unspecified',
    category: 'Respiratory',
    laterality: null
  },
  {
    code: 'M54.5',
    description: 'Low back pain',
    category: 'Musculoskeletal',
    laterality: null
  },
  {
    code: 'M79.3',
    description: 'Panniculitis, unspecified',
    category: 'Musculoskeletal',
    laterality: null
  },
  {
    code: 'K21.0',
    description: 'Gastro-esophageal reflux disease with esophagitis',
    category: 'GI',
    laterality: null
  },
  {
    code: 'F32.9',
    description: 'Major depressive disorder, single episode, unspecified',
    category: 'Mental Health',
    laterality: null
  },
  {
    code: 'F41.1',
    description: 'Generalized anxiety disorder',
    category: 'Mental Health',
    laterality: null
  },
  {
    code: 'F32.1',
    description: 'Major depressive disorder, single episode, moderate',
    category: 'Mental Health',
    laterality: null
  },
  {
    code: 'E24.9',
    description: 'Polycystic ovarian syndrome',
    category: 'Endocrine',
    laterality: null
  },
  {
    code: 'E03.9',
    description: 'Hypothyroidism, unspecified',
    category: 'Endocrine',
    laterality: null
  },
  {
    code: 'G43.909',
    description: 'Migraine, unspecified, not intractable',
    category: 'Neurological',
    laterality: null
  },
  {
    code: 'N18.3',
    description: 'Chronic kidney disease, stage 3 (moderate)',
    category: 'Renal',
    laterality: null
  },
  {
    code: 'N18.4',
    description: 'Chronic kidney disease, stage 4 (severe)',
    category: 'Renal',
    laterality: null
  },
  {
    code: 'E14.65',
    description: 'Diabetes mellitus with hyperglycemia',
    category: 'Endocrine',
    laterality: null
  },
  {
    code: 'J06.9',
    description: 'Acute upper respiratory infection, unspecified',
    category: 'Respiratory',
    laterality: null
  },
  {
    code: 'M79.10',
    description: 'Myalgia of unspecified muscle',
    category: 'Musculoskeletal',
    laterality: null
  },
  {
    code: 'R51',
    description: 'Headache',
    category: 'Symptoms',
    laterality: null
  },
  {
    code: 'R10.9',
    description: 'Unspecified abdominal pain',
    category: 'Symptoms',
    laterality: null
  },
  {
    code: 'R05',
    description: 'Cough',
    category: 'Symptoms',
    laterality: null
  },
  {
    code: 'R50.9',
    description: 'Fever, unspecified',
    category: 'Symptoms',
    laterality: null
  },
  {
    code: 'Z00.00',
    description: 'Encounter for general adult medical examination without abnormal findings',
    category: 'Prevention',
    laterality: null
  },
  {
    code: 'Z00.129',
    description: 'Encounter for routine health examination',
    category: 'Prevention',
    laterality: null
  },
  {
    code: 'V70.0',
    description: 'General medical examination',
    category: 'Prevention',
    laterality: null
  }
];

async function seedMedicalCodes() {
  console.log('=== Seeding Medical Codes (CPT & ICD-10) ===\n');

  const doctors = await storage.getUsers();
  const doctor = doctors.find(u => u.role === 'doctor' || u.role === 'administrator');

  if (!doctor) {
    console.error('No doctor found. Please seed users first: npm run db:seed');
    process.exit(1);
  }
  const doctorId = doctor.id;
  console.log(`Using doctor: ${doctor.name} (ID: ${doctorId})\n`);

  // Seed CPT Codes
  console.log('Seeding CPT codes...');
  let cptAdded = 0;
  for (const cptData of DEFAULT_CPT_CODES) {
    try {
      const existing = await storage.getCptCodeByCode(cptData.code, doctorId);
      if (!existing) {
        await storage.createCptCode({
          doctorId,
          code: cptData.code,
          description: cptData.description,
          category: cptData.category,
          modifier: cptData.modifier,
          rvu: cptData.rvu,
          isCustom: false
        });
        cptAdded++;
      }
    } catch (e) {
      console.log(`  ⚠ Error adding CPT ${cptData.code}:`, e);
    }
  }
  console.log(`  ✓ Added ${cptAdded} CPT codes\n`);

  // Seed ICD-10 Codes
  console.log('Seeding ICD-10 codes...');
  let icdAdded = 0;
  for (const icdData of DEFAULT_ICD10_CODES) {
    try {
      const existing = await storage.getIcd10CodeByCode(icdData.code, doctorId);
      if (!existing) {
        await storage.createIcd10Code({
          doctorId,
          code: icdData.code,
          description: icdData.description,
          category: icdData.category,
          laterality: icdData.laterality,
          isCustom: false
        });
        icdAdded++;
      }
    } catch (e) {
      console.log(`  ⚠ Error adding ICD-10 ${icdData.code}:`, e);
    }
  }
  console.log(`  ✓ Added ${icdAdded} ICD-10 codes\n`);

  console.log('=== Medical Codes Seeding Complete ===');
  console.log(`Summary:`);
  console.log(`- CPT Codes: ${cptAdded} added`);
  console.log(`- ICD-10 Codes: ${icdAdded} added`);
  console.log(`- Categories: E/M, RPM, Telehealth, Lab, Procedure, Modifier, etc.`);
  
  process.exit(0);
}

seedMedicalCodes().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
