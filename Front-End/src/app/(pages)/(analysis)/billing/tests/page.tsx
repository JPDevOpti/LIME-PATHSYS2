'use client';

import { useState, useEffect, useCallback } from 'react';
import { BaseCard } from '@/shared/components/base';
import {
    BillingTestsFilters,
    BillingTestsChart,
    BillingTestsTable,
    TestBillingDetailModal
} from '@/features/billing/components';
import { billingService } from '@/features/billing/services/billing.service';
import type { BillingTestsReportData, BillingTestDetail, BillingTestItem } from '@/features/billing/types/billing.types';
import { Toast } from '@/shared/components/ui/Toast';

export default function BillingByTestsPage() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const defaultMonthIndex = (currentMonth + 11) % 12;
    const defaultYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const [selectedMonth, setSelectedMonth] = useState(String(defaultMonthIndex));
    const [selectedYear, setSelectedYear] = useState(String(defaultYear));
    const [showReport, setShowReport] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [billingData, setBillingData] = useState<BillingTestsReportData>({ tests: [], total: 0 });

    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [selectedTestDetail, setSelectedTestDetail] = useState<BillingTestDetail | null>(null);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);

    const [toastConfig, setToastConfig] = useState<{
        visible: boolean;
        message: string;
        variant: 'success' | 'error' | 'info';
    }>({
        visible: false,
        message: '',
        variant: 'info'
    });

    const generateReport = useCallback(async () => {
        if (!selectedMonth || !selectedYear) return;
        if (Number(selectedYear) > currentYear) return;
        setIsLoading(true);
        try {
            const data = await billingService.getTestsReport(
                Number(selectedYear),
                Number(selectedMonth)
            );
            setBillingData(data);
            setShowReport(true);
        } catch (error) {
            console.error('Error al generar informe de facturación de pruebas:', error);
            setToastConfig({
                visible: true,
                message: 'Error al generar el informe de facturación de pruebas',
                variant: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    }, [selectedMonth, selectedYear, currentYear]);

    const handleRowClick = async (test: BillingTestItem) => {
        setIsLoadingDetail(true);
        setDetailModalOpen(true);
        setSelectedTestDetail(null);
        try {
            const detail = await billingService.getTestDetail(
                Number(selectedYear),
                Number(selectedMonth),
                test.codigo
            );
            setSelectedTestDetail(detail);
        } catch (error) {
            console.error('Error al cargar detalle de prueba:', error);
            setToastConfig({
                visible: true,
                message: 'Error al cargar el detalle de la prueba',
                variant: 'error'
            });
            setDetailModalOpen(false);
        } finally {
            setIsLoadingDetail(false);
        }
    };

    useEffect(() => {
        generateReport();
    }, [generateReport]);

    useEffect(() => {
        const yearNum = Number(selectedYear);
        const monthNum = Number(selectedMonth);
        if (yearNum === currentYear && monthNum >= currentMonth) {
            const previousMonth = (currentMonth + 11) % 12;
            setSelectedMonth(String(previousMonth));
        }
    }, [selectedYear, selectedMonth, currentYear, currentMonth]);

    const clearSelection = () => {
        setSelectedMonth(String(defaultMonthIndex));
        setSelectedYear(String(defaultYear));
        setShowReport(false);
        setBillingData({ tests: [], total: 0 });
    };

    return (
        <div className="space-y-6">
            <Toast
                message={toastConfig.message}
                visible={toastConfig.visible}
                variant={toastConfig.variant}
                onDismiss={() => setToastConfig(prev => ({ ...prev, visible: false }))}
            />

            <BillingTestsFilters
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onMonthChange={setSelectedMonth}
                onYearChange={setSelectedYear}
                onGenerate={generateReport}
                onClear={clearSelection}
                isLoading={isLoading}
            />

            {isLoading && !showReport ? (
                <BaseCard className="p-6 flex items-center justify-center min-h-[200px]">
                    <div className="flex flex-col items-center gap-2">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime-brand-600 border-t-transparent" />
                        <p className="text-neutral-600">Generando informe...</p>
                    </div>
                </BaseCard>
            ) : !showReport ? (
                <BaseCard className="p-6">
                    <p className="text-neutral-600">
                        Aún no se ha generado el informe. Seleccione mes y año y presione "Generar informe".
                    </p>
                </BaseCard>
            ) : (
                <div className="space-y-4">
                    <BillingTestsChart datos={billingData.tests} />
                    <BillingTestsTable
                        datos={billingData.tests}
                        onRowClick={handleRowClick}
                    />
                </div>
            )}

            <TestBillingDetailModal
                detail={selectedTestDetail}
                isOpen={detailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                isLoading={isLoadingDetail}
            />
        </div>
    );
}
