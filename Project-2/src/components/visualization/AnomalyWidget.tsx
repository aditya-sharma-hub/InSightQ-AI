import React from 'https://esm.sh/react@18.2.0';

interface AnomalyWidgetProps {
  anomalies: {
    id: string;
    anomaly_type: string;
    severity: string;
    affected_columns: string[];
    explanation?: string;
  }[];
}

export const AnomalyWidget: React.FC<AnomalyWidgetProps> = ({ anomalies }) => {
  if (!anomalies || anomalies.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2 text-emerald-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs font-semibold uppercase">Zero Critical Anomalies Detected</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">Dataset telemetry exhibits clean variance distribution.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300 mb-3 border-b border-gray-800 pb-2">
        Detected Dataset Anomalies ({anomalies.length})
      </h4>

      <div className="space-y-3">
        {anomalies.map((anom) => (
          <div key={anom.id} className="bg-gray-950/60 p-3 rounded-lg border border-gray-800 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-200 uppercase">{anom.anomaly_type}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase border ${
                anom.severity === 'critical' || anom.severity === 'high'
                  ? 'bg-rose-950/60 text-rose-400 border-rose-800/40'
                  : 'bg-amber-950/60 text-amber-400 border-amber-800/40'
              }`}>
                {anom.severity}
              </span>
            </div>
            {anom.affected_columns && (
              <p className="text-[11px] text-gray-400">Affected Columns: {anom.affected_columns.join(', ')}</p>
            )}
            {anom.explanation && (
              <p className="text-[11px] text-gray-500 italic">{anom.explanation}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
