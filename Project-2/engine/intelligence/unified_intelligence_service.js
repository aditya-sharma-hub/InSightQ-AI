/**
 * InsightIQ AI — Phase D: Unified Intelligence Service
 * Orchestrates natural-language analytics across authorized tabular datasets
 * and document collections with verifiable grounding, lineage, and security.
 */

const { defaultCatalog, AccessDeniedError } = require('./unified_catalog');
const { planQuery } = require('./nl_query_planner');
const { executeCrossSourceAnalysis } = require('./cross_source_engine');
const { generateGroundedAnswer } = require('./evidence_grounded_answerer');
const { answerDocumentQuestion, buildDocumentIndex } = require('../understanding/document_intelligence');
const { computeCorrelationAndCovariance, computeDescriptiveStatistics } = require('../analysis/statistical_engine');

/**
 * Execute real tabular aggregation operation
 */
function executeTabularAggregation(operation, source) {
  const rows = source.rows || [];
  const metricField = operation.metricField;
  const groupByField = operation.groupByField;
  const aggType = operation.aggregation || 'sum';

  if (!metricField && !groupByField) {
    return {
      available: true,
      sourceName: source.name,
      sampleSize: rows.length,
      isGrouped: false,
      aggregation: 'count',
      value: rows.length
    };
  }

  // Parse numeric value safely
  const parseNum = (v) => {
    if (typeof v === 'number') return v;
    if (v === null || v === undefined) return null;
    const n = parseFloat(String(v).replace(/[$€£¥,]/g, '').trim());
    return isNaN(n) ? null : n;
  };

  if (groupByField) {
    const groupMap = new Map();
    let totalMetricSum = 0;
    let validRowCount = 0;

    rows.forEach(r => {
      const gKey = String(r[groupByField] ?? 'Unknown').trim();
      if (!gKey) return;

      const rawVal = metricField ? r[metricField] : 1;
      const val = parseNum(rawVal);
      if (val === null && metricField) return;

      validRowCount += 1;
      const numVal = val !== null ? val : 1;
      totalMetricSum += numVal;

      const cur = groupMap.get(gKey) || { key: gKey, sum: 0, count: 0, min: Infinity, max: -Infinity };
      cur.count += 1;
      cur.sum += numVal;
      if (numVal < cur.min) cur.min = numVal;
      if (numVal > cur.max) cur.max = numVal;
      groupMap.set(gKey, cur);
    });

    const groups = Array.from(groupMap.values()).map(g => {
      let finalVal = g.sum;
      if (aggType === 'avg' && g.count > 0) finalVal = g.sum / g.count;
      else if (aggType === 'max') finalVal = g.max;
      else if (aggType === 'min') finalVal = g.min;
      else if (aggType === 'count') finalVal = g.count;

      return {
        key: g.key,
        value: Number(finalVal.toFixed(2)),
        count: g.count,
        sharePct: totalMetricSum > 0 ? (g.sum / totalMetricSum) * 100 : 0
      };
    });

    // Apply sorting
    if (operation.sort === 'asc') {
      groups.sort((a, b) => a.value - b.value);
    } else {
      groups.sort((a, b) => b.value - a.value);
    }

    const limit = operation.limit || groups.length;
    return {
      available: true,
      sourceName: source.name,
      sampleSize: validRowCount,
      isGrouped: true,
      metricField,
      groupByField,
      aggregation: aggType,
      groups: groups.slice(0, limit),
      totalGroupsCount: groups.length
    };
  }

  // Single metric overall aggregation
  let totalSum = 0;
  let validCount = 0;
  let minVal = Infinity;
  let maxVal = -Infinity;

  rows.forEach(r => {
    const val = parseNum(r[metricField]);
    if (val !== null) {
      validCount += 1;
      totalSum += val;
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    }
  });

  let overallVal = totalSum;
  if (aggType === 'avg' && validCount > 0) overallVal = totalSum / validCount;
  else if (aggType === 'max') overallVal = maxVal;
  else if (aggType === 'min') overallVal = minVal;
  else if (aggType === 'count') overallVal = validCount;

  return {
    available: true,
    sourceName: source.name,
    sampleSize: validCount,
    isGrouped: false,
    metricField,
    aggregation: aggType,
    value: Number(overallVal.toFixed(2))
  };
}

/**
 * Main Entry Point: Execute Natural-Language Analytics Query
 */
async function executeNaturalLanguageQuery(query, userContext = {}, options = {}) {
  const startTime = Date.now();
  const catalog = userContext.catalog || defaultCatalog;
  const userId = userContext.userId || null;

  try {
    // 1. Generate Structured Inspectable Plan
    const plan = planQuery(query, catalog, userContext, options);

    // 2. Ambiguity & Limit Exit
    if (plan.isAmbiguous) {
      const grounded = await generateGroundedAnswer(plan, {}, catalog, options);
      return {
        success: true,
        plan,
        ...grounded,
        executionTimeMs: Date.now() - startTime
      };
    }

    let executionResult = { available: false };

    // 3. Dispatch Plan to Whitelisted Analytical Engines
    if (plan.intent === 'cross_source') {
      executionResult = executeCrossSourceAnalysis(plan, catalog, userContext);
    } else if (plan.intent === 'document_qa') {
      const source = catalog.getSource(plan.targetSources[0], userId);
      if (source && source.documentData) {
        let docIndex = source.documentData.index;
        if (!docIndex && (source.documentData.chunks || source.documentData.pages || source.documentData.sections)) {
          const docPayload = {
            id: source.id,
            filename: source.name,
            documentData: source.documentData,
            chunks: source.documentData.chunks || [],
            pages: source.documentData.pages || [],
            sections: source.documentData.sections || []
          };
          docIndex = buildDocumentIndex(docPayload);
        }
        if (docIndex) {
          executionResult = await answerDocumentQuestion(docIndex, plan.originalQuery, options);
          executionResult.sourceNames = [source.name];
        }
      }
    } else if (plan.intent === 'aggregation') {
      const source = catalog.getSource(plan.targetSources[0], userId);
      if (source) {
        const op = plan.operations[0];
        executionResult = executeTabularAggregation(op, source);
      }
    } else if (plan.intent === 'correlation') {
      const source = catalog.getSource(plan.targetSources[0], userId);
      if (source && source.rows) {
        const headers = source.schema.columns.map(c => typeof c === 'string' ? c : c.column_name || c.name);
        const corrRes = computeCorrelationAndCovariance(headers, source.rows);
        executionResult = {
          ...corrRes,
          sourceName: source.name
        };
      }
    } else {
      // General dataset overview
      const source = plan.targetSources[0] ? catalog.getSource(plan.targetSources[0], userId) : null;
      if (source) {
        executionResult = {
          available: true,
          sourceName: source.name,
          sampleSize: source.provenance?.rowCount || (source.rows ? source.rows.length : 0)
        };
      }
    }

    // 4. Ground Answer with Verified Facts & Citations
    const grounded = await generateGroundedAnswer(plan, executionResult, catalog, options);

    return {
      success: true,
      plan,
      ...grounded,
      executionResult,
      executionTimeMs: Date.now() - startTime
    };
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return {
        success: false,
        error: err.message,
        status: 403,
        executionTimeMs: Date.now() - startTime
      };
    }
    console.error('[Unified Intelligence Error]:', err);
    return {
      success: false,
      error: err.message || 'An error occurred during analytical query execution.',
      status: 500,
      executionTimeMs: Date.now() - startTime
    };
  }
}

module.exports = {
  executeNaturalLanguageQuery,
  executeTabularAggregation
};
