import React, { useState } from 'https://esm.sh/react@18.2.0';
import { Input } from '../ui/Input.jsx';
import { Select, Checkbox, Radio, Toggle, DatePicker } from '../ui/Select.jsx';
import { Button } from '../ui/Button.jsx';
import { Card } from '../ui/Cards.jsx';
import { KeyIcon, DatabaseIcon } from '../../assets/icons/icons.js';

export const FormShowcase = () => {
  const [formData, setFormData] = useState({
    datasetName: 'Quarterly Sales Pipeline 2026',
    environment: 'production',
    accessRole: 'editor',
    enableAutoSync: true,
    enableNotifications: true,
    scheduledDate: '2026-09-01',
    storageClass: 'standard',
    acceptedTerms: true
  });

  return (
    React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 24 } },
      React.createElement(Card, null,
        React.createElement('h3', { className: 'font-title', style: { marginBottom: 16 } }, 'Data Pipeline Configuration Form'),
        React.createElement('p', { className: 'font-body', style: { color: 'var(--text-secondary)', marginBottom: 24 } },
          'Demonstrates structured form layouts, validation states, helper text, and interactive UI form elements.'
        ),

        React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 20 } },
          /* Text Field with Required Indicator & Helper Text */
          React.createElement(Input, {
            label: 'Dataset Source Identifier',
            isRequired: true,
            value: formData.datasetName,
            onChange: (e) => setFormData({ ...formData, datasetName: e.target.value }),
            helperText: 'Unique identifier used for downstream AI model training pipelines.'
          }),

          /* Validation Error State Showcase */
          React.createElement(Input, {
            label: 'Database Connection Endpoint',
            isRequired: true,
            value: 'db.internal.invalid-host:5432',
            errorText: 'Connection failed: Host DNS resolution timeout (5000ms).'
          }),

          /* Validation Success State Showcase */
          React.createElement(Input, {
            label: 'API Key Verification',
            value: 'sk_live_99482938472918349182',
            icon: KeyIcon,
            successText: 'API key verified and granted Read/Write permissions.'
          }),

          /* Select Dropdown Showcase */
          React.createElement(Select, {
            label: 'Deployment Environment',
            value: formData.environment,
            onChange: (e) => setFormData({ ...formData, environment: e.target.value }),
            options: [
              { value: 'production', label: 'Production (US-East Cluster)' },
              { value: 'staging', label: 'Staging Sandbox' },
              { value: 'development', label: 'Local Development' }
            ]
          }),

          /* DatePicker Showcase */
          React.createElement(DatePicker, {
            label: 'Automated Refresh Schedule Date',
            value: formData.scheduledDate,
            onChange: (e) => setFormData({ ...formData, scheduledDate: e.target.value }),
            helperText: 'Next automated batch sync execution date.'
          }),

          /* Radio Group Showcase */
          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            React.createElement('label', { className: 'input-label' }, 'Storage Tier Allocation'),
            React.createElement('div', { style: { display: 'flex', gap: 24, marginTop: 4 } },
              React.createElement(Radio, {
                id: 'tier-1', name: 'tier', label: 'Standard Storage',
                checked: formData.storageClass === 'standard',
                onChange: () => setFormData({ ...formData, storageClass: 'standard' })
              }),
              React.createElement(Radio, {
                id: 'tier-2', name: 'tier', label: 'High-Performance SSD',
                checked: formData.storageClass === 'ssd',
                onChange: () => setFormData({ ...formData, storageClass: 'ssd' })
              }),
              React.createElement(Radio, {
                id: 'tier-3', name: 'tier', label: 'Cold Archive',
                checked: formData.storageClass === 'archive',
                onChange: () => setFormData({ ...formData, storageClass: 'archive' })
              })
            )
          ),

          /* Toggle Switches Showcase */
          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 } },
            React.createElement(Toggle, {
              label: 'Enable Real-time CDC Syncing',
              checked: formData.enableAutoSync,
              onChange: (val) => setFormData({ ...formData, enableAutoSync: val })
            }),
            React.createElement(Toggle, {
              label: 'Receive Email Notifications on Data Schema Changes',
              checked: formData.enableNotifications,
              onChange: (val) => setFormData({ ...formData, enableNotifications: val })
            })
          ),

          /* Checkbox Agreement Showcase */
          React.createElement('div', { style: { marginTop: 8 } },
            React.createElement(Checkbox, {
              id: 'terms',
              label: 'I confirm that this pipeline complies with enterprise security & data privacy policies.',
              checked: formData.acceptedTerms,
              onChange: (e) => setFormData({ ...formData, acceptedTerms: e.target.checked })
            })
          ),

          /* Form Action Buttons */
          React.createElement('div', { style: { display: 'flex', gap: 12, marginTop: 12, justifyContent: 'flex-end' } },
            React.createElement(Button, { variant: 'secondary' }, 'Reset Form'),
            React.createElement(Button, { variant: 'primary', icon: DatabaseIcon }, 'Save Configuration')
          )
        )
      )
    )
  );
};
