import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { fetchMatches, type MatchStatus, type MatchSummary } from '@/api/matches';
import { EmptyState, ScreenHeader } from '@/components/List';
import { SectionTitle, Table, Tag } from '@/components/Table';
import { Button, ErrorBox } from '@/components/ui';
import { listPendingDrafts } from '@/lib/analysisDraft';
import { formatDateTime, statusLabel } from '@/lib/format';

const STATUS_TONE: Record<MatchStatus, 'live' | 'done' | 'neutral'> = {
  IN_PROGRESS: 'live',
  FINISHED: 'done',
  ABANDONED: 'neutral',
};

function byStartedAtDesc(a: MatchSummary, b: MatchSummary) {
  return b.startedAt.localeCompare(a.startedAt);
}

export function MatchesScreen() {
  const navigate = useNavigate();

  const { data, isPending, error } = useQuery({
    queryKey: ['matches'],
    queryFn: () => fetchMatches(),
  });

  const matches = useMemo(() => [...(data ?? [])].sort(byStartedAtDesc), [data]);

  // El nombre del alumno lo sacamos de la lista de partidos; un borrador de un partido que ya no
  // está en la lista no lo mostramos.
  const drafts = useMemo(() => {
    const nameByMatch = new Map(matches.map((match) => [match.id, match.playerName]));
    return listPendingDrafts()
      .filter((draft) => nameByMatch.has(draft.matchId))
      .map((draft) => ({ ...draft, playerName: nameByMatch.get(draft.matchId) ?? 'Alumno sin nombre' }));
  }, [matches]);

  return (
    <>
      <ScreenHeader
        title="Partidos"
        lede="El video se queda en esta máquina. Al servidor solo viajan los KPIs y el minuto de cada evento dentro de la grabación."
        actions={<Button onClick={() => navigate('/partidos/nuevo')}>Analizar un partido</Button>}
      />

      {error ? <ErrorBox title="No se pudo traer la lista" message={error.message} /> : null}
      {isPending ? <p>Cargando…</p> : null}

      {data?.length === 0 ? (
        <EmptyState
          title="Todavía no hay partidos"
          hint="Creá uno y enganchale el video de la cancha para empezar a analizarlo."
          action={{ label: 'Analizar un partido', onClick: () => navigate('/partidos/nuevo') }}
        />
      ) : null}

      {matches.length > 0 ? (
        <section className="stl-section">
          <SectionTitle label="A revisar" count={matches.length} />
          <Table head={['Alumno', 'Rival', 'Fecha', 'Estado', '']}>
            {matches.map((match) => (
              <tr
                key={match.id}
                className="stl-table__row--link"
                onClick={() => navigate(`/partidos/${match.id}`)}
              >
                <td className="stl-table__strong">{match.playerName ?? 'Alumno sin nombre'}</td>
                <td>{match.opponentName ?? '—'}</td>
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

      {drafts.length > 0 ? (
        <section className="stl-section">
          <SectionTitle label="Borradores sin sincronizar" count={drafts.length} />
          <Table head={['Alumno', 'Eventos', 'Sin subir', '']}>
            {drafts.map((draft) => (
              <tr key={draft.matchId}>
                <td className="stl-table__strong">{draft.playerName}</td>
                <td className="stl-table__mono">{draft.total}</td>
                <td className="stl-table__mono">{draft.pending}</td>
                <td className="stl-table__actions">
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/partidos/${draft.matchId}`)}
                  >
                    Reanudar
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
