import type { EntityStats, EntitiesReportData } from '../types/entities.types';

const MOCK_ENTITIES: EntityStats[] = [
    { nombre: 'Hospital Pablo Tobón Uribe', codigo: 'HPTU-001', ambulatorios: 85, hospitalizados: 42, total: 127, dentroOportunidad: 108, fueraOportunidad: 19, tiempoPromedio: 4.1 },
    { nombre: 'Universidad de Antioquia', codigo: 'UDEA-001', ambulatorios: 62, hospitalizados: 28, total: 90, dentroOportunidad: 72, fueraOportunidad: 18, tiempoPromedio: 4.3 },
    { nombre: 'Clínica Las Américas', codigo: 'CLA-002', ambulatorios: 45, hospitalizados: 18, total: 63, dentroOportunidad: 52, fueraOportunidad: 11, tiempoPromedio: 3.9 },
    { nombre: 'Hospital San Vicente', codigo: 'HSV-003', ambulatorios: 38, hospitalizados: 22, total: 60, dentroOportunidad: 48, fueraOportunidad: 12, tiempoPromedio: 4.5 },
    { nombre: 'IPS Universitaria', codigo: 'IPSU-004', ambulatorios: 52, hospitalizados: 12, total: 64, dentroOportunidad: 55, fueraOportunidad: 9, tiempoPromedio: 3.8 },
];

export function getMockEntitiesReport(_month: number, _year: number): EntitiesReportData {
    const entities = [...MOCK_ENTITIES];
    const total = entities.reduce((s, e) => s + e.total, 0);
    const ambulatorios = entities.reduce((s, e) => s + e.ambulatorios, 0);
    const hospitalizados = entities.reduce((s, e) => s + e.hospitalizados, 0);

    return {
        entities,
        summary: {
            total,
            ambulatorios,
            hospitalizados,
            tiempoPromedio: 4.2,
        },
    };
}
