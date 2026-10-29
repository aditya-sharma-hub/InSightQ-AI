import React from 'https://esm.sh/react@18.2.0';

export const MicrosoftLogo = ({ size = 18 }) => (
  React.createElement('svg', { width: size, height: size, viewBox: '0 0 23 23', style: { flexShrink: 0 } },
    React.createElement('rect', { x: 0, y: 0, width: 11, height: 11, fill: '#F25022' }),
    React.createElement('rect', { x: 12, y: 0, width: 11, height: 11, fill: '#7FBA00' }),
    React.createElement('rect', { x: 0, y: 12, width: 11, height: 11, fill: '#00A4EF' }),
    React.createElement('rect', { x: 12, y: 12, width: 11, height: 11, fill: '#FFB900' })
  )
);

export const MicrosoftOAuthButton = ({ onClick, isLoading = false, isDisabled = false }) => (
  React.createElement('button', {
    type: 'button',
    onClick,
    disabled: isDisabled || isLoading,
    className: 'btn-oauth-microsoft',
    'aria-label': 'Continue with Microsoft Account'
  },
    React.createElement(MicrosoftLogo, { size: 18 }),
    isLoading ? 'Connecting Microsoft...' : 'Continue with Microsoft'
  )
);
