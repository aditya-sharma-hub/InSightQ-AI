-- ============================================================================
-- Migration: 003_user_activity.sql
-- Description: User Activity Audit Log Schema & RLS Policies
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own activity logs" ON public.user_activity;
CREATE POLICY "Users can view own activity logs" ON public.user_activity FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own activity logs" ON public.user_activity;
CREATE POLICY "Users can insert own activity logs" ON public.user_activity FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
