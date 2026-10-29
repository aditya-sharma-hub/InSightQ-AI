-- ============================================================================
-- INSIGHTIQ AI — PHASE D: UNIFIED DATA CATALOG & RELATIONSHIP REGISTRY
-- Migration: 20260812000000_unified_catalog_and_relationships.sql
-- ============================================================================

-- 1. Catalog Sources Table (Datasets & Document Collections)
CREATE TABLE IF NOT EXISTS public.catalog_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('tabular', 'document')),
    version TEXT NOT NULL DEFAULT 'v1.0',
    status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('registered', 'processing', 'ready', 'error')),
    provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
    schema_definition JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Catalog Relationships Table (Validated Cross-Source Connections)
-- RULE: Never join unrelated data merely because column names look similar.
CREATE TABLE IF NOT EXISTS public.catalog_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_a_id UUID NOT NULL REFERENCES public.catalog_sources(id) ON DELETE CASCADE,
    source_b_id UUID NOT NULL REFERENCES public.catalog_sources(id) ON DELETE CASCADE,
    key_a TEXT NOT NULL,
    key_b TEXT NOT NULL,
    relationship_type TEXT NOT NULL DEFAULT 'one-to-many' CHECK (relationship_type IN ('one-to-one', 'one-to-many', 'many-to-one', 'many-to-many')),
    is_validated BOOLEAN NOT NULL DEFAULT true,
    confidence NUMERIC(4, 3) NOT NULL DEFAULT 1.000,
    validated_by TEXT NOT NULL DEFAULT 'user_explicit' CHECK (validated_by IN ('user_explicit', 'schema_foreign_key', 'verified_entity_match')),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT no_self_relationship CHECK (source_a_id <> source_b_id)
);

-- 3. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_catalog_sources_user_id ON public.catalog_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_catalog_sources_type ON public.catalog_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_catalog_relationships_user_id ON public.catalog_relationships(user_id);
CREATE INDEX IF NOT EXISTS idx_catalog_relationships_sources ON public.catalog_relationships(source_a_id, source_b_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.catalog_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_relationships ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: Strictly isolate by user_id
CREATE POLICY "Users can only read own catalog sources"
    ON public.catalog_sources
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert own catalog sources"
    ON public.catalog_sources
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update own catalog sources"
    ON public.catalog_sources
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete own catalog sources"
    ON public.catalog_sources
    FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only read own catalog relationships"
    ON public.catalog_relationships
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert own catalog relationships"
    ON public.catalog_relationships
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update own catalog relationships"
    ON public.catalog_relationships
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete own catalog relationships"
    ON public.catalog_relationships
    FOR DELETE
    USING (auth.uid() = user_id);
