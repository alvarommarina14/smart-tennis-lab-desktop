import { apiRequest } from '@/api/client';
import type { KpiKind, KpiUnit } from '@/api/kpis';
import type { MatchStatus } from '@/api/matches';

export type KpiValue = {
  code: string;
  label: string;
  kind: KpiKind;
  unit: KpiUnit;
  value: number;
};

export type ReportCategory = {
  code: string;
  label: string;
  kpis: KpiValue[];
};

export type SetReport = {
  setId: string;
  setNumber: number;
  startedAt: string;
  finishedAt: string | null;
  kpis: KpiValue[];
};

export type MatchReport = {
  matchId: string;
  playerName: string | null;
  opponentName: string | null;
  tournament: string | null;
  status: MatchStatus;
  startedAt: string;
  finishedAt: string | null;
  durationMinutes: number;
  totalEvents: number;
  categories: ReportCategory[];
  sets: SetReport[];
};

export function fetchMatchReport(matchId: string) {
  return apiRequest<MatchReport>(`/api/v1/matches/${matchId}/report`);
}

export function formatKpiValue(kpi: KpiValue) {
  if (kpi.unit === 'PERCENTAGE') {
    return `${kpi.value}%`;
  }
  if (kpi.unit === 'MINUTES') {
    return `${kpi.value} min`;
  }
  return String(kpi.value);
}
