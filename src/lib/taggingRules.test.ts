import { describe, expect, it } from 'vitest';

import { blockedCodes, blockedForEvents, currentPointCodes } from '@/lib/taggingRules';

describe('currentPointCodes', () => {
  it('sin puntos cerrados devuelve todo', () => {
    expect(currentPointCodes(['FIRST_SERVE_IN', 'ACE'])).toEqual(['FIRST_SERVE_IN', 'ACE']);
  });

  it('arranca de nuevo después de POINT_WON', () => {
    expect(
      currentPointCodes(['FIRST_SERVE_IN', 'ACE', 'POINT_WON', 'FIRST_SERVE_OUT'])
    ).toEqual(['FIRST_SERVE_OUT']);
  });

  it('toma el último cierre cuando hay varios puntos', () => {
    expect(
      currentPointCodes([
        'FIRST_SERVE_IN',
        'POINT_WON',
        'FIRST_SERVE_OUT',
        'DOUBLE_FAULT',
        'POINT_LOST',
        'FIRST_SERVE_IN',
      ])
    ).toEqual(['FIRST_SERVE_IN']);
  });
});

describe('blockedCodes — saque', () => {
  it('1er saque IN bloquea 2do saque IN, doble falta y errores de saque', () => {
    const blocked = blockedCodes(['FIRST_SERVE_IN']);
    expect(blocked.has('SECOND_SERVE_IN')).toBe(true);
    expect(blocked.has('DOUBLE_FAULT')).toBe(true);
    expect(blocked.has('SERVE_ERROR_OUT')).toBe(true);
    expect(blocked.has('SERVE_ERROR_NET')).toBe(true);
    expect(blocked.has('FIRST_SERVE_OUT')).toBe(true);
  });

  it('1er saque IN no bloquea el ace ni el resultado del punto', () => {
    const blocked = blockedCodes(['FIRST_SERVE_IN']);
    expect(blocked.has('ACE')).toBe(false);
    expect(blocked.has('POINT_WON')).toBe(false);
    expect(blocked.has('POINT_LOST')).toBe(false);
  });

  it('1er saque IN bloquea toda la devolución: este jugador sacó, no le devolvieron', () => {
    const blocked = blockedCodes(['FIRST_SERVE_IN']);
    expect(blocked.has('RETURN_IN_PLAY')).toBe(true);
    expect(blocked.has('RETURN_ERROR_OUT')).toBe(true);
    expect(blocked.has('RETURN_ERROR_NET')).toBe(true);
    expect(blocked.has('POINT_WON_RETURNING_FIRST_SERVE')).toBe(true);
    expect(blocked.has('POINT_WON_RETURNING_SECOND_SERVE')).toBe(true);
  });

  it('1er saque OUT y 1er saque IN son excluyentes', () => {
    expect(blockedCodes(['FIRST_SERVE_OUT']).has('FIRST_SERVE_IN')).toBe(true);
  });

  it('2do saque IN bloquea doble falta, 1er saque IN y toda la devolución, pero deja seguir el punto', () => {
    const blocked = blockedCodes(['FIRST_SERVE_OUT', 'SECOND_SERVE_IN']);
    expect(blocked.has('DOUBLE_FAULT')).toBe(true);
    expect(blocked.has('FIRST_SERVE_IN')).toBe(true);
    expect(blocked.has('RETURN_IN_PLAY')).toBe(true);
    expect(blocked.has('WINNER')).toBe(false);
  });

  it('1er saque OUT, esperando el segundo, todavía no habilita el rally', () => {
    const blocked = blockedCodes(['FIRST_SERVE_OUT']);
    expect(blocked.has('RETURN_IN_PLAY')).toBe(true);
    expect(blocked.has('RALLY_1_4')).toBe(true);
    expect(blocked.has('WINNER')).toBe(true);
    expect(blocked.has('UNFORCED_ERROR')).toBe(true);
  });

  it('arrancando el punto, sin nada cargado, la devolución está disponible pero el rally no', () => {
    const blocked = blockedCodes([]);
    expect(blocked.has('RETURN_IN_PLAY')).toBe(false);
    expect(blocked.has('FIRST_SERVE_IN')).toBe(false);
    expect(blocked.has('RALLY_5_8')).toBe(true);
  });

  it('doble falta cierra el punto: nada de devolución, rally ni definición', () => {
    const blocked = blockedCodes(['FIRST_SERVE_OUT', 'DOUBLE_FAULT']);
    for (const code of [
      'RETURN_IN_PLAY',
      'RETURN_ERROR_OUT',
      'WINNER',
      'UNFORCED_ERROR',
      'RALLY_1_4',
      'RALLY_5_8',
      'RALLY_9_PLUS',
      'ACE',
    ]) {
      expect(blocked.has(code)).toBe(true);
    }
    expect(blocked.has('POINT_WON')).toBe(false);
    expect(blocked.has('POINT_LOST')).toBe(false);
  });

  it('ace cierra el punto en el saque', () => {
    const blocked = blockedCodes(['FIRST_SERVE_IN', 'ACE']);
    expect(blocked.has('RETURN_IN_PLAY')).toBe(true);
    expect(blocked.has('RALLY_1_4')).toBe(true);
    expect(blocked.has('DOUBLE_FAULT')).toBe(true);
    expect(blocked.has('POINT_WON')).toBe(false);
  });
});

describe('blockedCodes — devolución, rally y cierre', () => {
  it('devolución en juego bloquea los errores de devolución y todo el saque', () => {
    const blocked = blockedCodes(['RETURN_IN_PLAY']);
    expect(blocked.has('RETURN_ERROR_OUT')).toBe(true);
    expect(blocked.has('RETURN_ERROR_NET')).toBe(true);
    expect(blocked.has('RALLY_1_4')).toBe(false);
    expect(blocked.has('FIRST_SERVE_IN')).toBe(true);
    expect(blocked.has('FIRST_SERVE_OUT')).toBe(true);
    expect(blocked.has('ACE')).toBe(true);
  });

  it('error de devolución corta el rally y la definición', () => {
    const blocked = blockedCodes(['RETURN_ERROR_OUT']);
    expect(blocked.has('RALLY_5_8')).toBe(true);
    expect(blocked.has('WINNER')).toBe(true);
    expect(blocked.has('UNFORCED_ERROR')).toBe(true);
    expect(blocked.has('POINT_LOST')).toBe(false);
  });

  it('los tramos de rally son excluyentes entre sí', () => {
    const blocked = blockedCodes(['RALLY_5_8']);
    expect(blocked.has('RALLY_1_4')).toBe(true);
    expect(blocked.has('RALLY_9_PLUS')).toBe(true);
    expect(blocked.has('RALLY_5_8')).toBe(true);
  });

  it('winner y error no forzado son excluyentes', () => {
    expect(blockedCodes(['WINNER']).has('UNFORCED_ERROR')).toBe(true);
    expect(blockedCodes(['UNFORCED_ERROR']).has('WINNER')).toBe(true);
  });

  it('punto ganado y punto perdido son excluyentes', () => {
    expect(blockedCodes(['POINT_WON']).has('POINT_LOST')).toBe(true);
  });

  it('los dos "punto ganado devolviendo" son excluyentes, chocan con punto perdido y con el saque', () => {
    const blocked = blockedCodes(['POINT_WON_RETURNING_FIRST_SERVE']);
    expect(blocked.has('POINT_WON_RETURNING_SECOND_SERVE')).toBe(true);
    expect(blocked.has('POINT_LOST')).toBe(true);
    expect(blocked.has('POINT_WON')).toBe(false);
    expect(blocked.has('FIRST_SERVE_IN')).toBe(true);
  });
});

describe('blockedForEvents', () => {
  it('ignora los puntos ya cerrados y arranca el siguiente con todo disponible', () => {
    const blocked = blockedForEvents(['FIRST_SERVE_IN', 'ACE', 'POINT_WON']);
    expect(blocked.has('FIRST_SERVE_IN')).toBe(false);
    expect(blocked.has('RETURN_IN_PLAY')).toBe(false);
  });

  it('bloquea a partir del punto en curso', () => {
    const blocked = blockedForEvents(['DOUBLE_FAULT', 'POINT_LOST', 'FIRST_SERVE_IN']);
    expect(blocked.has('SECOND_SERVE_IN')).toBe(true);
    expect(blocked.has('DOUBLE_FAULT')).toBe(true);
  });
});
