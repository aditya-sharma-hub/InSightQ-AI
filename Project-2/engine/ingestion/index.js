const { detectFormat, FORMAT_MATRIX, MAX_TABULAR_SIZE, MAX_DOCUMENT_SIZE } = require('./detector');
const { parseDelimited, detectDelimiter } = require('./adapters/csv_adapter');
const { parseExcel } = require('./adapters/excel_adapter');
const { parseJsonOrJsonl } = require('./adapters/json_adapter');
const { parseTextDocument } = require('./adapters/text_adapter');
const { parsePdf } = require('./adapters/pdf_adapter');
const { parseDocx } = require('./adapters/docx_adapter');

/**
 * Universal Ingestion Engine Entry Point
 */
async function ingest(buffer, filename = '', options = {}) {
  const startTime = Date.now();
  if (!buffer || buffer.length === 0) {
    throw new Error('Cannot ingest empty (0 byte) file or missing content buffer.');
  }

  // 1. Detect format & validate size
  const detection = detectFormat(buffer, filename, options.mimeType);
  if (!detection.isValid) {
    throw new Error(detection.error || 'Failed to detect input file format.');
  }

  const format = detection.format;
  const category = detection.category;

  if (category === 'tabular' && buffer.length > MAX_TABULAR_SIZE) {
    throw new Error(`File size (${(buffer.length / 1048576).toFixed(1)} MB) exceeds tabular limit of 500 MB.`);
  }
  if (category === 'document' && buffer.length > MAX_DOCUMENT_SIZE) {
    throw new Error(`File size (${(buffer.length / 1048576).toFixed(1)} MB) exceeds document limit of 100 MB.`);
  }

  let result = null;

  // 2. Dispatch to dedicated adapter
  switch (format) {
    case 'CSV':
    case 'TSV': {
      const parsed = parseDelimited(buffer, {
        delimiter: detection.delimiter || options.delimiter,
        encoding: options.encoding,
        recoverMalformed: options.recoverMalformed !== false
      });
      result = {
        category: 'tabular',
        format,
        primaryTable: {
          headers: parsed.headers,
          rows: parsed.rows,
          rowCount: parsed.rows.length,
          columnCount: parsed.headers.length,
          malformedRows: parsed.malformedRows,
          delimiter: parsed.delimiter,
          encoding: parsed.encoding
        },
        warnings: parsed.warnings
      };
      break;
    }

    case 'XLSX':
    case 'XLS': {
      const parsed = parseExcel(buffer, {
        sheetName: options.sheetName,
        sheetIndex: options.sheetIndex
      });
      result = {
        category: 'tabular',
        format,
        primaryTable: {
          headers: parsed.headers,
          rows: parsed.rows,
          rowCount: parsed.rows.length,
          columnCount: parsed.headers.length,
          sheetName: parsed.sheetName
        },
        availableSheets: parsed.availableSheets,
        warnings: parsed.warnings
      };
      break;
    }

    case 'JSON':
    case 'JSONL': {
      const text = buffer.toString('utf8');
      const parsed = parseJsonOrJsonl(text, { flatten: options.flatten !== false });
      result = {
        category: 'semi-structured',
        format,
        primaryTable: {
          headers: parsed.headers,
          rows: parsed.rows,
          rowCount: parsed.rows.length,
          columnCount: parsed.headers.length
        },
        isJsonl: parsed.isJsonl,
        warnings: parsed.warnings
      };
      break;
    }

    case 'TXT':
    case 'MD':
    case 'LOG': {
      const text = buffer.toString('utf8');
      const parsed = parseTextDocument(text, format);
      result = {
        category: 'unstructured',
        format,
        documentData: {
          text: parsed.text,
          sections: parsed.sections,
          tables: parsed.tables,
          characterCount: parsed.characterCount,
          wordCount: parsed.wordCount,
          lineCount: parsed.lineCount
        },
        // If structured log rows or tables exist, provide as primaryTable
        primaryTable: parsed.structuredRows ? {
          headers: ['line', 'timestamp', 'component', 'level', 'message'],
          rows: parsed.structuredRows,
          rowCount: parsed.structuredRows.length,
          columnCount: 5
        } : (parsed.tables && parsed.tables.length > 0 ? {
          headers: parsed.tables[0].headers,
          rows: parsed.tables[0].rows,
          rowCount: parsed.tables[0].rows.length,
          columnCount: parsed.tables[0].headers.length
        } : null),
        warnings: []
      };
      break;
    }

    case 'PDF': {
      const parsed = await parsePdf(buffer, options);
      result = {
        category: 'document',
        format: 'PDF',
        documentData: {
          text: parsed.text,
          pages: parsed.pages,
          pageCount: parsed.pageCount,
          metadata: parsed.metadata,
          tables: parsed.tables,
          isScanned: parsed.isScanned,
          characterCount: parsed.characterCount,
          wordCount: parsed.wordCount
        },
        primaryTable: parsed.tables && parsed.tables.length > 0 ? {
          headers: parsed.tables[0].headers,
          rows: parsed.tables[0].rows,
          rowCount: parsed.tables[0].rows.length,
          columnCount: parsed.tables[0].headers.length
        } : null,
        warnings: parsed.warnings
      };
      break;
    }

    case 'DOCX': {
      const parsed = parseDocx(buffer, options);
      result = {
        category: 'document',
        format: 'DOCX',
        documentData: {
          text: parsed.text,
          metadata: parsed.metadata,
          sections: parsed.sections,
          tables: parsed.tables,
          paragraphCount: parsed.paragraphCount,
          characterCount: parsed.characterCount,
          wordCount: parsed.wordCount
        },
        primaryTable: parsed.tables && parsed.tables.length > 0 ? {
          headers: parsed.tables[0].headers,
          rows: parsed.tables[0].rows,
          rowCount: parsed.tables[0].rows.length,
          columnCount: parsed.tables[0].headers.length
        } : null,
        warnings: parsed.warnings
      };
      break;
    }

    default:
      throw new Error(`Unsupported format '${format}'.`);
  }

  const executionTimeMs = Date.now() - startTime;

  return {
    success: true,
    filename,
    fileSize: buffer.length,
    format: result.format,
    category: result.category,
    primaryTable: result.primaryTable || null,
    documentData: result.documentData || null,
    availableSheets: result.availableSheets || null,
    warnings: result.warnings || [],
    executionTimeMs,
    // Top-level aliases for caller ergonomics
    headers: result.primaryTable ? result.primaryTable.headers : (result.documentData?.tables?.[0]?.headers || []),
    rows: result.primaryTable ? result.primaryTable.rows : (result.documentData?.tables?.[0]?.rows || []),
    totalRows: result.primaryTable ? result.primaryTable.rowCount : (result.documentData?.tables?.[0]?.rows?.length || 0),
    totalColumns: result.primaryTable ? result.primaryTable.columnCount : (result.documentData?.tables?.[0]?.headers?.length || 0),
    delimiter: result.primaryTable?.delimiter || null,
    encoding: result.primaryTable?.encoding || null,
    document: result.documentData || null,
    sheets: result.availableSheets || [],
    sheetNames: (result.availableSheets || []).map(s => typeof s === 'string' ? s : s.name),
    activeSheet: result.primaryTable?.sheetName || null
  };
}

module.exports = {
  ingest,
  detectFormat,
  FORMAT_MATRIX,
  parseDelimited,
  detectDelimiter,
  parseExcel,
  parseJsonOrJsonl,
  parseTextDocument,
  parsePdf,
  parseDocx,
  adapters: {
    parseDelimited,
    parseExcel,
    parseJsonOrJsonl,
    parseTextDocument,
    parsePdf,
    parseDocx
  }
};
