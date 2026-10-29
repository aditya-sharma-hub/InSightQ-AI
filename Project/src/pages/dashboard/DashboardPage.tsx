import React from 'https://esm.sh/react@18.2.0';
import { useAuth } from '../../context/AuthContext.js';
import { UserMenu } from '../../components/layout/UserMenu.js';
import { Card } from '../../components/ui/Cards.js';
import { Button } from '../../components/ui/Button.js';
import { SparklesIcon, DatabaseIcon, ShieldCheckIcon } from '../../assets/icons/icons.js';

export const DashboardPage = () => {
  const { user, profile, signOut } = useAuth();

  return React.createElement('div', {
    style: { minHeight: '100vh', backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)' }
  },
    /* Authenticated Header */
    React.createElement('header', {
      style: {
        height: 64, borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px'
      }
    },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
        React.createElement('div', {
          style: {
            width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #4F7CFF, #6366F1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
          }
        }, React.createElement(SparklesIcon, { size: 18 })),
        React.createElement('span', { className: 'font-title' }, 'InsightIQ ', React.createElement('span', { style: { color: '#38BDF8' } }, 'AI'))
      ),

      React.createElement(UserMenu, null)
    ),

    /* Dashboard Workspace Placeholder Body */
    React.createElement('main', { style: { padding: 40, maxWidth: 1000, margin: '0 auto' } },
      React.createElement('div', { style: { marginBottom: 32 } },
        React.createElement('div', { className: 'font-caption', style: { color: 'var(--color-primary-500)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 } }, 'Authenticated Workspace'),
        React.createElement('h1', { className: 'font-heading', style: { marginTop: 4 } }, `Welcome, ${profile?.full_name || user?.email}`),
        React.createElement('p', { className: 'font-body', style: { color: 'var(--text-secondary)' } }, 'Your private workspace and Supabase PostgreSQL profile are fully synchronized.')
      ),

      React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 } },
        React.createElement(Card, null,
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 } },
            React.createElement(ShieldCheckIcon, { size: 20, color: 'var(--color-success-500)' }),
            React.createElement('h3', { className: 'font-title' }, 'Supabase Profile & RLS Policy')
          ),
          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.875rem' } },
            React.createElement('div', null, React.createElement('strong', null, 'User ID: '), React.createElement('span', { className: 'font-mono' }, user?.id)),
            React.createElement('div', null, React.createElement('strong', null, 'Email: '), user?.email),
            React.createElement('div', null, React.createElement('strong', null, 'Role: '), profile?.role || 'Data Scientist'),
            React.createElement('div', null, React.createElement('strong', null, 'Auth Provider: '), profile?.provider || 'Email')
          )
        ),

        React.createElement(Card, null,
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 } },
            React.createElement(DatabaseIcon, { size: 20, color: '#38BDF8' }),
            React.createElement('h3', { className: 'font-title' }, 'Private Storage Namespaces')
          ),
          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.875rem', color: 'var(--text-secondary)' } },
            React.createElement('div', null, `✓ avatars/${user?.id}/* (RLS Enabled)`),
            React.createElement('div', null, `✓ reports/${user?.id}/* (RLS Enabled)`),
            React.createElement('div', null, `✓ datasets/${user?.id}/* (RLS Enabled)`),
            React.createElement('div', null, `✓ exports/${user?.id}/* (RLS Enabled)`)
          )
        )
      ),

      React.createElement('div', { style: { marginTop: 32, display: 'flex', justifyContent: 'flex-end' } },
        React.createElement(Button, { variant: 'danger', onClick: signOut }, 'Sign Out of Workspace')
      )
    )
  );
};
