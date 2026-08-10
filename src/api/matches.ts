import { apiRequest } from '@/api/client';
import type { Discipline } from '@/api/kpis';
import type { MatchFormat as MatchFormatValue } from '@/lib/tennisScore';

export type MatchStatus = 'IN_PROGRESS' | 'FINISHED' | 'ABANDONED';
export type Surface = 'CLAY' | 'HARD' | 'GRASS' | 'CARPET' | 'INDOOR';
export type { MatchFormat } from '@/lib/tennisScore';

export type MatchSummary = {
  id: string;
  playerId: string;
  playerName: string | null;
  opponentName: string | null;
  status: MatchStatus;
  startedAt: string;
  finishedAt: string | null;
};

export type MatchSet = {
  id: string;
  setNumber: number;
  startedAt: string;
  finishedAt: string | null;
};

export type Match = MatchSummary & {
  tournament: string | null;
  surface: Surface | null;
  discipline: Discipline;
  format: MatchFormatValue;
  notes: string | null;
  eventCount: number;
  sets: MatchSet[];
};

export type CreateMatchInput = {
  id: string;
  playerId: string;
  opponentName?: string | null;
  tournament?: string | null;
  surface?: Surface | null;
  discipline?: Discipline;
  format?: MatchFormatValue;
  startedAt: string;
  notes?: string | null;
};

export type SyncEvent = {
  id: string;
  setId: string | null;
  kpiCode: string;
  occurredAt: string;
  clientSeq: number;
  deleted: boolean;
};

export type SyncResult = {
  accepted: number;
  ignored: number;
  rejected: { id: string; reason: string }[];
  liveEvents: number;
  serverTime: string;
};

export function fetchMatches(playerId?: string) {
  const query = playerId ? `?playerId=${playerId}` : '';
  return apiRequest<MatchSummary[]>(`/api/v1/matches${query}`);
}

export function fetchMatch(matchId: string) {
  return apiRequest<Match>(`/api/v1/matches/${matchId}`);
}

export function createMatch(input: CreateMatchInput) {
  return apiRequest<Match>('/api/v1/matches', { method: 'POST', body: input });
}

export function finishMatch(matchId: string, status: MatchStatus, finishedAt: string) {
  return apiRequest<Match>(`/api/v1/matches/${matchId}/finish`, {
    method: 'POST',
    body: { status, finishedAt },
  });
}

export function startSet(matchId: string, id: string, setNumber: number, startedAt: string) {
  return apiRequest<MatchSet>(`/api/v1/matches/${matchId}/sets`, {
    method: 'POST',
    body: { id, setNumber, startedAt },
  });
}

export function finishSet(matchId: string, setId: string, finishedAt: string) {
  return apiRequest<MatchSet>(
    `/api/v1/matches/${matchId}/sets/${setId}/finish?finishedAt=${encodeURIComponent(finishedAt)}`,
    { method: 'POST' }
  );
}

export function syncEvents(matchId: string, events: SyncEvent[]) {
  return apiRequest<SyncResult>(`/api/v1/matches/${matchId}/events`, {
    method: 'POST',
    body: { events },
  });
}
