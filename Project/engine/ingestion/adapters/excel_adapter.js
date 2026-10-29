const XLSX = require('xlsx');

/**
 * Format-Aware Excel (XLS & XLSX) Adapter
 * Supports multi-worksheet extraction, sheet selection, formatted cell extraction,
 * and formula fallbacks.
 */

function parseExcel(buffer, options = {}) {
  const warnings = [];
  if (!buffer || buffer.length === 0) {
    throw new Error('Empty Excel file buffer.');
  }

  let workbook;
  try {
    workbook = XLSX.read(buffer, {
      type: 'buffer',
      cellDates: true,
      cellNF: true,
      cellText: true
    });
  } catch (err) {
    throw new Error(`Failed to parse Excel workbook: ${err.message}`);
  }

  const sheetNames = workbook.SheetNames || [];
  if (sheetNames.length === 0) {
    throw new Error('Excel workbook contains no worksheets.');
  }

  // Profile all sheets
  const sheetsCatalog = [];
  sheetNames.forEach(name => {
    const ws = workbook.Sheets[name];
    const range = ws && ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']) : null;
    const rowCount = range ? (range.e.r - range.s.r + 1) : 0;
    const colCount = range ? (range.e.c - range.s.c + 1) : 0;
    sheetsCatalog.push({
      name,
      rowCount: Math.max(0, rowCount - 1), // excluding header
      columnCount: colCount
    });
  });

  // Select target sheet
  let selectedSheetName = options.sheetName;
  if (!selectedSheetName && typeof options.sheetIndex === 'number' && sheetNames[options.sheetIndex]) {
    selectedSheetName = sheetNames[options.sheetIndex];
  }
  if (!selectedSheetName || !workbook.Sheets[selectedSheetName]) {
    // Select first sheet with data
    const firstWithData = sheetsCatalog.find(s => s.rowCount > 0);
    selectedSheetName = firstWithData ? firstWithData.name : sheetNames[0];
  }

  const worksheet = workbook.Sheets[selectedSheetName];
  if (!worksheet) {
    throw new Error(`Worksheet '${selectedSheetName}' not found in workbook.`);
  }

  // Extract raw rows
  const rawRows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1, // array of arrays
    defval: '',
    raw: false, // get formatted text representations
    blankrows: false
  });

  if (rawRows.length === 0) {
    return {
      sheetName: selectedSheetName,
      availableSheets: sheetsCatalog,
      headers: [],
      rows: [],
      warnings: [`Worksheet '${selectedSheetName}' is empty.`]
    };
  }

  // Header row
  const rawHeaders = (rawRows[0] || []).map(h => (h !== undefined && h !== null ? String(h).trim() : ''));
  const headers = [];
  const seenHeaders = {};

  rawHeaders.forEach((h, idx) => {
    let colName = h || `column_${idx + 1}`;
    if (seenHeaders[colName] !== undefined) {
      seenHeaders[colName]++;
      colName = `${colName}_${seenHeaders[colName]}`;
      warnings.push(`Duplicate Excel column renamed to '${colName}'.`);
    } else {
      seenHeaders[colName] = 0;
    }
    headers.push(colName);
  });

  const rows = [];
  for (let r = 1; r < rawRows.length; r++) {
    const rawRow = rawRows[r];
    if (!rawRow || rawRow.every(cell => cell === '' || cell === null || cell === undefined)) {
      continue; // Skip entirely blank row
    }
    const rowObj = {};
    headers.forEach((colName, cIdx) => {
      let val = rawRow[cIdx];
      if (val instanceof Date) {
        val = val.toISOString().split('T')[0];
      }
      rowObj[colName] = val !== undefined && val !== null ? val : '';
    });
    rows.push(rowObj);
  }

  if (sheetNames.length > 1) {
    warnings.push(`Workbook contains ${sheetNames.length} worksheets. Currently viewing sheet '${selectedSheetName}'.`);
  }

  return {
    sheetName: selectedSheetName,
    availableSheets: sheetsCatalog,
    headers,
    rows,
    rawRowCount: rows.length,
    warnings
  };
}

module.exports = {
  parseExcel
};
