import { apiRequest } from '@/api/client';

export type DominantHand = 'RIGHT' | 'LEFT';

export type Player = {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  dominantHand: DominantHand | null;
  notes: string | null;
  archived: boolean;
};

export type PlayerInput = {
  firstName: string;
  lastName: string;
  birthDate?: string | null;
  dominantHand?: DominantHand | null;
  notes?: string | null;
};

export function fetchPlayers(includeArchived = false) {
  return apiRequest<Player[]>(`/api/v1/players?includeArchived=${includeArchived}`);
}

export function fetchPlayer(playerId: string) {
  return apiRequest<Player>(`/api/v1/players/${playerId}`);
}

export function createPlayer(input: PlayerInput) {
  return apiRequest<Player>('/api/v1/players', { method: 'POST', body: input });
}

export function updatePlayer(playerId: string, input: PlayerInput) {
  return apiRequest<Player>(`/api/v1/players/${playerId}`, { method: 'PUT', body: input });
}

export function archivePlayer(playerId: string) {
  return apiRequest<void>(`/api/v1/players/${playerId}`, { method: 'DELETE' });
}

export function playerName(player: Player) {
  return `${player.firstName} ${player.lastName}`;
}

// Orden alfabético por nombre y después apellido, con las reglas del español (la ñ después de la n,
// sin distinguir mayúsculas ni tildes).
const NAME_COLLATOR = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

export function sortByName(players: Player[]) {
  return [...players].sort((a, b) => {
    const byFirst = NAME_COLLATOR.compare(a.firstName, b.firstName);
    return byFirst !== 0 ? byFirst : NAME_COLLATOR.compare(a.lastName, b.lastName);
  });
}
