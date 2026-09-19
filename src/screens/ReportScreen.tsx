import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import type { MatchStatus } from '@/api/matches';
import { downloadMatchReport, fetchMatchReport, formatKpiValue, type ReportFormat } from '@/api/reports';
import { ScreenHeader } from '@/components/List';
import { SectionTitle, Table, Tag } from '@/components/Table';
import { Button, ErrorBox } from '@/components/ui';
import { formatDateTime, formatDuration, statusLabel } from '@/lib/format';

import './ReportScreen.css';

const STATUS_TONE: Record<MatchStatus, 'live' | 'done' | 'neutral'> = {
  IN_PROGRESS: 'live',
  FINISHED: 'done',
  ABANDONED: 'neutral',
};

export function ReportScreen() {
  const { id: matchId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const report = useQuery({
    queryKey: ['match-report', matchId],
    queryFn: () => fetchMatchReport(matchId as string),
    enabled: Boolean(matchId),
  });

  const download = useMutation({
    mutationFn: (format: ReportFormat) => downloadMatchReport(matchId as string, format),
  });

  if (!matchId || report.isPending) {
    return <p>Cargando…</p>;
  }

  if (report.error || !report.data) {
    return <ErrorBox title="No se pudo traer el reporte" message={report.error?.message} />;
  }

  const data = report.data;
  const lede = [
    data.opponentName ? `vs ${data.opponentName}` : null,
    formatDateTime(data.startedAt),
    data.tournament,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <ScreenHeader
        title={data.playerName ?? 'Reporte'}
        lede={lede}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => download.mutate('csv')}
              loading={download.isPending && download.variables === 'csv'}
            >
              Descargar CSV
            </Button>
            <Button
              onClick={() => download.mutate('pdf')}
              loading={download.isPending && download.variables === 'pdf'}
            >
              Descargar PDF
            </Button>
            <Button variant="secondary" onClick={() => navigate(`/partidos/${matchId}`)}>
              Volver al partido
            </Button>
          </>
        }
      />

      {download.isError ? (
        <ErrorBox
          title="No se pudo descargar el reporte"
          message={download.error instanceof Error ? download.error.message : undefined}
        />
      ) : null}

      <div className="report__overview">
        <div className="report__stat">
          <span>Estado</span>
          <Tag tone={STATUS_TONE[data.status]}>{statusLabel(data.status)}</Tag>
        </div>
        <div className="report__stat">
          <span>Duración</span>
          <strong>{formatDuration(data.durationMinutes)}</strong>
        </div>
        <div className="report__stat">
          <span>Eventos</span>
          <strong>{data.totalEvents}</strong>
        </div>
        <div className="report__stat">
          <span>Sets</span>
          <strong>{data.sets.length}</strong>
        </div>
      </div>

      {data.categories.map((category) => (
        <section key={category.code} className="stl-section">
          <SectionTitle label={category.label} count={category.kpis.length} />
          <Table head={['KPI', 'Valor']}>
            {category.kpis.map((kpi) => (
              <tr key={kpi.code}>
                <td>{kpi.label}</td>
                <td className="stl-table__mono">{formatKpiValue(kpi)}</td>
              </tr>
            ))}
          </Table>
        </section>
      ))}

      {data.sets.map((set) => (
        <section key={set.setId} className="stl-section">
          <SectionTitle label={`Set ${set.setNumber}`} count={set.kpis.length} />
          <Table head={['KPI', 'Valor']}>
            {set.kpis.map((kpi) => (
              <tr key={kpi.code}>
                <td>{kpi.label}</td>
                <td className="stl-table__mono">{formatKpiValue(kpi)}</td>
              </tr>
            ))}
          </Table>
        </section>
      ))}
    </>
  );
}
