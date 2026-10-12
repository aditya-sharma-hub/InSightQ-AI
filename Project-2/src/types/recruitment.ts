/**
 * InsightIQ AI - Recruitment Intelligence Module Contracts & Types
 */

export interface RecruitmentProject {
  id: string;
  user_id: string;
  workspace_id?: string | null;
  dataset_id?: string | null;
  dataset_version_id?: string | null;
  project_name: string;
  job_role: string;
  job_description?: string | null;
  status: 'active' | 'archived' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface JobRequirementConfig {
  id?: string;
  recruitment_project_id: string;
  required_skills: string[];
  preferred_skills: string[];
  min_experience_years: number;
  education_requirements: string[];
  certification_requirements: string[];
  role_requirements?: Record<string, any>;
  scoring_weights: {
    skill: number;
    experience: number;
    education: number;
    certification: number;
    project?: number;
    role?: number;
  };
  created_at?: string;
  updated_at?: string;
}

export interface CandidateScore {
  id: string;
  recruitment_project_id: string;
  user_id: string;
  candidate_reference: string;
  candidate_name?: string | null;
  overall_score: number;
  skill_score: number;
  experience_score: number;
  education_score: number;
  certification_score: number;
  project_score?: number;
  role_score?: number;
  scoring_configuration: Record<string, any>;
  scoring_method: 'rule_based' | 'ml_predicted';
  fairness_flags: string[];
  created_at: string;
}

export interface SkillGapAnalysis {
  id?: string;
  recruitment_project_id: string;
  candidate_reference: string;
  required_skills: string[];
  candidate_skills: string[];
  matching_skills: string[];
  missing_skills: string[];
  preferred_skills: string[];
  additional_skills: string[];
  created_at?: string;
}

export interface CandidateMatchResult {
  candidate_reference: string;
  candidate_name: string;
  overall_score: number;
  scores: {
    skill: number;
    experience: number;
    education: number;
    certification: number;
  };
  skill_gaps: SkillGapAnalysis;
  score_explanation: {
    positive_factors: string[];
    negative_factors: string[];
    matched_requirements: string[];
    missing_requirements: string[];
  };
  fairness_excluded_fields: string[];
  summary?: string;
}

export interface CandidateSummary {
  candidate_reference: string;
  candidate_name: string;
  profile_summary: string;
  relevant_strengths: string[];
  skill_gaps: string[];
  relevant_experience: string;
  role_alignment: string;
  areas_requiring_review: string[];
}

export interface RecruitmentAnalytics {
  total_candidates: number;
  average_match_score: number;
  skill_coverage_pct: number;
  experience_distribution: Record<string, number>;
  education_distribution: Record<string, number>;
  score_distribution: {
    top_tier: number;    // score >= 85
    strong_tier: number; // 70 <= score < 85
    moderate_tier: number; // 50 <= score < 70
    low_tier: number;    // score < 50
  };
  bias_monitoring_signal?: {
    disparity_detected: boolean;
    excluded_protected_fields: string[];
    human_review_required: boolean;
    note: string;
  };
}
