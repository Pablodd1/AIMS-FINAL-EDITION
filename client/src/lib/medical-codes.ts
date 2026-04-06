
export interface MedicalCode {
    code: string;
    description: string;
}

export const COMMON_ICD10_CODES: MedicalCode[] = [
    { code: "R53.81", description: "Other malaise" },
    { code: "R53.83", description: "Other fatigue" },
    { code: "R51.9", description: "Headache, unspecified" },
    { code: "R05.9", description: "Cough, unspecified" },
    { code: "R06.02", description: "Shortness of breath" },
    { code: "R07.9", description: "Chest pain, unspecified" },
    { code: "M54.50", description: "Low back pain, unspecified" },
    { code: "I10", description: "Essential (primary) hypertension" },
    { code: "E11.9", description: "Type 2 diabetes mellitus without complications" },
    { code: "E78.5", description: "Hyperlipidemia, unspecified" },
    { code: "F41.1", description: "Generalized anxiety disorder" },
    { code: "F32.9", description: "Major depressive disorder, single episode, unspecified" },
    { code: "J06.9", description: "Acute upper respiratory infection, unspecified" },
    { code: "N39.0", description: "Urinary tract infection, site not specified" },
    { code: "Z00.00", description: "Encounter for general adult medical examination without abnormal findings" },
];

export const COMMON_CPT_CODES: MedicalCode[] = [
    { code: "99213", description: "Office visit, established patient, 20-29 min" },
    { code: "99214", description: "Office visit, established patient, 30-39 min" },
    { code: "99203", description: "Office visit, new patient, 30-44 min" },
    { code: "99204", description: "Office visit, new patient, 45-59 min" },
    { code: "99212", description: "Office visit, established patient, 10-19 min" },
    { code: "36415", description: "Collection of venous blood by venipuncture" },
    { code: "93000", description: "Electrocardiogram, routine ECG with at least 12 leads" },
    { code: "90686", description: "Influenza virus vaccine, quadrivalent, for intramuscular use" },
    { code: "90471", description: "Immunization administration, single or combined vaccine" },
    { code: "99401", description: "Preventive medicine counseling and/or risk factor reduction" },
    { code: "99215", description: "Office visit, established patient, 40-54 min" },
];
