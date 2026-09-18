import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import { ApiError } from '@/api/client';
import { createMatch, type MatchFormat, type Surface } from '@/api/matches';
import { fetchPlayers, playerName, sortByName } from '@/api/players';
import { EmptyState, ScreenHeader } from '@/components/List';
import { Button, Card, ErrorBox, Field } from '@/components/ui';
import { SURFACE_OPTIONS } from '@/lib/format';
import { pickVideoFile } from '@/lib/pickVideo';
import { rememberVideo } from '@/lib/videoLibrary';

const FORMAT_LABELS: Record<MatchFormat, string> = {
  BEST_OF_3_SETS: 'A 3 sets',
  TWO_SETS_SUPER_TIEBREAK: '2 sets y super tiebreak',
};

export function NewMatchScreen() {
  const navigate = useNavigate();

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState('');
  const [tournament, setTournament] = useState('');
  const [surface, setSurface] = useState<Surface | ''>('');
  const [format, setFormat] = useState<MatchFormat>('BEST_OF_3_SETS');
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const players = useQuery({ queryKey: ['players'], queryFn: () => fetchPlayers() });
  const sortedPlayers = useMemo(() => sortByName(players.data ?? []), [players.data]);

  const mutation = useMutation({
    mutationFn: async () => {
      const id = crypto.randomUUID();
      await createMatch({
        id,
        playerId: playerId as string,
        opponentName: opponentName.trim() || null,
        tournament: tournament.trim() || null,
        surface: surface === '' ? null : surface,
        format,
        startedAt: new Date().toISOString(),
      });
      if (videoPath) {
        rememberVideo(id, videoPath);
      }
      return id;
    },
    onSuccess: (id) => navigate(`/partidos/${id}`),
    onError: (caught) => {
      setError(caught instanceof ApiError ? caught.message : 'No se pudo crear el partido');
    },
  });

  async function pickVideo() {
    const picked = await pickVideoFile();
    if (picked) {
      setVideoPath(picked);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    mutation.mutate();
  }

  return (
    <form onSubmit={submit}>
      <ScreenHeader
        title="Analizar un partido"
        lede="Un partido siempre es de un alumno. El video se elige al final y se queda en esta máquina."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
        {error ? <ErrorBox title={error} /> : null}

        <Card>
          <strong>Alumno</strong>
          {players.data?.length === 0 ? (
            <EmptyState
              title="No tenés alumnos cargados"
              hint="Un partido siempre es de un alumno: cargá al primero para poder empezar."
              action={{
                label: 'Cargar un alumno',
                onClick: () => navigate('/alumnos', { state: { openCreate: true } }),
              }}
            />
          ) : (
            <label className="stl-field">
              <span className="stl-field__label">Elegí al alumno</span>
              <select
                className="stl-input"
                value={playerId ?? ''}
                onChange={(event) => setPlayerId(event.target.value || null)}
              >
                <option value="">Sin elegir</option>
                {sortedPlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {playerName(player)}
                  </option>
                ))}
              </select>
            </label>
          )}
        </Card>

        <Card>
          <strong>El partido</strong>
          <Field
            label="Rival (opcional)"
            value={opponentName}
            onChange={(event) => setOpponentName(event.target.value)}
          />
          <Field
            label="Torneo (opcional)"
            value={tournament}
            onChange={(event) => setTournament(event.target.value)}
          />
          <label className="stl-field">
            <span className="stl-field__label">Superficie (opcional)</span>
            <select
              className="stl-input"
              value={surface}
              onChange={(event) => setSurface(event.target.value as Surface | '')}
            >
              <option value="">Sin definir</option>
              {SURFACE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="stl-field">
            <span className="stl-field__label">Formato</span>
            <select
              className="stl-input"
              value={format}
              onChange={(event) => setFormat(event.target.value as MatchFormat)}
            >
              {Object.entries(FORMAT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </Card>

        <Card>
          <strong>El video</strong>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
            El archivo se queda en tu máquina. Lo único que se guarda en el servidor es en qué
            momento del video pasó cada cosa.
          </p>
          <Button type="button" variant="secondary" onClick={pickVideo}>
            {videoPath ? 'Cambiar el video' : 'Elegir el video del partido'}
          </Button>
          {videoPath ? (
            <span style={{ color: 'var(--text-muted)', fontSize: 13, wordBreak: 'break-all' }}>
              {videoPath}
            </span>
          ) : null}
        </Card>

        <Button type="submit" loading={mutation.isPending} disabled={!playerId}>
          Crear el partido
        </Button>
      </div>
    </form>
  );
}
