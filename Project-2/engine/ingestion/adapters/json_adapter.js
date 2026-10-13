/**
 * Format-Aware JSON and JSONL Adapter
 * Supports flat records, nested objects/arrays flattening, JSONL streams,
 * and multi-table extraction from semi-structured JSON.
 */

function flattenObject(obj, prefix = '', depth = 0, maxDepth = 4) {
  const result = {};
  if (!obj || typeof obj !== 'object' || depth >= maxDepth) {
    result[prefix || 'value'] = obj;
    return result;
  }

  for (const [key, val] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      const nested = flattenObject(val, newKey, depth + 1, maxDepth);
      Object.assign(result, nested);
    } else if (Array.isArray(val)) {
      // If primitive array, stringify or join; if object array, store count/summary or json
      if (val.length === 0) {
        result[newKey] = '[]';
      } else if (typeof val[0] === 'object') {
        result[newKey] = JSON.stringify(val);
      } else {
        result[newKey] = val.join(', ');
      }
    } else {
      result[newKey] = val !== undefined && val !== null ? val : '';
    }
  }
  return result;
}

function parseJsonOrJsonl(text, options = {}) {
  const warnings = [];
  if (!text || typeof text !== 'string') {
    throw new Error('Empty or invalid JSON content.');
  }

  const trimmed = text.trim();
  let records = [];

  // 1. Try standard JSON parse
  let parsedJson = null;
  let isJsonl = false;

  try {
    parsedJson = JSON.parse(trimmed);
  } catch (err) {
    // If standard JSON fails, test for JSONL
    isJsonl = true;
  }

  if (!isJsonl && parsedJson !== null) {
    if (Array.isArray(parsedJson)) {
      records = parsedJson;
    } else if (typeof parsedJson === 'object') {
      // Look for a dominant array field, e.g. { data: [...], items: [...], records: [...] }
      const arrayKeys = Object.keys(parsedJson).filter(k => Array.isArray(parsedJson[k]));
      if (arrayKeys.length > 0) {
        // Choose array with most object items
        let bestKey = arrayKeys[0];
        let bestLen = parsedJson[bestKey].length;
        for (const k of arrayKeys) {
          if (parsedJson[k].length > bestLen) {
            bestKey = k;
            bestLen = parsedJson[k].length;
          }
        }
        records = parsedJson[bestKey];
        warnings.push(`Extracted nested array from root key '${bestKey}' (${records.length} items).`);
      } else {
        // Single object, treat as 1-row table or key-value pairs
        records = [parsedJson];
      }
    }
  } else {
    // Parse as JSONL
    const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const parsedLines = [];
    const malformed = [];

    lines.forEach((line, idx) => {
      try {
        const item = JSON.parse(line);
        parsedLines.push(item);
      } catch (e) {
        malformed.push({ lineIndex: idx + 1, raw: line, error: e.message });
      }
    });

    if (malformed.length > 0) {
      warnings.push(`Found ${malformed.length} malformed JSON lines in JSONL stream.`);
    }

    records = parsedLines;
  }

  if (records.length === 0) {
    return {
      headers: [],
      rows: [],
      rawRowCount: 0,
      isNested: false,
      warnings: [...warnings, 'No valid records extracted from JSON.']
    };
  }

  // Flatten nested objects if required
  const shouldFlatten = options.flatten !== false;
  const processedRows = records.map(r => {
    if (typeof r !== 'object' || r === null) {
      return { value: r };
    }
    return shouldFlatten ? flattenObject(r) : r;
  });

  // Collect all unique keys across all records to form consistent rectangular table
  const headerSet = new Set();
  processedRows.forEach(row => {
    Object.keys(row).forEach(k => headerSet.add(k));
  });

  const headers = Array.from(headerSet);

  // Normalize rows to rectangular structure
  const rows = processedRows.map(row => {
    const normRow = {};
    headers.forEach(h => {
      const val = row[h];
      normRow[h] = val !== undefined && val !== null ? val : '';
    });
    return normRow;
  });

  return {
    headers,
    rows,
    rawRowCount: rows.length,
    isJsonl,
    warnings
  };
}

module.exports = {
  flattenObject,
  parseJsonOrJsonl
};
