// Re-exporta desde shared para mantener una unica fuente de datos
export {
    getPathologists,
    PATHOLOGIST_OPTIONS
} from '@/shared/components/lists/data/mock-pathologists';
export type { Pathologist } from '@/shared/components/lists/data/mock-pathologists';

import { PATHOLOGIST_OPTIONS } from '@/shared/components/lists';

export function getPathologistSelectOptions() {
    return [...PATHOLOGIST_OPTIONS];
}
