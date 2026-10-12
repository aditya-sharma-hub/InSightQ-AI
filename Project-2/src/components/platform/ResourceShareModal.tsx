import React, { useState } from 'https://esm.sh/react@18.2.0';
import { ResourceType, AccessPermission, ResourceShare } from '../../types/platform.js';
import { SharingService } from '../../services/platform/platformServices.js';

interface ResourceShareModalProps {
  userId: string;
  resourceType: ResourceType;
  resourceId: string;
  resourceTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ResourceShareModal: React.FC<ResourceShareModalProps> = ({
  userId,
  resourceType,
  resourceId,
  resourceTitle,
  isOpen,
  onClose
}) => {
  const [permission, setPermission] = useState<AccessPermission>('viewer');
  const [expirationHours, setExpirationHours] = useState<number>(24);
  const [loading, setLoading] = useState(false);
  const [activeShare, setActiveShare] = useState<ResourceShare | null>(null);

  if (!isOpen) return null;

  const handleCreateShare = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const share = await SharingService.createShare(userId, resourceType, resourceId, permission, expirationHours);
      setActiveShare(share);
    } catch (err) {
      console.error('[Share Creation Error]', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async () => {
    if (!activeShare) return;
    try {
      setLoading(true);
      await SharingService.revokeShare(activeShare.id);
      setActiveShare(null);
    } catch (err) {
      console.error('[Share Revoke Error]', err);
    } finally {
      setLoading(false);
    }
  };

  const shareUrl = activeShare
    ? `${window.location.origin}/share/${activeShare.share_token}`
    : '';

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 max-w-lg w-full shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Share Resource Access</h3>
            <p className="text-xs text-gray-400 mt-0.5">Resource: <span className="text-gray-200 font-semibold">{resourceTitle}</span> ({resourceType})</p>
          </div>
          <button onClick={onClose} className="text-xs text-gray-400 hover:text-white">✕</button>
        </div>

        {!activeShare ? (
          <form onSubmit={handleCreateShare} className="space-y-3">
            <div>
              <label className="text-[10px] font-semibold uppercase text-gray-400 block mb-1">Access Level</label>
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as AccessPermission)}
                className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="viewer">Viewer (Read-Only Access)</option>
                <option value="editor">Editor (Modify Layout/Config)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold uppercase text-gray-400 block mb-1">Token Expiration</label>
              <select
                value={expirationHours}
                onChange={(e) => setExpirationHours(Number(e.target.value))}
                className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value={24}>24 Hours</option>
                <option value={168}>7 Days</option>
                <option value={720}>30 Days</option>
                <option value={0}>Never Expire</option>
              </select>
            </div>

            <p className="text-[11px] text-gray-500 bg-gray-950/60 p-3 rounded border border-gray-800/80 leading-relaxed">
              🔒 <strong>Security Policy:</strong> Sharing provides controlled access strictly to the configuration of this {resourceType}. Underlying raw storage files and private datasets are never exposed.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-1.5 rounded transition-colors disabled:opacity-50"
              >
                {loading ? 'Generating Link...' : 'Generate Controlled Share Link'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="bg-gray-950/80 border border-emerald-900/50 p-3.5 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                <span>✓ Controlled Share Link Active</span>
                <span className="text-[10px] uppercase font-mono bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                  Permission: {activeShare.access_permission}
                </span>
              </div>
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-xs font-mono text-gray-200 focus:outline-none"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={handleRevoke}
                disabled={loading}
                className="text-xs text-rose-400 hover:text-rose-300 font-semibold"
              >
                Revoke Share Token
              </button>
              <button
                onClick={onClose}
                className="bg-gray-800 hover:bg-gray-700 text-white font-semibold text-xs px-4 py-1.5 rounded"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
