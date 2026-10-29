import React, { useState } from 'https://esm.sh/react@18.2.0';

export const RegisterForm = ({ onSwitchToLogin, onSubmitSuccess }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Data Analyst');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);
    /* Supabase Auth Ready Hook:
       await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, role } } });
    */
    setTimeout(() => {
      setIsLoading(false);
      if (onSubmitSuccess) onSubmitSuccess({ fullName, email, role });
    }, 600);
  };

  return (
    React.createElement('form', { className: 'auth-form-stack', onSubmit: handleSubmit },
      errorMsg && React.createElement('div', {
        style: { padding: '8px 12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-error-50)', color: 'var(--color-error-700)', fontSize: '0.8125rem' }
      }, errorMsg),

      /* Full Name Input */
      React.createElement('div', { className: 'input-wrapper' },
        React.createElement('label', { className: 'input-label' }, 'Full Name'),
        React.createElement('input', {
          type: 'text',
          required: true,
          placeholder: 'Alex Rivera',
          value: fullName,
          onChange: (e) => setFullName(e.target.value),
          className: 'input-field'
        })
      ),

      /* Email Address Input */
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

      /* Role Selection Dropdown (Optional) */
      React.createElement('div', { className: 'input-wrapper' },
        React.createElement('label', { className: 'input-label' }, 'Role (Optional)'),
        React.createElement('select', {
          value: role,
          onChange: (e) => setRole(e.target.value),
          className: 'input-field'
        },
          React.createElement('option', { value: 'Data Analyst' }, 'Data Analyst'),
          React.createElement('option', { value: 'Data Scientist' }, 'Data Scientist'),
          React.createElement('option', { value: 'Project Manager' }, 'Project Manager')
        )
      ),

      /* Password Input */
      React.createElement('div', { className: 'input-wrapper' },
        React.createElement('label', { className: 'input-label' }, 'Password'),
        React.createElement('div', { className: 'password-input-wrapper' },
          React.createElement('input', {
            type: showPassword ? 'text' : 'password',
            required: true,
            placeholder: '••••••••••••',
            value: password,
            onChange: (e) => setPassword(e.target.value),
            className: 'input-field',
            style: { paddingRight: 40 }
          }),
          React.createElement('button', {
            type: 'button',
            className: 'password-toggle-btn',
            onClick: () => setShowPassword(!showPassword)
          }, showPassword ? '🙈' : '👁️')
        )
      ),

      /* Confirm Password Input */
      React.createElement('div', { className: 'input-wrapper' },
        React.createElement('label', { className: 'input-label' }, 'Confirm Password'),
        React.createElement('input', {
          type: 'password',
          required: true,
          placeholder: '••••••••••••',
          value: confirmPassword,
          onChange: (e) => setConfirmPassword(e.target.value),
          className: 'input-field'
        })
      ),

      /* Create Account Button */
      React.createElement('button', {
        type: 'submit',
        className: 'btn btn-primary',
        disabled: isLoading,
        style: { width: '100%', padding: '12px 16px', justifyContent: 'center', marginTop: 4 }
      }, isLoading ? 'Creating Account...' : 'Create Account'),

      /* Bottom Footer Toggle */
      React.createElement('div', { className: 'auth-footer-prompt' },
        'Already have an account?',
        React.createElement('button', {
          type: 'button',
          className: 'auth-link-action',
          onClick: onSwitchToLogin
        }, 'Sign In')
      )
    )
  );
};
