/**
 * InsightIQ AI — Phase D: Unified Intelligence Engine Exports
 */

const { UnifiedCatalog, defaultCatalog, AccessDeniedError, ValidationError } = require('./unified_catalog');
const { planQuery, resolveColumnName, ALLOWED_OPERATIONS } = require('./nl_query_planner');
const { executeCrossSourceAnalysis } = require('./cross_source_engine');
const { generateGroundedAnswer, formatValue } = require('./evidence_grounded_answerer');
const { executeNaturalLanguageQuery, executeTabularAggregation } = require('./unified_intelligence_service');

module.exports = {
  UnifiedCatalog,
  defaultCatalog,
  AccessDeniedError,
  ValidationError,
  planQuery,
  resolveColumnName,
  ALLOWED_OPERATIONS,
  executeCrossSourceAnalysis,
  generateGroundedAnswer,
  formatValue,
  executeNaturalLanguageQuery,
  executeTabularAggregation
};
