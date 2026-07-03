import { describe, it, expect } from 'vitest';
import { slalomToNumeric } from '../src/components/charts';

// Mock helpers from api.ts since we can import them or write equivalent logic
// Let's duplicate the PB selection helpers here to test their logic
function getBetterSlalom(s1: string | null, s2: string): string {
  if (!s1) return s2;
  
  function parseSlalom(s: string) {
    const clean = s.replace(',', '.');
    const parts = clean.split('/');
    const buoys = parseFloat(parts[0]) || 0;
    const speed = parseFloat(parts[1]) || 0;
    const rope = parts[2] ? parseFloat(parts[2]) : 18.25;
    return { buoys, speed, rope };
  }

  try {
    const p1 = parseSlalom(s1);
    const p2 = parseSlalom(s2);

    if (p1.speed !== p2.speed) {
      return p1.speed > p2.speed ? s1 : s2;
    }
    if (p1.rope !== p2.rope) {
      return p1.rope < p2.rope ? s1 : s2; // smaller rope length is better
    }
    return p1.buoys >= p2.buoys ? s1 : s2;
  } catch (e) {
    return s1;
  }
}

function getBetterTricks(s1: string | null, s2: string): string {
  if (!s1) return s2;
  const t1 = parseInt(s1, 10) || 0;
  const t2 = parseInt(s2, 10) || 0;
  return t1 >= t2 ? s1 : s2;
}

function getBetterJump(s1: string | null, s2: string): string {
  if (!s1) return s2;
  const j1 = parseFloat(s1.replace(',', '.')) || 0;
  const j2 = parseFloat(s2.replace(',', '.')) || 0;
  return j1 >= j2 ? s1 : s2;
}

describe('Slalom Score Conversion to Numeric Value', () => {
  it('should prioritize higher speed', () => {
    const scoreLowSpeed = slalomToNumeric('6.00/55/18.25');
    const scoreHighSpeed = slalomToNumeric('1.00/58/18.25');
    expect(scoreHighSpeed).toBeGreaterThan(scoreLowSpeed);
  });

  it('should prioritize shorter rope lengths at the same speed', () => {
    const longRope = slalomToNumeric('6.00/58/18.25');
    const shortRope = slalomToNumeric('1.00/58/16.00');
    expect(shortRope).toBeGreaterThan(longRope);
  });

  it('should prioritize higher buoy counts at the same speed and rope', () => {
    const fewBuoys = slalomToNumeric('2.50/58/13.00');
    const manyBuoys = slalomToNumeric('4.00/58/13.00');
    expect(manyBuoys).toBeGreaterThan(fewBuoys);
  });

  it('should handle decimal commas correctly in slalomToNumeric', () => {
    const dotScore = slalomToNumeric('3.50/58/13.00');
    const commaScore = slalomToNumeric('3,50/58/13.00');
    expect(commaScore).toBe(dotScore);
  });
});

describe('Personal Bests Selection Helpers', () => {
  describe('Slalom PBs', () => {
    it('should select the score with higher speed', () => {
      expect(getBetterSlalom('6.00/55/18.25', '1.00/58/18.25')).toBe('1.00/58/18.25');
    });

    it('should select the score with shorter rope length', () => {
      expect(getBetterSlalom('6.00/58/18.25', '1.00/58/16.00')).toBe('1.00/58/16.00');
      expect(getBetterSlalom('3.50/58/13.00', '1.50/58/12.00')).toBe('1.50/58/12.00');
    });

    it('should select the score with more buoys if speed and rope match', () => {
      expect(getBetterSlalom('2.50/58/12.00', '4.00/58/12.00')).toBe('4.00/58/12.00');
    });

    it('should handle decimal commas correctly in slalom', () => {
      expect(getBetterSlalom('3.00/58/18.25', '3,50/58/18.25')).toBe('3,50/58/18.25');
      expect(getBetterSlalom('3,50/58/18.25', '3.00/58/18.25')).toBe('3,50/58/18.25');
    });
  });

  describe('Tricks PBs', () => {
    it('should select the higher integer score', () => {
      expect(getBetterTricks('2800', '3500')).toBe('3500');
      expect(getBetterTricks('4200', '1900')).toBe('4200');
    });
  });

  describe('Jump PBs', () => {
    it('should select the longer jump distance', () => {
      expect(getBetterJump('28.5', '32.1')).toBe('32.1');
      expect(getBetterJump('41.20', '39.80')).toBe('41.20');
    });

    it('should handle decimal commas correctly in jump', () => {
      expect(getBetterJump('25,2', '25.0')).toBe('25,2');
      expect(getBetterJump('25.0', '25,2')).toBe('25,2');
    });
  });
});

function getCategoryByAge(yobStr: string, refYear: number): string {
  const yob = parseInt(yobStr, 10);
  if (isNaN(yob)) return 'Open';
  const age = refYear - yob;
  if (age <= 14) return 'U14';
  if (age >= 15 && age <= 17) return 'U17';
  if (age >= 18 && age <= 21) return 'U21';
  return 'Open';
}

describe('Age Category Selection by Birth Year', () => {
  it('should map age <= 14 to U14', () => {
    expect(getCategoryByAge('2012', 2026)).toBe('U14'); // Age 14
    expect(getCategoryByAge('2015', 2026)).toBe('U14'); // Age 11 (U12)
    expect(getCategoryByAge('2018', 2026)).toBe('U14'); // Age 8 (U10)
  });

  it('should map age 15-17 to U17', () => {
    expect(getCategoryByAge('2011', 2026)).toBe('U17'); // Age 15
    expect(getCategoryByAge('2009', 2026)).toBe('U17'); // Age 17
  });

  it('should map age 18-21 to U21', () => {
    expect(getCategoryByAge('2008', 2026)).toBe('U21'); // Age 18
    expect(getCategoryByAge('2005', 2026)).toBe('U21'); // Age 21
  });

  it('should map age >= 22 to Open', () => {
    expect(getCategoryByAge('2004', 2026)).toBe('Open'); // Age 22
    expect(getCategoryByAge('1990', 2026)).toBe('Open'); // Age 36 (35+)
    expect(getCategoryByAge('1975', 2026)).toBe('Open'); // Age 51 (45+)
  });

  it('should remain correct when moving to next year (dynamic check)', () => {
    // In 2027:
    expect(getCategoryByAge('2013', 2027)).toBe('U14'); // Age 14
    expect(getCategoryByAge('2012', 2027)).toBe('U17'); // Age 15 (promoted from U14 to U17)
    expect(getCategoryByAge('2009', 2027)).toBe('U21'); // Age 18 (promoted from U17 to U21)
    expect(getCategoryByAge('2005', 2027)).toBe('Open'); // Age 22 (promoted from U21 to Open)
  });
});

