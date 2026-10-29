/**
 * InsightIQ AI — Phase D: Cross-Source Reasoning & Discrepancy Detection Engine
 * Integrates tabular datasets and document collections strictly through validated relationships.
 * Compares empirical measurements against contractual or policy terms.
 * Detects discrepancies, preserves lineage, and computes combined facts.
 */

const { searchDocumentIndex } = require('../understanding/document_intelligence');

/**
 * Execute cross-source reasoning between a tabular dataset and a document source
 */
function executeCrossSourceAnalysis(plan, catalog, userContext = {}) {
  const userId = userContext.userId || null;
  const relationship = plan.requiresRelationship;

  if (!relationship) {
    return {
      available: false,
      reason: 'Cross-source reasoning requires an explicit, validated relationship between sources.'
    };
  }

  // 1. Retrieve both sources verifying tenant authorization
  const sourceA = catalog.getSource(relationship.sourceAId, userId);
  const sourceB = catalog.getSource(relationship.sourceBId, userId);

  if (!sourceA || !sourceB) {
    return {
      available: false,
      reason: 'One or both sources could not be found or access was unauthorized.'
    };
  }

  // Designate which source is tabular and which is document
  const tabularSource = sourceA.type === 'tabular' ? sourceA : (sourceB.type === 'tabular' ? sourceB : null);
  const documentSource = sourceA.type === 'document' ? sourceA : (sourceB.type === 'document' ? sourceB : null);

  if (!tabularSource || !documentSource) {
    return {
      available: false,
      reason: 'Cross-source reasoning currently supports connecting a tabular dataset with a document knowledge collection.'
    };
  }

  const joinKeyTabular = tabularSource.id === sourceA.id ? relationship.keyA : relationship.keyB;
  const joinKeyDocument = documentSource.id === sourceA.id ? relationship.keyA : relationship.keyB;

  const rows = tabularSource.rows || [];
  const docData = documentSource.documentData || {};

  // 2. Perform Tabular Aggregations & Metrics on the Join Key
  const entitiesMap = new Map();
  let overallTabularCount = 0;

  rows.forEach(r => {
    const rawEntity = r[joinKeyTabular];
    if (rawEntity !== undefined && rawEntity !== null && String(rawEntity).trim() !== '') {
      const entity = String(rawEntity).trim();
      const current = entitiesMap.get(entity) || {
        entity,
        count: 0,
        numericSums: {},
        numericCounts: {},
        records: []
      };

      current.count += 1;
      overallTabularCount += 1;

      // Accumulate numeric fields
      Object.keys(r).forEach(k => {
        const val = r[k];
        if (typeof val === 'number' || (!isNaN(parseFloat(val)) && isFinite(val))) {
          const num = typeof val === 'number' ? val : parseFloat(val);
          current.numericSums[k] = (current.numericSums[k] || 0) + num;
          current.numericCounts[k] = (current.numericCounts[k] || 0) + 1;
        }
      });

      if (current.records.length < 5) current.records.push(r);
      entitiesMap.set(entity, current);
    }
  });

  // 3. Search and Ground Document Evidence for Joined Entities
  const documentIndex = docData.index || null;
  const documentChunks = docData.chunks || [];
  const crossSourceFindings = [];
  const discrepancies = [];

  // Inspect entities
  for (const [entityName, tabData] of entitiesMap.entries()) {
    // Search document for terms related to this entity
    let matchingPassages = [];
    if (documentIndex) {
      matchingPassages = searchDocumentIndex(documentIndex, `${entityName} ${joinKeyDocument}`, { limit: 3 });
    } else if (documentChunks.length > 0) {
      matchingPassages = documentChunks
        .filter(c => c.text && c.text.toLowerCase().includes(entityName.toLowerCase()))
        .slice(0, 3)
        .map(c => ({
          text: c.text,
          metadata: {
            page: c.page || 1,
            section: c.section || 'General',
            sourceName: documentSource.name
          }
        }));
    }

    if (matchingPassages.length === 0) continue;

    // Check for metric comparisons (e.g. discount rates, SLAs, delivery days, price caps)
    const combinedEntityResult = {
      entity: entityName,
      tabularSummary: {
        totalTransactions: tabData.count,
        sampleMetrics: {}
      },
      documentEvidence: matchingPassages.map(p => ({
        passageText: p.text.slice(0, 250),
        citation: `[${p.metadata.sourceName || documentSource.name}, Page ${p.metadata.page || 1}, ${p.metadata.section || 'Clause'}]`
      }))
    };

    // Calculate averages for numeric metrics
    Object.keys(tabData.numericSums).forEach(k => {
      const avg = tabData.numericSums[k] / Math.max(1, tabData.numericCounts[k]);
      combinedEntityResult.tabularSummary.sampleMetrics[k] = Number(avg.toFixed(2));
    });

    // 4. Automated Discrepancy & Conflict Detection
    // Check if document mentions quantitative limits (e.g. "discount", "sla", "limit", "max")
    matchingPassages.forEach(p => {
      const text = p.text.toLowerCase();

      // Look for discount limit patterns (e.g. "discount shall not exceed 15%" or "max discount: 15%")
      const discountLimitMatch = text.match(/discount[^\d]{1,30}(\d+(?:\.\d+)?)\s*%/i) ||
        text.match(/maximum\s+discount\s+(?:of|is)?\s*(\d+(?:\.\d+)?)\s*%/i);

      if (discountLimitMatch) {
        const docLimit = parseFloat(discountLimitMatch[1]);
        // Find discount column in tabular
        const discCol = Object.keys(tabData.numericSums).find(k => k.toLowerCase().includes('discount'));
        if (discCol) {
          const tabAvgDiscount = tabData.numericSums[discCol] / Math.max(1, tabData.numericCounts[discCol]);
          // If discount stored as fraction e.g. 0.20 -> 20%
          const normTabDiscount = tabAvgDiscount <= 1.0 ? tabAvgDiscount * 100 : tabAvgDiscount;

          if (normTabDiscount > docLimit) {
            discrepancies.push({
              entity: entityName,
              metric: 'Discount Rate',
              tabularMeasured: Number(normTabDiscount.toFixed(2)),
              documentPolicyLimit: docLimit,
              discrepancyType: 'Policy Limit Breach',
              explanation: `Measured average tabular discount (${normTabDiscount.toFixed(1)}%) exceeds the maximum contractual limit of ${docLimit}% stated in document clause.`,
              citation: `[${documentSource.name}, Page ${p.metadata.page || 1}, ${p.metadata.section || 'Pricing Clause'}]`,
              severity: 'High'
            });
          }
        }
      }

      // Look for SLA delivery days limit (e.g. "delivery within 3 business days")
      const slaMatch = text.match(/(?:delivery|shipping|sla)[^\d]{1,25}(\d+)\s*(?:business\s*)?days/i);
      if (slaMatch) {
        const slaLimit = parseFloat(slaMatch[1]);
        const delCol = Object.keys(tabData.numericSums).find(k => k.toLowerCase().includes('delivery') || k.toLowerCase().includes('shipping_days'));
        if (delCol) {
          const tabAvgDays = tabData.numericSums[delCol] / Math.max(1, tabData.numericCounts[delCol]);
          if (tabAvgDays > slaLimit) {
            discrepancies.push({
              entity: entityName,
              metric: 'Delivery SLA',
              tabularMeasured: Number(tabAvgDays.toFixed(1)),
              documentPolicyLimit: slaLimit,
              discrepancyType: 'SLA Breach',
              explanation: `Empirical delivery time (${tabAvgDays.toFixed(1)} days) exceeds the agreed SLA timeframe of ${slaLimit} days.`,
              citation: `[${documentSource.name}, Page ${p.metadata.page || 1}, ${p.metadata.section || 'SLA Specification'}]`,
              severity: 'Warning'
            });
          }
        }
      }
    });

    crossSourceFindings.push(combinedEntityResult);
  }

  return {
    available: true,
    relationship: {
      id: relationship.id,
      tabularSource: tabularSource.name,
      documentSource: documentSource.name,
      joinKey: `${tabularSource.name}.${joinKeyTabular} ↔ ${documentSource.name}.${joinKeyDocument}`,
      validatedBy: relationship.validatedBy
    },
    matchedEntitiesCount: crossSourceFindings.length,
    findings: crossSourceFindings.slice(0, 10),
    discrepancies,
    hasDiscrepancies: discrepancies.length > 0,
    lineage: {
      tabular: {
        id: tabularSource.id,
        name: tabularSource.name,
        totalRows: rows.length,
        matchedRows: overallTabularCount
      },
      document: {
        id: documentSource.id,
        name: documentSource.name,
        inspectedPassagesCount: crossSourceFindings.reduce((s, f) => s + f.documentEvidence.length, 0)
      }
    }
  };
}

module.exports = {
  executeCrossSourceAnalysis
};
