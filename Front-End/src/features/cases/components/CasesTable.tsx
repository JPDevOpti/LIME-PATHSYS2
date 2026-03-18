"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Case, getDateFromDateInfo } from "../types/case.types";
import type { CaseSortKey, SortOrder } from "../hooks/useCaseList";
import { usePermissions } from "@/features/auth/hooks/usePermissions";
import { openCasePdf } from "@/shared/utils/pdf";
import {
  calculateBusinessDays,
  getElapsedDays,
} from "@/shared/utils/dateUtils";
import {
  Info,
  ClipboardPen,
  Hash,
  User,
  Building2,
  FlaskConical,
  Route,
  Stethoscope,
  Calendar,
  AlertCircle,
  Settings2,
  Printer,
  PackageCheck,
} from "lucide-react";

const COLUMN_ICONS: Record<
  CaseSortKey,
  React.ComponentType<{ className?: string }>
> = {
  case_code: Hash,
  patient: User,
  entity: Stethoscope,
  pathologist: User,
  tests: FlaskConical,
  status: Route,
  created_at: Calendar,
  priority: AlertCircle,
  doctor: User,
  service: Building2,
};

interface Column {
  key: CaseSortKey;
  label: string;
  class?: string;
}

interface CasesTableProps {
  cases: Case[];
  columns: Column[];
  sortKey: CaseSortKey;
  sortOrder: SortOrder;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  noResultsMessage: string;
  onSort: (key: CaseSortKey) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onItemsPerPageChange: (value: number) => void;
  onViewDetails?: (caseItem: Case) => void;
  onAssignPathologistClick?: (caseItem: Case) => void;
  onMarkDelivered?: (selectedCases: Case[]) => void;
  onSelectionChange?: (selected: Case[]) => void;
  isPaciente?: boolean;
}

const priorityLabels: Record<string, string> = {
  normal: "Normal",
  prioritario: "Prioritario",
};

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "N/A";

  const day = d.getDate();
  const months = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return `${day} ${months[d.getMonth()]} ${year}, ${hours}:${minutes}`;
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

function getPriorityClass(priority?: string): string {
  if (priority === "prioritario") return "bg-yellow-50 text-yellow-700";
  return "bg-green-50 text-green-700";
}

function getUrgentLimitDays(c: Case): number {
  const raw = Number(c.opportunity_info?.[0]?.max_opportunity_time);
  if (Number.isFinite(raw) && raw >= 1 && raw <= 12) return Math.floor(raw);
  return 6;
}

function isOverdue(c: Case): boolean {
  if (c.status === "Completado") return false;
  return getElapsedDays(c) > getUrgentLimitDays(c);
}

function getDaysBadgeClass(c: Case): string {
  const days = getElapsedDays(c);
  const limit = getUrgentLimitDays(c);
  if (days > limit) return "bg-red-50 text-red-700";
  return "bg-lime-50 text-lime-700";
}

function getTestsFromCase(c: Case): { code: string; count: number }[] {
  const counts: Record<string, number> = {};
  const order: string[] = [];
  c.samples?.forEach((sample) => {
    sample.tests?.forEach((t) => {
      const code = t.code || t.name || "";
      if (!code) return;
      if (!counts[code]) {
        counts[code] = 0;
        order.push(code);
      }
      counts[code] += t.quantity || 1;
    });
  });
  return order.map((code) => ({ code, count: counts[code] }));
}

export function CasesTable({
  cases,
  columns,
  sortKey,
  sortOrder,
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  noResultsMessage,
  onSort,
  onPrevPage,
  onNextPage,
  onItemsPerPageChange,
  onViewDetails,
  onAssignPathologistClick,
  onMarkDelivered,
  onSelectionChange,
  isPaciente = false,
}: CasesTableProps) {
  const { canSignResults, isAdmin, isAuxiliar } = usePermissions();
  const canMarkDelivered = isAdmin || isAuxiliar;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset selection when cases list changes (page/filter change)
  useEffect(() => {
    setSelectedIds(new Set());
    onSelectionChange?.([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cases]);

  const applySelection = (newIds: Set<string>) => {
    setSelectedIds(newIds);
    onSelectionChange?.(cases.filter((c) => c.id && newIds.has(c.id)));
  };

  const toggleSelect = (c: Case) => {
    if (!c.id) return;
    const newIds = new Set(selectedIds);
    if (newIds.has(c.id)) newIds.delete(c.id);
    else newIds.add(c.id);
    applySelection(newIds);
  };

  const toggleSelectAll = () => {
    const pageIds = cases.map((c) => c.id).filter(Boolean) as string[];
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    applySelection(allSelected ? new Set() : new Set(pageIds));
  };

  const allSelected =
    cases.length > 0 && cases.every((c) => c.id && selectedIds.has(c.id));
  const someSelected =
    !allSelected && cases.some((c) => c.id && selectedIds.has(c.id));

  const resultsHref = (caseCode: string) =>
    canSignResults
      ? caseCode
        ? `/results/sign?case=${encodeURIComponent(caseCode)}`
        : "/results/sign"
      : caseCode
        ? `/results/transcribe?case=${encodeURIComponent(caseCode)}`
        : "/results/transcribe";

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="hidden lg:block max-w-full overflow-x-auto">
        <table className="min-w-full text-base">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {!isPaciente && (
                <th className="px-2 py-2 text-center w-[3%]">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-lime-600 cursor-pointer"
                    title="Seleccionar todos"
                  />
                </th>
              )}
              {columns.map((col) => {
                const Icon = COLUMN_ICONS[col.key];
                return (
                  <th
                    key={col.key}
                    className={`px-2 py-2 text-center text-gray-700 ${col.class ?? ""}`}
                  >
                    <button
                      type="button"
                      className="flex items-center justify-center gap-1.5 w-full font-medium text-gray-600 text-sm hover:text-gray-700"
                      onClick={() => onSort(col.key)}
                    >
                      {Icon && <Icon className="w-4 h-4" />}
                      {col.label}
                      {sortKey === col.key && (
                        <span>{sortOrder === "asc" ? "▲" : "▼"}</span>
                      )}
                    </button>
                  </th>
                );
              })}
              <th className="px-2 py-2 text-center text-gray-700 w-[8%]">
                <div className="flex items-center justify-center gap-1.5 font-medium text-gray-600 text-sm">
                  <Settings2 className="w-4 h-4" />
                  Acciones
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {cases.map((c) => {
              const tests = getTestsFromCase(c);
              const overdue = isOverdue(c);
              const days = getElapsedDays(c);
              const isDeliverable = c.status === "Por entregar";
              const isSelected = !!c.id && selectedIds.has(c.id);
              return (
                <tr
                  key={c.id}
                  className={`hover:bg-gray-50 ${
                    isSelected
                      ? "bg-blue-50/60"
                      : overdue
                        ? "bg-red-50/70"
                        : ""
                  }`}
                >
                  {!isPaciente && (
                    <td className="px-2 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(c)}
                        className="w-4 h-4 rounded border-gray-300 text-lime-600 cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="px-1 py-3 text-center">
                    <span className="font-medium text-gray-800">
                      {c.case_code}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <p className="text-gray-800 text-sm">
                        {c.patient?.full_name}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {c.patient?.identification_type ? `${c.patient.identification_type}-` : ''}{c.patient?.identification_number}
                      </p>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center gap-1 justify-center">
                        {onAssignPathologistClick ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAssignPathologistClick(c);
                            }}
                            className={`text-sm font-medium hover:underline cursor-pointer ${
                              c.assigned_pathologist?.name
                                ? "text-gray-800"
                                : "text-blue-600"
                            }`}
                          >
                            {c.assigned_pathologist?.name ?? "Sin patólogo"}
                          </button>
                        ) : (
                          <p
                            className={`text-sm ${c.assigned_pathologist?.name ? "text-gray-800" : "text-blue-600"}`}
                          >
                            {c.assigned_pathologist?.name ?? "Sin patólogo"}
                          </p>
                        )}
                        {c.assistant_pathologists &&
                          c.assistant_pathologists.length > 0 && (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                              title={`${c.assistant_pathologists.length} asistente(s)`}
                            >
                              +{c.assistant_pathologists.length}
                            </span>
                          )}
                      </div>
                      <p className="text-gray-500 text-xs">{c.entity ?? "-"}</p>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex flex-wrap justify-center gap-1">
                      {tests.slice(0, 6).map((g, idx) => (
                        <span
                          key={`${g.code}-${idx}`}
                          className="inline-flex items-center justify-center bg-gray-100 text-gray-700 font-mono text-xs px-2 py-1 rounded border relative"
                        >
                          <span className="truncate">{g.code}</span>
                          {g.count > 1 && (
                            <sub className="absolute -top-1 -right-1 w-4 h-4 bg-blue-200 text-blue-800 text-[10px] font-bold rounded-full flex items-center justify-center">
                              {g.count}
                            </sub>
                          )}
                        </span>
                      ))}
                      {tests.length > 6 && (
                        <span
                          className="inline-flex items-center justify-center bg-blue-50 text-blue-600 font-mono text-xs px-2 py-1 rounded border"
                          title={`${tests.length - 6} pruebas más`}
                        >
                          +{tests.length - 6}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <span
                      className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(c.status)}`}
                    >
                      {c.status ?? "-"}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <div className="flex flex-col items-center gap-0.5 min-w-[130px]">
                      <p className="text-gray-700 text-[11px] font-medium text-center w-full">
                        {formatDateTime(
                          getDateFromDateInfo(c.date_info, "created_at"),
                        )}
                      </p>
                      <p
                        className={`text-[11px] text-center w-full ${getDateFromDateInfo(c.date_info, "signed_at") ? "text-gray-700 font-medium" : "text-amber-600 font-bold"}`}
                      >
                        {formatDateTime(
                          getDateFromDateInfo(c.date_info, "signed_at"),
                        ) === "N/A"
                          ? "Pendiente"
                          : formatDateTime(
                              getDateFromDateInfo(c.date_info, "signed_at"),
                            )}
                      </p>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                      {c.priority && (
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${getPriorityClass(c.priority)}`}
                        >
                          {priorityLabels[c.priority] ?? c.priority}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium ${getDaysBadgeClass(c)}`}
                        title={`${days} días hábiles en sistema`}
                      >
                        {days} días
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-center">
                    <div className="flex gap-1 justify-center min-w-[120px]">
                      {isPaciente ? (
                        c.status === "Completado" && (
                          <button
                            type="button"
                            onClick={() => c.id && openCasePdf(c.id)}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600"
                            title="Imprimir PDF"
                            disabled={!c.id}
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        )
                      ) : (
                        <>
                          {onViewDetails ? (
                            <button
                              type="button"
                              onClick={() => onViewDetails(c)}
                              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600"
                              title="Ver detalles"
                            >
                              <Info className="w-4 h-4" />
                            </button>
                          ) : (
                            <Link
                              href={c.id ? `/cases/edit?id=${encodeURIComponent(c.id)}` : "#"}
                              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600"
                              title="Ver detalles"
                            >
                              <Info className="w-4 h-4" />
                            </Link>
                          )}
                          <Link
                            href={resultsHref(c.case_code)}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600"
                            title={
                              canSignResults
                                ? "Firmar resultados"
                                : "Realizar resultados"
                            }
                          >
                            <ClipboardPen className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => c.id && openCasePdf(c.id)}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600"
                            title="Imprimir PDF"
                            disabled={!c.id}
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {onMarkDelivered && isDeliverable && canMarkDelivered && (
                            <button
                              type="button"
                              onClick={() => onMarkDelivered([c])}
                              className="p-1.5 rounded-md hover:bg-green-100 text-green-600"
                              title="Marcar como entregado"
                            >
                              <PackageCheck className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {cases.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (isPaciente ? 1 : 2)}
                  className="px-5 py-8 text-center"
                >
                  <p className="text-gray-500 text-sm">{noResultsMessage}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="lg:hidden">
        <div className="space-y-3 p-4">
          {cases.map((c) => {
            const tests = getTestsFromCase(c);
            const overdue = isOverdue(c);
            const days = getElapsedDays(c);
            const isSelected = !!c.id && selectedIds.has(c.id);
            return (
              <div
                key={c.id}
                className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                  isSelected
                    ? "bg-blue-50/60 border-blue-200"
                    : overdue
                      ? "bg-red-50/70 border-red-200"
                      : "bg-white border-gray-200"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  {!isPaciente && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(c)}
                      className="w-4 h-4 mt-0.5 mr-2 rounded border-gray-300 text-lime-600 cursor-pointer shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-800 text-sm truncate">
                      {c.case_code}
                    </h4>
                    <p className="text-gray-600 text-xs">
                      {c.patient?.full_name}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {c.patient?.identification_type ? `${c.patient.identification_type}-` : ''}{c.patient?.identification_number}
                    </p>
                    {c.priority && (
                      <span
                        className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${getPriorityClass(c.priority)}`}
                      >
                        {priorityLabels[c.priority] ?? c.priority}
                      </span>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center justify-center rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(c.status)}`}
                  >
                    {c.status ?? "-"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                  <div>
                    <p className="text-gray-500">Patólogo asignado</p>
                    <div className="flex items-center gap-1">
                      {onAssignPathologistClick ? (
                        <button
                          type="button"
                          onClick={() => onAssignPathologistClick(c)}
                          className={`font-medium hover:underline cursor-pointer text-left ${
                            c.assigned_pathologist?.name
                              ? "text-gray-800"
                              : "text-blue-600"
                          }`}
                        >
                          {c.assigned_pathologist?.name ?? "Sin patólogo"}
                        </button>
                      ) : (
                        <p
                          className={`font-medium ${c.assigned_pathologist?.name ? "text-gray-800" : "text-blue-600"}`}
                        >
                          {c.assigned_pathologist?.name ?? "Sin patólogo"}
                        </p>
                      )}
                      {c.assistant_pathologists &&
                        c.assistant_pathologists.length > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                            +{c.assistant_pathologists.length}
                          </span>
                        )}
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-500">Entidad</p>
                    <p className="text-gray-800 font-medium">
                      {c.entity ?? "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-center">Cronología</p>
                    <div className="flex flex-col gap-0.5 mt-1 items-center">
                      <p className="text-gray-800 font-medium text-[11px] text-center">
                        {formatDateTime(
                          getDateFromDateInfo(c.date_info, "created_at"),
                        )}
                      </p>
                      <p
                        className={`font-semibold text-[11px] text-center ${getDateFromDateInfo(c.date_info, "signed_at") ? "text-gray-800" : "text-amber-600"}`}
                      >
                        {formatDateTime(
                          getDateFromDateInfo(c.date_info, "signed_at"),
                        ) === "N/A"
                          ? "Pendiente"
                          : formatDateTime(
                              getDateFromDateInfo(c.date_info, "signed_at"),
                            )}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-500">Días hábiles</p>
                    <p
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${getDaysBadgeClass(c)}`}
                    >
                      {days} días
                    </p>
                  </div>
                </div>
                <div className="mb-3">
                  <p className="text-gray-500 text-xs mb-2">Pruebas</p>
                  <div className="flex flex-wrap gap-1">
                    {tests.slice(0, 6).map((g, idx) => (
                      <span
                        key={`${g.code}-${idx}`}
                        className="inline-flex items-center justify-center bg-gray-100 text-gray-700 font-mono text-xs px-2 py-1 rounded border"
                      >
                        {g.code}
                        {g.count > 1 && (
                          <sub className="ml-0.5 text-[10px]">{g.count}</sub>
                        )}
                      </span>
                    ))}
                    {tests.length > 6 && (
                      <span className="inline-flex items-center justify-center bg-blue-50 text-blue-600 font-mono text-xs px-2 py-1 rounded border">
                        +{tests.length - 6}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1 pt-2 border-t border-gray-100">
                  {isPaciente ? (
                    c.status === "Completado" && (
                      <button
                        type="button"
                        onClick={() => c.id && openCasePdf(c.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 text-xs font-medium"
                        disabled={!c.id}
                      >
                        <Printer className="w-3 h-3" />
                        Imprimir PDF
                      </button>
                    )
                  ) : (
                    <>
                      {onViewDetails ? (
                        <button
                          type="button"
                          onClick={() => onViewDetails(c)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 text-xs font-medium"
                        >
                          <Info className="w-3 h-3" />
                          Ver detalles
                        </button>
                      ) : (
                        <Link
                          href={c.id ? `/cases/edit?id=${encodeURIComponent(c.id)}` : "#"}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 text-xs font-medium"
                        >
                          <Info className="w-3 h-3" />
                          Ver
                        </Link>
                      )}
                      <Link
                        href={resultsHref(c.case_code)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 text-xs font-medium"
                      >
                        <ClipboardPen className="w-3 h-3" />
                        {canSignResults ? "Firmar" : "Resultados"}
                      </Link>
                      <button
                        type="button"
                        onClick={() => c.id && openCasePdf(c.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 text-xs font-medium"
                        disabled={!c.id}
                      >
                        <Printer className="w-3 h-3" />
                        PDF
                      </button>
                      {onMarkDelivered && c.status === "Por entregar" && canMarkDelivered && (
                        <button
                          type="button"
                          onClick={() => onMarkDelivered([c])}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 text-xs font-medium"
                        >
                          <PackageCheck className="w-3 h-3" />
                          Entregar
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {cases.length === 0 && (
            <div className="text-center py-8">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-12 h-12 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-400">
                  <Info className="w-6 h-6" />
                </div>
                <p className="text-gray-500 text-sm font-medium">
                  {noResultsMessage}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-5 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Mostrando</span>
            <select
              value={itemsPerPage}
              onChange={(e) =>
                onItemsPerPageChange(
                  Number((e.target as HTMLSelectElement).value),
                )
              }
              className="h-8 rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={totalItems}>Todos</option>
            </select>
            <span>de {totalItems} resultados</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={onPrevPage}
              disabled={currentPage === 1}
              className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              <span className="hidden sm:inline">Anterior</span>
              <span className="sm:hidden">←</span>
            </button>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <span className="hidden sm:inline">Página</span>
              <span className="font-medium">{currentPage}</span>
              <span className="hidden sm:inline">de</span>
              <span className="hidden sm:inline">{totalPages}</span>
              <span className="sm:hidden">/ {totalPages}</span>
            </div>
            <button
              type="button"
              onClick={onNextPage}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              <span className="hidden sm:inline">Siguiente</span>
              <span className="sm:hidden">→</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
