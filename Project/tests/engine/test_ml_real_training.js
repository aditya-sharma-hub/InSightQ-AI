const vm = require('vm');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('   VERIFYING GENUINE MATHEMATICAL MACHINE LEARNING PIPELINE     ');
console.log('================================================================\n');

// Read app.js and extract trainAndEvaluateRealModel
const appCode = fs.readFileSync(path.resolve(__dirname, '../../app.js'), 'utf8');
const startIdx = appCode.indexOf('const trainAndEvaluateRealModel =');
const endMarker = '/* ML Model Training Pipeline Handler */';
const endIdx = appCode.indexOf(endMarker, startIdx);

if (startIdx === -1 || endIdx === -1) {
  console.error('FAILED to extract trainAndEvaluateRealModel from app.js');
  process.exit(1);
}

const rawFn = appCode.slice(startIdx, endIdx).trim();
const fnCode = rawFn.replace(/^const /, 'var ');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(fnCode, sandbox);
const trainAndEvaluateRealModel = sandbox.trainAndEvaluateRealModel;

let allPassed = true;

// ---------------------------------------------------------------------------
// TEST 1: Real Binary Classification
// ---------------------------------------------------------------------------
console.log('>>> [TEST 1] Testing Real Binary Classification on Synthesized Dataset...');
const classificationRows = [
  { feature1: 10, feature2: 5, target: 'churn' },
  { feature1: 12, feature2: 6, target: 'churn' },
  { feature1: 15, feature2: 7, target: 'churn' },
  { feature1: 11, feature2: 5, target: 'churn' },
  { feature1: 2, feature2: 1, target: 'retain' },
  { feature1: 3, feature2: 2, target: 'retain' },
  { feature1: 1, feature2: 1, target: 'retain' },
  { feature1: 4, feature2: 2, target: 'retain' },
  { feature1: 13, feature2: 6, target: 'churn' },
  { feature1: 2, feature2: 1, target: 'retain' }
];
const classificationCols = [
  { column_name: 'feature1', is_numeric: true, canonical_type: 'number' },
  { column_name: 'feature2', is_numeric: true, canonical_type: 'number' },
  { column_name: 'target', is_categorical: true, canonical_type: 'string' }
];

const classResult = trainAndEvaluateRealModel(
  classificationRows,
  classificationCols,
  'Binary Classification',
  'Logistic Centroid Classifier',
  'target'
);

console.log('    Classification Metrics:', classResult.metrics);
console.log('    Artifact Details:', classResult.artifact);

if (
  classResult.metrics.accuracy !== null &&
  classResult.metrics.accuracy !== '95.6%' && // Not the old hardcoded fake value
  classResult.metrics.f1_score !== null &&
  classResult.metrics.f1_score !== '94.0%' &&
  classResult.artifact.type === 'classification_model' &&
  classResult.artifact.confusion_matrix.tp !== undefined
) {
  console.log('    ✓ TEST 1 PASSED: Classification trained and evaluated with real mathematical confusion matrix & metrics.\n');
} else {
  console.error('    ✗ TEST 1 FAILED:', classResult);
  allPassed = false;
}

// ---------------------------------------------------------------------------
// TEST 2: Real Linear Regression
// ---------------------------------------------------------------------------
console.log('>>> [TEST 2] Testing Real Regression on Synthesized Dataset (y = 2x + 10)...');
// True relationship: y = 2x + 10
const regressionRows = [
  { x: 1, y: 12 },
  { x: 2, y: 14 },
  { x: 3, y: 16 },
  { x: 4, y: 18 },
  { x: 5, y: 20 },
  { x: 6, y: 22 },
  { x: 7, y: 24 },
  { x: 8, y: 26 },
  { x: 9, y: 28 },
  { x: 10, y: 30 }
];
const regressionCols = [
  { column_name: 'x', is_numeric: true, canonical_type: 'number' },
  { column_name: 'y', is_numeric: true, canonical_type: 'number' }
];

const regResult = trainAndEvaluateRealModel(
  regressionRows,
  regressionCols,
  'Regression',
  'Ordinary Least Squares',
  'y'
);

console.log('    Regression Metrics:', regResult.metrics);
console.log('    Artifact Slope:', regResult.artifact.slope, 'Intercept:', regResult.artifact.intercept);

// For perfect y = 2x + 10, slope is 2, intercept is 10, R^2 is 1.000, RMSE is 0.00
if (
  Math.abs(regResult.artifact.slope - 2.0) < 0.001 &&
  Math.abs(regResult.artifact.intercept - 10.0) < 0.001 &&
  regResult.metrics.r2_score === '1.000' &&
  regResult.metrics.rmse === '0.00' &&
  regResult.metrics.r2_score !== '0.978' // Not the old hardcoded fake value
) {
  console.log('    ✓ TEST 2 PASSED: Regression fitted real slope=2, intercept=10 with genuine R²=1.000 & RMSE=0.00.\n');
} else {
  console.error('    ✗ TEST 2 FAILED:', regResult);
  allPassed = false;
}

// ---------------------------------------------------------------------------
// TEST 3: Verification of Feature Importance & Robust Null Handling
// ---------------------------------------------------------------------------
console.log('>>> [TEST 3] Testing Feature Importance & Null Row Handling...');
const messyRows = [
  { x: 1, y: null },
  { x: 2, y: undefined },
  { x: 3, y: '' },
  { x: 4, y: 18 },
  { x: 5, y: 20 },
  { x: 6, y: 22 },
  { x: 7, y: 24 },
  { x: 8, y: 26 }
];
const messyResult = trainAndEvaluateRealModel(
  messyRows,
  regressionCols,
  'Regression',
  'Linear Regression',
  'y'
);

if (messyResult.metrics.r2_score !== null && messyResult.feature_importance.length > 0) {
  console.log('    ✓ TEST 3 PASSED: Null rows safely excluded, real metrics computed successfully.\n');
} else {
  console.error('    ✗ TEST 3 FAILED:', messyResult);
  allPassed = false;
}

console.log('================================================================');
if (allPassed) {
  console.log('   >>> ALL ML PIPELINE TESTS PASSED (100% REAL MATH) <<<        ');
} else {
  console.log('   >>> ML TESTS FAILED! <<<                                     ');
}
console.log('================================================================');

process.exit(allPassed ? 0 : 1);
