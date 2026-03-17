import { apiClient } from '@/shared/api/client';
import type { Patient, PatientFilters, CreatePatientRequest, UpdatePatientRequest } from '../types/patient.types';

const PATIENTS_PATH = '/api/v1/patients';

function buildParams(filters?: PatientFilters): Record<string, string | number | undefined> {
    return {
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
}

function buildHeaders(userEmail?: string): Record<string, string> | undefined {
    return userEmail ? { 'X-User-Email': userEmail } : undefined;
}

export const patientService = {
    async getPatients(filters?: PatientFilters): Promise<{ data: Patient[]; total: number }> {
        return apiClient.get<{ data: Patient[]; total: number }>(PATIENTS_PATH, buildParams(filters));
    },

    async getPatientById(id: string): Promise<Patient | null> {
        try {
            return await apiClient.get<Patient>(`${PATIENTS_PATH}/${id}`);
        } catch {
            return null;
        }
    },

    async createPatient(data: CreatePatientRequest, userEmail?: string): Promise<Patient> {
        return apiClient.post<Patient>(PATIENTS_PATH, data, buildHeaders(userEmail));
    },

    async updatePatient(id: string, data: UpdatePatientRequest, userEmail?: string): Promise<Patient> {
        return apiClient.put<Patient>(`${PATIENTS_PATH}/${id}`, data, buildHeaders(userEmail));
    },

    async deletePatient(id: string): Promise<void> {
        await apiClient.delete(`${PATIENTS_PATH}/${id}`);
    },

    async getAllPatientsForExport(filters?: PatientFilters): Promise<Patient[]> {
        const params = { ...buildParams(filters), skip: 0, limit: 100000 };
        const { data } = await apiClient.get<{ data: Patient[]; total: number }>(PATIENTS_PATH, params);
        return data;
    },
};
