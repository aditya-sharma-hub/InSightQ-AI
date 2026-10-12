import React from 'https://esm.sh/react@18.2.0';
import { SavedAnalysis } from '../../types/platform.js';
import { SavedAnalysisService } from '../../services/platform/platformServices.js';

interface SavedAnalysesWidgetProps {
  userId: string;
  analyses: SavedAnalysis[];
  onRefresh?: () => void;
}

export const SavedAnalysesWidget: React.FC<SavedAnalysesWidgetProps> = ({
  userId,
  analyses,
  onRefresh
}) => {
  const handleDelete = async (id: string) => {
    try {
      await SavedAnalysisService.deleteAnalysis(id);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('[Saved Analysis Delete Error]', err);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300">Saved Analysis Configurations</h4>
          <p className="text-xs text-gray-500 mt-0.5">Persisted analytical filter criteria, statistical configs, and BI views.</p>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded bg-blue-950/60 text-blue-400 border border-blue-800/40 uppercase font-semibold">
          {analyses.length} Saved
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 uppercase text-[10px] tracking-wider">
              <th className="py-2.5 px-3">Analysis Name</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Columns</th>
              <th className="py-2.5 px-3">Created</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60 text-gray-300">
            {analyses.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-gray-500">
                  No saved analyses found in active workspace.
                </td>
              </tr>
            ) : (
              analyses.map((a) => (
                <tr key={a.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="py-3 px-3 font-semibold text-white">{a.analysis_name}</td>
                  <td className="py-3 px-3 uppercase text-[10px]">
                    <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
                      {a.analysis_type}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-gray-400">
                    {a.selected_columns?.length ? a.selected_columns.join(', ') : 'All Columns'}
                  </td>
                  <td className="py-3 px-3 text-gray-500">
                    {new Date(a.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="text-[11px] text-rose-400 hover:text-rose-300 font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
