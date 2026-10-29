import React from 'https://esm.sh/react@18.2.0';
import { ChartType } from '../../types/visualization.js';

interface ChartRendererProps {
  type: ChartType;
  data: any[];
  xAxisKey?: string;
  yAxisKey?: string;
  title?: string;
  height?: number;
}

export const ChartRenderer: React.FC<ChartRendererProps> = ({
  type,
  data,
  xAxisKey = 'label',
  yAxisKey = 'value',
  title,
  height = 240
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 border border-dashed border-gray-700 rounded-lg text-gray-400 bg-gray-900/50" style={{ height }}>
        <svg className="w-8 h-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <p className="text-xs font-medium">No telemetry data available for {title || type}</p>
      </div>
    );
  }

  const values = data.map((d) => Number(d[yAxisKey]) || 0);
  const maxVal = Math.max(...values, 1);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-sm flex flex-col justify-between" style={{ minHeight: height }}>
      {title && (
        <div className="flex items-center justify-between mb-3 border-b border-gray-800 pb-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300">{title}</h4>
          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-800/40 uppercase">{type}</span>
        </div>
      )}

      {/* SVG Bar / Line Representation */}
      <div className="flex-1 flex items-end gap-2 pt-2 px-1 relative">
        {data.map((item, idx) => {
          const val = Number(item[yAxisKey]) || 0;
          const heightPercent = Math.max(10, Math.min(100, (val / maxVal) * 100));

          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1 group relative">
              {/* Tooltip */}
              <div className="absolute -top-8 hidden group-hover:flex bg-gray-800 text-white text-[10px] py-1 px-2 rounded shadow border border-gray-700 whitespace-nowrap z-20">
                {item[xAxisKey]}: {val}
              </div>

              {/* Bar */}
              <div 
                className="w-full rounded-t transition-all duration-300 bg-gradient-to-t from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400"
                style={{ height: `${heightPercent}%` }}
              />

              {/* Label */}
              <span className="text-[10px] text-gray-400 truncate max-w-full">
                {String(item[xAxisKey] || idx + 1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
