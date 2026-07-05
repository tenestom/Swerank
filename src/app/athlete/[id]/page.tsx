'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AthleteProfile, AthletePerformance } from '@/lib/types';
import PerformanceChart, { slalomToNumeric } from '@/components/charts';
import { 
  User, 
  Building, 
  Tag, 
  ArrowLeft,
  History,
  RefreshCw,
  Award,
  Filter,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import HomologationToggle from '@/components/HomologationToggle';

// Client-side score comparison helpers
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
      return p1.rope < p2.rope ? s1 : s2; // Shorter rope length is better
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

export default function AthleteDetail() {
  const router = useRouter();
  const { id } = useParams();
  
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Toggle state: default is ONLY homologated
  const [onlyHomologated, setOnlyHomologated] = useState<boolean>(true);

  const fetchProfile = async (forceRefresh = false) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/athlete/${id}${forceRefresh ? '?force=true' : ''}`);
      if (!res.ok) {
        throw new Error('Misslyckades att hämta åkarprofil.');
      }
      const json = await res.json();
      setProfile(json.data);
    } catch (err: any) {
      setError(err.message || 'Ett fel uppstod vid hämtning av åkarprofil.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  useEffect(() => {
    const saved = localStorage.getItem('swerank_homologated_only');
    if (saved !== null) {
      setOnlyHomologated(saved === 'true');
    }

    const handleSync = () => {
      const updated = localStorage.getItem('swerank_homologated_only');
      if (updated !== null) {
        setOnlyHomologated(updated === 'true');
      }
    };
    
    window.addEventListener('storage', handleSync);
    window.addEventListener('swerank_homologation_sync', handleSync);
    
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('swerank_homologation_sync', handleSync);
    };
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center text-muted flex flex-col items-center justify-center gap-3 min-h-[60vh] animate-pulse">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <span>Hämtar åkarprofil och tävlingshistorik från IWWF EMS...</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-12 text-center text-red-500 space-y-4 max-w-md mx-auto min-h-[50vh] flex flex-col justify-center">
        <p className="font-bold text-xl">Profilen kunde inte laddas</p>
        <p className="text-sm text-muted">{error || 'Åkarprofilen saknas.'}</p>
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-card border border-border hover:bg-muted-bg transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Gå tillbaka
        </button>
      </div>
    );
  }

  // Filter performances based on the toggle
  const displayPerformances = onlyHomologated
    ? profile.performances.filter(p => p.homologated)
    : profile.performances;

  // Dynamically calculate Personal Bests (PB) on the client side
  let pbSlalom: string | null = null;
  let pbTricks: string | null = null;
  let pbJump: string | null = null;

  for (const perf of displayPerformances) {
    const isSlalom = perf.category.toLowerCase().includes('slalom');
    const isTricks = perf.category.toLowerCase().includes('tricks');
    const isJump = perf.category.toLowerCase().includes('jump') || perf.category.toLowerCase().includes('hopp');

    for (const score of perf.rounds) {
      if (isSlalom) {
        pbSlalom = getBetterSlalom(pbSlalom, score);
      } else if (isTricks) {
        pbTricks = getBetterTricks(pbTricks, score);
      } else if (isJump) {
        pbJump = getBetterJump(pbJump, score);
      }
    }
  }

  // Prepare chart data for Slalom
  const slalomData = displayPerformances
    .filter(p => p.category.toLowerCase().includes('slalom'))
    .map(p => {
      let bestRoundScore = '0';
      let bestNumeric = 0;
      for (const roundScore of p.rounds) {
        const num = slalomToNumeric(roundScore);
        if (num > bestNumeric) {
          bestNumeric = num;
          bestRoundScore = roundScore;
        }
      }
      return {
        date: p.dateStr.split(' ').slice(-2).join(' '),
        compName: p.compName,
        rawValue: bestRoundScore,
        value: bestNumeric
      };
    });

  // Prepare chart data for Tricks
  const tricksData = displayPerformances
    .filter(p => p.category.toLowerCase().includes('trick'))
    .map(p => {
      let bestRoundScore = '0';
      let bestNumeric = 0;
      for (const roundScore of p.rounds) {
        const num = parseInt(roundScore, 10) || 0;
        if (num > bestNumeric) {
          bestNumeric = num;
          bestRoundScore = roundScore;
        }
      }
      return {
        date: p.dateStr.split(' ').slice(-2).join(' '),
        compName: p.compName,
        rawValue: bestRoundScore,
        value: bestNumeric
      };
    });

  // Prepare chart data for Jump
  const jumpData = displayPerformances
    .filter(p => p.category.toLowerCase().includes('jump') || p.category.toLowerCase().includes('hopp'))
    .map(p => {
      let bestRoundScore = '0';
      let bestNumeric = 0;
      for (const roundScore of p.rounds) {
        const num = parseFloat(roundScore) || 0;
        if (num > bestNumeric) {
          bestNumeric = num;
          bestRoundScore = roundScore;
        }
      }
      return {
        date: p.dateStr.split(' ').slice(-2).join(' '),
        compName: p.compName,
        rawValue: bestRoundScore,
        value: bestNumeric
      };
    });

  const hasSlalom = slalomData.length > 0;
  const hasTricks = tricksData.length > 0;
  const hasJump = jumpData.length > 0;

  return (
    <div className="space-y-8 py-4 animate-fade-in">
      {/* Back Button & Action Controls */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg bg-card border border-border hover:bg-muted-bg transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Tillbaka
        </button>
        <button
          onClick={() => fetchProfile(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg bg-card border border-border hover:bg-muted-bg transition-colors"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Tvinga Omladdning
        </button>
      </div>

      {/* Athlete Header Card */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-primary/10 text-primary rounded-2xl hidden sm:block">
            <User className="h-10 w-10" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">{profile.name}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="flex items-center gap-1">
                <Building className="h-4 w-4 text-primary" />
                {profile.club || 'Okänd Klubb'}
              </span>
              <span className="flex items-center gap-1">
                <Tag className="h-4 w-4 text-primary" />
                Licenskod: {profile.code || 'Saknas'}
              </span>
              <span className="flex items-center gap-1 font-semibold">
                Kön: {profile.gender === 'Female' ? 'Dam (F)' : 'Herr (M)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Homologation Toggle */}
      <HomologationToggle />

      {/* Personal Bests */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold border-l-4 border-secondary pl-3">Personliga Rekord</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Slalom PB */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-2 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">Slalom PB</p>
              <h3 className="text-2xl font-black text-primary mt-1">
                {pbSlalom || 'Ej registrerat'}
              </h3>
            </div>
            <p className="text-xs text-muted leading-relaxed mt-2">
              Bästa slalomresultat i valda tävlingar.
            </p>
          </div>

          {/* Tricks PB */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-2 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">Trick PB</p>
              <h3 className="text-2xl font-black text-primary mt-1">
                {pbTricks ? `${pbTricks} poäng` : 'Ej registrerat'}
              </h3>
            </div>
            <p className="text-xs text-muted leading-relaxed mt-2">
              Högsta trickpoäng i valda tävlingar.
            </p>
          </div>

          {/* Jump PB */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-2 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">Hopp PB</p>
              <h3 className="text-2xl font-black text-primary mt-1">
                {pbJump ? `${pbJump} meter` : 'Ej registrerat'}
              </h3>
            </div>
            <p className="text-xs text-muted leading-relaxed mt-2">
              Längsta hoppet i valda tävlingar.
            </p>
          </div>
        </div>
      </div>

      {/* Performance Trend Charts */}
      {(hasSlalom || hasTricks || hasJump) && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold border-l-4 border-secondary pl-3">Prestationstrender</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {hasSlalom && (
              <PerformanceChart 
                data={slalomData} 
                title="Slalomutveckling" 
                yLabel="Bojpoäng" 
              />
            )}
            {hasTricks && (
              <PerformanceChart 
                data={tricksData} 
                title="Tricksutveckling" 
                yLabel="Poäng" 
              />
            )}
            {hasJump && (
              <PerformanceChart 
                data={jumpData} 
                title="Hopputveckling" 
                yLabel="Meter" 
              />
            )}
          </div>
        </div>
      )}

      {/* Competition History Table */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold border-l-4 border-secondary pl-3 flex items-center gap-2">
          <History className="h-5 w-5 text-muted" />
          Tävlingshistorik ({displayPerformances.length} resultat)
        </h2>
        
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          {displayPerformances.length === 0 ? (
            <div className="p-12 text-center text-muted">
              Inga tävlingsresultat matchar valda filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted-bg border-b border-border">
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted">Datum</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted">Tävling</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted">Kod / Status</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted">Land</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted">Klass / Gren</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted">Plac.</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted">Åk 1 (R1)</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted">Åk 2 (R2)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayPerformances.map((perf, idx) => (
                    <tr 
                      key={perf.compCode + idx} 
                      className="hover:bg-muted-bg/50 transition-colors duration-150"
                    >
                      <td className="p-4 text-sm font-medium text-muted truncate whitespace-nowrap">
                        {perf.dateStr}
                      </td>
                      <td className="p-4">
                        <a 
                          href={perf.compUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="font-semibold text-sm text-primary hover:underline"
                        >
                          {perf.compName}
                        </a>
                      </td>
                      <td className="p-4 text-sm">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-muted text-xs">{perf.compCode}</span>
                          {perf.homologated ? (
                            <span className="inline-flex items-center max-w-fit px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                              Homologerad (RL)
                            </span>
                          ) : (
                            <span className="inline-flex items-center max-w-fit px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-500/10 text-slate-500 border border-slate-500/20">
                              <HelpCircle className="h-2.5 w-2.5 mr-0.5" />
                              Klubb/Nationell
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted">
                        {perf.country}
                      </td>
                      <td className="p-4 text-sm font-semibold">
                        {perf.category}
                      </td>
                      <td className="p-4 text-sm font-bold">
                        {perf.rank || '-'}
                      </td>
                      <td className="p-4 text-sm font-semibold">
                        {perf.rounds[0] || '-'}
                      </td>
                      <td className="p-4 text-sm font-semibold">
                        {perf.rounds[1] || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
