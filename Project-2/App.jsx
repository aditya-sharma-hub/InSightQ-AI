import React, { useState } from 'https://esm.sh/react@18.2.0';
import { ThemeProvider } from './theme/ThemeContext.js';
import { AppLayout } from './components/layout/AppLayout.jsx';
import { PageTemplate, ContentGrid } from './components/layout/PageTemplate.jsx';
import { StatisticCard, MetricCard, FeatureCard } from './components/ui/Cards.jsx';
import { Button } from './components/ui/Button.jsx';
import { StatusChip, Badge, Avatar } from './components/ui/Badge.jsx';
import { EnterpriseTable } from './components/common/EnterpriseTable.jsx';
import { FormShowcase } from './components/forms/FormShowcase.jsx';
import { FeedbackShowcase } from './components/feedback/FeedbackShowcase.jsx';
import { BarChartPlaceholder, LineChartPlaceholder, AreaChartPlaceholder, PieChartPlaceholder, HeatmapPlaceholder, ScatterPlotPlaceholder, TreemapPlaceholder, RadarChartPlaceholder, ForecastChartPlaceholder } from './components/charts/ChartPlaceholders.jsx';
import { DatabaseIcon, SparklesIcon, TrendingUpIcon, LayersIcon, FolderIcon, UserIcon, SettingsIcon, BarChart2Icon } from './assets/icons/icons.js';

export function App() {
  const [globalNav, setGlobalNav] = useState('dashboard');
  const [projectId, setProjectId] = useState(null);
  const [tableLoading, setTableLoading] = useState(false);

  /* Sample Enterprise Table Columns Specification */
  const columns = [
    { key: 'name', label: 'Dataset Name', sortable: true, render: (val) => React.createElement('div', { style: { fontWeight: 600 } }, val) },
    { key: 'category', label: 'Domain Category', sortable: true, render: (val) => React.createElement('span', { className: 'badge' }, val) },
    { key: 'records', label: 'Record Count', sortable: true, render: (val) => React.createElement('span', { className: 'font-mono' }, val.toLocaleString()) },
    { key: 'status', label: 'Sync Status', sortable: true, render: (val) => React.createElement(StatusChip, { status: val }) },
    { key: 'updated', label: 'Last Synced', sortable: true, render: (val) => React.createElement('span', { className: 'font-caption', style: { color: 'var(--text-tertiary)' } }, val) }
  ];

  /* Sample Data Rows */
  const tableData = [
    { name: 'Customer_360_Telemetry', category: 'Analytics', records: 4820190, status: 'active', updated: '2 mins ago' },
    { name: 'Financial_Ledger_2026', category: 'Finance', records: 1204000, status: 'active', updated: '15 mins ago' },
    { name: 'Predictive_Churn_Model_v3', category: 'AI Models', records: 940300, status: 'pending', updated: '1 hour ago' },
    { name: 'Supply_Chain_IoT_Stream', category: 'Logistics', records: 18920100, status: 'active', updated: 'Just now' },
    { name: 'Legacy_ERP_Archive_2024', category: 'Storage', records: 830100, status: 'inactive', updated: '3 days ago' },
    { name: 'Web_Clickstream_CDC', category: 'Analytics', records: 9240100, status: 'failed', updated: '10 mins ago' }
  ];

  /* --- Global Navigation Sections --- */

  /* Dashboard Section */
  const DashboardSection = () => React.createElement(PageTemplate, {
    title: 'Enterprise Analytics Overview',
    subtitle: 'Real-time telemetry and unified data science system health.',
    breadcrumbs: [{ label: 'InsightIQ AI' }, { label: 'Dashboard' }],
    toolbarActions: React.createElement(React.Fragment, null,
      React.createElement(Button, { variant: 'secondary', icon: RefreshCwIcon }, 'Refresh'),
      React.createElement(Button, { variant: 'primary', icon: PlusIcon }, 'New Pipeline')
    )
  },
    React.createElement(ContentGrid, { className: 'mb-6' },
      React.createElement('div', { className: 'col-3' },
        React.createElement(StatisticCard, {
          title: 'Total Active Datasets', value: '1,428', change: '+12.4%', trend: 'up',
          icon: DatabaseIcon, description: 'vs. previous 30 days'
        })
      ),
      React.createElement('div', { className: 'col-3' },
        React.createElement(StatisticCard, {
          title: 'AI Model Inference', value: '99.85%', change: '+0.2%', trend: 'up',
          icon: SparklesIcon, description: 'SLA uptime target: 99.9%'
        })
      ),
      React.createElement('div', { className: 'col-3' },
        React.createElement(StatisticCard, {
          title: 'Query Latency (p95)', value: '42ms', change: '-8.1%', trend: 'up',
          icon: TrendingUpIcon, description: 'Sub-second response'
        })
      ),
      React.createElement('div', { className: 'col-3' },
        React.createElement(StatisticCard, {
          title: 'Storage Capacity', value: '42.8 TB', change: '+4.2%', trend: 'down',
          icon: LayersIcon, description: '68% of allocated tier'
        })
      )
    ),

    React.createElement(ContentGrid, { style: { marginTop: 24 } },
      React.createElement('div', { className: 'col-8' },
        React.createElement(ForecastChartPlaceholder, null)
      ),
      React.createElement('div', { className: 'col-4' },
        React.createElement(PieChartPlaceholder, null)
      )
    ),

    React.createElement(ContentGrid, { style: { marginTop: 24 } },
      React.createElement('div', { className: 'col-4' },
        React.createElement(FeatureCard, {
          title: 'Automated Schema Discovery',
          description: 'Detect schema drift across Snowflake, BigQuery, and Databricks automatically.',
          icon: DatabaseIcon,
          actionText: 'Configure Catalog'
        })
      ),
      React.createElement('div', { className: 'col-4' },
        React.createElement(FeatureCard, {
          title: 'LLM Fine-Tuning Sandbox',
          description: 'Deploy domain-specific embeddings with automated prompt evaluation benchmarks.',
          icon: SparklesIcon,
          actionText: 'Explore Models'
        })
      ),
      React.createElement('div', { className: 'col-4' },
        React.createElement(FeatureCard, {
          title: 'Compliance & Audit Governance',
          description: 'Complete SOC2 Type II and GDPR data lineage tracking with immutable access logs.',
          icon: LayersIcon,
          actionText: 'View Audit Log'
        })
      )
    )
  );

  /* Projects Section - Project List & Workspace */
  const ProjectsSection = async () => {
    /* Fetch projects/workspaces from the backend */
    let projects = [];
    let datasetProfile: any = null;
    let selectedProjectDatasetId: string | null = null;
    
    try {
      /* In a full implementation, this would use the supabase client */
      /* For now, fall back to the canonical projects store */
      /* TODO: Replace with actual API call to /api/workspaces or supabase */
      projects = [];
    } catch (err) {
      console.error('[Projects] Failed to fetch projects:', err);
    }

    /* If we have a selected project dataset, fetch its profile for conditional modules */
    if (selectedProjectDatasetId && !datasetProfile) {
      try {
        const profileResult = await DatasetService.profileDataset({
          dataset: {
            row_count: 0,
            column_count: 0,
            columns: []
          },
          dataset: { name: 'Selected Project Dataset' },
          statistics: null,
          quality: null
        });
        datasetProfile = profileResult;
      } catch (err) {
        console.error('[Projects] Failed to fetch dataset profile:', err);
      }
    }

    /* Check if Geo and Forecast are applicable based on dataset profile */
    const isGeoApplicable = datasetProfile?.detected_geo_columns && datasetProfile.detected_geo_columns.length > 0;
    const isForecastApplicable = datasetProfile?.hasDateTime;

    /* Render project list */
    const projectCards = projects.map((proj, idx) => React.createElement('div', {
      key: proj.id || idx,
      style: { background: 'var(--bg-surface-elevated)', borderRadius: 12, padding: 24, border: '1px solid var(--border-subtle)', marginBottom: 16 }
    },
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16' } },
        React.createElement('h3', { style: { color: 'var(--text-primary)', marginBottom: 4 } }, proj.name || 'Unnamed Project'),
        React.createElement('span', { style: { color: 'var(--text-tertiary)', fontSize: '0.8125rem' } }, proj.description ? proj.description.substring(0, 50) : 'No description')
      ),
      React.createElement('div', { style: { color: 'var(--text-secondary)', fontSize: '0.8125rem' } },
        `Datasets: ${proj.datasetCount || 0} | Status: ${proj.status || 'Active'}`
      ),
      React.createElement('div', { style: { display: 'flex', gap: 8, marginTop: 16 } },
        React.createElement(Button, { variant: 'link', style: { flex: 1 } }, 'Open Workspace'),
        React.createElement(Button, { variant: 'link', style: { flex: 1 } }, 'Manage Datasets')
      )
    ));

    /* Fallback when no projects found */
    if (projectCards.length === 0) {
      return React.createElement(PageTemplate, {
        title: 'Projects',
        subtitle: 'Manage and navigate your analytics projects.',
        breadcrumbs: [{ label: 'InsightIQ AI' }, { label: 'Projects' }],
        toolbarActions: React.createElement(React.Fragment, null,
          React.createElement(Button, { variant: 'secondary', icon: RefreshCwIcon }, 'Refresh'),
          React.createElement(Button, { variant: 'primary', icon: PlusIcon }, 'New Project')
        )
      },
        React.createElement('div', { style: { padding: 24, background: 'var(--bg-surface)', borderRadius: 16 } },
          React.createElement('h2', { style: { color: 'var(--text-primary)', marginBottom: 16 } }, 'Your Projects'),
          React.createElement('p', { style: { color: 'var(--text-secondary)' } }, 'No projects yet. Upload a dataset to create your first project, or create a new project below.'),
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 24 } },
            React.createElement(Button, { variant: 'outline', style: { width: '100%' } }, 'Upload Dataset to Create Project'),
            React.createElement(Button, { variant: 'outline', style: { width: '100%' } }, 'Create Empty Project')
          )
        )
      );
    }

    /* Conditional Geo and Forecast module activation */
    const geoModuleStyle = {
      color: isGeoApplicable ? 'var(--text-primary)' : 'var(--text-tertiary)',
      cursor: isGeoApplicable ? 'pointer' : 'default',
      textDecoration: isGeoApplicable ? 'none' : 'line-through'
    };
    const forecastModuleStyle = {
      color: isForecastApplicable ? 'var(--text-primary)' : 'var(--text-tertiary)',
      cursor: isForecastApplicable ? 'pointer' : 'default',
      textDecoration: isForecastApplicable ? 'none' : 'line-through'
    };

    return React.createElement(PageTemplate, {
      title: 'Projects',
      subtitle: 'Manage and navigate your analytics projects.',
      breadcrumbs: [{ label: 'InsightIQ AI' }, { label: 'Projects' }],
      toolbarActions: React.createElement(React.Fragment, null,
        React.createElement(Button, { variant: 'secondary', icon: RefreshCwIcon }, 'Refresh'),
        React.createElement(Button, { variant: 'primary', icon: PlusIcon }, 'New Project')
      )
    },
      React.createElement('div', { style: { padding: 24, background: 'var(--bg-surface)', borderRadius: 16 } },
        React.createElement('h2', { style: { color: 'var(--text-primary)', marginBottom: 16 } }, 'Your Projects'),
        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 } },
          ...projectCards
        ),
        /* Project Workspace with conditional Geo/Forecast modules */
        React.createElement('div', { style: { marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border-subtle)' } },
          React.createElement('h3', { style: { color: 'var(--text-primary)', marginBottom: 16 } }, 'Project Workspace'),
          React.createElement('div', { style: { display: 'flex', gap: 8, background: 'var(--bg-surface-elevated)', borderRadius: 12, overflow: 'hidden' } },
            React.createElement('div', { style: { flex: 1, padding: 12, borderRight: '1px solid var(--border-subtle)' }, ...geoModuleStyle },
              'Geo'
            ),
            React.createElement('div', { style: { flex: 1, padding: 12, borderRight: '1px solid var(--border-subtle)' }, ...forecastModuleStyle },
              'Forecast'
            ),
            React.createElement('div', { style: { flex: 1, padding: 12 } },
              'Reports'
            )
          )
        )
      )
    );
  };

  /* AI Copilot Section */
  const AICopilotSection = () => React.createElement(PageTemplate, {
    title: 'AI Copilot',
    subtitle: 'Conversational business intelligence assistant.',
    breadcrumbs: [{ label: 'InsightIQ AI' }, { label: 'AI Copilot' }],
    toolbarActions: React.createElement(React.Fragment, null,
      React.createElement(Button, { variant: 'secondary', icon: RefreshCwIcon }, 'Refresh')
    )
  },
    React.createElement('div', { style: { padding: 24, background: 'var(--bg-surface)' } },
      React.createElement('div', { style: { textAlign: 'center', padding: 48 } },
        React.createElement('div', { style: { width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-secondary-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16' } },
          React.createElement('svg', { width: 32, height: 32, viewBox: '0 0 24 24', fill: 'none', stroke: 'white' },
            React.createElement('circle', { cx: 12, cy: 12, r: 10 }),
            React.createElement('path', { fill: 'none', stroke: 'white', 'stroke-width': '2', d: 'M12 6v6l4 4' })
          )
        ),
        React.createElement('h3', { style: { color: 'var(--text-primary)', marginBottom: 8 } }, 'AI Copilot'),
        React.createElement('p', { style: { color: 'var(--text-secondary)', marginBottom: 24 } }, 'Ask questions about your data and get AI-powered insights and recommendations.')
      )
    )
  );

  /* Profile/Settings Section */
  const ProfileSection = () => React.createElement(PageTemplate, {
    title: 'Profile & Settings',
    subtitle: 'Manage your account and workspace settings.',
    breadcrumbs: [{ label: 'InsightIQ AI' }, { label: 'Profile' }],
    toolbarActions: React.createElement(React.Fragment, null,
      React.createElement(Button, { variant: 'secondary', icon: RefreshCwIcon }, 'Refresh')
    )
  },
    React.createElement('div', { style: { padding: 24, background: 'var(--bg-surface)' } },
      React.createElement('div', { style: { textAlign: 'center', padding: 48 } },
        React.createElement('div', { style: { width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-secondary-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16' } },
          React.createElement('svg', { width: 32, height: 32, viewBox: '0 0 24 24', fill: 'none', stroke: 'white' },
            React.createElement('circle', { cx: 12, cy: 12, r: 10 }),
            React.createElement('path', { fill: 'none', stroke: 'white', 'stroke-width': '2', d: 'M12 6v6l4 4' })
          )
        ),
        React.createElement('h3', { style: { color: 'var(--text-primary)', marginBottom: 8 } }, 'Alex Rivera'),
        React.createElement('p', { style: { color: 'var(--text-secondary)', marginBottom: 24 } }, 'alex.rivera@insightiq.ai')
      ),
      /* Settings cards */
      React.createElement(ContentGrid, { style: { marginTop: 24, gridTemplateRows: 'auto auto' } },
        React.createElement('div', { style: { background: 'var(--bg-surface-elevated)', borderRadius: 12, padding: 24, marginBottom: 16 } },
          React.createElement('h4', { style: { color: 'var(--text-primary)', marginBottom: 12 } }, 'Dark Mode'),
          React.createElement('p', { style: { color: 'var(--text-secondary)', marginBottom: 8 } }, 'Current: Dark'),
          React.createElement(Button, { variant: 'link', style: { width: '100%', textAlign: 'left' } }, 'Toggle Light Mode')
        ),
        React.createElement('div', { style: { background: 'var(--bg-surface-elevated)', borderRadius: 12, padding: 24 } },
          React.createElement('h4', { style: { color: 'var(--text-primary)', marginBottom: 12 } }, 'Workspace Settings'),
          React.createElement('p', { style: { color: 'var(--text-secondary)', marginBottom: 8 } }, 'Manage connected datasets and projects.')
        )
      )
    )
  );

  /* --- Render based on global navigation --- */

  return (
    React.createElement(ThemeProvider, null,
      React.createElement(AppLayout, { globalNav, onSelectNav: setGlobalNav, projectId, onSelectProject: setProjectId },
        /* Section: Dashboard */
        globalNav === 'dashboard' && DashboardSection(),

        /* Section: Projects */
        globalNav === 'projects' && ProjectsSection(),

        /* Section: AI Copilot */
        globalNav === 'ai_copilot' && AICopilotSection(),

        /* Section: Profile/Settings */
        globalNav === 'profile' && ProfileSection()
      )
    )
  );
}