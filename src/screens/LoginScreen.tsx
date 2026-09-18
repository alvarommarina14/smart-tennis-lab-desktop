import { useState, type FormEvent } from 'react';

import { ApiError } from '@/api/client';
import { useAuthStore } from '@/auth/store';
import { Button, Card, ErrorBox, Field } from '@/components/ui';

import './LoginScreen.css';

type Mode = 'signIn' | 'signUp';

export function LoginScreen() {
  const signIn = useAuthStore((state) => state.signIn);
  const signUp = useAuthStore((state) => state.signUp);

  const [mode, setMode] = useState<Mode>('signIn');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const isSignUp = mode === 'signUp';

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setFields({});
    setPassword('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});

    try {
      if (isSignUp) {
        await signUp(email.trim(), password, fullName.trim());
      } else {
        await signIn(email.trim(), password);
      }
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setFields(caught.fields ?? {});
      } else {
        setError('No se pudo conectar con el backend');
      }
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = email && password && (!isSignUp || fullName.trim());

  return (
    <div className="login">
      <form className="login__form" onSubmit={submit}>
        <Card>
          <div>
            <h1 className="login__title">Smart Tennis Lab</h1>
            <p className="login__subtitle">
              {isSignUp
                ? 'Creá tu cuenta para empezar a analizar partidos'
                : 'Analizá los partidos grabados de tus alumnos'}
            </p>
          </div>

          {error ? <ErrorBox title={error} /> : null}

          {isSignUp ? (
            <Field
              label="Nombre y apellido"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              error={fields.fullName}
            />
          ) : null}

          <Field
            label="Email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={fields.email}
          />
          <Field
            label="Contraseña"
            type="password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fields.password}
          />

          <Button type="submit" loading={busy} disabled={!canSubmit}>
            {isSignUp ? 'Crear cuenta' : 'Entrar'}
          </Button>

          <p className="login__hint">
            {isSignUp ? (
              <>
                ¿Ya tenés cuenta?{' '}
                <button
                  type="button"
                  className="login__switch"
                  onClick={() => switchMode('signIn')}
                >
                  Entrar
                </button>
              </>
            ) : (
              <>
                Es la misma cuenta que en la app del celular.{' '}
                <button
                  type="button"
                  className="login__switch"
                  onClick={() => switchMode('signUp')}
                >
                  Crear una cuenta
                </button>
              </>
            )}
          </p>
        </Card>
      </form>
    </div>
  );
}
