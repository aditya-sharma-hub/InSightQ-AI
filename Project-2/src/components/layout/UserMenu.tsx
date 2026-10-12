import React, { useState } from 'https://esm.sh/react@18.2.0';
import { useAuth } from '../../context/AuthContext.js';

export const UserMenu = () => {
  const { user, profile, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const displayName = profile?.full_name || user.email?.split('@')[0] || 'User';
  const displayRole = profile?.role || 'Data Scientist';
  const initials = displayName.substring(0, 2).toUpperCase();

  return React.createElement('div', { style: { position: 'relative', display: 'inline-block' } },
    React.createElement('button', {
      onClick: () => setIsOpen(!isOpen),
      style: {
        display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none',
        cursor: 'pointer', padding: '4px 8px', borderRadius: 'var(--radius-md)'
      }
    },
      React.createElement('div', {
        style: {
          width: 34, height: 34, borderRadius: '50%', backgroundColor: 'var(--color-primary-500)',
          color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 600, fontSize: '0.8125rem'
        }
      }, initials),
      React.createElement('div', { style: { textAlign: 'left' } },
        React.createElement('div', { className: 'font-button', style: { fontSize: '0.8125rem', color: 'var(--text-primary)' } }, displayName),
        React.createElement('div', { className: 'font-caption', style: { color: 'var(--text-tertiary)' } }, displayRole)
      )
    ),

    isOpen && React.createElement('div', {
      className: 'animate-fade-in',
      style: {
        position: 'absolute', top: '100%', right: 0, marginTop: 8, zIndex: 60,
        backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xl)', padding: 16, width: 220
      }
    },
      React.createElement('div', { style: { paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--border-subtle)' } },
        React.createElement('div', { className: 'font-button' }, displayName),
        React.createElement('div', { className: 'font-caption', style: { color: 'var(--text-tertiary)' } }, user.email)
      ),
      React.createElement('button', {
        className: 'btn btn-ghost btn-sm',
        style: { width: '100%', justifyContent: 'flex-start', color: 'var(--color-error-500)' },
        onClick: signOut
      }, 'Sign Out')
    )
  );
};
