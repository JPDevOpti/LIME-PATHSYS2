import {
  CasePriority,
  CaseStatus,
  DashboardMetrics,
  MonthlyCasesData,
  OpportunityStats,
  UrgentCase,
} from '../model/dashboard.types';

export const mockDashboardMetrics: DashboardMetrics = {
  pacientes: {
    mes_actual: 320,
    mes_anterior: 280,
    cambio_porcentual: 14.3,
  },
  casos: {
    mes_actual: 450,
    mes_anterior: 410,
    cambio_porcentual: 9.7,
  },
};

export const mockMonthlyCases: MonthlyCasesData = {
  datos: [45, 52, 38, 24, 33, 26, 21, 20, 6, 8, 15, 10], // Sample data for 12 months
  total: 298,
  año: 2024,
};

export const mockOpportunityStats: OpportunityStats = {
  porcentaje_oportunidad: 85,
  cambio_porcentual: 2.5,
  tiempo_promedio: 4.2,
  casos_dentro_oportunidad: 255,
  casos_fuera_oportunidad: 45,
  total_casos_mes_anterior: 300,
  mes_anterior: {
    nombre: 'Enero',
    inicio: '2024-01-01',
    fin: '2024-01-31',
  },
};

export const mockUrgentCases: UrgentCase[] = [
  {
    id: '1',
    codigo: 'B24-1234',
    paciente: {
      nombre: 'Juan Perez',
      cedula: '1-2345-6789',
      entidad: 'Hospital General',
      entidad_codigo: 'HG',
    },
    pruebas: ['Biopsia Piel', 'H. Pylori'],
    patologo: 'Dr. Smith',
    fecha_creacion: '2024-02-10T10:00:00Z',
    estado: CaseStatus.EnRecepcion,
    prioridad: CasePriority.Prioritario,
    dias_en_sistema: 12,
    tiempo_oportunidad_max: 10,
  },
  {
    id: '2',
    codigo: 'C24-5678',
    paciente: {
      nombre: 'Maria Rodriguez',
      cedula: '2-3456-7890',
    },
    pruebas: ['Citología'],
    patologo: 'Dra. Jones',
    fecha_creacion: '2024-02-08T14:30:00Z',
    estado: CaseStatus.PorFirmar,
    prioridad: CasePriority.Prioritario,
    dias_en_sistema: 5,
    tiempo_oportunidad_max: 7,
  },
  {
    id: '3',
    codigo: 'B24-9012',
    paciente: {
      nombre: 'Carlos Lopez',
      cedula: '3-4567-8901',
      entidad: 'Clinica Privada',
    },
    pruebas: ['Biopsia Gástrica'],
    patologo: 'Dr. Smith',
    fecha_creacion: '2024-01-25T09:15:00Z',
    estado: CaseStatus.EnRecepcion,
    prioridad: CasePriority.Normal,
    dias_en_sistema: 18,
    tiempo_oportunidad_max: 15,
  },
    {
    id: '4',
    codigo: 'B24-3456',
    paciente: {
      nombre: 'Ana Garcia',
      cedula: '4-5678-9012',
    },
    pruebas: ['Biopsia'],
    patologo: 'Dra. Jones',
    fecha_creacion: '2024-02-12T08:00:00Z',
    estado: CaseStatus.PorFirmar,
    prioridad: CasePriority.Prioritario,
    dias_en_sistema: 1,
     tiempo_oportunidad_max: 5,
  },
];
