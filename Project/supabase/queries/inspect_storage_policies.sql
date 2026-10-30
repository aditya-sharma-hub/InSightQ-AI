-- ============================================================================
-- INSIGHTIQ AI — READ-ONLY PRODUCTION STORAGE POLICY INSPECTION
-- Purpose: Inspect live Storage policies, bucket configurations, and permissions
-- without making any mutations, drops, or modifications.
--
-- Safety Invariant:
-- Strict read-only inspection query. No DDL, no DML, no side effects.
-- ============================================================================

-- 1. Complete Live Storage Policies with USING and WITH CHECK expressions
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual AS using_expression,
    with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname, cmd;

-- 2. Storage Buckets Configuration (Public flag, size limits, allowed MIME types)
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at,
    updated_at
FROM storage.buckets
ORDER BY id;

-- 3. Anonymous / Public Privilege Check on Storage Objects
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'storage' AND table_name = 'objects'
  AND grantee IN ('anon', 'public');

-- 4. Verification Check: Are all policies strictly enforcing owner-folder isolation?
SELECT 
    policyname,
    cmd,
    (qual LIKE '%(storage.foldername(name))[1] = auth.uid()::text%') AS using_enforces_owner_folder,
    (with_check LIKE '%(storage.foldername(name))[1] = auth.uid()::text%') AS with_check_enforces_owner_folder,
    (roles::text LIKE '%authenticated%') AS scoped_to_authenticated,
    (roles::text LIKE '%anon%') AS allows_anon
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects';

