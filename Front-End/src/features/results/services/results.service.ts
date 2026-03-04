import type { Case } from '@/features/cases/types/case.types';
import type { UpdateResultRequest, ResultSections } from '../types/results.types';
import { caseService } from '@/features/cases/services/case.service';
import { apiClient } from '@/shared/api/client';

export const resultsService = {
    async updateCaseResult(caseId: string, data: UpdateResultRequest & { diagnosisImages?: string[] }, skipStateUpdate: boolean = false): Promise<Case | null> {
        try {
            return await caseService.updateCaseTranscription(caseId, {
                ...data,
                diagnosis_images: data.diagnosisImages,
            }, skipStateUpdate);
        } catch {
            return null;
        }
    },

    async validateCaseForTranscription(caseCode: string): Promise<{ canEdit: boolean; message?: string }> {
        const existing = await caseService.getCaseByCode(caseCode);
        if (!existing) return { canEdit: false, message: 'No se encontró ningún caso con el código especificado' };
        const status = existing.status;
        const blocked = status === 'Por entregar' || status === 'Completado';
        return {
            canEdit: !blocked,
            message: blocked ? `No se puede transcribir. Los casos en estado "Por entregar" o "Completado" no permiten transcripción. Estado actual: ${status}` : undefined,
        };
    },

    async validateCaseForSaving(caseCode: string, userId?: string, userRole?: string): Promise<{ canEdit: boolean; message?: string }> {
        const existing = await caseService.getCaseByCode(caseCode);
        if (!existing) return { canEdit: false, message: 'No se encontró ningún caso con el código especificado' };

        if (!existing.assigned_pathologist?.id || !existing.assigned_pathologist?.name) {
            return { canEdit: false, message: 'No se puede editar. El caso debe tener un patólogo asignado.' };
        }

        const isAdmin = ['administrator', 'administrador'].includes(String(userRole ?? '').toLowerCase());
        const isAssigned = userId === existing.assigned_pathologist.id;
        const isAssistant = existing.assistant_pathologists?.some(a => a.id === userId);

        if (!isAdmin && !isAssigned && !isAssistant) {
            return { canEdit: false, message: 'Solo el administrador, el patólogo asignado o sus asistentes pueden editar este caso.' };
        }

        const status = existing.status;
        const blocked = status === 'Completado' && !isAdmin;
        return {
            canEdit: !blocked,
            message: blocked ? 'No se puede editar. Los casos en estado "Completado" no permiten edición.' : undefined,
        };
    },

    async validateCaseForSigning(caseCode: string, userId?: string, userRole?: string): Promise<{ canSign: boolean; message?: string }> {
        const existing = await caseService.getCaseByCode(caseCode);
        if (!existing) return { canSign: false, message: 'No se encontró ningún caso con el código especificado' };

        if (!existing.assigned_pathologist?.id || !existing.assigned_pathologist?.name) {
            return { canSign: false, message: 'No se puede editar. El caso debe tener un patólogo asignado.' };
        }

        const isAdmin = ['administrator', 'administrador'].includes(String(userRole ?? '').toLowerCase());
        const isAssigned = userId === existing.assigned_pathologist.id;
        const isAssistant = existing.assistant_pathologists?.some(a => a.id === userId);

        if (isAssistant && !isAdmin) {
            return { canSign: false, message: 'Como patólogo asistente, puede visualizar pero no tiene permiso para firmar este caso.' };
        }

        if (!isAdmin && !isAssigned) {
            return { canSign: false, message: 'Solo el administrador o el patólogo asignado pueden firmar este caso.' };
        }

        const status = existing.status;
        const blocked = status === 'Completado' && !isAdmin;
        return {
            canSign: !blocked,
            message: blocked ? `No se puede editar. Los casos en estado "Completado" no permiten edición.` : undefined,
        };
    },

    async signCase(
        caseCode: string,
        data: UpdateResultRequest & {
            cie10?: { code: string; name: string };
            cieo?: { code: string; name: string };
            complementaryTests?: { code: string; name: string; quantity: number }[];
            complementaryTestsReason?: string;
            diagnosisImages?: string[];
        }
    ): Promise<Case | null> {
        const existing = await caseService.getCaseByCode(caseCode);
        if (!existing) return null;
        const payload = {
            method: data.method,
            macro_result: data.macro_result,
            micro_result: data.micro_result,
            diagnosis: data.diagnosis,
            cie10_diagnosis: data.cie10 ? { code: data.cie10.code, name: data.cie10.name } : null,
            cieo_diagnosis: data.cieo ? { code: data.cieo.code, name: data.cieo.name } : null,
            diagnosis_images: data.diagnosisImages,
            complementary_tests: data.complementaryTests,
            complementary_tests_reason: data.complementaryTestsReason,
        };
        return await caseService.signCase(existing.id, payload);
    },

    async getCaseResult(caseCode: string): Promise<ResultSections | null> {
        const existing = await caseService.getCaseByCode(caseCode);
        if (!existing?.result) return null;
        const r = existing.result;
        return {
            method: r.method?.length ? r.method : [''],
            macro: r.macro_result ?? '',
            micro: r.micro_result ?? '',
            diagnosis: r.diagnosis ?? '',
            cie10: r.cie10_diagnosis ? { code: r.cie10_diagnosis.code, name: r.cie10_diagnosis.name } : null,
            cieo: r.cieo_diagnosis ? { code: r.cieo_diagnosis.code, name: r.cieo_diagnosis.name } : null,
            diagnosisImages: r.diagnosis_images ?? [],
        };
    },

    async createAdditionalTestsRequest(
        caseId: string,
        caseCode: string,
        additionalTests: { code: string; name: string; quantity: number }[],
        additionalTestsReason?: string,
    ): Promise<Case | null> {
        await apiClient.post(
            `/api/v1/additional-tests/${encodeURIComponent(caseCode.trim())}`,
            {
                additional_tests: additionalTests,
                additional_tests_reason: additionalTestsReason,
            },
        );

        return await caseService.getCaseById(caseId);
    },
};
