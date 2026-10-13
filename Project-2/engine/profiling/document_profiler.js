/**
 * Format-Aware Document Profiler
 * Extracts deterministic document statistics, language, entities,
 * topics/keywords, structured facts, and traceable source references.
 * Explicitly separates extracted facts from AI interpretations.
 */

const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with',
  'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if',
  'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him',
  'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than',
  'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two',
  'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give',
  'day', 'most', 'us', 'is', 'are', 'was', 'were', 'been', 'has', 'had'
]);

function detectLanguage(text) {
  const sample = (text || '').toLowerCase().slice(0, 5000);
  const words = sample.match(/\b[a-z]{2,}\b/g) || [];
  if (words.length === 0) return { language: 'unknown', confidence: 0.0 };

  const langMatches = {
    english: ['the', 'and', 'to', 'of', 'in', 'is', 'that', 'for', 'with', 'as', 'on'],
    spanish: ['de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'se', 'del', 'las', 'por'],
    french: ['de', 'la', 'le', 'et', 'les', 'des', 'en', 'un', 'du', 'une', 'que', 'est'],
    german: ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des', 'auf']
  };

  const scores = {};
  for (const [lang, markers] of Object.entries(langMatches)) {
    let count = 0;
    markers.forEach(m => {
      const regex = new RegExp(`\\b${m}\\b`, 'g');
      count += (sample.match(regex) || []).length;
    });
    scores[lang] = count;
  }

  let bestLang = 'english';
  let maxScore = scores.english || 0;
  for (const [lang, s] of Object.entries(scores)) {
    if (s > maxScore) {
      maxScore = s;
      bestLang = lang;
    }
  }

  const confidence = words.length > 20 ? Math.min(1.0, Number((maxScore / (words.length * 0.3)).toFixed(2))) : 0.5;
  return { language: bestLang, confidence: Math.max(0.4, confidence) };
}

function extractEntities(text) {
  const entities = {
    emails: [],
    urls: [],
    phoneNumbers: [],
    monetaryValues: [],
    dates: [],
    organizationsOrProperNouns: []
  };

  if (!text) return entities;

  // Emails
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  entities.emails = Array.from(new Set(text.match(emailRegex) || [])).slice(0, 15);

  // URLs
  const urlRegex = /\bhttps?:\/\/[^\s/$.?#].[^\s]*\b/g;
  entities.urls = Array.from(new Set(text.match(urlRegex) || [])).slice(0, 15);

  // Phones
  const phoneRegex = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  entities.phoneNumbers = Array.from(new Set(text.match(phoneRegex) || [])).slice(0, 10);

  // Monetary
  const moneyRegex = /(?:[\$€£¥₹]\s*[\d,]+(?:\.\d{2})?|\b[\d,]+(?:\.\d{2})?\s*(?:USD|EUR|GBP|INR|JPY)\b)/g;
  entities.monetaryValues = Array.from(new Set(text.match(moneyRegex) || [])).slice(0, 20);

  // Dates
  const dateRegex = /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})\b/gi;
  entities.dates = Array.from(new Set(text.match(dateRegex) || [])).slice(0, 20);

  // Organizations / Title Case Candidates
  const orgRegex = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}(?:\s+(?:Inc|LLC|Corp|Corporation|Ltd|Group|Technologies|AI|Systems|Labs))?\b/g;
  const rawOrgs = text.match(orgRegex) || [];
  const filteredOrgs = rawOrgs.filter(o => !entities.dates.includes(o) && o.length > 5);
  entities.organizationsOrProperNouns = Array.from(new Set(filteredOrgs)).slice(0, 20);
  entities.organizations = entities.organizationsOrProperNouns;
  entities.currency = entities.monetaryValues;
  entities.phones = entities.phoneNumbers;

  return entities;
}

function extractKeywordsAndTopics(text, topN = 10) {
  if (!text) return [];

  const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const freqMap = new Map();

  words.forEach(w => {
    if (!STOP_WORDS.has(w)) {
      freqMap.set(w, (freqMap.get(w) || 0) + 1);
    }
  });

  return Array.from(freqMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([keyword, count]) => ({
      keyword,
      frequency: count,
      densityPct: Number(((count / Math.max(1, words.length)) * 100).toFixed(2))
    }));
}

function profileDocument(documentData, format = 'TXT') {
  const text = documentData?.text || '';
  const wordCount = documentData?.wordCount || (text.match(/\b\w+\b/g) || []).length;
  const characterCount = documentData?.characterCount || text.length;

  const langInfo = detectLanguage(text);
  const entities = extractEntities(text);
  const topics = extractKeywordsAndTopics(text, 10);

  // Structure references
  const sections = (documentData?.sections || []).map((s, idx) => ({
    id: `sec_${idx + 1}`,
    heading: s.heading || `Section ${idx + 1}`,
    level: s.level || 1,
    characterCount: (s.text || '').length,
    wordCount: ((s.text || '').match(/\b\w+\b/g) || []).length
  }));

  const tables = (documentData?.tables || []).map((t, idx) => ({
    tableId: `table_${idx + 1}`,
    sourceReference: t.sourceReference || `Table ${idx + 1}`,
    headers: t.headers || [],
    rowCount: (t.rows || []).length,
    sampleRows: (t.rows || []).slice(0, 3)
  }));

  // Extraction confidence calculation
  let extractionConfidence = 1.0;
  const warnings = [...(documentData?.warnings || [])];

  if (documentData?.isScanned) {
    extractionConfidence = 0.3;
    warnings.push('Document contains scanned pages. Factual extraction is limited by optical fidelity.');
  } else if (text.length === 0) {
    extractionConfidence = 0.0;
    warnings.push('Document text stream is completely empty.');
  } else if (wordCount < 10) {
    extractionConfidence = 0.5;
    warnings.push('Extracted word count is extremely low (< 10 words).');
  }

  // Classification and Grounded Summary
  const { classifyDocument, summarizeDocument } = require('../understanding/document_intelligence');
  const classification = classifyDocument(documentData);
  const summaryResult = summarizeDocument(documentData);

  return {
    format,
    classification,
    summary: summaryResult.summary,
    keyPoints: summaryResult.keyPoints,
    sourceCitations: summaryResult.sourceCitations,
    metrics: {
      wordCount,
      characterCount,
      pageCount: documentData?.pageCount || 1,
      sectionCount: sections.length,
      extractedTableCount: tables.length
    },
    wordCount,
    characterCount,
    metadata: documentData?.metadata || {},
    language: langInfo.language === 'english' ? 'en' : (langInfo.language === 'spanish' ? 'es' : (langInfo.language === 'french' ? 'fr' : (langInfo.language === 'german' ? 'de' : langInfo.language))),
    languageName: langInfo.language,
    languageConfidence: langInfo.confidence,
    entities,
    topKeywords: topics,
    sections,
    extractedTables: tables,
    extractionConfidence,
    warnings,
    factsVsInterpretationNotice: 'Extracted facts (entities, keywords, tables, metrics) are computed deterministically from document streams. No analytical claims have been hallucinated.'
  };
}

module.exports = {
  detectLanguage,
  extractEntities,
  extractKeywordsAndTopics,
  profileDocument
};
