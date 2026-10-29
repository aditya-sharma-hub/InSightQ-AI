/**
 * Format-Aware CSV / TSV Adapter
 * Supports arbitrary delimiters (comma, tab, semicolon, pipe), quote escaping,
 * inconsistent row lengths, malformed records, encoding hygiene (UTF-16, Latin1, BOM),
 * and binary file rejection.
 */

/**
 * Decode Buffer or String with Encoding & BOM Hygiene
 */
function decodeBufferOrString(input, options = {}) {
  const warnings = [];
  if (input === null || input === undefined) {
    return { text: '', encoding: 'utf-8', warnings };
  }

  if (typeof input === 'string') {
    let clean = input;
    if (clean.charCodeAt(0) === 0xFEFF) {
      clean = clean.slice(1);
      warnings.push('Stripped UTF-8 Byte Order Mark (BOM).');
    }
    return { text: clean, encoding: options.encoding || 'utf-8', warnings };
  }

  if (Buffer.isBuffer(input)) {
    if (input.length === 0) {
      return { text: '', encoding: 'utf-8', warnings };
    }

    // 1. Detect UTF-16LE BOM: 0xFF, 0xFE
    if (input.length >= 2 && input[0] === 0xFF && input[1] === 0xFE) {
      warnings.push('Detected and decoded UTF-16LE Byte Order Mark (BOM).');
      return { text: input.slice(2).toString('utf16le'), encoding: 'utf-16le', warnings };
    }

    // 2. Detect UTF-16BE BOM: 0xFE, 0xFF
    if (input.length >= 2 && input[0] === 0xFE && input[1] === 0xFF) {
      warnings.push('Detected and decoded UTF-16BE Byte Order Mark (BOM).');
      const swapped = Buffer.alloc(input.length - 2);
      for (let i = 2; i < input.length - 1; i += 2) {
        swapped[i - 2] = input[i + 1];
        swapped[i - 1] = input[i];
      }
      return { text: swapped.toString('utf16le'), encoding: 'utf-16be', warnings };
    }

    // 3. Detect UTF-8 BOM: 0xEF, 0xBB, 0xBF
    if (input.length >= 3 && input[0] === 0xEF && input[1] === 0xBB && input[2] === 0xBF) {
      warnings.push('Stripped UTF-8 Byte Order Mark (BOM).');
      return { text: input.slice(3).toString('utf8'), encoding: 'utf-8', warnings };
    }

    // 4. Explicit requested encoding
    if (options.encoding) {
      try {
        const decoded = input.toString(options.encoding);
        return { text: decoded, encoding: options.encoding, warnings };
      } catch (e) {
        warnings.push(`Specified encoding '${options.encoding}' failed, falling back to UTF-8.`);
      }
    }

    // 5. UTF-16LE without BOM check (alternating null bytes)
    if (input.length >= 8) {
      let nullCountEven = 0;
      let nullCountOdd = 0;
      const sampleLimit = Math.min(input.length, 1024);
      for (let i = 0; i < sampleLimit; i++) {
        if (input[i] === 0) {
          if (i % 2 === 0) nullCountEven++;
          else nullCountOdd++;
        }
      }
      if (nullCountOdd > 10 && nullCountEven === 0) {
        warnings.push('Detected UTF-16LE encoding without BOM.');
        return { text: input.toString('utf16le'), encoding: 'utf-16le', warnings };
      }
    }

    // 6. Binary file check (detect executable or raw binary streams)
    let binaryChars = 0;
    const testSample = Math.min(input.length, 512);
    for (let i = 0; i < testSample; i++) {
      const b = input[i];
      if (b === 0 || (b < 7 && b !== 0) || (b > 13 && b < 32 && b !== 27)) {
        binaryChars++;
      }
    }
    if (binaryChars > 10) {
      throw new Error('File contains invalid binary data and cannot be parsed as delimited text.');
    }

    // Default UTF-8 decode
    return { text: input.toString('utf8'), encoding: 'utf-8', warnings };
  }

  return { text: String(input), encoding: 'utf-8', warnings };
}

/**
 * Robust Multi-Line Delimiter Sniffer
 */
function detectDelimiter(text, preferredDelimiter = null) {
  if (preferredDelimiter) return preferredDelimiter;
  const sample = text.slice(0, 8192);
  const lines = sample.split(/\r?\n/).filter(l => l.trim().length > 0).slice(0, 10);
  if (lines.length === 0) return ',';

  const candidates = [',', '\t', ';', '|'];
  const scores = {};

  candidates.forEach(delim => {
    const delimCode = delim.charCodeAt(0);
    const lineFieldCounts = lines.map(line => {
      let count = 1;
      let inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const c = line.charCodeAt(i);
        if (c === 34) inQuote = !inQuote;
        else if (!inQuote && c === delimCode) count++;
      }
      return count;
    });

    const minCount = Math.min(...lineFieldCounts);
    const maxCount = Math.max(...lineFieldCounts);

    if (minCount > 1) {
      // Consistency bonus
      const isConsistent = minCount === maxCount ? 3 : 1;
      scores[delim] = minCount * isConsistent * lines.length;
    } else {
      scores[delim] = 0;
    }
  });

  let best = ',';
  let bestScore = 0;
  for (const [delim, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      best = delim;
    }
  }

  return best;
}

/**
 * Universal Delimited Text Parser
 */
function parseDelimited(input, options = {}) {
  const decoded = decodeBufferOrString(input, options);
  const warnings = [...decoded.warnings];
  const cleanText = decoded.text;

  if (!cleanText || cleanText.trim().length === 0) {
    return {
      headers: [],
      rows: [],
      malformedRows: [],
      rawRowCount: 0,
      delimiter: options.delimiter || ',',
      encoding: decoded.encoding,
      warnings: ['File is empty (0 bytes) or contains no valid text.']
    };
  }

  const delimiter = detectDelimiter(cleanText, options.delimiter);
  const delimCode = delimiter.charCodeAt(0);
  const len = cleanText.length;
  let i = 0;

  const rawLines = [];
  let currentRow = [''];
  let inQuote = false;

  while (i < len) {
    const code = cleanText.charCodeAt(i);

    if (code === 34) { // Quote '"'
      if (inQuote && i + 1 < len && cleanText.charCodeAt(i + 1) === 34) {
        currentRow[currentRow.length - 1] += '"';
        i += 2;
        continue;
      }
      inQuote = !inQuote;
      i++;
      continue;
    }

    if (!inQuote) {
      if (code === delimCode) {
        currentRow.push('');
        i++;
        continue;
      }

      if (code === 13 || code === 10) { // \r or \n
        if (code === 13 && i + 1 < len && cleanText.charCodeAt(i + 1) === 10) {
          i++;
        }
        rawLines.push(currentRow);
        currentRow = [''];
        i++;
        continue;
      }
    }

    currentRow[currentRow.length - 1] += cleanText[i];
    i++;
  }

  if (currentRow.length > 1 || currentRow[0] !== '') {
    rawLines.push(currentRow);
  }

  if (rawLines.length === 0) {
    return {
      headers: [],
      rows: [],
      malformedRows: [],
      rawRowCount: 0,
      delimiter,
      encoding: decoded.encoding,
      warnings: ['No rows parsed from file.']
    };
  }

  // Filter empty trailing lines
  const nonEmptyLines = rawLines.filter(row => row.some(cell => cell.trim().length > 0));
  if (nonEmptyLines.length === 0) {
    return {
      headers: [],
      rows: [],
      malformedRows: [],
      rawRowCount: 0,
      delimiter,
      encoding: decoded.encoding,
      warnings: ['All rows in file were empty.']
    };
  }

  // Header extraction & normalization
  const rawHeaders = nonEmptyLines[0].map(h => (h !== undefined && h !== null ? String(h).trim() : ''));
  const headerCount = rawHeaders.length;

  const headers = [];
  const seenHeaderCounts = {};
  for (let c = 0; c < headerCount; c++) {
    let hName = rawHeaders[c] || `column_${c + 1}`;
    if (seenHeaderCounts[hName] !== undefined) {
      seenHeaderCounts[hName]++;
      hName = `${hName}_${seenHeaderCounts[hName]}`;
      warnings.push(`Duplicate header renamed to '${hName}'.`);
    } else {
      seenHeaderCounts[hName] = 0;
    }
    headers.push(hName);
  }

  const rows = [];
  const malformedRows = [];

  for (let r = 1; r < nonEmptyLines.length; r++) {
    const rawCells = nonEmptyLines[r];
    if (rawCells.length !== headerCount) {
      const isTooShort = rawCells.length < headerCount;
      malformedRows.push({
        lineIndex: r + 1,
        rawCells,
        expectedLength: headerCount,
        actualLength: rawCells.length,
        reason: isTooShort
          ? `Missing ${headerCount - rawCells.length} column(s) (row too short)`
          : `Excess ${rawCells.length - headerCount} column(s) (row too long)`
      });

      if (options.recoverMalformed !== false) {
        const paddedRow = {};
        for (let c = 0; c < headerCount; c++) {
          paddedRow[headers[c]] = rawCells[c] !== undefined ? rawCells[c].trim() : '';
        }
        if (rawCells.length > headerCount) {
          paddedRow.__excessColumns = rawCells.slice(headerCount).map(c => (c || '').trim());
        }
        paddedRow.__malformed = true;
        paddedRow.__originalLineNumber = r + 1;
        rows.push(paddedRow);
      }
    } else {
      const rowObj = {};
      for (let c = 0; c < headerCount; c++) {
        rowObj[headers[c]] = rawCells[c] !== undefined ? rawCells[c].trim() : '';
      }
      rows.push(rowObj);
    }
  }

  if (malformedRows.length > 0) {
    warnings.push(`Detected ${malformedRows.length} row(s) with inconsistent column counts.`);
  }

  return {
    headers,
    rows,
    malformedRows,
    rawRowCount: nonEmptyLines.length - 1,
    delimiter,
    encoding: decoded.encoding,
    warnings
  };
}

module.exports = {
  detectDelimiter,
  decodeBufferOrString,
  parseDelimited
};
