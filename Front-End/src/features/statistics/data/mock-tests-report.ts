import type { TestStats } from '../types/statistics.types';

const MOCK_TESTS: TestStats[] = [
    { codigo: 'BIOPSIA', nombre: 'Biopsia', ambulatorios: 38, hospitalizados: 12, total: 50 },
    { codigo: 'CITOLOGIA', nombre: 'Citología', ambulatorios: 28, hospitalizados: 7, total: 35 },
    { codigo: 'HISTO', nombre: 'Histología', ambulatorios: 22, hospitalizados: 13, total: 35 },
    { codigo: 'INMUNO', nombre: 'Inmunohistoquímica', ambulatorios: 8, hospitalizados: 4, total: 12 },
    { codigo: 'PAP', nombre: 'Papanicolaou', ambulatorios: 3, hospitalizados: 0, total: 3 },
    { codigo: 'CONGEL', nombre: 'Corte por congelación', ambulatorios: 5, hospitalizados: 15, total: 20 },
    { codigo: 'ESPECIAL', nombre: 'Tinciones especiales', ambulatorios: 18, hospitalizados: 8, total: 26 },
    { codigo: 'MOLEC', nombre: 'Estudios moleculares', ambulatorios: 6, hospitalizados: 3, total: 9 },
    { codigo: 'AUTOPSIA', nombre: 'Autopsia', ambulatorios: 0, hospitalizados: 7, total: 7 },
    { codigo: 'CITOASP', nombre: 'Citología por aspiración', ambulatorios: 12, hospitalizados: 3, total: 15 },
];

export interface TestsReportData {
    tests: TestStats[];
    summary?: {
        total: number;
        ambulatorios: number;
        hospitalizados: number;
    };
}

export function getMockTestsReport(_month: number, _year: number, _entity?: string): TestsReportData {
    const tests = [...MOCK_TESTS];
    const total = tests.reduce((s, t) => s + t.total, 0);
    const ambulatorios = tests.reduce((s, t) => s + t.ambulatorios, 0);
    const hospitalizados = tests.reduce((s, t) => s + t.hospitalizados, 0);

    return {
        tests,
        summary: { total, ambulatorios, hospitalizados },
    };
}
