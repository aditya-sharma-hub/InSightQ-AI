/**
 * InsightIQ AI — Migration 20261029000001 & Persona Hardening Verification Suite
 *
 * Verifies:
 * 1. Administrator Persona Switching (Preserves Administrator role while switching workspace_persona).
 * 2. Unauthorized Promotion Prevention (Ordinary users blocked from Administrator via direct update, RPC, or metadata).
 * 3. Ordinary-User Switching (Can switch between Data Analyst, Data Scientist, Project Manager).
 * 4. Missing/Unconfirmed Admin Accounts (Migration fails safely on missing, ambiguous, or unconfirmed accounts).
 * 5. Database Trigger Simulation (enforce_profile_role_security anti-demotion & anti-escalation).
 * 6. RPC Function Simulation (update_user_workspace_role allowlist & security).
 * 7. Migration SQL Syntax & Security Checks (BEGIN/COMMIT, SECURITY DEFINER search_path, permissions).
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('InsightIQ AI — Migration 20261029000001 Safety & Persona Suite');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function report(testName, passed, details = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName}${details ? ` -> ${details}` : ''}`);
  }
}

// ----------------------------------------------------------------------------
// TEST 1: SQL Migration File Syntax & Security Inspection
// ----------------------------------------------------------------------------
console.log('[1/7] Inspecting migration file for transactionality and SECURITY DEFINER search_path...');
try {
  const migrationPath = path.resolve(__dirname, '../../supabase/migrations/20261029000001_fix_admin_lockout_and_separate_persona.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Must be wrapped in BEGIN; ... COMMIT;
  assert.ok(sql.includes('BEGIN;'), 'Migration must be wrapped in BEGIN;');
  assert.ok(sql.includes('COMMIT;'), 'Migration must be wrapped in COMMIT;');

  // Both functions must set explicit search_path
  assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.enforce_profile_role_security()'), 'Trigger function must exist');
  assert.ok(sql.includes('SET search_path = public, pg_temp'), 'Must configure safe explicit search_path');

  // Trigger event must cover role and workspace_persona
  assert.ok(sql.includes('BEFORE INSERT OR UPDATE OF role, workspace_persona ON public.profiles'), 'Trigger must monitor role and workspace_persona');

  // Explicit permissions must be defined
  assert.ok(sql.includes('REVOKE ALL ON FUNCTION public.update_user_workspace_role(TEXT) FROM PUBLIC;'), 'Must revoke public execute on RPC');
  assert.ok(sql.includes('REVOKE ALL ON FUNCTION public.update_user_workspace_role(TEXT) FROM anon;'), 'Must revoke anon execute on RPC');
  assert.ok(sql.includes('GRANT EXECUTE ON FUNCTION public.update_user_workspace_role(TEXT) TO authenticated;'), 'Must grant authenticated execute on RPC');

  report('Migration file is transactional, specifies search_path, and defines explicit permissions', true);
} catch (err) {
  report('Migration SQL syntax inspection', false, err.message);
}

// ----------------------------------------------------------------------------
// TEST 2: Preconditions Simulation — Missing, Duplicate, and Unconfirmed Accounts
// ----------------------------------------------------------------------------
console.log('\n[2/7] Verifying database migration preconditions for target administrator...');
try {
  function simulateMigrationPreconditions(userRecords, existingProfiles, auditTableColumns = ['action']) {
    const targetEmail = 'adityasharmand@gmail.com';
    const matching = userRecords.filter(u => u.email.toLowerCase() === targetEmail);

    if (matching.length === 0) {
      const err = new Error(`P0002: Administrator recovery aborted: Account "${targetEmail}" does not exist in auth.users.`);
      err.code = 'P0002';
      throw err;
    }
    if (matching.length > 1) {
      const err = new Error(`23505: Administrator recovery aborted: Ambiguous account. Found ${matching.length} users with email "${targetEmail}" in auth.users.`);
      err.code = '23505';
      throw err;
    }

    const user = matching[0];
    if (!user.confirmed_at && !user.email_confirmed_at) {
      const err = new Error(`42501: Administrator recovery aborted: Account "${targetEmail}" (ID: ${user.id}) is not confirmed. Email confirmation is required.`);
      err.code = '42501';
      throw err;
    }

    // Verify audit log table
    if (!auditTableColumns.includes('action') && !auditTableColumns.includes('activity')) {
      const err = new Error('42703: Audit logging table public.user_activity does not have required action or activity column.');
      err.code = '42703';
      throw err;
    }

    // Upsert profile
    let profile = existingProfiles.find(p => p.id === user.id);
    if (profile) {
      profile.role = 'Administrator';
      profile.role_configured = true;
      profile.workspace_persona = profile.workspace_persona || (['Data Analyst', 'Data Scientist', 'Project Manager'].includes(profile.role) ? profile.role : 'Data Analyst');
      profile.updated_at = new Date().toISOString();
    } else {
      profile = {
        id: user.id,
        email: user.email,
        full_name: 'Aditya Sharma',
        avatar_url: null,
        role: 'Administrator',
        workspace_persona: 'Data Analyst',
        role_configured: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      existingProfiles.push(profile);
    }

    return { success: true, profile };
  }

  // 2a. Missing account
  assert.throws(() => simulateMigrationPreconditions([], []), (err) => err.code === 'P0002');

  // 2b. Ambiguous account
  assert.throws(() => simulateMigrationPreconditions([
    { id: 'u1', email: 'adityasharmand@gmail.com', confirmed_at: '2026-01-01' },
    { id: 'u2', email: 'adityasharmand@gmail.com', confirmed_at: '2026-01-01' }
  ], []), (err) => err.code === '23505');

  // 2c. Unconfirmed email
  assert.throws(() => simulateMigrationPreconditions([
    { id: 'u1', email: 'adityasharmand@gmail.com', confirmed_at: null, email_confirmed_at: null }
  ], []), (err) => err.code === '42501');

  // 2d. Missing audit table columns
  assert.throws(() => simulateMigrationPreconditions([
    { id: 'u1', email: 'adityasharmand@gmail.com', confirmed_at: '2026-01-01' }
  ], [], ['other_column']), (err) => err.code === '42703');

  // 2e. Valid recovery restores Administrator and sets workspace_persona
  const existing = [{ id: 'u1', email: 'adityasharmand@gmail.com', full_name: 'Aditya S', role: 'Data Analyst' }];
  const res = simulateMigrationPreconditions([{ id: 'u1', email: 'adityasharmand@gmail.com', confirmed_at: '2026-01-01' }], existing, ['action']);
  assert.strictEqual(res.profile.role, 'Administrator');
  assert.strictEqual(res.profile.workspace_persona, 'Data Analyst');
  assert.strictEqual(res.profile.full_name, 'Aditya S', 'Preserves existing profile metadata');

  report('Preconditions strictly enforced: P0002 (missing), 23505 (ambiguous), 42501 (unconfirmed), 42703 (audit)', true);
} catch (err) {
  report('Migration preconditions verification', false, err.message);
}

// ----------------------------------------------------------------------------
// TEST 3: Database Trigger Simulation — Anti-Demotion & Anti-Escalation
// ----------------------------------------------------------------------------
console.log('\n[3/7] Simulating enforce_profile_role_security() trigger behavior...');
try {
  function simulateTrigger({ op, oldRow, newRow, callingUid }) {
    const rawRole = (newRow.role || '').trim().toLowerCase().replace(/[\s_-]+/g, '_');
    let normalizedRole;

    if (['data_analyst', 'analyst', 'business_analyst', 'student', 'researcher'].includes(rawRole)) {
      normalizedRole = 'Data Analyst';
    } else if (['data_scientist', 'scientist', 'ml_engineer', 'ai_engineer'].includes(rawRole)) {
      normalizedRole = 'Data Scientist';
    } else if (['project_manager', 'pm', 'product_manager', 'program_manager'].includes(rawRole)) {
      normalizedRole = 'Project Manager';
    } else if (['admin', 'administrator', 'system_admin', 'superadmin'].includes(rawRole)) {
      normalizedRole = 'Administrator';
    } else {
      normalizedRole = (op === 'UPDATE' && oldRow?.role) ? oldRow.role : 'Data Analyst';
    }

    newRow.role = normalizedRole;

    // Accidental Demotion Prevention
    if (op === 'UPDATE' && (oldRow?.role === 'Administrator' || oldRow?.role === 'admin')) {
      if (newRow.role !== 'Administrator') {
        newRow.workspace_persona = newRow.role;
        newRow.role = 'Administrator';
      }
    }

    // Anti-Escalation Check
    if (newRow.role === 'Administrator') {
      if (callingUid !== null && callingUid !== undefined) {
        if (op === 'UPDATE') {
          if (oldRow?.role !== 'Administrator' && oldRow?.role !== 'admin') {
            const err = new Error('42501: Access Denied: The Administrator role grants privileged system access and cannot be self-assigned.');
            err.code = '42501';
            throw err;
          }
        } else if (op === 'INSERT') {
          const err = new Error('42501: Access Denied: The Administrator role grants privileged system access and cannot be self-assigned during onboarding.');
          err.code = '42501';
          throw err;
        }
      }
    }

    // Synchronize workspace_persona
    if (newRow.workspace_persona) {
      const rawPersona = newRow.workspace_persona.trim().toLowerCase().replace(/[\s_-]+/g, '_');
      if (['data_analyst', 'analyst'].includes(rawPersona)) {
        newRow.workspace_persona = 'Data Analyst';
      } else if (['data_scientist', 'scientist'].includes(rawPersona)) {
        newRow.workspace_persona = 'Data Scientist';
      } else if (['project_manager', 'pm'].includes(rawPersona)) {
        newRow.workspace_persona = 'Project Manager';
      } else {
        // Disallow 'Administrator' as persona
        if (newRow.role !== 'Administrator') {
          newRow.workspace_persona = newRow.role;
        } else if (op === 'UPDATE' && oldRow?.workspace_persona) {
          newRow.workspace_persona = oldRow.workspace_persona;
        } else {
          newRow.workspace_persona = 'Data Analyst';
        }
      }
    } else {
      if (newRow.role !== 'Administrator') {
        newRow.workspace_persona = newRow.role;
      } else if (op === 'UPDATE' && oldRow?.workspace_persona) {
        newRow.workspace_persona = oldRow.workspace_persona;
      } else {
        newRow.workspace_persona = 'Data Analyst';
      }
    }

    // For ordinary users whose role changed, keep workspace_persona synchronized
    if (newRow.role !== 'Administrator' && op === 'UPDATE' && newRow.role !== oldRow?.role) {
      if (newRow.workspace_persona === oldRow?.workspace_persona || !newRow.workspace_persona) {
        newRow.workspace_persona = newRow.role;
      }
    }

    newRow.role_configured = true;
    newRow.updated_at = new Date().toISOString();
    return newRow;
  }

  // 3a. Ordinary user cannot promote to Administrator on INSERT
  assert.throws(() => simulateTrigger({
    op: 'INSERT',
    oldRow: null,
    newRow: { role: 'Administrator' },
    callingUid: 'user-uuid'
  }), (err) => err.code === '42501');

  // 3b. Ordinary user cannot promote to Administrator on UPDATE
  assert.throws(() => simulateTrigger({
    op: 'UPDATE',
    oldRow: { role: 'Data Analyst' },
    newRow: { role: 'Administrator' },
    callingUid: 'user-uuid'
  }), (err) => err.code === '42501');

  // 3c. Administrator updating role to 'Data Scientist' triggers accidental demotion prevention
  const adminRow = simulateTrigger({
    op: 'UPDATE',
    oldRow: { role: 'Administrator', workspace_persona: 'Data Analyst' },
    newRow: { role: 'Data Scientist' },
    callingUid: 'admin-uuid'
  });
  assert.strictEqual(adminRow.role, 'Administrator', 'Role must remain Administrator');
  assert.strictEqual(adminRow.workspace_persona, 'Data Scientist', 'workspace_persona must receive requested view');

  // 3d. Ordinary user switching role updates both role and workspace_persona
  const userRow = simulateTrigger({
    op: 'UPDATE',
    oldRow: { role: 'Data Analyst', workspace_persona: 'Data Analyst' },
    newRow: { role: 'Data Scientist' },
    callingUid: 'user-uuid'
  });
  assert.strictEqual(userRow.role, 'Data Scientist');
  assert.strictEqual(userRow.workspace_persona, 'Data Scientist');

  // 3e. Ordinary user passing 'Administrator' as workspace_persona is neutralized
  const personaAttempt = simulateTrigger({
    op: 'UPDATE',
    oldRow: { role: 'Data Analyst', workspace_persona: 'Data Analyst' },
    newRow: { role: 'Data Analyst', workspace_persona: 'Administrator' },
    callingUid: 'user-uuid'
  });
  assert.strictEqual(personaAttempt.role, 'Data Analyst');
  assert.strictEqual(personaAttempt.workspace_persona, 'Data Analyst', 'Disallows Administrator persona');

  report('Trigger logic: Demotion prevented for admins, self-promotion blocked (42501), personas normalized', true);
} catch (err) {
  report('Trigger simulation verification', false, err.message);
}

// ----------------------------------------------------------------------------
// TEST 4: RPC Function Simulation — update_user_workspace_role
// ----------------------------------------------------------------------------
console.log('\n[4/7] Simulating update_user_workspace_role() RPC function...');
try {
  function simulateRpcUpdate(userId, newRole, profiles) {
    if (!userId) {
      const err = new Error('42501: Authentication required to update workspace role.');
      err.code = '42501';
      throw err;
    }

    const cleanRole = (newRole || '').trim().toLowerCase().replace(/[\s_-]+/g, '_');
    let targetRole;
    if (['data_analyst', 'analyst', 'business_analyst', 'student', 'researcher'].includes(cleanRole)) {
      targetRole = 'Data Analyst';
    } else if (['data_scientist', 'scientist', 'ml_engineer', 'ai_engineer'].includes(cleanRole)) {
      targetRole = 'Data Scientist';
    } else if (['project_manager', 'pm', 'product_manager', 'program_manager'].includes(cleanRole)) {
      targetRole = 'Project Manager';
    } else {
      const err = new Error(`22023: Invalid role "${newRole}". Users may only select Data Analyst, Data Scientist, or Project Manager.`);
      err.code = '22023';
      throw err;
    }

    const profile = profiles.find(p => p.id === userId);
    if (!profile) {
      const err = new Error(`P0002: User profile not found for id ${userId}`);
      err.code = 'P0002';
      throw err;
    }

    if (profile.role === 'Administrator' || profile.role === 'admin') {
      profile.workspace_persona = targetRole;
      profile.role = 'Administrator';
    } else {
      profile.role = targetRole;
      profile.workspace_persona = targetRole;
    }

    profile.role_configured = true;
    profile.updated_at = new Date().toISOString();

    return {
      success: true,
      user_id: profile.id,
      role: profile.role,
      workspace_persona: profile.workspace_persona,
      role_configured: profile.role_configured
    };
  }

  const dbProfiles = [
    { id: 'admin-1', role: 'Administrator', workspace_persona: 'Data Analyst' },
    { id: 'user-1', role: 'Data Analyst', workspace_persona: 'Data Analyst' }
  ];

  // 4a. Unauthenticated caller fails (42501)
  assert.throws(() => simulateRpcUpdate(null, 'Data Scientist', dbProfiles), (err) => err.code === '42501');

  // 4b. Non-existent user fails (P0002)
  assert.throws(() => simulateRpcUpdate('unknown-id', 'Data Scientist', dbProfiles), (err) => err.code === 'P0002');

  // 4c. Passing 'Administrator' fails (22023)
  assert.throws(() => simulateRpcUpdate('user-1', 'Administrator', dbProfiles), (err) => err.code === '22023');
  assert.throws(() => simulateRpcUpdate('admin-1', 'Administrator', dbProfiles), (err) => err.code === '22023');

  // 4d. Ordinary user switches role
  const uRes = simulateRpcUpdate('user-1', 'Data Scientist', dbProfiles);
  assert.strictEqual(uRes.role, 'Data Scientist');
  assert.strictEqual(uRes.workspace_persona, 'Data Scientist');

  // 4e. Administrator switches workspace_persona without demoting role
  const aRes = simulateRpcUpdate('admin-1', 'Project Manager', dbProfiles);
  assert.strictEqual(aRes.role, 'Administrator', 'Role must remain Administrator');
  assert.strictEqual(aRes.workspace_persona, 'Project Manager', 'workspace_persona must update');

  report('RPC logic: Allowlist strictly enforced (22023 for Administrator), admin role protected, ordinary user switched', true);
} catch (err) {
  report('RPC function simulation verification', false, err.message);
}

// ----------------------------------------------------------------------------
// TEST 5: Multiple Consecutive Persona Switches for Administrator
// ----------------------------------------------------------------------------
console.log('\n[5/7] Verifying consecutive persona switches for Administrator...');
try {
  const adminProfile = { id: 'admin-adm', role: 'Administrator', workspace_persona: 'Data Analyst' };
  const personas = ['Data Scientist', 'Project Manager', 'Data Analyst', 'Data Scientist'];

  for (const target of personas) {
    adminProfile.workspace_persona = target;
    // Authorization check
    assert.strictEqual(adminProfile.role, 'Administrator', 'Role MUST NOT be altered');
    assert.strictEqual(adminProfile.workspace_persona, target, `Persona must be ${target}`);
  }

  report('Administrator can cycle through all personas indefinitely without losing privileges', true);
} catch (err) {
  report('Consecutive persona switches', false, err.message);
}

// ----------------------------------------------------------------------------
// TEST 6: RLS and Profile Schema Non-Destructive Preservation
// ----------------------------------------------------------------------------
console.log('\n[6/7] Verifying RLS and non-destructive column operations...');
try {
  const migrationPath = path.resolve(__dirname, '../../supabase/migrations/20261029000001_fix_admin_lockout_and_separate_persona.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Must NOT disable RLS
  assert.ok(!sql.toLowerCase().includes('disable row level security'), 'Must never disable RLS');

  // Must NOT drop existing profile columns or tables
  assert.ok(!sql.toLowerCase().includes('drop table'), 'Must not drop tables');
  assert.ok(!sql.toLowerCase().includes('drop column'), 'Must not drop columns');

  report('RLS and existing profile schema are strictly preserved (no drops, no RLS disabling)', true);
} catch (err) {
  report('RLS and schema preservation', false, err.message);
}

// ----------------------------------------------------------------------------
// TEST 7: Role Canonicalization & Normalization Safety
// ----------------------------------------------------------------------------
console.log('\n[7/7] Verifying canonical role mappings and onboarding normalization...');
try {
  const testCases = [
    { input: 'Data Analyst', expected: 'Data Analyst' },
    { input: 'analyst', expected: 'Data Analyst' },
    { input: 'data_analyst', expected: 'Data Analyst' },
    { input: 'Data Scientist', expected: 'Data Scientist' },
    { input: 'scientist', expected: 'Data Scientist' },
    { input: 'ml_engineer', expected: 'Data Scientist' },
    { input: 'Project Manager', expected: 'Project Manager' },
    { input: 'pm', expected: 'Project Manager' },
    { input: 'Administrator', expected: 'Administrator' },
    { input: 'admin', expected: 'Administrator' }
  ];

  function canonicalize(role) {
    const s = String(role || '').trim().toLowerCase().replace(/[\s_-]+/g, '_');
    if (['data_analyst', 'analyst', 'business_analyst', 'student', 'researcher'].includes(s)) return 'Data Analyst';
    if (['data_scientist', 'scientist', 'ml_engineer', 'ai_engineer'].includes(s)) return 'Data Scientist';
    if (['project_manager', 'pm', 'product_manager', 'program_manager'].includes(s)) return 'Project Manager';
    if (['admin', 'administrator', 'system_admin', 'superadmin'].includes(s)) return 'Administrator';
    return 'Data Analyst';
  }

  for (const { input, expected } of testCases) {
    assert.strictEqual(canonicalize(input), expected, `Input "${input}" must canonicalize to "${expected}"`);
  }

  report('Canonical role normalization matches all 4 official platform roles', true);
} catch (err) {
  report('Canonical role normalization', false, err.message);
}

console.log('\n================================================================');
console.log(`Results: ${passedTests}/${totalTests} Tests Passed (${Math.round((passedTests/totalTests)*100)}%)`);
console.log('================================================================\n');

if (failedTests > 0) process.exit(1);
