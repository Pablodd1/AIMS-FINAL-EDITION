/**
 * Medical Codes Database - CPT & ICD-10 Codes 2026
 * Embedded database for offline access and fast RAG retrieval
 */

// CPT Codes - Common Procedures (2026)
export interface CPTCode {
  code: string;
  description: string;
  category: string;
  subcategory?: string;
  rvu?: number;
  commonModifiers?: string[];
}

// ICD-10-CM Codes - Common Diagnoses (2026)
export interface ICD10Code {
  code: string;
  description: string;
  category: string;
  billable: boolean;
  commonSymptoms?: string[];
}

// Common CPT Codes Database (Curated subset of 10,000+ codes)
export const CPT_CODES: CPTCode[] = [
  // E/M Services
  { code: "99202", description: "Office visit, new patient, straightforward", category: "E/M", rvu: 0.93 },
  { code: "99203", description: "Office visit, new patient, low complexity", category: "E/M", rvu: 1.60 },
  { code: "99204", description: "Office visit, new patient, moderate complexity", category: "E/M", rvu: 2.60 },
  { code: "99205", description: "Office visit, new patient, high complexity", category: "E/M", rvu: 3.50 },
  { code: "99211", description: "Office visit, established patient, minimal", category: "E/M", rvu: 0.18 },
  { code: "99212", description: "Office visit, established patient, straightforward", category: "E/M", rvu: 0.70 },
  { code: "99213", description: "Office visit, established patient, low complexity", category: "E/M", rvu: 1.10 },
  { code: "99214", description: "Office visit, established patient, moderate complexity", category: "E/M", rvu: 1.80 },
  { code: "99215", description: "Office visit, established patient, high complexity", category: "E/M", rvu: 2.80 },
  
  // Preventive Medicine
  { code: "99381", description: "Preventive visit, new patient, age 0-1", category: "Preventive", rvu: 1.00 },
  { code: "99382", description: "Preventive visit, new patient, age 1-4", category: "Preventive", rvu: 1.20 },
  { code: "99383", description: "Preventive visit, new patient, age 5-11", category: "Preventive", rvu: 1.30 },
  { code: "99384", description: "Preventive visit, new patient, age 12-17", category: "Preventive", rvu: 1.50 },
  { code: "99385", description: "Preventive visit, new patient, age 18-39", category: "Preventive", rvu: 1.60 },
  { code: "99386", description: "Preventive visit, new patient, age 40-64", category: "Preventive", rvu: 1.80 },
  { code: "99387", description: "Preventive visit, new patient, age 65+", category: "Preventive", rvu: 2.00 },
  { code: "99391", description: "Preventive visit, established, age 0-1", category: "Preventive", rvu: 0.80 },
  { code: "99392", description: "Preventive visit, established, age 1-4", category: "Preventive", rvu: 0.90 },
  { code: "99393", description: "Preventive visit, established, age 5-11", category: "Preventive", rvu: 1.00 },
  { code: "99394", description: "Preventive visit, established, age 12-17", category: "Preventive", rvu: 1.10 },
  { code: "99395", description: "Preventive visit, established, age 18-39", category: "Preventive", rvu: 1.20 },
  { code: "99396", description: "Preventive visit, established, age 40-64", category: "Preventive", rvu: 1.40 },
  { code: "99397", description: "Preventive visit, established, age 65+", category: "Preventive", rvu: 1.60 },
  
  // Telehealth
  { code: "99421", description: "Digital E/M, 5-10 minutes over 7 days", category: "Telehealth", rvu: 0.40 },
  { code: "99422", description: "Digital E/M, 11-20 minutes over 7 days", category: "Telehealth", rvu: 0.70 },
  { code: "99423", description: "Digital E/M, 21+ minutes over 7 days", category: "Telehealth", rvu: 1.00 },
  { code: "99441", description: "Phone call, 5-10 minutes", category: "Telehealth", rvu: 0.40 },
  { code: "99442", description: "Phone call, 11-20 minutes", category: "Telehealth", rvu: 0.70 },
  { code: "99443", description: "Phone call, 21-30 minutes", category: "Telehealth", rvu: 1.00 },
  { code: "99457", description: "Remote monitoring, 20+ minutes", category: "Telehealth", rvu: 0.80 },
  
  // Procedures - General
  { code: "10060", description: "Incision and drainage, simple", category: "Procedure", rvu: 1.20 },
  { code: "10140", description: "Incision and drainage, complicated", category: "Procedure", rvu: 2.50 },
  { code: "11042", description: "Debridement, subcutaneous tissue", category: "Procedure", rvu: 2.00 },
  { code: "11043", description: "Debridement, muscle/fascia", category: "Procedure", rvu: 3.50 },
  { code: "11044", description: "Debridement, bone", category: "Procedure", rvu: 4.50 },
  { code: "11100", description: "Biopsy, single lesion", category: "Procedure", rvu: 1.50 },
  { code: "11101", description: "Biopsy, each additional lesion", category: "Procedure", rvu: 0.60 },
  { code: "17000", description: "Destruction, premalignant lesion, first lesion", category: "Procedure", rvu: 0.90 },
  { code: "17003", description: "Destruction, premalignant lesions, 2-14 lesions", category: "Procedure", rvu: 0.20 },
  { code: "17110", description: "Destruction, benign lesions, 1-14 lesions", category: "Procedure", rvu: 1.20 },
  
  // Injections
  { code: "96372", description: "Therapeutic injection, IM or SC", category: "Injection", rvu: 0.50 },
  { code: "96401", description: "Chemotherapy injection, non-hormonal", category: "Injection", rvu: 4.00 },
  { code: "96402", description: "Chemotherapy injection, hormonal", category: "Injection", rvu: 1.50 },
  { code: "J0131", description: "Acetaminophen injection", category: "Drug", rvu: 0 },
  { code: "J0696", description: "Ceftriaxone injection", category: "Drug", rvu: 0 },
  { code: "J1100", description: "Dexamethasone injection", category: "Drug", rvu: 0 },
  { code: "J1200", description: "Diphenhydramine injection", category: "Drug", rvu: 0 },
  { code: "J1885", description: "Ketorolac injection", category: "Drug", rvu: 0 },
  { code: "J2550", description: "Promethazine injection", category: "Drug", rvu: 0 },
  { code: "J2930", description: "Methylprednisolone injection", category: "Drug", rvu: 0 },
  { code: "J3301", description: "Triamcinolone injection", category: "Drug", rvu: 0 },
  
  // Labs
  { code: "80053", description: "Comprehensive metabolic panel", category: "Lab", rvu: 0.80 },
  { code: "80061", description: "Lipid panel", category: "Lab", rvu: 0.60 },
  { code: "80076", description: "Hepatic function panel", category: "Lab", rvu: 0.70 },
  { code: "83036", description: "Hemoglobin A1C", category: "Lab", rvu: 0.50 },
  { code: "84443", description: "TSH", category: "Lab", rvu: 0.40 },
  { code: "85025", description: "CBC with differential", category: "Lab", rvu: 0.60 },
  { code: "85610", description: "Prothrombin time", category: "Lab", rvu: 0.30 },
  { code: "87081", description: "Urine culture", category: "Lab", rvu: 0.60 },
  { code: "87430", description: "Strep A rapid test", category: "Lab", rvu: 0.40 },
  { code: "87804", description: "Influenza rapid test", category: "Lab", rvu: 0.40 },
  { code: "93000", description: "Electrocardiogram", category: "Lab", rvu: 0.70 },
  
  // Cardiology
  { code: "93000", description: "EKG, routine", category: "Cardiology", rvu: 0.70 },
  { code: "93306", description: "Echocardiogram, complete", category: "Cardiology", rvu: 4.00 },
  { code: "93350", description: "Stress echo", category: "Cardiology", rvu: 5.50 },
  { code: "93660", description: "Tilt table test", category: "Cardiology", rvu: 3.00 },
  
  // Pulmonology
  { code: "94010", description: "Spirometry", category: "Pulmonology", rvu: 0.50 },
  { code: "94060", description: "Spirometry with bronchodilator", category: "Pulmonology", rvu: 0.80 },
  { code: "94640", description: "Nebulizer treatment", category: "Pulmonology", rvu: 0.40 },
  { code: "94664", description: "Nebulizer training", category: "Pulmonology", rvu: 0.50 },
  
  // Dermatology
  { code: "11102", description: "Punch biopsy, single", category: "Dermatology", rvu: 1.80 },
  { code: "11103", description: "Punch biopsy, each additional", category: "Dermatology", rvu: 0.80 },
  { code: "11300", description: "Shave biopsy, trunk, first lesion", category: "Dermatology", rvu: 1.30 },
  { code: "11301", description: "Shave biopsy, trunk, 2-7 lesions", category: "Dermatology", rvu: 0.50 },
  { code: "11440", description: "Excision, benign, face, 0.5cm or less", category: "Dermatology", rvu: 2.50 },
  { code: "11441", description: "Excision, benign, face, 0.6-1.0cm", category: "Dermatology", rvu: 2.90 },
  { code: "11640", description: "Excision, malignant, face, 0.5cm or less", category: "Dermatology", rvu: 3.00 },
  { code: "11641", description: "Excision, malignant, face, 0.6-1.0cm", category: "Dermatology", rvu: 3.50 },
  { code: "11719", description: "Trimming of nondystrophic nails", category: "Dermatology", rvu: 0.30 },
  { code: "11721", description: "Debridement of nails, 6 or more", category: "Dermatology", rvu: 0.60 },
  
  // Orthopedics
  { code: "20600", description: "Arthrocentesis, small joint", category: "Orthopedics", rvu: 1.50 },
  { code: "20605", description: "Arthrocentesis, intermediate joint", category: "Orthopedics", rvu: 1.80 },
  { code: "20610", description: "Arthrocentesis, major joint", category: "Orthopedics", rvu: 2.20 },
  { code: "20611", description: "Arthrocentesis with US guidance", category: "Orthopedics", rvu: 2.80 },
  { code: "20680", description: "Removal of implant", category: "Orthopedics", rvu: 4.00 },
  { code: "29065", description: "Cast application, short arm", category: "Orthopedics", rvu: 1.20 },
  { code: "29075", description: "Cast application, long arm", category: "Orthopedics", rvu: 1.50 },
  { code: "29425", description: "Cast application, short leg", category: "Orthopedics", rvu: 1.40 },
  { code: "29435", description: "Cast application, long leg", category: "Orthopedics", rvu: 1.60 },
  { code: "29530", description: "Splint, strapping, ankle", category: "Orthopedics", rvu: 0.80 },
  { code: "29540", description: "Splint, strapping, knee", category: "Orthopedics", rvu: 0.90 },
  { code: "29826", description: "Shoulder arthroscopy", category: "Orthopedics", rvu: 8.00 },
  { code: "29827", description: "Rotator cuff repair", category: "Orthopedics", rvu: 12.00 },
  { code: "29880", description: "Knee arthroscopy", category: "Orthopedics", rvu: 10.00 },
  
  // Ophthalmology
  { code: "92004", description: "Eye exam, new patient, comprehensive", category: "Ophthalmology", rvu: 2.20 },
  { code: "92014", description: "Eye exam, established, comprehensive", category: "Ophthalmology", rvu: 1.90 },
  { code: "92133", description: "Optic nerve imaging", category: "Ophthalmology", rvu: 0.80 },
  { code: "92225", description: "Ophthalmoscopy, extended", category: "Ophthalmology", rvu: 1.50 },
  { code: "92227", description: "Remote retinal imaging", category: "Ophthalmology", rvu: 0.40 },
  { code: "92310", description: "Contact lens fitting", category: "Ophthalmology", rvu: 1.00 },
  
  // ENT
  { code: "92511", description: "Nasopharyngoscopy", category: "ENT", rvu: 1.20 },
  { code: "92512", description: "Nasal function study", category: "ENT", rvu: 1.00 },
  { code: "92516", description: "Laryngeal sensation test", category: "ENT", rvu: 1.50 },
  { code: "92610", description: "Swallowing evaluation", category: "ENT", rvu: 1.80 },
  { code: "93580", description: "Audiometry, comprehensive", category: "ENT", rvu: 0.80 },
  
  // Gynecology
  { code: "57452", description: "Colposcopy with biopsy", category: "Gynecology", rvu: 2.50 },
  { code: "57454", description: "Colposcopy with ECC", category: "Gynecology", rvu: 3.00 },
  { code: "57456", description: "Colposcopy with biopsy and ECC", category: "Gynecology", rvu: 3.50 },
  { code: "58100", description: "Endometrial biopsy", category: "Gynecology", rvu: 1.50 },
  { code: "58300", description: "IUD insertion", category: "Gynecology", rvu: 1.80 },
  { code: "58301", description: "IUD removal", category: "Gynecology", rvu: 1.20 },
  { code: "58558", description: "Hysteroscopy, diagnostic", category: "Gynecology", rvu: 6.00 },
  { code: "58615", description: "Tubal occlusion", category: "Gynecology", rvu: 8.00 },
  { code: "76830", description: "Transvaginal ultrasound", category: "Gynecology", rvu: 1.50 },
  { code: "81025", description: "Urine pregnancy test", category: "Gynecology", rvu: 0.20 },
  
  // Urology
  { code: "51701", description: "Bladder irrigation", category: "Urology", rvu: 0.50 },
  { code: "51702", description: "Bladder catheterization", category: "Urology", rvu: 0.80 },
  { code: "51797", description: "Uroflowmetry", category: "Urology", rvu: 0.50 },
  { code: "52000", description: "Cystoscopy", category: "Urology", rvu: 3.00 },
  { code: "76856", description: "Pelvic ultrasound, complete", category: "Urology", rvu: 1.20 },
  { code: "76857", description: "Pelvic ultrasound, limited", category: "Urology", rvu: 0.80 },
  
  // Psychiatry
  { code: "90791", description: "Psychiatric diagnostic evaluation", category: "Psychiatry", rvu: 3.50 },
  { code: "90792", description: "Psychiatric eval with medical services", category: "Psychiatry", rvu: 4.00 },
  { code: "90832", description: "Psychotherapy, 30 minutes", category: "Psychiatry", rvu: 1.80 },
  { code: "90833", description: "Psychotherapy with E/M, 30 min", category: "Psychiatry", rvu: 2.20 },
  { code: "90834", description: "Psychotherapy, 45 minutes", category: "Psychiatry", rvu: 2.50 },
  { code: "90837", description: "Psychotherapy, 60 minutes", category: "Psychiatry", rvu: 3.00 },
  { code: "90847", description: "Family psychotherapy", category: "Psychiatry", rvu: 2.80 },
  { code: "90853", description: "Group psychotherapy", category: "Psychiatry", rvu: 1.20 },
  
  // Physical Therapy
  { code: "97110", description: "Therapeutic exercise", category: "PT", rvu: 0.60 },
  { code: "97112", description: "Neuromuscular reeducation", category: "PT", rvu: 0.70 },
  { code: "97116", description: "Gait training", category: "PT", rvu: 0.50 },
  { code: "97140", description: "Manual therapy", category: "PT", rvu: 0.70 },
  { code: "97530", description: "Therapeutic activities", category: "PT", rvu: 0.70 },
  { code: "97535", description: "Self-care training", category: "PT", rvu: 0.70 },
  { code: "97597", description: "Debridement, selective", category: "PT", rvu: 1.00 },
  { code: "97598", description: "Debridement, selective, additional", category: "PT", rvu: 0.50 },
  { code: "97750", description: "Physical performance test", category: "PT", rvu: 0.90 },
  
  // Chronic Care Management
  { code: "99490", description: "CCM, 20 minutes", category: "CCM", rvu: 0.50 },
  { code: "99491", description: "CCM, clinical staff, 30 min", category: "CCM", rvu: 1.00 },
  { code: "99437", description: "CCM, additional 30 min", category: "CCM", rvu: 0.80 },
  
  // Annual Wellness
  { code: "G0438", description: "Annual wellness visit, initial", category: "Wellness", rvu: 2.40 },
  { code: "G0439", description: "Annual wellness visit, subsequent", category: "Wellness", rvu: 1.50 },
  
  // Transitional Care
  { code: "99495", description: "Transitional care, moderate complexity", category: "TCM", rvu: 2.00 },
  { code: "99496", description: "Transitional care, high complexity", category: "TCM", rvu: 3.00 },
];

// Common ICD-10-CM Codes Database (Curated subset)
export const ICD10_CODES: ICD10Code[] = [
  // Infectious Diseases
  { code: "A59.9", description: "Trichomoniasis", category: "Infectious", billable: true },
  { code: "B00.9", description: "Herpes simplex infection, unspecified", category: "Infectious", billable: true },
  { code: "B02.9", description: "Zoster without complications", category: "Infectious", billable: true },
  { code: "B18.2", description: "Chronic hepatitis C", category: "Infectious", billable: true },
  { code: "B20", description: "HIV disease", category: "Infectious", billable: true },
  { code: "B34.9", description: "Viral infection, unspecified", category: "Infectious", billable: true },
  { code: "B35.1", description: "Tinea unguium", category: "Infectious", billable: true },
  { code: "B37.0", description: "Candidal stomatitis", category: "Infectious", billable: true },
  { code: "B37.3", description: "Candidiasis of vulva and vagina", category: "Infectious", billable: true },
  { code: "B86", description: "Scabies", category: "Infectious", billable: true },
  { code: "J06.9", description: "Upper respiratory infection, acute", category: "Infectious", billable: true },
  { code: "J18.9", description: "Pneumonia, unspecified", category: "Infectious", billable: true },
  { code: "J20.9", description: "Acute bronchitis, unspecified", category: "Infectious", billable: true },
  { code: "K52.9", description: "Gastroenteritis, noninfectious", category: "Infectious", billable: true },
  { code: "N39.0", description: "Urinary tract infection", category: "Infectious", billable: true },
  
  // Neoplasms
  { code: "C18.7", description: "Malignant neoplasm of sigmoid colon", category: "Neoplasm", billable: true },
  { code: "C34.90", description: "Malignant neoplasm of lung, unspecified", category: "Neoplasm", billable: true },
  { code: "C50.911", description: "Malignant neoplasm of breast, right", category: "Neoplasm", billable: true },
  { code: "C61", description: "Malignant neoplasm of prostate", category: "Neoplasm", billable: true },
  { code: "C79.51", description: "Secondary malignant neoplasm of bone", category: "Neoplasm", billable: true },
  { code: "D12.6", description: "Benign neoplasm of colon", category: "Neoplasm", billable: true },
  { code: "D17.1", description: "Benign lipomatous neoplasm of skin", category: "Neoplasm", billable: true },
  { code: "D22.5", description: "Melanocytic nevi of trunk", category: "Neoplasm", billable: true },
  { code: "D23.5", description: "Other benign neoplasm of skin of trunk", category: "Neoplasm", billable: true },
  { code: "D48.5", description: "Neoplasm of uncertain behavior of skin", category: "Neoplasm", billable: true },
  { code: "D50.9", description: "Iron deficiency anemia, unspecified", category: "Neoplasm", billable: true },
  { code: "D64.9", description: "Anemia, unspecified", category: "Neoplasm", billable: true },
  { code: "D69.6", description: "Thrombocytopenia, unspecified", category: "Neoplasm", billable: true },
  { code: "Z08", description: "Follow-up after treatment for neoplasm", category: "Neoplasm", billable: true },
  { code: "Z51.11", description: "Chemotherapy session for neoplasm", category: "Neoplasm", billable: true },
  
  // Endocrine/Metabolic
  { code: "E03.9", description: "Hypothyroidism, unspecified", category: "Endocrine", billable: true },
  { code: "E04.9", description: "Nontoxic goiter, unspecified", category: "Endocrine", billable: true },
  { code: "E05.90", description: "Hyperthyroidism, unspecified", category: "Endocrine", billable: true },
  { code: "E10.9", description: "Type 1 diabetes without complications", category: "Endocrine", billable: true },
  { code: "E10.65", description: "Type 1 diabetes with hyperglycemia", category: "Endocrine", billable: true },
  { code: "E11.9", description: "Type 2 diabetes without complications", category: "Endocrine", billable: true },
  { code: "E11.21", description: "Type 2 diabetes with nephropathy", category: "Endocrine", billable: true },
  { code: "E11.22", description: "Type 2 diabetes with diabetic nephropathy", category: "Endocrine", billable: true },
  { code: "E11.29", description: "Type 2 diabetes with other diabetic kidney complication", category: "Endocrine", billable: true },
  { code: "E11.31", description: "Type 2 diabetes with retinopathy", category: "Endocrine", billable: true },
  { code: "E11.36", description: "Type 2 diabetes with diabetic cataract", category: "Endocrine", billable: true },
  { code: "E11.40", description: "Type 2 diabetes with neuropathy, unspecified", category: "Endocrine", billable: true },
  { code: "E11.41", description: "Type 2 diabetes with mononeuropathy", category: "Endocrine", billable: true },
  { code: "E11.42", description: "Type 2 diabetes with polyneuropathy", category: "Endocrine", billable: true },
  { code: "E11.51", description: "Type 2 diabetes with diabetic peripheral angiopathy", category: "Endocrine", billable: true },
  { code: "E11.59", description: "Type 2 diabetes with other circulatory complications", category: "Endocrine", billable: true },
  { code: "E11.621", description: "Type 2 diabetes with foot ulcer", category: "Endocrine", billable: true },
  { code: "E11.628", description: "Type 2 diabetes with other skin ulcer", category: "Endocrine", billable: true },
  { code: "E11.65", description: "Type 2 diabetes with hyperglycemia", category: "Endocrine", billable: true },
  { code: "E11.69", description: "Type 2 diabetes with other specified complication", category: "Endocrine", billable: true },
  { code: "E78.2", description: "Mixed hyperlipidemia", category: "Endocrine", billable: true },
  { code: "E78.5", description: "Hyperlipidemia, unspecified", category: "Endocrine", billable: true },
  { code: "E83.52", description: "Hypercalcemia", category: "Endocrine", billable: true },
  { code: "E86.0", description: "Dehydration", category: "Endocrine", billable: true },
  { code: "E87.6", description: "Hypokalemia", category: "Endocrine", billable: true },
  { code: "E87.70", description: "Fluid overload, unspecified", category: "Endocrine", billable: true },
  { code: "E88.9", description: "Metabolic disorder, unspecified", category: "Endocrine", billable: true },
  { code: "E89.0", description: "Postprocedural hypothyroidism", category: "Endocrine", billable: true },
  
  // Mental Health
  { code: "F06.30", description: "Mood disorder due to known physiological condition", category: "Mental", billable: true },
  { code: "F32.9", description: "Major depressive disorder, single episode, unspecified", category: "Mental", billable: true },
  { code: "F32.0", description: "Major depressive disorder, single episode, mild", category: "Mental", billable: true },
  { code: "F32.1", description: "Major depressive disorder, single episode, moderate", category: "Mental", billable: true },
  { code: "F32.2", description: "Major depressive disorder, single episode, severe", category: "Mental", billable: true },
  { code: "F33.9", description: "Major depressive disorder, recurrent, unspecified", category: "Mental", billable: true },
  { code: "F33.0", description: "Major depressive disorder, recurrent, mild", category: "Mental", billable: true },
  { code: "F33.1", description: "Major depressive disorder, recurrent, moderate", category: "Mental", billable: true },
  { code: "F41.1", description: "Generalized anxiety disorder", category: "Mental", billable: true },
  { code: "F41.9", description: "Anxiety disorder, unspecified", category: "Mental", billable: true },
  { code: "F43.10", description: "Post-traumatic stress disorder, unspecified", category: "Mental", billable: true },
  { code: "F84.0", description: "Autistic disorder", category: "Mental", billable: true },
  { code: "F90.9", description: "Attention-deficit hyperactivity disorder, unspecified type", category: "Mental", billable: true },
  { code: "F99", description: "Mental disorder, not otherwise specified", category: "Mental", billable: true },
  
  // Nervous System
  { code: "G30.9", description: "Alzheimer's disease, unspecified", category: "Neurological", billable: true },
  { code: "G35", description: "Multiple sclerosis", category: "Neurological", billable: true },
  { code: "G43.909", description: "Migraine, unspecified, without mention of refractory migraine", category: "Neurological", billable: true },
  { code: "G43.919", description: "Migraine, unspecified, with refractory migraine", category: "Neurological", billable: true },
  { code: "G44.209", description: "Tension-type headache, unspecified", category: "Neurological", billable: true },
  { code: "G47.33", description: "Obstructive sleep apnea (adult) (pediatric)", category: "Neurological", billable: true },
  { code: "G56.00", description: "Carpal tunnel syndrome, unspecified upper limb", category: "Neurological", billable: true },
  { code: "G60.9", description: "Hereditary and idiopathic neuropathy, unspecified", category: "Neurological", billable: true },
  { code: "G62.9", description: "Polyneuropathy, unspecified", category: "Neurological", billable: true },
  { code: "G89.4", description: "Chronic pain syndrome", category: "Neurological", billable: true },
  { code: "G93.40", description: "Other and unspecified encephalopathy", category: "Neurological", billable: true },
  { code: "R51", description: "Headache", category: "Neurological", billable: true },
  { code: "R55", description: "Syncope and collapse", category: "Neurological", billable: true },
  
  // Eye
  { code: "H00.019", description: "Hordeolum externum unspecified eye", category: "Eye", billable: true },
  { code: "H01.009", description: "Blepharitis unspecified eye", category: "Eye", billable: true },
  { code: "H02.409", description: "Unspecified ptosis of unspecified eyelid", category: "Eye", billable: true },
  { code: "H10.9", description: "Conjunctivitis, unspecified", category: "Eye", billable: true },
  { code: "H16.009", description: "Corneal ulcer, unspecified", category: "Eye", billable: true },
  { code: "H25.9", description: "Age-related cataract, unspecified", category: "Eye", billable: true },
  { code: "H26.9", description: "Cataract, unspecified", category: "Eye", billable: true },
  { code: "H35.00", description: "Unspecified background retinopathy", category: "Eye", billable: true },
  { code: "H40.9", description: "Glaucoma, unspecified", category: "Eye", billable: true },
  { code: "H52.13", description: "Myopia, bilateral", category: "Eye", billable: true },
  { code: "H52.223", description: "Regular astigmatism, bilateral", category: "Eye", billable: true },
  { code: "H52.4", description: "Presbyopia", category: "Eye", billable: true },
  { code: "H53.9", description: "Visual disturbance, unspecified", category: "Eye", billable: true },
  { code: "H54.7", description: "Unspecified visual loss", category: "Eye", billable: true },
  
  // ENT
  { code: "H60.9", description: "Otitis externa, unspecified", category: "ENT", billable: true },
  { code: "H65.90", description: "Unspecified otitis media, unspecified ear", category: "ENT", billable: true },
  { code: "H66.90", description: "Otitis media, unspecified, unspecified ear", category: "ENT", billable: true },
  { code: "H81.10", description: "Benign paroxysmal vertigo, unspecified ear", category: "ENT", billable: true },
  { code: "H81.4", description: "Vertigo of central origin", category: "ENT", billable: true },
  { code: "H90.5", description: "Unspecified sensorineural hearing loss", category: "ENT", billable: true },
  { code: "H91.90", description: "Unspecified hearing loss, unspecified ear", category: "ENT", billable: true },
  { code: "H92.0", description: "Otalgia", category: "ENT", billable: true },
  { code: "J01.90", description: "Acute sinusitis, unspecified", category: "ENT", billable: true },
  { code: "J06.9", description: "Acute upper respiratory infection, unspecified", category: "ENT", billable: true },
  { code: "J30.9", description: "Allergic rhinitis, unspecified", category: "ENT", billable: true },
  { code: "J31.0", description: "Chronic rhinitis", category: "ENT", billable: true },
  { code: "J32.9", description: "Chronic sinusitis, unspecified", category: "ENT", billable: true },
  { code: "J40", description: "Bronchitis, not specified as acute or chronic", category: "ENT", billable: true },
  
  // Cardiovascular
  { code: "I10", description: "Essential (primary) hypertension", category: "Cardiovascular", billable: true },
  { code: "I11.9", description: "Hypertensive heart disease without heart failure", category: "Cardiovascular", billable: true },
  { code: "I12.9", description: "Hypertensive chronic kidney disease without kidney failure", category: "Cardiovascular", billable: true },
  { code: "I20.9", description: "Angina pectoris, unspecified", category: "Cardiovascular", billable: true },
  { code: "I21.9", description: "Acute myocardial infarction, unspecified", category: "Cardiovascular", billable: true },
  { code: "I25.10", description: "Atherosclerotic heart disease of native coronary artery without angina pectoris", category: "Cardiovascular", billable: true },
  { code: "I25.119", description: "Atherosclerotic heart disease of native coronary artery with unspecified angina pectoris", category: "Cardiovascular", billable: true },
  { code: "I25.2", description: "Old myocardial infarction", category: "Cardiovascular", billable: true },
  { code: "I48.91", description: "Unspecified atrial fibrillation", category: "Cardiovascular", billable: true },
  { code: "I48.2", description: "Chronic atrial fibrillation", category: "Cardiovascular", billable: true },
  { code: "I50.9", description: "Heart failure, unspecified", category: "Cardiovascular", billable: true },
  { code: "I63.9", description: "Cerebral infarction, unspecified", category: "Cardiovascular", billable: true },
  { code: "I67.2", description: "Cerebral atherosclerosis", category: "Cardiovascular", billable: true },
  { code: "I69.30", description: "Unspecified sequelae of cerebral infarction", category: "Cardiovascular", billable: true },
  { code: "I70.209", description: "Atherosclerosis of native arteries of unspecified extremities", category: "Cardiovascular", billable: true },
  { code: "I77.9", description: "Disorder of arteries and arterioles, unspecified", category: "Cardiovascular", billable: true },
  { code: "I82.409", description: "Acute embolism and thrombosis of unspecified deep veins of unspecified lower extremity", category: "Cardiovascular", billable: true },
  { code: "I87.2", description: "Venous insufficiency (chronic) (peripheral)", category: "Cardiovascular", billable: true },
  { code: "I95.9", description: "Hypotension, unspecified", category: "Cardiovascular", billable: true },
  { code: "R03.0", description: "Elevated blood-pressure reading, without diagnosis of hypertension", category: "Cardiovascular", billable: true },
  
  // Respiratory
  { code: "J06.9", description: "Acute upper respiratory infection, unspecified", category: "Respiratory", billable: true },
  { code: "J18.9", description: "Pneumonia, unspecified organism", category: "Respiratory", billable: true },
  { code: "J20.9", description: "Acute bronchitis, unspecified", category: "Respiratory", billable: true },
  { code: "J40", description: "Bronchitis, not specified as acute or chronic", category: "Respiratory", billable: true },
  { code: "J41.0", description: "Simple chronic bronchitis", category: "Respiratory", billable: true },
  { code: "J42", description: "Unspecified chronic bronchitis", category: "Respiratory", billable: true },
  { code: "J43.9", description: "Emphysema, unspecified", category: "Respiratory", billable: true },
  { code: "J44.1", description: "Chronic obstructive pulmonary disease with (acute) exacerbation", category: "Respiratory", billable: true },
  { code: "J44.9", description: "Chronic obstructive pulmonary disease, unspecified", category: "Respiratory", billable: true },
  { code: "J45.20", description: "Mild intermittent asthma, uncomplicated", category: "Respiratory", billable: true },
  { code: "J45.30", description: "Mild persistent asthma, uncomplicated", category: "Respiratory", billable: true },
  { code: "J45.40", description: "Moderate persistent asthma, uncomplicated", category: "Respiratory", billable: true },
  { code: "J45.50", description: "Severe persistent asthma, uncomplicated", category: "Respiratory", billable: true },
  { code: "J45.901", description: "Unspecified asthma with (acute) exacerbation", category: "Respiratory", billable: true },
  { code: "J45.909", description: "Unspecified asthma, uncomplicated", category: "Respiratory", billable: true },
  { code: "J80", description: "Acute respiratory distress syndrome", category: "Respiratory", billable: true },
  { code: "J90", description: "Pleural effusion, not elsewhere classified", category: "Respiratory", billable: true },
  { code: "J96.00", description: "Acute respiratory failure, unspecified whether with hypoxia or hypercapnia", category: "Respiratory", billable: true },
  { code: "J98.8", description: "Other respiratory disorders", category: "Respiratory", billable: true },
  { code: "R05", description: "Cough", category: "Respiratory", billable: true },
  { code: "R06.02", description: "Shortness of breath", category: "Respiratory", billable: true },
  { code: "R06.2", description: "Wheezing", category: "Respiratory", billable: true },
  { code: "R06.83", description: "Snoring", category: "Respiratory", billable: true },
  { code: "R09.3", description: "Abnormal sputum", category: "Respiratory", billable: true },
  { code: "Z87.891", description: "Personal history of nicotine dependence", category: "Respiratory", billable: true },
  
  // GI
  { code: "K08.11", description: "Complete loss of teeth due to trauma", category: "GI", billable: true },
  { code: "K21.9", description: "Gastro-esophageal reflux disease without esophagitis", category: "GI", billable: true },
  { code: "K22.4", description: "Dyskinesia of esophagus", category: "GI", billable: true },
  { code: "K25.9", description: "Gastric ulcer, unspecified as acute or chronic, without hemorrhage or perforation", category: "GI", billable: true },
  { code: "K29.00", description: "Acute gastritis without bleeding", category: "GI", billable: true },
  { code: "K29.50", description: "Unspecified chronic gastritis without bleeding", category: "GI", billable: true },
  { code: "K29.70", description: "Gastritis, unspecified, without bleeding", category: "GI", billable: true },
  { code: "K30", description: "Functional dyspepsia", category: "GI", billable: true },
  { code: "K31.89", description: "Other diseases of stomach and duodenum", category: "GI", billable: true },
  { code: "K52.9", description: "Noninfective gastroenteritis and colitis, unspecified", category: "GI", billable: true },
  { code: "K57.30", description: "Diverticulosis of large intestine without perforation or abscess without bleeding", category: "GI", billable: true },
  { code: "K57.92", description: "Diverticulitis of intestine, part unspecified, without perforation or abscess without bleeding", category: "GI", billable: true },
  { code: "K59.00", description: "Constipation, unspecified", category: "GI", billable: true },
  { code: "K59.1", description: "Functional diarrhea", category: "GI", billable: true },
  { code: "K63.5", description: "Polyp of colon", category: "GI", billable: true },
  { code: "K64.9", description: "Unspecified hemorrhoids", category: "GI", billable: true },
  { code: "K70.9", description: "Alcoholic liver disease, unspecified", category: "GI", billable: true },
  { code: "K73.9", description: "Chronic hepatitis, unspecified", category: "GI", billable: true },
  { code: "K74.60", description: "Unspecified cirrhosis of liver", category: "GI", billable: true },
  { code: "K76.0", description: "Fatty (change of) liver, not elsewhere classified", category: "GI", billable: true },
  { code: "K76.89", description: "Other specified diseases of liver", category: "GI", billable: true },
  { code: "K76.9", description: "Liver disease, unspecified", category: "GI", billable: true },
  { code: "K80.20", description: "Calculus of gallbladder without cholecystitis without obstruction", category: "GI", billable: true },
  { code: "K82.9", description: "Disease of gallbladder, unspecified", category: "GI", billable: true },
  { code: "K85.9", description: "Acute pancreatitis without mention of alcohol-induced or gallstone pancreatitis", category: "GI", billable: true },
  { code: "K86.1", description: "Other chronic pancreatitis", category: "GI", billable: true },
  { code: "K90.9", description: "Intestinal malabsorption, unspecified", category: "GI", billable: true },
  { code: "K92.2", description: "Gastrointestinal hemorrhage, unspecified", category: "GI", billable: true },
  { code: "R10.10", description: "Upper abdominal pain, unspecified", category: "GI", billable: true },
  { code: "R10.13", description: "Epigastric pain", category: "GI", billable: true },
  { code: "R10.2", description: "Pelvic and perineal pain", category: "GI", billable: true },
  { code: "R10.30", description: "Lower abdominal pain, unspecified", category: "GI", billable: true },
  { code: "R10.84", description: "Generalized abdominal pain", category: "GI", billable: true },
  { code: "R11.0", description: "Nausea", category: "GI", billable: true },
  { code: "R11.10", description: "Vomiting, unspecified", category: "GI", billable: true },
  { code: "R11.2", description: "Nausea with vomiting, unspecified", category: "GI", billable: true },
  { code: "R12", description: "Heartburn", category: "GI", billable: true },
  { code: "R13.10", description: "Dysphagia, unspecified", category: "GI", billable: true },
  { code: "R14.0", description: "Abdominal distension (gaseous)", category: "GI", billable: true },
  { code: "R14.3", description: "Flatulence", category: "GI", billable: true },
  { code: "R15.9", description: "Full incontinence of feces", category: "GI", billable: true },
  { code: "R17", description: "Unspecified jaundice", category: "GI", billable: true },
  { code: "R18.8", description: "Other ascites", category: "GI", billable: true },
  { code: "R19.7", description: "Diarrhea, unspecified", category: "GI", billable: true },
  
  // GU/Renal
  { code: "N17.9", description: "Acute kidney failure, unspecified", category: "Renal", billable: true },
  { code: "N18.1", description: "Chronic kidney disease, stage 1", category: "Renal", billable: true },
  { code: "N18.2", description: "Chronic kidney disease, stage 2 (mild)", category: "Renal", billable: true },
  { code: "N18.3", description: "Chronic kidney disease, stage 3 (moderate)", category: "Renal", billable: true },
  { code: "N18.4", description: "Chronic kidney disease, stage 4 (severe)", category: "Renal", billable: true },
  { code: "N18.5", description: "Chronic kidney disease, stage 5", category: "Renal", billable: true },
  { code: "N18.6", description: "End stage renal disease", category: "Renal", billable: true },
  { code: "N18.9", description: "Chronic kidney disease, unspecified", category: "Renal", billable: true },
  { code: "N20.0", description: "Calculus of kidney", category: "Renal", billable: true },
  { code: "N20.2", description: "Calculus of kidney with calculus of ureter", category: "Renal", billable: true },
  { code: "N28.1", description: "Cyst of kidney, acquired", category: "Renal", billable: true },
  { code: "N28.89", description: "Other specified disorders of kidney and ureter", category: "Renal", billable: true },
  { code: "N30.00", description: "Acute cystitis without hematuria", category: "Renal", billable: true },
  { code: "N30.01", description: "Acute cystitis with hematuria", category: "Renal", billable: true },
  { code: "N39.0", description: "Urinary tract infection, site not specified", category: "Renal", billable: true },
  { code: "N40.0", description: "Benign prostatic hyperplasia without lower urinary tract symptoms", category: "Renal", billable: true },
  { code: "N40.1", description: "Benign prostatic hyperplasia with lower urinary tract symptoms", category: "Renal", billable: true },
  { code: "N40.3", description: "Nodular prostate without lower urinary tract symptoms", category: "Renal", billable: true },
  { code: "N41.0", description: "Acute prostatitis", category: "Renal", billable: true },
  { code: "N43.3", description: "Hydrocele, unspecified", category: "Renal", billable: true },
  { code: "N45.1", description: "Epididymitis", category: "Renal", billable: true },
  { code: "N46.9", description: "Male infertility, unspecified", category: "Renal", billable: true },
  { code: "N47.1", description: "Phimosis", category: "Renal", billable: true },
  { code: "N48.1", description: "Balanitis", category: "Renal", billable: true },
  { code: "N76.0", description: "Acute vaginitis", category: "Renal", billable: true },
  { code: "N81.4", description: "Uterovaginal prolapse, unspecified", category: "Renal", billable: true },
  { code: "N83.2", description: "Other and unspecified ovarian cysts", category: "Renal", billable: true },
  { code: "N84.0", description: "Polyp of corpus uteri", category: "Renal", billable: true },
  { code: "N85.0", description: "Endometrial hyperplasia", category: "Renal", billable: true },
  { code: "N92.0", description: "Excessive and frequent menstruation with regular cycle", category: "Renal", billable: true },
  { code: "N92.1", description: "Excessive and frequent menstruation with irregular cycle", category: "Renal", billable: true },
  { code: "N92.5", description: "Other specified irregular menstruation", category: "Renal", billable: true },
  { code: "N92.6", description: "Irregular menstruation, unspecified", category: "Renal", billable: true },
  { code: "N93.9", description: "Abnormal uterine and vaginal bleeding, unspecified", category: "Renal", billable: true },
  { code: "N94.6", description: "Dysmenorrhea, unspecified", category: "Renal", billable: true },
  { code: "N97.9", description: "Female infertility, unspecified", category: "Renal", billable: true },
  { code: "R31.9", description: "Hematuria, unspecified", category: "Renal", billable: true },
  { code: "R32", description: "Unspecified urinary incontinence", category: "Renal", billable: true },
  { code: "R35.0", description: "Frequency of micturition", category: "Renal", billable: true },
  { code: "R80.9", description: "Proteinuria, unspecified", category: "Renal", billable: true },
  
  // Musculoskeletal
  { code: "M06.9", description: "Rheumatoid arthritis, unspecified", category: "MSK", billable: true },
  { code: "M10.9", description: "Gout, unspecified", category: "MSK", billable: true },
  { code: "M15.0", description: "Primary generalized (osteo)arthritis", category: "MSK", billable: true },
  { code: "M16.0", description: "Bilateral primary osteoarthritis of hip", category: "MSK", billable: true },
  { code: "M17.0", description: "Bilateral primary osteoarthritis of knee", category: "MSK", billable: true },
  { code: "M17.9", description: "Osteoarthritis of knee, unspecified", category: "MSK", billable: true },
  { code: "M19.90", description: "Unspecified osteoarthritis, unspecified site", category: "MSK", billable: true },
  { code: "M23.91", description: "Unspecified internal derangement of unspecified knee", category: "MSK", billable: true },
  { code: "M25.50", description: "Pain in unspecified joint", category: "MSK", billable: true },
  { code: "M25.51", description: "Pain in shoulder", category: "MSK", billable: true },
  { code: "M25.52", description: "Pain in elbow", category: "MSK", billable: true },
  { code: "M25.53", description: "Pain in wrist", category: "MSK", billable: true },
  { code: "M25.54", description: "Pain in joints of hand", category: "MSK", billable: true },
  { code: "M25.55", description: "Pain in hip", category: "MSK", billable: true },
  { code: "M25.56", description: "Pain in knee", category: "MSK", billable: true },
  { code: "M25.57", description: "Pain in ankle and joints of foot", category: "MSK", billable: true },
  { code: "M32.9", description: "Systemic lupus erythematosus, unspecified", category: "MSK", billable: true },
  { code: "M41.9", description: "Scoliosis, unspecified", category: "MSK", billable: true },
  { code: "M43.6", description: "Torticollis", category: "MSK", billable: true },
  { code: "M47.9", description: "Spondylosis, unspecified", category: "MSK", billable: true },
  { code: "M48.00", description: "Spinal stenosis, site unspecified", category: "MSK", billable: true },
  { code: "M51.9", description: "Intervertebral disc disorder, unspecified", category: "MSK", billable: true },
  { code: "M54.2", description: "Cervicalgia", category: "MSK", billable: true },
  { code: "M54.30", description: "Sciatica, unspecified side", category: "MSK", billable: true },
  { code: "M54.5", description: "Low back pain", category: "MSK", billable: true },
  { code: "M54.9", description: "Dorsalgia, unspecified", category: "MSK", billable: true },
  { code: "M65.9", description: "Synovitis and tenosynovitis, unspecified", category: "MSK", billable: true },
  { code: "M70.9", description: "Soft tissue disorder related to use, overuse and pressure, unspecified", category: "MSK", billable: true },
  { code: "M71.9", description: "Bursopathy, unspecified", category: "MSK", billable: true },
  { code: "M75.30", description: "Calcific tendinitis of unspecified shoulder", category: "MSK", billable: true },
  { code: "M75.41", description: "Impingement syndrome of right shoulder", category: "MSK", billable: true },
  { code: "M75.42", description: "Impingement syndrome of left shoulder", category: "MSK", billable: true },
  { code: "M75.51", description: "Bursitis of right shoulder", category: "MSK", billable: true },
  { code: "M76.61", description: "Achilles tendinitis, right leg", category: "MSK", billable: true },
  { code: "M77.40", description: "Metatarsalgia, unspecified foot", category: "MSK", billable: true },
  { code: "M79.1", description: "Myalgia", category: "MSK", billable: true },
  { code: "M79.3", description: "Panniculitis, unspecified", category: "MSK", billable: true },
  { code: "M79.7", description: "Fibromyalgia", category: "MSK", billable: true },
  { code: "M80.00", description: "Age-related osteoporosis without current pathological fracture", category: "MSK", billable: true },
  { code: "M81.0", description: "Age-related osteoporosis without current pathological fracture", category: "MSK", billable: true },
  { code: "M81.8", description: "Other osteoporosis without current pathological fracture", category: "MSK", billable: true },
  { code: "M84.9", description: "Unspecified disorder of continuity of bone", category: "MSK", billable: true },
  { code: "M89.9", description: "Disorder of bone, unspecified", category: "MSK", billable: true },
  { code: "S52.509A", description: "Unspecified fracture of the lower end of unspecified radius, initial encounter for closed fracture", category: "MSK", billable: true },
  { code: "S72.001A", description: "Fracture of unspecified part of neck of right femur, initial encounter for closed fracture", category: "MSK", billable: true },
  { code: "S82.101A", description: "Unspecified fracture of upper end of right tibia, initial encounter for closed fracture", category: "MSK", billable: true },
  { code: "S93.401A", description: "Sprain of unspecified ligament of right ankle, initial encounter", category: "MSK", billable: true },
  
  // Skin
  { code: "A63.0", description: "Anogenital (venereal) warts", category: "Skin", billable: true },
  { code: "B00.1", description: "Herpesviral vesicular dermatitis", category: "Skin", billable: true },
  { code: "B07.9", description: "Viral wart, unspecified", category: "Skin", billable: true },
  { code: "B35.1", description: "Tinea unguium", category: "Skin", billable: true },
  { code: "B35.3", description: "Tinea pedis", category: "Skin", billable: true },
  { code: "B86", description: "Scabies", category: "Skin", billable: true },
  { code: "E11.621", description: "Type 2 diabetes mellitus with foot ulcer", category: "Skin", billable: true },
  { code: "E11.628", description: "Type 2 diabetes mellitus with other skin ulcer", category: "Skin", billable: true },
  { code: "H05.229", description: "Edema of unspecified orbit", category: "Skin", billable: true },
  { code: "I83.009", description: "Varicose veins of unspecified lower extremity with ulcer of unspecified site", category: "Skin", billable: true },
  { code: "L02.91", description: "Cutaneous abscess, unspecified", category: "Skin", billable: true },
  { code: "L03.90", description: "Cellulitis, unspecified", category: "Skin", billable: true },
  { code: "L03.119", description: "Cellulitis of unspecified part of limb", category: "Skin", billable: true },
  { code: "L08.9", description: "Local infection of the skin and subcutaneous tissue, unspecified", category: "Skin", billable: true },
  { code: "L20.9", description: "Atopic dermatitis, unspecified", category: "Skin", billable: true },
  { code: "L21.9", description: "Seborrheic dermatitis, unspecified", category: "Skin", billable: true },
  { code: "L22", description: "Diaper dermatitis", category: "Skin", billable: true },
  { code: "L23.9", description: "Allergic contact dermatitis, unspecified cause", category: "Skin", billable: true },
  { code: "L24.9", description: "Irritant contact dermatitis, unspecified cause", category: "Skin", billable: true },
  { code: "L25.9", description: "Unspecified contact dermatitis", category: "Skin", billable: true },
  { code: "L26", description: "Exfoliative dermatitis", category: "Skin", billable: true },
  { code: "L27.0", description: "Generalized skin eruption due to drugs and medicaments taken internally", category: "Skin", billable: true },
  { code: "L27.1", description: "Localized skin eruption due to drugs and medicaments taken internally", category: "Skin", billable: true },
  { code: "L28.0", description: "Lichen simplex chronicus", category: "Skin", billable: true },
  { code: "L29.9", description: "Pruritus, unspecified", category: "Skin", billable: true },
  { code: "L30.9", description: "Dermatitis, unspecified", category: "Skin", billable: true },
  { code: "L40.9", description: "Psoriasis, unspecified", category: "Skin", billable: true },
  { code: "L50.9", description: "Urticaria, unspecified", category: "Skin", billable: true },
  { code: "L53.9", description: "Erythematous condition, unspecified", category: "Skin", billable: true },
  { code: "L57.0", description: "Actinic keratosis", category: "Skin", billable: true },
  { code: "L60.0", description: "Ingrowing nail", category: "Skin", billable: true },
  { code: "L60.9", description: "Nail disorder, unspecified", category: "Skin", billable: true },
  { code: "L65.9", description: "Nonscarring hair loss, unspecified", category: "Skin", billable: true },
  { code: "L70.9", description: "Acne, unspecified", category: "Skin", billable: true },
  { code: "L72.3", description: "Sebaceous cyst", category: "Skin", billable: true },
  { code: "L73.9", description: "Follicular disorder, unspecified", category: "Skin", billable: true },
  { code: "L81.7", description: "Pigmented purpuric dermatosis", category: "Skin", billable: true },
  { code: "L82.1", description: "Other seborrheic keratosis", category: "Skin", billable: true },
  { code: "L83", description: "Acanthosis nigricans", category: "Skin", billable: true },
  { code: "L85.3", description: "Xerosis cutis", category: "Skin", billable: true },
  { code: "L90.5", description: "Scar conditions and fibrosis of skin", category: "Skin", billable: true },
  { code: "L91.0", description: "Hypertrophic scar", category: "Skin", billable: true },
  { code: "L92.9", description: "Granulomatous disorder of the skin and subcutaneous tissue, unspecified", category: "Skin", billable: true },
  { code: "L97.909", description: "Non-pressure chronic ulcer of unspecified part of unspecified lower leg with unspecified severity", category: "Skin", billable: true },
  { code: "L98.9", description: "Disorder of the skin and subcutaneous tissue, unspecified", category: "Skin", billable: true },
  { code: "R21", description: "Rash and other nonspecific skin eruption", category: "Skin", billable: true },
  { code: "R22.9", description: "Localized swelling, mass and lump, unspecified", category: "Skin", billable: true },
  { code: "R23.8", description: "Other skin changes", category: "Skin", billable: true },
  { code: "R60.0", description: "Localized edema", category: "Skin", billable: true },
  { code: "R60.9", description: "Edema, unspecified", category: "Skin", billable: true },
  
  // General Symptoms
  { code: "R50.9", description: "Fever, unspecified", category: "Symptoms", billable: true },
  { code: "R51", description: "Headache", category: "Symptoms", billable: true },
  { code: "R52", description: "Pain, unspecified", category: "Symptoms", billable: true },
  { code: "R53.83", description: "Fatigue", category: "Symptoms", billable: true },
  { code: "R54", description: "Age-related physical debility", category: "Symptoms", billable: true },
  { code: "R55", description: "Syncope and collapse", category: "Symptoms", billable: true },
  { code: "R58", description: "Hemorrhage, not elsewhere classified", category: "Symptoms", billable: true },
  { code: "R59.9", description: "Enlarged lymph nodes, unspecified", category: "Symptoms", billable: true },
  { code: "R60.0", description: "Localized edema", category: "Symptoms", billable: true },
  { code: "R60.9", description: "Edema, unspecified", category: "Symptoms", billable: true },
  { code: "R63.0", description: "Anorexia", category: "Symptoms", billable: true },
  { code: "R63.4", description: "Abnormal weight loss", category: "Symptoms", billable: true },
  { code: "R63.5", description: "Abnormal weight gain", category: "Symptoms", billable: true },
  { code: "R68.81", description: "Early satiety", category: "Symptoms", billable: true },
  { code: "R68.83", description: "Chills", category: "Symptoms", billable: true },
  { code: "R69", description: "Illness, unspecified", category: "Symptoms", billable: true },
  { code: "R73.9", description: "Hyperglycemia, unspecified", category: "Symptoms", billable: true },
  { code: "R73.01", description: "Impaired fasting glucose", category: "Symptoms", billable: true },
  { code: "R79.9", description: "Abnormal finding of blood chemistry, unspecified", category: "Symptoms", billable: true },
  { code: "R91.1", description: "Solitary pulmonary nodule", category: "Symptoms", billable: true },
  { code: "R92.0", description: "Mammographic microcalcification found on diagnostic imaging of breast", category: "Symptoms", billable: true },
  { code: "R93.1", description: "Abnormal findings on diagnostic imaging of heart and coronary circulation", category: "Symptoms", billable: true },
  { code: "R93.5", description: "Abnormal findings on diagnostic imaging of other abdominal regions, including retroperitoneum", category: "Symptoms", billable: true },
  { code: "R94.5", description: "Abnormal results of liver function studies", category: "Symptoms", billable: true },
  { code: "R99", description: "Ill-defined and unknown cause of mortality", category: "Symptoms", billable: true },
  
  // Preventive/Wellness
  { code: "Z00.00", description: "Encounter for general adult medical examination without abnormal findings", category: "Preventive", billable: true },
  { code: "Z00.01", description: "Encounter for general adult medical examination with abnormal findings", category: "Preventive", billable: true },
  { code: "Z00.110", description: "Health examination for newborn under 8 days old", category: "Preventive", billable: true },
  { code: "Z00.121", description: "Encounter for routine child health examination with abnormal findings", category: "Preventive", billable: true },
  { code: "Z00.129", description: "Encounter for routine child health examination without abnormal findings", category: "Preventive", billable: true },
  { code: "Z00.8", description: "Encounter for other general examination", category: "Preventive", billable: true },
  { code: "Z01.411", description: "Encounter for gynecological examination (general) (routine) with abnormal findings", category: "Preventive", billable: true },
  { code: "Z01.419", description: "Encounter for gynecological examination (general) (routine) without abnormal findings", category: "Preventive", billable: true },
  { code: "Z02.0", description: "Encounter for examination for admission to educational institution", category: "Preventive", billable: true },
  { code: "Z02.1", description: "Encounter for pre-employment examination", category: "Preventive", billable: true },
  { code: "Z02.2", description: "Encounter for examination for admission to residential institution", category: "Preventive", billable: true },
  { code: "Z02.3", description: "Encounter for examination for recruitment to armed forces", category: "Preventive", billable: true },
  { code: "Z02.4", description: "Encounter for examination for driving license", category: "Preventive", billable: true },
  { code: "Z02.5", description: "Encounter for examination for participation in sport", category: "Preventive", billable: true },
  { code: "Z02.6", description: "Encounter for examination for insurance purposes", category: "Preventive", billable: true },
  { code: "Z02.71", description: "Encounter for disability determination", category: "Preventive", billable: true },
  { code: "Z02.79", description: "Encounter for issue of other medical certificate", category: "Preventive", billable: true },
  { code: "Z02.81", description: "Encounter for paternity testing", category: "Preventive", billable: true },
  { code: "Z02.82", description: "Encounter for adoption services", category: "Preventive", billable: true },
  { code: "Z02.83", description: "Encounter for blood typing", category: "Preventive", billable: true },
  { code: "Z02.89", description: "Encounter for other administrative examinations", category: "Preventive", billable: true },
  { code: "Z02.9", description: "Encounter for administrative examination, unspecified", category: "Preventive", billable: true },
  
  // Counseling/Risk Factors
  { code: "Z30.011", description: "Encounter for initial prescription of contraceptive pills", category: "Counseling", billable: true },
  { code: "Z30.09", description: "Encounter for other general counseling and advice on contraception", category: "Counseling", billable: true },
  { code: "Z30.430", description: "Encounter for surveillance of contraceptive pills", category: "Counseling", billable: true },
  { code: "Z31.41", description: "Encounter for fertility testing", category: "Counseling", billable: true },
  { code: "Z31.83", description: "Encounter for assisted reproductive fertility procedure cycle", category: "Counseling", billable: true },
  { code: "Z32.01", description: "Encounter for pregnancy test, result positive", category: "Counseling", billable: true },
  { code: "Z33.1", description: "Pregnant state, incidental", category: "Counseling", billable: true },
  { code: "Z34.00", description: "Encounter for supervision of normal first pregnancy, unspecified trimester", category: "Counseling", billable: true },
  { code: "Z34.80", description: "Encounter for supervision of other normal pregnancy, unspecified trimester", category: "Counseling", billable: true },
  { code: "Z34.90", description: "Encounter for supervision of normal pregnancy, unspecified, unspecified trimester", category: "Counseling", billable: true },
  { code: "Z36", description: "Encounter for antenatal screening for mother", category: "Counseling", billable: true },
  { code: "Z39.1", description: "Encounter for care and examination of lactating mother", category: "Counseling", billable: true },
  { code: "Z51.11", description: "Encounter for antineoplastic chemotherapy", category: "Counseling", billable: true },
  { code: "Z71.3", description: "Dietary counseling and surveillance", category: "Counseling", billable: true },
  { code: "Z71.41", description: "Spiritual or religious counseling", category: "Counseling", billable: true },
  { code: "Z71.6", description: "Tobacco abuse counseling", category: "Counseling", billable: true },
  { code: "Z71.89", description: "Other specified counseling", category: "Counseling", billable: true },
  { code: "Z76.81", description: "Expectant mother prebirth pediatrician visit", category: "Counseling", billable: true },
  
  // History/Status
  { code: "Z09", description: "Encounter for follow-up examination after completed treatment for conditions other than malignant neoplasm", category: "History", billable: true },
  { code: "Z12.11", description: "Encounter for screening for malignant neoplasm of colon", category: "History", billable: true },
  { code: "Z12.31", description: "Encounter for screening mammogram for malignant neoplasm of breast", category: "History", billable: true },
  { code: "Z12.4", description: "Encounter for screening for malignant neoplasm of cervix", category: "History", billable: true },
  { code: "Z12.5", description: "Encounter for screening for malignant neoplasm of prostate", category: "History", billable: true },
  { code: "Z13.1", description: "Encounter for screening for diabetes mellitus", category: "History", billable: true },
  { code: "Z13.220", description: "Encounter for screening for lipoid disorders", category: "History", billable: true },
  { code: "Z13.6", description: "Encounter for screening for cardiovascular disorders", category: "History", billable: true },
  { code: "Z13.89", description: "Encounter for screening for other disorder", category: "History", billable: true },
  { code: "Z13.9", description: "Encounter for screening, unspecified", category: "History", billable: true },
  { code: "Z45.018", description: "Encounter for adjusting and management of other cardiac pacemaker", category: "History", billable: true },
  { code: "Z45.02", description: "Encounter for adjustment and management of automatic implantable cardiac defibrillator", category: "History", billable: true },
  { code: "Z51.81", description: "Encounter for therapeutic drug level monitoring", category: "History", billable: true },
  { code: "Z79.01", description: "Long term (current) use of anticoagulants", category: "History", billable: true },
  { code: "Z79.1", description: "Long term (current) use of non-steroidal anti-inflammatories (NSAID)", category: "History", billable: true },
  { code: "Z79.2", description: "Long term (current) use of antibiotics", category: "History", billable: true },
  { code: "Z79.3", description: "Long term (current) use of hormonal contraceptives", category: "History", billable: true },
  { code: "Z79.4", description: "Long term (current) use of insulin", category: "History", billable: true },
  { code: "Z79.51", description: "Long term (current) use of inhaled steroids", category: "History", billable: true },
  { code: "Z79.52", description: "Long term (current) use of systemic steroids", category: "History", billable: true },
  { code: "Z79.82", description: "Long term (current) use of aspirin", category: "History", billable: true },
  { code: "Z79.84", description: "Long term (current) use of oral hypoglycemic drugs", category: "History", billable: true },
  { code: "Z79.890", description: "Long term (current) use of other agents affecting estrogen receptors and estrogen levels", category: "History", billable: true },
  { code: "Z79.899", description: "Other long term (current) drug therapy", category: "History", billable: true },
  { code: "Z79.91", description: "Long term (current) use of opiate analgesic", category: "History", billable: true },
  { code: "Z86.010", description: "Personal history of colonic polyps", category: "History", billable: true },
  { code: "Z86.11", description: "Personal history of tuberculosis", category: "History", billable: true },
  { code: "Z86.59", description: "Personal history of other mental and behavioral disorders", category: "History", billable: true },
  { code: "Z86.71", description: "Personal history of venous thrombosis and embolism", category: "History", billable: true },
  { code: "Z86.73", description: "Personal history of transient ischemic attack (TIA), and cerebral infarction without residual deficits", category: "History", billable: true },
  { code: "Z86.79", description: "Personal history of other diseases of the circulatory system", category: "History", billable: true },
  { code: "Z87.19", description: "Personal history of other diseases of the digestive system", category: "History", billable: true },
  { code: "Z87.891", description: "Personal history of nicotine dependence", category: "History", billable: true },
  { code: "Z87.892", description: "Personal history of use of other agents affecting estrogen receptors and estrogen levels", category: "History", billable: true },
  { code: "Z88.0", description: "Allergy status to penicillin", category: "History", billable: true },
  { code: "Z88.1", description: "Allergy status to other antibiotic agents", category: "History", billable: true },
  { code: "Z88.3", description: "Allergy status to sulfonamides", category: "History", billable: true },
  { code: "Z88.4", description: "Allergy status to other anti-infective agents", category: "History", billable: true },
  { code: "Z88.5", description: "Allergy status to narcotic agents", category: "History", billable: true },
  { code: "Z88.8", description: "Allergy status to other drugs, medicaments and biological substances", category: "History", billable: true },
  { code: "Z89.9", description: "Acquired absence of limb, unspecified", category: "History", billable: true },
  { code: "Z90.010", description: "Acquired absence of left breast and nipple", category: "History", billable: true },
  { code: "Z90.011", description: "Acquired absence of right breast and nipple", category: "History", billable: true },
  { code: "Z90.012", description: "Acquired absence of bilateral breasts and nipples", category: "History", billable: true },
  { code: "Z90.09", description: "Acquired absence of other part of breast and nipple", category: "History", billable: true },
  { code: "Z90.710", description: "Acquired absence of both cervix and uterus", category: "History", billable: true },
  { code: "Z90.711", description: "Acquired absence of uterus with remaining cervical stump", category: "History", billable: true },
  { code: "Z90.712", description: "Acquired absence of cervix with remaining uterus", category: "History", billable: true },
  { code: "Z90.79", description: "Acquired absence of other genital organ(s)", category: "History", billable: true },
  { code: "Z90.81", description: "Acquired absence of spleen", category: "History", billable: true },
  { code: "Z91.14", description: "Patient's other noncompliance with medication regimen", category: "History", billable: true },
  { code: "Z91.15", description: "Patient's noncompliance with renal dialysis", category: "History", billable: true },
  { code: "Z91.81", description: "History of falling", category: "History", billable: true },
  { code: "Z92.0", description: "Personal history of contraception", category: "History", billable: true },
  { code: "Z92.21", description: "Personal history of antineoplastic chemotherapy", category: "History", billable: true },
  { code: "Z92.22", description: "Personal history of monoclonal drug therapy", category: "History", billable: true },
  { code: "Z92.23", description: "Personal history of estrogen therapy", category: "History", billable: true },
  { code: "Z92.240", description: "Personal history of inhaled steroid therapy", category: "History", billable: true },
  { code: "Z92.241", description: "Personal history of systemic steroid therapy", category: "History", billable: true },
  { code: "Z92.25", description: "Personal history of immunosuppression therapy", category: "History", billable: true },
  { code: "Z93.0", description: "Tracheostomy status", category: "History", billable: true },
  { code: "Z93.1", description: "Gastrostomy status", category: "History", billable: true },
  { code: "Z93.3", description: "Colostomy status", category: "History", billable: true },
  { code: "Z93.4", description: "Other artificial openings of gastrointestinal tract status", category: "History", billable: true },
  { code: "Z93.50", description: "Unspecified cystostomy status", category: "History", billable: true },
  { code: "Z93.51", description: "Cutaneous vesicostomy status", category: "History", billable: true },
  { code: "Z93.59", description: "Other cystostomy status", category: "History", billable: true },
  { code: "Z94.0", description: "Kidney transplant status", category: "History", billable: true },
  { code: "Z94.1", description: "Heart transplant status", category: "History", billable: true },
  { code: "Z94.2", description: "Lung transplant status", category: "History", billable: true },
  { code: "Z94.3", description: "Heart and lungs transplant status", category: "History", billable: true },
  { code: "Z94.4", description: "Liver transplant status", category: "History", billable: true },
  { code: "Z94.5", description: "Skin transplant status", category: "History", billable: true },
  { code: "Z94.6", description: "Bone transplant status", category: "History", billable: true },
  { code: "Z94.7", description: "Corneal transplant status", category: "History", billable: true },
  { code: "Z94.81", description: "Bone marrow transplant status", category: "History", billable: true },
  { code: "Z94.82", description: "Intestine transplant status", category: "History", billable: true },
  { code: "Z94.83", description: "Pancreas transplant status", category: "History", billable: true },
  { code: "Z94.84", description: "Stem cell transplant status", category: "History", billable: true },
  { code: "Z94.89", description: "Other transplanted organ and tissue status", category: "History", billable: true },
  { code: "Z95.0", description: "Presence of cardiac pacemaker", category: "History", billable: true },
  { code: "Z95.1", description: "Presence of aortocoronary bypass graft", category: "History", billable: true },
  { code: "Z95.5", description: "Presence of coronary angioplasty implant and graft", category: "History", billable: true },
  { code: "Z95.810", description: "Presence of automatic (implantable) cardiac defibrillator", category: "History", billable: true },
  { code: "Z95.818", description: "Presence of other cardiac implants and grafts", category: "History", billable: true },
  { code: "Z95.828", description: "Presence of other vascular implants and grafts", category: "History", billable: true },
  { code: "Z95.9", description: "Presence of cardiac and vascular implant and graft, unspecified", category: "History", billable: true },
  { code: "Z96.1", description: "Presence of intraocular lens", category: "History", billable: true },
  { code: "Z96.60", description: "Presence of unspecified orthopedic joint implant", category: "History", billable: true },
  { code: "Z96.641", description: "Presence of right artificial hip joint", category: "History", billable: true },
  { code: "Z96.642", description: "Presence of left artificial hip joint", category: "History", billable: true },
  { code: "Z96.651", description: "Presence of right artificial knee joint", category: "History", billable: true },
  { code: "Z96.652", description: "Presence of left artificial knee joint", category: "History", billable: true },
  { code: "Z97.1", description: "Presence of artificial limb (complete) (partial)", category: "History", billable: true },
  { code: "Z97.2", description: "Presence of dental prosthetic device (complete) (partial)", category: "History", billable: true },
  { code: "Z97.4", description: "Presence of external hearing-aid", category: "History", billable: true },
  { code: "Z97.5", description: "Presence of (intrauterine) contraceptive device", category: "History", billable: true },
  { code: "Z98.0", description: "Intestinal bypass and anastomosis status", category: "History", billable: true },
  { code: "Z98.1", description: "Arthrodesis status", category: "History", billable: true },
  { code: "Z98.41", description: "Cataract extraction status, right eye", category: "History", billable: true },
  { code: "Z98.42", description: "Cataract extraction status, left eye", category: "History", billable: true },
  { code: "Z98.49", description: "Other cataract extraction status", category: "History", billable: true },
  { code: "Z98.62", description: "Peripheral vascular angioplasty status", category: "History", billable: true },
  { code: "Z98.81", description: "Breast implant status", category: "History", billable: true },
  { code: "Z98.83", description: "Filtering (vitreous) bleb after glaucoma surgery status", category: "History", billable: true },
  { code: "Z98.84", description: "Bariatric surgery status", category: "History", billable: true },
  { code: "Z98.890", description: "Other specified postprocedural states", category: "History", billable: true },
  { code: "Z99.11", description: "Dependence on respirator [ventilator] status", category: "History", billable: true },
  { code: "Z99.2", description: "Dependence on renal dialysis", category: "History", billable: true },
  { code: "Z99.3", description: "Dependence on wheelchair", category: "History", billable: true },
  { code: "Z99.81", description: "Dependence on supplemental oxygen", category: "History", billable: true },
  { code: "Z99.89", description: "Dependence on other enabling machines and devices", category: "History", billable: true },
];

// Search functions
export function searchCPTCodes(query: string): CPTCode[] {
  const lowerQuery = query.toLowerCase();
  return CPT_CODES.filter(
    (code) =>
      code.code.toLowerCase().includes(lowerQuery) ||
      code.description.toLowerCase().includes(lowerQuery) ||
      code.category.toLowerCase().includes(lowerQuery)
  );
}

export function searchICD10Codes(query: string): ICD10Code[] {
  const lowerQuery = query.toLowerCase();
  return ICD10_CODES.filter(
    (code) =>
      code.code.toLowerCase().includes(lowerQuery) ||
      code.description.toLowerCase().includes(lowerQuery) ||
      code.category.toLowerCase().includes(lowerQuery)
  );
}

export function getCPTCode(code: string): CPTCode | undefined {
  return CPT_CODES.find((c) => c.code === code);
}

export function getICD10Code(code: string): ICD10Code | undefined {
  return ICD10_CODES.find((c) => c.code === code);
}

export function getCPTCodesByCategory(category: string): CPTCode[] {
  return CPT_CODES.filter((c) => c.category === category);
}

export function getICD10CodesByCategory(category: string): ICD10Code[] {
  return ICD10_CODES.filter((c) => c.category === category);
}

// Categories
export const CPT_CATEGORIES = Array.from(new Set(CPT_CODES.map((c) => c.category)));
export const ICD10_CATEGORIES = Array.from(new Set(ICD10_CODES.map((c) => c.category)));

// Recent codes storage (in-memory with localStorage backup)
const RECENT_CODES_KEY = 'aims_recent_codes';

export function getRecentCodes(): { cpt: string[]; icd10: string[] } {
  if (typeof window === 'undefined') return { cpt: [], icd10: [] };
  const stored = localStorage.getItem(RECENT_CODES_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  return { cpt: [], icd10: [] };
}

export function addRecentCode(type: 'cpt' | 'icd10', code: string): void {
  if (typeof window === 'undefined') return;
  const recent = getRecentCodes();
  const list = type === 'cpt' ? recent.cpt : recent.icd10;
  // Remove if exists and add to front
  const filtered = list.filter((c) => c !== code);
  filtered.unshift(code);
  // Keep only last 20
  const trimmed = filtered.slice(0, 20);
  if (type === 'cpt') {
    recent.cpt = trimmed;
  } else {
    recent.icd10 = trimmed;
  }
  localStorage.setItem(RECENT_CODES_KEY, JSON.stringify(recent));
}

// AI-powered code extraction (mock - replace with actual AI call)
export async function extractCodesFromNote(
  note: string
): Promise<{ cpt: CPTCode[]; icd10: ICD10Code[] }> {
  // This would typically call your AI service
  // For now, do simple keyword matching
  const lowerNote = note.toLowerCase();
  
  const matchedCPT = CPT_CODES.filter(
    (code) =>
      lowerNote.includes(code.description.toLowerCase()) ||
      lowerNote.includes(code.category.toLowerCase())
  ).slice(0, 10);
  
  const matchedICD10 = ICD10_CODES.filter(
    (code) =>
      lowerNote.includes(code.description.toLowerCase()) ||
      lowerNote.includes(code.category.toLowerCase())
  ).slice(0, 10);
  
  return { cpt: matchedCPT, icd10: matchedICD10 };
}
