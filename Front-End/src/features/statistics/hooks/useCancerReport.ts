'use client';

import { useState, useEffect, useCallback } from 'react';
import { caseService } from '@/features/cases/services/case.service';
import { Case, getDateFromDateInfo } from '@/features/cases/types/case.types';

export interface CancerFilters {
  from?: string;  // YYYY-MM-DD
  to?: string;    // YYYY-MM-DD
  search?: string;
}

export interface RpcaRecord {
  // Institución
  cod_institucion: string;
  institucion_notificadora: string;
  // Paciente
  apellido1: string;
  apellido2: string;
  nombre1: string;
  nombre2: string;
  tipo_id: string;
  numero_id: string;
  fecha_nacimiento: string;
  edad_diagnostico: string;
  grupo_edad: string;
  genero: string;
  municipio: string;
  subregion: string;
  direccion: string;
  eapb: string;
  // Caso
  codigo_caso: string;
  institucion_remite: string;
  fecha_diagnostico: string;
  metodo_diagnostico: string;
  localizacion_primaria: string;
  lateralidad: string;
  diagnostico_morfologico: string;
  cod_topografia_cieo: string;
  cod_morfologia_cieo: string;
  comportamiento_cieo: string;
  grado_diferenciacion: string;
  observaciones: string;
  estado_vital: string;
  fecha_defuncion: string;
  num_certificado_defuncion: string;
  causa_basica_defuncion: string;
  responsable_digitacion: string;
  fecha_digitacion: string;
  primario_multiple: string;
}

function normalizeText(value?: string): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isHamaEntity(value?: string): boolean {
  const normalized = normalizeText(value);
  return normalized === 'hama' || normalized.includes('alma mater') || normalized.includes('hama');
}

// ── Mappers ────────────────────────────────────────────────────────────────────

function formatDMY(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function mapIdType(type?: string): string {
  const map: Record<string, string> = {
    CC: '1', CE: '2', TI: '3', RC: '4', PA: '6',
    DE: '9', SC: '9', NIT: '9', CD: '9', NN: '9',
  };
  return map[type ?? ''] ?? '9';
}

function mapGender(gender?: string): string {
  if (gender === 'Masculino') return '1';
  if (gender === 'Femenino') return '2';
  return '9';
}

function getAgeGroup(age?: number): string {
  if (age === undefined || age === null) return 'Sin dato';
  if (age >= 85) return '85+';
  const lower = Math.floor(age / 5) * 5;
  return `${lower}-${lower + 4}`;
}

const CITOLOGY_CODES = new Set(['CITOLOGIA', 'CITO_QUIR', 'PAP', 'FROTIS']);

function getMetodoDiagnostico(c: Case): string {
  const isCito = c.samples?.some(s =>
    s.tests?.some(t => CITOLOGY_CODES.has((t.code ?? '').toUpperCase()))
  );
  return isCito ? '5' : '7';
}

function getResponsable(c: Case): string {
  const audit = c.audit_info?.find(a => a.action === 'created');
  return audit?.user_email ?? '';
}

// Convierte snake_case o texto plano a "Primera letra mayúscula resto minúsculas"
function formatBodyRegion(region?: string): string {
  if (!region) return '';
  const spaced = region.replace(/_/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

// Detecta comportamiento CIE-O a partir del diagnóstico morfológico y diagnóstico textual
// 0=Benigno, 1=Incierto, 2=In Situ, 3=Maligno, 6=Metastásico, 9=Sin dato
function getComportamiento(cieoName?: string, diagnosis?: string): string {
  const text = `${cieoName ?? ''} ${diagnosis ?? ''}`.toLowerCase();
  if (!text.trim()) return '9';
  // Metastásico — revisar antes que "maligno" ya que puede coexistir
  if (/metast[aá]s|secundari[oa]/.test(text)) return '6';
  // In Situ
  if (/in\s*situ/.test(text)) return '2';
  // Maligno
  if (/maligno|maligna|carcinoma|adenocarcinoma|melanoma|sarcoma|linfoma|leucemia|mieloma|blastoma/.test(text)) return '3';
  // Benigno
  if (/benigno|benigna/.test(text)) return '0';
  // Incierto / borderline
  if (/incierto|incierta|borderline|l[ií]mite|potencial\s+maligno|bajo\s+potencial/.test(text)) return '1';
  return '9';
}

// Detecta lateralidad a partir del nombre de la región
// 1=Derecho, 2=Izquierdo, 3=Bilateral, 8=No aplica, 9=Sin dato
function getLateralidad(region?: string): string {
  if (!region) return '9';
  const lower = region.toLowerCase();
  if (lower.includes('izquierd')) return '2';
  if (lower.includes('derech'))   return '1';
  if (lower.includes('bilateral')) return '3';
  return '8'; // No aplica
}

export function mapCaseToRpca(c: Case): RpcaRecord {
  const p = c.patient;
  const signedAt = getDateFromDateInfo(c.date_info, 'signed_at');
  const transcribedAt = getDateFromDateInfo(c.date_info, 'transcribed_at');
  const rawRegion = c.samples?.[0]?.body_region;
  const localizacion = rawRegion
    ? formatBodyRegion(rawRegion)
    : (c.result?.cieo_diagnosis?.name ?? '');

  return {
    cod_institucion: c.case_code ?? '',
    institucion_notificadora: c.entity ?? '',
    apellido1: p?.first_lastname ?? '',
    apellido2: p?.second_lastname ?? '',
    nombre1: p?.first_name ?? '',
    nombre2: p?.second_name ?? '',
    tipo_id: mapIdType(p?.identification_type),
    numero_id: p?.identification_number ?? '',
    fecha_nacimiento: formatDMY(p?.birth_date),
    edad_diagnostico: (p?.age != null) ? String(p.age) : '',
    grupo_edad: getAgeGroup(p?.age ?? undefined),
    genero: mapGender(p?.gender),
    municipio: p?.location?.residence_municipality_name ?? p?.location?.municipality ?? '',
    subregion: 'Valle de Aburrá',
    direccion: p?.location?.address ?? '',
    eapb: p?.entity_info?.eps_name ?? '',
    codigo_caso: c.case_code ?? '',
    institucion_remite: c.entity ?? '',
    fecha_diagnostico: formatDMY(signedAt),
    metodo_diagnostico: getMetodoDiagnostico(c),
    localizacion_primaria: localizacion,
    lateralidad: getLateralidad(rawRegion),
    diagnostico_morfologico: c.result?.cieo_diagnosis?.name ?? '',
    cod_topografia_cieo: c.result?.cieo_diagnosis?.code ?? '',
    cod_morfologia_cieo: '',
    comportamiento_cieo: getComportamiento(c.result?.cieo_diagnosis?.name, c.result?.diagnosis),
    grado_diferenciacion: '9',
    observaciones: c.observations ?? '',
    estado_vital: '9',
    fecha_defuncion: '',
    num_certificado_defuncion: '',
    causa_basica_defuncion: '',
    responsable_digitacion: getResponsable(c),
    fecha_digitacion: formatDMY(transcribedAt),
    primario_multiple: '',
  };
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useCancerReport() {
  const [records, setRecords] = useState<RpcaRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CancerFilters>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Solo casos completados; el filtro de fecha se aplica sobre delivered_at en cliente
      const all = await caseService.getAllCasesForExport({
        status: 'Completado',
      });

      // Filtrar por fecha de entrega (delivered_at)
      const fromDate = filters.from ? new Date(filters.from + 'T00:00:00') : null;
      const toDate   = filters.to   ? new Date(filters.to   + 'T23:59:59') : null;

      const byDate = all.filter(c => {
        if (!fromDate && !toDate) return true;
        const deliveredAt = getDateFromDateInfo(c.date_info, 'delivered_at');
        if (!deliveredAt) return false;
        const d = new Date(deliveredAt);
        if (fromDate && d < fromDate) return false;
        if (toDate   && d > toDate)   return false;
        return true;
      });

      const withoutHama = byDate.filter(c => {
        const entityName = c.entity ?? c.patient?.entity_info?.entity_name;
        const entityCode = c.patient?.entity_info?.entity_code ?? c.patient?.entity_info?.code;
        return !isHamaEntity(entityName) && !isHamaEntity(entityCode);
      });

      const withCieo = withoutHama.filter(c => c.result?.cieo_diagnosis?.code);

      const searched = filters.search
        ? withCieo.filter(c => {
            const q = filters.search!.toLowerCase();
            return (
              c.case_code?.toLowerCase().includes(q) ||
              c.patient?.full_name?.toLowerCase().includes(q) ||
              c.patient?.identification_number?.toLowerCase().includes(q) ||
              c.result?.cieo_diagnosis?.code?.toLowerCase().includes(q)
            );
          })
        : withCieo;

      setRecords(searched.map(mapCaseToRpca));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  return { records, loading, error, filters, setFilters, refetch: load };
}
