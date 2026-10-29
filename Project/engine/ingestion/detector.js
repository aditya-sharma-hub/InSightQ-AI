const path = require('path');

/**
 * Supported Formats Matrix
 */
const FORMAT_MATRIX = {
  CSV: {
    category: 'tabular',
    extensions: ['csv'],
    mimeTypes: ['text/csv', 'application/csv', 'text/x-csv', 'text/plain'],
    description: 'Comma/custom delimiter separated values'
  },
  TSV: {
    category: 'tabular',
    extensions: ['tsv', 'tab'],
    mimeTypes: ['text/tab-separated-values', 'text/tsv', 'text/plain'],
    description: 'Tab-separated tabular values'
  },
  XLSX: {
    category: 'tabular',
    extensions: ['xlsx'],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream'
    ],
    description: 'Microsoft Excel OpenXML spreadsheet (multi-sheet)'
  },
  XLS: {
    category: 'tabular',
    extensions: ['xls'],
    mimeTypes: ['application/vnd.ms-excel', 'application/msexcel'],
    description: 'Legacy Microsoft Excel binary spreadsheet'
  },
  JSON: {
    category: 'semi-structured',
    extensions: ['json'],
    mimeTypes: ['application/json', 'text/json', 'text/plain'],
    description: 'JavaScript Object Notation (records or nested objects)'
  },
  JSONL: {
    category: 'semi-structured',
    extensions: ['jsonl', 'ndjson'],
    mimeTypes: ['application/x-ndjson', 'application/jsonl', 'text/plain'],
    description: 'Newline-delimited JSON objects'
  },
  TXT: {
    category: 'unstructured',
    extensions: ['txt', 'text'],
    mimeTypes: ['text/plain'],
    description: 'Plain text document'
  },
  MD: {
    category: 'unstructured',
    extensions: ['md', 'markdown'],
    mimeTypes: ['text/markdown', 'text/x-markdown', 'text/plain'],
    description: 'Markdown formatted document'
  },
  LOG: {
    category: 'unstructured',
    extensions: ['log'],
    mimeTypes: ['text/plain', 'text/x-log'],
    description: 'Structured or unstructured application log'
  },
  PDF: {
    category: 'document',
    extensions: ['pdf'],
    mimeTypes: ['application/pdf'],
    description: 'Portable Document Format'
  },
  DOCX: {
    category: 'document',
    extensions: ['docx'],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream'
    ],
    description: 'Microsoft Word OpenXML document'
  }
};

const MAX_TABULAR_SIZE = 500 * 1024 * 1024; // 500 MB
const MAX_DOCUMENT_SIZE = 100 * 1024 * 1024; // 100 MB

/**
 * Detect Format from Buffer Content & Extension
 */
function detectFormat(buffer, filename = '', declaredMime = '') {
  if (!buffer || buffer.length === 0) {
    return {
      isValid: false,
      error: 'Empty (0 byte) file or missing content buffer.'
    };
  }

  const ext = (path.extname(filename || '') || '').toLowerCase().replace(/^\./, '');
  const prefix = buffer.slice(0, Math.min(buffer.length, 2048));

  // Executable binary check (MZ, ELF)
  if ((prefix.length >= 2 && prefix[0] === 0x4D && prefix[1] === 0x5A) ||
      (prefix.length >= 4 && prefix[0] === 0x7F && prefix[1] === 0x45 && prefix[2] === 0x4C && prefix[3] === 0x46)) {
    return {
      isValid: false,
      error: 'Binary executable files are strictly unsupported.'
    };
  }

  // 1. PDF Check (%PDF-)
  if (prefix.length >= 4 && prefix[0] === 0x25 && prefix[1] === 0x50 && prefix[2] === 0x44 && prefix[3] === 0x46) {
    return {
      isValid: true,
      format: 'PDF',
      category: 'document',
      mimeType: 'application/pdf',
      confidence: 1.0,
      detectedBy: 'magic_bytes'
    };
  }

  // 2. PK Zip Archive (DOCX or XLSX)
  if (prefix.length >= 4 && prefix[0] === 0x50 && prefix[1] === 0x4B && prefix[2] === 0x03 && prefix[3] === 0x04) {
    const rawString = prefix.toString('latin1');
    if (rawString.includes('xl/') || ext === 'xlsx') {
      return {
        isValid: true,
        format: 'XLSX',
        category: 'tabular',
        mimeType: FORMAT_MATRIX.XLSX.mimeTypes[0],
        confidence: 0.95,
        detectedBy: 'magic_bytes_and_zip_catalog'
      };
    }
    if (rawString.includes('word/') || ext === 'docx') {
      return {
        isValid: true,
        format: 'DOCX',
        category: 'document',
        mimeType: FORMAT_MATRIX.DOCX.mimeTypes[0],
        confidence: 0.95,
        detectedBy: 'magic_bytes_and_zip_catalog'
      };
    }
  }

  // 3. OLE2 Compound Document (Legacy XLS)
  if (prefix.length >= 8 &&
      prefix[0] === 0xD0 && prefix[1] === 0xCF && prefix[2] === 0x11 && prefix[3] === 0xE0 &&
      prefix[4] === 0xA1 && prefix[5] === 0xB1 && prefix[6] === 0x1A && prefix[7] === 0xE1) {
    return {
      isValid: true,
      format: 'XLS',
      category: 'tabular',
      mimeType: FORMAT_MATRIX.XLS.mimeTypes[0],
      confidence: 0.95,
      detectedBy: 'magic_bytes'
    };
  }

  // 3b. Unrecognized binary check: if content contains null bytes (0x00) and is not a recognized binary or text format
  const isTextExtension = ['csv', 'tsv', 'tab', 'json', 'jsonl', 'ndjson', 'txt', 'text', 'md', 'markdown', 'log'].includes(ext);
  let nullByteCount = 0;
  for (let i = 0; i < prefix.length; i++) {
    if (prefix[i] === 0x00) nullByteCount++;
  }
  if (nullByteCount > 0 && !isTextExtension) {
    return {
      isValid: false,
      error: 'Unrecognized or corrupted binary file format.'
    };
  }

  // 4. Text-based detection (UTF-8, UTF-16, ASCII)
  let text = '';
  try {
    // Check for UTF-8 BOM
    if (prefix[0] === 0xEF && prefix[1] === 0xBB && prefix[2] === 0xBF) {
      text = prefix.slice(3).toString('utf8');
    } else {
      text = prefix.toString('utf8');
    }
  } catch (e) {
    text = prefix.toString('latin1');
  }

  const trimmed = text.trim();

  // JSON Array or Object Check
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      JSON.parse(trimmed.slice(0, Math.min(trimmed.length, 1024)));
      return {
        isValid: true,
        format: 'JSON',
        category: 'semi-structured',
        mimeType: 'application/json',
        confidence: 0.9,
        detectedBy: 'json_structure'
      };
    } catch (e) {
      // Could still be JSONL or multiline JSON
      const firstLine = trimmed.split(/\r?\n/)[0].trim();
      if (firstLine.startsWith('{') && firstLine.endsWith('}')) {
        try {
          JSON.parse(firstLine);
          return {
            isValid: true,
            format: 'JSONL',
            category: 'semi-structured',
            mimeType: 'application/x-ndjson',
            confidence: 0.85,
            detectedBy: 'jsonl_first_line'
          };
        } catch (je) {}
      }
      if (ext === 'json') {
        return {
          isValid: true,
          format: 'JSON',
          category: 'semi-structured',
          mimeType: 'application/json',
          confidence: 0.8,
          detectedBy: 'extension_and_prefix'
        };
      }
    }
  }

  // JSONL Check
  if (ext === 'jsonl' || ext === 'ndjson') {
    return {
      isValid: true,
      format: 'JSONL',
      category: 'semi-structured',
      mimeType: 'application/x-ndjson',
      confidence: 0.9,
      detectedBy: 'extension'
    };
  }

  // Tabular text (CSV, TSV) Delimiter Analysis
  const sampleLines = trimmed.split(/\r?\n/).slice(0, 5).filter(Boolean);
  if (sampleLines.length > 0) {
    const commaCount = (sampleLines[0].match(/,/g) || []).length;
    const tabCount = (sampleLines[0].match(/\t/g) || []).length;
    const semicolonCount = (sampleLines[0].match(/;/g) || []).length;
    const pipeCount = (sampleLines[0].match(/\|/g) || []).length;

    if (tabCount > commaCount && tabCount > semicolonCount && (tabCount >= 1 || ext === 'tsv')) {
      return {
        isValid: true,
        format: 'TSV',
        category: 'tabular',
        mimeType: 'text/tab-separated-values',
        delimiter: '\t',
        confidence: 0.85,
        detectedBy: 'delimiter_frequency'
      };
    }

    if (commaCount >= 1 || semicolonCount >= 1 || pipeCount >= 1 || ext === 'csv') {
      const bestDelim = semicolonCount > commaCount ? ';' : pipeCount > commaCount ? '|' : ',';
      return {
        isValid: true,
        format: 'CSV',
        category: 'tabular',
        mimeType: 'text/csv',
        delimiter: bestDelim,
        confidence: 0.85,
        detectedBy: 'delimiter_frequency'
      };
    }
  }

  // Markdown Check
  if (ext === 'md' || ext === 'markdown' || trimmed.startsWith('# ') || trimmed.includes('\n# ') || trimmed.includes('## ')) {
    return {
      isValid: true,
      format: 'MD',
      category: 'unstructured',
      mimeType: 'text/markdown',
      confidence: ext === 'md' ? 0.95 : 0.75,
      detectedBy: ext === 'md' ? 'extension' : 'markdown_headers'
    };
  }

  // Log File Check
  const hasLogPatterns = sampleLines.some(l => /\[(info|error|warn|debug|trace)\]/i.test(l) || /\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(l));
  if (ext === 'log' || hasLogPatterns) {
    return {
      isValid: true,
      format: 'LOG',
      category: 'unstructured',
      mimeType: 'text/plain',
      confidence: ext === 'log' ? 0.95 : 0.7,
      detectedBy: ext === 'log' ? 'extension' : 'log_heuristics'
    };
  }

  // Extension Fallback
  const upperExt = ext.toUpperCase();
  if (FORMAT_MATRIX[upperExt]) {
    return {
      isValid: true,
      format: upperExt,
      category: FORMAT_MATRIX[upperExt].category,
      mimeType: FORMAT_MATRIX[upperExt].mimeTypes[0],
      confidence: 0.7,
      detectedBy: 'extension_fallback'
    };
  }

  // Default Plain Text if readable characters
  return {
    isValid: true,
    format: 'TXT',
    category: 'unstructured',
    mimeType: 'text/plain',
    confidence: 0.6,
    detectedBy: 'text_fallback'
  };
}

module.exports = {
  FORMAT_MATRIX,
  MAX_TABULAR_SIZE,
  MAX_DOCUMENT_SIZE,
  detectFormat
};
