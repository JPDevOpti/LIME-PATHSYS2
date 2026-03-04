import type {
    OpportunityReportData,
    OpportunityTest,
    PathologistPerformance,
} from '../types/statistics.types';

// Mock - reemplazar con API cuando el backend esté disponible
const MOCK_TESTS: OpportunityTest[] = [
    { code: 'BIOPSIA', name: 'Biopsia', withinOpportunity: 45, outOfOpportunity: 5, opportunityTimeDays: 6 },
    { code: 'CITOLOGIA', name: 'Citología', withinOpportunity: 32, outOfOpportunity: 3, opportunityTimeDays: 5 },
    { code: 'HISTO', name: 'Histología', withinOpportunity: 28, outOfOpportunity: 7, opportunityTimeDays: 6 },
    { code: 'INMUNO', name: 'Inmunohistoquímica', withinOpportunity: 12, outOfOpportunity: 0, opportunityTimeDays: 10 },
    { code: 'PAP', name: 'Papanicolaou', withinOpportunity: 3, outOfOpportunity: 0, opportunityTimeDays: 5 },
    { code: 'CONGEL', name: 'Corte por congelación', withinOpportunity: 18, outOfOpportunity: 2, opportunityTimeDays: 1 },
    { code: 'ESPECIAL', name: 'Tinciones especiales', withinOpportunity: 22, outOfOpportunity: 4, opportunityTimeDays: 8 },
    { code: 'MOLEC', name: 'Estudios moleculares', withinOpportunity: 8, outOfOpportunity: 1, opportunityTimeDays: 14 },
    { code: 'AUTOPSIA', name: 'Autopsia', withinOpportunity: 5, outOfOpportunity: 2, opportunityTimeDays: 15 },
    { code: 'CITOASP', name: 'Citología por aspiración', withinOpportunity: 14, outOfOpportunity: 1, opportunityTimeDays: 5 },
];

const MOCK_PATHOLOGISTS: PathologistPerformance[] = [
    { code: 'P001', name: 'Dr. Maria Lopez', withinOpportunity: 52, outOfOpportunity: 8, avgTime: 4.2 },
    { code: 'P002', name: 'Dr. Jorge Ramirez', withinOpportunity: 38, outOfOpportunity: 4, avgTime: 3.8 },
    { code: 'P003', name: 'Dr. Ana Martinez', withinOpportunity: 30, outOfOpportunity: 3, avgTime: 4.5 },
    { code: 'P004', name: 'Dr. Carlos Mendoza', withinOpportunity: 25, outOfOpportunity: 5, avgTime: 4.8 },
    { code: 'P005', name: 'Dra. Sofia Herrera', withinOpportunity: 42, outOfOpportunity: 6, avgTime: 3.9 },
    { code: 'P006', name: 'Dr. Luis Fernandez', withinOpportunity: 35, outOfOpportunity: 4, avgTime: 4.1 },
    { code: 'P007', name: 'Dra. Patricia Gomez', withinOpportunity: 28, outOfOpportunity: 2, avgTime: 4.3 },
    { code: 'P008', name: 'Dr. Ricardo Torres', withinOpportunity: 19, outOfOpportunity: 7, avgTime: 5.2 },
];

// 24 meses: 12 de año anterior + 12 del año seleccionado (para gráfico de tendencia)
const MOCK_MONTHLY_PCT_PREV_YEAR = [76, 80, 78, 82, 79, 81, 84, 82, 86, 83, 85, 84];
const MOCK_MONTHLY_PCT_CURRENT = [78, 82, 79, 85, 81, 83, 86, 84, 88, 85, 87, 85.5];

export function getMockOpportunityReport(_month: number, year: number, _entity?: string): OpportunityReportData {
    const monthlyPct = [...MOCK_MONTHLY_PCT_PREV_YEAR, ...MOCK_MONTHLY_PCT_CURRENT];
    return {
        tests: MOCK_TESTS,
        pathologists: MOCK_PATHOLOGISTS,
        monthlyPct,
        summary: {
            total: 135,
            within: 120,
            out: 15,
            averageDays: 4.2,
        },
    };
}
