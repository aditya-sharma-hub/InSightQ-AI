const pdfModule = require('pdf-parse');

/**
 * Format-Aware PDF Document Adapter
 * Extracts text, document metadata, page boundaries, and detects scanned/image-only pages.
 * Reports limitations transparently without inventing content.
 */

async function parsePdf(buffer, options = {}) {
  if (!buffer || buffer.length === 0) {
    throw new Error('Empty (0 byte) PDF buffer.');
  }

  const warnings = [];
  let fullText = '';
  let numPages = 1;
  let meta = {};
  let pageChunks = [];

  try {
    if (typeof pdfModule === 'function') {
      // Legacy pdf-parse v1 API
      const parsed = await pdfModule(buffer);
      fullText = (parsed.text || '').trim();
      numPages = parsed.numpages || 1;
      meta = parsed.info || {};

      const rawPages = fullText.split(/\f|\n(?=Page \d+)/i);
      if (rawPages.length > 1) {
        rawPages.forEach((pText, idx) => {
          pageChunks.push({
            pageNumber: idx + 1,
            text: pText.trim(),
            characterCount: pText.trim().length
          });
        });
      } else {
        pageChunks.push({
          pageNumber: 1,
          text: fullText,
          characterCount: fullText.length
        });
      }
    } else if (pdfModule && pdfModule.PDFParse) {
      // Modern pdf-parse v2 Class API
      const parser = new pdfModule.PDFParse({ data: buffer });
      try {
        await parser.load();
        const textData = await parser.getText();
        let infoObj = {};
        try {
          infoObj = await parser.getInfo();
        } catch (ie) {}

        fullText = (textData?.text || '').trim();
        numPages = textData?.total || textData?.pages?.length || 1;

        if (infoObj?.info) {
          meta = {
            Title: infoObj.info.Title || '',
            Author: infoObj.info.Author || '',
            Creator: infoObj.info.Creator || '',
            Producer: infoObj.info.Producer || '',
            CreationDate: infoObj.info.CreationDate || ''
          };
        }

        if (Array.isArray(textData?.pages) && textData.pages.length > 0) {
          textData.pages.forEach((p, idx) => {
            const pText = (p.text || '').trim();
            pageChunks.push({
              pageNumber: p.num || idx + 1,
              text: pText,
              characterCount: pText.length
            });
          });
        } else {
          pageChunks.push({
            pageNumber: 1,
            text: fullText,
            characterCount: fullText.length
          });
        }
      } finally {
        try { await parser.destroy(); } catch (de) {}
      }
    } else {
      throw new Error('pdf-parse module is missing or incompatible.');
    }
  } catch (err) {
    const errName = err?.name || '';
    const errMsg = err?.message || String(err);

    if (errName === 'PasswordException' || errMsg.toLowerCase().includes('password') || errMsg.toLowerCase().includes('encrypted')) {
      throw new Error('PDF document is encrypted or password-protected. Unencrypted documents are required.');
    }
    if (errName === 'InvalidPDFException' || errName === 'FormatError' || errMsg.includes('Invalid PDF structure')) {
      throw new Error(`Corrupt or invalid PDF document: ${errMsg}`);
    }
    throw new Error(`Failed to parse PDF document: ${errMsg}`);
  }

  // Check for scanned / rasterized pages heuristic
  const avgCharsPerPage = fullText.length / Math.max(1, numPages);
  let isScannedCandidate = false;
  let ocrStatus = 'not_needed';

  if (buffer.length > 30000 && fullText.length < 50) {
    isScannedCandidate = true;
    ocrStatus = 'not_configured';
    warnings.push('Document appears to contain scanned pages or rasterized images. No extractable digital text stream was detected. OCR is required for scanned content.');
  } else if (avgCharsPerPage < 25 && numPages > 0) {
    isScannedCandidate = true;
    ocrStatus = 'not_configured';
    warnings.push(`Low text density detected (avg ${avgCharsPerPage.toFixed(1)} chars/page). Some pages may be scanned or graphical.`);
  }

  // Handle OCR if explicitly configured in options
  if (isScannedCandidate && options.ocrEngine && typeof options.ocrEngine.recognize === 'function') {
    try {
      const ocrResult = await options.ocrEngine.recognize(buffer);
      if (ocrResult && ocrResult.text) {
        fullText = ocrResult.text;
        ocrStatus = 'completed';
        warnings.push(`OCR processing succeeded using ${options.ocrEngine.name || 'configured engine'}.`);
      }
    } catch (ocrErr) {
      warnings.push(`OCR engine failed: ${ocrErr.message}`);
      ocrStatus = 'failed';
    }
  }

  // Table candidate detection using line-by-line tabular patterns
  const tableCandidates = [];
  const lines = fullText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let currentTable = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check if line looks like header or data row with 2+ columns separated by 2+ spaces or tabs
    const tokens = line.split(/\s{2,}|\t/).map(t => t.trim()).filter(Boolean);
    if (tokens.length >= 2) {
      if (!currentTable) {
        currentTable = { startLine: i + 1, headers: tokens, rows: [] };
      } else if (tokens.length === currentTable.headers.length) {
        const rowObj = {};
        currentTable.headers.forEach((h, hIdx) => {
          rowObj[h || `col_${hIdx + 1}`] = tokens[hIdx] || '';
        });
        currentTable.rows.push(rowObj);
      } else {
        if (currentTable.rows.length >= 1) {
          tableCandidates.push(currentTable);
        }
        currentTable = null;
      }
    } else {
      if (currentTable && currentTable.rows.length >= 1) {
        tableCandidates.push(currentTable);
      }
      currentTable = null;
    }
  }

  if (currentTable && currentTable.rows.length >= 1) {
    tableCandidates.push(currentTable);
  }

  return {
    format: 'PDF',
    pageCount: numPages,
    text: fullText,
    pages: pageChunks,
    metadata: {
      title: meta.Title || meta.title || '',
      author: meta.Author || meta.author || '',
      creator: meta.Creator || meta.creator || '',
      producer: meta.Producer || meta.producer || '',
      creationDate: meta.CreationDate || meta.creationDate || ''
    },
    tables: tableCandidates,
    isScanned: isScannedCandidate,
    ocrStatus,
    characterCount: fullText.length,
    wordCount: (fullText.match(/\b\w+\b/g) || []).length,
    warnings
  };
}

module.exports = {
  parsePdf
};
