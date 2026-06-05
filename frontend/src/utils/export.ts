/**
 * Export data to CSV format
 */
export const exportToCSV = <T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; header: string }[]
): void => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Use provided columns or derive from first row
  const exportColumns = columns || (Object.keys(data[0]) as (keyof T)[]).map(key => ({
    key,
    header: String(key).replace(/([A-Z])/g, ' $1').trim()
  }));

  // Build CSV header
  const headers = exportColumns.map(c => c.header);
  
  // Build CSV rows
  const rows = data.map(item => 
    exportColumns.map(col => {
      const value = item[col.key];
      // Escape quotes and wrap in quotes if contains comma
      const strValue = value === null || value === undefined 
        ? '' 
        : String(value).replace(/"/g, '""');
      return strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')
        ? `"${strValue}"`
        : strValue;
    }).join(',')
  );

  // Combine and download
  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export data to Excel-compatible .xls format
 */
export const exportToExcel = <T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; header: string }[]
): void => {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  const exportColumns = columns || (Object.keys(data[0]) as (keyof T)[]).map((key) => ({
    key,
    header: String(key).replace(/([A-Z])/g, ' $1').trim(),
  }));

  const escapeHtml = (value: unknown) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const headerRow = exportColumns.map((column) => `<th>${escapeHtml(column.header)}</th>`).join('');
  const bodyRows = data.map((item) => {
    const cells = exportColumns.map((column) => `<td>${escapeHtml(item[column.key])}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const workbookHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="UTF-8" />
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${escapeHtml(filename)}</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      </head>
      <body>
        <table>
          <thead><tr>${headerRow}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', workbookHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.xls`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Format number as Vietnamese currency
 */
export const formatCurrency = (value: number): string => {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toLocaleString('vi-VN');
};

/**
 * Format percentage
 */
export const formatPercent = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
};
