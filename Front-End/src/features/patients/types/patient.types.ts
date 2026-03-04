/** Siglas de tipos de identificación (valor almacenado en BD) */
export type IdentificationType =
    | 'CC'   // Cédula de Ciudadanía
    | 'TI'   // Tarjeta de Identidad
    | 'RC'   // Registro Civil
    | 'PA'   // Pasaporte
    | 'CE'   // Cédula de Extranjería
    | 'DE'   // Documento Extranjero
    | 'SC'   // Salvoconducto
    | 'NIT'  // NIT
    | 'CD'   // Carnet Diplomático
    | 'NN';  // NN

/** Orden de visualización de tipos de identificación en selects */
export const IDENTIFICATION_TYPE_OPTIONS: { value: IdentificationType; label: string }[] = [
    { value: 'CC', label: 'Cédula de Ciudadanía' },
    { value: 'TI', label: 'Tarjeta de Identidad' },
    { value: 'RC', label: 'Registro Civil' },
    { value: 'PA', label: 'Pasaporte' },
    { value: 'CE', label: 'Cédula de Extranjería' },
    { value: 'DE', label: 'Documento Extranjero' },
    { value: 'SC', label: 'Salvoconducto' },
    { value: 'NIT', label: 'NIT' },
    { value: 'CD', label: 'Carnet Diplomático' },
    { value: 'NN', label: 'NN' }
];

export type Gender = 'Masculino' | 'Femenino';
export type CareType = 'Ambulatorio' | 'Hospitalizado';

export interface PatientLocation {
    country?: string;
    department?: string;
    municipality?: string;
    /** Municipio donde nació el paciente (nombre legible) */
    birth_municipality_name?: string;
    /** Municipio de residencia del paciente (nombre legible) */
    residence_municipality_name?: string;
    subregion?: string;
    address?: string;
}

export interface EntityInfo {
    entity_name?: string;
    eps_name?: string;
}

export interface AuditEntry {
    action: 'created' | 'updated';
    user_email: string;
    timestamp: string;
}

export interface Patient {
    id?: string; // UUID or database ID
    patient_code: string; // Unique system code
    identification_type: IdentificationType;
    identification_number: string;
    first_name: string;
    second_name?: string;
    first_lastname: string;
    second_lastname?: string;
    full_name?: string; // Computed
    birth_date?: string; // ISO Date YYYY-MM-DD
    age?: number;
    gender: Gender;
    phone?: string;
    email?: string;
    location?: PatientLocation;
    entity_info?: EntityInfo;
    care_type: CareType;
    observations?: string;
    created_at?: string;
    updated_at?: string;
    audit_info?: AuditEntry[];
}

export interface PatientFilters {
    search?: string;
    created_at_from?: string;
    created_at_to?: string;
    entity?: string;
    care_type?: CareType | '';
    gender?: Gender | '';
    municipality_code?: string;
    skip?: number;
    limit?: number;
}

export interface CreatePatientRequest extends Omit<Patient, 'id' | 'patient_code' | 'created_at' | 'updated_at' | 'full_name'> {
    // Age can be entered manually or calculated from birth_date
}

export interface UpdatePatientRequest extends Partial<CreatePatientRequest> { }
