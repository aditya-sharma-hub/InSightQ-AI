import { corsHeaders, buildJsonResponse, buildErrorResponse } from '../_shared/cors.ts';
import { verifyAuthUser, verifyDatasetOwnership } from '../_shared/auth.ts';
import { broadcastRealtimeEvent } from '../_shared/realtimeBroadcast.ts';
import { generateGeminiContent } from '../_shared/gemini.ts';

// Protected characteristics to exclude from feature scoring
const PROTECTED_FIELDS = [
  'race', 'ethnicity', 'gender', 'sex', 'religion', 'sexual_orientation',
  'disability', 'health_info', 'political_affiliation', 'marital_status', 'age'
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const { auth, errorResponse } = await verifyAuthUser(req);
  if (errorResponse) return errorResponse;

  try {
    const payload = await req.json();
    const {
      recruitment_project_id,
      candidate_data,
      job_requirements
    } = payload;

    if (!recruitment_project_id || !candidate_data) {
      return buildErrorResponse('recruitment_project_id and candidate_data are required', 400);
    }

    // 1. Verify Project Ownership
    const { data: project, error: projErr } = await auth!.supabaseClient
      .from('recruitment_projects')
      .select('*')
      .eq('id', recruitment_project_id)
      .eq('user_id', auth!.userId)
      .single();

    if (projErr || !project) {
      return buildErrorResponse('Recruitment project not found or access denied.', 403);
    }

    // 2. Broadcast Event: Recruitment Analysis Started
    await broadcastRealtimeEvent(
      auth!.supabaseClient,
      auth!.userId,
      `Recruitment Analysis Started [Project: ${project.project_name}]`
    );

    // 3. Fairness Filter: Detect & Exclude Protected Attributes
    const candidateKeys = Object.keys(candidate_data);
    const excludedProtectedFields: string[] = [];

    candidateKeys.forEach((key) => {
      const normKey = key.trim().toLowerCase();
      if (PROTECTED_FIELDS.some(p => normKey.includes(p))) {
        excludedProtectedFields.push(key);
      }
    });

    // Cleaned feature set without protected characteristics
    const safeCandidateData: Record<string, any> = {};
    candidateKeys.forEach((key) => {
      if (!excludedProtectedFields.includes(key)) {
        safeCandidateData[key] = candidate_data[key];
      }
    });

    // 4. Extract Candidate Attributes
    const candidateRef = String(safeCandidateData.id || safeCandidateData.candidate_id || safeCandidateData.email || 'cand_ref_001');
    const candidateName = String(safeCandidateData.name || safeCandidateData.candidate_name || 'Anonymous Candidate');
    const candidateSkills: string[] = Array.isArray(safeCandidateData.skills)
      ? safeCandidateData.skills
      : typeof safeCandidateData.skills === 'string'
      ? safeCandidateData.skills.split(',').map((s: string) => s.trim())
      : [];
    const candidateExpYears = Number(safeCandidateData.experience_years || safeCandidateData.experience || 0);

    // 5. Requirements Matching
    const reqSkills: string[] = job_requirements?.required_skills || ['Python', 'SQL', 'Data Analysis'];
    const prefSkills: string[] = job_requirements?.preferred_skills || ['Docker', 'AWS'];
    const minExpYears = Number(job_requirements?.min_experience_years || 3.0);

    const matchingSkills = candidateSkills.filter(s => reqSkills.some(r => r.toLowerCase() === s.toLowerCase()));
    const missingSkills = reqSkills.filter(r => !candidateSkills.some(s => s.toLowerCase() === r.toLowerCase()));
    const matchingPref = candidateSkills.filter(s => prefSkills.some(p => p.toLowerCase() === s.toLowerCase()));

    // Deterministic Scoring
    const skillScore = reqSkills.length > 0 ? Number(((matchingSkills.length / reqSkills.length) * 100).toFixed(2)) : 100;
    const expScore = minExpYears > 0 ? Math.min(100, Number(((candidateExpYears / minExpYears) * 100).toFixed(2))) : 100;
    const eduScore = safeCandidateData.education ? 85.0 : 70.0;
    const certScore = safeCandidateData.certifications ? 90.0 : 60.0;

    const overallScore = Number((skillScore * 0.40 + expScore * 0.30 + eduScore * 0.15 + certScore * 0.15).toFixed(2));

    // 6. Gemini AI Interpretation (Strictly from Validated Candidate Inputs)
    const prompt = `Provide a concise 2-sentence recruiter summary for candidate evaluation:
Candidate: ${candidateName}
Role Target: ${project.job_role}
Overall Match Score: ${overallScore}/100
Skill Match: ${matchingSkills.join(', ') || 'None'} (Missing: ${missingSkills.join(', ') || 'None'})
Years of Experience: ${candidateExpYears} years (Target: ${minExpYears} years)

Highlight key strengths and areas requiring recruiter review without making hiring decisions or inventing achievements.`;

    const aiSummary = await generateGeminiContent(
      prompt,
      'You are an Enterprise Recruitment Intelligence Analyst. Provide crisp, objective candidate decision-support insights.'
    );

    // 7. Store Candidate Score
    await auth!.supabaseClient
      .from('recruitment_candidate_scores')
      .upsert({
        recruitment_project_id,
        user_id: auth!.userId,
        candidate_reference: candidateRef,
        candidate_name: candidateName,
        overall_score: overallScore,
        skill_score: skillScore,
        experience_score: expScore,
        education_score: eduScore,
        certification_score: certScore,
        scoring_method: 'rule_based',
        fairness_flags: excludedProtectedFields,
        scoring_configuration: { weights: { skill: 0.40, experience: 0.30, education: 0.15, certification: 0.15 } }
      });

    // 8. Store Skill Gap Analysis
    await auth!.supabaseClient
      .from('recruitment_skill_gaps')
      .upsert({
        recruitment_project_id,
        candidate_reference: candidateRef,
        required_skills: reqSkills,
        candidate_skills: candidateSkills,
        matching_skills: matchingSkills,
        missing_skills: missingSkills,
        preferred_skills: prefSkills,
        additional_skills: matchingPref
      });

    // 9. Broadcast Completion Events
    await broadcastRealtimeEvent(
      auth!.supabaseClient,
      auth!.userId,
      `Candidate Matching Completed for ${candidateName}: Score ${overallScore}/100`
    );

    return buildJsonResponse({
      success: true,
      recruitment_project_id,
      candidate_reference: candidateRef,
      candidate_name: candidateName,
      overall_score: overallScore,
      scores: {
        skill: skillScore,
        experience: expScore,
        education: eduScore,
        certification: certScore
      },
      skill_gaps: {
        matching: matchingSkills,
        missing: missingSkills,
        preferred_matching: matchingPref
      },
      fairness_excluded_fields: excludedProtectedFields,
      summary: aiSummary || `Candidate ${candidateName} achieved a match score of ${overallScore}/100 with ${matchingSkills.length} matching required skills.`
    });
  } catch (err: any) {
    if (auth) {
      await broadcastRealtimeEvent(
        auth.supabaseClient,
        auth.userId,
        `Recruitment Analysis Failed: ${err.message}`
      );
    }
    return buildErrorResponse(err.message || 'Recruitment analysis failed.', 500);
  }
});
