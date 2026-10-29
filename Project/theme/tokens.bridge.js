/**
 * InsightIQ AI — Design Tokens UMD Runtime Bridge
 * Synchronizes verified tokens from theme/tokens.js onto window.InsightIQTokens
 * Enables browser runtime components in app.js to access design tokens directly.
 */
(function() {
  'use strict';

  var spacing = {
    '2xs': '2px',
    'xs': '4px',
    'sm': '8px',
    'md': '12px',
    'lg': '16px',
    'xl': '24px',
    '2xl': '32px',
    '3xl': '48px',
    '4xl': '64px'
  };

  var typography = {
    fontFamilySans: "'Inter', sans-serif",
    fontFamilyMono: "'JetBrains Mono', monospace",
    scales: {
      display: { size: '36px', lineHeight: '44px', weight: '700' },
      heading: { size: '28px', lineHeight: '36px', weight: '600' },
      title: { size: '20px', lineHeight: '28px', weight: '600' },
      subtitle: { size: '16px', lineHeight: '24px', weight: '500' },
      body: { size: '14px', lineHeight: '20px', weight: '400' },
      caption: { size: '12px', lineHeight: '16px', weight: '400' },
      button: { size: '14px', lineHeight: '20px', weight: '500' }
    }
  };

  var colors = {
    primary: '#0284C7',
    secondary: '#4F46E5',
    success: '#16A34A',
    warning: '#D97706',
    error: '#DC2626',
    neutral: {
      50: '#F8FAFC',
      100: '#F1F5F9',
      200: '#E2E8F0',
      500: '#64748B',
      800: '#1E293B',
      900: '#0F172A'
    }
  };

  var tokens = {
    spacing: spacing,
    typography: typography,
    colors: colors
  };

  if (typeof window !== 'undefined') {
    window.InsightIQTokens = tokens;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = tokens;
  }
})();
