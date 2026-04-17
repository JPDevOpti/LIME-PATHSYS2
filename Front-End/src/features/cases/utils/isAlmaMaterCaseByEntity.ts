import type { Case } from '../types/case.types';

/** ObjectId catálogo entidad 003 (Hospital Alma Máter de Antioquia). */
export const ALMA_MATER_ENTITY_OBJECT_ID_HEX = '69ba9b092a505918c24495f2';

function normalizeText(value?: string): string {
    return (value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function normalizeEntityId(v?: string | null): string {
    return (v || '').replace(/\s/g, '').toLowerCase();
}

/** Texto de catálogo Alma Máter / HAMA en `entity.name` (no línea Renales*). */
function hasAlmaMaterCatalogTextInEntityName(value?: string): boolean {
    const n = normalizeText(value);
    if (!n) return false;
    if (n.includes('renales')) return false;
    return (
        n === 'hama' ||
        n.includes('alma mater') ||
        n.includes('alma mater de antioquia') ||
        n.includes('hospital alma mater')
    );
}

/**
 * Caso del catálogo Alma Máter (003) según solo `case.entity` (id / name).
 * No usa `patient.entity_info` (EPS u otros códigos del paciente).
 * La línea Renales* (nombre con «renales») nunca se trata como exclusión Alma Máter.
 */
export function isAlmaMaterCaseByEntity(caseItem: Pick<Case, 'entity'>): boolean {
    if (normalizeText(caseItem.entity?.name).includes('renales')) {
        return false;
    }
    const caseEntityId = caseItem.entity?.id != null ? String(caseItem.entity.id) : '';
    if (normalizeEntityId(caseEntityId) === normalizeEntityId(ALMA_MATER_ENTITY_OBJECT_ID_HEX)) {
        return true;
    }
    return hasAlmaMaterCatalogTextInEntityName(caseItem.entity?.name);
}

/** Nombre de entidad del caso para listados: solo `case.entity`. */
export function caseEntityNameForList(caseItem: Pick<Case, 'entity'>): string {
    return caseItem.entity?.name?.trim() || '-';
}
