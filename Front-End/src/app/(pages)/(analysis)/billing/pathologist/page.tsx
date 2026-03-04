'use client';

import { useState, useEffect, useCallback } from 'react';
import { BaseCard } from '@/shared/components/base';
import {
    BillingPathologistFilters,
    BillingPathologistChart,
    BillingPathologistTable,
} from '@/features/billing/components';
import { billingService } from '@/shared/services/billing.service';
import { BillingPathologistReportData } from '@/features/billing/types/billing.types';
import { Toast } from '@/shared/components/ui/Toast';

export default function BillingByPathologistPage() {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const defaultMonthIndex = (currentMonth + 11) % 12;
    const defaultYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const [selectedMonth, setSelectedMonth] = useState(String(defaultMonthIndex));
    const [selectedYear, setSelectedYear] = useState(String(defaultYear));
    const [showReport, setShowReport] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [billingData, setBillingData] = useState<BillingPathologistReportData>({ 
        pathologists: [],
        total: 0
    });
    
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
            const data = await billingService.getPathologistsReport(
                Number(selectedYear),
                Number(selectedMonth)
            );
            setBillingData(data);
            setShowReport(true);
        } catch (error) {
            console.error('Error al generar informe de facturación:', error);
            setToastConfig({
                visible: true,
                message: 'Error al generar el informe de facturación',
                variant: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    }, [selectedMonth, selectedYear, currentYear]);

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
        setBillingData({ pathologists: [], total: 0 });
    };

    return (
        <div className="space-y-6">
            <Toast
                message={toastConfig.message}
                visible={toastConfig.visible}
                variant={toastConfig.variant}
                onDismiss={() => setToastConfig(prev => ({ ...prev, visible: false }))}
            />

            <BillingPathologistFilters
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
                    <p className="text-neutral-600">Generando informe...</p>
                </BaseCard>
            ) : !showReport ? (
                <BaseCard className="p-6">
                    <p className="text-neutral-600">
                        Aún no se ha generado el informe. Seleccione mes y año y presione "Generar informe".
                    </p>
                </BaseCard>
            ) : (
                <div className="space-y-4">
                    <BillingPathologistChart datos={billingData.pathologists} />
                    <BillingPathologistTable datos={billingData.pathologists} />
                </div>
            )}
        </div>
    );
}
