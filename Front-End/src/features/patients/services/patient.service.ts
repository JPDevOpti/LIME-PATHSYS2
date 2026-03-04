import { apiClient } from '@/shared/api/client';
import type {
    Patient,
    PatientFilters,
    CreatePatientRequest,
    UpdatePatientRequest,
} from '../types/patient.types';

const PATIENTS_PATH = '/api/v1/patients';

export const patientService = {
    async getPatients(
        filters?: PatientFilters
    ): Promise<{ data: Patient[]; total: number }> {
        const params: Record<string, string | number | undefined> = {
            search: filters?.search,
            created_at_from: filters?.created_at_from,
            created_at_to: filters?.created_at_to,
            entity: filters?.entity,
            care_type: filters?.care_type,
            gender: filters?.gender,
            municipality_code: filters?.municipality_code,
            skip: filters?.skip,
            limit: filters?.limit,
        };
        return apiClient.get<{ data: Patient[]; total: number }>(
            PATIENTS_PATH,
            params
        );
    },

    async getPatientById(id: string): Promise<Patient | null> {
        try {
            return await apiClient.get<Patient>(`${PATIENTS_PATH}/${id}`);
        } catch {
            return null;
        }
    },

    async createPatient(data: CreatePatientRequest, userEmail?: string): Promise<Patient> {
        const headers: Record<string, string> = {};
        if (userEmail) headers['X-User-Email'] = userEmail;
        return apiClient.post<Patient>(PATIENTS_PATH, data, Object.keys(headers).length ? headers : undefined);
    },

    async updatePatient(id: string, data: UpdatePatientRequest, userEmail?: string): Promise<Patient> {
        const headers: Record<string, string> = {};
        if (userEmail) headers['X-User-Email'] = userEmail;
        return apiClient.put<Patient>(`${PATIENTS_PATH}/${id}`, data, Object.keys(headers).length ? headers : undefined);
    },

    async deletePatient(id: string): Promise<void> {
        await apiClient.delete(`${PATIENTS_PATH}/${id}`);
    },

    async getAllPatientsForExport(filters?: PatientFilters): Promise<Patient[]> {
        // Obtenemos todos los resultados sin paginación (limite alto en el backend)
        const params: Record<string, string | number | undefined> = {
            search: filters?.search,
            created_at_from: filters?.created_at_from,
            created_at_to: filters?.created_at_to,
            entity: filters?.entity,
            care_type: filters?.care_type,
            gender: filters?.gender,
            municipality_code: filters?.municipality_code,
            skip: 0,
            limit: 100000, // Límite razonable para exportación
        };
        const { data } = await apiClient.get<{ data: Patient[]; total: number }>(
            PATIENTS_PATH,
            params
        );
        return data;
    },
};
