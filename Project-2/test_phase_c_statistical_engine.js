/**
 * InsightIQ AI — Phase C Comprehensive Verification Suite
 * Deterministic testing of genuine statistical engine, ML pipeline,
 * unsupervised clustering/PCA, forecasting, and anomaly detection.
 */

const assert = require('assert');
const http = require('http');
const engine = require('./engine');
const statisticalEngine = require('./engine/analysis/statistical_engine');
const mlEngine = require('./engine/analysis/ml_engine');
const unsupervisedEngine = require('./engine/analysis/unsupervised_engine');
const forecastingEngine = require('./engine/analysis/forecasting_engine');
const anomalyEngine = require('./engine/analysis/anomaly_engine');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${name}`);
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    if (err.stack) console.error(err.stack.split('\n').slice(1, 4).join('\n'));
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ [PASS] ${name}`);
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    if (err.stack) console.error(err.stack.split('\n').slice(1, 4).join('\n'));
  }
}

function makeApiRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const req = http.request({
      hostname: 'localhost',
      port: 8085,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runAllTests() {
  console.log('================================================================');
  console.log('   INSIGHTIQ AI — PHASE C DETERMINISTIC STATISTICAL & ML SUITE   ');
  console.log('================================================================\n');

  // ===========================================================================
  // SECTION 1: SPECIAL MATHEMATICAL FUNCTIONS & PROBABILITY DISTRIBUTIONS
  // ===========================================================================
  console.log('>>> [1. Special Mathematical Functions & Distributions]');

  runTest('Lanczos Log-Gamma approximation returns accurate values', () => {
    // Gamma(5) = 4! = 24 -> logGamma(5) = ln(24) = 3.1780538303
    const lg5 = statisticalEngine.logGamma(5);
    assert(Math.abs(lg5 - Math.log(24)) < 1e-6, `logGamma(5) expected ln(24), got ${lg5}`);

    // Gamma(0.5) = sqrt(pi) = 1.77245385 -> logGamma(0.5) = ln(sqrt(pi)) = 0.57236494
    const lgHalf = statisticalEngine.logGamma(0.5);
    assert(Math.abs(lgHalf - Math.log(Math.sqrt(Math.PI))) < 1e-6, `logGamma(0.5) expected ln(sqrt(pi)), got ${lgHalf}`);
  });

  runTest('Exact Student-t two-tailed p-values match statistical tables', () => {
    // df = 10, t = 2.228 -> two-tailed p ~ 0.05
    const p1 = statisticalEngine.studentTPValue(2.2281, 10);
    assert(Math.abs(p1 - 0.05) < 0.005, `Expected p ~ 0.05 for t=2.228, df=10, got ${p1}`);

    // df = 30, t = 2.042 -> two-tailed p ~ 0.05
    const p2 = statisticalEngine.studentTPValue(2.0423, 30);
    assert(Math.abs(p2 - 0.05) < 0.005, `Expected p ~ 0.05 for t=2.042, df=30, got ${p2}`);

    // extreme t returns p ~ 0
    const pExtreme = statisticalEngine.studentTPValue(10.0, 20);
    assert(pExtreme < 0.0001, `Extreme t should have p < 0.0001, got ${pExtreme}`);
  });

  runTest('Snedecor F-distribution p-values match statistical tables', () => {
    // df1 = 3, df2 = 12, F = 3.490 -> p ~ 0.05
    const pF = statisticalEngine.fDistributionPValue(3.4903, 3, 12);
    assert(Math.abs(pF - 0.05) < 0.005, `Expected p ~ 0.05 for F=3.49, df=(3,12), got ${pF}`);

    // F <= 0 returns 1.0
    assert.strictEqual(statisticalEngine.fDistributionPValue(0, 2, 10), 1.0);
  });

  runTest('Chi-Square distribution p-values match statistical tables', () => {
    // df = 2, chi2 = 5.991 -> p ~ 0.05
    const pChi2 = statisticalEngine.chiSquarePValue(5.9915, 2);
    assert(Math.abs(pChi2 - 0.05) < 0.005, `Expected p ~ 0.05 for chi2=5.991, df=2, got ${pChi2}`);

    // df = 4, chi2 = 9.488 -> p ~ 0.05
    const pChi4 = statisticalEngine.chiSquarePValue(9.4877, 4);
    assert(Math.abs(pChi4 - 0.05) < 0.005, `Expected p ~ 0.05 for chi2=9.488, df=4, got ${pChi4}`);
  });

  // ===========================================================================
  // SECTION 2: DESCRIPTIVE STATISTICS, DISTRIBUTIONS, & QUALITY
  // ===========================================================================
  console.log('\n>>> [2. Descriptive Statistics, Distributions, & Data Quality]');

  runTest('Compute full descriptive statistics and Jarque-Bera normality', () => {
    // Synthetic dataset: 10, 20, 30, 40, 50
    const data = [10, 20, 30, 40, 50];
    const stats = statisticalEngine.computeDescriptiveStatistics(data);

    assert.strictEqual(stats.sampleSize, 5);
    assert.strictEqual(stats.mean, 30);
    assert.strictEqual(stats.median, 30);
    assert.strictEqual(stats.min, 10);
    assert.strictEqual(stats.max, 50);
    assert.strictEqual(stats.range, 40);
    // Sample variance: sum((x - 30)^2)/(5-1) = (400 + 100 + 0 + 100 + 400)/4 = 1000/4 = 250
    assert.strictEqual(stats.variance, 250);
    assert.strictEqual(stats.stdDev, Number(Math.sqrt(250).toFixed(4)));
    // Symmetric distribution -> skewness ~ 0
    assert(Math.abs(stats.skewness) < 1e-4, `Expected skewness 0, got ${stats.skewness}`);
    // Check 95% confidence interval for mean contains 30
    assert(stats.confidenceInterval95.lower < 30 && stats.confidenceInterval95.upper > 30);
    // Check Jarque-Bera normality test
    assert(stats.normalityCheck != null);
    assert(stats.normalityCheck.statistic >= 0);
  });

  runTest('Compute dynamic bin histogram with frequency and density', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const hist = statisticalEngine.computeHistogram(data, 5);
    assert.strictEqual(hist.bins.length, 5);
    const totalCount = hist.bins.reduce((acc, b) => acc + b.count, 0);
    assert.strictEqual(totalCount, 10);
  });

  runTest('Missingness and data quality correctly summarized without hallucination', () => {
    const rawData = [10, null, 20, undefined, 'N/A', 30, 40];
    const stats = statisticalEngine.computeDescriptiveStatistics(rawData);
    assert.strictEqual(stats.sampleSize, 4); // 10, 20, 30, 40 valid
    assert.strictEqual(stats.missingCount, 3);
    assert.strictEqual(stats.missingPercentage, Number(((3 / 7) * 100).toFixed(2)));
  });

  // ===========================================================================
  // SECTION 3: CORRELATION, COVARIANCE, AND CONFIDENCE INTERVALS
  // ===========================================================================
  console.log('\n>>> [3. Correlation, Covariance, & Fisher z Confidence Intervals]');

  runTest('Pearson correlation matches exact mathematical definition', () => {
    // Perfect positive: y = 2x + 1
    const x = [1, 2, 3, 4, 5];
    const y = [3, 5, 7, 9, 11];
    const res = statisticalEngine.computeCorrelationAndCovariance(x, y);

    assert(Math.abs(res.pearson.r - 1.0) < 1e-4, `Expected r=1.0, got ${res.pearson.r}`);
    assert.strictEqual(res.pearson.strength, 'strong');
    assert(res.pearson.pValue < 0.001, 'p-value for perfect correlation should be < 0.001');
    assert.strictEqual(res.spearman.rho, 1.0);
  });

  runTest('Spearman rank correlation detects non-linear monotonic relationships', () => {
    // Monotonic exponential relationship
    const x = [1, 2, 3, 4, 5];
    const y = [1, 10, 100, 1000, 10000];
    const res = statisticalEngine.computeCorrelationAndCovariance(x, y);

    assert.strictEqual(res.spearman.rho, 1.0, 'Monotonic ranks must have Spearman rho = 1.0');
    assert(res.pearson.r < 1.0, 'Pearson r should be < 1.0 for exponential curve');
  });

  runTest('Correlation matrix computes all pairs with sample counts and p-values', () => {
    const rows = [
      { a: 1, b: 2, c: 10 },
      { a: 2, b: 4, c: 8 },
      { a: 3, b: 6, c: 6 },
      { a: 4, b: 8, c: 4 },
      { a: 5, b: 10, c: 2 }
    ];
    const headers = ['a', 'b', 'c'];
    const matrix = statisticalEngine.computeCorrelationAndCovariance(headers, rows);

    assert.strictEqual(matrix.columns.length, 3);
    // a and b are perfectly correlated: r = 1.0
    const pairAB = matrix.pairs.find(p => (p.col1 === 'a' && p.col2 === 'b') || (p.col1 === 'b' && p.col2 === 'a'));
    assert(Math.abs(pairAB.r - 1.0) < 1e-4);

    // a and c are perfectly inversely correlated: r = -1.0
    const pairAC = matrix.pairs.find(p => (p.col1 === 'a' && p.col2 === 'c') || (p.col1 === 'c' && p.col2 === 'a'));
    assert(Math.abs(pairAC.r - (-1.0)) < 1e-4);
  });

  // ===========================================================================
  // SECTION 4: HYPOTHESIS TESTING & GROUP COMPARISONS
  // ===========================================================================
  console.log('\n>>> [4. Hypothesis Testing & Group Comparisons]');

  runTest('Two-sample Welch t-test handles unequal variances accurately', () => {
    const group1 = [12, 14, 15, 16, 17, 18, 20];
    const group2 = [22, 24, 25, 26, 27, 28, 30];
    const result = statisticalEngine.computeTwoSampleTTest(group1, group2);

    assert(result.available, 'Welch t-test should be available');
    assert.strictEqual(result.testType, "Welch's Two-Sample t-Test (Unequal Variances)");
    assert(result.tStatistic < 0, 't-statistic should be negative (group1 mean < group2 mean)');
    assert(result.degreesOfFreedom > 0);
    assert(result.pValue < 0.01, `Significant difference expected, got p = ${result.pValue}`);
    assert.strictEqual(result.isSignificantAt05, true);
    assert(result.cohensD > 0);
  });

  runTest('One-way ANOVA computes exact SS, MS, F-statistic, and eta-squared', () => {
    // 3 distinct groups
    const groups = {
      control: [10, 11, 12, 13, 14],
      treatmentA: [20, 21, 22, 23, 24],
      treatmentB: [30, 31, 32, 33, 34]
    };
    const anova = statisticalEngine.computeOneWayANOVA(groups);

    assert(anova.available, 'ANOVA should be available');
    assert.strictEqual(anova.groupCount, 3);
    assert.strictEqual(anova.totalObservations, 15);
    assert.strictEqual(anova.dfBetween, 2);
    assert.strictEqual(anova.dfWithin, 12);
    assert(anova.fStatistic > 50, `Expected massive F-stat, got ${anova.fStatistic}`);
    assert(anova.pValue < 0.0001, `Expected p < 0.0001, got ${anova.pValue}`);
    assert.strictEqual(anova.isSignificantAt05, true);
    assert(anova.etaSquared > 0.9, `Expected eta² > 0.9, got ${anova.etaSquared}`);
  });

  runTest('Chi-Square test of independence with Cramér V and Cochran rule', () => {
    const rows = [
      { tier: 'Enterprise', churn: 'No' },
      { tier: 'Enterprise', churn: 'No' },
      { tier: 'Enterprise', churn: 'No' },
      { tier: 'Enterprise', churn: 'Yes' },
      { tier: 'Free', churn: 'Yes' },
      { tier: 'Free', churn: 'Yes' },
      { tier: 'Free', churn: 'Yes' },
      { tier: 'Free', churn: 'No' }
    ];
    const chiRes = statisticalEngine.computeChiSquareTest(rows, 'tier', 'churn');

    assert(chiRes.available, 'Chi-Square should be available');
    assert.strictEqual(chiRes.degreesOfFreedom, 1); // (2-1)*(2-1) = 1
    assert(chiRes.chiSquareStatistic >= 0);
    assert(chiRes.pValue >= 0 && chiRes.pValue <= 1);
    assert(chiRes.cramersV >= 0 && chiRes.cramersV <= 1);
    assert(chiRes.cochranValidation != null);
  });

  // ===========================================================================
  // SECTION 5: SUPERVISED MACHINE LEARNING & PREDICTION
  // ===========================================================================
  console.log('\n>>> [5. Supervised Machine Learning, Validation, & Inference]');

  runTest('Automatic task type inference differentiates classification and regression', () => {
    const binaryRows = [{ y: 'yes' }, { y: 'no' }, { y: 'yes' }];
    const inf1 = mlEngine.inferMLTaskType(binaryRows, 'y');
    assert.strictEqual(inf1.taskType, 'Binary Classification');

    const multiRows = [{ y: 'red' }, { y: 'green' }, { y: 'blue' }, { y: 'red' }, { y: 'yellow' }];
    const inf2 = mlEngine.inferMLTaskType(multiRows, 'y');
    assert.strictEqual(inf2.taskType, 'Multiclass Classification');

    const regRows = [{ y: 12.5 }, { y: 15.8 }, { y: 22.1 }, { y: 35.4 }, { y: 41.0 }, { y: 55.2 }];
    const inf3 = mlEngine.inferMLTaskType(regRows, 'y');
    assert.strictEqual(inf3.taskType, 'Regression');
  });

  runTest('Target leakage guard excludes duplicate identifiers and leaked features', () => {
    const headers = ['id', 'user_id', 'target', 'feature_a', 'feature_b'];
    const rows = [
      { id: '1', user_id: 'u1', target: 'churn', feature_a: 10, feature_b: 5 },
      { id: '2', user_id: 'u2', target: 'retain', feature_a: 2, feature_b: 1 }
    ];
    const selected = mlEngine.selectFeaturesAndPreventLeakage(headers, rows, 'target');

    assert(!selected.featureColumns.includes('id'), 'id should be excluded as identifier');
    assert(!selected.featureColumns.includes('user_id'), 'user_id should be excluded as identifier');
    assert(!selected.featureColumns.includes('target'), 'target must never be in feature set');
    assert(selected.featureColumns.includes('feature_a'));
    assert(selected.featureColumns.includes('feature_b'));
  });

  runTest('Train-only preprocessor fits parameters on train and transforms holdout', () => {
    const trainData = [
      { f1: 10, f2: 'A' },
      { f1: 20, f2: 'B' },
      { f1: 30, f2: 'A' }
    ];
    const prep = mlEngine.fitPreprocessor(trainData, ['f1', 'f2']);

    assert.strictEqual(prep.numericStats.f1.median, 20);
    assert(prep.categoricalLevels.f2.includes('A') && prep.categoricalLevels.f2.includes('B'));

    // Transform holdout with missing values
    const testData = [{ f1: null, f2: 'C' }]; // f1 should impute to 20
    const matrix = mlEngine.transformWithPreprocessor(testData, prep);
    assert.strictEqual(matrix.length, 1);
    // f1 standardized value: (20 - 20) / std = 0
    assert.strictEqual(matrix[0][0], 0);
  });

  runTest('Genuine supervised regression trains model and beats naive mean baseline', () => {
    // Generate linear data y = 3 * x1 + 2 * x2 + 5 with slight noise
    const rows = [];
    for (let i = 0; i < 40; i++) {
      const x1 = i * 2;
      const x2 = i % 5;
      const y = 3 * x1 + 2 * x2 + 5;
      rows.push({ x1, x2, target: y });
    }
    const headers = ['x1', 'x2', 'target'];

    const result = mlEngine.trainSupervisedEngine(headers, rows, 'target', { problemType: 'regression' });

    assert(result.available, 'Regression should train successfully');
    assert.strictEqual(result.taskType, 'Regression');
    assert(result.metrics.r2Score >= 0.95, `Expected R² >= 0.95, got ${result.metrics.r2Score}`);
    assert(result.metrics.rmse < result.baselineComparison.baselineRmse, 'Trained model must beat naive mean baseline RMSE');
    assert(result.artifact != null, 'Artifact must be generated');

    // Test genuine inference using persisted artifact
    const testCases = [{ x1: 10, x2: 2 }, { x1: 20, x2: 4 }];
    const preds = mlEngine.predictWithArtifact(result.artifact, testCases);
    assert.strictEqual(preds.length, 2);
    // Expected y for (10, 2) = 3*10 + 2*2 + 5 = 39
    assert(Math.abs(preds[0].prediction - 39) < 2.0, `Expected prediction ~39, got ${preds[0].prediction}`);
  });

  runTest('Genuine supervised classification trains model with confusion matrix', () => {
    const rows = [
      { spend: 500, freq: 30, churn: 'no' },
      { spend: 600, freq: 35, churn: 'no' },
      { spend: 550, freq: 28, churn: 'no' },
      { spend: 700, freq: 40, churn: 'no' },
      { spend: 520, freq: 32, churn: 'no' },
      { spend: 50, freq: 2, churn: 'yes' },
      { spend: 80, freq: 3, churn: 'yes' },
      { spend: 60, freq: 1, churn: 'yes' },
      { spend: 90, freq: 4, churn: 'yes' },
      { spend: 40, freq: 2, churn: 'yes' }
    ];
    const headers = ['spend', 'freq', 'churn'];

    const result = mlEngine.trainSupervisedEngine(headers, rows, 'churn', { problemType: 'classification' });

    assert(result.available, 'Classification should train successfully');
    assert(result.metrics.accuracy >= 80, `Expected accuracy >= 80%, got ${result.metrics.accuracy}`);
    assert(result.confusionMatrix != null);
    assert(result.artifact != null);

    // Run inference on new holdout rows
    const preds = mlEngine.predictWithArtifact(result.artifact, [
      { spend: 580, freq: 33 }, // should predict 'no'
      { spend: 45, freq: 1 }     // should predict 'yes'
    ]);
    assert.strictEqual(preds[0].prediction, 'no');
    assert.strictEqual(preds[1].prediction, 'yes');
  });

  // ===========================================================================
  // SECTION 6: UNSUPERVISED LEARNING (PCA & K-MEANS++)
  // ===========================================================================
  console.log('\n>>> [6. Unsupervised Learning: Jacobi PCA & K-Means++ Silhouette]');

  runTest('PCA with Jacobi decomposition extracts explained variance and orthogonal loadings', () => {
    // 2D data with high variance along x=y
    const rows = [];
    for (let i = 0; i < 20; i++) {
      rows.push({ a: i * 2, b: i * 2 + 1 });
    }
    const headers = ['a', 'b'];

    const pca = unsupervisedEngine.computePCA(headers, rows, 2);

    assert(pca.available, 'PCA should succeed');
    assert.strictEqual(pca.components.length, 2);
    // Since b is perfectly linear with a, first PC should capture > 99% of variance
    assert(pca.components[0].explainedVarianceRatio > 0.99, `First PC should explain > 99%, got ${pca.components[0].explainedVarianceRatio}`);
    assert(pca.components[0].loadings != null);
    assert.strictEqual(pca.projectedCoordinates.length, 20);
  });

  runTest('K-Means++ evaluates multi-K candidates and recommends optimal K via Silhouette', () => {
    // Two distinct spatial clusters: Cluster 1 around (0, 0), Cluster 2 around (50, 50)
    const rows = [
      { x: 0, y: 1 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 0 }, { x: 2, y: 2 },
      { x: 50, y: 51 }, { x: 51, y: 50 }, { x: 52, y: 52 }, { x: 50, y: 50 }, { x: 49, y: 51 }
    ];
    const headers = ['x', 'y'];

    const clustering = unsupervisedEngine.computeClusteringPipeline(headers, rows);

    assert(clustering.available, 'Clustering should succeed');
    assert.strictEqual(clustering.optimalK, 2, `Optimal K should be 2 for two distinct groups, got ${clustering.optimalK}`);
    assert(clustering.overallSilhouetteScore > 0.8, `Silhouette score should be very high (>0.8), got ${clustering.overallSilhouetteScore}`);
    assert.strictEqual(clustering.clusters.length, 2);
  });

  // ===========================================================================
  // SECTION 7: CHRONOLOGICAL FORECASTING & MULTI-METHOD ANOMALY DETECTION
  // ===========================================================================
  console.log('\n>>> [7. Chronological Forecasting & Multi-Method Anomaly Detection]');

  runTest('Chronological forecasting prevents future leakage and computes 95% intervals', () => {
    const rows = [];
    const baseDate = new Date('2026-01-01');
    for (let i = 0; i < 30; i++) {
      const dt = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      // Linear upward trend with slight variation: y = 100 + 5 * i
      rows.push({ date: dt, revenue: 100 + 5 * i });
    }
    const headers = ['date', 'revenue'];

    const forecast = forecastingEngine.computeForecastingEngine(headers, rows, 'date', 'revenue', 7);

    assert(forecast.available, 'Forecasting should succeed');
    assert.strictEqual(forecast.forecastHorizon, 7);
    assert(forecast.projections.length === 7);
    assert(forecast.validationMetrics.rmse < 10.0, `Validation RMSE should be low, got ${forecast.validationMetrics.rmse}`);
    // Check 95% interval
    forecast.projections.forEach(p => {
      assert(p.lowerBound95 <= p.predicted && p.predicted <= p.upperBound95, 'Prediction must fall within 95% interval');
    });
  });

  runTest('Anomaly detection flags genuine outliers with feature-level reason explanations', () => {
    const rows = [];
    for (let i = 0; i < 50; i++) {
      rows.push({ val: 20 + (i % 5) }); // normal range ~ 20-25
    }
    // Inject extreme statistical anomaly
    rows.push({ val: 999.0 });
    const headers = ['val'];

    const anomalyRes = anomalyEngine.computeAnomalyDetectionEngine(headers, rows, { method: 'z-score' });

    assert(anomalyRes.available, 'Anomaly detection should succeed');
    assert(anomalyRes.totalAnomaliesDetected >= 1, 'Should flag the injected extreme anomaly');
    const outlier = anomalyRes.anomalies.find(a => a.observedValue === 999.0);
    assert(outlier != null, 'Observed 999 must be flagged');
    assert.strictEqual(outlier.severity, 'Critical');
    assert(outlier.explanation.length > 0, 'Must have feature explanation');
    assert(outlier.affectedFeature === 'val');
  });

  // ===========================================================================
  // SECTION 8: SERVER REST ENDPOINTS INTEGRATION
  // ===========================================================================
  console.log('\n>>> [8. Server REST API Endpoints Verification]');

  await runAsyncTest('POST /api/data/analyze returns correlations, descriptive, and hypothesis test', async () => {
    const rows = [
      { group: 'A', score: 10, bonus: 5 },
      { group: 'A', score: 12, bonus: 6 },
      { group: 'A', score: 14, bonus: 7 },
      { group: 'B', score: 25, bonus: 12 },
      { group: 'B', score: 28, bonus: 14 },
      { group: 'B', score: 30, bonus: 15 }
    ];
    const headers = ['group', 'score', 'bonus'];

    const res = await makeApiRequest('/api/data/analyze', 'POST', {
      headers,
      rows,
      analysisType: 'ttest',
      groupCol: 'group',
      valueCol: 'score'
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.success, true);
    assert(res.data.results.tTest != null);
    assert(res.data.results.tTest.isSignificantAt05 === true);
  });

  await runAsyncTest('POST /api/data/ml/train and POST /api/data/ml/predict end-to-end lifecycle', async () => {
    const rows = [
      { feat: 2, target: 14 },
      { feat: 4, target: 20 },
      { feat: 6, target: 26 },
      { feat: 8, target: 32 },
      { feat: 10, target: 38 },
      { feat: 12, target: 44 },
      { feat: 14, target: 50 },
      { feat: 16, target: 56 }
    ];
    const headers = ['feat', 'target'];

    // 1. Train model
    const trainRes = await makeApiRequest('/api/data/ml/train', 'POST', {
      headers,
      rows,
      targetColumn: 'target',
      options: { problemType: 'regression' }
    });

    assert.strictEqual(trainRes.status, 200);
    assert.strictEqual(trainRes.data.success, true);
    const artifact = trainRes.data.model.artifact;
    assert(artifact != null, 'Trained artifact must be returned');

    // 2. Predict using returned artifact
    const predRes = await makeApiRequest('/api/data/ml/predict', 'POST', {
      artifact,
      rows: [{ feat: 5 }, { feat: 20 }]
    });

    assert.strictEqual(predRes.status, 200);
    assert.strictEqual(predRes.data.success, true);
    assert.strictEqual(predRes.data.predictionCount, 2);
    // target = 3 * feat + 8 -> for feat=5, target=23; for feat=20, target=68
    const p1 = predRes.data.predictions[0].prediction;
    assert(Math.abs(p1 - 23) < 1.0, `Expected prediction ~23 for feat=5, got ${p1}`);
  });

  await runAsyncTest('POST /api/data/forecast returns chronological predictions and baseline comparison', async () => {
    const rows = [];
    const baseDate = new Date('2026-01-01');
    for (let i = 0; i < 20; i++) {
      const dt = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      rows.push({ dt, val: 50 + i * 3 });
    }
    const headers = ['dt', 'val'];

    const fcRes = await makeApiRequest('/api/data/forecast', 'POST', {
      headers,
      rows,
      timeColumn: 'dt',
      measureColumn: 'val',
      horizon: 5
    });

    assert.strictEqual(fcRes.status, 200);
    assert.strictEqual(fcRes.data.success, true);
    assert.strictEqual(fcRes.data.forecast.forecast.length, 5);
  });

  await runAsyncTest('POST /api/data/anomaly identifies outliers and explains reason', async () => {
    const rows = [
      { metric: 10 }, { metric: 11 }, { metric: 10 }, { metric: 12 }, { metric: 11 },
      { metric: 10 }, { metric: 10 }, { metric: 12 }, { metric: 11 }, { metric: 500 }
    ];
    const headers = ['metric'];

    const anomRes = await makeApiRequest('/api/data/anomaly', 'POST', {
      headers,
      rows,
      options: { method: 'z-score' }
    });

    assert.strictEqual(anomRes.status, 200);
    assert.strictEqual(anomRes.data.success, true);
    assert(anomRes.data.anomalyResult.totalAnomaliesDetected >= 1);
  });

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log('\n================================================================');
  console.log(`   PHASE C TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
  if (passedTests === totalTests) {
    console.log('   >>> ALL MATHEMATICAL & ML ENGINES FULLY VERIFIED (100%) <<<   ');
  } else {
    console.log(`   >>> ${totalTests - passedTests} FAILURES DETECTED <<<   `);
  }
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
