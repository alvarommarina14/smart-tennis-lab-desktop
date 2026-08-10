import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { ApiError } from '@/api/client';
import { createPlayer, fetchPlayers, playerName, type DominantHand } from '@/api/players';
import { EmptyState, Row, ScreenHeader } from '@/components/List';
import { Button, Card, ErrorBox, Field } from '@/components/ui';
import { formatDate } from '@/lib/format';

export function PlayersScreen() {
  const [creating, setCreating] = useState(false);

  const { data, isPending, error } = useQuery({
    queryKey: ['players'],
    queryFn: () => fetchPlayers(),
  });

  return (
    <>
      <ScreenHeader
        title="Alumnos"
        actions={
          <Button onClick={() => setCreating((open) => !open)}>
            {creating ? 'Cancelar' : 'Nuevo alumno'}
          </Button>
        }
      />

      {creating ? <NewPlayerForm onDone={() => setCreating(false)} /> : null}

      {error ? <ErrorBox title="No se pudo traer la lista" message={error.message} /> : null}
      {isPending ? <p>Cargando…</p> : null}

      {data?.length === 0 ? (
        <EmptyState
          title="Todavía no hay alumnos"
          hint="Cargá al primero para poder analizar un partido."
        />
      ) : null}

      <div className="stl-stack">
        {data?.map((player) => (
          <Row
            key={player.id}
            title={playerName(player)}
            subtitle={player.birthDate ? `Nacimiento ${formatDate(player.birthDate)}` : undefined}
            badge={player.dominantHand === 'LEFT' ? 'Zurdo' : undefined}
          />
        ))}
      </div>
    </>
  );
}

function NewPlayerForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [dominantHand, setDominantHand] = useState<DominantHand | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: () =>
      createPlayer({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate: birthDate.trim() || null,
        dominantHand: dominantHand === '' ? null : dominantHand,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['players'] });
      onDone();
    },
    onError: (caught) => {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setFields(caught.fields ?? {});
      } else {
        setError('No se pudo guardar el alumno');
      }
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFields({});
    mutation.mutate();
  }

  return (
    <form onSubmit={submit} style={{ marginBottom: 'var(--space-xl)' }}>
      <Card>
        {error ? <ErrorBox title={error} /> : null}
        <Field
          label="Nombre"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          error={fields.firstName}
        />
        <Field
          label="Apellido"
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          error={fields.lastName}
        />
        <Field
          label="Fecha de nacimiento (opcional)"
          type="date"
          value={birthDate}
          onChange={(event) => setBirthDate(event.target.value)}
          error={fields.birthDate}
        />
        <label className="stl-field">
          <span className="stl-field__label">Mano hábil (opcional)</span>
          <select
            className="stl-input"
            value={dominantHand}
            onChange={(event) => setDominantHand(event.target.value as DominantHand | '')}
          >
            <option value="">Sin definir</option>
            <option value="RIGHT">Diestro</option>
            <option value="LEFT">Zurdo</option>
          </select>
        </label>
        <Button type="submit" loading={mutation.isPending} disabled={!firstName || !lastName}>
          Guardar alumno
        </Button>
      </Card>
    </form>
  );
}
