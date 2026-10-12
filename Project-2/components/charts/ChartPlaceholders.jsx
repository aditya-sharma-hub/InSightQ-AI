import React from 'https://esm.sh/react@18.2.0';
import { ChartContainer } from './ChartContainer.jsx';

export const BarChartPlaceholder = () => (
  React.createElement(ChartContainer, { title: 'Bar Chart Placeholder', subtitle: 'Quarterly Revenue Distribution (USD Millions)' },
    React.createElement('svg', { width: '100%', height: '100%', viewBox: '0 0 500 200', preserveAspectRatio: 'none' },
      /* Gridlines */
      [40, 80, 120, 160].map((y, i) => React.createElement('line', { key: i, x1: 40, y1: y, x2: 480, y2: y, stroke: 'var(--border-subtle)', strokeDasharray: '4 4' })),
      /* Bars */
      [
        { x: 70, h: 110 }, { x: 130, h: 140 }, { x: 190, h: 90 }, { x: 250, h: 160 },
        { x: 310, h: 130 }, { x: 370, h: 175 }, { x: 430, h: 150 }
      ].map((b, i) => React.createElement('g', { key: i },
        React.createElement('rect', {
          x: b.x, y: 180 - b.h, width: 36, height: b.h, rx: 4,
          fill: i % 2 === 0 ? 'var(--color-primary-500)' : 'var(--color-secondary-500)', opacity: 0.9
        })
      )),
      /* X Axis Line */
      React.createElement('line', { x1: 40, y1: 180, x2: 480, y2: 180, stroke: 'var(--border-strong)', strokeWidth: 1.5 })
    )
  )
);

export const LineChartPlaceholder = () => (
  React.createElement(ChartContainer, { title: 'Line Chart Placeholder', subtitle: 'Model Convergence & Validation Loss Drift' },
    React.createElement('svg', { width: '100%', height: '100%', viewBox: '0 0 500 200', preserveAspectRatio: 'none' },
      [40, 80, 120, 160].map((y, i) => React.createElement('line', { key: i, x1: 40, y1: y, x2: 480, y2: y, stroke: 'var(--border-subtle)', strokeDasharray: '4 4' })),
      React.createElement('path', {
        d: 'M 50 150 Q 120 40 200 90 T 350 70 T 470 30',
        fill: 'none', stroke: 'var(--color-primary-500)', strokeWidth: 3, strokeLinecap: 'round'
      }),
      React.createElement('path', {
        d: 'M 50 170 Q 140 100 220 130 T 360 110 T 470 70',
        fill: 'none', stroke: 'var(--color-secondary-500)', strokeWidth: 2, strokeDasharray: '4 4'
      })
    )
  )
);

export const AreaChartPlaceholder = () => (
  React.createElement(ChartContainer, { title: 'Area Chart Placeholder', subtitle: 'Active Data Ingestion Throughput' },
    React.createElement('svg', { width: '100%', height: '100%', viewBox: '0 0 500 200', preserveAspectRatio: 'none' },
      React.createElement('defs', null,
        React.createElement('linearGradient', { id: 'areaGrad', x1: 0, y1: 0, x2: 0, y2: 1 },
          React.createElement('stop', { offset: '0%', stopColor: 'var(--color-primary-500)', stopOpacity: 0.4 }),
          React.createElement('stop', { offset: '100%', stopColor: 'var(--color-primary-500)', stopOpacity: 0.0 })
        )
      ),
      React.createElement('path', {
        d: 'M 50 160 Q 120 60 220 100 T 370 50 T 470 30 L 470 180 L 50 180 Z',
        fill: 'url(#areaGrad)'
      }),
      React.createElement('path', {
        d: 'M 50 160 Q 120 60 220 100 T 370 50 T 470 30',
        fill: 'none', stroke: 'var(--color-primary-500)', strokeWidth: 2.5
      })
    )
  )
);

export const PieChartPlaceholder = () => (
  React.createElement(ChartContainer, { title: 'Pie / Donut Chart Placeholder', subtitle: 'Compute Infrastructure Utilization' },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 32 } },
      React.createElement('svg', { width: 160, height: 160, viewBox: '0 0 40 40' },
        React.createElement('circle', { cx: 20, cy: 20, r: 15.915, fill: 'transparent', stroke: 'var(--color-primary-500)', strokeWidth: 5, strokeDasharray: '60 40', strokeDashoffset: 25 }),
        React.createElement('circle', { cx: 20, cy: 20, r: 15.915, fill: 'transparent', stroke: 'var(--color-secondary-500)', strokeWidth: 5, strokeDasharray: '25 75', strokeDashoffset: 65 }),
        React.createElement('circle', { cx: 20, cy: 20, r: 15.915, fill: 'transparent', stroke: 'var(--color-warning-500)', strokeWidth: 5, strokeDasharray: '15 85', strokeDashoffset: 40 })
      ),
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
        [
          { label: 'GPU Cluster (60%)', color: 'var(--color-primary-500)' },
          { label: 'CPU Worker Nodes (25%)', color: 'var(--color-secondary-500)' },
          { label: 'Memory Buffers (15%)', color: 'var(--color-warning-500)' }
        ].map((item, i) => React.createElement('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem' } },
          React.createElement('span', { style: { width: 10, height: 10, borderRadius: 2, backgroundColor: item.color } }),
          React.createElement('span', { style: { color: 'var(--text-secondary)' } }, item.label)
        ))
      )
    )
  )
);

export const HeatmapPlaceholder = () => (
  React.createElement(ChartContainer, { title: 'Heatmap Placeholder', subtitle: 'Hourly Feature Correlation Intensity' },
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4, height: '100%', padding: 8 } },
      Array.from({ length: 32 }).map((_, i) => {
        const opacity = (i * 7 % 100) / 100;
        return React.createElement('div', {
          key: i,
          style: {
            borderRadius: 4,
            backgroundColor: 'var(--color-primary-500)',
            opacity: Math.max(0.15, opacity)
          }
        });
      })
    )
  )
);

export const ScatterPlotPlaceholder = () => (
  React.createElement(ChartContainer, { title: 'Scatter Plot Placeholder', subtitle: 'Cluster Outlier Detection (2D Embeddings)' },
    React.createElement('svg', { width: '100%', height: '100%', viewBox: '0 0 500 200' },
      [
        { x: 80, y: 140 }, { x: 100, y: 120 }, { x: 120, y: 150 }, { x: 200, y: 80 },
        { x: 220, y: 60 }, { x: 240, y: 90 }, { x: 340, y: 130 }, { x: 360, y: 110 },
        { x: 420, y: 40 }, { x: 440, y: 50 }
      ].map((pt, i) => React.createElement('circle', {
        key: i, cx: pt.x, cy: pt.y, r: 6,
        fill: i > 7 ? 'var(--color-error-500)' : 'var(--color-primary-500)', opacity: 0.8
      }))
    )
  )
);

export const TreemapPlaceholder = () => (
  React.createElement(ChartContainer, { title: 'Treemap Placeholder', subtitle: 'Storage Allocation Hierarchical Map' },
    React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 4, height: '100%' } },
      React.createElement('div', { style: { backgroundColor: 'var(--color-primary-500)', opacity: 0.8, borderRadius: 4, padding: 12, color: '#fff', fontSize: '0.75rem', fontWeight: 600 } }, 'PostgreSQL DB (65%)'),
      React.createElement('div', { style: { display: 'grid', gridTemplateRows: '1fr 1fr', gap: 4 } },
        React.createElement('div', { style: { backgroundColor: 'var(--color-secondary-500)', opacity: 0.8, borderRadius: 4, padding: 8, color: '#fff', fontSize: '0.75rem' } }, 'S3 Parquet (20%)'),
        React.createElement('div', { style: { backgroundColor: 'var(--color-warning-500)', opacity: 0.8, borderRadius: 4, padding: 8, color: '#fff', fontSize: '0.75rem' } }, 'Redis Cache (15%)')
      )
    )
  )
);

export const RadarChartPlaceholder = () => (
  React.createElement(ChartContainer, { title: 'Radar Chart Placeholder', subtitle: 'Multi-Dimensional AI Model Benchmark' },
    React.createElement('svg', { width: '100%', height: '100%', viewBox: '0 0 200 160' },
      React.createElement('polygon', { points: '100,20 160,60 140,130 60,130 40,60', fill: 'none', stroke: 'var(--border-strong)', strokeWidth: 1 }),
      React.createElement('polygon', { points: '100,40 145,70 130,115 70,115 55,70', fill: 'none', stroke: 'var(--border-subtle)', strokeWidth: 1 }),
      React.createElement('polygon', { points: '100,30 150,65 125,120 75,110 50,65', fill: 'var(--color-primary-500)', fillOpacity: 0.3, stroke: 'var(--color-primary-500)', strokeWidth: 2 })
    )
  )
);

export const ForecastChartPlaceholder = () => (
  React.createElement(ChartContainer, { title: 'Forecast & Confidence Bounds Chart', subtitle: 'Predictive 90-Day Trend Analysis', badge: 'AI Model' },
    React.createElement('svg', { width: '100%', height: '100%', viewBox: '0 0 500 200', preserveAspectRatio: 'none' },
      /* Confidence Band Polygon */
      React.createElement('polygon', {
        points: '250,110 330,60 470,20 470,140 330,160 250,110',
        fill: 'var(--color-primary-500)', fillOpacity: 0.15
      }),
      /* Historical Line */
      React.createElement('path', { d: 'M 40 160 L 120 140 L 190 120 L 250 110', fill: 'none', stroke: 'var(--text-primary)', strokeWidth: 2.5 }),
      /* Predicted Forecast Line */
      React.createElement('path', { d: 'M 250 110 L 330 90 L 470 60', fill: 'none', stroke: 'var(--color-primary-500)', strokeWidth: 2.5, strokeDasharray: '5 5' })
    )
  )
);
