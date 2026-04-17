export enum CasePriority {
  Normal = 'Normal',
  Prioritario = 'Prioritario',
}

export interface UrgentCase {
  id: string;
  codigo: string;
  paciente: {
    nombre: string;
    cedula: string;
    entidad?: string;
  };
  pruebas: string[];
  patologo: string;
  fecha_creacion: string;
  estado: string;
  prioridad: CasePriority;
  dias_en_sistema: number;
  tiempo_oportunidad_max?: number;
}

export type CasoUrgente = UrgentCase;

export interface MetricDetail {
  mes_actual: number;
  mes_anterior: number;
  cambio_porcentual: number;
}

export interface DashboardMetrics {
  pacientes: MetricDetail;
  casos: MetricDetail;
}

export interface OpportunityStats {
  porcentaje_oportunidad: number;
  cambio_porcentual: number;
  tiempo_promedio: number;
  casos_dentro_oportunidad: number;
  casos_fuera_oportunidad: number;
  /** Completados del mes (excl. HAMA/Alma Máter), mismo universo que el % de oportunidad. */
  total_casos_periodo?: number;
  /** Completados sin `was_timely` true/false en `opportunity_info`. */
  casos_sin_evaluacion_oportunidad?: number;
  total_casos_mes_anterior: number;
  mes_anterior: {
    nombre: string;
    inicio: string;
    fin: string;
  };
}

export type EstadisticasOportunidad = OpportunityStats;

export interface MonthlyCasesData {
  datos: number[];
  total: number;
  año: number;
}
