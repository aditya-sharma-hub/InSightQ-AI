/**
 * Safe, Explainable Data Cleaning Engine
 * Generates proposed cleaning plans, previews before/after impacts, executes
 * non-destructive transformations, quarantines invalid records, and logs audit trails.
 */

const { isNumericValue, isDateValue } = require('../profiling/tabular_profiler');

/**
 * Calculate Levenshtein Distance for Category Normalization
 */
function levenshteinDistance(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const matrix = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) matrix[i][0] = i;
  for (let j = 0; j <= n; j++) matrix[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return matrix[m][n];
}

/**
 * 1. Generate Proposed Cleaning Plan
 */
function generateCleaningPlan(param1, param2, param3) {
  let tabularProfile, headers, rows;
  if (Array.isArray(param1)) {
    headers = param1;
    rows = param2;
    const { profileTabular } = require('../profiling/tabular_profiler');
    tabularProfile = profileTabular(headers, rows);
  } else {
    tabularProfile = param1;
    headers = param2;
    rows = param3;
    if (!tabularProfile && headers && rows) {
      const { profileTabular } = require('../profiling/tabular_profiler');
      tabularProfile = profileTabular(headers, rows);
    }
  }
  const plan = [];
  const rowCount = Array.isArray(rows) ? rows.length : 0;

  // A. Column Name Normalization Check
  const messyHeaders = headers.filter(h => /[^a-zA-Z0-9_]/.test(h) || /^[0-9]/.test(h) || h !== h.trim());
  if (messyHeaders.length > 0) {
    plan.push({
      id: 'op_normalize_column_names',
      name: 'Normalize Column Names',
      type: 'column_name_normalization',
      category: 'safe',
      affectedColumns: messyHeaders,
      detectedIssue: `${messyHeaders.length} column names contain special characters, leading digits, or untrimmed spaces.`,
      recommendedAction: 'Clean to snake_case alphanumeric names',
      configurableOptions: {
        namingStyle: ['snake_case', 'camelCase', 'clean_preserve_case']
      },
      selectedAction: 'snake_case',
      estimatedAffectedItems: messyHeaders.length
    });
  }

  // B. Whitespace Normalization Check
  let hasUntrimmedCells = false;
  let untrimmedCountEstimate = 0;
  const sampleRows = (rows || []).slice(0, 50);
  for (const r of sampleRows) {
    for (const h of headers) {
      const val = r[h];
      if (typeof val === 'string' && val.length > 0 && (val !== val.trim() || /[\u00A0\u200B]/.test(val))) {
        hasUntrimmedCells = true;
        untrimmedCountEstimate++;
      }
    }
  }
  if (hasUntrimmedCells) {
    plan.push({
      id: 'op_trim_whitespace',
      name: 'Trim Whitespace & Normalize Unicode',
      type: 'trim_whitespace',
      category: 'safe',
      affectedColumns: headers,
      detectedIssue: 'Discovered invisible whitespace characters, NBSP, or untrimmed padding in cell values.',
      recommendedAction: 'Trim leading/trailing whitespace and normalize unicode (NFC)',
      configurableOptions: {
        stripControlChars: true,
        normalizeUnicode: true
      },
      selectedAction: 'trim_and_normalize',
      estimatedAffectedItems: untrimmedCountEstimate * 20
    });
  }

  // C. Duplicate Rows Check
  const dupeCount = tabularProfile?.duplicateRows?.count || 0;
  if (dupeCount > 0) {
    plan.push({
      id: 'op_handle_duplicates',
      name: 'Handle Exact Duplicate Rows',
      type: 'deduplicate',
      category: 'caution',
      affectedColumns: headers,
      detectedIssue: `Found ${dupeCount} exact duplicate row(s) (${tabularProfile.duplicateRows.percentage}% of dataset).`,
      recommendedAction: 'Deduplicate preserving first occurrence',
      configurableOptions: {
        strategy: ['keep_first', 'keep_last', 'quarantine_duplicates', 'preserve_all']
      },
      selectedAction: 'keep_first',
      estimatedAffectedItems: dupeCount
    });
  }

  // D. Column-Specific Checks (Missing values, Date parsing, Outliers, Categories)
  (tabularProfile?.columns || []).forEach(col => {
    // Missing Values
    if (col.missingCount > 0 && col.missingPercentage < 80) {
      const isNum = col.inferredType === 'number' || col.inferredType === 'integer' || col.inferredType === 'float' || col.roles?.isNumeric;
      const isCat = (col.inferredType === 'string' || col.inferredType === 'category') && col.roles?.isCategorical;
      plan.push({
        id: `op_missing_${col.columnName}`,
        name: `Handle Missing Values in '${col.columnName}'`,
        type: 'missing_value_handling',
        category: 'caution',
        affectedColumns: [col.columnName],
        detectedIssue: `${col.missingCount} missing value(s) (${col.missingPercentage}% null rate).`,
        recommendedAction: isNum ? 'Impute with median value' : isCat ? 'Impute with mode (most frequent)' : 'Flag as missing / preserve',
        configurableOptions: {
          strategy: isNum
            ? ['impute_median', 'impute_mean', 'impute_constant', 'quarantine_row', 'preserve']
            : ['impute_mode', 'impute_constant', 'quarantine_row', 'preserve'],
          constantValue: isNum ? 0 : 'Unknown'
        },
        selectedAction: isNum ? 'impute_median' : isCat ? 'impute_mode' : 'preserve',
        estimatedAffectedItems: col.missingCount
      });
    }

    // Invalid Dates
    if (col.invalidDateCount > 0) {
      plan.push({
        id: `op_dates_${col.columnName}`,
        name: `Parse & Standardize Dates in '${col.columnName}'`,
        type: 'date_parsing',
        category: 'safe',
        affectedColumns: [col.columnName],
        detectedIssue: `${col.invalidDateCount} date value(s) in unstandardized or ambiguous format.`,
        recommendedAction: 'Normalize to ISO-8601 (YYYY-MM-DD)',
        configurableOptions: {
          outputFormat: ['ISO-8601', 'YYYY-MM-DD HH:mm:ss'],
          invalidAction: ['set_null', 'preserve', 'quarantine_row']
        },
        selectedAction: 'ISO-8601',
        estimatedAffectedItems: col.invalidDateCount
      });
    }

    // Outlier Candidates
    if (col.outliers && col.outliers.iqrOutlierCount > 0) {
      plan.push({
        id: `op_outliers_${col.columnName}`,
        name: `Handle Statistical Outliers in '${col.columnName}'`,
        type: 'outlier_handling',
        category: 'caution',
        affectedColumns: [col.columnName],
        detectedIssue: `Detected ${col.outliers.iqrOutlierCount} statistical outlier(s) beyond IQR bounds [${col.outliers.bounds.lower}, ${col.outliers.bounds.upper}].`,
        recommendedAction: 'Flag and cap to IQR bounds (Winsorize)',
        configurableOptions: {
          strategy: ['cap_iqr_bounds', 'flag_only', 'quarantine_row', 'preserve']
        },
        selectedAction: 'cap_iqr_bounds',
        estimatedAffectedItems: col.outliers.iqrOutlierCount
      });
    }

    // Category Normalization (Fuzzy spelling candidates)
    if (col.roles.isCategorical && col.topCategories && col.topCategories.length >= 2) {
      const cats = col.topCategories.map(c => c.value);
      const suggestions = [];
      for (let i = 0; i < cats.length; i++) {
        for (let j = i + 1; j < cats.length; j++) {
          const c1 = String(cats[i] || '').trim();
          const c2 = String(cats[j] || '').trim();
          if (c1.length >= 4 && c2.length >= 4 && levenshteinDistance(c1.toLowerCase(), c2.toLowerCase()) <= 2) {
            suggestions.push({ original: c2, suggestedCanonical: c1 });
            suggestions.push({ original: cats[j], suggestedCanonical: c1 });
          }
        }
      }
      if (suggestions.length > 0) {
        plan.push({
          id: `op_category_norm_${col.columnName}`,
          name: `Category Normalization for '${col.columnName}'`,
          type: 'harmonize_categories',
          category: 'caution',
          affectedColumns: [col.columnName],
          detectedIssue: `Discovered potential typographical spelling variants: ${suggestions.map(s => `"${s.original}" ≈ "${s.suggestedCanonical}"`).join(', ')}.`,
          recommendedAction: 'Harmonize near-duplicate category spellings',
          configurableOptions: {
            unifyCategories: suggestions,
            casing: ['title_case', 'lower_case', 'upper_case', 'preserve']
          },
          selectedAction: 'harmonize_spellings',
          estimatedAffectedItems: suggestions.length
        });
      }
    }
  });

  // Attach aliases for complete compatibility with UI and external consumers
  plan.forEach(op => {
    op.column = op.affectedColumns && op.affectedColumns.length === 1 ? op.affectedColumns[0] : (op.affectedColumns?.join(', ') || null);
    op.reason = op.detectedIssue || op.name;
    op.action = op.recommendedAction || op.name;
    op.affectedCount = op.estimatedAffectedItems || 0;
    op.severity = op.category === 'caution' ? 'high' : 'medium';
  });

  const summary = {
    totalOperations: plan.length,
    totalProposedOperations: plan.length,
    safeOperations: plan.filter(p => p.category === 'safe').length,
    cautionOperations: plan.filter(p => p.category === 'caution').length,
    criticalFixesCount: plan.filter(p => p.category === 'caution').length,
    qualityScoreProjected: Math.min(100, Math.round((tabularProfile?.qualityScore || 85) + 12))
  };
  plan.operations = plan;
  plan.summary = summary;
  plan.profile = tabularProfile;
  plan.dataQualitySnapshot = {
    rowCount,
    columnCount: headers.length,
    qualityScore: tabularProfile?.qualityScore,
    duplicateRowsCount: tabularProfile?.duplicateRows?.count || 0,
    missingCellsCount: tabularProfile?.summary?.missingCells || 0
  };
  return plan;
}

/**
 * 2. Execute Cleaning Plan with Audit Logging
 */
function applyCleaningPlan(headers, rows, approvedOperations = [], options = {}) {
  const startTime = Date.now();
  if (!Array.isArray(headers) || !Array.isArray(rows)) {
    throw new Error('Invalid input headers or rows for cleaning execution.');
  }

  // Deep clone to strictly preserve original dataset
  let workingHeaders = [...headers];
  let workingRows = rows.map(r => ({ ...r }));
  const quarantinedRows = [];
  const auditLog = [];

  // Helper for tracking operation audit entry
  function recordAudit(opId, name, type, cols, affectedRows, affectedCells, reason, beforeSample, afterSample) {
    auditLog.push({
      operationId: opId,
      name,
      type,
      affectedColumns: cols,
      affectedRowCount: affectedRows,
      affectedCellCount: affectedCells,
      reason,
      beforeSample,
      afterSample,
      timestamp: new Date().toISOString()
    });
  }

  // Helper to resolve column name against current workingHeaders
  const resolveCol = (c) => {
    if (!c) return null;
    if (workingHeaders.includes(c)) return c;
    const norm = c.trim().toLowerCase().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return workingHeaders.find(h => h.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') === norm) || c;
  };

  // Sort approvedOperations so data-level cleaning runs before column header renames
  const sortedOperations = [...approvedOperations].sort((a, b) => {
    if (a.type === 'column_name_normalization') return 1;
    if (b.type === 'column_name_normalization') return -1;
    return 0;
  });

  // Iterate over approved operations
  for (const op of sortedOperations) {
    if (!op || op.enabled === false) continue;

    switch (op.type) {
      // 1. Column Name Normalization
      case 'column_name_normalization': {
        const namingStyle = op.selectedAction || 'snake_case';
        const renameMap = {};
        const oldHeaders = [...workingHeaders];

        workingHeaders = workingHeaders.map((h, idx) => {
          let newName = h.trim();
          if (namingStyle === 'snake_case') {
            newName = newName
              .replace(/[^a-zA-Z0-9]+/g, '_')
              .replace(/^_+|_+$/g, '')
              .toLowerCase();
          } else if (namingStyle === 'camelCase') {
            newName = newName
              .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
              .replace(/^[A-Z]/, c => c.toLowerCase());
          }
          if (!newName || /^[0-9]/.test(newName)) {
            newName = `col_${newName || idx + 1}`;
          }
          renameMap[h] = newName;
          return newName;
        });

        // Remap keys in rows
        workingRows.forEach(r => {
          for (const oldH of oldHeaders) {
            const newH = renameMap[oldH];
            if (newH !== oldH) {
              r[newH] = r[oldH];
              delete r[oldH];
            }
          }
        });

        recordAudit(
          op.id, op.name, op.type, oldHeaders,
          workingRows.length, oldHeaders.length,
          `Normalized column names using ${namingStyle}.`,
          oldHeaders.slice(0, 5), workingHeaders.slice(0, 5)
        );
        break;
      }

      // 2. Whitespace & Unicode Normalization
      case 'trim_whitespace':
      case 'whitespace_normalization': {
        let changedCells = 0;
        const targetCols = op.affectedColumns || workingHeaders;

        workingRows.forEach(r => {
          targetCols.forEach(col => {
            const val = r[col];
            if (typeof val === 'string') {
              // Strip NBSP (\u00A0), zero-width spaces (\u200B), trim
              const cleaned = val
                .replace(/[\u00A0\u200B]/g, ' ')
                .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
                .normalize('NFC')
                .trim();
              if (cleaned !== val) {
                r[col] = cleaned;
                changedCells++;
              }
            }
          });
        });

        recordAudit(
          op.id, op.name, op.type, targetCols,
          workingRows.length, changedCells,
          'Trimmed whitespace and normalized unicode across text fields.',
          'Raw whitespace', 'Normalized string values'
        );
        break;
      }

      // 3. Duplicate Handling
      case 'deduplicate':
      case 'duplicate_handling': {
        const strategy = options.duplicateStrategy || op.selectedAction || 'keep_first';
        const keyCols = op.keyColumns && op.keyColumns.length > 0 ? op.keyColumns : workingHeaders;

        if (strategy === 'preserve_all') {
          recordAudit(op.id, op.name, op.type, keyCols, 0, 0, 'Preserved all duplicate rows per configuration.', 'None', 'None');
          break;
        }

        const seenKeys = new Map();
        const keptRows = [];
        let droppedCount = 0;

        workingRows.forEach((r, idx) => {
          const key = keyCols.map(k => String(r[k] !== undefined ? r[k] : '')).join('||');
          if (seenKeys.has(key)) {
            droppedCount++;
            if (strategy === 'quarantine_duplicates') {
              const msg = `Duplicate row matching key on [${keyCols.join(', ')}]`;
              quarantinedRows.push({
                row: r,
                originalIndex: idx,
                reason: msg,
                quarantineReason: msg
              });
            } else if (strategy === 'keep_last') {
              // Replace previously kept row
              const prevIdx = seenKeys.get(key);
              keptRows[prevIdx] = r;
            }
          } else {
            seenKeys.set(key, keptRows.length);
            keptRows.push(r);
          }
        });

        const prevCount = workingRows.length;
        workingRows = keptRows.filter(Boolean);

        recordAudit(
          op.id, op.name, op.type, keyCols,
          droppedCount, droppedCount * keyCols.length,
          `Applied duplicate resolution (${strategy}). Kept ${workingRows.length} distinct rows.`,
          `${prevCount} rows`, `${workingRows.length} rows`
        );
        break;
      }

      // 4. Missing Value Handling
      case 'missing_value_handling':
      case 'missing_value_impute': {
        const rawCol = (op.affectedColumns || [])[0];
        const col = resolveCol(rawCol);
        if (!col || !workingHeaders.includes(col)) break;

        let strategy = op.selectedAction || 'preserve';
        if (options.missingStrategy === 'quarantine' || op.selectedAction === 'quarantine' || op.selectedAction === 'quarantine_row') {
          strategy = 'quarantine_row';
        } else if (options.missingStrategy === 'auto' && strategy === 'preserve') {
          strategy = 'impute_median';
        } else if (options.missingStrategy === 'impute') {
          if (strategy === 'quarantine_row' || strategy === 'preserve') {
            strategy = 'impute_median';
          }
        }

        let affectedCount = 0;

        if (strategy === 'preserve') {
          recordAudit(op.id, op.name, op.type, [col], 0, 0, 'Preserved missing values per configuration.', 'N/A', 'N/A');
          break;
        }

        // Compute median / mean / mode if needed
        let fillValue = '';
        if (strategy === 'impute_median' || strategy === 'impute_mean') {
          const nums = workingRows
            .map(r => r[col])
            .filter(v => isNumericValue(v))
            .map(v => Number(String(v).replace(/[^0-9.-]+/g, '')))
            .filter(n => !isNaN(n));

          if (nums.length > 0) {
            nums.sort((a, b) => a - b);
            if (strategy === 'impute_median') {
              fillValue = nums[Math.floor(nums.length / 2)];
            } else {
              const sum = nums.reduce((acc, v) => acc + v, 0);
              fillValue = Number((sum / nums.length).toFixed(2));
            }
          } else {
            fillValue = 0;
          }
        } else if (strategy === 'impute_mode') {
          const freqMap = new Map();
          workingRows.forEach(r => {
            const v = r[col];
            if (v !== '' && v !== null && v !== undefined) {
              freqMap.set(v, (freqMap.get(v) || 0) + 1);
            }
          });
          let maxF = 0;
          for (const [k, f] of freqMap.entries()) {
            if (f > maxF) { maxF = f; fillValue = k; }
          }
        } else if (strategy === 'impute_constant') {
          fillValue = op.configurableOptions?.constantValue !== undefined ? op.configurableOptions.constantValue : 'Unknown';
        }

        if (strategy === 'quarantine_row') {
          const validRows = [];
          workingRows.forEach((r, idx) => {
            const v = r[col];
            if (v === '' || v === null || v === undefined) {
              affectedCount++;
              const msg = `missing required value in column '${col}'`;
              quarantinedRows.push({
                row: r,
                originalIndex: idx,
                reason: msg,
                quarantineReason: msg
              });
            } else {
              validRows.push(r);
            }
          });
          workingRows = validRows;
        } else {
          workingRows.forEach(r => {
            const v = r[col];
            if (v === '' || v === null || v === undefined) {
              r[col] = fillValue;
              affectedCount++;
            }
          });
        }

        recordAudit(
          op.id, op.name, op.type, [col],
          affectedCount, affectedCount,
          `Applied missing value strategy '${strategy}' (value: ${fillValue}) to column '${col}'.`,
          'Null / empty values', `${fillValue}`
        );
        break;
      }

      // 5. Date Standardization
      case 'date_parsing': {
        const rawCol = (op.affectedColumns || [])[0];
        const col = resolveCol(rawCol);
        if (!col || !workingHeaders.includes(col)) break;

        let parsedCount = 0;
        workingRows.forEach(r => {
          const v = r[col];
          if (v && isDateValue(v)) {
            const d = new Date(v);
            if (!isNaN(d.getTime())) {
              r[col] = d.toISOString().split('T')[0];
              parsedCount++;
            }
          }
        });

        recordAudit(
          op.id, op.name, op.type, [col],
          parsedCount, parsedCount,
          `Standardized ${parsedCount} dates to ISO-8601 in column '${col}'.`,
          'Mixed date formats', 'YYYY-MM-DD'
        );
        break;
      }

      // 6. Outlier Handling (IQR Winsorization / Cap)
      case 'outlier_handling': {
        const rawCol = (op.affectedColumns || [])[0];
        const col = resolveCol(rawCol);
        if (!col || !workingHeaders.includes(col)) break;

        let strategy = op.selectedAction || 'cap_iqr_bounds';
        if (options.outlierStrategy === 'winsorize') strategy = 'cap_iqr_bounds';

        if (strategy === 'preserve' || strategy === 'flag_only') {
          recordAudit(op.id, op.name, op.type, [col], 0, 0, 'Preserved outliers as legitimate variance.', 'N/A', 'N/A');
          break;
        }

        const nums = workingRows
          .map(r => r[col])
          .filter(v => isNumericValue(v))
          .map(v => Number(String(v).replace(/[^0-9.-]+/g, '')))
          .filter(n => !isNaN(n));

        if (nums.length >= 4) {
          nums.sort((a, b) => a - b);
          const q1 = nums[Math.floor(nums.length * 0.25)];
          const q3 = nums[Math.floor(nums.length * 0.75)];
          const iqr = q3 - q1;
          const lowerBound = q1 - 1.5 * iqr;
          const upperBound = q3 + 1.5 * iqr;

          let cappedCount = 0;
          workingRows.forEach(r => {
            const v = r[col];
            if (isNumericValue(v)) {
              const numVal = Number(String(v).replace(/[^0-9.-]+/g, ''));
              if (numVal < lowerBound) {
                r[col] = Number(lowerBound.toFixed(2));
                cappedCount++;
              } else if (numVal > upperBound) {
                r[col] = Number(upperBound.toFixed(2));
                cappedCount++;
              }
            }
          });

          recordAudit(
            op.id, op.name, op.type, [col],
            cappedCount, cappedCount,
            `Winsorized ${cappedCount} outliers in '${col}' to IQR boundaries [${lowerBound.toFixed(2)}, ${upperBound.toFixed(2)}].`,
            'Extreme values', 'IQR capped boundaries'
          );
        }
        break;
      }

      // 7. Category Normalization
      case 'harmonize_categories':
      case 'category_normalization': {
        const rawCol = (op.affectedColumns || [])[0];
        const col = resolveCol(rawCol);
        if (!col || !workingHeaders.includes(col)) break;

        const unifications = op.configurableOptions?.unifyCategories || [];
        let harmonizedCount = 0;

        if (unifications.length > 0) {
          const map = new Map();
          unifications.forEach(u => {
            if (u.original) map.set(String(u.original).trim().toLowerCase(), u.suggestedCanonical);
          });

          workingRows.forEach(r => {
            const v = r[col];
            if (typeof v === 'string') {
              const lower = v.trim().toLowerCase();
              if (map.has(lower)) {
                r[col] = map.get(lower);
                harmonizedCount++;
              }
            }
          });
        }

        recordAudit(
          op.id, op.name, op.type, [col],
          harmonizedCount, harmonizedCount,
          `Harmonized ${harmonizedCount} category spelling variants in column '${col}'.`,
          'Typos / near duplicates', 'Canonical category labels'
        );
        break;
      }

      default:
        // Unsupported or custom operation
        break;
    }
  }

  const executionTimeMs = Date.now() - startTime;

  return {
    success: true,
    cleanedHeaders: workingHeaders,
    cleanedRows: workingRows,
    quarantinedRows,
    transformationAuditLog: auditLog,
    auditLog,
    summary: {
      originalRowCount: rows.length,
      cleanedRowCount: workingRows.length,
      quarantinedRowCount: quarantinedRows.length,
      operationsAppliedCount: auditLog.length,
      executionTimeMs
    }
  };
}

module.exports = {
  generateCleaningPlan,
  applyCleaningPlan,
  levenshteinDistance
};
