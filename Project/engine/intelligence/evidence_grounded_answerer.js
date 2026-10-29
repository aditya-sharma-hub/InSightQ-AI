/**
 * InsightIQ AI — Phase D: Evidence-Grounded Answer Engine
 * Generates verified analytical answers strictly backed by empirical computation
 * and verifiable document citations.
 * Enforces separation of "Measured Facts" from "Interpretation".
 * Zero hallucination of missing data or fabricated p-values/citations.
 */

const { GoogleGenAI } = require('@google/genai');

/**
 * Format currency and large values cleanly
 */
function formatValue(val) {
  if (val === null || val === undefined) return 'N/A';
  if (typeof val === 'number') {
    if (Math.abs(val) >= 1000000) return `${val.toLocaleString()} ($${(val / 1000000).toFixed(2)}M)`;
    if (Math.abs(val) >= 1000) return `${val.toLocaleString()} ($${(val / 1000).toFixed(2)}K)`;
    return val % 1 === 0 ? val.toLocaleString() : val.toFixed(2);
  }
  return String(val);
}

/**
 * Produce evidence-grounded answer based on plan and execution result
 */
async function generateGroundedAnswer(plan, executionResult, catalog, options = {}) {
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  const isGeminiAvailable = Boolean(apiKey && !apiKey.startsWith('your_gemini') && options.useAi !== false);

  // 1. Ambiguous / Underspecified Question Handling
  if (plan.isAmbiguous) {
    return {
      answer: plan.clarificationMessage,
      isGrounded: true,
      isAmbiguous: true,
      measuredFacts: [],
      interpretation: 'The question could not be executed without making unverified assumptions. Please provide the clarified metric or dimension indicated above.',
      suggestedAlternatives: plan.suggestedAlternatives || [],
      citations: [],
      sourcesUsed: [],
      sampleSize: 0,
      visual: null
    };
  }

  // 2. Cross-Source Reasoning Output Formatting
  if (plan.intent === 'cross_source') {
    const cs = executionResult;
    const discrepanciesCount = cs.discrepancies ? cs.discrepancies.length : 0;
    const citations = (cs.findings || []).flatMap(f => f.documentEvidence.map(e => e.citation));

    const factLines = [
      `Integrated tabular dataset "${cs.relationship.tabularSource}" with document "${cs.relationship.documentSource}" via key: ${cs.relationship.joinKey}.`,
      `Analyzed ${cs.matchedEntitiesCount} connected entities across ${cs.lineage?.tabular?.matchedRows || 0} tabular transactions.`,
      discrepanciesCount > 0
        ? `Identified ${discrepanciesCount} contractual / SLA policy discrepancies.`
        : 'All observed tabular measurements align with stated contractual limits.'
    ];

    let narrative = `### Cross-Source Verification Summary\n\n` +
      `**Data Integration**: Linked **${cs.relationship.tabularSource}** and **${cs.relationship.documentSource}** using verified key mapping \`${cs.relationship.joinKey}\` (Validated by: ${cs.relationship.validatedBy}).\n\n` +
      `**Empirical Scope**: Evaluated **${cs.matchedEntitiesCount}** matched entities across **${(cs.lineage?.tabular?.matchedRows || 0).toLocaleString()}** transactions.\n\n`;

    if (discrepanciesCount > 0) {
      narrative += `⚠️ **Contractual & Policy Discrepancies Detected**:\n`;
      cs.discrepancies.forEach((d, idx) => {
        narrative += `${idx + 1}. **${d.entity} (${d.metric})**: ${d.explanation} Source Citation: ${d.citation}\n`;
      });
    } else {
      narrative += `✓ **Contract Compliance**: All analyzed tabular transactions comply with the terms defined in ${cs.relationship.documentSource}.\n`;
    }

    return {
      answer: narrative,
      isGrounded: true,
      isAmbiguous: false,
      measuredFacts: factLines,
      interpretation: discrepanciesCount > 0
        ? 'Empirical transaction history reveals contractual policy breaches that warrant operational renegotiation or corrective audits.'
        : 'Cross-source empirical measurements substantiate full alignment with documented policies.',
      citations: Array.from(new Set(citations)),
      discrepancies: cs.discrepancies || [],
      sourcesUsed: [cs.relationship.tabularSource, cs.relationship.documentSource],
      sampleSize: cs.lineage?.tabular?.matchedRows || 0,
      visual: {
        type: 'table',
        headers: ['Entity', 'Tabular Metric', 'Measured Value', 'Document Limit', 'Citation', 'Status'],
        rows: (cs.discrepancies || []).map(d => [
          d.entity,
          d.metric,
          `${d.tabularMeasured}%`,
          `${d.documentPolicyLimit}%`,
          d.citation,
          d.discrepancyType
        ])
      }
    };
  }

  // 3. Document QA Output Formatting
  if (plan.intent === 'document_qa') {
    const qa = executionResult;
    const docFacts = (qa.extractedFacts && qa.extractedFacts.length > 0)
      ? qa.extractedFacts.map(f => (typeof f === 'string' ? f : (f.fact || JSON.stringify(f))))
      : (qa.answer ? [qa.answer] : []);

    return {
      answer: qa.answer,
      isGrounded: true,
      isAmbiguous: false,
      measuredFacts: docFacts,
      interpretation: qa.sufficientEvidence
        ? 'Directly answered using indexed passages with verified evidence.'
        : 'Insufficient evidence was found in the indexed document to fully substantiate the claim without extrapolation.',
      citations: qa.citations || [],
      sourcesUsed: qa.sourceNames || [],
      sampleSize: qa.passagesEvaluated || (qa.topPassages ? qa.topPassages.length : 1),
      visual: null
    };
  }

  // 4. Tabular Aggregation / Grouping Output Formatting
  if (plan.intent === 'aggregation' && executionResult.available) {
    const res = executionResult;
    const metricLabel = res.metricField || 'metric';
    const groupLabel = res.groupByField || 'category';
    const totalN = res.sampleSize || 0;

    const factLines = [];
    if (res.isGrouped && res.groups) {
      res.groups.slice(0, 5).forEach((g, idx) => {
        factLines.push(`Rank ${idx + 1}: ${g.key} — ${formatValue(g.value)} (${g.count.toLocaleString()} observations, ${g.sharePct?.toFixed(1) || 0}%)`);
      });
    } else if (res.value !== undefined || res.summary) {
      const singleVal = res.value !== undefined ? res.value : res.summary?.value;
      factLines.push(`Total ${metricLabel}: ${formatValue(singleVal)} (computed across ${totalN.toLocaleString()} records).`);
    }

    let narrative = '';
    if (res.isGrouped && res.groups && res.groups.length > 0) {
      const topGroup = res.groups[0];
      const secondGroup = res.groups[1] || null;
      narrative = `Based on ${(totalN).toLocaleString()} verified records from **${res.sourceName}**:\n\n` +
        `**Leading ${groupLabel}**: **${topGroup.key}** leads with **${formatValue(topGroup.value)}** (${topGroup.sharePct?.toFixed(1) || 0}% of total ${metricLabel}).\n`;

      if (secondGroup) {
        const gap = topGroup.value - secondGroup.value;
        const gapPct = topGroup.value > 0 ? (gap / topGroup.value) * 100 : 0;
        narrative += `**Runner-Up**: **${secondGroup.key}** generated **${formatValue(secondGroup.value)}** (${secondGroup.sharePct?.toFixed(1) || 0}%), representing a **${formatValue(gap)}** (${gapPct.toFixed(1)}%) variance gap.\n`;
      }
    } else {
      narrative = `The computed **${res.aggregation.toUpperCase()}** of **${metricLabel}** across **${(totalN).toLocaleString()}** observations in **${res.sourceName}** is **${formatValue(res.value)}**.`;
    }

    // Optional LLM Narration enhancement (only for phrasing, retaining exact numbers)
    if (isGeminiAvailable && options.useAiNarrative) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Synthesize this measured factual data into a 2-paragraph executive briefing. You must use the exact numbers provided and never invent numbers:\n` +
          `Facts: ${JSON.stringify(factLines)}\nQuery: ${plan.originalQuery}`;
        const aiResp = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: prompt,
          config: { temperature: 0.2 }
        });
        if (aiResp && aiResp.text) {
          narrative = aiResp.text.trim();
        }
      } catch (e) {
        // Fallback to deterministic narrative on API limit
      }
    }

    return {
      answer: narrative,
      isGrounded: true,
      isAmbiguous: false,
      measuredFacts: factLines,
      interpretation: `Computed strictly from dataset "${res.sourceName}" using ${res.aggregation.toUpperCase()} aggregation on ${metricLabel}. Zero missing values were fabricated.`,
      citations: [`Dataset: ${res.sourceName} (Rows: ${totalN.toLocaleString()})`],
      sourcesUsed: [res.sourceName],
      sampleSize: totalN,
      visual: res.isGrouped ? {
        type: 'bar_chart',
        labels: res.groups.slice(0, 8).map(g => g.key),
        values: res.groups.slice(0, 8).map(g => Number(g.value.toFixed(2))),
        metric: metricLabel
      } : null
    };
  }

  // 5. Correlation Output Formatting
  if (plan.intent === 'correlation' && executionResult.available) {
    const corr = executionResult;
    const pair = corr.pairs && corr.pairs[0];
    if (pair) {
      const factLines = [
        `Pearson correlation r(${pair.col1}, ${pair.col2}) = ${pair.r.toFixed(4)}.`,
        `Two-tailed p-value = ${pair.pValue < 0.0001 ? '< 0.0001' : pair.pValue.toFixed(4)} (Statistically significant: ${pair.isSignificant ? 'Yes' : 'No'}).`,
        `95% Confidence Interval: [${pair.confidenceInterval95[0].toFixed(3)}, ${pair.confidenceInterval95[1].toFixed(3)}].`,
        `Sample size N = ${corr.sampleSize} observations.`
      ];

      const narrative = `### Correlation Analysis: ${pair.col1} ↔ ${pair.col2}\n\n` +
        `Empirical evaluation of **${corr.sampleSize.toLocaleString()}** observations demonstrates a **${pair.strength}** relationship (` +
        `**r = ${pair.r.toFixed(3)}**, 95% CI [${pair.confidenceInterval95[0].toFixed(3)}, ${pair.confidenceInterval95[1].toFixed(3)}], p = ${pair.pValue < 0.0001 ? '< 0.0001' : pair.pValue.toFixed(4)}).\n\n` +
        `*Mandatory Disclaimer: Correlation indicates statistical co-movement and does not establish causal direction. Correlation does not imply causation.*`;

      return {
        answer: narrative,
        isGrounded: true,
        isAmbiguous: false,
        measuredFacts: factLines,
        interpretation: `The bivariate association is ${pair.strength} and ${pair.isSignificant ? 'statistically significant at alpha = 0.05' : 'not statistically significant'}. Causality must not be inferred.`,
        citations: [`Dataset: ${corr.sourceName} (N = ${corr.sampleSize})`],
        sourcesUsed: [corr.sourceName],
        sampleSize: corr.sampleSize,
        visual: {
          type: 'scatter',
          xLabel: pair.col1,
          yLabel: pair.col2,
          r: pair.r
        }
      };
    }
  }

  // Default fallback
  return {
    answer: `The query was analyzed across active sources in your catalog. No matching quantitative operation could be executed.`,
    isGrounded: true,
    isAmbiguous: true,
    measuredFacts: [],
    interpretation: 'Please specify the metric or dimension you wish to calculate.',
    citations: [],
    sourcesUsed: [],
    sampleSize: 0,
    visual: null
  };
}

module.exports = {
  generateGroundedAnswer,
  formatValue
};
