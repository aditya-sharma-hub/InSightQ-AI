/**
 * Format-Aware Tabular Profiler
 * Computes deep mathematical, statistical, hygiene, and schema profiling
 * for tabular datasets.
 */

function isNumericValue(val) {
  if (val === null || val === undefined || val === '') return false;
  if (typeof val === 'number') return !isNaN(val) && isFinite(val);
  const s = String(val).trim()
    .replace(/^[\$€£¥₹\s]+/, '')
    .replace(/,/g, '')
    .replace(/%$/, '');
  if (s === '') return false;
  const num = Number(s);
  return !isNaN(num) && isFinite(num);
}

function parseCleanNumber(val) {
  if (typeof val === 'number') return val;
  const s = String(val).trim()
    .replace(/^[\$€£¥₹\s]+/, '')
    .replace(/,/g, '')
    .replace(/%$/, '');
  return Number(s);
}

function isDateValue(val) {
  if (val === null || val === undefined || val === '') return false;
  if (val instanceof Date) return !isNaN(val.getTime());
  const s = String(val).trim();
  if (/^\d{1,4}$/.test(s)) return false; // Ignore short integers like 2024 or 12
  if (!/\d/.test(s)) return false;
  const parsed = Date.parse(s);
  if (isNaN(parsed)) return false;
  // Plausible year range 1900 - 2100
  const year = new Date(parsed).getFullYear();
  return year >= 1900 && year <= 2100;
}

function isBooleanValue(val) {
  if (typeof val === 'boolean') return true;
  const s = String(val).trim().toLowerCase();
  return ['true', 'false', 'yes', 'no', 't', 'f', '1', '0'].includes(s);
}

function detectUnitSymbols(val) {
  const s = String(val).trim();
  const symbols = [];
  if (/\$/.test(s)) symbols.push('$');
  if (/€/.test(s)) symbols.push('€');
  if (/£/.test(s)) symbols.push('£');
  if (/¥/.test(s)) symbols.push('¥');
  if (/%/.test(s)) symbols.push('%');
  if (/kg\b/i.test(s)) symbols.push('kg');
  if (/lbs?\b/i.test(s)) symbols.push('lbs');
  if (/km\b/i.test(s)) symbols.push('km');
  if (/miles?\b/i.test(s)) symbols.push('miles');
  return symbols;
}

/**
 * Profile Tabular Data
 */
function profileTabular(headers, rows) {
  const rowCount = Array.isArray(rows) ? rows.length : 0;
  const colCount = Array.isArray(headers) ? headers.length : 0;

  if (rowCount === 0 || colCount === 0) {
    return {
      rowCount: 0,
      columnCount: 0,
      columns: [],
      duplicateRows: { count: 0, percentage: 0, indices: [] },
      candidateBusinessKeys: [],
      qualityScore: 100,
      summary: { missingTotal: 0, numericCount: 0, categoricalCount: 0, temporalCount: 0 }
    };
  }

  // 1. Duplicate Row Detection
  const rowHashes = new Map();
  const duplicateIndices = [];
  rows.forEach((r, idx) => {
    // Generate deterministic hash string
    const serialized = headers.map(h => String(r[h] !== undefined ? r[h] : '')).join('||');
    if (rowHashes.has(serialized)) {
      duplicateIndices.push(idx);
    } else {
      rowHashes.set(serialized, idx);
    }
  });

  const duplicateRowCount = duplicateIndices.length;
  const duplicateRowPct = Number(((duplicateRowCount / rowCount) * 100).toFixed(2));

  let totalMissingCells = 0;
  let numericColCount = 0;
  let categoricalColCount = 0;
  let temporalColCount = 0;

  // 2. Column Profiling
  const columns = [];
  const candidateKeys = [];

  for (let cIdx = 0; cIdx < headers.length; cIdx++) {
    const colName = headers[cIdx];
    const rawValues = rows.map(r => r[colName]);

    let missingCount = 0;
    let numericMatches = 0;
    let dateMatches = 0;
    let boolMatches = 0;
    let stringMatches = 0;

    const unitSymbolsSet = new Set();
    const valueFrequencies = new Map();
    const numericList = [];
    const invalidDateStrings = [];

    rawValues.forEach(val => {
      if (val === null || val === undefined || val === '' || String(val).trim() === '' || String(val).toLowerCase() === 'null' || String(val).toLowerCase() === 'n/a') {
        missingCount++;
        return;
      }

      const strVal = String(val).trim();
      valueFrequencies.set(strVal, (valueFrequencies.get(strVal) || 0) + 1);

      // Unit symbols check
      detectUnitSymbols(strVal).forEach(u => unitSymbolsSet.add(u));

      // Type checks
      const isNum = isNumericValue(val);
      const isDt = isDateValue(val);
      const isBool = isBooleanValue(val);

      if (isNum) {
        numericMatches++;
        numericList.push(parseCleanNumber(val));
      } else if (isDt) {
        dateMatches++;
      } else if (isBool) {
        boolMatches++;
      } else {
        stringMatches++;
        // Check if looks like a date attempt that failed
        if (/[\/\-:]/.test(strVal) && /\d/.test(strVal)) {
          invalidDateStrings.push(strVal);
        }
      }
    });

    totalMissingCells += missingCount;
    const nonNullCount = rowCount - missingCount;
    const missingPct = Number(((missingCount / Math.max(1, rowCount)) * 100).toFixed(2));
    const uniqueCount = valueFrequencies.size;
    const cardinalityRatio = nonNullCount > 0 ? Number((uniqueCount / nonNullCount).toFixed(4)) : 0;

    // Role classification pre-checks
    const nameNorm = colName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const isIdName = nameNorm === 'id' || nameNorm.endsWith('id') || nameNorm.startsWith('id') || nameNorm === 'uuid' || nameNorm.includes('key');
    const isIdentifier = isIdName && (cardinalityRatio > 0.8 || (cardinalityRatio === 1.0 && missingCount === 0));

    // Type Inference & Confidence
    let inferredType = 'string';
    let typeConfidence = 1.0;
    let typeRationale = 'Default string/text type';
    const mixedTypes = [];

    if (nonNullCount === 0) {
      inferredType = 'string';
      typeConfidence = 0.5;
      typeRationale = 'All values are missing or null';
    } else if (isIdentifier) {
      inferredType = 'identifier';
      typeConfidence = 0.98;
      typeRationale = 'Unique identifier or candidate primary key column';
    } else {
      const numRatio = numericMatches / nonNullCount;
      const dateRatio = dateMatches / nonNullCount;
      const boolRatio = boolMatches / nonNullCount;

      if (numRatio >= 0.8) {
        const isAllInt = numericList.length > 0 && numericList.every(v => Number.isInteger(v));
        inferredType = isAllInt ? 'integer' : 'float';
        typeConfidence = Number(numRatio.toFixed(2));
        typeRationale = `${(numRatio * 100).toFixed(0)}% of non-null values are numeric (${inferredType})`;
        if (numRatio < 1.0) {
          mixedTypes.push({ type: 'string', count: nonNullCount - numericMatches });
        }
      } else if (dateRatio >= 0.7) {
        inferredType = 'date';
        typeConfidence = Number(dateRatio.toFixed(2));
        typeRationale = `${(dateRatio * 100).toFixed(0)}% of non-null values parse as valid timestamps`;
        if (dateRatio < 1.0) {
          mixedTypes.push({ type: 'string', count: nonNullCount - dateMatches });
          rows.forEach(r => {
            const v = r[colName];
            if (v !== null && v !== undefined && String(v).trim() !== '' && !isDateValue(v)) {
              const sv = String(v).trim();
              if (!invalidDateStrings.includes(sv)) {
                invalidDateStrings.push(sv);
              }
            }
          });
        }
      } else if (boolRatio >= 0.9) {
        inferredType = 'boolean';
        typeConfidence = Number(boolRatio.toFixed(2));
        typeRationale = `${(boolRatio * 100).toFixed(0)}% of non-null values are boolean representations`;
      } else {
        inferredType = 'string';
        typeConfidence = 0.95;
        typeRationale = 'Predominantly text or categorical strings';
      }
    }

    if (inferredType === 'number' || inferredType === 'integer' || inferredType === 'float') numericColCount++;
    else if (inferredType === 'date') temporalColCount++;
    else if (inferredType === 'identifier') { /* identifier column */ }
    else categoricalColCount++;

    // Inconsistent Units
    const hasInconsistentUnits = unitSymbolsSet.size > 1;

    // Outlier Detection for Numeric Columns
    let outlierStats = null;
    if ((inferredType === 'number' || inferredType === 'integer' || inferredType === 'float') && numericList.length >= 4) {
      numericList.sort((a, b) => a - b);
      const n = numericList.length;
      const q1 = numericList[Math.floor(n * 0.25)];
      const median = numericList[Math.floor(n * 0.5)];
      const q3 = numericList[Math.floor(n * 0.75)];
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      const sum = numericList.reduce((acc, v) => acc + v, 0);
      const mean = sum / n;
      const variance = numericList.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / n;
      const std = Math.sqrt(variance);

      const iqrOutliers = numericList.filter(v => v < lowerBound || v > upperBound);
      const zOutliers = std > 0 ? numericList.filter(v => Math.abs((v - mean) / std) > 3) : [];

      outlierStats = {
        mean: Number(mean.toFixed(2)),
        median,
        std: Number(std.toFixed(2)),
        q1,
        q3,
        iqr: Number(iqr.toFixed(2)),
        bounds: { lower: Number(lowerBound.toFixed(2)), upper: Number(upperBound.toFixed(2)) },
        iqrOutlierCount: iqrOutliers.length,
        iqrOutliersCount: iqrOutliers.length,
        iqrOutlierPercentage: Number(((iqrOutliers.length / n) * 100).toFixed(2)),
        zOutlierCount: zOutliers.length,
        candidateSamples: iqrOutliers.slice(0, 5)
      };
    }

    // Role classification
    const isTemporal = inferredType === 'date';
    const isNumeric = inferredType === 'number' || inferredType === 'integer' || inferredType === 'float';
    const isCategorical = inferredType === 'string' && (uniqueCount <= 50 || cardinalityRatio < 0.2);
    const isCandidateTarget = !isIdentifier && (cIdx === headers.length - 1 || nameNorm.includes('target') || nameNorm.includes('label') || nameNorm.includes('churn') || nameNorm.includes('status'));

    if ((uniqueCount === rowCount && missingCount === 0) || isIdentifier) {
      if (!candidateKeys.includes(colName)) {
        candidateKeys.push(colName);
      }
    }

    // Top categories
    const sortedCategories = Array.from(valueFrequencies.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([val, count]) => ({
        value: val,
        count,
        percentage: Number(((count / nonNullCount) * 100).toFixed(2))
      }));

    columns.push({
      columnIndex: cIdx,
      columnName: colName,
      inferredType,
      typeConfidence,
      typeRationale,
      missingCount,
      missingPercentage: missingPct,
      uniqueCount,
      cardinalityRatio,
      sampleValues: Array.from(valueFrequencies.keys()).slice(0, 5),
      topCategories: isCategorical ? sortedCategories : [],
      mixedTypes: mixedTypes.length > 0 ? mixedTypes : null,
      unitSymbols: Array.from(unitSymbolsSet),
      hasInconsistentUnits,
      invalidDateCount: invalidDateStrings.length,
      invalidDateSamples: invalidDateStrings.slice(0, 5),
      outliers: outlierStats,
      roles: {
        isIdentifier,
        isTemporal,
        isNumeric,
        isCategorical,
        isCandidateTarget
      }
    });
  }

  // Quality score formula
  const totalCells = Math.max(1, rowCount * colCount);
  const missingPenalty = (totalMissingCells / totalCells) * 40;
  const duplicatePenalty = (duplicateRowCount / Math.max(1, rowCount)) * 30;
  const outlierColsWithHighOutliers = columns.filter(c => c.outliers && c.outliers.iqrOutlierPercentage > 15).length;
  const outlierPenalty = Math.min(20, outlierColsWithHighOutliers * 5);
  const mixedTypePenalty = columns.filter(c => c.mixedTypes && c.mixedTypes.length > 0).length * 3;

  const qualityScore = Math.max(0, Math.min(100, Number((100 - missingPenalty - duplicatePenalty - outlierPenalty - mixedTypePenalty).toFixed(2))));

  const columnsByName = {};
  columns.forEach(c => {
    c.confidence = c.typeConfidence;
    columnsByName[c.columnName] = c;
    columns[c.columnName] = c;
  });

  return {
    rowCount,
    columnCount: colCount,
    columns,
    columnsByName,
    duplicateRows: {
      count: duplicateRowCount,
      percentage: duplicateRowPct,
      sampleIndices: duplicateIndices.slice(0, 10)
    },
    candidateBusinessKeys: candidateKeys,
    candidateIdentifiers: candidateKeys,
    qualityScore,
    summary: {
      totalCells,
      missingCells: totalMissingCells,
      missingPercentage: Number(((totalMissingCells / totalCells) * 100).toFixed(2)),
      missingCellPercentage: Number(((totalMissingCells / totalCells) * 100).toFixed(2)),
      numericColumnCount: numericColCount,
      categoricalColumnCount: categoricalColCount,
      temporalColumnCount: temporalColCount
    }
  };
}

module.exports = {
  profileTabular,
  isNumericValue,
  isDateValue,
  isBooleanValue
};
