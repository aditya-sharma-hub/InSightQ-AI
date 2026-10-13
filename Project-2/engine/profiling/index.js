const { profileTabular, isNumericValue, isDateValue, isBooleanValue } = require('./tabular_profiler');
const { profileDocument, extractEntities, extractKeywordsAndTopics, detectLanguage } = require('./document_profiler');

function profileData(ingestionResult) {
  if (!ingestionResult) {
    throw new Error('No ingestion result provided to profiler.');
  }

  const { format, category, primaryTable, documentData } = ingestionResult;

  let tabularProfile = null;
  let documentProfile = null;

  if (primaryTable && primaryTable.headers && primaryTable.rows) {
    tabularProfile = profileTabular(primaryTable.headers, primaryTable.rows);
  }

  if (documentData || category === 'unstructured' || category === 'document') {
    documentProfile = profileDocument(documentData || { text: '' }, format);
  }

  return {
    category,
    format,
    tabularProfile,
    documentProfile,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  profileData,
  profileTabular,
  profileDocument,
  tabular: {
    profileTabular,
    isNumericValue,
    isDateValue,
    isBooleanValue
  },
  document: {
    profileDocument,
    extractEntities,
    extractKeywordsAndTopics,
    detectLanguage
  },
  isNumericValue,
  isDateValue,
  isBooleanValue,
  extractEntities,
  extractKeywordsAndTopics,
  detectLanguage
};
