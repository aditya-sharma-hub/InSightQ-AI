import React from 'https://esm.sh/react@18.2.0';

interface MLPerformanceWidgetProps {
  modelName: string;
  algorithm: string;
  version: number;
  status: string;
  metrics: { metric_name: string; metric_value: number }[];
}

export const MLPerformanceWidget: React.FC<MLPerformanceWidgetProps> = ({
  modelName,
  algorithm,
  version,
  status,
  metrics
}) => {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-3">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300">{modelName}</h4>
          <p className="text-[11px] text-gray-500">Algo: {algorithm} • Version: v{version}</p>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded bg-blue-950/60 text-blue-400 border border-blue-800/40 uppercase font-semibold">
          {status}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {metrics.map((m, idx) => (
          <div key={idx} className="bg-gray-950/60 p-2.5 rounded-lg border border-gray-800 text-center">
            <span className="text-[10px] text-gray-500 uppercase block font-medium truncate">{m.metric_name}</span>
            <span className="text-sm font-bold text-gray-200">{m.metric_value.toFixed(4)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
