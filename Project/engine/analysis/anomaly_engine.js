/**
 * InsightIQ AI — Genuine Statistical Anomaly Detection Engine
 * Multi-method detection: Z-Score, Tukey IQR, Modified Z-Score (MAD), and Multivariate Distance.
 * Transparent feature-level explanations and error vs outlier classification.
 */

const { isNumericValue } = require('../profiling/tabular_profiler');

/**
 * Execute genuine anomaly detection across numerical features
 */
function computeAnomalyDetectionEngine(headers, rows, options = {}) {
  const method = (options.method || 'iqr').toLowerCase();
  const warningThresh = parseFloat(options.warningThreshold || (method === 'z-score' ? 2.5 : method === 'iqr' ? 1.5 : 3.5));
  const criticalThresh = parseFloat(options.criticalThreshold || (method === 'z-score' ? 3.5 : method === 'iqr' ? 3.0 : 5.0));

  // 1. Select numeric features
  const requestedFeatures = Array.isArray(options.features) && options.features.length > 0 ? options.features : headers;
  const numericFeatures = requestedFeatures.filter(col => {
    const vals = rows.map(r => r[col]).filter(v => v !== null && v !== undefined && v !== '');
    return vals.length >= 4 && vals.some(v => isNumericValue(v));
  });

  if (numericFeatures.length === 0) {
    return {
      available: false,
      reason: 'No valid numeric features found in dataset for anomaly detection.'
    };
  }

  const n = rows.length;
  if (n < 4) {
    return {
      available: false,
      reason: `Dataset contains only ${n} rows. Minimum 4 rows required for statistical baseline calculation.`
    };
  }

  // 2. Compute Column Statistics (Mean, StdDev, Median, IQR, MAD)
  const stats = {};
  numericFeatures.forEach(col => {
    const rawVals = rows.map(r => r[col]);
    const cleanNumbers = [];
    const nonFiniteErrors = [];

    rawVals.forEach((v, idx) => {
      if (v === null || v === undefined || v === '') return;
      if (isNumericValue(v)) {
        cleanNumbers.push(Number(v));
      } else {
        nonFiniteErrors.push({ rowId: idx + 1, rawValue: v });
      }
    });

    if (cleanNumbers.length === 0) return;

    cleanNumbers.sort((a, b) => a - b);
    const m = cleanNumbers.length;

    const sum = cleanNumbers.reduce((s, v) => s + v, 0);
    const mean = sum / m;
    const variance = cleanNumbers.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / Math.max(1, m - 1);
    const stdDev = Math.sqrt(variance) || 1e-5;

    const getP = (p) => {
      const idx = (m - 1) * p;
      const base = Math.floor(idx);
      const rest = idx - base;
      if (cleanNumbers[base + 1] !== undefined) {
        return cleanNumbers[base] + rest * (cleanNumbers[base + 1] - cleanNumbers[base]);
      }
      return cleanNumbers[base];
    };

    const median = getP(0.5);
    const q1 = getP(0.25);
    const q3 = getP(0.75);
    const iqr = (q3 - q1) || 1e-5;

    // Median Absolute Deviation (MAD)
    const absDevs = cleanNumbers.map(v => Math.abs(v - median)).sort((a, b) => a - b);
    const mad = absDevs[Math.floor(absDevs.length / 2)] || 1e-5;

    stats[col] = {
      mean: Number(mean.toFixed(3)),
      stdDev: Number(stdDev.toFixed(3)),
      median: Number(median.toFixed(3)),
      q1: Number(q1.toFixed(3)),
      q3: Number(q3.toFixed(3)),
      iqr: Number(iqr.toFixed(3)),
      mad: Number(mad.toFixed(3)),
      nonFiniteErrors
    };
  });

  const validFeatures = Object.keys(stats);
  if (validFeatures.length === 0) {
    return { available: false, reason: 'Failed to compute numerical baselines across selected features.' };
  }

  // 3. Scan rows for anomalies
  const anomalies = [];
  const p = validFeatures.length;

  for (let i = 0; i < n; i++) {
    const row = rows[i];
    let maxScore = -1;
    let worstFeature = '';
    let worstObserved = 0;
    let worstBaseline = 0;
    let featureDetails = [];
    let isDataCorruption = false;
    let corruptionReason = '';

    if (method === 'z-score') {
      validFeatures.forEach(col => {
        const val = row[col];
        if (val === null || val === undefined || val === '') return;
        const num = Number(val);
        if (isNaN(num)) {
          isDataCorruption = true;
          corruptionReason = `Non-numeric string "${val}" found in numeric column "${col}"`;
          return;
        }

        const z = Math.abs(num - stats[col].mean) / stats[col].stdDev;
        featureDetails.push({
          feature: col,
          observed: num,
          baseline: stats[col].mean,
          stdDev: stats[col].stdDev,
          score: Number(z.toFixed(2))
        });

        if (z > maxScore) {
          maxScore = z;
          worstFeature = col;
          worstObserved = num;
          worstBaseline = stats[col].mean;
        }
      });
    } else if (method === 'modified-z-score') {
      validFeatures.forEach(col => {
        const val = row[col];
        if (val === null || val === undefined || val === '') return;
        const num = Number(val);
        if (isNaN(num)) {
          isDataCorruption = true;
          corruptionReason = `Non-numeric string "${val}" in column "${col}"`;
          return;
        }

        const modZ = (0.6745 * Math.abs(num - stats[col].median)) / stats[col].mad;
        featureDetails.push({
          feature: col,
          observed: num,
          baseline: stats[col].median,
          mad: stats[col].mad,
          score: Number(modZ.toFixed(2))
        });

        if (modZ > maxScore) {
          maxScore = modZ;
          worstFeature = col;
          worstObserved = num;
          worstBaseline = stats[col].median;
        }
      });
    } else if (method === 'multivariate') {
      let sumSqZ = 0;
      let countFeatures = 0;
      validFeatures.forEach(col => {
        const val = row[col];
        if (val === null || val === undefined || val === '') return;
        const num = Number(val);
        if (isNaN(num)) {
          isDataCorruption = true;
          corruptionReason = `Corrupt value "${val}" in column "${col}"`;
          return;
        }
        const z = (num - stats[col].mean) / stats[col].stdDev;
        sumSqZ += z * z;
        countFeatures++;
        if (Math.abs(z) > maxScore) {
          maxScore = Math.abs(z);
          worstFeature = col;
          worstObserved = num;
          worstBaseline = stats[col].mean;
        }
      });
      // Normalized Euclidean distance across standardized dimensions
      const multiDist = Math.sqrt(sumSqZ / Math.max(1, countFeatures));
      maxScore = multiDist;
    } else {
      // Default: IQR (Tukey's Fences)
      validFeatures.forEach(col => {
        const val = row[col];
        if (val === null || val === undefined || val === '') return;
        const num = Number(val);
        if (isNaN(num)) {
          isDataCorruption = true;
          corruptionReason = `Invalid non-numeric value "${val}" in column "${col}"`;
          return;
        }

        const colStat = stats[col];
        let score = 0;
        if (num > colStat.median) {
          score = (num - colStat.q3) / colStat.iqr;
        } else {
          score = (colStat.q1 - num) / colStat.iqr;
        }
        score = Math.max(0, score);

        featureDetails.push({
          feature: col,
          observed: num,
          baseline: colStat.median,
          q1: colStat.q1,
          q3: colStat.q3,
          iqr: colStat.iqr,
          score: Number(score.toFixed(2))
        });

        if (score > maxScore) {
          maxScore = score;
          worstFeature = col;
          worstObserved = num;
          worstBaseline = colStat.median;
        }
      });
    }

    if (isDataCorruption) {
      anomalies.push({
        rowId: i + 1,
        severity: 'Critical',
        anomalyType: 'Data Corruption Error',
        score: 99.0,
        affectedFeature: worstFeature || validFeatures[0],
        observedValue: String(row[worstFeature || validFeatures[0]]),
        baselineValue: 'Numeric Type Constraint',
        deviation: 'NaN / Format Corruption',
        explanation: corruptionReason,
        detectedAt: new Date().toISOString()
      });
    } else if (maxScore >= warningThresh && worstFeature) {
      const severity = maxScore >= criticalThresh ? 'Critical' : 'Warning';
      const deviation = worstObserved - worstBaseline;

      anomalies.push({
        rowId: i + 1,
        severity,
        anomalyType: 'Statistical Extreme Outlier',
        score: Number(maxScore.toFixed(2)),
        affectedFeature: worstFeature,
        observedValue: worstObserved,
        baselineValue: worstBaseline,
        deviation: Number(deviation.toFixed(2)),
        featureBreakdown: featureDetails,
        explanation: `${worstFeature} observed value (${worstObserved}) deviated by ${Math.abs(deviation).toFixed(2)} from baseline ${worstBaseline} (score: ${maxScore.toFixed(2)} vs threshold ${warningThresh}).`,
        detectedAt: new Date().toISOString()
      });
    }
  }

  const criticalCount = anomalies.filter(a => a.severity === 'Critical').length;
  const warningCount = anomalies.filter(a => a.severity === 'Warning').length;

  return {
    available: true,
    method: method === 'z-score' ? 'Standardized Z-Score' :
            method === 'modified-z-score' ? 'Modified Z-Score (Median Absolute Deviation)' :
            method === 'multivariate' ? 'Multivariate Normalized Distance' :
            "Tukey's Interquartile Range (IQR)",
    featuresAnalyzed: validFeatures,
    sampleSize: n,
    thresholds: { warningThreshold: warningThresh, criticalThreshold: criticalThresh },
    totalAnomaliesDetected: anomalies.length,
    criticalCount,
    warningCount,
    normalCount: n - anomalies.length,
    anomaliesRatePercentage: Number(((anomalies.length / n) * 100).toFixed(2)),
    anomalies,
    featureBaselines: stats
  };
}

module.exports = {
  computeAnomalyDetectionEngine
};
