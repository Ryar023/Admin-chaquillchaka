export interface ExportRow {
  cliente: string;
  telefono: string;
  correo: string;
  habitacion: string;
  llegada: string;
  salida: string;
  noches: string;
  comprobante: string;
  ruc: string;
  razonSocial: string;
  medioPago: string;
  moneda: string;
  total: string;
  estado: string;
}

const COLUMNS: { key: keyof ExportRow; header: string; width: number }[] = [
  { key: 'cliente', header: 'Cliente', width: 26 },
  { key: 'telefono', header: 'Teléfono', width: 14 },
  { key: 'correo', header: 'Correo', width: 28 },
  { key: 'habitacion', header: 'Habitación', width: 22 },
  { key: 'llegada', header: 'Llegada', width: 12 },
  { key: 'salida', header: 'Salida', width: 12 },
  { key: 'noches', header: 'Noches', width: 8 },
  { key: 'comprobante', header: 'Comprobante', width: 13 },
  { key: 'ruc', header: 'RUC', width: 14 },
  { key: 'razonSocial', header: 'Razón social', width: 26 },
  { key: 'medioPago', header: 'Medio de pago', width: 14 },
  { key: 'moneda', header: 'Moneda', width: 9 },
  { key: 'total', header: 'Total', width: 12 },
  { key: 'estado', header: 'Estado', width: 24 }
];

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

// Evita que Excel interprete texto del cliente como fórmula.
const safeCell = (value: string): string => (/^[=+\-@]/.test(value) ? `'${value}` : value);

export async function exportToExcel(rows: ExportRow[], filename: string): Promise<void> {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet('Reservas');
  sheet.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  rows.forEach((row) => {
    const clean = Object.fromEntries(Object.entries(row).map(([k, v]) => [k, safeCell(String(v))]));
    sheet.addRow(clean);
  });
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF183B32' } };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportToPdf(rows: ExportRow[], title: string, subtitle: string): boolean {
  const win = window.open('', '_blank');
  if (!win) return false;
  const head = COLUMNS.map((c) => `<th>${escapeHtml(c.header)}</th>`).join('');
  const body = rows.map((r) => `<tr>${COLUMNS.map((c) => `<td>${escapeHtml(String(r[c.key]))}</td>`).join('')}</tr>`).join('');
  win.document.open();
  win.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>@page{size:A4 landscape;margin:10mm}body{font:11px Arial,sans-serif;color:#17221f;margin:16px}h1{margin:0;color:#183b32;font-size:20px}p{margin:4px 0 12px;color:#46544d}
    table{width:100%;border-collapse:collapse}th{background:#183b32;color:#fff;text-align:left;padding:6px}td{border-bottom:1px solid #d8ded7;padding:5px;vertical-align:top}
    button{margin-bottom:12px;padding:10px 16px;border:0;border-radius:6px;background:#183b32;color:#fff;font-weight:bold}@media print{button{display:none}}</style></head>
    <body><button type="button" onclick="window.print()">Imprimir / Guardar como PDF</button>
    <h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p>
    <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`);
  win.document.close();
  win.focus();
  return true;
}
