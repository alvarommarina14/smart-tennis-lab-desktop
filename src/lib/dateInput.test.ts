import { describe, expect, it } from 'vitest';

import { dmyToIso, isoToDmy, isPastIso, maskDate } from '@/lib/dateInput';

describe('maskDate', () => {
  it('inserts slashes as digits are typed', () => {
    expect(maskDate('1')).toBe('1');
    expect(maskDate('14')).toBe('14');
    expect(maskDate('143')).toBe('14/3');
    expect(maskDate('1403')).toBe('14/03');
    expect(maskDate('140319')).toBe('14/03/19');
    expect(maskDate('14031999')).toBe('14/03/1999');
  });

  it('ignores non digits and caps at eight digits', () => {
    expect(maskDate('14/03/1999')).toBe('14/03/1999');
    expect(maskDate('140319991')).toBe('14/03/1999');
  });
});

describe('dmyToIso', () => {
  it('converts a valid date', () => {
    expect(dmyToIso('14/03/1999')).toBe('1999-03-14');
  });

  it('rejects incomplete or impossible dates', () => {
    expect(dmyToIso('14/03/99')).toBeNull();
    expect(dmyToIso('31/02/1999')).toBeNull();
    expect(dmyToIso('00/01/1999')).toBeNull();
  });
});

describe('isoToDmy', () => {
  it('round trips with dmyToIso', () => {
    expect(isoToDmy('1999-03-14')).toBe('14/03/1999');
    expect(isoToDmy('')).toBe('');
  });
});

describe('isPastIso', () => {
  it('is true for a past date and false for the future', () => {
    expect(isPastIso('1999-03-14')).toBe(true);
    expect(isPastIso('2999-03-14')).toBe(false);
  });
});
