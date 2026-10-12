import React from 'https://esm.sh/react@18.2.0';
import { RecruitmentProject } from '../../types/recruitment.js';

interface RecruitmentProjectCardProps {
  project: RecruitmentProject;
  candidateCount?: number;
  onSelect?: () => void;
}

export const RecruitmentProjectCard: React.FC<RecruitmentProjectCardProps> = ({
  project,
  candidateCount = 12,
  onSelect
}) => {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm hover:border-gray-700 transition-all">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">{project.project_name}</h4>
          <p className="text-[11px] text-gray-400 mt-0.5">Target Role: <span className="font-semibold text-gray-200">{project.job_role}</span></p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950/80 text-blue-400 border border-blue-800/40 uppercase font-semibold">
          {project.status}
        </span>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed mb-4 line-clamp-2">
        {project.job_description || 'Decision-support recruitment analysis project evaluating candidate qualifications.'}
      </p>

      <div className="flex items-center justify-between pt-2 border-t border-gray-800/60 text-[11px] text-gray-500">
        <span>Evaluated Candidates: <strong className="text-gray-200">{candidateCount}</strong></span>
        {onSelect && (
          <button
            onClick={onSelect}
            className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold"
          >
            View Candidate Matrix →
          </button>
        )}
      </div>
    </div>
  );
};
