import { apiRequest, apiRequestFile } from '@/api/client';
import type { KpiKind, KpiUnit } from '@/api/kpis';
import type { MatchStatus } from '@/api/matches';

export type ReportFormat = 'pdf' | 'csv';

const REPORT_ACCEPT: Record<ReportFormat, string> = {
  pdf: 'application/pdf',
  csv: 'text/csv',
};

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

// El backend expone el mismo endpoint en tres formatos por content negotiation: sin Accept
// especial devuelve JSON, con application/pdf o text/csv devuelve el archivo para descargar.
export async function downloadMatchReport(matchId: string, format: ReportFormat) {
  const { blob, fileName } = await apiRequestFile(
    `/api/v1/matches/${matchId}/report`,
    REPORT_ACCEPT[format]
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName ?? `reporte-partido.${format}`;
  link.click();
  URL.revokeObjectURL(url);
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
