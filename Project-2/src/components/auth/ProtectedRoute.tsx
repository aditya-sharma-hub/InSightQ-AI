import React from 'https://esm.sh/react@18.2.0';
import { useAuth } from '../../context/AuthContext.js';

export const ProtectedRoute = ({ children, fallback }) => {
  const { session, loading, authState } = useAuth();

  if (loading || authState === 'authenticating') {
    return React.createElement('div', {
      style: {
        minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#090D16', color: '#F9FAFB', gap: 16, fontFamily: 'var(--font-sans)'
      }
    },
      React.createElement('div', {
        className: 'boot-progress-track',
        style: { width: 240, height: 4, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 2, overflow: 'hidden' }
      },
        React.createElement('div', {
          style: { width: '60%', height: '100%', backgroundColor: '#4F7CFF', animation: 'pulse 1.5s infinite ease-in-out' }
        })
      ),
      React.createElement('div', { style: { fontSize: '0.875rem', color: '#9CA3AF' } },
        loading ? 'Checking Session...' : 'Initializing Workspace...'
      )
    );
  }

  if (!session) {
    return fallback || null;
  }

  return children;
};
