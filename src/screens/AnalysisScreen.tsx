import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { fetchKpiCatalog, type Kpi } from '@/api/kpis';
import { fetchMatch, startSet, syncEvents, type SyncEvent } from '@/api/matches';
import { formatClock, VideoPlayer, type VideoHandle } from '@/components/VideoPlayer';
import { Button, ErrorBox } from '@/components/ui';
import { readDraft, writeDraft, type DraftEvent } from '@/lib/analysisDraft';
import { pickVideoFile, videoUrl } from '@/lib/pickVideo';
import { blockedForEvents } from '@/lib/taggingRules';
import { buildScoreboard, type PointOutcome } from '@/lib/tennisScore';
import { rememberVideo, videoFor } from '@/lib/videoLibrary';

import './AnalysisScreen.css';

const SYNC_INTERVAL_MS = 20_000;
const DEFAULT_LAG_MS = 1500;
const FLASH_MS = 320;

// Etiquetas cortas para los botones del panel: el label del catálogo es la versión larga que va
// en el reporte, pero en la cancha el profe necesita botones de una línea.
const SHORT_LABELS: Record<string, string> = {
  FIRST_SERVE_IN: '1er saque IN',
  FIRST_SERVE_OUT: '1er saque OUT',
  SECOND_SERVE_IN: '2do saque IN',
  DOUBLE_FAULT: 'Doble falta',
  SERVE_ERROR_OUT: 'Error saque OUT',
  SERVE_ERROR_NET: 'Error saque NET',
  RETURN_IN_PLAY: 'Devolución en juego',
  RETURN_ERROR_OUT: 'Error devol. OUT',
  RETURN_ERROR_NET: 'Error devol. NET',
  POINT_WON_RETURNING_FIRST_SERVE: 'Ganado dev. 1er saque',
  POINT_WON_RETURNING_SECOND_SERVE: 'Ganado dev. 2do saque',
  UNFORCED_ERROR: 'Error no forzado',
  RALLY_1_4: 'Rally 1–4',
  RALLY_5_8: 'Rally 5–8',
  RALLY_9_PLUS: 'Rally 9+',
};

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
  const [flashCode, setFlashCode] = useState<string | null>(null);
  const [showEvents, setShowEvents] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [currentMs, setCurrentMs] = useState(0);
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

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

  // Botones que no tienen sentido según lo ya cargado en el punto en curso: si marcó "1er saque
  // IN" no puede marcar "2do saque IN" ni "doble falta", etc. Se recalcula con cada evento.
  const blockedTags = useMemo(
    () => blockedForEvents(draft.events.map((event) => event.kpiCode)),
    [draft.events]
  );

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

  useEffect(() => () => clearTimeout(flashTimer.current), []);

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

  const tag = (kpi: Kpi) => {
    if (blockedTags.has(kpi.code)) {
      return;
    }
    record(kpi);
    setFlashCode(kpi.code);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashCode(null), FLASH_MS);
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

  const undoLast = () => {
    const last = draft.events[draft.events.length - 1];
    if (last) {
      void removeEvent(last);
    }
  };

  const jumpTo = (event: DraftEvent) => {
    player.current?.pause();
    player.current?.seekMs((draft.matchStartOffsetMs ?? 0) + event.videoOffsetMs);
    setShowEvents(false);
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

  const startOffsetMs = draft.matchStartOffsetMs ?? 0;
  const trackPct = (ms: number) =>
    durationMs > 0 ? Math.min(100, Math.max(0, (ms / durationMs) * 100)) : 0;

  const seekToFraction = (fraction: number) => {
    if (durationMs > 0) {
      player.current?.seekMs(fraction * durationMs);
    }
  };

  useEffect(() => {
    function onKey(keyEvent: KeyboardEvent) {
      if (keyEvent.target instanceof HTMLInputElement || keyEvent.target instanceof HTMLSelectElement) {
        return;
      }
      if (keyEvent.code === 'Escape') {
        setShowEvents(false);
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
          <Button
            variant="secondary"
            onClick={() => setShowEvents((open) => !open)}
            aria-expanded={showEvents}
          >
            Eventos · {draft.events.length}
          </Button>
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
            <div className="analysis__stage">
              <VideoPlayer
                ref={player}
                src={videoUrl(videoPath)}
                onReady={setDurationMs}
                onProgress={setCurrentMs}
                onError={setVideoError}
              />
            </div>
          ) : (
            <div className="analysis__novideo">
              <p>Este partido no tiene un video enganchado en esta máquina.</p>
              <Button onClick={changeVideo}>Elegir el video</Button>
            </div>
          )}

          {videoPath ? (
            <div className="analysis__timeline">
              <div className="analysis__ruler">
                {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
                  <span key={fraction}>{formatClock(durationMs * fraction)}</span>
                ))}
              </div>
              <div
                className="analysis__track"
                role="slider"
                aria-label="Línea de tiempo del video"
                aria-valuemin={0}
                aria-valuemax={Math.round(durationMs / 1000)}
                aria-valuenow={Math.round(currentMs / 1000)}
                tabIndex={0}
                onClick={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  seekToFraction((event.clientX - rect.left) / rect.width);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowLeft') seekToFraction((currentMs - 3000) / durationMs);
                  if (event.key === 'ArrowRight') seekToFraction((currentMs + 3000) / durationMs);
                }}
              >
                <div
                  className="analysis__track-scrubbed"
                  style={{ width: `${trackPct(currentMs)}%` }}
                />
                {draft.matchStartOffsetMs !== null
                  ? draft.events.map((event) => (
                      <span
                        key={event.id}
                        className={`analysis__tick${
                          event.kpiCode === 'POINT_WON'
                            ? ' analysis__tick--won'
                            : event.kpiCode === 'POINT_LOST'
                              ? ' analysis__tick--lost'
                              : ''
                        }`}
                        style={{ left: `${trackPct(startOffsetMs + event.videoOffsetMs)}%` }}
                      />
                    ))
                  : null}
                <div
                  className="analysis__playhead"
                  style={{ left: `${trackPct(currentMs)}%` }}
                />
              </div>
            </div>
          ) : null}

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

          <div className="analysis__statusbar">
            <span>
              OFFSET{' '}
              <b>
                {draft.matchStartOffsetMs === null
                  ? '—'
                  : formatClock(draft.matchStartOffsetMs)}
              </b>
            </span>
            <span>
              COMPENSACIÓN <b>{(lagMs / 1000).toFixed(1)} s</b>
            </span>
            <span>
              SET <b>{Math.max(1, setIds.length)}</b>
            </span>
            <span>
              EVENTOS <b>{draft.events.length}</b>
            </span>
            <span className="analysis__statusbar-sync">
              {pendingCount > 0 ? `${pendingCount} sin subir` : 'al día'}
            </span>
          </div>
        </section>

        <aside className="analysis__panel">
          <div className="analysis__panel-head">
            <h2>Inspector · Tagging</h2>
            <button
              type="button"
              className="analysis__panel-undo"
              onClick={undoLast}
              disabled={draft.events.length === 0}
            >
              ↶ deshacer
            </button>
          </div>

          {draft.matchStartOffsetMs === null ? (
            <div className="analysis__panel-gate">
              <p>Antes de taggear, marcá en qué momento del video empieza el partido.</p>
              <Button onClick={markStart}>Marcar el inicio</Button>
            </div>
          ) : null}

          {catalog.data?.categories.map((category) => {
            const counters = category.kpis.filter((kpi) => kpi.kind === 'COUNTER');
            if (counters.length === 0) return null;
            return (
              <div key={category.code} className="analysis__deck">
                <span className="analysis__deck-title">{category.label}</span>
                <div className="analysis__deck-grid">
                  {counters.map((kpi) => {
                    const count = draft.events.filter(
                      (event) => event.kpiCode === kpi.code
                    ).length;
                    const variant =
                      kpi.code === 'POINT_WON'
                        ? ' analysis__tag--won'
                        : kpi.code === 'POINT_LOST'
                          ? ' analysis__tag--lost'
                          : '';
                    const ruledOut = blockedTags.has(kpi.code);
                    const marked = count > 0 && !ruledOut ? ' analysis__tag--set' : '';
                    return (
                      <button
                        key={kpi.code}
                        type="button"
                        className={`analysis__tag${variant}${marked}${
                          flashCode === kpi.code ? ' analysis__tag--flash' : ''
                        }`}
                        onClick={() => tag(kpi)}
                        disabled={draft.matchStartOffsetMs === null || ruledOut}
                        title={ruledOut ? 'No aplica en este punto' : undefined}
                      >
                        <span className="analysis__tag-label">
                          {SHORT_LABELS[kpi.code] ?? kpi.label}
                        </span>
                        <span className="analysis__tag-count">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </aside>
      </div>

      {showEvents ? (
        <>
          <div
            className="analysis__drawer-backdrop"
            onClick={() => setShowEvents(false)}
            role="presentation"
          />
          <aside className="analysis__drawer" aria-label="Eventos cargados">
            <div className="analysis__drawer-head">
              <h2>Eventos · {draft.events.length}</h2>
              <button
                type="button"
                className="analysis__drawer-close"
                onClick={() => setShowEvents(false)}
                title="Cerrar"
              >
                ×
              </button>
            </div>
            {draft.events.length === 0 ? (
              <p className="analysis__hint">
                Marcá dónde empieza el partido y tocá los contadores del panel. Espacio reproduce y
                pausa, las flechas mueven 3 segundos.
              </p>
            ) : (
              <ol className="analysis__list">
                {[...draft.events].reverse().map((event) => (
                  <li key={event.id} className="analysis__event">
                    <button
                      type="button"
                      className="analysis__event-jump"
                      onClick={() => jumpTo(event)}
                    >
                      <span className="analysis__event-time">
                        {formatClock(event.videoOffsetMs)}
                      </span>
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
            )}
          </aside>
        </>
      ) : null}
    </div>
  );
}
