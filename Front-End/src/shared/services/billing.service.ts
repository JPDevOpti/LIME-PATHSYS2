import { apiClient } from '../api/client';
import type { BillingPathologistReportData, BillingTestsReportData, BillingTestDetail } from '@/features/billing/types/billing.types';

export const billingService = {
    async getPathologistsReport(year: number, month: number): Promise<BillingPathologistReportData> {
        return apiClient.get<BillingPathologistReportData>('/api/v1/billing/pathologists', {
            year,
            month
        });
    },

    async getTestsReport(year: number, month: number): Promise<BillingTestsReportData> {
        return apiClient.get<BillingTestsReportData>('/api/v1/billing/tests', {
            year,
            month
        });
    },

    async getTestDetail(year: number, month: number, testCode: string): Promise<BillingTestDetail> {
        return apiClient.get<BillingTestDetail>(`/api/v1/billing/tests/${encodeURIComponent(testCode)}`, {
            year,
            month
        });
    }
};
