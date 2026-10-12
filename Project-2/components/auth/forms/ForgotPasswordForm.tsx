import React, { useState } from 'https://esm.sh/react@18.2.0';

export const ForgotPasswordForm = ({ onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    /* Supabase Auth Ready Hook:
       await supabase.auth.resetPasswordForEmail(email);
    */
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 600);
  };

  if (isSubmitted) {
    return (
      React.createElement('div', { style: { textAlign: 'center', padding: '12px 0' } },
        React.createElement('div', { style: { fontSize: '2rem', marginBottom: 12 } }, '✉️'),
        React.createElement('h3', { className: 'font-title', style: { marginBottom: 8 } }, 'Check your email'),
        React.createElement('p', { className: 'font-body', style: { color: 'var(--text-secondary)', marginBottom: 20 } },
          `We sent a password reset link to `,
          React.createElement('strong', null, email)
        ),
        React.createElement('button', {
          type: 'button',
          className: 'btn btn-secondary',
          onClick: onSwitchToLogin,
          style: { width: '100%' }
        }, '← Back to Sign In')
      )
    );
  }

  return (
    React.createElement('form', { className: 'auth-form-stack', onSubmit: handleSubmit },
      React.createElement('div', { className: 'input-wrapper' },
        React.createElement('label', { className: 'input-label' }, 'Email Address'),
        React.createElement('input', {
          type: 'email',
          required: true,
          placeholder: 'name@company.com',
          value: email,
          onChange: (e) => setEmail(e.target.value),
          className: 'input-field'
        })
      ),

      React.createElement('button', {
        type: 'submit',
        className: 'btn btn-primary',
        disabled: isLoading,
        style: { width: '100%', padding: '12px 16px', justifyContent: 'center' }
      }, isLoading ? 'Sending Link...' : 'Send Reset Link'),

      React.createElement('div', { className: 'auth-footer-prompt' },
        React.createElement('button', {
          type: 'button',
          className: 'auth-link-action',
          onClick: onSwitchToLogin
        }, '← Back to Sign In')
      )
    )
  );
};
