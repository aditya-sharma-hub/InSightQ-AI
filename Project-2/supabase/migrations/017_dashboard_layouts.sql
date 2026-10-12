-- ============================================================================
-- Migration: 017_dashboard_layouts.sql
-- Description: Dashboard Layouts Persistence Table & RLS Security Policies
-- ============================================================================

-- 1. DASHBOARD LAYOUTS TABLE
CREATE TABLE IF NOT EXISTS public.dashboard_layouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE,
  layout_name TEXT DEFAULT 'Executive Dashboard' NOT NULL,
  widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.dashboard_layouts ENABLE ROW LEVEL SECURITY;

-- 3. CREATE RLS POLICIES
DROP POLICY IF EXISTS "Users can view own dashboard layouts" ON public.dashboard_layouts;
CREATE POLICY "Users can view own dashboard layouts" ON public.dashboard_layouts FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own dashboard layouts" ON public.dashboard_layouts;
CREATE POLICY "Users can insert own dashboard layouts" ON public.dashboard_layouts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own dashboard layouts" ON public.dashboard_layouts;
CREATE POLICY "Users can update own dashboard layouts" ON public.dashboard_layouts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own dashboard layouts" ON public.dashboard_layouts;
CREATE POLICY "Users can delete own dashboard layouts" ON public.dashboard_layouts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. REALTIME PUBLICATION SETUP
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dashboard_layouts') THEN
    ALTER TABLE public.dashboard_layouts REPLICA IDENTITY FULL;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.dashboard_layouts; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
END $$;

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_user ON public.dashboard_layouts (user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_dataset ON public.dashboard_layouts (dataset_id);
