import React from 'https://esm.sh/react@18.2.0';
import { CandidateMatchResult } from '../../types/recruitment.js';

interface CandidateComparisonMatrixProps {
  candidates: CandidateMatchResult[];
  jobRole?: string;
}

export const CandidateComparisonMatrix: React.FC<CandidateComparisonMatrixProps> = ({
  candidates,
  jobRole = 'Senior Data Engineer'
}) => {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">Candidate Comparison & Ranking Matrix</h4>
          <p className="text-xs text-gray-500 mt-0.5">Role Target: <span className="font-semibold text-gray-300">{jobRole}</span> • Transparent Score Breakdown</p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 uppercase font-semibold">
          Decision Support Mode
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 uppercase text-[10px] tracking-wider">
              <th className="py-2.5 px-3">Candidate</th>
              <th className="py-2.5 px-3 text-right">Overall Score</th>
              <th className="py-2.5 px-3 text-right">Skill Match</th>
              <th className="py-2.5 px-3 text-right">Experience</th>
              <th className="py-2.5 px-3 text-right">Education</th>
              <th className="py-2.5 px-3">Matching Skills</th>
              <th className="py-2.5 px-3">Missing Skills</th>
              <th className="py-2.5 px-3 font-mono">Fairness Flag</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60 text-gray-300">
            {candidates.map((c) => (
              <tr key={c.candidate_reference} className="hover:bg-gray-800/30 transition-colors">
                <td className="py-3 px-3 font-semibold text-white">
                  <div>{c.candidate_name}</div>
                  <span className="text-[10px] font-mono text-gray-500">{c.candidate_reference}</span>
                </td>
                <td className="py-3 px-3 text-right">
                  <span className={`font-mono font-bold px-2 py-0.5 rounded ${c.overall_score >= 80 ? 'bg-emerald-950/80 text-emerald-400' : c.overall_score >= 65 ? 'bg-blue-950/80 text-blue-400' : 'bg-rose-950/80 text-rose-400'}`}>
                    {c.overall_score}/100
                  </span>
                </td>
                <td className="py-3 px-3 text-right font-mono font-medium text-gray-200">{c.scores.skill}%</td>
                <td className="py-3 px-3 text-right font-mono font-medium text-gray-200">{c.scores.experience}%</td>
                <td className="py-3 px-3 text-right font-mono font-medium text-gray-200">{c.scores.education}%</td>
                <td className="py-3 px-3 text-emerald-400">
                  {c.skill_gaps.matching_skills.length ? c.skill_gaps.matching_skills.join(', ') : 'None'}
                </td>
                <td className="py-3 px-3 text-rose-400">
                  {c.skill_gaps.missing_skills.length ? c.skill_gaps.missing_skills.join(', ') : 'None'}
                </td>
                <td className="py-3 px-3 text-[10px] font-mono text-amber-400">
                  {c.fairness_excluded_fields?.length ? `Filtered (${c.fairness_excluded_fields.join(', ')})` : 'Clean'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
