'use client';

import { useCallback, useState } from 'react';
import { Microscope, FileSpreadsheet, Search, X, RefreshCw, Loader2, AlertCircle } from 'lucide-react';
import { useCancerReport, type RpcaRecord } from '../../hooks/useCancerReport';

// ── Definición de columnas RPCA ────────────────────────────────────────────────

const COLUMNS: { key: keyof RpcaRecord; label: string; minW: string; excelWidth: number }[] = [
  { key: 'cod_institucion',          label: 'Cód. Institución',         minW: '130px', excelWidth: 18 },
  { key: 'institucion_notificadora', label: 'Institución Notificadora',  minW: '180px', excelWidth: 28 },
  { key: 'apellido1',                label: 'Primer Apellido',           minW: '140px', excelWidth: 20 },
  { key: 'apellido2',                label: 'Segundo Apellido',          minW: '140px', excelWidth: 20 },
  { key: 'nombre1',                  label: 'Primer Nombre',             minW: '140px', excelWidth: 20 },
  { key: 'nombre2',                  label: 'Segundo Nombre',            minW: '140px', excelWidth: 20 },
  { key: 'tipo_id',                  label: 'Tipo ID',                   minW: '70px',  excelWidth: 9  },
  { key: 'numero_id',                label: 'Número Identificación',     minW: '150px', excelWidth: 22 },
  { key: 'fecha_nacimiento',         label: 'Fecha Nacimiento',          minW: '120px', excelWidth: 16 },
  { key: 'edad_diagnostico',         label: 'Edad Diagnóstico',          minW: '100px', excelWidth: 14 },
  { key: 'grupo_edad',               label: 'Grupo Edad',                minW: '100px', excelWidth: 12 },
  { key: 'genero',                   label: 'Género',                    minW: '70px',  excelWidth: 9  },
  { key: 'municipio',                label: 'Municipio Residencia',      minW: '170px', excelWidth: 24 },
  { key: 'subregion',                label: 'Subregión',                 minW: '120px', excelWidth: 18 },
  { key: 'direccion',                label: 'Dirección Residencia',      minW: '180px', excelWidth: 28 },
  { key: 'eapb',                     label: 'EPS',                       minW: '150px', excelWidth: 22 },
  { key: 'codigo_caso',              label: 'Código Caso',               minW: '130px', excelWidth: 16 },
  { key: 'institucion_remite',       label: 'Institución que Remite',    minW: '170px', excelWidth: 26 },
  { key: 'fecha_diagnostico',        label: 'Fecha Diagnóstico',         minW: '130px', excelWidth: 16 },
  { key: 'metodo_diagnostico',       label: 'Método Diagnóstico',        minW: '90px',  excelWidth: 11 },
  { key: 'localizacion_primaria',    label: 'Localización Primaria',     minW: '180px', excelWidth: 28 },
  { key: 'lateralidad',              label: 'Lateralidad',               minW: '90px',  excelWidth: 11 },
  { key: 'diagnostico_morfologico',  label: 'Diagnóstico Morfológico',   minW: '200px', excelWidth: 32 },
  { key: 'cod_topografia_cieo',      label: 'Cód. Topografía CIEO',      minW: '140px', excelWidth: 20 },
  { key: 'cod_morfologia_cieo',      label: 'Cód. Morfología CIEO',      minW: '140px', excelWidth: 20 },
  { key: 'comportamiento_cieo',      label: 'Comportamiento CIEO',       minW: '90px',  excelWidth: 11 },
  { key: 'grado_diferenciacion',     label: 'Grado Diferenciación',      minW: '90px',  excelWidth: 11 },
  { key: 'observaciones',            label: 'Observaciones',             minW: '200px', excelWidth: 32 },
  { key: 'estado_vital',             label: 'Estado Vital',              minW: '90px',  excelWidth: 11 },
  { key: 'fecha_defuncion',          label: 'Fecha Defunción',           minW: '120px', excelWidth: 16 },
  { key: 'num_certificado_defuncion',label: 'N° Cert. Defunción',        minW: '130px', excelWidth: 18 },
  { key: 'causa_basica_defuncion',   label: 'Causa Básica Defunción',    minW: '180px', excelWidth: 28 },
  { key: 'responsable_digitacion',   label: 'Responsable Digitación',    minW: '160px', excelWidth: 24 },
  { key: 'fecha_digitacion',         label: 'Fecha Digitación',          minW: '120px', excelWidth: 16 },
  { key: 'primario_multiple',        label: 'Primario Múltiple',         minW: '100px', excelWidth: 14 },
];

// Grupos de columnas para el Excel
const GROUPS = [
  { label: 'Institución',       from: 1,  to: 2  },
  { label: 'Datos del Paciente',from: 3,  to: 16 },
  { label: 'Datos del Caso',    from: 17, to: 35 },
];

// Paleta de colores (ARGB sin #)
const C = {
  groupInst:   'FF365314', // lime-900
  groupPac:    'FF3F6212', // lime-800
  groupCaso:   'FF4D7C0F', // lime-700
  header:      'FF65A30D', // lime-600
  headerFont:  'FFFFFFFF', // blanco
  rowAlt:      'FFF7FEE7', // lime-50
  rowWhite:    'FFFFFFFF',
  border:      'FFD9F99D', // lime-200
  fontDark:    'FF1A2E05', // lime-950
};

// ── Excel Export ──────────────────────────────────────────────────────────────

async function exportExcel(records: RpcaRecord[], setExporting: (v: boolean) => void) {
  setExporting(true);
  try {
    const { Workbook } = await import('exceljs');
    const wb = new Workbook();
    wb.creator = 'PathSys';
    wb.created = new Date();

    const ws = wb.addWorksheet('Reporte de Cáncer', {
      views: [{ state: 'frozen', ySplit: 2 }],
      pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    });

    // ── Anchos de columna ────────────────────────────────────────────────────
    ws.columns = COLUMNS.map(c => ({ width: c.excelWidth }));

    // ── Fila 1: grupos ───────────────────────────────────────────────────────
    const groupColors = [C.groupInst, C.groupPac, C.groupCaso];
    ws.addRow([]); // placeholder — se estiliza después de mergeCells

    GROUPS.forEach((g, gi) => {
      ws.mergeCells(1, g.from, 1, g.to);
      const cell = ws.getCell(1, g.from);
      cell.value = g.label;
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: groupColors[gi] } };
      cell.font  = { bold: true, color: { argb: C.headerFont }, size: 11, name: 'Calibri' };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    ws.getRow(1).height = 22;

    // ── Fila 2: encabezados de columna ───────────────────────────────────────
    const headerRow = ws.addRow(COLUMNS.map(c => c.label));
    headerRow.height = 40;
    headerRow.eachCell(cell => {
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.header } };
      cell.font      = { bold: true, color: { argb: C.headerFont }, size: 10, name: 'Calibri' };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border    = {
        bottom: { style: 'medium', color: { argb: C.groupPac } },
        right:  { style: 'thin',   color: { argb: C.border } },
      };
    });

    // ── Filas de datos ────────────────────────────────────────────────────────
    records.forEach((record, idx) => {
      const values = COLUMNS.map(c => record[c.key] ?? '');
      const row = ws.addRow(values);
      row.height = 18;

      const bgArgb = idx % 2 === 1 ? C.rowAlt : C.rowWhite;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
        cell.font = { size: 10, name: 'Calibri', color: { argb: C.fontDark } };
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
        cell.border = {
          bottom: { style: 'hair', color: { argb: C.border } },
          right:  { style: 'hair', color: { argb: C.border } },
        };
        // Centrar columnas cortas (tipo_id, genero, método, lateralidad, etc.)
        const col = COLUMNS[colNumber - 1];
        if (col && col.excelWidth <= 14) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      });
    });

    // ── Autofiltro en fila 2 ──────────────────────────────────────────────────
    ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: COLUMNS.length } };

    // ── Bordes de separación entre grupos ─────────────────────────────────────
    [2, 16].forEach(sepCol => {
      for (let r = 1; r <= records.length + 2; r++) {
        const cell = ws.getCell(r, sepCol);
        cell.border = {
          ...cell.border,
          right: { style: 'medium', color: { argb: C.groupPac } },
        };
      }
    });

    // ── Generar y descargar ────────────────────────────────────────────────────
    const buffer = await wb.xlsx.writeBuffer();
    const blob   = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `RPCA_cancer_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  } finally {
    setExporting(false);
  }
}

// ── Componente ────────────────────────────────────────────────────────────────

export function CancerReport() {
  const { records, loading, error, filters, setFilters, refetch } = useCancerReport();
  const [exporting, setExporting] = useState(false);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(f => ({ ...f, search: e.target.value || undefined }));
  }, [setFilters]);

  const handleFrom = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(f => ({ ...f, from: e.target.value || undefined }));
  }, [setFilters]);

  const handleTo = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(f => ({ ...f, to: e.target.value || undefined }));
  }, [setFilters]);

  const clearFilters = useCallback(() => setFilters({}), [setFilters]);

  const hasFilters = !!(filters.from || filters.to || filters.search);

  return (
    <div className="space-y-5">
      {/* Card de encabezado + filtros */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {/* Body del card */}
        <div className="p-5 space-y-4">
          {/* Título */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-lime-50 border border-lime-200">
              <Microscope className="w-5 h-5 text-lime-700" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Reporte de cáncer</h1>
              <p className="text-sm text-gray-500">
                Registro Poblacional de Cáncer — casos con código CIE-O
              </p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Desde</label>
              <input
                type="date"
                value={filters.from ?? ''}
                onChange={handleFrom}
                className="h-8 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-700"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Hasta</label>
              <input
                type="date"
                value={filters.to ?? ''}
                onChange={handleTo}
                className="h-8 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-700"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-gray-600">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Código, paciente, ID, CIEO…"
                  value={filters.search ?? ''}
                  onChange={handleSearch}
                  className="h-8 w-full rounded-lg border border-gray-300 bg-white pl-8 pr-3 text-sm text-gray-700 placeholder:text-gray-400"
                />
              </div>
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex items-center gap-1 h-8 px-2.5 text-xs text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <X className="w-3.5 h-3.5" />
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Footer del card */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-sm text-gray-500">
            <Microscope className="w-4 h-4 text-lime-600" />
            {loading
              ? 'Cargando casos con código CIE-O…'
              : `${records.length} caso${records.length !== 1 ? 's' : ''} con código CIE-O`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refetch}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button
              type="button"
              onClick={() => exportExcel(records, setExporting)}
              disabled={loading || exporting || records.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-lime-600 rounded-lg hover:bg-lime-700 disabled:opacity-50"
            >
              {exporting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <FileSpreadsheet className="w-4 h-4" />}
              {exporting ? 'Generando…' : 'Exportar Excel'}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Tabla */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Cargando…</span>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Microscope className="w-10 h-10 text-gray-300" />
            <p className="text-gray-400 text-sm">
              {hasFilters
                ? 'No se encontraron casos con los filtros aplicados'
                : 'No hay casos con código CIE-O registrados'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="text-xs border-collapse" style={{ minWidth: '4200px' }}>
              <thead>
                {/* Grupos de columnas */}
                <tr className="border-b border-gray-300">
                  <th colSpan={2}  className="px-3 py-1.5 text-center text-[10px] font-semibold text-white bg-lime-900 uppercase tracking-wide border-r-2 border-lime-700">Institución</th>
                  <th colSpan={14} className="px-3 py-1.5 text-center text-[10px] font-semibold text-white bg-lime-800 uppercase tracking-wide border-r-2 border-lime-700">Datos del Paciente</th>
                  <th colSpan={19} className="px-3 py-1.5 text-center text-[10px] font-semibold text-white bg-lime-700 uppercase tracking-wide">Datos del Caso</th>
                </tr>
                {/* Encabezados de columna */}
                <tr className="border-b-2 border-lime-700">
                  {COLUMNS.map((col, i) => (
                    <th
                      key={col.key}
                      className={`px-2 py-2 text-center text-[10px] font-semibold text-white bg-lime-600 whitespace-nowrap ${
                        i === 1 || i === 15 ? 'border-r-2 border-lime-700' : 'border-r border-lime-500'
                      }`}
                      style={{ minWidth: col.minW }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-lime-100">
                {records.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`hover:bg-lime-100/60 transition-colors ${idx % 2 === 1 ? 'bg-lime-50/60' : 'bg-white'}`}
                  >
                    {COLUMNS.map((col, i) => {
                      const val = row[col.key];
                      const isEmpty = !val;
                      return (
                        <td
                          key={col.key}
                          className={`px-2 py-1.5 whitespace-nowrap text-[11px] ${
                            i === 1 || i === 15 ? 'border-r-2 border-lime-200' : 'border-r border-lime-100'
                          } ${col.excelWidth <= 14 ? 'text-center' : 'text-left'} ${isEmpty ? 'text-gray-300' : 'text-gray-800'}`}
                          style={{ minWidth: col.minW }}
                          title={isEmpty ? 'Sin dato' : String(val)}
                        >
                          {isEmpty ? '—' : String(val)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Nota de referencia RPCA */}
      {records.length > 0 && (
        <p className="text-xs text-gray-400">
          Por favor revisar la información manualmente antes de entregarla
        </p>
      )}
    </div>
  );
}
