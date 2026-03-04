import type { PathologistPerformance } from '../types/statistics.types';

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

export function getMockPathologistsReport(_month: number, _year: number): PathologistPerformance[] {
    return [...MOCK_PATHOLOGISTS];
}
