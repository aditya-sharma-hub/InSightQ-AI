/**
 * Format-Aware Text, Markdown & Log Adapter
 * Extracts document structure, markdown tables, sections, and structured log events.
 */

function parseMarkdownTables(text) {
  const tables = [];
  const lines = text.split(/\r?\n/);
  let currentTable = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.slice(1, -1).split('|').map(c => c.trim());
      if (!currentTable) {
        currentTable = { startLine: i + 1, headers: cells, rows: [] };
      } else if (cells.every(c => /^:?-+:?$/.test(c))) {
        // Separator row, skip
        continue;
      } else {
        const rowObj = {};
        currentTable.headers.forEach((h, idx) => {
          rowObj[h || `col_${idx + 1}`] = cells[idx] || '';
        });
        currentTable.rows.push(rowObj);
      }
    } else {
      if (currentTable && currentTable.rows.length > 0) {
        tables.push(currentTable);
      }
      currentTable = null;
    }
  }

  if (currentTable && currentTable.rows.length > 0) {
    tables.push(currentTable);
  }

  return tables;
}

function parseLogLines(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  const logRows = [];
  const KNOWN_LEVELS = new Set(['INFO', 'WARN', 'WARNING', 'ERROR', 'FATAL', 'DEBUG', 'TRACE', 'CRITICAL', 'NOTICE']);

  lines.forEach((line, idx) => {
    const tsMatch = line.match(/^(\d{4}[-\/]\d{2}[-\/]\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\s*(.*)$/);
    if (tsMatch) {
      const timestamp = tsMatch[1];
      let remainder = tsMatch[2];
      let level = 'INFO';
      let component = '';

      const brackets = [];
      const bRegex = /\[([^\]]+)\]/g;
      let bMatch;
      while ((bMatch = bRegex.exec(remainder)) !== null) {
        brackets.push(bMatch[1]);
      }

      if (brackets.length > 0) {
        for (const b of brackets) {
          if (KNOWN_LEVELS.has(b.toUpperCase())) {
            level = b.toUpperCase();
          } else if (!component) {
            component = b;
          }
        }
        remainder = remainder.replace(/\[[^\]]+\]/g, '').trim();
      } else {
        const lvlMatch = remainder.match(/\b(INFO|WARN|WARNING|ERROR|FATAL|DEBUG|TRACE)\b/i);
        if (lvlMatch) {
          level = lvlMatch[1].toUpperCase();
          remainder = remainder.replace(lvlMatch[0], '').trim();
        }
      }

      const message = remainder.replace(/^[:\-]\s*/, '').trim();

      logRows.push({
        line: idx + 1,
        timestamp,
        component,
        level,
        message
      });
    } else {
      logRows.push({
        line: idx + 1,
        timestamp: '',
        component: '',
        level: 'LOG',
        message: line
      });
    }
  });

  return logRows;
}

function parseTextDocument(text, format = 'TXT') {
  if (!text || typeof text !== 'string') {
    return {
      text: '',
      sections: [],
      tables: [],
      structuredRows: [],
      characterCount: 0,
      wordCount: 0,
      lineCount: 0
    };
  }

  const cleanText = text.replace(/^\uFEFF/, '');
  const lines = cleanText.split(/\r?\n/);
  const wordCount = (cleanText.match(/\b\w+\b/g) || []).length;
  const characterCount = cleanText.length;

  const sections = [];
  let currentSection = { heading: 'Document Start', level: 1, startLine: 1, content: [] };

  lines.forEach((line, idx) => {
    const trimmedLine = line.trim();
    const mdHeadingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
    const txtHeadingMatch = !mdHeadingMatch && (
      trimmedLine.match(/^[=\-]{3,}\s*(.+?)\s*[=\-]{3,}$/) ||
      trimmedLine.match(/^(?:SECTION|CHAPTER|PART)\s+\d+[:\s]+(.+)$/i) ||
      (trimmedLine.length > 3 && trimmedLine.length < 50 && /^[A-Z0-9\s]{4,}:$/.test(trimmedLine) ? [null, trimmedLine.replace(/:$/, '')] : null)
    );

    const headingMatch = mdHeadingMatch || txtHeadingMatch;

    if (headingMatch) {
      if (currentSection.content.length > 0) {
        sections.push({
          ...currentSection,
          text: currentSection.content.join('\n').trim()
        });
      }
      currentSection = {
        heading: (headingMatch[2] || headingMatch[1]).trim(),
        level: mdHeadingMatch ? mdHeadingMatch[1].length : 2,
        startLine: idx + 1,
        content: []
      };
    } else {
      currentSection.content.push(line);
    }
  });

  if (currentSection.content.length > 0) {
    sections.push({
      ...currentSection,
      text: currentSection.content.join('\n').trim()
    });
  }

  // Markdown tables
  const tables = format === 'MD' ? parseMarkdownTables(cleanText) : [];

  // Log rows if format is LOG or log patterns exist
  const isLog = format === 'LOG' || lines.some(l => /\[(INFO|WARN|ERROR)\]/i.test(l));
  const structuredRows = isLog ? parseLogLines(cleanText) : [];

  return {
    text: cleanText,
    format,
    sections,
    tables,
    structuredRows: structuredRows.length > 0 ? structuredRows : null,
    characterCount,
    wordCount,
    lineCount: lines.length
  };
}

module.exports = {
  parseMarkdownTables,
  parseLogLines,
  parseTextDocument
};
