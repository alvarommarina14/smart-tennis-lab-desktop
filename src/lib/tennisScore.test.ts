import { describe, expect, it } from 'vitest';

import { buildScoreboard, isSuperTiebreakWon, type PointOutcome } from '@/lib/tennisScore';

const SET_1 = 'set-1';
const SET_2 = 'set-2';
const SET_3 = 'set-3';
const SUPER = 'TWO_SETS_SUPER_TIEBREAK';

const points = (setId: string, count: number, won: boolean): PointOutcome[] =>
  Array.from({ length: count }, () => ({ setId, won }));

const won = (count: number) => points(SET_1, count, true);
const lost = (count: number) => points(SET_1, count, false);

const alternatingGames = (games: number, setId = SET_1): PointOutcome[] => {
  const out: PointOutcome[] = [];
  for (let game = 0; game < games; game += 1) {
    out.push(...points(setId, 4, game % 2 === 0));
  }
  return out;
};

describe('juego', () => {
  it('arranca en 0-0 y sin juegos', () => {
    const board = buildScoreboard([SET_1], []);
    expect(board.currentGame).toEqual({ player: '0', opponent: '0', tiebreak: false });
    expect(board.currentSet.player).toBe(0);
    expect(board.currentSet.opponent).toBe(0);
  });

  it('sube por la escalera 15, 30, 40', () => {
    expect(buildScoreboard([SET_1], won(1)).currentGame.player).toBe('15');
    expect(buildScoreboard([SET_1], won(2)).currentGame.player).toBe('30');
    expect(buildScoreboard([SET_1], won(3)).currentGame.player).toBe('40');
  });

  it('se gana con cuatro puntos seguidos y el marcador vuelve a cero', () => {
    const board = buildScoreboard([SET_1], won(4));
    expect(board.currentSet.player).toBe(1);
    expect(board.currentGame).toEqual({ player: '0', opponent: '0', tiebreak: false });
  });

  it('40-40 es deuce y todavía no gana nadie', () => {
    const board = buildScoreboard([SET_1], [...won(3), ...lost(3)]);
    expect(board.currentGame).toEqual({ player: '40', opponent: '40', tiebreak: false });
    expect(board.currentSet.player).toBe(0);
    expect(board.currentSet.opponent).toBe(0);
  });

  it('desde deuce el punto siguiente es ventaja', () => {
    const board = buildScoreboard([SET_1], [...won(3), ...lost(3), ...won(1)]);
    expect(board.currentGame.player).toBe('AD');
    expect(board.currentSet.player).toBe(0);
  });

  it('perder la ventaja vuelve a deuce', () => {
    const board = buildScoreboard([SET_1], [...won(3), ...lost(3), ...won(1), ...lost(1)]);
    expect(board.currentGame).toEqual({ player: '40', opponent: '40', tiebreak: false });
  });

  it('se gana con dos puntos seguidos desde deuce', () => {
    const board = buildScoreboard([SET_1], [...won(3), ...lost(3), ...won(2)]);
    expect(board.currentSet.player).toBe(1);
    expect(board.currentGame.player).toBe('0');
  });
});

describe('set', () => {
  it('seis juegos seguidos dan 6-0', () => {
    const board = buildScoreboard([SET_1], won(24));
    expect(board.currentSet.player).toBe(6);
    expect(board.currentSet.opponent).toBe(0);
  });

  it('a 6-6 se entra en tiebreak y los puntos pasan a ser numéricos', () => {
    const board = buildScoreboard([SET_1], [...alternatingGames(12), ...won(1)]);
    expect(board.currentSet.player).toBe(6);
    expect(board.currentSet.opponent).toBe(6);
    expect(board.currentGame.tiebreak).toBe(true);
    expect(board.currentGame.player).toBe('1');
  });

  it('el tiebreak no se gana con 7 y un solo punto de diferencia', () => {
    const board = buildScoreboard([SET_1], [
      ...alternatingGames(12),
      ...won(6),
      ...lost(6),
      ...won(1),
    ]);
    expect(board.currentGame.tiebreak).toBe(true);
    expect(board.currentGame.player).toBe('7');
    expect(board.currentGame.opponent).toBe('6');
    expect(board.currentSet.player).toBe(6);
  });

  it('el tiebreak ganado deja el set 7-6', () => {
    const board = buildScoreboard([SET_1], [...alternatingGames(12), ...won(7)]);
    expect(board.currentSet.player).toBe(7);
    expect(board.currentSet.opponent).toBe(6);
    expect(board.currentGame.tiebreak).toBe(false);
  });

  it('los sets anteriores quedan separados del actual', () => {
    const board = buildScoreboard(
      [SET_1, SET_2],
      [...won(24), ...points(SET_2, 8, true)]
    );
    expect(board.previousSets).toHaveLength(1);
    expect(board.previousSets[0].player).toBe(6);
    expect(board.currentSet.setId).toBe(SET_2);
    expect(board.currentSet.player).toBe(2);
  });

  it('un set abierto sin puntos sigue siendo el actual', () => {
    const board = buildScoreboard([SET_1, SET_2], won(24));
    expect(board.currentSet.setId).toBe(SET_2);
    expect(board.currentSet.player).toBe(0);
    expect(board.previousSets[0].player).toBe(6);
  });

  it('los puntos sin set no se pierden', () => {
    const board = buildScoreboard([], [
      { setId: null, won: true },
      { setId: null, won: true },
    ]);
    expect(board.currentGame.player).toBe('30');
  });
});

describe('super tiebreak', () => {
  const dosSets = [...points(SET_1, 24, true), ...points(SET_2, 24, false)];
  const conSuper = (extra: PointOutcome[]) =>
    buildScoreboard([SET_1, SET_2, SET_3], [...dosSets, ...extra], SUPER);

  it('el tercer set cuenta puntos y no juegos', () => {
    const board = conSuper([...points(SET_3, 3, true), ...points(SET_3, 2, false)]);
    expect(board.currentSet.kind).toBe('SUPER_TIEBREAK');
    expect(board.currentSet.player).toBe(3);
    expect(board.currentSet.opponent).toBe(2);
    expect(board.currentGame.player).toBe('3');
    expect(board.currentGame.tiebreak).toBe(true);
  });

  it('no arma juegos aunque se acumulen puntos', () => {
    const board = conSuper(points(SET_3, 8, true));
    expect(board.currentSet.player).toBe(8);
    expect(board.currentGame.player).toBe('8');
  });

  it('se gana con 10 y dos de diferencia', () => {
    const board = conSuper([...points(SET_3, 10, true), ...points(SET_3, 8, false)]);
    expect(isSuperTiebreakWon(board.currentSet)).toBe(true);
  });

  it('10-9 todavía no lo gana', () => {
    const board = conSuper([...points(SET_3, 10, true), ...points(SET_3, 9, false)]);
    expect(isSuperTiebreakWon(board.currentSet)).toBe(false);
  });

  it('12-10 lo gana', () => {
    const board = conSuper([...points(SET_3, 12, true), ...points(SET_3, 10, false)]);
    expect(isSuperTiebreakWon(board.currentSet)).toBe(true);
  });

  it('9-0 todavía no lo gana', () => {
    const board = conSuper(points(SET_3, 9, true));
    expect(isSuperTiebreakWon(board.currentSet)).toBe(false);
  });

  it('los dos primeros sets se juegan normales, con juegos', () => {
    const board = conSuper([]);
    expect(board.previousSets[0].kind).toBe('GAMES');
    expect(board.previousSets[0].player).toBe(6);
    expect(board.previousSets[1].kind).toBe('GAMES');
    expect(board.previousSets[1].opponent).toBe(6);
  });

  it('el segundo set conserva el tiebreak común a 6-6', () => {
    const board = buildScoreboard(
      [SET_1, SET_2],
      [
        ...points(SET_1, 24, true),
        ...alternatingGames(12, SET_2),
        ...points(SET_2, 1, true),
      ],
      SUPER
    );
    expect(board.currentSet.kind).toBe('GAMES');
    expect(board.currentSet.player).toBe(6);
    expect(board.currentSet.opponent).toBe(6);
    expect(board.currentGame.tiebreak).toBe(true);
    expect(board.currentGame.player).toBe('1');
  });

  it('un set normal nunca reporta super tiebreak ganado', () => {
    const board = buildScoreboard([SET_1], points(SET_1, 24, true), SUPER);
    expect(isSuperTiebreakWon(board.currentSet)).toBe(false);
  });
});

describe('formato a 3 sets', () => {
  it('el tercer set es un set normal con juegos', () => {
    const board = buildScoreboard(
      [SET_1, SET_2, SET_3],
      [...points(SET_1, 24, true), ...points(SET_2, 24, false), ...points(SET_3, 8, true)],
      'BEST_OF_3_SETS'
    );
    expect(board.currentSet.kind).toBe('GAMES');
    expect(board.currentSet.player).toBe(2);
  });

  it('sin formato explícito se asume a 3 sets', () => {
    const board = buildScoreboard(
      [SET_1, SET_2, SET_3],
      [...points(SET_1, 24, true), ...points(SET_2, 24, false), ...points(SET_3, 8, true)]
    );
    expect(board.currentSet.kind).toBe('GAMES');
  });
});
