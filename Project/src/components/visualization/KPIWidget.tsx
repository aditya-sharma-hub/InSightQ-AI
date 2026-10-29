import React from 'https://esm.sh/react@18.2.0';

interface KPIWidgetProps {
  title: string;
  value: number | string;
  previousValue?: number;
  percentageChange?: number;
  metricType?: string;
  updatedAt?: string;
}

export const KPIWidget: React.FC<KPIWidgetProps> = ({
  title,
  value,
  previousValue,
  percentageChange = 5.4,
  metricType = 'sum',
  updatedAt
}) => {
  const isPositive = percentageChange >= 0;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm hover:border-gray-700 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</span>
        <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">{metricType}</span>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-2xl font-bold tracking-tight text-white">{typeof value === 'number' ? value.toLocaleString() : value}</span>
        
        <div className={`flex items-center text-xs font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isPositive ? '▲' : '▼'} {Math.abs(percentageChange)}%
        </div>
      </div>

      {previousValue !== undefined && (
        <p className="mt-1 text-[11px] text-gray-500">vs previous period ({previousValue.toLocaleString()})</p>
      )}

      {updatedAt && (
        <p className="mt-3 text-[10px] text-gray-600 border-t border-gray-800/60 pt-2">Updated: {new Date(updatedAt).toLocaleTimeString()}</p>
      )}
    </div>
  );
};
