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
