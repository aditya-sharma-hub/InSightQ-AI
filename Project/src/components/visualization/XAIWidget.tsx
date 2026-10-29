import React from 'https://esm.sh/react@18.2.0';

interface XAIWidgetProps {
  method: string;
  summary?: string;
  features: { feature_name: string; contribution: number; direction: string }[];
}

export const XAIWidget: React.FC<XAIWidgetProps> = ({ method, summary, features }) => {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300">Explainable AI (XAI) Attributions</h4>
        <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950/60 text-purple-400 border border-purple-800/40 uppercase font-semibold">{method}</span>
      </div>

      {summary && (
        <p className="text-xs text-gray-300 bg-gray-950/60 p-3 rounded-lg border border-gray-800 mb-3 italic">
          "{summary}"
        </p>
      )}

      <div className="space-y-2">
        {features.map((f, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs bg-gray-950/40 p-2 rounded border border-gray-800/60">
            <span className="font-medium text-gray-300">{f.feature_name}</span>
            <span className={`font-mono font-bold ${f.direction === 'positive' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {f.direction === 'positive' ? '+' : ''}{f.contribution.toFixed(4)}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[10px] text-gray-500 border-t border-gray-800/60 pt-2">
        Notice: Feature attributions describe model decision boundaries and do not prove causal influence.
      </p>
    </div>
  );
};
