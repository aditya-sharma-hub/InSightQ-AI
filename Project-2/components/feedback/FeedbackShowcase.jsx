import React, { useState } from 'https://esm.sh/react@18.2.0';
import { Card } from '../ui/Cards.jsx';
import { Button } from '../ui/Button.jsx';
import { Dialog } from '../ui/Dialog.jsx';
import { Drawer } from '../ui/Drawer.jsx';
import { ToastContainer } from '../ui/Toast.jsx';
import { Tooltip, Popover } from '../ui/Tooltip.jsx';
import { Accordion, Tabs } from '../ui/Tabs.jsx';
import { AlertTriangleIcon, CheckCircleIcon, InfoIcon, TrashIcon } from '../../assets/icons/icons.js';

export const FeedbackShowcase = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  const addToast = (type, title, message) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, title, message }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 24 } },
      /* Modals & Drawers Section */
      React.createElement(Card, null,
        React.createElement('h3', { className: 'font-title', style: { marginBottom: 8 } }, 'Dialogs, Modals & Drawers'),
        React.createElement('p', { className: 'font-body', style: { color: 'var(--text-secondary)', marginBottom: 20 } },
          'Accessible overlay primitives with focus trap design and ESC key listeners.'
        ),
        React.createElement('div', { style: { display: 'flex', gap: 12, flexWrap: 'wrap' } },
          React.createElement(Button, { onClick: () => setIsModalOpen(true) }, 'Open Modal Dialog'),
          React.createElement(Button, { variant: 'secondary', onClick: () => setIsDrawerOpen(true) }, 'Open Slide-out Drawer')
        )
      ),

      /* Toasts Section */
      React.createElement(Card, null,
        React.createElement('h3', { className: 'font-title', style: { marginBottom: 8 } }, 'Toast Feedback Notifications'),
        React.createElement('p', { className: 'font-body', style: { color: 'var(--text-secondary)', marginBottom: 20 } },
          'Trigger non-blocking status notifications across four semantic states.'
        ),
        React.createElement('div', { style: { display: 'flex', gap: 12, flexWrap: 'wrap' } },
          React.createElement(Button, {
            variant: 'secondary',
            icon: CheckCircleIcon,
            onClick: () => addToast('success', 'Pipeline Created', 'Data pipeline successfully scheduled.')
          }, 'Trigger Success'),

          React.createElement(Button, {
            variant: 'secondary',
            icon: AlertTriangleIcon,
            onClick: () => addToast('warning', 'Schema Warning', 'Field "user_id" modified in source database.')
          }, 'Trigger Warning'),

          React.createElement(Button, {
            variant: 'danger',
            icon: TrashIcon,
            onClick: () => addToast('error', 'Execution Failed', 'Failed to connect to Snowflake cluster.')
          }, 'Trigger Error'),

          React.createElement(Button, {
            variant: 'ghost',
            icon: InfoIcon,
            onClick: () => addToast('info', 'System Update', 'New AI model version v2.1 available.')
          }, 'Trigger Info')
        )
      ),

      /* Tooltips & Popovers Section */
      React.createElement(Card, null,
        React.createElement('h3', { className: 'font-title', style: { marginBottom: 8 } }, 'Tooltips & Popovers'),
        React.createElement('p', { className: 'font-body', style: { color: 'var(--text-secondary)', marginBottom: 20 } },
          'Hover overlays and popover dropdown containers.'
        ),
        React.createElement('div', { style: { display: 'flex', gap: 24, alignItems: 'center' } },
          React.createElement(Tooltip, { content: 'Tooltip on Top', position: 'top' },
            React.createElement(Button, { variant: 'secondary' }, 'Hover Me (Top)')
          ),
          React.createElement(Tooltip, { content: 'Tooltip on Right', position: 'right' },
            React.createElement(Button, { variant: 'secondary' }, 'Hover Me (Right)')
          )
        )
      ),

      /* Tabs & Accordion Section */
      React.createElement(Card, null,
        React.createElement('h3', { className: 'font-title', style: { marginBottom: 16 } }, 'Tabs & Accordion Navigation'),
        React.createElement(Tabs, {
          activeTab,
          onChange: setActiveTab,
          tabs: [
            { id: 'overview', label: 'Line Tab (Overview)' },
            { id: 'security', label: 'Security & Access' },
            { id: 'logs', label: 'Execution Logs' }
          ]
        }),
        React.createElement('div', { style: { marginTop: 24 } },
          React.createElement(Accordion, {
            items: [
              { title: 'What is InsightIQ AI UI Architecture?', content: 'InsightIQ AI is a modular, design-token driven interface built with pure CSS variables and atomic components for maximum performance.' },
              { title: 'How is WCAG AA contrast maintained?', content: 'All text and background color pairs satisfy WCAG AA contrast ratios (minimum 4.5:1 for body text) across both Light and Dark Charcoal themes.' }
            ]
          })
        )
      ),

      /* Render Overlay Modal */
      React.createElement(Dialog, {
        isOpen: isModalOpen,
        onClose: () => setIsModalOpen(false),
        title: 'Confirm Dataset Deletion',
        subtitle: 'This action cannot be undone.',
        isPrimaryDanger: true,
        primaryActionText: 'Delete Dataset',
        onPrimaryAction: () => {
          setIsModalOpen(false);
          addToast('error', 'Dataset Deleted', 'Quarterly_Sales_2025 has been removed.');
        }
      },
        React.createElement('p', { className: 'font-body' },
          'Are you sure you want to permanently delete dataset ',
          React.createElement('strong', null, 'Quarterly_Sales_2025'),
          '? All associated downstream model checkpoints and cached queries will be unlinked.'
        )
      ),

      /* Render Overlay Drawer */
      React.createElement(Drawer, {
        isOpen: isDrawerOpen,
        onClose: () => setIsDrawerOpen(false),
        title: 'Dataset Properties & Lineage'
      },
        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
          React.createElement('div', null,
            React.createElement('span', { className: 'font-caption', style: { color: 'var(--text-tertiary)' } }, 'Dataset ID'),
            React.createElement('div', { className: 'font-mono font-body', style: { fontWeight: 600 } }, 'ds_994829103')
          ),
          React.createElement('div', null,
            React.createElement('span', { className: 'font-caption', style: { color: 'var(--text-tertiary)' } }, 'Storage Size'),
            React.createElement('div', { className: 'font-body' }, '4.85 GB (Parquet Compressed)')
          )
        )
      ),

      /* Toast Notification Portal Container */
      React.createElement(ToastContainer, { toasts, removeToast })
    )
  );
};
