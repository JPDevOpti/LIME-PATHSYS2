export interface LegacySample {
    number?: number;
    anatomical_location?: string;
    macroscopic?: string;
    microscopic?: string;
    test_type?: string;
    lab_service?: string;
    note?: string;
    histoquimica?: string;
    inmunohistoquimica?: string;
    transcription_date?: string;
}

export interface LegacyPatient {
    patient_code?: string;
    identification_number?: string;
    identification_type?: string;
    identification?: string;
    identificacion?: string; // Legacy alias
    first_name?: string;
    second_name?: string | null;
    first_lastname?: string;
    second_lastname?: string | null;
    full_name?: string;
    gender?: string;
    birth_date?: string | Date;
    birthDate?: string | Date; // Legacy alias
    fecha_nacimiento?: string | Date; // Legacy alias
    phone?: string;
    email?: string;
    care_type?: string;
    entity_info?: Record<string, any>;
    location?: Record<string, any>;
    observations?: string;
    age?: number;
    _id?: string; // Mongo ID
}

export interface LegacyCase {
    id: string;
    legacy_id: string;
    is_legacy: boolean;
    patient: LegacyPatient;
    patient_id?: string; // Legacy field
    entity?: string;
    care_type?: string;
    previous_study?: string;
    received_at?: string;
    closed_at?: string;
    transcription_date?: string;
    samples: LegacySample[];
    imported_at?: string;
}

export interface LegacyCaseListResponse {
    data: LegacyCase[];
    total: number;
}

export interface LegacyCaseFilters {
    search?: string;
    entity?: string;
    received_from?: string;
    received_to?: string;
    skip?: number;
    limit?: number;
}
