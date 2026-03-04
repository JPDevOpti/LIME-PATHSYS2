import type { BillingTestsReportData } from '../types/billing.types';

const MOCK_BILLING_TESTS = [
    { codigo: 'BIOPSIA', nombre: 'Biopsia', monto: 12500000, cantidad: 450 },
    { codigo: 'CITOLOGIA', nombre: 'Citología', monto: 8750000, cantidad: 320 },
    { codigo: 'HISTO', nombre: 'Histología', monto: 9800000, cantidad: 280 },
    { codigo: 'INMUNO', nombre: 'Inmunohistoquímica', monto: 4200000, cantidad: 150 },
    { codigo: 'PAP', nombre: 'Papanicolaou', monto: 840000, cantidad: 120 },
    { codigo: 'CONGEL', nombre: 'Corte por congelación', monto: 5600000, cantidad: 85 },
    { codigo: 'ESPECIAL', nombre: 'Tinciones especiales', monto: 7280000, cantidad: 210 },
    { codigo: 'MOLEC', nombre: 'Estudios moleculares', monto: 3150000, cantidad: 45 },
    { codigo: 'AUTOPSIA', nombre: 'Autopsia', monto: 1960000, cantidad: 12 },
    { codigo: 'CITOASP', nombre: 'Citología por aspiración', monto: 4200000, cantidad: 95 },
];

export function getMockBillingTestsReport(_month: number, _year: number, _entity?: string): BillingTestsReportData {
    const tests = [...MOCK_BILLING_TESTS];
    const total = tests.reduce((s, t) => s + t.monto, 0);
    return { tests, total };
}
