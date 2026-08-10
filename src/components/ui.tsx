import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

import './ui.css';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
};

export function Button({ variant = 'primary', loading, children, ...rest }: ButtonProps) {
  return (
    <button className={`stl-button stl-button--${variant}`} disabled={loading || rest.disabled} {...rest}>
      {loading ? '…' : children}
    </button>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Field({ label, error, ...rest }: FieldProps) {
  return (
    <label className="stl-field">
      <span className="stl-field__label">{label}</span>
      <input className={`stl-input${error ? ' stl-input--error' : ''}`} {...rest} />
      {error ? <span className="stl-field__error">{error}</span> : null}
    </label>
  );
}

export function ErrorBox({ title, message }: { title: string; message?: string }) {
  return (
    <div className="stl-error">
      <strong>{title}</strong>
      {message ? <span>{message}</span> : null}
    </div>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <div className="stl-card">{children}</div>;
}
