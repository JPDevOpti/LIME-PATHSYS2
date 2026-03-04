/**
 * Formats a patient's age with smart granularity based on birth_date or age (years).
 *
 * Rules:
 *  - < 1 year  → only months  (e.g. "8 meses")
 *  - 1–3 years → years + months (e.g. "2 años y 3 meses")
 *  - > 3 years → only years   (e.g. "35 años")
 *
 * When `birthDate` is provided it is used for an exact calculation.
 * When only `age` (integer years) is available it falls back to the coarser display.
 */
export function formatAge(age?: number, birthDate?: string): string | undefined {
    if (birthDate) {
        const birth = new Date(`${birthDate}T00:00:00`);
        if (isNaN(birth.getTime())) return age != null ? `${age} años` : undefined;

        const today = new Date();
        let years = today.getFullYear() - birth.getFullYear();
        let months = today.getMonth() - birth.getMonth();
        if (today.getDate() < birth.getDate()) months--;
        if (months < 0) { years--; months += 12; }

        if (years < 0) return undefined;
        if (years === 0) return months <= 1 ? `${months} mes` : `${months} meses`;
        if (years <= 3) {
            const yearLabel = years === 1 ? '1 año' : `${years} años`;
            if (months === 0) return yearLabel;
            const monthLabel = months === 1 ? '1 mes' : `${months} meses`;
            return `${yearLabel} y ${monthLabel}`;
        }
        return `${years} años`;
    }

    if (age != null) return `${age} años`;
    return undefined;
}
