-- ============================================================================
-- Migration: 021_recruitment_intelligence.sql
-- Description: Production-grade Recruitment Intelligence Schema & RLS Security Policies
-- ============================================================================

-- 1. RECRUITMENT PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.recruitment_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  dataset_id UUID REFERENCES public.datasets(id) ON DELETE CASCADE,
  dataset_version_id UUID REFERENCES public.dataset_versions(id) ON DELETE SET NULL,
  project_name TEXT NOT NULL,
  job_role TEXT NOT NULL,
  job_description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. JOB REQUIREMENTS CONFIGURATION TABLE
CREATE TABLE IF NOT EXISTS public.recruitment_job_requirements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recruitment_project_id UUID NOT NULL REFERENCES public.recruitment_projects(id) ON DELETE CASCADE UNIQUE,
  required_skills JSONB DEFAULT '[]'::jsonb,
  preferred_skills JSONB DEFAULT '[]'::jsonb,
  min_experience_years NUMERIC(4,1) DEFAULT 0.0,
  education_requirements JSONB DEFAULT '[]'::jsonb,
  certification_requirements JSONB DEFAULT '[]'::jsonb,
  role_requirements JSONB DEFAULT '{}'::jsonb,
  scoring_weights JSONB DEFAULT '{"skill": 0.35, "experience": 0.25, "education": 0.15, "certification": 0.10, "project": 0.10, "role": 0.05}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. CANDIDATE SCORES TABLE
CREATE TABLE IF NOT EXISTS public.recruitment_candidate_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recruitment_project_id UUID NOT NULL REFERENCES public.recruitment_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  candidate_reference TEXT NOT NULL,
  candidate_name TEXT,
  overall_score NUMERIC(6,2) NOT NULL,
  skill_score NUMERIC(6,2) DEFAULT 0.0,
  experience_score NUMERIC(6,2) DEFAULT 0.0,
  education_score NUMERIC(6,2) DEFAULT 0.0,
  certification_score NUMERIC(6,2) DEFAULT 0.0,
  project_score NUMERIC(6,2) DEFAULT 0.0,
  role_score NUMERIC(6,2) DEFAULT 0.0,
  scoring_configuration JSONB DEFAULT '{}'::jsonb,
  scoring_method TEXT DEFAULT 'rule_based' CHECK (scoring_method IN ('rule_based', 'ml_predicted')),
  fairness_flags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_project_candidate UNIQUE (recruitment_project_id, candidate_reference)
);

-- 4. SKILL GAPS ANALYSIS TABLE
CREATE TABLE IF NOT EXISTS public.recruitment_skill_gaps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recruitment_project_id UUID NOT NULL REFERENCES public.recruitment_projects(id) ON DELETE CASCADE,
  candidate_reference TEXT NOT NULL,
  required_skills JSONB DEFAULT '[]'::jsonb,
  candidate_skills JSONB DEFAULT '[]'::jsonb,
  matching_skills JSONB DEFAULT '[]'::jsonb,
  missing_skills JSONB DEFAULT '[]'::jsonb,
  preferred_skills JSONB DEFAULT '[]'::jsonb,
  additional_skills JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_skill_gap_candidate UNIQUE (recruitment_project_id, candidate_reference)
);

-- 5. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.recruitment_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_job_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_candidate_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruitment_skill_gaps ENABLE ROW LEVEL SECURITY;

-- 6. RECRUITMENT PROJECTS RLS POLICIES
DROP POLICY IF EXISTS "Users can view own recruitment projects" ON public.recruitment_projects;
CREATE POLICY "Users can view own recruitment projects" ON public.recruitment_projects FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own recruitment projects" ON public.recruitment_projects;
CREATE POLICY "Users can insert own recruitment projects" ON public.recruitment_projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own recruitment projects" ON public.recruitment_projects;
CREATE POLICY "Users can update own recruitment projects" ON public.recruitment_projects FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own recruitment projects" ON public.recruitment_projects;
CREATE POLICY "Users can delete own recruitment projects" ON public.recruitment_projects FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 7. JOB REQUIREMENTS RLS POLICIES
DROP POLICY IF EXISTS "Users can view own job requirements" ON public.recruitment_job_requirements;
CREATE POLICY "Users can view own job requirements" ON public.recruitment_job_requirements FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.recruitment_projects rp WHERE rp.id = recruitment_project_id AND rp.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can insert own job requirements" ON public.recruitment_job_requirements;
CREATE POLICY "Users can insert own job requirements" ON public.recruitment_job_requirements FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.recruitment_projects rp WHERE rp.id = recruitment_project_id AND rp.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update own job requirements" ON public.recruitment_job_requirements;
CREATE POLICY "Users can update own job requirements" ON public.recruitment_job_requirements FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.recruitment_projects rp WHERE rp.id = recruitment_project_id AND rp.user_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.recruitment_projects rp WHERE rp.id = recruitment_project_id AND rp.user_id = auth.uid())
);

-- 8. CANDIDATE SCORES RLS POLICIES
DROP POLICY IF EXISTS "Users can view own candidate scores" ON public.recruitment_candidate_scores;
CREATE POLICY "Users can view own candidate scores" ON public.recruitment_candidate_scores FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own candidate scores" ON public.recruitment_candidate_scores;
CREATE POLICY "Users can insert own candidate scores" ON public.recruitment_candidate_scores FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own candidate scores" ON public.recruitment_candidate_scores;
CREATE POLICY "Users can update own candidate scores" ON public.recruitment_candidate_scores FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own candidate scores" ON public.recruitment_candidate_scores;
CREATE POLICY "Users can delete own candidate scores" ON public.recruitment_candidate_scores FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 9. SKILL GAPS RLS POLICIES
DROP POLICY IF EXISTS "Users can view own skill gaps" ON public.recruitment_skill_gaps;
CREATE POLICY "Users can view own skill gaps" ON public.recruitment_skill_gaps FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.recruitment_projects rp WHERE rp.id = recruitment_project_id AND rp.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can insert own skill gaps" ON public.recruitment_skill_gaps;
CREATE POLICY "Users can insert own skill gaps" ON public.recruitment_skill_gaps FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.recruitment_projects rp WHERE rp.id = recruitment_project_id AND rp.user_id = auth.uid())
);

-- 10. INDEXES FOR FAST RECRUITMENT QUERIES
CREATE INDEX IF NOT EXISTS idx_recruitment_projects_user ON public.recruitment_projects (user_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_scores_project ON public.recruitment_candidate_scores (recruitment_project_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_scores_user ON public.recruitment_candidate_scores (user_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_skill_gaps_project ON public.recruitment_skill_gaps (recruitment_project_id);

-- 11. REALTIME PUBLICATION SETUP
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'recruitment_projects') THEN
    ALTER TABLE public.recruitment_projects REPLICA IDENTITY FULL;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.recruitment_projects; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'recruitment_candidate_scores') THEN
    ALTER TABLE public.recruitment_candidate_scores REPLICA IDENTITY FULL;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.recruitment_candidate_scores; EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
END $$;
