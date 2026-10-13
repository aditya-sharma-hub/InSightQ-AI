const AdmZip = require('adm-zip');

/**
 * Format-Aware DOCX Adapter
 * Parses Microsoft Word OpenXML archives, extracting text, headings,
 * embedded tables (w:tbl), and metadata (docProps/core.xml).
 */

function extractDocxTables(documentXml) {
  const tables = [];
  // Match all <w:tbl> blocks
  const tblRegex = /<w:tbl[\s\S]*?<\/w:tbl>/g;
  const tblMatches = documentXml.match(tblRegex) || [];

  tblMatches.forEach((tblXml, tIdx) => {
    // Match rows <w:tr>
    const trRegex = /<w:tr[\s\S]*?<\/w:tr>/g;
    const trMatches = tblXml.match(trRegex) || [];
    const grid = [];

    trMatches.forEach(trXml => {
      // Match cells <w:tc>
      const tcRegex = /<w:tc[\s\S]*?<\/w:tc>/g;
      const tcMatches = trXml.match(tcRegex) || [];
      const rowCells = [];

      tcMatches.forEach(tcXml => {
        // Match text runs <w:t>
        const tRegex = /<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/g;
        let cellText = '';
        let tMatch;
        while ((tMatch = tRegex.exec(tcXml)) !== null) {
          cellText += tMatch[1];
        }
        rowCells.push(cellText.trim());
      });

      if (rowCells.some(c => c.length > 0)) {
        grid.push(rowCells);
      }
    });

    if (grid.length >= 2) {
      const headers = grid[0].map((h, i) => h || `col_${i + 1}`);
      const rows = [];
      for (let r = 1; r < grid.length; r++) {
        const rowObj = {};
        headers.forEach((h, i) => {
          rowObj[h] = grid[r][i] !== undefined ? grid[r][i] : '';
        });
        rows.push(rowObj);
      }
      tables.push({
        tableIndex: tIdx + 1,
        headers,
        rows
      });
    }
  });

  return tables;
}

function parseDocx(buffer, options = {}) {
  if (!buffer || buffer.length === 0) {
    throw new Error('Empty DOCX buffer.');
  }

  const warnings = [];
  let zip;
  try {
    zip = new AdmZip(buffer);
  } catch (err) {
    throw new Error(`Failed to read DOCX as zip archive: ${err.message}`);
  }

  // 1. Read document.xml
  const docEntry = zip.getEntry('word/document.xml');
  if (!docEntry) {
    throw new Error('Invalid DOCX: Missing word/document.xml entry.');
  }
  const docXml = docEntry.getData().toString('utf8');

  // 2. Read metadata from docProps/core.xml if present
  const meta = { title: '', creator: '', description: '', created: '' };
  const coreEntry = zip.getEntry('docProps/core.xml');
  if (coreEntry) {
    const coreXml = coreEntry.getData().toString('utf8');
    const titleMatch = coreXml.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/);
    if (titleMatch) meta.title = titleMatch[1].trim();
    const creatorMatch = coreXml.match(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/);
    if (creatorMatch) meta.creator = creatorMatch[1].trim();
    const createdMatch = coreXml.match(/<dcterms:created[^>]*>([\s\S]*?)<\/dcterms:created>/);
    if (createdMatch) meta.created = createdMatch[1].trim();
  }

  // 3. Extract text paragraphs and sections
  const paragraphs = [];
  const sections = [];
  let currentSection = { heading: 'Document Introduction', level: 1, text: '' };

  const pRegex = /<w:p[\s\S]*?<\/w:p>/g;
  const pMatches = docXml.match(pRegex) || [];

  pMatches.forEach((pXml, pIdx) => {
    // Check if heading or title style
    const isHeading = /<w:pStyle\s+w:val="(?:Heading(\d+)|Title|Subtitle)"/i.exec(pXml);
    // Extract text runs
    const tRegex = /<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/g;
    let pText = '';
    let tMatch;
    while ((tMatch = tRegex.exec(pXml)) !== null) {
      pText += tMatch[1];
    }
    pText = pText.trim();
    if (!pText) return;

    if (isHeading) {
      const level = isHeading[1] ? parseInt(isHeading[1], 10) : 1;
      if (currentSection.text.trim().length > 0 || currentSection.heading !== 'Document Introduction') {
        sections.push({ ...currentSection, text: currentSection.text.trim() });
      }
      currentSection = { heading: pText, level, text: '' };
    } else {
      currentSection.text += (currentSection.text ? '\n' : '') + pText;
      paragraphs.push(pText);
    }
  });

  if (currentSection.text.trim() || (currentSection.heading && currentSection.heading !== 'Document Introduction')) {
    sections.push({ ...currentSection, text: currentSection.text.trim() });
  }

  const fullText = paragraphs.join('\n\n');

  // 4. Extract tables
  const tables = extractDocxTables(docXml);
  if (tables.length > 0) {
    warnings.push(`Extracted ${tables.length} structured tables from DOCX.`);
  }

  return {
    format: 'DOCX',
    text: fullText,
    metadata: meta,
    sections,
    tables,
    paragraphCount: paragraphs.length,
    characterCount: fullText.length,
    wordCount: (fullText.match(/\b\w+\b/g) || []).length,
    warnings
  };
}

module.exports = {
  extractDocxTables,
  parseDocx
};
