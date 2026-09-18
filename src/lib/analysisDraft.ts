export type DraftEvent = {
  id: string;
  setId: string | null;
  kpiCode: string;
  kpiLabel: string;
  occurredAt: string;
  videoOffsetMs: number;
  clientSeq: number;
  synced: boolean;
};

export type AnalysisDraft = {
  matchStartOffsetMs: number | null;
  events: DraftEvent[];
};

const EMPTY: AnalysisDraft = { matchStartOffsetMs: null, events: [] };

function key(matchId: string) {
  return `stl.analysis.${matchId}`;
}

// El borrador vive en el disco de esta máquina desde el primer tap. Son dos horas de trabajo del
// profe: si se cierra la app o se corta la luz, no puede depender de que el backend haya recibido
// el último lote.
export function readDraft(matchId: string): AnalysisDraft {
  try {
    const raw = localStorage.getItem(key(matchId));
    return raw ? (JSON.parse(raw) as AnalysisDraft) : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function writeDraft(matchId: string, draft: AnalysisDraft) {
  localStorage.setItem(key(matchId), JSON.stringify(draft));
}

export function clearDraft(matchId: string) {
  localStorage.removeItem(key(matchId));
}

const PREFIX = 'stl.analysis.';

export type DraftSummary = {
  matchId: string;
  total: number;
  pending: number;
};

// Recorre los borradores guardados en esta máquina y devuelve los que todavía tienen eventos sin
// subir. La Biblioteca los muestra aparte para que el profe sepa qué partidos le quedaron a medio
// sincronizar.
export function listPendingDrafts(): DraftSummary[] {
  const out: DraftSummary[] = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const storageKey = localStorage.key(i);
    if (!storageKey || !storageKey.startsWith(PREFIX)) {
      continue;
    }
    try {
      const draft = JSON.parse(localStorage.getItem(storageKey) ?? '') as AnalysisDraft;
      const pending = draft.events.filter((event) => !event.synced).length;
      if (pending > 0) {
        out.push({ matchId: storageKey.slice(PREFIX.length), total: draft.events.length, pending });
      }
    } catch {
      // Un borrador ilegible no bloquea la lista.
    }
  }
  return out;
}
