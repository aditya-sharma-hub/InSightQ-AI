import React, { useState } from 'https://esm.sh/react@18.2.0';
import { Workspace } from '../../types/platform.js';
import { WorkspaceService } from '../../services/platform/platformServices.js';

interface PlatformWorkspaceBarProps {
  userId: string;
  workspaces: Workspace[];
  activeWorkspaceId: string;
  onSelectWorkspace: (workspaceId: string) => void;
  onWorkspaceCreated?: () => void;
}

export const PlatformWorkspaceBar: React.FC<PlatformWorkspaceBarProps> = ({
  userId,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onWorkspaceCreated
}) => {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);
      await WorkspaceService.createWorkspace(userId, name.trim(), description.trim(), false);
      setName('');
      setDescription('');
      setShowModal(false);
      if (onWorkspaceCreated) onWorkspaceCreated();
    } catch (err) {
      console.error('[Workspace Create Error]', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Workspace:</span>
      <select
        value={activeWorkspaceId}
        onChange={(e) => onSelectWorkspace(e.target.value)}
        className="bg-gray-950 border border-gray-800 text-gray-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-blue-500 font-medium"
      >
        {workspaces.map((w) => (
          <option key={w.id} value={w.id}>
            {w.workspace_name} {w.is_personal ? '(Personal)' : ''}
          </option>
        ))}
        {workspaces.length === 0 && <option value="">Default Personal Workspace</option>}
      </select>

      <button
        onClick={() => setShowModal(true)}
        className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 bg-blue-950/60 border border-blue-800/40 rounded px-2.5 py-1 transition-colors"
      >
        + New Workspace
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 max-w-md w-full shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-1">Create Analytics Workspace</h3>
            <p className="text-xs text-gray-400 mb-4">Organize datasets, dashboards, reports, and AI analyses.</p>

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 block mb-1">Workspace Name</label>
                <input
                  type="text"
                  placeholder="e.g. Q3 Growth Operations"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold uppercase text-gray-400 block mb-1">Description (Optional)</label>
                <textarea
                  placeholder="Workspace scope and objectives..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-1.5 rounded transition-colors disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
