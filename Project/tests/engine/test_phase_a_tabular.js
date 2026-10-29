const fs = require('fs');
const path = require('path');
const engine = require('../../engine');
const XLSX = require('xlsx');

console.log('================================================================');
console.log('   INSIGHTIQ AI — PHASE A: TABULAR INGESTION, PROFILING & CLEANING');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${message}`);
  } else {
    console.error(`  ✗ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runPhaseATests() {
  // ===========================================================================
  // SECTION 1: RELIABLE CSV/TSV/DELIMITED INGESTION
  // ===========================================================================
  console.log('>>> [1] Testing Delimited Ingestion, Sniffing & Formatting...');

  // 1.1 Standard RFC-4180 CSV with quotes, commas in quotes, and escaped quotes
  const rfcCsv = `id,name,notes,salary\n101,"Doe, Jane","Senior ""Lead"" Engineer",145000\n102,"Smith, John","Project ""Director""",180000\n103,"Patel, Priya","Staff Analyst",125000\n`;
  const resRfc = await engine.ingestion.ingest(Buffer.from(rfcCsv, 'utf8'), 'employees.csv');
  assert(resRfc.category === 'tabular', 'RFC-4180 CSV recognized as tabular');
  assert(resRfc.totalRows === 3, 'Parsed exactly 3 rows from RFC CSV');
  assert(resRfc.rows[0].name === 'Doe, Jane', 'Correctly preserved comma inside quoted field');
  assert(resRfc.rows[0].notes === 'Senior "Lead" Engineer', 'Correctly unescaped double-quotes');
  assert(resRfc.rows[0].salary === 145000 || resRfc.rows[0].salary === '145000', 'Extracted numeric salary column');

  // 1.2 Multi-line delimiters: Semicolon, Tab, Pipe auto-detection
  const tsvData = "user_id\trole\tdepartment\nu1\tAdmin\tEngineering\nu2\tAnalyst\tFinance\n";
  const resTsv = await engine.ingestion.ingest(Buffer.from(tsvData, 'utf8'), 'roles.tsv');
  assert(resTsv.delimiter === '\t', 'Auto-detected tab delimiter for TSV');
  assert(resTsv.headers.length === 3 && resTsv.totalRows === 2, 'Parsed 3 headers and 2 rows for TSV');

  const pipeData = "sku|description|stock_qty\nSKU-01|Wireless Mouse|150\nSKU-02|Mechanical Keyboard|42\n";
  const resPipe = await engine.ingestion.ingest(Buffer.from(pipeData, 'utf8'), 'inventory.txt');
  assert(resPipe.delimiter === '|', 'Auto-detected pipe delimiter');
  assert(resPipe.rows[1].stock_qty === '42' || resPipe.rows[1].stock_qty === 42, 'Correct row extraction from pipe CSV');

  const semiData = "metric_code;region;q1_target;q2_target\nREV;EMEA;500000;600000\nREV;APAC;450000;550000\n";
  const resSemi = await engine.ingestion.ingest(Buffer.from(semiData, 'utf8'), 'targets.csv');
  assert(resSemi.delimiter === ';', 'Auto-detected semicolon delimiter');
  assert(resSemi.totalRows === 2, 'Correct row count for semicolon CSV');

  // ===========================================================================
  // SECTION 2: ENCODING HYGIENE & CORRUPT/MALFORMED FILE REJECTION
  // ===========================================================================
  console.log('\n>>> [2] Testing Encoding Hygiene & Corrupt/Malformed Handling...');

  // 2.1 UTF-8 with Byte Order Mark (BOM: \uFEFF)
  const bomBuffer = Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from('product,price\nCamera,850\n', 'utf8')]);
  const resBom = await engine.ingestion.ingest(bomBuffer, 'catalog_bom.csv');
  assert(resBom.headers[0] === 'product', 'UTF-8 BOM successfully stripped from header');
  assert(resBom.totalRows === 1, 'Parsed row with stripped BOM');

  // 2.2 UTF-16LE with BOM (0xFF, 0xFE)
  const utf16leContent = Buffer.from('code\tname\n01\tDelta\n', 'utf16le');
  const utf16leBuffer = Buffer.concat([Buffer.from([0xFF, 0xFE]), utf16leContent]);
  const res16le = await engine.ingestion.ingest(utf16leBuffer, 'utf16le_dataset.csv');
  assert(res16le.headers[0] === 'code' && res16le.headers[1] === 'name', 'Decoded UTF-16LE with BOM');
  assert(res16le.rows[0].name === 'Delta', 'Extracted content from UTF-16LE stream');

  // 2.3 Malformed row recovery: under-length (padding) and over-length (excess tracking)
  const malformedCSV = `id,name,score\n1,Alice,95\n2,Bob\n3,Charlie,88,ExtraValue1,ExtraValue2\n4,David,91\n`;
  const resMalformed = await engine.ingestion.ingest(Buffer.from(malformedCSV, 'utf8'), 'scores.csv', { recoverMalformed: true });
  assert(resMalformed.totalRows === 4, 'All 4 rows recovered without dropping');
  assert(resMalformed.rows[1].score === '', 'Short row 2 safely padded with empty string for missing column');
  assert(resMalformed.rows[2].__excessColumns && resMalformed.rows[2].__excessColumns.length === 2, 'Excess columns tracked on row 3');
  assert(resMalformed.primaryTable.malformedRows && resMalformed.primaryTable.malformedRows.length === 2, 'Tracked 2 malformed row warnings');

  // 2.4 Empty file rejection (0 bytes)
  let caughtEmpty = false;
  try {
    await engine.ingestion.ingest(Buffer.alloc(0), 'empty.csv');
  } catch (err) {
    caughtEmpty = true;
    assert(err.message.includes('0 byte') || err.message.includes('empty'), 'Cleanly rejected 0-byte file');
  }
  assert(caughtEmpty, 'Exception thrown for 0-byte file');

  // 2.5 Binary executable rejection (MZ header)
  let caughtBinaryExe = false;
  try {
    const fakeExe = Buffer.concat([Buffer.from([0x4D, 0x5A, 0x90, 0x00]), Buffer.alloc(100)]);
    await engine.ingestion.ingest(fakeExe, 'malicious.csv');
  } catch (err) {
    caughtBinaryExe = true;
    assert(err.message.includes('binary') || err.message.includes('unsupported'), 'Rejected binary executable');
  }
  assert(caughtBinaryExe, 'Exception thrown for binary executable input');

  // 2.6 Corrupt binary stream in CSV rejection
  let caughtCorruptStream = false;
  try {
    const corruptCsv = Buffer.concat([Buffer.from('a,b,c\n1,2,'), Buffer.alloc(30, 0x00), Buffer.from('\n3,4,5')]);
    await engine.ingestion.ingest(corruptCsv, 'corrupt.csv');
  } catch (err) {
    caughtCorruptStream = true;
    assert(err.message.includes('binary') || err.message.includes('corrupt'), 'Rejected corrupt binary stream in CSV');
  }
  assert(caughtCorruptStream, 'Exception thrown for corrupt binary stream');

  // ===========================================================================
  // SECTION 3: MULTI-SHEET EXCEL (XLSX) INGESTION & WORKSHEET SELECTION
  // ===========================================================================
  console.log('\n>>> [3] Testing Multi-Sheet Excel Ingestion & Sheet Selection...');

  const workbook = XLSX.utils.book_new();
  const q1Data = [
    { order_id: 'Q1-1', customer: 'Acme Corp', amount: 1200 },
    { order_id: 'Q1-2', customer: 'Globex Inc', amount: 3400 }
  ];
  const q2Data = [
    { order_id: 'Q2-1', customer: 'Soylent LLC', amount: 5100 },
    { order_id: 'Q2-2', customer: 'Initech', amount: 2800 },
    { order_id: 'Q2-3', customer: 'Umbrella Co', amount: 8900 }
  ];
  const customersData = [
    { cust_id: 'C1', company: 'Acme Corp', tier: 'Enterprise' },
    { cust_id: 'C2', company: 'Globex Inc', tier: 'MidMarket' }
  ];

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(q1Data), 'Q1_Orders');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(q2Data), 'Q2_Orders');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(customersData), 'Customers');

  const xlsxBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  // 3.1 Default Sheet Import (first worksheet)
  const resXlsxDefault = await engine.ingestion.ingest(xlsxBuffer, 'company_data.xlsx');
  assert(resXlsxDefault.category === 'tabular', 'XLSX categorized as tabular');
  assert(resXlsxDefault.format === 'XLSX', 'XLSX format detected');
  assert(resXlsxDefault.totalRows === 2, 'Default imported first sheet (Q1_Orders with 2 rows)');
  assert(resXlsxDefault.availableSheets.length === 3, 'Reported catalog of all 3 available worksheets');
  assert(resXlsxDefault.sheetNames.includes('Customers'), 'Worksheet catalog includes "Customers"');

  // 3.2 Specific Sheet by Name ('Q2_Orders')
  const resXlsxSheetName = await engine.ingestion.ingest(xlsxBuffer, 'company_data.xlsx', { sheetName: 'Q2_Orders' });
  assert(resXlsxSheetName.totalRows === 3, 'Imported selected sheet "Q2_Orders" with 3 rows');
  assert(resXlsxSheetName.rows[0].order_id === 'Q2-1', 'Extracted records from chosen worksheet');

  // 3.3 Specific Sheet by Index (index 2 -> 'Customers')
  const resXlsxSheetIdx = await engine.ingestion.ingest(xlsxBuffer, 'company_data.xlsx', { sheetIndex: 2 });
  assert(resXlsxSheetIdx.primaryTable.sheetName === 'Customers', 'Imported sheet index 2 ("Customers")');
  assert(resXlsxSheetIdx.headers.includes('company'), 'Headers match target sheet schema');

  // ===========================================================================
  // SECTION 4: DATA QUALITY PROFILING ENGINE
  // ===========================================================================
  console.log('\n>>> [4] Testing Data Quality Profiling Engine...');

  const messyProfilingRows = [
    { id: '1', date: '2026-01-15', country: 'United States', revenue: 100, active: 'true' },
    { id: '2', date: '2026-01-16', country: 'United States', revenue: 110, active: 'true' },
    { id: '3', date: '2026-01-17', country: 'United States', revenue: 105, active: 'false' },
    { id: '4', date: 'invalid-date', country: 'Canada', revenue: null, active: 'true' }, // missing revenue, bad date
    { id: '5', date: '2026-01-19', country: 'Canada', revenue: 120, active: 'true' },
    { id: '6', date: '2026-01-20', country: 'United States', revenue: 50000, active: 'false' }, // extreme outlier
    { id: '7', date: '2026-01-21', country: 'United States', revenue: 95, active: 'true' },
    { id: '8', date: '2026-01-22', country: 'Canada', revenue: 102, active: 'false' },
    { id: '1', date: '2026-01-15', country: 'United States', revenue: 100, active: 'true' } // exact duplicate of row 0
  ];
  const profileHeaders = ['id', 'date', 'country', 'revenue', 'active'];

  const profile = engine.profiling.profileTabular(profileHeaders, messyProfilingRows);

  assert(profile.rowCount === 9, 'Profile reported 9 rows');
  assert(profile.columnCount === 5, 'Profile reported 5 columns');
  assert(profile.duplicateRows.count === 1, 'Detected exact duplicate row');
  assert(profile.duplicateRows.percentage > 10, 'Duplicate percentage calculated (>10%)');
  assert(profile.qualityScore >= 0 && profile.qualityScore <= 100, 'Quality score bounded between 0 and 100');

  // Check type inference & confidence
  const revenueCol = profile.columns.find(c => c.columnName === 'revenue');
  assert(revenueCol.inferredType === 'integer' || revenueCol.inferredType === 'number' || revenueCol.roles.isNumeric, 'Revenue column inferred as numeric');
  assert(revenueCol.typeConfidence >= 0.8, 'Revenue column confidence >= 80%');
  assert(revenueCol.missingCount === 1, 'Detected 1 missing cell in revenue');
  assert(revenueCol.outliers.iqrOutliersCount >= 1, '1.5x IQR outlier detected in revenue');

  const dateCol = profile.columns.find(c => c.columnName === 'date');
  assert(dateCol.inferredType === 'date' || dateCol.roles.isTemporal, 'Date column inferred as date');
  assert(dateCol.invalidDateCount === 1, 'Detected 1 invalid date string');

  const countryCol = profile.columns.find(c => c.columnName === 'country');
  assert(countryCol.roles.isCategorical || countryCol.inferredType === 'category' || countryCol.inferredType === 'string', 'Country column categorized');
  assert(countryCol.topCategories.some(c => c.value === 'United States' && c.count >= 5), 'Categorical distribution counted frequencies');

  // ===========================================================================
  // SECTION 5: SAFE CLEANING ENGINE (PLANNING & EXECUTION)
  // ===========================================================================
  console.log('\n>>> [5] Testing Safe Cleaning Engine...');

  const cleaningHeaders = ['ID', 'State Name', 'Sales Amount', 'Signup Date'];
  const rawRowsForCleaning = [
    { 'ID': '001', 'State Name': 'California', 'Sales Amount': 100, 'Signup Date': '2026-01-01' },
    { 'ID': '002', 'State Name': ' Califorina ', 'Sales Amount': 110, 'Signup Date': '2026-01-02' }, // typo & whitespace
    { 'ID': '003', 'State Name': 'California', 'Sales Amount': null, 'Signup Date': '2026-01-03' }, // missing sales
    { 'ID': '004', 'State Name': 'New York', 'Sales Amount': 105, 'Signup Date': '2026-01-04' },
    { 'ID': '005', 'State Name': 'New York', 'Sales Amount': 99999, 'Signup Date': '2026-01-05' }, // extreme outlier
    { 'ID': '001', 'State Name': 'California', 'Sales Amount': 100, 'Signup Date': '2026-01-01' } // duplicate row
  ];

  // 5.1 Plan Generation
  const plan = engine.cleaning.generateCleaningPlan(cleaningHeaders, rawRowsForCleaning);

  assert(Array.isArray(plan.operations) && plan.operations.length > 0, 'Generated explainable operations');
  assert(plan.summary.totalProposedOperations >= 3, 'Proposed at least 3 operations (missing, duplicate, outlier, typo)');
  const duplicateOp = plan.operations.find(o => o.type === 'deduplicate' || o.id === 'op_handle_duplicates');
  assert(duplicateOp !== undefined, 'Cleaning plan proposed duplicate row removal');
  assert((duplicateOp.detectedIssue || duplicateOp.reason || '').toLowerCase().includes('duplicate'), 'Operation has descriptive rationale');

  // 5.2 Safe Cleaning Execution (Non-Destructive)
  // Raw dataset v1 copy
  const originalV1 = JSON.parse(JSON.stringify(rawRowsForCleaning));

  const cleanResult = engine.cleaning.executeCleaning(cleaningHeaders, rawRowsForCleaning, plan.operations, {
    missingStrategy: 'auto',
    outlierStrategy: 'winsorize',
    harmonizeCategories: true,
    normalizeColumnNames: true
  });

  // Verify non-destructive invariant: original input was not mutated
  assert(rawRowsForCleaning.length === 6, 'Original raw rows length preserved (non-destructive)');
  assert(rawRowsForCleaning[1]['State Name'] === ' Califorina ', 'Original uncleaned typo preserved in v1');

  // Verify cleaned v2 output
  assert(cleanResult.cleanedRows.length === 5, 'Cleaned dataset v2 has 5 rows (1 duplicate removed)');
  assert(cleanResult.cleanedRows[1].state_name === 'California', 'Harmonized typo " Califorina " -> "California" and trimmed');
  assert(cleanResult.cleanedRows[2].sales_amount !== null, 'Missing value auto-imputed in row 2');
  assert(cleanResult.cleanedRows[4].sales_amount < 99999, 'Outlier winsorized/capped from 99999 to bounded value');
  assert(cleanResult.cleanedHeaders.includes('state_name'), 'Headers normalized to snake_case');

  // Verify Auditable Transformation Log
  assert(Array.isArray(cleanResult.auditLog) && cleanResult.auditLog.length > 0, 'Audit log recorded');
  const firstAuditEntry = cleanResult.auditLog[0];
  assert(firstAuditEntry.timestamp && firstAuditEntry.operationId, 'Audit entry contains timestamp and operationId');

  // 5.3 Missing Strategy: Quarantine Option
  const quarantineOps = plan.operations.map(o => {
    if (o.type === 'missing_value_impute' || o.type === 'impute_missing') {
      return { ...o, selectedAction: 'quarantine' };
    }
    return o;
  });
  const quarantineResult = engine.cleaning.executeCleaning(cleaningHeaders, originalV1, quarantineOps, {
    missingStrategy: 'quarantine',
    outlierStrategy: 'keep'
  });
  assert(quarantineResult.quarantinedRows.length >= 1, 'Quarantined rows with missing values separately');
  assert(quarantineResult.quarantinedRows[0].reason.toLowerCase().includes('missing'), 'Quarantine record has auditable reason');

  // 5.4 Rollback Simulation
  // User switches back from v2 to v1
  const datasetStore = {
    'ds_v1': { version: 1, rows: originalV1, isRaw: true },
    'ds_v2': { version: 2, rows: cleanResult.cleanedRows, parentId: 'ds_v1' }
  };
  let activeVersion = 'ds_v2';
  assert(datasetStore[activeVersion].version === 2, 'Active version is v2');
  // Trigger rollback
  activeVersion = datasetStore[activeVersion].parentId;
  assert(activeVersion === 'ds_v1', 'Rolled back to v1');
  assert(datasetStore[activeVersion].rows.length === 6, 'Rolled back dataset contains all original raw rows');

  // ===========================================================================
  // SECTION 6: PERMISSION & DESTRUCTIVE OPERATION GUARDS
  // ===========================================================================
  console.log('\n>>> [6] Testing Access Control & Destructive Guard Simulation...');

  // 6.1 Read-Only Simulation
  function simulateCleaningPermissionCheck(userRole, targetDataset) {
    if (userRole === 'viewer' || userRole === 'guest') {
      throw new Error('403 Forbidden: Read-only users cannot execute dataset transformations.');
    }
    if (targetDataset.isLocked) {
      throw new Error('423 Locked: Production dataset is locked against modifications.');
    }
    return true;
  }

  let caughtForbidden = false;
  try {
    simulateCleaningPermissionCheck('viewer', datasetStore['ds_v1']);
  } catch (err) {
    caughtForbidden = true;
    assert(err.message.includes('403 Forbidden'), 'Viewer role blocked from running cleaning');
  }
  assert(caughtForbidden, 'Permission guard threw for viewer');

  // 6.2 Destructive transformation guard check
  function validateDestructiveConfirmation(options, userConfirmed) {
    const isDestructive = options.missingStrategy === 'drop' || options.missingStrategy === 'quarantine' || options.outlierStrategy === 'quarantine';
    if (isDestructive && !userConfirmed) {
      throw new Error('ConfirmationRequired: Potentially destructive row-filtering transformation requires explicit confirmation.');
    }
    return true;
  }

  let caughtConfirmationNeeded = false;
  try {
    validateDestructiveConfirmation({ missingStrategy: 'drop' }, false);
  } catch (err) {
    caughtConfirmationNeeded = true;
    assert(err.message.includes('ConfirmationRequired'), 'Blocked unconfirmed destructive drop');
  }
  assert(caughtConfirmationNeeded, 'Confirmation guard triggered for destructive operation');
  assert(validateDestructiveConfirmation({ missingStrategy: 'drop' }, true) === true, 'Allowed destructive operation when user explicitly confirmed');

  // Summary
  console.log('\n================================================================');
  console.log(`   PHASE A VERIFICATION COMPLETED: ${passedTests}/${totalTests} TESTS PASSED`);
  console.log('================================================================\n');
}

runPhaseATests().catch(err => {
  console.error('\nTest Suite Fatal Failure:', err);
  process.exit(1);
});
