import type { MatchStatus, Surface } from '@/api/matches';

const DATE_TIME = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const DATE = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function formatDateTime(iso: string) {
  return DATE_TIME.format(new Date(iso));
}

export function formatDate(iso: string) {
  return DATE.format(new Date(iso));
}

export function formatDuration(minutes: number) {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export function elapsedMinutes(startedAt: string, finishedAt: string | null) {
  const end = finishedAt ? new Date(finishedAt) : new Date();
  return Math.max(0, Math.floor((end.getTime() - new Date(startedAt).getTime()) / 60000));
}

const STATUS_LABELS: Record<MatchStatus, string> = {
  IN_PROGRESS: 'En curso',
  FINISHED: 'Terminado',
  ABANDONED: 'Abandonado',
};

export function statusLabel(status: MatchStatus) {
  return STATUS_LABELS[status];
}

export const SURFACE_OPTIONS: { value: Surface; label: string }[] = [
  { value: 'CLAY', label: 'Polvo' },
  { value: 'HARD', label: 'Cemento' },
  { value: 'GRASS', label: 'Césped' },
  { value: 'CARPET', label: 'Carpeta' },
  { value: 'INDOOR', label: 'Indoor' },
];

export function surfaceLabel(surface: Surface | null) {
  return SURFACE_OPTIONS.find((option) => option.value === surface)?.label ?? null;
}
