import type { EntityDetails } from '../types/entities.types';

const MOCK_ENTITY_DETAILS: Record<string, EntityDetails> = {
    'HPTU-001': {
        estadisticas_basicas: {
            total_casos: 127,
            ambulatorios: 85,
            hospitalizados: 42,
            promedio_muestras_por_caso: 1.8,
        },
        tiempos_procesamiento: {
            promedio_dias: 4.1,
            minimo_dias: 1,
            maximo_dias: 12,
            muestras_completadas: 120,
        },
        pruebas_mas_solicitadas: [
            { codigo: 'BP-001', nombre: 'Biopsia de piel', total_solicitudes: 45 },
            { codigo: 'CIT-002', nombre: 'Citología', total_solicitudes: 38 },
            { codigo: 'IHQ-003', nombre: 'Inmunohistoquímica', total_solicitudes: 22 },
        ],
    },
    'UDEA-001': {
        estadisticas_basicas: {
            total_casos: 90,
            ambulatorios: 62,
            hospitalizados: 28,
            promedio_muestras_por_caso: 1.6,
        },
        tiempos_procesamiento: {
            promedio_dias: 4.3,
            minimo_dias: 2,
            maximo_dias: 10,
            muestras_completadas: 85,
        },
        pruebas_mas_solicitadas: [
            { codigo: 'BP-001', nombre: 'Biopsia de piel', total_solicitudes: 35 },
            { codigo: 'CIT-002', nombre: 'Citología', total_solicitudes: 28 },
            { codigo: 'PB-004', nombre: 'Punch biopsy', total_solicitudes: 15 },
        ],
    },
    'CLA-002': {
        estadisticas_basicas: {
            total_casos: 63,
            ambulatorios: 45,
            hospitalizados: 18,
            promedio_muestras_por_caso: 1.5,
        },
        tiempos_procesamiento: {
            promedio_dias: 3.9,
            minimo_dias: 1,
            maximo_dias: 9,
            muestras_completadas: 58,
        },
        pruebas_mas_solicitadas: [
            { codigo: 'BP-001', nombre: 'Biopsia de piel', total_solicitudes: 25 },
            { codigo: 'CIT-002', nombre: 'Citología', total_solicitudes: 20 },
        ],
    },
    'HSV-003': {
        estadisticas_basicas: {
            total_casos: 60,
            ambulatorios: 38,
            hospitalizados: 22,
            promedio_muestras_por_caso: 1.7,
        },
        tiempos_procesamiento: {
            promedio_dias: 4.5,
            minimo_dias: 2,
            maximo_dias: 11,
            muestras_completadas: 55,
        },
        pruebas_mas_solicitadas: [
            { codigo: 'BP-001', nombre: 'Biopsia de piel', total_solicitudes: 22 },
            { codigo: 'IHQ-003', nombre: 'Inmunohistoquímica', total_solicitudes: 18 },
        ],
    },
    'IPSU-004': {
        estadisticas_basicas: {
            total_casos: 64,
            ambulatorios: 52,
            hospitalizados: 12,
            promedio_muestras_por_caso: 1.4,
        },
        tiempos_procesamiento: {
            promedio_dias: 3.8,
            minimo_dias: 1,
            maximo_dias: 8,
            muestras_completadas: 60,
        },
        pruebas_mas_solicitadas: [
            { codigo: 'BP-001', nombre: 'Biopsia de piel', total_solicitudes: 30 },
            { codigo: 'CIT-002', nombre: 'Citología', total_solicitudes: 18 },
        ],
    },
};

const MOCK_PATHOLOGISTS: Record<string, Array<{ name: string; codigo: string; casesCount: number }>> = {
    'HPTU-001': [
        { name: 'Dr. Maria Lopez', codigo: 'P001', casesCount: 45 },
        { name: 'Dr. Jorge Ramirez', codigo: 'P002', casesCount: 38 },
        { name: 'Dra. Sofia Herrera', codigo: 'P005', casesCount: 44 },
    ],
    'UDEA-001': [
        { name: 'Dr. Ana Martinez', codigo: 'P003', casesCount: 35 },
        { name: 'Dr. Luis Fernandez', codigo: 'P006', casesCount: 30 },
        { name: 'Dra. Patricia Gomez', codigo: 'P007', casesCount: 25 },
    ],
    'CLA-002': [
        { name: 'Dr. Jorge Ramirez', codigo: 'P002', casesCount: 28 },
        { name: 'Dr. Carlos Mendoza', codigo: 'P004', casesCount: 20 },
        { name: 'Dr. Ricardo Torres', codigo: 'P008', casesCount: 15 },
    ],
    'HSV-003': [
        { name: 'Dr. Maria Lopez', codigo: 'P001', casesCount: 25 },
        { name: 'Dra. Sofia Herrera', codigo: 'P005', casesCount: 20 },
        { name: 'Dr. Luis Fernandez', codigo: 'P006', casesCount: 15 },
    ],
    'IPSU-004': [
        { name: 'Dr. Ana Martinez', codigo: 'P003', casesCount: 28 },
        { name: 'Dra. Patricia Gomez', codigo: 'P007', casesCount: 22 },
        { name: 'Dr. Carlos Mendoza', codigo: 'P004', casesCount: 14 },
    ],
};

export async function getEntityDetails(
    entityCode: string,
    _period: string
): Promise<EntityDetails> {
    await new Promise((r) => setTimeout(r, 400));
    const details = MOCK_ENTITY_DETAILS[entityCode];
    if (!details) {
        return {
            estadisticas_basicas: { total_casos: 0, ambulatorios: 0, hospitalizados: 0, promedio_muestras_por_caso: 0 },
            tiempos_procesamiento: { promedio_dias: 0, minimo_dias: 0, maximo_dias: 0, muestras_completadas: 0 },
            pruebas_mas_solicitadas: [],
        };
    }
    return details;
}

export async function getEntityPathologists(
    entityCode: string,
    _period: string
): Promise<Array<{ name: string; codigo: string; casesCount: number }>> {
    await new Promise((r) => setTimeout(r, 350));
    return MOCK_PATHOLOGISTS[entityCode] ?? [];
}
