import React from 'https://esm.sh/react@18.2.0';
import { ModelBenchmarkComparison } from '../../types/benchmark.js';

interface ModelBenchmarkWidgetProps {
  models: ModelBenchmarkComparison[];
  title?: string;
}

export const ModelBenchmarkWidget: React.FC<ModelBenchmarkWidgetProps> = ({
  models,
  title = 'ML Model Benchmark Matrix'
}) => {
  if (!models || models.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">{title}</h4>
        <p className="text-xs text-gray-500">No ML models registered for comparative benchmarking in this workspace.</p>
      </div>
    );
  }

  const problemType = models[0].problem_type || 'classification';

  const getMetricHeaders = (type: string) => {
    switch (type) {
      case 'regression':
        return ['MAE', 'RMSE', 'R²'];
      case 'time_series':
        return ['MAE', 'RMSE', 'MAPE'];
      default:
        return ['Accuracy', 'Precision', 'Recall', 'F1 Score', 'ROC-AUC'];
    }
  };

  const headers = getMetricHeaders(problemType);

  const getMetricVal = (m: ModelBenchmarkComparison, metricName: string): string => {
    const norm = metricName.toLowerCase().replace(/[\s-]/g, '_');
    const val = m.metrics[norm] ?? m.metrics[metricName] ?? m.metrics[metricName.toLowerCase()];
    return val !== undefined ? Number(val).toFixed(4) : 'N/A';
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300">{title}</h4>
          <p className="text-[11px] text-gray-500 mt-0.5">Problem Context: <span className="capitalize text-gray-300 font-medium">{problemType}</span></p>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 uppercase font-semibold">
          {models.length} Model{models.length > 1 ? 's' : ''} Evaluated
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 uppercase text-[10px] tracking-wider">
              <th className="py-2.5 px-3">Model Name</th>
              <th className="py-2.5 px-3">Version</th>
              <th className="py-2.5 px-3">Status</th>
              {headers.map((h, i) => (
                <th key={i} className="py-2.5 px-3 text-right">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60 text-gray-300">
            {models.map((m) => (
              <tr key={m.model_id} className={`hover:bg-gray-800/30 transition-colors ${m.is_baseline ? 'bg-indigo-950/20' : ''}`}>
                <td className="py-3 px-3 font-semibold flex items-center gap-1.5">
                  <span>{m.model_name}</span>
                  {m.is_baseline && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-900/80 text-indigo-300 uppercase font-mono">
                      Baseline
                    </span>
                  )}
                </td>
                <td className="py-3 px-3 text-gray-400 font-mono">v{m.version}</td>
                <td className="py-3 px-3">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700 capitalize">
                    {m.status}
                  </span>
                </td>
                {headers.map((h, i) => {
                  const valStr = getMetricVal(m, h);
                  return (
                    <td key={i} className="py-3 px-3 text-right font-mono font-medium text-gray-200">
                      {valStr}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
