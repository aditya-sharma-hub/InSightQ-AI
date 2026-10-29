import React from 'https://esm.sh/react@18.2.0';
import { HistoricalBenchmarkComparison } from '../../types/benchmark.js';

interface HistoricalBenchmarkWidgetProps {
  comparison: HistoricalBenchmarkComparison;
  unit?: string;
  title?: string;
}

export const HistoricalBenchmarkWidget: React.FC<HistoricalBenchmarkWidgetProps> = ({
  comparison,
  unit = '%',
  title = 'Historical KPI Performance Benchmark'
}) => {
  const {
    metric_name,
    current_value,
    historical_value,
    difference,
    percentage_difference,
    direction,
    historical_percentile,
    sample_size,
    calculated_at
  } = comparison;

  const isImprovement = direction === 'improvement';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm hover:border-gray-700 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300">{title}</h4>
          <p className="text-[11px] text-gray-500 mt-0.5">Metric: <span className="font-mono text-gray-300">{metric_name}</span></p>
        </div>
        <span className={`text-[10px] px-2.5 py-1 rounded border font-semibold uppercase ${isImprovement ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50' : 'bg-rose-950/60 text-rose-400 border-rose-800/50'}`}>
          {isImprovement ? '▲ Improved' : '▼ Deteriorated'}
        </span>
      </div>

      {/* Values Comparison */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-950/60 p-3.5 rounded-lg border border-gray-800">
          <span className="text-[10px] text-gray-500 uppercase font-medium block">Current Execution</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold tracking-tight text-white">{current_value.toLocaleString()}</span>
            <span className="text-xs text-gray-400">{unit}</span>
          </div>
        </div>

        <div className="bg-gray-950/60 p-3.5 rounded-lg border border-gray-800">
          <span className="text-[10px] text-gray-500 uppercase font-medium block">Historical Baseline</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold tracking-tight text-gray-300">{historical_value.toLocaleString()}</span>
            <span className="text-xs text-gray-400">{unit}</span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-gray-950/40 p-2.5 rounded-lg border border-gray-800 text-center">
          <span className="text-[10px] text-gray-500 uppercase block font-medium">Absolute Variance</span>
          <span className="text-xs font-bold text-gray-200">{difference >= 0 ? `+${difference}` : difference} {unit}</span>
        </div>
        <div className="bg-gray-950/40 p-2.5 rounded-lg border border-gray-800 text-center">
          <span className="text-[10px] text-gray-500 uppercase block font-medium">% Change</span>
          <span className={`text-xs font-bold ${percentage_difference >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {percentage_difference >= 0 ? `+${percentage_difference}` : percentage_difference}%
          </span>
        </div>
        <div className="bg-gray-950/40 p-2.5 rounded-lg border border-gray-800 text-center">
          <span className="text-[10px] text-gray-500 uppercase block font-medium">Historical Rank</span>
          <span className="text-xs font-bold text-indigo-400">{historical_percentile ?? 50.0}th Pct</span>
        </div>
      </div>

      {/* Footer Details */}
      <div className="pt-2 border-t border-gray-800/60 flex items-center justify-between text-[10px] text-gray-500">
        <span>Sample Size: <strong className="text-gray-400">{sample_size || 1} historical run(s)</strong></span>
        <span>Evaluated: <strong className="text-gray-400">{new Date(calculated_at).toLocaleDateString()}</strong></span>
      </div>
    </div>
  );
};
