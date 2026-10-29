import React, { useState } from 'https://esm.sh/react@18.2.0';

export const LoginForm = ({ onSwitchToRegister, onSwitchToForgot, onSubmitSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    /* Supabase Auth Ready Hook:
       await supabase.auth.signInWithPassword({ email, password });
    */
    setTimeout(() => {
      setIsLoading(false);
      if (onSubmitSuccess) onSubmitSuccess({ email, rememberMe });
    }, 600);
  };

  return (
    React.createElement('form', { className: 'auth-form-stack', onSubmit: handleSubmit },
      /* Email Address Input */
      React.createElement('div', { className: 'input-wrapper' },
        React.createElement('label', { className: 'input-label' }, 'Email Address'),
        React.createElement('input', {
          type: 'email',
          required: true,
          placeholder: 'name@company.com',
          value: email,
          onChange: (e) => setEmail(e.target.value),
          className: 'input-field',
          autoComplete: 'email'
        })
      ),

      /* Password Input with Show / Hide Toggle */
      React.createElement('div', { className: 'input-wrapper' },
        React.createElement('div', { className: 'auth-label-row' },
          React.createElement('label', { className: 'input-label' }, 'Password'),
          React.createElement('button', {
            type: 'button',
            className: 'auth-forgot-link',
            onClick: onSwitchToForgot
          }, 'Forgot Password?')
        ),
        React.createElement('div', { className: 'password-input-wrapper' },
          React.createElement('input', {
            type: showPassword ? 'text' : 'password',
            required: true,
            placeholder: '••••••••••••',
            value: password,
            onChange: (e) => setPassword(e.target.value),
            className: 'input-field',
            style: { paddingRight: 40 },
            autoComplete: 'current-password'
          }),
          React.createElement('button', {
            type: 'button',
            className: 'password-toggle-btn',
            onClick: () => setShowPassword(!showPassword),
            'aria-label': showPassword ? 'Hide password' : 'Show password',
            title: showPassword ? 'Hide password' : 'Show password'
          },
            showPassword ? '🙈' : '👁️'
          )
        )
      ),

      /* Remember Me Checkbox */
      React.createElement('div', { className: 'auth-remember-row' },
        React.createElement('label', { style: { display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.875rem' } },
          React.createElement('input', {
            type: 'checkbox',
            checked: rememberMe,
            onChange: (e) => setRememberMe(e.target.checked),
            style: { accentColor: 'var(--color-primary-500)', width: 16, height: 16 }
          }),
          React.createElement('span', { style: { color: 'var(--text-secondary)' } }, 'Remember Me')
        )
      ),

      /* Primary Sign In Action Button */
      React.createElement('button', {
        type: 'submit',
        className: 'btn btn-primary',
        disabled: isLoading,
        style: { width: '100%', padding: '12px 16px', justifyContent: 'center', marginTop: 4 }
      }, isLoading ? 'Signing in...' : 'Sign In'),

      /* Bottom Footer Toggle */
      React.createElement('div', { className: 'auth-footer-prompt' },
        "Don't have an account?",
        React.createElement('button', {
          type: 'button',
          className: 'auth-link-action',
          onClick: onSwitchToRegister
        }, 'Create Account')
      )
    )
  );
};
