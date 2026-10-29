import React, { useEffect, useState } from 'https://esm.sh/react@18.2.0';
import { SparklesIcon } from '../../../assets/icons/icons.js';

export const SplashScreen = ({ onComplete }) => {
  const [initIndex, setInitIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps = [
    { text: 'Initializing AI Workspace...', progress: 20 },
    { text: 'Loading Intelligence Engine...', progress: 40 },
    { text: 'Preparing Analytics Environment...', progress: 60 },
    { text: 'Connecting Secure Workspace...', progress: 80 },
    { text: 'Synchronizing User Preferences...', progress: 95 },
    { text: 'Ready', progress: 100 }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setInitIndex(prev => {
        if (prev < steps.length - 1) {
          const next = prev + 1;
          setProgress(steps[next].progress);
          return next;
        } else {
          clearInterval(interval);
          setTimeout(onComplete, 500);
          return prev;
        }
      });
    }, 450);

    setProgress(steps[0].progress);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    React.createElement('div', {
      className: 'animate-fade-in',
      style: { display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', zIndex: 10 }
    },
      /* Logo gently scaling and glowing */
      React.createElement('div', { className: 'boot-logo-wrapper' },
        React.createElement(SparklesIcon, { size: 36 })
      ),

      React.createElement('div', { className: 'boot-subtitle' }, 'Enterprise Intelligence Platform'),
      React.createElement('h1', { className: 'boot-title' }, 'InsightIQ AI'),
      React.createElement('p', { className: 'boot-tagline' }, 'Transforming Data into Intelligent Decisions'),

      /* Progress Bar & Log Steps */
      React.createElement('div', { className: 'boot-init-card animate-fade-in' },
        React.createElement('div', { className: 'boot-log-text' },
          React.createElement('span', null, steps[initIndex].text),
          React.createElement('span', { style: { fontWeight: 600, color: 'var(--color-primary-500)' } }, `${progress}%`)
        ),
        React.createElement('div', { className: 'boot-progress-track' },
          React.createElement('div', {
            className: 'boot-progress-fill',
            style: { width: `${progress}%` }
          })
        )
      )
    )
  );
};
