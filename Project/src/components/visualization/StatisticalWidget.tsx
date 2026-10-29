import React from 'https://esm.sh/react@18.2.0';

interface StatisticalWidgetProps {
  statsRecords: {
    id: string;
    analysis_type: string;
    method: string;
    result: any;
    interpretation: string;
  }[];
}

export const StatisticalWidget: React.FC<StatisticalWidgetProps> = ({ statsRecords }) => {
  if (!statsRecords || statsRecords.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1">Statistical Analysis Engine</h4>
        <p className="text-xs text-gray-500">Run statistical tests to view moment calculations and correlation matrices.</p>
      </div>
    );
  }

  const latest = statsRecords[0];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300">Statistical Engine Summary</h4>
        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-400 border border-indigo-800/40 uppercase">{latest.method}</span>
      </div>

      <div className="bg-gray-950/60 p-3 rounded-lg border border-gray-800 mb-3">
        <span className="text-[10px] text-gray-500 uppercase font-medium block">Latest Statistical Interpretation</span>
        <p className="text-xs text-gray-300 mt-1 font-medium">{latest.interpretation}</p>
      </div>

      <div className="text-[11px] text-gray-500 flex justify-between">
        <span>Type: {latest.analysis_type}</span>
        <span>Total Analysis Records: {statsRecords.length}</span>
      </div>
    </div>
  );
};
