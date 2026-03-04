import {
  Hash,
  User,
  Stethoscope,
  Calendar,
  Settings2,
  Info,
} from "lucide-react";
import { useState } from "react";
import { LegacyCase } from "../types/case-legacy.types";
import { PrintPdfButton } from "@/shared/components/ui/buttons/PrintPdfButton";
import { legacyCasesService } from "../services/cases-legacy.service";

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
  return `${day} ${months[d.getMonth()]} ${year}`;
}

interface LegacyCasesTableProps {
  cases: LegacyCase[];
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  totalItems: number;
  noResultsMessage: string;
  onPrevPage: () => void;
  onNextPage: () => void;
  onItemsPerPageChange: (value: number) => void;
  onViewDetails?: (caseItem: LegacyCase) => void;
}

export function LegacyCasesTable({
  cases,
  currentPage,
  totalPages,
  itemsPerPage,
  totalItems,
  noResultsMessage,
  onPrevPage,
  onNextPage,
  onItemsPerPageChange,
  onViewDetails,
}: LegacyCasesTableProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadPdf = async (caseId: string) => {
    try {
      setDownloadingId(caseId);
      const blob = await legacyCasesService.downloadPdf(caseId);
      if (blob) {
        const url = window.URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener,noreferrer");
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 5000);
      }
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="hidden lg:block max-w-full overflow-x-auto">
        <table className="min-w-full text-base">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-2 py-3 text-center text-gray-700 w-[15%]">
                <div className="flex items-center justify-center gap-1.5 font-medium text-gray-600 text-sm">
                  <Hash className="w-4 h-4" />
                  Código
                </div>
              </th>
              <th className="px-2 py-3 text-center text-gray-700 w-[25%]">
                <div className="flex items-center justify-center gap-1.5 font-medium text-gray-600 text-sm">
                  <User className="w-4 h-4" />
                  Paciente
                </div>
              </th>
              <th className="px-2 py-3 text-center text-gray-700 w-[20%]">
                <div className="flex items-center justify-center gap-1.5 font-medium text-gray-600 text-sm">
                  <Stethoscope className="w-4 h-4" />
                  Entidad / Atención
                </div>
              </th>
              <th className="px-2 py-3 text-center text-gray-700 w-[15%]">
                <div className="flex items-center justify-center gap-1.5 font-medium text-gray-600 text-sm">
                  <Calendar className="w-4 h-4" />
                  Fechas
                </div>
              </th>
              <th className="px-2 py-3 text-center text-gray-700 w-[15%]">
                <div className="flex items-center justify-center gap-1.5 font-medium text-gray-600 text-sm">
                  Información Clínica
                </div>
              </th>
              <th className="px-2 py-3 text-center text-gray-700 w-[10%]">
                <div className="flex items-center justify-center gap-1.5 font-medium text-gray-600 text-sm">
                  <Settings2 className="w-4 h-4" />
                  Acciones
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {cases.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-2 py-3 text-center">
                  <span className="font-medium text-gray-800">
                    {c.legacy_id}
                  </span>
                </td>
                <td className="px-2 py-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-gray-800 text-sm font-medium">
                      {c.patient?.full_name || "Desconocido"}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {c.patient?.identification_type
                        ? `${c.patient.identification_type}-`
                        : ""}
                      {c.patient?.identification ||
                        c.patient?.identificacion ||
                        c.patient?.identification_number ||
                        "Sin documento"}
                    </p>
                  </div>
                </td>
                <td className="px-2 py-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-gray-800 text-sm">{c.entity || "-"}</p>
                    <p className="text-gray-500 text-xs">
                      {c.care_type || "-"}
                    </p>
                  </div>
                </td>
                <td className="px-2 py-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <p
                      className="text-gray-700 text-[11px] font-medium"
                      title="Recibido"
                    >
                      Rec: {formatDateTime(c.received_at)}
                    </p>
                    <p
                      className="text-gray-600 text-[11px]"
                      title="Cerrado/Reportado"
                    >
                      Cer: {formatDateTime(c.closed_at)}
                    </p>
                  </div>
                </td>
                <td className="px-2 py-3 text-center">
                  <div
                    className="max-w-[200px] text-xs text-gray-600 truncate mx-auto"
                    title={c.previous_study}
                  >
                    {c.previous_study || "Sin datos"}
                  </div>
                </td>
                <td className="px-2 py-3 text-center">
                  <div className="flex justify-center gap-2">
                    <PrintPdfButton
                      size="sm"
                      text=""
                      title="Imprimir PDF"
                      className="px-2 w-8"
                      loading={downloadingId === c.id}
                      onClick={() => handleDownloadPdf(c.id)}
                    />
                    <button
                      type="button"
                      onClick={() => onViewDetails?.(c)}
                      className="p-1.5 rounded-md border border-neutral-300 hover:bg-neutral-50 text-gray-700 transition"
                      title="Ver detalles"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {cases.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center">
                  <p className="text-gray-500 text-sm">{noResultsMessage}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 sm:px-5 py-4 border-t border-gray-200 bg-gray-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Mostrando</span>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="h-8 rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm text-gray-700"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>de {totalItems} resultados</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={onPrevPage}
              disabled={currentPage === 1 || totalPages === 0}
              className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Anterior
            </button>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <span>Página</span>
              <span className="font-medium">{currentPage}</span>
              <span>de</span>
              <span>{Math.max(1, totalPages)}</span>
            </div>
            <button
              type="button"
              onClick={onNextPage}
              disabled={currentPage >= totalPages || totalPages === 0}
              className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
