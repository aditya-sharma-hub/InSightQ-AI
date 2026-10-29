import React from 'https://esm.sh/react@18.2.0';

interface ForecastWidgetProps {
  algorithm: string;
  horizon: number;
  confidenceScore?: number;
  status: string;
}

export const ForecastWidget: React.FC<ForecastWidgetProps> = ({
  algorithm,
  horizon,
  confidenceScore = 94.5,
  status
}) => {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-3">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300">Time-Series Forecast Engine</h4>
          <p className="text-[11px] text-gray-500">Algorithm: {algorithm.toUpperCase()} • Horizon: {horizon} Days</p>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 uppercase font-semibold">
          {status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-2">
        <div className="bg-gray-950/60 p-3 rounded-lg border border-gray-800">
          <span className="text-[10px] text-gray-500 uppercase block font-medium">Confidence Score</span>
          <span className="text-lg font-bold text-emerald-400">{confidenceScore}%</span>
        </div>
        <div className="bg-gray-950/60 p-3 rounded-lg border border-gray-800">
          <span className="text-[10px] text-gray-500 uppercase block font-medium">Prediction Horizon</span>
          <span className="text-lg font-bold text-blue-400">+{horizon} Days</span>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-gray-400 italic">
        Historical vs predicted time-series model boundaries evaluated via server-side prediction intervals.
      </p>
    </div>
  );
};
