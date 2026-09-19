import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';

import { dmyToIso, isPastIso, isoToDmy, maskDate } from '@/lib/dateInput';

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

type DateFieldProps = {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  error?: string;
};

export function DateField({ label, value, onChange, error }: DateFieldProps) {
  const [text, setText] = useState(() => isoToDmy(value));
  const [localError, setLocalError] = useState<string | null>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const masked = maskDate(event.target.value);
    setText(masked);

    if (masked.length < 10) {
      setLocalError(null);
      onChange('');
      return;
    }

    const iso = dmyToIso(masked);
    if (!iso) {
      setLocalError('Fecha inválida');
      onChange('');
      return;
    }
    if (!isPastIso(iso)) {
      setLocalError('La fecha de nacimiento tiene que ser pasada');
      onChange('');
      return;
    }

    setLocalError(null);
    onChange(iso);
  }

  const shown = localError ?? error;

  return (
    <label className="stl-field">
      <span className="stl-field__label">{label}</span>
      <input
        className={`stl-input${shown ? ' stl-input--error' : ''}`}
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/aaaa"
        maxLength={10}
        value={text}
        onChange={handleChange}
      />
      {shown ? <span className="stl-field__error">{shown}</span> : null}
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

export function Modal({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.code === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="stl-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="stl-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
