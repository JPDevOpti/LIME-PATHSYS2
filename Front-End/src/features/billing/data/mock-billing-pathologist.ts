import type { BillingPathologistReportData } from '../types/billing.types';

const MOCK_BILLING_PATHOLOGISTS = [
    { codigo: 'PAT001', nombre: 'Maria Garcia Lopez', monto: 28500000, casos: 120 },
    { codigo: 'PAT002', nombre: 'Carlos Rodriguez Silva', monto: 24200000, casos: 95 },
    { codigo: 'PAT003', nombre: 'Ana Martinez Fernandez', monto: 19800000, casos: 82 },
    { codigo: 'PAT004', nombre: 'Luis Perez Hernandez', monto: 16500000, casos: 74 },
    { codigo: 'PAT005', nombre: 'Sofia Ramirez Castro', monto: 13200000, casos: 58 },
    { codigo: 'PAT006', nombre: 'Jorge Torres Mendoza', monto: 9800000, casos: 42 },
    { codigo: 'PAT007', nombre: 'Laura Gomez Vega', monto: 7200000, casos: 31 },
];

export function getMockBillingPathologistReport(
    _month: number,
    _year: number,
    _entity?: string
): BillingPathologistReportData {
    const pathologists = [...MOCK_BILLING_PATHOLOGISTS];
    const total = pathologists.reduce((s, p) => s + p.monto, 0);
    return { pathologists, total };
}
