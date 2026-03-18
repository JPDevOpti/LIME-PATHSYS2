"use client";

import { Hash, FlaskConical, Clock, AlertCircle, User, Route } from "lucide-react";
import { Case, getDateFromDateInfo } from "@/features/cases/types/case.types";

function getColombianHolidays(year: number): Set<string> {
  const holidays = new Set<string>();
  const getEasterDate = (y: number) => {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100;
    const d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k2 = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k2) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  };
  const getEmilianiMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    if (day === 1) return date;
    date.setDate(date.getDate() + (day === 0 ? 1 : 8 - day));
    return date;
  };
  const addH = (d: Date) => holidays.add(d.toISOString().split("T")[0]);
  addH(new Date(year, 0, 1)); addH(new Date(year, 4, 1));
  addH(new Date(year, 6, 20)); addH(new Date(year, 7, 7));
  addH(new Date(year, 11, 8)); addH(new Date(year, 11, 25));
  addH(getEmilianiMonday(new Date(year, 0, 6)));
  addH(getEmilianiMonday(new Date(year, 2, 19)));
  addH(getEmilianiMonday(new Date(year, 5, 29)));
  addH(getEmilianiMonday(new Date(year, 7, 15)));
  addH(getEmilianiMonday(new Date(year, 9, 12)));
  addH(getEmilianiMonday(new Date(year, 10, 1)));
  addH(getEmilianiMonday(new Date(year, 10, 11)));
  const easter = getEasterDate(year);
  const juevesSanto = new Date(easter); juevesSanto.setDate(easter.getDate() - 3);
  const viernesSanto = new Date(easter); viernesSanto.setDate(easter.getDate() - 2);
  addH(juevesSanto); addH(viernesSanto);
  const addEasterRelative = (days: number) => {
    const d = new Date(easter); d.setDate(d.getDate() + days);
    addH(getEmilianiMonday(d));
  };
  addEasterRelative(43); addEasterRelative(64); addEasterRelative(71);
  return holidays;
}

function calculateBusinessDays(startStr: string): number {
  const start = new Date(startStr);
  const end = new Date();
  if (isNaN(start.getTime())) return 0;
  const from = new Date(start); from.setHours(0, 0, 0, 0);
  const to = new Date(end); to.setHours(0, 0, 0, 0);
  if (from > to) return 0;
  const allHolidays = new Set<string>();
  [from.getFullYear(), to.getFullYear()].forEach((y) =>
    getColombianHolidays(y).forEach((v) => allHolidays.add(v))
  );
  let count = 0;
  const cur = new Date(from);
  while (cur < to) {
    cur.setDate(cur.getDate() + 1);
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6 && !allHolidays.has(cur.toISOString().split("T")[0])) count++;
  }
  return count;
}

function elapsedDays(c: Case): number {
  const isFinished = c.status === "Completado" || c.status === "Por entregar";
  const storedTime = c.opportunity_info?.[0]?.opportunity_time;
  if (isFinished && storedTime != null) return Math.floor(storedTime);
  const start = getDateFromDateInfo(c.date_info, "created_at");
  if (!start) return 0;
  return calculateBusinessDays(start);
}

function getTestsFromCase(c: Case): { code: string; count: number }[] {
  const counts: Record<string, number> = {};
  const order: string[] = [];
  c.samples?.forEach((sample) => {
    sample.tests?.forEach((t) => {
      const code = t.test_code || t.name || "";
      if (!code) return;
      if (!counts[code]) { counts[code] = 0; order.push(code); }
      counts[code] += t.quantity || 1;
    });
  });
  return order.map((code) => ({ code, count: counts[code] }));
}

function getDaysBadgeClass(days: number, c: Case): string {
  const raw = Number(c.opportunity_info?.[0]?.max_opportunity_time);
  const limit = Number.isFinite(raw) && raw >= 1 && raw <= 12 ? Math.floor(raw) : 6;
  return days > limit ? "bg-red-50 text-red-700" : "bg-lime-50 text-lime-700";
}

const priorityLabels: Record<string, string> = {
  normal: "Normal",
  prioritario: "Prioritario",
};

function getPriorityClass(priority?: string): string {
  if (priority?.toLowerCase() === "prioritario") return "bg-yellow-100 text-yellow-800 ring-1 ring-yellow-300";
  return "bg-green-50 text-green-700";
}

function getStatusClass(status?: string): string {
  if (status === "Completado") return "bg-green-50 text-green-700";
  if (status === "Por entregar") return "bg-red-50 text-red-700 font-semibold";
  if (status === "Por firmar") return "bg-yellow-50 text-yellow-700";
  if (status === "Descrip micro") return "bg-indigo-50 text-indigo-700";
  if (status === "Corte macro") return "bg-cyan-50 text-cyan-700";
  if (status === "En recepción") return "bg-blue-50 text-blue-700";
  return "bg-neutral-100 text-neutral-700";
}

interface PendingSignCasesTableProps {
  cases: Case[];
  onSelectCase: (caseCode: string) => void;
}

export function PendingSignCasesTable({ cases, onSelectCase }: PendingSignCasesTableProps) {
  const sorted = [...cases].sort((a, b) => elapsedDays(b) - elapsedDays(a));

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-neutral-500 text-center py-6">
        No hay casos pendientes de firma.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <div className="overflow-x-auto">
        {/* Fixed height showing ~5 rows, scroll for the rest */}
        <div className="max-h-[260px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="py-2.5 px-4 font-semibold text-neutral-600 text-left whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" />
                    Código
                  </div>
                </th>
                <th className="py-2.5 px-4 font-semibold text-neutral-600 text-left w-[30%]">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    Paciente
                  </div>
                </th>
                <th className="py-2.5 px-2 font-semibold text-neutral-600 text-left w-[18%]">
                  <div className="flex items-center gap-1.5">
                    <FlaskConical className="w-3.5 h-3.5" />
                    Pruebas
                  </div>
                </th>
                <th className="py-2.5 px-4 font-semibold text-neutral-600 text-center whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Días
                  </div>
                </th>
                <th className="py-2.5 px-4 font-semibold text-neutral-600 text-center whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Prioridad
                  </div>
                </th>
                <th className="py-2.5 px-4 font-semibold text-neutral-600 text-center whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1.5">
                    <Route className="w-3.5 h-3.5" />
                    Estado
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => {
                const tests = getTestsFromCase(c);
                const days = elapsedDays(c);
                return (
                  <tr
                    key={c.id}
                    className="border-t border-neutral-100 hover:bg-lime-brand-50 transition-colors cursor-pointer"
                    onClick={() => onSelectCase(c.case_code)}
                    title="Cargar caso"
                  >
                    <td className="py-2.5 px-4 font-medium text-neutral-900 whitespace-nowrap">
                      {c.case_code}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-neutral-900 text-xs truncate max-w-[220px]">
                          {c.patient?.full_name ?? "-"}
                        </span>
                        <span className="text-neutral-500 text-xs">
                          {c.patient?.identification_type
                            ? `${c.patient.identification_type} · ${c.patient.identification_number ?? ""}`
                            : (c.patient?.identification_number ?? "-")}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex flex-wrap gap-1">
                        {tests.slice(0, 3).map((g, idx) => (
                          <span
                            key={`${g.code}-${idx}`}
                            className="inline-flex items-center justify-center bg-gray-100 text-gray-700 font-mono text-xs px-2 py-0.5 rounded border relative"
                          >
                            <span className="truncate">{g.code}</span>
                            {g.count > 1 && (
                              <sub className="absolute -top-1 -right-1 w-4 h-4 bg-blue-200 text-blue-800 text-[10px] font-bold rounded-full flex items-center justify-center">
                                {g.count}
                              </sub>
                            )}
                          </span>
                        ))}
                        {tests.length > 3 && (
                          <span className="inline-flex items-center justify-center bg-blue-50 text-blue-600 font-mono text-xs px-2 py-0.5 rounded border">
                            +{tests.length - 3}
                          </span>
                        )}
                        {tests.length === 0 && (
                          <span className="text-neutral-400 text-xs">—</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ${getDaysBadgeClass(days, c)}`}
                      >
                        {days} días
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${getPriorityClass(c.priority)}`}
                      >
                        {priorityLabels[c.priority] ?? c.priority ?? "Normal"}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ${getStatusClass(c.status)}`}
                      >
                        {c.status ?? "-"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
