import { useState, type FormEvent } from 'react';

import { ApiError } from '@/api/client';
import { useAuthStore } from '@/auth/store';
import { Button, Card, ErrorBox, Field } from '@/components/ui';

import './LoginScreen.css';

export function LoginScreen() {
  const signIn = useAuthStore((state) => state.signIn);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});

    try {
      await signIn(email.trim(), password);
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

  return (
    <div className="login">
      <form className="login__form" onSubmit={submit}>
        <Card>
          <div>
            <h1 className="login__title">Smart Tennis Lab</h1>
            <p className="login__subtitle">Analizá los partidos grabados de tus alumnos</p>
          </div>

          {error ? <ErrorBox title={error} /> : null}

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
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={fields.password}
          />

          <Button type="submit" loading={busy} disabled={!email || !password}>
            Entrar
          </Button>

          <p className="login__hint">
            Se entra con la misma cuenta que en la app del celular.
          </p>
        </Card>
      </form>
    </div>
  );
}
