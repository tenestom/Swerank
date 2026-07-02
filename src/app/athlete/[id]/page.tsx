'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AthleteProfile } from '@/lib/types';
import PerformanceChart, { slalomToNumeric } from '@/components/charts';
import { 
  User, 
  MapPin, 
  Tag, 
  Building, 
  Award,
  ArrowLeft,
  Calendar,
  History,
  TrendingUp,
  RefreshCw,
  TrendingDown
} from 'lucide-react';

export default function AthleteDetail() {
  const router = useRouter();
  const { id } = useParams();
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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

  // Prepare chart data for Slalom
  const slalomData = profile.performances
    .filter(p => p.category.toLowerCase().includes('slalom'))
    .map(p => {
      // Find the best round score in this performance
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
        date: p.dateStr.split(' ').slice(-2).join(' '), // Short date e.g. "Aug 2006" or "2026"
        compName: p.compName,
        rawValue: bestRoundScore,
        value: bestNumeric
      };
    });

  // Prepare chart data for Tricks
  const tricksData = profile.performances
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
  const jumpData = profile.performances
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

      {/* Personal Bests */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold border-l-4 border-secondary pl-3">Personliga Rekord</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Slalom PB */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-2 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">Slalom PB</p>
              <h3 className="text-2xl font-black text-primary mt-1">
                {profile.personalBests.slalom || 'Ej registrerat'}
              </h3>
            </div>
            <p className="text-xs text-muted leading-relaxed mt-2">
              Bästa slalomresultat registrerat i IWWF EMS.
            </p>
          </div>

          {/* Tricks PB */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-2 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">Trick PB</p>
              <h3 className="text-2xl font-black text-primary mt-1">
                {profile.personalBests.tricks ? `${profile.personalBests.tricks} poäng` : 'Ej registrerat'}
              </h3>
            </div>
            <p className="text-xs text-muted leading-relaxed mt-2">
              Högsta trickpoäng registrerat i IWWF EMS.
            </p>
          </div>

          {/* Jump PB */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-2 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">Hopp PB</p>
              <h3 className="text-2xl font-black text-primary mt-1">
                {profile.personalBests.jump ? `${profile.personalBests.jump} meter` : 'Ej registrerat'}
              </h3>
            </div>
            <p className="text-xs text-muted leading-relaxed mt-2">
              Längsta hoppet registrerat i IWWF EMS.
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
          Tävlingshistorik
        </h2>
        
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          {profile.performances.length === 0 ? (
            <div className="p-8 text-center text-muted">
              Inga tävlingsresultat registrerade.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted-bg border-b border-border">
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted">Datum</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted">Tävling</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted">Kod</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted">Land</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted">Klass / Gren</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted">Plac.</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted">Åk 1 (R1)</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted">Åk 2 (R2)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {profile.performances.map((perf, idx) => (
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
                      <td className="p-4 text-sm font-mono text-muted">
                        {perf.compCode}
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
