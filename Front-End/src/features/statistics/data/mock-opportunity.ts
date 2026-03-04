import type { EstadisticasOportunidad } from '../types/statistics.types';

// Mock - reemplazar con API real cuando el backend esté disponible
export const mockEstadisticasOportunidad: EstadisticasOportunidad = {
    porcentaje_oportunidad: 85.5,
    cambio_porcentual: 2.3,
    tiempo_promedio: 4.2,
    casos_dentro_oportunidad: 120,
    casos_fuera_oportunidad: 15,
    total_casos_mes_anterior: 135,
    mes_anterior: {
        nombre: 'Octubre',
        inicio: '2023-10-01',
        fin: '2023-10-31',
    },
};
