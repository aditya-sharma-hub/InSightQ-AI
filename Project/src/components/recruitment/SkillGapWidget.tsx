import React from 'https://esm.sh/react@18.2.0';
import { SkillGapAnalysis } from '../../types/recruitment.js';

interface SkillGapWidgetProps {
  skillGap: SkillGapAnalysis;
  candidateName?: string;
}

export const SkillGapWidget: React.FC<SkillGapWidgetProps> = ({
  skillGap,
  candidateName = 'Top Shortlisted Candidate'
}) => {
  const { matching_skills, missing_skills, preferred_skills } = skillGap;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="border-b border-gray-800 pb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">Skill Gap & Qualification Analysis</h4>
        <p className="text-xs text-gray-500 mt-0.5">Candidate: <span className="font-semibold text-gray-300">{candidateName}</span></p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Matching Required Skills */}
        <div className="bg-gray-950/60 p-3.5 rounded-lg border border-gray-800">
          <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-2">✓ Matched Required Skills</span>
          <div className="flex flex-wrap gap-1.5">
            {matching_skills.map((s, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                {s}
              </span>
            ))}
            {matching_skills.length === 0 && <span className="text-xs text-gray-500">No matching skills detected</span>}
          </div>
        </div>

        {/* Missing Required Skills */}
        <div className="bg-gray-950/60 p-3.5 rounded-lg border border-gray-800">
          <span className="text-[10px] uppercase font-bold text-rose-400 block mb-2">⚠ Missing Required Skills</span>
          <div className="flex flex-wrap gap-1.5">
            {missing_skills.map((s, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/60">
                {s}
              </span>
            ))}
            {missing_skills.length === 0 && <span className="text-xs text-emerald-400 font-semibold">All required skills matched!</span>}
          </div>
        </div>
      </div>

      {preferred_skills && preferred_skills.length > 0 && (
        <div className="bg-blue-950/20 p-3 rounded-lg border border-blue-900/40">
          <span className="text-[10px] uppercase font-semibold text-blue-400 block mb-1">✦ Preferred Skills Evaluation</span>
          <p className="text-xs text-gray-300">
            Preferred skills target: <span className="text-gray-200 font-mono">{preferred_skills.join(', ')}</span>
          </p>
        </div>
      )}
    </div>
  );
};
