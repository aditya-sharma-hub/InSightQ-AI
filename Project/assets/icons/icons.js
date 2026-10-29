import React from 'https://esm.sh/react@18.2.0';

export const createIcon = (svgPaths) => ({ size = 18, className = '', color = 'currentColor', ...props }) => (
  React.createElement('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className: `icon ${className}`,
    ...props
  }, svgPaths.map((d, i) => 
    typeof d === 'string' 
      ? React.createElement('path', { key: i, d })
      : React.createElement(d.tag, { key: i, ...d.attrs })
  ))
);

export const SearchIcon = createIcon(['M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z']);
export const BellIcon = createIcon(['M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 01-3.46 0']);
export const SunIcon = createIcon(['M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z']);
export const MoonIcon = createIcon(['M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z']);
export const MonitorIcon = createIcon(['M20 3H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V5a2 2 0 00-2-2z', 'M8 21h8', 'M12 17v4']);
export const ChevronRightIcon = createIcon(['M9 18l6-6-6-6']);
export const ChevronDownIcon = createIcon(['M6 9l6 6 6-6']);
export const ChevronLeftIcon = createIcon(['M15 18l-6-6 6-6']);
export const SidebarIcon = createIcon(['M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z', 'M9 4v16']);
export const PlusIcon = createIcon(['M12 5v14M5 12h14']);
export const FilterIcon = createIcon(['M22 3H2l8 9.46V19l4 2v-8.54L22 3z']);
export const ArrowUpDownIcon = createIcon(['M7 16V4m0 0L3 8m4-4l4 4m6 4v12m0 0l4-4m-4 4l-4-4']);
export const DownloadIcon = createIcon(['M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3']);
export const CheckIcon = createIcon(['M20 6L9 17l-5-5']);
export const XIcon = createIcon(['M18 6L6 18M6 6l12 12']);
export const AlertTriangleIcon = createIcon(['M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z', 'M12 9v4', 'M12 17h.01']);
export const CheckCircleIcon = createIcon(['M22 11.08V12a10 10 0 11-5.93-9.14', 'M22 4L12 14.01l-3-3']);
export const InfoIcon = createIcon(['M12 22a10 10 0 100-20 10 10 0 000 20z', 'M12 16v-4', 'M12 8h.01']);
export const TrashIcon = createIcon(['M3 6h18', 'M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2']);
export const SparklesIcon = createIcon(['M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z']);
export const DatabaseIcon = createIcon([
  { tag: 'ellipse', attrs: { cx: 12, cy: 5, rx: 9, ry: 3 } },
  'M21 12c0 1.66-4 3-9 3s-9-1.34-9-3',
  'M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5'
]);
export const BarChart2Icon = createIcon(['M18 20V10', 'M12 20V4', 'M6 20v-6']);
export const TrendingUpIcon = createIcon(['M23 6l-9.5 9.5-5-5L1 18', 'M17 6h6v6']);
export const LayersIcon = createIcon(['M12 2L2 7l10 5 10-5-10-5z', 'M2 17l10 5 10-5', 'M2 12l10 5 10-5']);
export const SettingsIcon = createIcon(['M12 15a3 3 0 100-6 3 3 0 000 6z', 'M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z']);
export const UserIcon = createIcon(['M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', 'M12 11a4 4 0 100-8 4 4 0 000 8z']);
export const FolderIcon = createIcon(['M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z']);
export const FileTextIcon = createIcon(['M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z', 'M14 2v6h6', 'M16 13H8', 'M16 17H8', 'M10 9H8']);
export const CalendarIcon = createIcon(['M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z', 'M16 2v4', 'M8 2v4', 'M3 10h18']);
export const RefreshCwIcon = createIcon(['M23 4v6h-6', 'M1 20v-6h6', 'M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15']);
export const HelpCircleIcon = createIcon(['M12 22a10 10 0 100-20 10 10 0 000 20z', 'M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3', 'M12 17h.01']);
