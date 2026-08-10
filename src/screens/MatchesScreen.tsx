import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { fetchMatches } from '@/api/matches';
import { EmptyState, Row, ScreenHeader } from '@/components/List';
import { Button, ErrorBox } from '@/components/ui';
import { formatDateTime, statusLabel } from '@/lib/format';

export function MatchesScreen() {
  const navigate = useNavigate();

  const { data, isPending, error } = useQuery({
    queryKey: ['matches'],
    queryFn: () => fetchMatches(),
  });

  return (
    <>
      <ScreenHeader
        title="Partidos"
        actions={<Button onClick={() => navigate('/partidos/nuevo')}>Analizar un partido</Button>}
      />

      {error ? <ErrorBox title="No se pudo traer la lista" message={error.message} /> : null}
      {isPending ? <p>Cargando…</p> : null}

      {data?.length === 0 ? (
        <EmptyState
          title="Todavía no hay partidos"
          hint="Creá uno y enganchale el video de la cancha para empezar a analizarlo."
        />
      ) : null}

      <div className="stl-stack">
        {data?.map((match) => (
          <Row
            key={match.id}
            title={match.playerName ?? 'Alumno sin nombre'}
            subtitle={`${match.opponentName ? `vs ${match.opponentName} · ` : ''}${formatDateTime(match.startedAt)}`}
            badge={statusLabel(match.status)}
            onClick={() => navigate(`/partidos/${match.id}`)}
          />
        ))}
      </div>
    </>
  );
}
