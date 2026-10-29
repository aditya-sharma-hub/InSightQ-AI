import React, { useState } from 'https://esm.sh/react@18.2.0';
import { AuthLayout, AuthHeader } from '../../components/auth/layout/AuthLayout.tsx';
import { GoogleOAuthButton } from '../../components/auth/buttons/GoogleOAuthButton.tsx';
import { MicrosoftOAuthButton } from '../../components/auth/buttons/MicrosoftOAuthButton.tsx';
import { LoginForm } from '../../components/auth/forms/LoginForm.tsx';
import { RegisterForm } from '../../components/auth/forms/RegisterForm.tsx';
import { ForgotPasswordForm } from '../../components/auth/forms/ForgotPasswordForm.tsx';
import { SplashScreen } from '../../components/auth/animations/SplashScreen.tsx';
import { SunIcon, MoonIcon, RefreshCwIcon } from '../../assets/icons/icons.js';
import { useTheme } from '../../theme/ThemeContext.js';

import { authService } from '../../src/services/auth/authService.js';

export const AuthPage = () => {
  const { mode, setMode } = useTheme();
  const [showSplash, setShowSplash] = useState(true);
  const [viewMode, setViewMode] = useState('login'); // 'login' | 'register' | 'forgot'
  const [oauthLoading, setOauthLoading] = useState(null); // 'google' | 'microsoft' | null
  const [feedback, setFeedback] = useState(null);

  const handleGoogleAuth = async () => {
    setOauthLoading('google');
    setFeedback(null);
    try {
      await authService.signInWithGoogle();
    } catch (err: any) {
      setOauthLoading(null);
      setFeedback(err.message || 'Failed to initiate Google authentication.');
    }
  };

  const handleMicrosoftAuth = async () => {
    setOauthLoading('microsoft');
    setFeedback(null);
    try {
      await authService.signInWithMicrosoft();
    } catch (err: any) {
      setOauthLoading(null);
      setFeedback(err.message || 'Failed to initiate Microsoft authentication.');
    }
  };

  const replaySplash = () => {
    setShowSplash(true);
    setFeedback(null);
  };

  return (
    React.createElement(AuthLayout, null,
      /* Toolbar Controls */
      React.createElement('div', { className: 'replay-boot-btn', style: { display: 'flex', gap: 8 } },
        React.createElement('button', {
          className: 'btn btn-ghost btn-sm',
          onClick: () => setMode(mode === 'dark' ? 'light' : 'dark'),
          title: 'Toggle Theme'
        }, mode === 'dark' ? React.createElement(MoonIcon, { size: 16 }) : React.createElement(SunIcon, { size: 16 })),

        React.createElement('button', {
          className: 'btn btn-secondary btn-sm',
          onClick: replaySplash,
          style: { gap: 6 }
        }, React.createElement(RefreshCwIcon, { size: 14 }), 'Replay Splash')
      ),

      /* 1. Splash Screen Mode */
      showSplash && React.createElement(SplashScreen, {
        onComplete: () => setShowSplash(false)
      }),

      /* 2. Authentication Card Mode */
      !showSplash && React.createElement('div', { className: 'auth-card-container animate-slide-up' },
        /* Header Block */
        React.createElement(AuthHeader, {
          title: viewMode === 'login' ? 'Welcome back' : viewMode === 'register' ? 'Create your account' : 'Reset password',
          subtitle: viewMode === 'login'
            ? 'Sign in to continue to your AI workspace.'
            : viewMode === 'register'
            ? 'Start your enterprise analytics journey.'
            : 'Enter your email address to receive a reset link.'
        }),

        /* Primary OAuth Options (Google & Microsoft) */
        viewMode !== 'forgot' && React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
          React.createElement(GoogleOAuthButton, {
            onClick: handleGoogleAuth,
            isLoading: oauthLoading === 'google'
          }),
          React.createElement(MicrosoftOAuthButton, {
            onClick: handleMicrosoftAuth,
            isLoading: oauthLoading === 'microsoft'
          })
        ),

        /* Divider OR */
        viewMode !== 'forgot' && React.createElement('div', { className: 'auth-divider-wrap' }, 'OR'),

        /* Feedback Banner */
        feedback && React.createElement('div', {
          className: 'animate-fade-in',
          style: {
            padding: '8px 12px', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem',
            backgroundColor: 'var(--color-primary-50)', color: 'var(--color-primary-700)',
            border: '1px solid var(--color-primary-100)', textAlign: 'center'
          }
        }, feedback),

        /* Form Body Switcher */
        viewMode === 'login' && React.createElement(LoginForm, {
          onSwitchToRegister: () => { setViewMode('register'); setFeedback(null); },
          onSwitchToForgot: () => { setViewMode('forgot'); setFeedback(null); },
          onSubmitSuccess: (data) => setFeedback(`Signed in as ${data.email}`)
        }),

        viewMode === 'register' && React.createElement(RegisterForm, {
          onSwitchToLogin: () => { setViewMode('login'); setFeedback(null); },
          onSubmitSuccess: (data) => setFeedback(`Account created for ${data.email} (${data.role})!`)
        }),

        viewMode === 'forgot' && React.createElement(ForgotPasswordForm, {
          onSwitchToLogin: () => { setViewMode('login'); setFeedback(null); }
        })
      )
    )
  );
};
