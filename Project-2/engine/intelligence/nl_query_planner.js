/**
 * InsightIQ AI — Phase D: Natural-Language Query Planner
 * Parses user questions into structured, inspectable execution plans.
 * Identifies target sources, fields, filters, aggregations, and joins.
 * Enforces strict safety, detects ambiguity, and validates relationships.
 */

const { neutralizePromptInjection, redactPII } = require('../understanding/ai_understanding');

/**
 * Whitelist of permitted analytical operations.
 * Arbitrary SQL, shell commands, or mutations are strictly disallowed.
 */
const ALLOWED_OPERATIONS = new Set([
  'aggregate',
  'filter',
  'group_by',
  'sort',
  'limit',
  'descriptive_stats',
  'correlation',
  'document_qa',
  'cross_source_reasoning'
]);

/**
 * Normalize string for fuzzy attribute matching
 */
function normalizeIdentifier(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Find closest column match in a schema
 */
function resolveColumnName(token, availableColumns) {
  if (!token || !Array.isArray(availableColumns) || availableColumns.length === 0) return null;
  const normToken = normalizeIdentifier(token);

  // Exact match
  for (const col of availableColumns) {
    const colName = typeof col === 'string' ? col : col.column_name || col.name || '';
    if (normalizeIdentifier(colName) === normToken) {
      return colName;
    }
  }

  // Common synonym mappings
  const SYNONYMS = {
    revenue: ['sales', 'totalsales', 'amount', 'orderitemtotal', 'revenue'],
    sales: ['sales', 'revenue', 'amount', 'totalsales', 'orderitemtotal'],
    profit: ['orderprofitperorder', 'profit', 'netprofit', 'margin'],
    cost: ['orderitemproductprice', 'cost', 'productcost', 'expenses'],
    country: ['ordercountry', 'customercountry', 'country', 'region'],
    customer: ['customername', 'customerid', 'customer', 'client'],
    category: ['categoryname', 'category', 'productcategory'],
    product: ['productname', 'product', 'item'],
    date: ['orderdate', 'date', 'timestamp', 'period'],
    quantity: ['orderitemquantity', 'quantity', 'count', 'units']
  };

  const candidateSynonyms = SYNONYMS[normToken] || [normToken];
  for (const col of availableColumns) {
    const colName = typeof col === 'string' ? col : col.column_name || col.name || '';
    const normCol = normalizeIdentifier(colName);
    if (candidateSynonyms.some(syn => normCol.includes(syn) || syn.includes(normCol))) {
      return colName;
    }
  }

  // Substring match
  for (const col of availableColumns) {
    const colName = typeof col === 'string' ? col : col.column_name || col.name || '';
    const normCol = normalizeIdentifier(colName);
    if (normCol.includes(normToken) || normToken.includes(normCol)) {
      return colName;
    }
  }

  return null;
}

/**
 * Parse and plan natural-language analytics question
 */
function planQuery(rawQuery, catalog, userContext = {}, options = {}) {
  const userId = userContext.userId || null;
  const activeSourceId = userContext.activeSourceId || null;

  // 1. Sanitize query against prompt injection and PII leakage
  const cleanQuery = neutralizePromptInjection(redactPII(rawQuery || '')).trim();

  const plan = {
    planId: `plan-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    originalQuery: rawQuery,
    sanitizedQuery: cleanQuery,
    intent: 'general_query',
    targetSources: [],
    operations: [],
    filters: [],
    groupBy: [],
    metrics: [],
    isAmbiguous: false,
    clarificationMessage: null,
    missingFields: [],
    suggestedAlternatives: [],
    requiresRelationship: null,
    safetyStatus: { isSafe: true, reason: 'Passed read-only whitelist' },
    createdAt: new Date().toISOString()
  };

  // 2. Safety & Prompt Injection Check
  if (/(\bDROP\b|\bDELETE\b|\bUPDATE\b|\bINSERT\b|\bALTER\b|\bEXEC\b|\bSYSTEM\b|--|;\s*DROP)/i.test(rawQuery)) {
    plan.safetyStatus = {
      isSafe: false,
      reason: 'Query contains forbidden SQL mutation or shell instruction tokens.'
    };
    plan.isAmbiguous = true;
    plan.clarificationMessage = 'Potentially destructive or privileged operations are blocked. Please specify a read-only analytical query.';
    return plan;
  }

  if (!cleanQuery) {
    plan.isAmbiguous = true;
    plan.clarificationMessage = 'Please enter an analytical question or specify what data you would like to explore.';
    return plan;
  }

  // 3. Resolve Available Sources for the User
  const userSources = userId ? catalog.listSources(userId) : [];
  let targetSource = null;

  if (activeSourceId) {
    targetSource = catalog.getSource(activeSourceId, userId);
  }
  if (!targetSource && userSources.length > 0) {
    // Check if query mentions a source by name
    const qLower = cleanQuery.toLowerCase();
    const matched = userSources.find(s => qLower.includes(s.name.toLowerCase()));
    if (matched) {
      targetSource = catalog.getSource(matched.id, userId);
    } else {
      targetSource = catalog.getSource(userSources[0].id, userId);
    }
  }

  // 4. Intent Classification
  const qLower = cleanQuery.toLowerCase();

  // Ambiguity Check: Underspecified questions
  const underspecifiedPatterns = [
    /\bwhat is (?:the\s+)?(?:best|better|worst)(?:\s+one)?\??$/i,
    /\bwhich (?:one\s+is\s+)?(?:best|better|worst)\??$/i,
    /^show me\??$/i,
    /^tell me about it\??$/i,
    /^is it good\??$/i,
    /^compare(?:\s+them)?\??$/i
  ];
  if (underspecifiedPatterns.some(p => p.test(cleanQuery.trim()))) {
    plan.isAmbiguous = true;
    plan.intent = 'ambiguous';
    plan.clarificationMessage = `Your question "${cleanQuery}" is underspecified. Please specify which metric or dimension you would like to evaluate (e.g., "highest revenue by category" or "top country by profit").`;
    plan.suggestedAlternatives = [
      'Top 5 categories by sales revenue',
      'Average order profit per country',
      'Correlation between marketing spend and conversions'
    ];
    return plan;
  }

  // Cross-source detection: Does query ask to relate a tabular dataset and a document or two datasets?
  const compareTerms = ['compare', 'reconcile', 'cross reference', 'match', 'vs', 'versus'];
  const hasCompare = compareTerms.some(t => qLower.includes(t));
  const crossSourceKeywords = ['contract', 'agreement', 'policy', 'sla', 'vendor terms', 'audit report'];
  const hasDocRef = crossSourceKeywords.some(k => qLower.includes(k));
  const otherSources = userSources.filter(s => targetSource && s.id !== targetSource.id);

  const shouldTriggerCrossSource = Boolean(targetSource && otherSources.length > 0 && (
    (targetSource.type === 'tabular' && (hasCompare || (hasDocRef && otherSources.some(s => s.type === 'document')))) ||
    (targetSource.type === 'document' && (hasCompare || otherSources.some(s => s.type === 'tabular' && (qLower.includes('transaction') || qLower.includes('order') || qLower.includes('sales') || qLower.includes('dataset') || qLower.includes('tabular')))))
  ));

  if (shouldTriggerCrossSource) {
    // Check for a document source in user's catalog
    const docSource = targetSource.type === 'tabular'
      ? (otherSources.find(s => s.type === 'document') || otherSources[0])
      : (otherSources.find(s => s.type === 'tabular') || otherSources[0]);

    // Check if an explicit validated relationship exists between them
    const existingRel = catalog.hasValidatedRelationship(targetSource.id, docSource.id, userId);
    if (!existingRel) {
      plan.intent = 'cross_source_unvalidated';
      plan.isAmbiguous = true;
      plan.clarificationMessage = `Cannot combine "${targetSource.name}" with "${docSource.name}". An explicit validated relationship between these sources is required before cross-source reasoning can proceed.`;
      plan.suggestedAlternatives = [
        `Register an explicit relationship between ${targetSource.name} and ${docSource.name} in the Data Catalog.`,
        `Ask about "${targetSource.name}" or "${docSource.name}" individually.`
      ];
      return plan;
    }

    plan.intent = 'cross_source';
    plan.targetSources = [targetSource.id, docSource.id];
    plan.requiresRelationship = existingRel;
    plan.operations.push({
      type: 'cross_source_reasoning',
      sourceA: targetSource.id,
      sourceB: docSource.id,
      relationshipId: existingRel.id,
      keyA: existingRel.keyA,
      keyB: existingRel.keyB
    });
    return plan;
  }

  // Document QA intent if target is document
  if (targetSource && targetSource.type === 'document') {
    plan.intent = 'document_qa';
    plan.targetSources = [targetSource.id];
    plan.operations.push({
      type: 'document_qa',
      sourceId: targetSource.id,
      query: cleanQuery
    });
    return plan;
  }

  // Tabular Analysis Intents
  if (targetSource && targetSource.type === 'tabular') {
    plan.targetSources = [targetSource.id];
    const availableCols = targetSource.schema.columns;

    // Detect Correlation
    if (qLower.includes('correlat') || qLower.includes('relationship between') || qLower.includes('co-movement')) {
      plan.intent = 'correlation';
      // Try to find two numeric fields mentioned
      const numericCols = availableCols.filter(c => typeof c === 'object' ? c.is_numeric : true);
      const mentioned = numericCols.filter(c => {
        const name = typeof c === 'string' ? c : c.column_name || c.name || '';
        return qLower.includes(name.toLowerCase());
      });
      plan.operations.push({
        type: 'correlation',
        sourceId: targetSource.id,
        fields: mentioned.slice(0, 2).map(c => typeof c === 'string' ? c : c.column_name || c.name)
      });
      return plan;
    }

    // Detect Aggregation / Grouping
    const isSum = /\b(total|sum)\b/i.test(qLower);
    const isAvg = /\b(average|mean|avg)\b/i.test(qLower);
    const isMax = /\b(highest|top|maximum|max|most)\b/i.test(qLower);
    const isMin = /\b(lowest|minimum|min|least)\b/i.test(qLower);
    const isCount = /\b(how many|count|number of)\b/i.test(qLower);

    const aggOp = isAvg ? 'avg' : isMax ? 'max' : isMin ? 'min' : isCount ? 'count' : 'sum';

    // Find metric column
    let metricCol = null;
    if (qLower.includes('revenue') || qLower.includes('sales')) metricCol = resolveColumnName('sales', availableCols);
    else if (qLower.includes('profit')) metricCol = resolveColumnName('profit', availableCols);
    else if (qLower.includes('quantity') || qLower.includes('volume')) metricCol = resolveColumnName('quantity', availableCols);
    else if (qLower.includes('cost')) metricCol = resolveColumnName('cost', availableCols);
    else if (qLower.includes('amount')) metricCol = resolveColumnName('amount', availableCols);

    // Search for any column name mentioned in query
    if (!metricCol) {
      for (const col of availableCols) {
        const colName = typeof col === 'string' ? col : col.column_name || col.name || '';
        if (!colName) continue;
        const normCol = normalizeIdentifier(colName);
        if (qLower.replace(/[^a-z0-9]/g, '').includes(normCol)) {
          const isNum = typeof col === 'object' ? (col.is_numeric || col.canonical_type === 'number') : true;
          if (isNum) {
            metricCol = colName;
            break;
          }
        }
      }
    }

    // Find group-by dimension
    let groupCol = null;
    const byMatch = qLower.match(/\b(?:by|per|across|for\s+each|grouped\s+by)\s+([a-z0-9_]+)/i);
    if (byMatch) {
      groupCol = resolveColumnName(byMatch[1], availableCols);
    }
    if (!groupCol) {
      if (qLower.includes('country')) groupCol = resolveColumnName('country', availableCols);
      else if (qLower.includes('category')) groupCol = resolveColumnName('category', availableCols);
      else if (qLower.includes('product')) groupCol = resolveColumnName('product', availableCols);
      else if (qLower.includes('customer')) groupCol = resolveColumnName('customer', availableCols);
      else if (qLower.includes('vendor')) groupCol = resolveColumnName('vendor', availableCols);
    }
    if (!groupCol) {
      for (const col of availableCols) {
        const colName = typeof col === 'string' ? col : col.column_name || col.name || '';
        if (!colName || colName === metricCol) continue;
        const normCol = normalizeIdentifier(colName);
        if (qLower.replace(/[^a-z0-9]/g, '').includes(normCol)) {
          groupCol = colName;
          break;
        }
      }
    }

    // If query asked for a metric that doesn't exist, flag ambiguity
    if (!metricCol && (qLower.includes('margin') || qLower.includes('churn') || qLower.includes('retention') || qLower.includes('discount rate'))) {
      plan.isAmbiguous = true;
      plan.intent = 'missing_field_ambiguity';
      const colNames = availableCols.map(c => typeof c === 'string' ? c : c.column_name || c.name);
      plan.clarificationMessage = `The requested metric does not exist in dataset "${targetSource.name}". Available columns are: ${colNames.slice(0, 6).join(', ')}.`;
      plan.suggestedAlternatives = colNames.slice(0, 3).map(c => `Analyze ${c}`);
      return plan;
    }

    // Default metric column if none found but aggregation was requested
    if (!metricCol && (isSum || isAvg || isMax || isMin)) {
      const numCol = availableCols.find(c => typeof c === 'object' ? (c.is_numeric || c.canonical_type === 'number') : false) || availableCols[0];
      metricCol = typeof numCol === 'string' ? numCol : numCol?.column_name || numCol?.name || 'sales';
    }

    if (groupCol || metricCol) {
      plan.intent = 'aggregation';
      const op = {
        type: 'aggregate',
        sourceId: targetSource.id,
        metricField: metricCol,
        groupByField: groupCol,
        aggregation: aggOp
      };

      if (isMax || qLower.includes('top')) {
        op.sort = 'desc';
        const limitMatch = qLower.match(/\btop\s+(\d+)\b/);
        op.limit = limitMatch ? parseInt(limitMatch[1], 10) : 5;
      } else if (isMin) {
        op.sort = 'asc';
        op.limit = 5;
      }

      plan.operations.push(op);
      return plan;
    }
  }

  // General summary intent
  plan.intent = 'general_summary';
  plan.operations.push({
    type: 'descriptive_stats',
    sourceId: targetSource ? targetSource.id : null
  });

  return plan;
}

module.exports = {
  planQuery,
  resolveColumnName,
  ALLOWED_OPERATIONS
};
