import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { fetchMatches, type MatchStatus, type MatchSummary } from '@/api/matches';
import { fetchPlayer, playerName, type DominantHand } from '@/api/players';
import { EmptyState, ScreenHeader } from '@/components/List';
import { SectionTitle, Table, Tag } from '@/components/Table';
import { Button, ErrorBox } from '@/components/ui';
import { formatDate, formatDateTime, statusLabel, surfaceLabel } from '@/lib/format';

const STATUS_TONE: Record<MatchStatus, 'live' | 'done' | 'neutral'> = {
  IN_PROGRESS: 'live',
  FINISHED: 'done',
  ABANDONED: 'neutral',
};

const HAND_LABELS: Record<DominantHand, string> = {
  RIGHT: 'Diestro',
  LEFT: 'Zurdo',
};

function byStartedAtDesc(a: MatchSummary, b: MatchSummary) {
  return b.startedAt.localeCompare(a.startedAt);
}

export function PlayerScreen() {
  const { id: playerId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const player = useQuery({
    queryKey: ['player', playerId],
    queryFn: () => fetchPlayer(playerId as string),
    enabled: Boolean(playerId),
  });

  const matches = useQuery({
    queryKey: ['matches', playerId],
    queryFn: () => fetchMatches(playerId),
    enabled: Boolean(playerId),
  });

  const sorted = useMemo(() => [...(matches.data ?? [])].sort(byStartedAtDesc), [matches.data]);

  if (!playerId || player.isPending) {
    return <p>Cargando…</p>;
  }

  if (player.error || !player.data) {
    return <ErrorBox title="No se pudo traer el alumno" message={player.error?.message} />;
  }

  const lede = [
    player.data.birthDate ? `Nacimiento ${formatDate(player.data.birthDate)}` : null,
    player.data.dominantHand ? HAND_LABELS[player.data.dominantHand] : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <ScreenHeader
        title={playerName(player.data)}
        lede={lede || undefined}
        actions={<Button onClick={() => navigate('/partidos/nuevo')}>Analizar un partido</Button>}
      />

      {player.data.notes ? (
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>{player.data.notes}</p>
      ) : null}

      {matches.error ? (
        <ErrorBox title="No se pudo traer los partidos" message={matches.error.message} />
      ) : null}
      {matches.isPending ? <p>Cargando…</p> : null}

      {matches.data?.length === 0 ? (
        <EmptyState
          title="Todavía no tiene partidos"
          hint="Analizá el primero para empezar a juntar datos de este alumno."
          action={{ label: 'Analizar un partido', onClick: () => navigate('/partidos/nuevo') }}
        />
      ) : null}

      {sorted.length > 0 ? (
        <section className="stl-section">
          <SectionTitle label="Partidos" count={sorted.length} />
          <Table head={['Rival', 'Torneo', 'Superficie', 'Fecha', 'Estado', '']}>
            {sorted.map((match) => (
              <tr
                key={match.id}
                className="stl-table__row--link"
                onClick={() => navigate(`/partidos/${match.id}`)}
              >
                <td className="stl-table__strong">{match.opponentName ?? '—'}</td>
                <td>{match.tournament ?? '—'}</td>
                <td>{surfaceLabel(match.surface) ?? '—'}</td>
                <td className="stl-table__mono">{formatDateTime(match.startedAt)}</td>
                <td>
                  <Tag tone={STATUS_TONE[match.status]}>{statusLabel(match.status)}</Tag>
                </td>
                <td className="stl-table__actions">
                  <Button
                    variant="secondary"
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/partidos/${match.id}/reporte`);
                    }}
                  >
                    Reporte
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
        </section>
      ) : null}
    </>
  );
}
