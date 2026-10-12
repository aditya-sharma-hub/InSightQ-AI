-- ============================================================================
-- Migration: 018_user_benchmarks.sql
-- Description: User-Defined & Verified External Benchmarks Schema & RLS Policies
-- ============================================================================

-- 1. USER BENCHMARKS TABLE
CREATE TABLE IF NOT EXISTS public.user_benchmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  benchmark_name TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  reference_value NUMERIC(14,4) NOT NULL,
  unit TEXT DEFAULT '%',
  comparison_direction TEXT DEFAULT 'higher_is_better' CHECK (comparison_direction IN ('higher_is_better', 'lower_is_better')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_user_benchmark_name UNIQUE (user_id, benchmark_name)
);

-- 2. VERIFIED EXTERNAL BENCHMARKS TABLE
CREATE TABLE IF NOT EXISTS public.external_benchmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  benchmark_name TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  reference_value NUMERIC(14,4) NOT NULL,
  unit TEXT DEFAULT '%',
  source TEXT NOT NULL,
  source_url TEXT,
  source_date DATE,
  methodology TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.user_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_benchmarks ENABLE ROW LEVEL SECURITY;

-- 4. CREATE RLS POLICIES
DROP POLICY IF EXISTS "Users can view own user_benchmarks" ON public.user_benchmarks;
CREATE POLICY "Users can view own user_benchmarks" ON public.user_benchmarks FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own user_benchmarks" ON public.user_benchmarks;
CREATE POLICY "Users can insert own user_benchmarks" ON public.user_benchmarks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own user_benchmarks" ON public.user_benchmarks;
CREATE POLICY "Users can update own user_benchmarks" ON public.user_benchmarks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own user_benchmarks" ON public.user_benchmarks;
CREATE POLICY "Users can delete own user_benchmarks" ON public.user_benchmarks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Read-only policy for external_benchmarks (all authenticated users can read verified benchmarks)
DROP POLICY IF EXISTS "Authenticated users can read external_benchmarks" ON public.external_benchmarks;
CREATE POLICY "Authenticated users can read external_benchmarks" ON public.external_benchmarks FOR SELECT TO authenticated USING (true);

-- 5. REALTIME PUBLICATION SETUP
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_benchmarks') THEN
    ALTER TABLE public.user_benchmarks REPLICA IDENTITY FULL;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_benchmarks; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
END $$;

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_user_benchmarks_user ON public.user_benchmarks (user_id);
CREATE INDEX IF NOT EXISTS idx_user_benchmarks_metric ON public.user_benchmarks (metric_name);
CREATE INDEX IF NOT EXISTS idx_external_benchmarks_metric ON public.external_benchmarks (metric_name);
