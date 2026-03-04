"use client";

import {
  AlertCircle,
  Calendar,
  ClipboardPen,
  Clock,
  Hash,
  Info,
  Microscope,
  Building2,
  Settings,
  User,
  ClipboardPlus,
  Printer,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/features/auth/context/AuthContext";
import { usePermissions } from "@/features/auth/hooks/usePermissions";
import { BaseCard } from "@/shared/components/base/BaseCard";
import { CasePriority, type UrgentCase } from "../model/dashboard.types";
import { twMerge } from "tailwind-merge";

type UrgentCasesTableProps = {
  cases: UrgentCase[];
  onViewCase?: (caseItem: UrgentCase) => void;
};

const HAMA_ENTITY_CODE = "hama";

function normalizeText(value?: string): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isHamaCase(caseItem: UrgentCase): boolean {
  const entityName = normalizeText(caseItem.paciente.entidad);
  return (
    entityName === HAMA_ENTITY_CODE ||
    entityName.includes("alma mater") ||
    entityName.includes("hospital alma mater") ||
    entityName.includes("hama")
  );
}

const PriorityBadge = ({ priority }: { priority: CasePriority }) => {
  const isHigh = priority === CasePriority.Prioritario;
  return (
    <span
      className={twMerge(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        isHigh
          ? "bg-danger-50 text-danger-700 ring-1 ring-inset ring-danger-600/10"
          : "bg-neutral-100 text-neutral-600 ring-1 ring-inset ring-neutral-500/10",
      )}
    >
      {isHigh && <AlertCircle className="h-3 w-3" />}
      {priority}
    </span>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    "En recepción": "bg-lime-blue-50 text-lime-blue-700 ring-lime-blue-700/10",
    "Corte macro": "bg-cyan-50 text-cyan-700 ring-cyan-600/10",
    "Descrip micro": "bg-indigo-50 text-indigo-700 ring-indigo-600/10",
    "Por firmar": "bg-warning-50 text-warning-700 ring-warning-600/10",
    "Por entregar": "bg-violet-50 text-violet-700 ring-violet-600/10",
    Completado: "bg-success-50 text-success-700 ring-success-600/10",
  };

  const defaultStyle = "bg-neutral-50 text-neutral-600 ring-neutral-500/10";

  return (
    <span
      className={twMerge(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
        styles[status] || defaultStyle,
      )}
    >
      {status}
    </span>
  );
};

export const UrgentCasesTable = ({
  cases,
  onViewCase,
}: UrgentCasesTableProps) => {
  const { canSignResults, isPaciente, isPatologo } = usePermissions();
  const { user } = useAuth();

  const nonHamaCases = cases.filter((caseItem) => !isHamaCase(caseItem));

  const visibleCases = isPatologo && user?.name
    ? nonHamaCases.filter(
        (c) =>
          c.patologo.trim().toLowerCase() === user.name!.trim().toLowerCase(),
      )
    : nonHamaCases;

  const openCasePdf = (caseId: string) => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const url = `${apiBase}/api/v1/cases/${encodeURIComponent(caseId)}/pdf`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const resultsHref = (caseCode: string) =>
    canSignResults
      ? caseCode
        ? `/results/sign?case=${encodeURIComponent(caseCode)}`
        : "/results/sign"
      : caseCode
        ? `/results/transcribe?case=${encodeURIComponent(caseCode)}`
        : "/results/transcribe";

  return (
    <BaseCard className="overflow-hidden" padding="none">
      <div className="border-b border-neutral-100 bg-white px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-neutral-900">
              Casos Urgentes
            </h3>
            <p className="mt-1 text-sm text-neutral-500">
              {visibleCases.length} casos que requieren atención inmediata.
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-neutral-100 text-sm">
          <thead className="bg-neutral-50/50">
            <tr>
              <th
                scope="col"
                className="px-6 py-4 text-center font-semibold text-neutral-500 uppercase tracking-wider text-xs w-[10%]"
              >
                <div className="flex items-center justify-center gap-2">
                  <Hash className="h-3.5 w-3.5" />
                  Código
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-center font-semibold text-neutral-500 uppercase tracking-wider text-xs w-[20%]"
              >
                <div className="flex items-center justify-center gap-2">
                  <User className="h-3.5 w-3.5" />
                  Paciente
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-center font-semibold text-neutral-500 uppercase tracking-wider text-xs w-[20%]"
              >
                <div className="flex items-center justify-center gap-2">
                  <Building2 className="h-3.5 w-3.5" />
                  Entidad / Patólogo
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-center font-semibold text-neutral-500 uppercase tracking-wider text-xs w-[15%]"
              >
                <div className="flex items-center justify-center gap-2">
                  <Microscope className="h-3.5 w-3.5" />
                  Pruebas
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-center font-semibold text-neutral-500 uppercase tracking-wider text-xs w-[15%]"
              >
                <div className="flex items-center justify-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  Estado / Días
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-center font-semibold text-neutral-500 uppercase tracking-wider text-xs w-[10%]"
              >
                <div className="flex items-center justify-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  Fecha ingreso
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-center font-semibold text-neutral-500 uppercase tracking-wider text-xs w-[10%]"
              >
                <div className="flex items-center justify-center gap-2">
                  <Settings className="h-3.5 w-3.5" />
                  Acciones
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 bg-white">
            {visibleCases.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-neutral-50/80 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className="font-bold text-neutral-900 text-sm">
                    {item.codigo}
                  </span>
                </td>

                <td className="px-6 py-4 text-center">
                  <div className="flex flex-col items-center">
                    <span
                      className="font-semibold text-neutral-900 truncate max-w-[180px]"
                      title={item.paciente.nombre}
                    >
                      {item.paciente.nombre}
                    </span>
                    <span className="text-xs text-neutral-500 mt-0.5">
                      {item.paciente.cedula}
                    </span>
                  </div>
                </td>

                <td className="px-6 py-4 text-center">
                  <div className="flex flex-col items-center text-xs">
                    <span className="font-medium text-neutral-900 truncate max-w-[160px]">
                      {item.paciente.entidad || "N/A"}
                    </span>
                    <span className="text-neutral-500 truncate max-w-[160px] mt-0.5">
                      {item.patologo}
                    </span>
                  </div>
                </td>

                <td className="px-6 py-4">
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {item.pruebas.slice(0, 2).map((p, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-neutral-100 text-neutral-600 border border-neutral-200"
                        title={p}
                      >
                        {p.split(" ")[0]}
                      </span>
                    ))}
                    {item.pruebas.length > 2 && (
                      <span className="inline-flex items-center px-1.5 py-1 rounded-md text-xs font-medium bg-neutral-100 text-neutral-500 border border-neutral-200">
                        +{item.pruebas.length - 2}
                      </span>
                    )}
                  </div>
                </td>

                <td className="px-6 py-4 text-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <StatusBadge status={item.estado} />
                    <span
                      className={twMerge(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                        item.dias_en_sistema >
                          (item.tiempo_oportunidad_max || 6)
                          ? "bg-rose-50 text-rose-600 border-rose-100"
                          : "bg-blue-50 text-blue-600 border-blue-100",
                      )}
                    >
                      {item.dias_en_sistema} días
                    </span>
                  </div>
                </td>

                <td className="px-6 py-4 text-center whitespace-nowrap text-xs text-neutral-500 font-medium">
                  {new Date(item.fecha_creacion).toLocaleDateString()}
                </td>

                <td className="px-6 py-4 text-center">
                  <div className="flex gap-1 justify-center min-w-[120px]">
                    {isPaciente ? (
                      item.estado === "Completado" && (
                        <button
                          type="button"
                          onClick={() => item.id && openCasePdf(item.id)}
                          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600"
                          title="Imprimir PDF"
                          disabled={!item.id}
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      )
                    ) : (
                      <>
                        {onViewCase ? (
                          <button
                            type="button"
                            onClick={() => onViewCase(item)}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600"
                            title="Ver detalles"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        ) : (
                          <Link
                            href={item.id ? `/cases/edit?id=${encodeURIComponent(item.id)}` : "#"}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600"
                            title="Ver detalles"
                          >
                            <Info className="w-4 h-4" />
                          </Link>
                        )}
                        <Link
                          href={resultsHref(item.codigo)}
                          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600"
                          title={
                            canSignResults
                              ? "Firmar resultados"
                              : "Realizar resultados"
                          }
                        >
                          {" "}
                          <ClipboardPen className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => item.id && openCasePdf(item.id)}
                          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-600"
                          title="Imprimir PDF"
                          disabled={!item.id}
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {visibleCases.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
            <ClipboardPlus className="h-12 w-12 text-neutral-200 mb-3" />
            <p className="font-medium">No hay casos urgentes pendientes.</p>
          </div>
        )}
      </div>
    </BaseCard>
  );
};
