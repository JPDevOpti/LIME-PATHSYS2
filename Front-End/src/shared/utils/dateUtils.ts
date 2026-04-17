export function getColombianHolidays(year: number): Set<string> {
  const holidays = new Set<string>();

  const getEasterDate = (y: number) => {
    const a = y % 19;
    const b = Math.floor(y / 100);
    const c = y % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k2 = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k2) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  };

  const getEmilianiMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay(); // 0 Sunday, 1 Monday, ...
    if (day === 1) return date;
    const diff = day === 0 ? 1 : 8 - day;
    date.setDate(date.getDate() + diff);
    return date;
  };

  const addH = (d: Date) => holidays.add(d.toISOString().split("T")[0]);

  // Fijos
  addH(new Date(year, 0, 1)); // Año Nuevo
  addH(new Date(year, 4, 1)); // Trabajo
  addH(new Date(year, 6, 20)); // Independencia
  addH(new Date(year, 7, 7)); // Batalla
  addH(new Date(year, 11, 8)); // Inmaculada
  addH(new Date(year, 11, 25)); // Navidad

  // Emiliani
  addH(getEmilianiMonday(new Date(year, 0, 6))); // Reyes
  addH(getEmilianiMonday(new Date(year, 2, 19))); // San Jose
  addH(getEmilianiMonday(new Date(year, 5, 29))); // San Pedro
  addH(getEmilianiMonday(new Date(year, 7, 15))); // Asuncion
  addH(getEmilianiMonday(new Date(year, 9, 12))); // Raza
  addH(getEmilianiMonday(new Date(year, 10, 1))); // Todos los Santos
  addH(getEmilianiMonday(new Date(year, 10, 11))); // Independencia Cartag

  // Semana Santa
  const easter = getEasterDate(year);
  const juevesSanto = new Date(easter);
  juevesSanto.setDate(easter.getDate() - 3);
  const viernesSanto = new Date(easter);
  viernesSanto.setDate(easter.getDate() - 2);
  addH(juevesSanto);
  addH(viernesSanto);

  const addEasterRelative = (days: number) => {
    const d = new Date(easter);
    d.setDate(d.getDate() + days);
    addH(getEmilianiMonday(d));
  };
  addEasterRelative(43); // Ascension
  addEasterRelative(64); // Corpus
  addEasterRelative(71); // Sagrado Corazon

  return holidays;
}

export function calculateBusinessDays(startStr: string, endStr?: string): number {
  const start = new Date(startStr);
  const end = endStr ? new Date(endStr) : new Date();
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

  // Normalizar a medianoche para evitar problemas de comparacion
  const from = new Date(start);
  from.setHours(0, 0, 0, 0);
  const to = new Date(end);
  to.setHours(0, 0, 0, 0);

  if (from > to) return 0;

  const years = new Set<number>();
  years.add(from.getFullYear());
  years.add(to.getFullYear());

  const allHolidays = new Set<string>();
  years.forEach((y) => {
    const h = getColombianHolidays(y);
    h.forEach((val) => allHolidays.add(val));
  });

  let count = 0;
  const cur = new Date(from);
  while (cur < to) {
    cur.setDate(cur.getDate() + 1);
    const dow = cur.getDay(); // 0 Sun, 1 Mon...
    const iso = cur.toISOString().split("T")[0];

    if (dow !== 0 && dow !== 6 && !allHolidays.has(iso)) {
      count++;
    }
  }
  return count;
}

type OpportunityInfoItem = {
  opportunity_time?: number | null;
  was_timely?: boolean;
  max_opportunity_time?: number;
};

type CaseLike = {
  status?: string;
  date_info?: unknown[];
  opportunity_info?: OpportunityInfoItem[];
};

function getDateFromDateInfo(
  dateInfo: unknown[] | undefined,
  field: string,
): string | null {
  if (!dateInfo || dateInfo.length === 0) return null;

  // Soporta ambos formatos: [{ created_at: "..." }] y [{ field_name, value }]
  const firstItem = dateInfo[0] as Record<string, unknown> | undefined;
  const directValue = firstItem?.[field];
  if (typeof directValue === "string") return directValue;

  const fieldItem = dateInfo.find((item) => {
    const typedItem = item as Record<string, unknown> | undefined;
    return typedItem?.field_name === field && typeof typedItem?.value === "string";
  }) as Record<string, unknown> | undefined;
  return (fieldItem?.value as string | undefined) ?? null;
}

export function getElapsedDays(c: CaseLike): number {
  const status = c.status;
  const isFinished = status === "Completado" || status === "Por entregar";
  const storedTime = c.opportunity_info?.[0]?.opportunity_time;
  if (isFinished && storedTime !== undefined && storedTime !== null) {
    return Math.floor(storedTime);
  }

  const start = getDateFromDateInfo(c.date_info, "created_at");
  if (!start) return 0;
  return calculateBusinessDays(start);
}

export function getWasTimely(c: CaseLike): boolean | undefined {
  return c.opportunity_info?.[0]?.was_timely;
}

export function getMaxOpportunityTime(c: CaseLike): number | undefined {
  return c.opportunity_info?.[0]?.max_opportunity_time;
}
