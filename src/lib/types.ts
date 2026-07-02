export interface Athlete {
  id: string;
  fullName: string;
  code: string;
  gender: 'M' | 'F';
  yob: string;
  club: string | null;
  favDisciplines: string[];
}

export interface Competition {
  id: string;
  name: string;
  code: string;
  dateStr: string;
  siteName: string;
  countryAbbr: string;
  homologation: string;
}

export interface RankingEntry {
  rank: number;
  worldRank: string;
  athleteId: string;
  name: string;
  federation: string;
  category: string;
  yob: string;
  comp1Code: string;
  score1: string;
  comp2Code: string;
  score2: string;
  club: string | null;
  athleteCode: string | null;
  bestScore: string;
}

export interface PerformanceRound {
  round: string;
  score: string;
}

export interface AthletePerformance {
  discipline: string;
  compCode: string;
  compName: string;
  compUrl: string;
  dateStr: string;
  country: string;
  category: string;
  rank: string;
  rounds: string[];
}

export interface AthleteProfile {
  id: string;
  name: string;
  code: string;
  gender: string;
  club: string | null;
  performances: AthletePerformance[];
  personalBests: {
    slalom: string | null;
    tricks: string | null;
    jump: string | null;
  };
}
