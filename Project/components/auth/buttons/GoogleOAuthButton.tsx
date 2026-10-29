import React from 'https://esm.sh/react@18.2.0';

export const GoogleLogo = ({ size = 18 }) => (
  React.createElement('svg', { width: size, height: size, viewBox: '0 0 24 24', style: { flexShrink: 0 } },
    React.createElement('path', { fill: '#4285F4', d: 'M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z' }),
    React.createElement('path', { fill: '#34A853', d: 'M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.25 21.37 7.33 24 12 24z' }),
    React.createElement('path', { fill: '#FBBC05', d: 'M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.17 0 9.99 0 12s.46 3.83 1.26 5.42l4.02-3.15z' }),
    React.createElement('path', { fill: '#EA4335', d: 'M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.63 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z' })
  )
);

export const GoogleOAuthButton = ({ onClick, isLoading = false, isDisabled = false }) => (
  React.createElement('button', {
    type: 'button',
    onClick,
    disabled: isDisabled || isLoading,
    className: 'btn-oauth-google',
    'aria-label': 'Continue with Google Account'
  },
    React.createElement(GoogleLogo, { size: 18 }),
    isLoading ? 'Connecting Google...' : 'Continue with Google'
  )
);
