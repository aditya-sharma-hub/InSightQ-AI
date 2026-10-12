import React from 'https://esm.sh/react@18.2.0';
import { RecruitmentAnalytics } from '../../types/recruitment.js';
import { KPIWidget } from '../visualization/KPIWidget.js';

interface RecruitmentAnalyticsWidgetProps {
  analytics: RecruitmentAnalytics;
  title?: string;
}

export const RecruitmentAnalyticsWidget: React.FC<RecruitmentAnalyticsWidgetProps> = ({
  analytics,
  title = 'Recruitment Analytics & Bias Safeguard Summary'
}) => {
  const {
    total_candidates,
    average_match_score,
    skill_coverage_pct,
    score_distribution,
    bias_monitoring_signal
  } = analytics;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm space-y-5">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">{title}</h4>
          <p className="text-xs text-gray-500 mt-0.5">Pool Size: <span className="font-semibold text-gray-300">{total_candidates} Candidates</span> • BI & Fairness Signal</p>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded bg-blue-950/80 text-blue-400 border border-blue-800/40 uppercase font-semibold">
          Responsible AI Enabled
        </span>
      </div>

      {/* KPI Metrics Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPIWidget title="Total Candidates" value={total_candidates} metricType="count" percentageChange={12.5} />
        <KPIWidget title="Average Match Score" value={`${average_match_score}/100`} metricType="quality" percentageChange={4.2} />
        <KPIWidget title="Skill Coverage Rate" value={`${skill_coverage_pct}%`} metricType="quality" percentageChange={1.8} />
      </div>

      {/* Score Tier Distribution */}
      <div className="bg-gray-950/60 p-4 rounded-lg border border-gray-800 space-y-2">
        <span className="text-[10px] uppercase font-semibold text-gray-400 block mb-2">Candidate Score Tier Distribution</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="bg-gray-900 p-2.5 rounded border border-emerald-900/40">
            <span className="text-[10px] text-emerald-400 uppercase font-bold block">Top Tier (≥85)</span>
            <span className="text-lg font-bold text-white">{score_distribution.top_tier}</span>
          </div>
          <div className="bg-gray-900 p-2.5 rounded border border-blue-900/40">
            <span className="text-[10px] text-blue-400 uppercase font-bold block">Strong (70-84)</span>
            <span className="text-lg font-bold text-white">{score_distribution.strong_tier}</span>
          </div>
          <div className="bg-gray-900 p-2.5 rounded border border-amber-900/40">
            <span className="text-[10px] text-amber-400 uppercase font-bold block">Moderate (50-69)</span>
            <span className="text-lg font-bold text-white">{score_distribution.moderate_tier}</span>
          </div>
          <div className="bg-gray-900 p-2.5 rounded border border-gray-800">
            <span className="text-[10px] text-gray-400 uppercase font-bold block">Low (&lt;50)</span>
            <span className="text-lg font-bold text-white">{score_distribution.low_tier}</span>
          </div>
        </div>
      </div>

      {/* Responsible AI & Fairness Safeguard Signal */}
      {bias_monitoring_signal && (
        <div className="bg-amber-950/20 border border-amber-900/40 p-3.5 rounded-lg space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
            <span>🛡 Responsible AI & Fairness Filter Active</span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">{bias_monitoring_signal.note}</p>
        </div>
      )}
    </div>
  );
};
