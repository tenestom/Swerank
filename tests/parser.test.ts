import { describe, it, expect } from 'vitest';
import { slalomToNumeric } from '../src/components/charts';

// Mock helpers from api.ts since we can import them or write equivalent logic
// Let's duplicate the PB selection helpers here to test their logic
function getBetterSlalom(s1: string | null, s2: string): string {
  if (!s1) return s2;
  
  function parseSlalom(s: string) {
    const clean = s.replace(',', '.').replace('*', '').trim();
    const parts = clean.split('/');
    const buoys = parseFloat(parts[0]) || 0;
    let speed = 55;
    let rope = 18.25;
    if (parts.length === 3) {
      speed = parseFloat(parts[1]) || 55;
      rope = parseFloat(parts[2]) || 18.25;
    } else if (parts.length === 2) {
      const val = parseFloat(parts[1]) || 0;
      if (val <= 25) {
        rope = val;
      } else {
        speed = val;
      }
    }
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

    it('should handle 2-part scores with rope lengths correctly', () => {
      // Example 1: Kajsa (2.5/13) vs Meja (2/13) -> Kajsa is better
      expect(getBetterSlalom('2/13', '2,5/13')).toBe('2,5/13');
      // Example 2: Tengius (1/10.75) vs Edvardsson (3/11.25) -> Tengius is better because of shorter rope
      expect(getBetterSlalom('3/11.25', '1/10.75')).toBe('1/10.75');
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
  if (age >= 22 && age <= 35) return 'Open';
  if (age >= 36 && age <= 45) return '35+';
  if (age >= 46 && age <= 55) return '45+';
  if (age >= 56 && age <= 65) return '55+';
  if (age >= 66 && age <= 70) return '65+';
  if (age >= 71 && age <= 75) return '70+';
  if (age >= 76 && age <= 80) return '75+';
  if (age >= 81 && age <= 85) return '80+';
  return '85+';
}

describe('Age Category Selection by Birth Year', () => {
  it('should map junior age classes correctly', () => {
    expect(getCategoryByAge('2018', 2026)).toBe('U14'); // Age 8
    expect(getCategoryByAge('2015', 2026)).toBe('U14'); // Age 11
    expect(getCategoryByAge('2012', 2026)).toBe('U14'); // Age 14
    expect(getCategoryByAge('2011', 2026)).toBe('U17'); // Age 15
    expect(getCategoryByAge('2005', 2026)).toBe('U21'); // Age 21
  });

  it('should map Open and Senior age classes correctly', () => {
    expect(getCategoryByAge('2004', 2026)).toBe('Open'); // Age 22
    expect(getCategoryByAge('1991', 2026)).toBe('Open'); // Age 35
    expect(getCategoryByAge('1990', 2026)).toBe('35+');  // Age 36
    expect(getCategoryByAge('1980', 2026)).toBe('45+');  // Age 46
    expect(getCategoryByAge('1970', 2026)).toBe('55+');  // Age 56
    expect(getCategoryByAge('1960', 2026)).toBe('65+');  // Age 66
    expect(getCategoryByAge('1955', 2026)).toBe('70+');  // Age 71
    expect(getCategoryByAge('1950', 2026)).toBe('75+');  // Age 76
    expect(getCategoryByAge('1945', 2026)).toBe('80+');  // Age 81
    expect(getCategoryByAge('1940', 2026)).toBe('85+');  // Age 86
  });

  it('should remain correct when moving to next year (dynamic check)', () => {
    // In 2027:
    expect(getCategoryByAge('2013', 2027)).toBe('U14'); // Age 14
    expect(getCategoryByAge('2012', 2027)).toBe('U17'); // Age 15 (promoted from U14 to U17)
    expect(getCategoryByAge('2009', 2027)).toBe('U21'); // Age 18 (promoted from U17 to U21)
    expect(getCategoryByAge('2005', 2027)).toBe('Open'); // Age 22 (promoted from U21 to Open)
    expect(getCategoryByAge('1991', 2027)).toBe('35+');  // Age 36 (promoted from Open to 35+)
  });
});

