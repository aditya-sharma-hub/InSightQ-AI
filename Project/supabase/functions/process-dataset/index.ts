import { corsHeaders, buildJsonResponse, buildErrorResponse } from '../_shared/cors.ts';
import { verifyAuthUser, verifyDatasetOwnership } from '../_shared/auth.ts';
import { broadcastRealtimeEvent } from '../_shared/realtimeBroadcast.ts';

/**
 * Helper: Parse CSV text into array of object rows
 */
/**
 * Helper: Parse CSV text into array of object rows with support for quoted strings and commas
 */
function parseCSV(csvText: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines: string[][] = [];
  let row: string[] = [""];
  let insideQuote = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === ',' && !insideQuote) {
      row.push('');
    } else if ((char === '\r' || char === '\n') && !insideQuote) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      lines.push(row);
      row = [''];
    } else {
      row[row.length - 1] += char;
    }
  }
  if (row.length > 1 || row[0] !== '') {
    lines.push(row);
  }

  const cleanLines = lines.filter(l => l.length > 0 && l.some(cell => cell.trim().length > 0));
  if (cleanLines.length === 0) {
    throw new Error('Dataset file is empty.');
  }

  const headers = cleanLines[0].map(h => h.trim().replace(/^["']|["']$/g, ''));
  if (headers.length === 0 || headers.every((h) => !h)) {
    throw new Error('Dataset file missing valid header column names.');
  }

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < cleanLines.length; i++) {
    const vals = cleanLines[i];
    const rObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rObj[h] = vals[idx] !== undefined ? vals[idx].trim().replace(/^["']|["']$/g, '') : '';
    });
    rows.push(rObj);
  }

  return { headers, rows };
}

/**
 * Canonical Type Resolver
 */
const CanonicalTypeResolver = {
  isIdentifierName(name: string): boolean {
    const n = (name || '').toLowerCase().trim();
    return (
      n === 'id' ||
      n.endsWith('_id') ||
      n.startsWith('id_') ||
      n === 'uid' ||
      n === 'uuid' ||
      n.includes('customer_id') ||
      n.includes('user_id') ||
      n.includes('order_id') ||
      n.includes('transaction_id') ||
      n.includes('account_id') ||
      n.includes('client_id') ||
      n.includes('postal_code') ||
      n.includes('zip_code') ||
      n.includes('zipcode') ||
      n.includes('account_number') ||
      n.includes('account_no') ||
      n.includes('email') ||
      n.includes('phone') ||
      n.includes('username') ||
      n === 'name' ||
      n.endsWith('_name') ||
      n.startsWith('name_')
    );
  },

  isTemporalName(name: string): boolean {
    const n = (name || '').toLowerCase().trim();
    const temporalKeywords = [
      'date', 'time', 'timestamp', 'created_at', 'updated_at',
      'signup', 'purchase', 'order_date', 'transaction_date', 'event'
    ];
    const excludedKeywords = [
      'spend', 'revenue', 'price', 'quantity', 'score', 'frequency',
      'amount', 'cost', 'fee', 'charge', 'rate', 'value', 'count'
    ];
    
    const hasKeyword = temporalKeywords.some(kw => n.includes(kw));
    const hasExclude = excludedKeywords.some(kw => n.includes(kw));
    
    return hasKeyword && !hasExclude;
  },

  isExcelSerialDate(val: any): boolean {
    const num = Number(val);
    if (isNaN(num) || !isFinite(num)) return false;
    return num >= 30000 && num <= 80000;
  },

  inferColumnProperties(colName: string, rawValues: string[]): {
    canonical_type: string;
    is_numeric: boolean;
    is_temporal: boolean;
    is_identifier: boolean;
    is_boolean: boolean;
    is_categorical: boolean;
  } {
    const nonNullValues = (rawValues || []).filter(
      v => v !== '' && v !== null && v !== undefined && String(v).toLowerCase() !== 'null'
    );

    const isId = CanonicalTypeResolver.isIdentifierName(colName);
    
    if (nonNullValues.length === 0) {
      return {
        canonical_type: 'string',
        is_numeric: false,
        is_temporal: false,
        is_identifier: isId,
        is_boolean: false,
        is_categorical: !isId
      };
    }

    let isTemporal = false;
    let isDatetime = false;

    const isSerialDate = nonNullValues.every(v => CanonicalTypeResolver.isExcelSerialDate(v));
    const hasTemporalName = CanonicalTypeResolver.isTemporalName(colName);

    if (isSerialDate && hasTemporalName) {
      isTemporal = true;
      isDatetime = nonNullValues.some(v => Number(v) % 1 !== 0);
    } else {
      const dateRegexes = [
        /^\d{4}-\d{2}-\d{2}$/,
        /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/,
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/,
        /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}\s+\d{2}:\d{2}(:\d{2})?$/,
        /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/,
        /^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\s+\d{2}:\d{2}(:\d{2})?$/
      ];

      const parseCount = nonNullValues.filter(v => {
        const s = String(v).trim();
        if (!isNaN(Number(s)) && s.length < 5) return false;
        if (dateRegexes.some(r => r.test(s))) return true;
        const t = Date.parse(s);
        return !isNaN(t) && isNaN(Number(s));
      }).length;

      const parseRate = parseCount / nonNullValues.length;
      if (parseRate >= 0.8 || (hasTemporalName && parseRate > 0)) {
        isTemporal = true;
        isDatetime = nonNullValues.some(v => {
          const s = String(v);
          return s.includes(':') || s.includes('T');
        });
      }
    }

    if (isTemporal) {
      return {
        canonical_type: isDatetime ? 'datetime' : 'date',
        is_numeric: false,
        is_temporal: true,
        is_identifier: isId,
        is_boolean: false,
        is_categorical: false
      };
    }

    const cleanNumericValue = (v: any) => {
      if (v === null || v === undefined || v === '') return NaN;
      const s = String(v).trim().replace(/^[\$€£¥\s]+/, '').replace(/,/g, '');
      if (s === '' || s.toLowerCase() === 'null' || s.toLowerCase() === 'nan' || s.toLowerCase() === 'infinity') return NaN;
      const num = Number(s);
      return isFinite(num) ? num : NaN;
    };

    const coercibleCount = nonNullValues.filter(v => !isNaN(cleanNumericValue(v))).length;
    const numericCoercionRate = nonNullValues.length > 0 ? (coercibleCount / nonNullValues.length) : 0;
    const isNumericType = numericCoercionRate >= 0.8;

    if (isId) {
      return {
        canonical_type: 'string',
        is_numeric: false,
        is_temporal: false,
        is_identifier: true,
        is_boolean: false,
        is_categorical: false
      };
    }

    if (isNumericType) {
      const numericValues = nonNullValues.map(v => cleanNumericValue(v)).filter(v => !isNaN(v));
      const uniqueVals = new Set(numericValues);
      const isBoolRange = uniqueVals.size <= 2 && [...uniqueVals].every(val => val === 0 || val === 1);
      
      if (isBoolRange && (colName.toLowerCase().includes('is_') || colName.toLowerCase().includes('has_') || colName.toLowerCase() === 'status')) {
        return {
          canonical_type: 'boolean',
          is_numeric: false,
          is_temporal: false,
          is_identifier: false,
          is_boolean: true,
          is_categorical: false
        };
      }

      return {
        canonical_type: 'number',
        is_numeric: true,
        is_temporal: false,
        is_identifier: false,
        is_boolean: false,
        is_categorical: false
      };
    }

    const isAllBoolean = nonNullValues.every(v =>
      ['true', 'false', 'yes', 'no', '0', '1', 't', 'f'].includes(String(v).toLowerCase().trim())
    );

    if (isAllBoolean) {
      return {
        canonical_type: 'boolean',
        is_numeric: false,
        is_temporal: false,
        is_identifier: false,
        is_boolean: true,
        is_categorical: false
      };
    }

    return {
      canonical_type: 'string',
      is_numeric: false,
      is_temporal: false,
      is_identifier: false,
      is_boolean: false,
      is_categorical: true
    };
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  const { auth, errorResponse } = await verifyAuthUser(req);
  if (errorResponse) return errorResponse;

  let datasetId = '';

  try {
    const body = await req.json();
    datasetId = body.dataset_id;
    if (!datasetId) return buildErrorResponse('dataset_id parameter is required', 400);

    /* Step 1: Verify Ownership & Update Status to 'processing' */
    const isOwner = await verifyDatasetOwnership(auth!.supabaseClient, datasetId, auth!.userId);
    if (!isOwner) return buildErrorResponse('Dataset not found or access denied', 403);

    await auth!.supabaseClient
      .from('datasets')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', datasetId);

    /* Log Stage: validation */
    await auth!.supabaseClient.rpc('log_processing', {
      p_dataset_id: datasetId,
      p_user_id: auth!.userId,
      p_processing_stage: 'validation',
      p_status: 'started',
      p_execution_time: Date.now() - startTime
    });

    /* Step 2: Retrieve Dataset Metadata & Storage File */
    const { data: dataset, error: dsError } = await auth!.supabaseClient
      .from('datasets')
      .select('*')
      .eq('id', datasetId)
      .single();

    if (dsError || !dataset) throw new Error('Failed to load dataset record.');

    const { data: fileData, error: fileError } = await auth!.supabaseClient.storage
      .from('datasets')
      .download(dataset.storage_path);

    if (fileError || !fileData) {
      throw new Error(`Failed to download dataset file from storage path: ${dataset.storage_path}`);
    }

    const fileText = await fileData.text();
    if (!fileText || fileText.trim().length === 0) {
      throw new Error('Downloaded dataset file is 0 bytes or empty.');
    }

    /* Step 3: Parse CSV & Extract Schema */
    const { headers, rows } = parseCSV(fileText);
    const totalRows = rows.length;
    const totalColumns = headers.length;

    let numericCount = 0;
    let categoricalCount = 0;
    let datetimeCount = 0;
    let totalMissingValues = 0;

    /* Delete old column dictionary for fresh extraction */
    await auth!.supabaseClient.from('dataset_columns').delete().eq('dataset_id', datasetId);

    /* Log Stage: schema_extraction */
    await auth!.supabaseClient.rpc('log_processing', {
      p_dataset_id: datasetId,
      p_user_id: auth!.userId,
      p_processing_stage: 'schema_extraction',
      p_status: 'in_progress',
      p_execution_time: Date.now() - startTime
    });

    // Check if extended columns exist on dataset_columns table
    let hasExtendedColumns = false;
    try {
      const { error: probeError } = await auth!.supabaseClient
        .from('dataset_columns')
        .select('canonical_type')
        .limit(1);
      if (!probeError) {
        hasExtendedColumns = true;
      }
    } catch (_e) {
      hasExtendedColumns = false;
    }

    const columnInserts = [];
    for (let idx = 0; idx < headers.length; idx++) {
      const colName = headers[idx];
      const colValues = rows.map((r) => r[colName] || '');
      const missingCount = colValues.filter((v) => v === '' || v === null || v === undefined).length;
      totalMissingValues += missingCount;

      const uniqueValues = new Set(colValues.filter((v) => v !== ''));
      const props = CanonicalTypeResolver.inferColumnProperties(colName, colValues);
      const nullPct = Number(((missingCount / Math.max(1, totalRows)) * 100).toFixed(2));

      if (props.is_numeric) numericCount++;
      else if (props.is_temporal) datetimeCount++;
      else categoricalCount++;

      const sampleValues = Array.from(uniqueValues).slice(0, 5);

      const colObj: Record<string, any> = {
        dataset_id: datasetId,
        column_name: colName,
        data_type: props.canonical_type,
        null_percentage: nullPct,
        unique_values: uniqueValues.size,
        sample_values: sampleValues,
        is_target: idx === headers.length - 1
      };

      if (hasExtendedColumns) {
        colObj.canonical_type = props.canonical_type;
        colObj.source_type = props.canonical_type;
        colObj.is_numeric = props.is_numeric;
        colObj.is_temporal = props.is_temporal;
        colObj.is_identifier = props.is_identifier;
        if (props.is_boolean !== undefined) colObj.is_boolean = props.is_boolean;
        if (props.is_categorical !== undefined) colObj.is_categorical = props.is_categorical;
      }

      columnInserts.push(colObj);
    }

    const { error: colError } = await auth!.supabaseClient
      .from('dataset_columns')
      .insert(columnInserts);

    if (colError) console.error('[Process Dataset Warning] Column insert error:', colError);

    /* Step 4: Calculate & Store Statistics */
    await auth!.supabaseClient
      .from('dataset_statistics')
      .upsert({
        dataset_id: datasetId,
        total_rows: totalRows,
        total_columns: totalColumns,
        numeric_columns: numericCount,
        categorical_columns: categoricalCount,
        datetime_columns: datetimeCount,
        memory_usage: dataset.file_size || fileText.length
      }, { onConflict: 'dataset_id' });

    /* Step 5: Calculate Quality Metrics */
    const totalCells = Math.max(1, totalRows * totalColumns);
    const missingPercentage = (totalMissingValues / totalCells) * 100;
    const qualityScore = Math.max(0.00, Math.min(100.00, Number((100.00 - (missingPercentage * 0.5)).toFixed(2))));

    await auth!.supabaseClient
      .from('dataset_quality')
      .upsert({
        dataset_id: datasetId,
        duplicate_rows: 0,
        missing_values: totalMissingValues,
        outlier_count: 0,
        quality_score: qualityScore
      }, { onConflict: 'dataset_id' });

    /* Step 6: Mark Status Completed & Log Completion */
    await auth!.supabaseClient
      .from('datasets')
      .update({
        status: 'active',
        row_count: totalRows,
        column_count: totalColumns,
        updated_at: new Date().toISOString()
      })
      .eq('id', datasetId);

    const totalExecTime = Date.now() - startTime;
    await auth!.supabaseClient.rpc('log_processing', {
      p_dataset_id: datasetId,
      p_user_id: auth!.userId,
      p_processing_stage: 'completed',
      p_status: 'completed',
      p_execution_time: totalExecTime
    });

    /* Broadcast Realtime Event */
    await broadcastRealtimeEvent(
      auth!.supabaseClient,
      auth!.userId,
      `Dataset processing completed for dataset ${datasetId}`
    );

    return buildJsonResponse({
      success: true,
      dataset_id: datasetId,
      status: 'active',
      statistics: {
        total_rows: totalRows,
        total_columns: totalColumns,
        numeric_columns: numericCount,
        quality_score: qualityScore
      },
      execution_time_ms: totalExecTime
    });
  } catch (err: any) {
    const totalExecTime = Date.now() - startTime;
    console.error('[Process Dataset Error]', err);

    if (datasetId && auth) {
      await auth.supabaseClient
        .from('datasets')
        .update({ status: 'error', updated_at: new Date().toISOString() })
        .eq('id', datasetId);

      await auth.supabaseClient.rpc('log_processing', {
        p_dataset_id: datasetId,
        p_user_id: auth.userId,
        p_processing_stage: 'failed',
        p_status: 'failed',
        p_execution_time: totalExecTime
      });

      await broadcastRealtimeEvent(
        auth.supabaseClient,
        auth.userId,
        `Dataset processing failed: ${err.message}`
      );
    }

    return buildErrorResponse(err.message || 'Dataset processing pipeline failed.', 500);
  }
});
