export type MatchFormat = 'BEST_OF_3_SETS' | 'TWO_SETS_SUPER_TIEBREAK';

export type PointOutcome = { setId: string | null; won: boolean };

export type SetKind = 'GAMES' | 'SUPER_TIEBREAK';

export type SetScore = {
  setId: string | null;
  kind: SetKind;
  player: number;
  opponent: number;
};

export type GameScore = {
  player: string;
  opponent: string;
  tiebreak: boolean;
};

export type Scoreboard = {
  previousSets: SetScore[];
  currentSet: SetScore;
  currentGame: GameScore;
};

const LADDER = ['0', '15', '30', '40'];
const ADVANTAGE = 'AD';
const BEHIND_ADVANTAGE = '–';
const TIEBREAK_AT = 6;
const POINTS_TO_WIN_GAME = 4;
const POINTS_TO_WIN_TIEBREAK = 7;
const POINTS_TO_WIN_SUPER_TIEBREAK = 10;
const SUPER_TIEBREAK_SET_INDEX = 2;

export function buildScoreboard(
  setIds: string[],
  points: PointOutcome[],
  format: MatchFormat = 'BEST_OF_3_SETS'
): Scoreboard {
  const bySet = new Map<string, PointOutcome[]>();
  for (const setId of setIds) {
    bySet.set(setId, []);
  }
  for (const point of points) {
    const key = point.setId ?? '';
    if (!bySet.has(key)) {
      bySet.set(key, []);
    }
    bySet.get(key)?.push(point);
  }

  if (bySet.size === 0) {
    return {
      previousSets: [],
      currentSet: { setId: null, kind: 'GAMES', player: 0, opponent: 0 },
      currentGame: { player: '0', opponent: '0', tiebreak: false },
    };
  }

  const scored = [...bySet.entries()].map(([setId, setPoints], index) =>
    scoreSet(setId === '' ? null : setId, setPoints, kindOfSet(index, format))
  );
  const current = scored[scored.length - 1];

  return {
    previousSets: scored.slice(0, -1).map((set) => set.score),
    currentSet: current.score,
    currentGame: current.game,
  };
}

function kindOfSet(index: number, format: MatchFormat): SetKind {
  return format === 'TWO_SETS_SUPER_TIEBREAK' && index === SUPER_TIEBREAK_SET_INDEX
    ? 'SUPER_TIEBREAK'
    : 'GAMES';
}

function scoreSet(setId: string | null, points: PointOutcome[], kind: SetKind) {
  if (kind === 'SUPER_TIEBREAK') {
    return scoreSuperTiebreak(setId, points);
  }

  let playerGames = 0;
  let opponentGames = 0;
  let playerPoints = 0;
  let opponentPoints = 0;

  for (const point of points) {
    const tiebreak = isTiebreak(playerGames, opponentGames);
    const target = tiebreak ? POINTS_TO_WIN_TIEBREAK : POINTS_TO_WIN_GAME;

    if (point.won) {
      playerPoints += 1;
    } else {
      opponentPoints += 1;
    }

    if (playerPoints >= target && playerPoints - opponentPoints >= 2) {
      playerGames += 1;
      playerPoints = 0;
      opponentPoints = 0;
    } else if (opponentPoints >= target && opponentPoints - playerPoints >= 2) {
      opponentGames += 1;
      playerPoints = 0;
      opponentPoints = 0;
    }
  }

  return {
    score: { setId, kind: 'GAMES' as SetKind, player: playerGames, opponent: opponentGames },
    game: labelGame(playerPoints, opponentPoints, isTiebreak(playerGames, opponentGames)),
  };
}

// El super tiebreak reemplaza al tercer set: no hay juegos, el set es un solo tiebreak a 10.
function scoreSuperTiebreak(setId: string | null, points: PointOutcome[]) {
  let player = 0;
  let opponent = 0;

  for (const point of points) {
    if (point.won) {
      player += 1;
    } else {
      opponent += 1;
    }
  }

  return {
    score: { setId, kind: 'SUPER_TIEBREAK' as SetKind, player, opponent },
    game: { player: String(player), opponent: String(opponent), tiebreak: true },
  };
}

export function isSuperTiebreakWon(score: SetScore) {
  if (score.kind !== 'SUPER_TIEBREAK') {
    return false;
  }
  const leader = Math.max(score.player, score.opponent);
  return leader >= POINTS_TO_WIN_SUPER_TIEBREAK && Math.abs(score.player - score.opponent) >= 2;
}

function isTiebreak(playerGames: number, opponentGames: number) {
  return playerGames === TIEBREAK_AT && opponentGames === TIEBREAK_AT;
}

function labelGame(playerPoints: number, opponentPoints: number, tiebreak: boolean): GameScore {
  if (tiebreak) {
    return { player: String(playerPoints), opponent: String(opponentPoints), tiebreak };
  }

  if (playerPoints >= 3 && opponentPoints >= 3) {
    if (playerPoints === opponentPoints) {
      return { player: '40', opponent: '40', tiebreak };
    }
    return playerPoints > opponentPoints
      ? { player: ADVANTAGE, opponent: BEHIND_ADVANTAGE, tiebreak }
      : { player: BEHIND_ADVANTAGE, opponent: ADVANTAGE, tiebreak };
  }

  return { player: LADDER[playerPoints], opponent: LADDER[opponentPoints], tiebreak };
}
