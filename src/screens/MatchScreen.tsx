import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { fetchMatch } from '@/api/matches';
import { ScreenHeader } from '@/components/List';
import { Button, Card, ErrorBox } from '@/components/ui';
import { formatDateTime, statusLabel, surfaceLabel } from '@/lib/format';
import { pickVideoFile } from '@/lib/pickVideo';
import { rememberVideo, videoFor } from '@/lib/videoLibrary';

export function MatchScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [videoPath, setVideoPath] = useState(() => (id ? videoFor(id) : null));

  const { data, isPending, error } = useQuery({
    queryKey: ['match', id],
    queryFn: () => fetchMatch(id as string),
    enabled: Boolean(id),
  });

  async function pickVideo() {
    const picked = await pickVideoFile();
    if (picked && id) {
      rememberVideo(id, picked);
      setVideoPath(picked);
    }
  }

  if (isPending) {
    return <p>Cargando…</p>;
  }

  if (error || !data) {
    return <ErrorBox title="No se pudo traer el partido" message={error?.message} />;
  }

  return (
    <>
      <ScreenHeader
        title={data.playerName ?? 'Partido'}
        actions={
          <Button variant="secondary" onClick={() => navigate('/')}>
            Volver
          </Button>
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
        <Card>
          <strong>Datos</strong>
          <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {data.opponentName ? `vs ${data.opponentName} · ` : ''}
            {formatDateTime(data.startedAt)} · {statusLabel(data.status)}
            {surfaceLabel(data.surface) ? ` · ${surfaceLabel(data.surface)}` : ''}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {data.eventCount} eventos cargados · {data.sets.length} sets
          </span>
        </Card>

        <Card>
          <strong>Video</strong>
          {videoPath ? (
            <span style={{ color: 'var(--text-muted)', fontSize: 13, wordBreak: 'break-all' }}>
              {videoPath}
            </span>
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              Este partido todavía no tiene un video enganchado en esta máquina.
            </span>
          )}
          <Button variant="secondary" onClick={pickVideo}>
            {videoPath ? 'Cambiar el video' : 'Elegir el video'}
          </Button>
        </Card>

        <Card>
          <strong style={{ color: 'var(--primary)' }}>Próximo paso</strong>
          <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Acá va la pantalla de análisis: el reproductor, la marca de inicio del partido, la
            grilla de KPIs con atajos de teclado y la lista de eventos para corregir cualquiera y
            saltar el video a ese momento.
          </p>
        </Card>
      </div>
    </>
  );
}
