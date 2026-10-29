const {
  understandDatasetSemantics,
  sanitizeUntrustedText,
  buildMinimizedDigest,
  generateDeterministicFallback,
  generateDeterministicUnderstanding,
  redactPII,
  neutralizePromptInjection
} = require('./ai_understanding');

const {
  classifyDocument,
  summarizeDocument,
  buildDocumentIndex,
  searchDocumentIndex,
  answerDocumentQuestion,
  compareDocuments,
  tokenizeText,
  DOMAIN_PROFILES
} = require('./document_intelligence');

module.exports = {
  understandDatasetSemantics,
  sanitizeUntrustedText,
  buildMinimizedDigest,
  generateDeterministicFallback,
  generateDeterministicUnderstanding,
  redactPII,
  neutralizePromptInjection,
  classifyDocument,
  summarizeDocument,
  buildDocumentIndex,
  searchDocumentIndex,
  answerDocumentQuestion,
  compareDocuments,
  tokenizeText,
  DOMAIN_PROFILES
};
