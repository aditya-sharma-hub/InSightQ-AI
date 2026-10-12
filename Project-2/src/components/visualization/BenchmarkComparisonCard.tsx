import React from 'https://esm.sh/react@18.2.0';
import { BenchmarkComparisonResponse, BenchmarkStatus } from '../../types/benchmark.js';

interface BenchmarkComparisonCardProps {
  comparison: BenchmarkComparisonResponse;
  title?: string;
}

export const BenchmarkComparisonCard: React.FC<BenchmarkComparisonCardProps> = ({
  comparison,
  title = 'Benchmark Intelligence Evaluation'
}) => {
  const {
    metric_name,
    actual_value,
    benchmark_value,
    difference,
    percentage_difference,
    score,
    percentile,
    status,
    benchmark_type,
    unit,
    source,
    comparison_direction,
    interpretation,
    validation_error
  } = comparison;

  const getStatusBadgeStyle = (statusVal: BenchmarkStatus) => {
    switch (statusVal) {
      case 'above_benchmark':
        return 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50';
      case 'below_benchmark':
        return 'bg-rose-950/60 text-rose-400 border-rose-800/50';
      case 'at_benchmark':
        return 'bg-blue-950/60 text-blue-400 border-blue-800/50';
      default:
        return 'bg-gray-800 text-gray-400 border-gray-700';
    }
  };

  const getStatusLabel = (statusVal: BenchmarkStatus) => {
    switch (statusVal) {
      case 'above_benchmark':
        return 'Above Benchmark';
      case 'below_benchmark':
        return 'Below Benchmark';
      case 'at_benchmark':
        return 'At Benchmark Target';
      default:
        return 'No Verified Benchmark';
    }
  };

  if (validation_error) {
    return (
      <div className="bg-gray-900 border border-rose-900/50 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-rose-900/30 pb-3 mb-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-400">{title}</h4>
          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800 uppercase font-semibold">
            Validation Error
          </span>
        </div>
        <p className="text-xs text-rose-300 font-medium">{validation_error.message}</p>
        <span className="text-[10px] text-gray-500 mt-2 block font-mono">Error Code: {validation_error.code}</span>
      </div>
    );
  }

  // Calculate comparative bar width %
  const maxVal = Math.max(actual_value, benchmark_value, 0.0001);
  const actualPct = Math.min(100, Math.max(5, (actual_value / maxVal) * 100));
  const benchPct = Math.min(100, Math.max(5, (benchmark_value / maxVal) * 100));

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm hover:border-gray-700 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300">{title}</h4>
          <p className="text-[11px] text-gray-500 mt-0.5">Metric: <span className="font-mono text-gray-300">{metric_name}</span> • Type: <span className="capitalize text-gray-400">{benchmark_type}</span></p>
        </div>
        <span className={`text-[10px] px-2.5 py-1 rounded border font-semibold uppercase ${getStatusBadgeStyle(status)}`}>
          {getStatusLabel(status)}
        </span>
      </div>

      {/* Main Scorecard & Values Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Actual Value Box */}
        <div className="bg-gray-950/60 p-3.5 rounded-lg border border-gray-800">
          <span className="text-[10px] text-gray-500 uppercase font-medium block">Actual Analyzed Value</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold tracking-tight text-white">{actual_value.toLocaleString()}</span>
            <span className="text-xs text-gray-400">{unit}</span>
          </div>
        </div>

        {/* Benchmark Reference Value Box */}
        <div className="bg-gray-950/60 p-3.5 rounded-lg border border-gray-800">
          <span className="text-[10px] text-gray-500 uppercase font-medium block">Reference Benchmark</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold tracking-tight text-gray-300">{benchmark_value.toLocaleString()}</span>
            <span className="text-xs text-gray-400">{unit}</span>
          </div>
        </div>
      </div>

      {/* Difference Metrics Row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-gray-950/40 p-2.5 rounded-lg border border-gray-800 text-center">
          <span className="text-[10px] text-gray-500 uppercase block font-medium">Absolute Diff</span>
          <span className="text-xs font-bold text-gray-200">{difference >= 0 ? `+${difference}` : difference} {unit}</span>
        </div>
        <div className="bg-gray-950/40 p-2.5 rounded-lg border border-gray-800 text-center">
          <span className="text-[10px] text-gray-500 uppercase block font-medium">% Variance</span>
          <span className={`text-xs font-bold ${percentage_difference >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {percentage_difference >= 0 ? `+${percentage_difference}` : percentage_difference}%
          </span>
        </div>
        <div className="bg-gray-950/40 p-2.5 rounded-lg border border-gray-800 text-center">
          <span className="text-[10px] text-gray-500 uppercase block font-medium">Performance Score</span>
          <span className="text-xs font-bold text-indigo-400">{score} / 100</span>
        </div>
      </div>

      {/* Visual Bars Comparison */}
      <div className="space-y-2 mb-4 bg-gray-950/30 p-3 rounded-lg border border-gray-800/80">
        <div>
          <div className="flex justify-between text-[11px] text-gray-400 mb-1">
            <span>Actual Value</span>
            <span className="font-mono font-medium">{actual_value} {unit}</span>
          </div>
          <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${actualPct}%` }}></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[11px] text-gray-400 mb-1">
            <span>Benchmark Reference</span>
            <span className="font-mono font-medium">{benchmark_value} {unit}</span>
          </div>
          <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
            <div className="bg-indigo-500/80 h-full rounded-full transition-all duration-500" style={{ width: `${benchPct}%` }}></div>
          </div>
        </div>
      </div>

      {/* AI Intelligence Business Summary */}
      {interpretation && (
        <div className="bg-blue-950/20 p-3 rounded-lg border border-blue-900/40">
          <div className="flex items-center gap-1.5 mb-1 text-[10px] uppercase font-semibold text-blue-400">
            <span>✦ Gemini AI Executive Summary</span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed font-normal">{interpretation}</p>
        </div>
      )}

      {/* Footer Metadata */}
      <div className="mt-3 pt-2 border-t border-gray-800/60 flex items-center justify-between text-[10px] text-gray-500">
        <span>Source: <strong className="text-gray-400">{source}</strong></span>
        <span>Direction: <strong className="text-gray-400">{comparison_direction === 'higher_is_better' ? 'Higher is Better' : 'Lower is Better'}</strong></span>
        {percentile !== undefined && <span>Percentile: <strong className="text-gray-400">{percentile}th</strong></span>}
      </div>
    </div>
  );
};
