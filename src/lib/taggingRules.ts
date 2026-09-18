// Reglas de coherencia para el panel de tagging.
//
// La app tagea a un solo jugador (el alumno), nunca a los dos. En cada punto ese jugador sacó o
// le devolvieron, nunca las dos cosas: si sacó, lo que hizo el rival al devolver no se carga; si
// restó, el saque fue del rival y tampoco se carga. Por eso "saque" y "devolución" son
// EXCLUYENTES entre sí en el mismo punto: en cuanto aparece un código de un lado se apaga el otro
// entero. El rally y el cierre sí son compartidos, porque pasan después del primer golpe sea cual
// sea el lado, y un punto tiene un solo tramo de rally y un solo cierre.
//
// El "punto actual" son los eventos cargados después del último POINT_WON / POINT_LOST. Cuando el
// profe cierra el punto, el panel se vuelve a habilitar entero para el siguiente.

type Code = string;

const POINT_ENDERS: Code[] = ['POINT_WON', 'POINT_LOST'];

// Fases del punto: cada lista es un grupo de KPIs excluyentes entre sí (pasa uno solo por punto).
const MUTEX_GROUPS: Code[][] = [
  ['FIRST_SERVE_IN', 'FIRST_SERVE_OUT'],
  ['SERVE_ERROR_OUT', 'SERVE_ERROR_NET'],
  ['RETURN_IN_PLAY', 'RETURN_ERROR_OUT', 'RETURN_ERROR_NET'],
  ['POINT_WON_RETURNING_FIRST_SERVE', 'POINT_WON_RETURNING_SECOND_SERVE'],
  ['WINNER', 'UNFORCED_ERROR'],
  ['RALLY_1_4', 'RALLY_5_8', 'RALLY_9_PLUS'],
  ['POINT_WON', 'POINT_LOST'],
];

// Pares sueltos que no pueden convivir en el mismo punto.
const CONFLICTS: [Code, Code][] = [
  // El primer saque entró: no hubo segundo saque ni falta.
  ['FIRST_SERVE_IN', 'SECOND_SERVE_IN'],
  ['FIRST_SERVE_IN', 'DOUBLE_FAULT'],
  ['FIRST_SERVE_IN', 'SERVE_ERROR_OUT'],
  ['FIRST_SERVE_IN', 'SERVE_ERROR_NET'],
  // El segundo saque entró: ya no puede haber doble falta.
  ['SECOND_SERVE_IN', 'DOUBLE_FAULT'],
  // Ace y doble falta son resultados opuestos del saque.
  ['ACE', 'DOUBLE_FAULT'],
  // Si el punto lo perdió, no pudo ganarlo devolviendo.
  ['POINT_LOST', 'POINT_WON_RETURNING_FIRST_SERVE'],
  ['POINT_LOST', 'POINT_WON_RETURNING_SECOND_SERVE'],
];

// Todo lo que puede pasar del lado del saque de este jugador.
const SERVE_PHASE: Code[] = [
  'FIRST_SERVE_IN',
  'FIRST_SERVE_OUT',
  'SECOND_SERVE_IN',
  'DOUBLE_FAULT',
  'ACE',
  'SERVE_ERROR_OUT',
  'SERVE_ERROR_NET',
];

// Todo lo que puede pasar del lado de la devolución de este jugador.
const RETURN_PHASE: Code[] = [
  'RETURN_IN_PLAY',
  'RETURN_ERROR_OUT',
  'RETURN_ERROR_NET',
  'POINT_WON_RETURNING_FIRST_SERVE',
  'POINT_WON_RETURNING_SECOND_SERVE',
];

const RALLY_AND_DEFINITION_PHASE: Code[] = [
  'RALLY_1_4',
  'RALLY_5_8',
  'RALLY_9_PLUS',
  'WINNER',
  'UNFORCED_ERROR',
];

// El punto se resolvió en el saque: no hubo rally ni definición.
const ENDS_POINT_ON_SERVE: Code[] = ['ACE', 'DOUBLE_FAULT', 'SERVE_ERROR_OUT', 'SERVE_ERROR_NET'];
// El punto se resolvió en la devolución: no hubo rally ni definición.
const ENDS_POINT_ON_RETURN: Code[] = ['RETURN_ERROR_OUT', 'RETURN_ERROR_NET'];

// Confirman que la pelota sigue en juego después del primer golpe (saque adentro o devolución en
// juego): recién ahí tiene sentido preguntar por el rally y cómo se definió el punto.
const BALL_IN_PLAY: Code[] = ['FIRST_SERVE_IN', 'SECOND_SERVE_IN', 'RETURN_IN_PLAY'];

function buildBlockMap(): Map<Code, Set<Code>> {
  const map = new Map<Code, Set<Code>>();
  const block = (a: Code, b: Code) => {
    if (a === b) return;
    if (!map.has(a)) map.set(a, new Set());
    map.get(a)!.add(b);
  };
  const blockBoth = (a: Code, b: Code) => {
    block(a, b);
    block(b, a);
  };

  for (const group of MUTEX_GROUPS) {
    for (const a of group) {
      for (const b of group) {
        block(a, b);
      }
    }
  }
  for (const [a, b] of CONFLICTS) {
    blockBoth(a, b);
  }
  // Saque y devolución son excluyentes: en cuanto aparece un código de un lado, se apaga el otro
  // entero, porque este jugador sacó o le devolvieron, nunca las dos cosas en el mismo punto.
  for (const serveCode of SERVE_PHASE) {
    for (const returnCode of RETURN_PHASE) {
      blockBoth(serveCode, returnCode);
    }
  }
  for (const ender of ENDS_POINT_ON_SERVE) {
    for (const later of RALLY_AND_DEFINITION_PHASE) {
      blockBoth(ender, later);
    }
  }
  for (const ender of ENDS_POINT_ON_RETURN) {
    for (const later of RALLY_AND_DEFINITION_PHASE) {
      blockBoth(ender, later);
    }
  }
  return map;
}

const BLOCK_MAP = buildBlockMap();

// Los eventos del punto que se está cargando ahora: todo lo que vino después del último punto
// cerrado. Recibe los códigos en el orden en que se cargaron.
export function currentPointCodes(codes: Code[]): Code[] {
  let start = 0;
  codes.forEach((code, index) => {
    if (POINT_ENDERS.includes(code)) {
      start = index + 1;
    }
  });
  return codes.slice(start);
}

// Dado lo ya cargado en el punto actual, qué botones hay que deshabilitar. Incluye los KPIs que ya
// se marcaron (nada se carga dos veces en el mismo punto) y los que quedaron sin sentido.
export function blockedCodes(pointCodes: Code[]): Set<Code> {
  const blocked = new Set<Code>();
  for (const code of pointCodes) {
    blocked.add(code);
    for (const other of BLOCK_MAP.get(code) ?? []) {
      blocked.add(other);
    }
  }
  if (!pointCodes.some((code) => BALL_IN_PLAY.includes(code))) {
    for (const code of RALLY_AND_DEFINITION_PHASE) {
      blocked.add(code);
    }
  }
  return blocked;
}

// Atajo para la pantalla: de la lista completa de eventos del borrador a los códigos bloqueados.
export function blockedForEvents(allCodesInOrder: Code[]): Set<Code> {
  return blockedCodes(currentPointCodes(allCodesInOrder));
}
