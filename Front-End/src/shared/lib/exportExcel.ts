import ExcelJS from 'exceljs';

function triggerDownload(buffer: ArrayBuffer, fileName: string): void {
  const blob = new Blob([
    buffer
  ], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function exportJsonToExcel(
  rows: Array<Record<string, unknown>>,
  options: { sheetName: string; fileName: string }
): Promise<void> {
  if (!rows.length) return;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(options.sheetName);

  const headers = Object.keys(rows[0]);
  worksheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: Math.max(14, header.length + 2),
  }));

  for (const row of rows) {
    worksheet.addRow(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  triggerDownload(buffer as ArrayBuffer, options.fileName);
}
