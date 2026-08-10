import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { fetchKpiCatalog, type Kpi } from '@/api/kpis';
import { fetchMatch, startSet, syncEvents, type SyncEvent } from '@/api/matches';
import { formatClock, VideoPlayer, type VideoHandle } from '@/components/VideoPlayer';
import { Button, ErrorBox } from '@/components/ui';
import { readDraft, writeDraft, type DraftEvent } from '@/lib/analysisDraft';
import { pickVideoFile, videoUrl } from '@/lib/pickVideo';
import { buildScoreboard, type PointOutcome } from '@/lib/tennisScore';
import { rememberVideo, videoFor } from '@/lib/videoLibrary';

import './AnalysisScreen.css';

const SYNC_INTERVAL_MS = 20_000;
const DEFAULT_LAG_MS = 1500;

export function AnalysisScreen() {
  const { id: matchId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const player = useRef<VideoHandle>(null);

  const [videoPath, setVideoPath] = useState(() => (matchId ? videoFor(matchId) : null));
  const [videoError, setVideoError] = useState<string | null>(null);
  const [draft, setDraft] = useState(() => readDraft(matchId ?? ''));
  const [lagMs, setLagMs] = useState(DEFAULT_LAG_MS);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [setIds, setSetIds] = useState<string[]>([]);

  const match = useQuery({
    queryKey: ['match', matchId],
    queryFn: () => fetchMatch(matchId as string),
    enabled: Boolean(matchId),
  });

  const catalog = useQuery({
    queryKey: ['kpi-catalog', match.data?.discipline ?? 'SINGLES'],
    queryFn: () => fetchKpiCatalog(match.data?.discipline ?? 'SINGLES'),
    enabled: Boolean(match.data),
    staleTime: Infinity,
  });

  useEffect(() => {
    if (matchId) {
      writeDraft(matchId, draft);
    }
  }, [matchId, draft]);

  // El primer set se abre solo: el profe no tiene por qué acordarse de crearlo antes de cargar.
  useEffect(() => {
    if (!match.data || setIds.length > 0) {
      return;
    }
    if (match.data.sets.length > 0) {
      setSetIds(match.data.sets.map((set) => set.id));
      return;
    }
    const created = crypto.randomUUID();
    startSet(match.data.id, created, 1, new Date().toISOString())
      .then(() => setSetIds([created]))
      .catch(() => setSyncError('No se pudo abrir el primer set'));
  }, [match.data, setIds.length]);

  async function openNextSet() {
    if (!matchId) return;
    const created = crypto.randomUUID();
    try {
      await startSet(matchId, created, setIds.length + 1, new Date().toISOString());
      setSetIds((previous) => [...previous, created]);
      setSyncError(null);
    } catch {
      setSyncError('No se pudo abrir el set nuevo');
    }
  }

  const flush = useCallback(async () => {
    if (!matchId) return;
    const pending = draft.events.filter((event) => !event.synced);
    if (pending.length === 0) return;

    setSyncing(true);
    try {
      const payload: SyncEvent[] = pending.map((event) => ({
        id: event.id,
        setId: event.setId,
        kpiCode: event.kpiCode,
        occurredAt: event.occurredAt,
        videoOffsetMs: event.videoOffsetMs,
        clientSeq: event.clientSeq,
        deleted: false,
      }));
      await syncEvents(matchId, payload);
      const sent = new Set(pending.map((event) => event.id));
      setDraft((previous) => ({
        ...previous,
        events: previous.events.map((event) =>
          sent.has(event.id) ? { ...event, synced: true } : event
        ),
      }));
      setSyncError(null);
    } catch (caught) {
      setSyncError(caught instanceof Error ? caught.message : 'No se pudo sincronizar');
    } finally {
      setSyncing(false);
    }
  }, [matchId, draft.events]);

  useEffect(() => {
    const timer = setInterval(() => void flush(), SYNC_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [flush]);

  const markStart = () => {
    const at = player.current?.currentMs() ?? 0;
    setDraft((previous) => ({ ...previous, matchStartOffsetMs: at }));
  };

  const record = (kpi: Kpi) => {
    if (draft.matchStartOffsetMs === null) {
      setSyncError('Marcá primero dónde empieza el partido');
      return;
    }
    const raw = player.current?.currentMs() ?? 0;
    const compensated = player.current?.isPlaying() ? Math.max(0, raw - lagMs) : raw;

    setDraft((previous) => ({
      ...previous,
      events: [
        ...previous.events,
        {
          id: crypto.randomUUID(),
          setId: setIds[setIds.length - 1] ?? null,
          kpiCode: kpi.code,
          kpiLabel: kpi.label,
          occurredAt: new Date().toISOString(),
          videoOffsetMs: Math.max(0, compensated - (previous.matchStartOffsetMs ?? 0)),
          clientSeq: previous.events.length + 1,
          synced: false,
        },
      ],
    }));
    setSyncError(null);
  };

  const removeEvent = async (event: DraftEvent) => {
    setDraft((previous) => ({
      ...previous,
      events: previous.events.filter((candidate) => candidate.id !== event.id),
    }));
    if (event.synced && matchId) {
      try {
        await syncEvents(matchId, [
          {
            id: event.id,
            setId: event.setId,
            kpiCode: event.kpiCode,
            occurredAt: event.occurredAt,
            videoOffsetMs: event.videoOffsetMs,
            clientSeq: event.clientSeq,
            deleted: true,
          },
        ]);
      } catch {
        setSyncError('El evento se borró acá pero no en el servidor');
      }
    }
  };

  const jumpTo = (event: DraftEvent) => {
    player.current?.pause();
    player.current?.seekMs((draft.matchStartOffsetMs ?? 0) + event.videoOffsetMs);
  };

  async function changeVideo() {
    const picked = await pickVideoFile();
    if (picked && matchId) {
      rememberVideo(matchId, picked);
      setVideoPath(picked);
      setVideoError(null);
    }
  }

  const points: PointOutcome[] = useMemo(
    () =>
      draft.events
        .filter((event) => event.kpiCode === 'POINT_WON' || event.kpiCode === 'POINT_LOST')
        .map((event) => ({ setId: event.setId, won: event.kpiCode === 'POINT_WON' })),
    [draft.events]
  );

  const scoreboard = buildScoreboard(setIds, points, match.data?.format);

  useEffect(() => {
    function onKey(keyEvent: KeyboardEvent) {
      if (keyEvent.target instanceof HTMLInputElement || keyEvent.target instanceof HTMLSelectElement) {
        return;
      }
      if (keyEvent.code === 'Space') {
        keyEvent.preventDefault();
        player.current?.togglePlay();
      }
      if (keyEvent.code === 'ArrowLeft') {
        player.current?.seekMs((player.current?.currentMs() ?? 0) - 3000);
      }
      if (keyEvent.code === 'ArrowRight') {
        player.current?.seekMs((player.current?.currentMs() ?? 0) + 3000);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!matchId || match.isPending) {
    return <p>Cargando…</p>;
  }

  if (match.error || !match.data) {
    return <ErrorBox title="No se pudo traer el partido" message={match.error?.message} />;
  }

  const pendingCount = draft.events.filter((event) => !event.synced).length;

  return (
    <div className="analysis">
      <header className="analysis__header">
        <div>
          <h1>{match.data.playerName ?? 'Partido'}</h1>
          <span className="analysis__meta">
            {match.data.opponentName ? `vs ${match.data.opponentName} · ` : ''}
            {draft.events.length} eventos
            {pendingCount > 0 ? ` · ${pendingCount} sin subir` : ' · al día'}
          </span>
        </div>
        <div className="analysis__actions">
          <Button variant="secondary" onClick={() => void flush()} loading={syncing}>
            Sincronizar
          </Button>
          <Button variant="secondary" onClick={() => navigate('/')}>
            Volver
          </Button>
        </div>
      </header>

      {syncError ? <ErrorBox title={syncError} /> : null}
      {videoError ? <ErrorBox title="Problema con el video" message={videoError} /> : null}

      <div className="analysis__body">
        <section className="analysis__left">
          {videoPath ? (
            <VideoPlayer
              ref={player}
              src={videoUrl(videoPath)}
              onError={setVideoError}
            />
          ) : (
            <div className="analysis__novideo">
              <p>Este partido no tiene un video enganchado en esta máquina.</p>
              <Button onClick={changeVideo}>Elegir el video</Button>
            </div>
          )}

          <div className="analysis__controls">
            <Button variant="secondary" onClick={() => void openNextSet()}>
              Nuevo set
            </Button>
            <Button variant="secondary" onClick={markStart}>
              {draft.matchStartOffsetMs === null
                ? 'Marcar el inicio del partido'
                : `Inicio en ${formatClock(draft.matchStartOffsetMs)} · volver a marcar`}
            </Button>
            <label className="analysis__lag">
              Compensación
              <input
                type="range"
                min={0}
                max={4000}
                step={100}
                value={lagMs}
                onChange={(event) => setLagMs(Number(event.target.value))}
              />
              <span>{(lagMs / 1000).toFixed(1)} s</span>
            </label>
            {videoPath ? (
              <Button variant="secondary" onClick={changeVideo}>
                Cambiar video
              </Button>
            ) : null}
          </div>

          <div className="analysis__scoreboard">
            <div className="analysis__side">
              <span>{match.data.playerName ?? 'Alumno'}</span>
              <strong>{scoreboard.currentGame.player}</strong>
              <em>{scoreboard.currentSet.player}</em>
            </div>
            <div className="analysis__middle">
              <div>
                {scoreboard.currentSet.kind === 'SUPER_TIEBREAK'
                  ? 'Super TB'
                  : `Set ${Math.max(1, setIds.length)}`}
              </div>
              {scoreboard.previousSets.length > 0 ? (
                <div className="analysis__previous">
                  {scoreboard.previousSets
                    .map((set) => `${set.player}-${set.opponent}`)
                    .join('  ')}
                </div>
              ) : null}
            </div>
            <div className="analysis__side">
              <span>{match.data.opponentName ?? 'Rival'}</span>
              <strong>{scoreboard.currentGame.opponent}</strong>
              <em>{scoreboard.currentSet.opponent}</em>
            </div>
          </div>

          {catalog.data?.categories.map((category) => {
            const counters = category.kpis.filter((kpi) => kpi.kind === 'COUNTER');
            if (counters.length === 0) return null;
            return (
              <div key={category.code} className="analysis__category">
                <h2>{category.label}</h2>
                <div className="analysis__grid">
                  {counters.map((kpi) => (
                    <button
                      key={kpi.code}
                      type="button"
                      className="analysis__kpi"
                      onClick={() => record(kpi)}
                    >
                      <span className="analysis__kpi-count">
                        {draft.events.filter((event) => event.kpiCode === kpi.code).length}
                      </span>
                      <span className="analysis__kpi-label">{kpi.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        <aside className="analysis__events">
          <h2>Eventos</h2>
          {draft.events.length === 0 ? (
            <p className="analysis__hint">
              Marcá dónde empieza el partido y empezá a cargar. Espacio reproduce y pausa, las
              flechas mueven 3 segundos.
            </p>
          ) : null}
          <ol className="analysis__list">
            {[...draft.events].reverse().map((event) => (
              <li key={event.id} className="analysis__event">
                <button type="button" className="analysis__event-jump" onClick={() => jumpTo(event)}>
                  <span className="analysis__event-time">{formatClock(event.videoOffsetMs)}</span>
                  <span className="analysis__event-label">{event.kpiLabel}</span>
                </button>
                <button
                  type="button"
                  className="analysis__event-remove"
                  title="Borrar este evento"
                  onClick={() => void removeEvent(event)}
                >
                  ×
                </button>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}
