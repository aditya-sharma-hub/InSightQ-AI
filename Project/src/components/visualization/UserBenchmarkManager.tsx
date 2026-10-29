import React, { useState } from 'https://esm.sh/react@18.2.0';
import { UserBenchmark, ComparisonDirection } from '../../types/benchmark.js';
import { BenchmarkingService } from '../../services/benchmark/benchmarkingService.js';

interface UserBenchmarkManagerProps {
  userId: string;
  benchmarks: UserBenchmark[];
  onRefresh?: () => void;
}

export const UserBenchmarkManager: React.FC<UserBenchmarkManagerProps> = ({
  userId,
  benchmarks,
  onRefresh
}) => {
  const [benchmarkName, setBenchmarkName] = useState('');
  const [metricName, setMetricName] = useState('');
  const [referenceValue, setReferenceValue] = useState<number | ''>('');
  const [unit, setUnit] = useState('%');
  const [direction, setDirection] = useState<ComparisonDirection>('higher_is_better');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!benchmarkName.trim() || !metricName.trim() || referenceValue === '') {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      await BenchmarkingService.createBenchmark(
        userId,
        benchmarkName.trim(),
        metricName.trim(),
        Number(referenceValue),
        unit,
        direction
      );

      setBenchmarkName('');
      setMetricName('');
      setReferenceValue('');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create user benchmark.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      await BenchmarkingService.deleteBenchmark(id);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to delete benchmark.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm space-y-5">
      <div className="border-b border-gray-800 pb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300">User Defined Reference Benchmarks</h4>
        <p className="text-xs text-gray-500 mt-0.5">Define custom target metrics and threshold directions for your analytical datasets.</p>
      </div>

      {errorMsg && (
        <div className="bg-rose-950/60 border border-rose-800/60 p-3 rounded-lg text-xs text-rose-300">
          {errorMsg}
        </div>
      )}

      {/* Creation Form */}
      <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-950/60 p-4 rounded-lg border border-gray-800">
        <div>
          <label className="text-[10px] uppercase font-semibold text-gray-400 block mb-1">Benchmark Name</label>
          <input
            type="text"
            placeholder="e.g. Target Churn Max"
            value={benchmarkName}
            onChange={(e) => setBenchmarkName(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase font-semibold text-gray-400 block mb-1">Metric Identifier</label>
          <input
            type="text"
            placeholder="e.g. churn_rate"
            value={metricName}
            onChange={(e) => setMetricName(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase font-semibold text-gray-400 block mb-1">Reference Value</label>
          <input
            type="number"
            step="any"
            placeholder="e.g. 5.0"
            value={referenceValue}
            onChange={(e) => setReferenceValue(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase font-semibold text-gray-400 block mb-1">Unit Symbol</label>
          <input
            type="text"
            placeholder="%"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="text-[10px] uppercase font-semibold text-gray-400 block mb-1">Performance Direction</label>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as ComparisonDirection)}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="higher_is_better">Higher is Better (e.g. Revenue)</option>
            <option value="lower_is_better">Lower is Better (e.g. Churn / Latency)</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs py-2 px-4 rounded transition-colors"
          >
            {loading ? 'Saving...' : '+ Add Target Benchmark'}
          </button>
        </div>
      </form>

      {/* Benchmarks List Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400 uppercase text-[10px] tracking-wider">
              <th className="py-2.5 px-3">Benchmark Name</th>
              <th className="py-2.5 px-3">Metric</th>
              <th className="py-2.5 px-3 text-right">Target Value</th>
              <th className="py-2.5 px-3">Unit</th>
              <th className="py-2.5 px-3">Direction</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60 text-gray-300">
            {benchmarks.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 text-center text-gray-500">
                  No user-defined benchmarks created yet. Use the form above to add your first reference target.
                </td>
              </tr>
            ) : (
              benchmarks.map((b) => (
                <tr key={b.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="py-3 px-3 font-semibold text-white">{b.benchmark_name}</td>
                  <td className="py-3 px-3 font-mono text-gray-400">{b.metric_name}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-gray-200">{b.reference_value}</td>
                  <td className="py-3 px-3 text-gray-400">{b.unit}</td>
                  <td className="py-3 px-3">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
                      {b.comparison_direction === 'higher_is_better' ? 'Higher is Better' : 'Lower is Better'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handleDelete(b.id)}
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
