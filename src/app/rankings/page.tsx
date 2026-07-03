'use client';

import { useState, useEffect, Suspense, startTransition, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { RankingEntry } from '@/lib/types';
import HomologationToggle from '@/components/HomologationToggle';
import { 
  Trophy, 
  Search, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  RefreshCw,
  User,
  Users
} from 'lucide-react';

function getBetterSlalom(s1: string | null, s2: string): string {
  if (!s1) return s2;
  
  function parseSlalom(s: string) {
    const parts = s.split('/');
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
      return p1.rope < p2.rope ? s1 : s2;
    }
    return p1.buoys >= p2.buoys ? s1 : s2;
  } catch (e) {
    return s1;
  }
}

function RankingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Read active discipline from URL query params (default: slalom)
  const initialDiscipline = searchParams.get('discipline') || 'slalom';
  
  const [discipline, setDiscipline] = useState<string>(initialDiscipline);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtering States
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Sorting States
  const [sortColumn, setSortColumn] = useState<keyof RankingEntry>('rank');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [onlyHomologated, setOnlyHomologated] = useState<boolean>(true);

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

  useEffect(() => {
    // Sync state with URL parameter if it changes
    const d = searchParams.get('discipline') || 'slalom';
    setDiscipline(d);
  }, [searchParams]);

  // Fetch rankings
  const fetchRankings = async (discName: string, forceRefresh: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rankings?discipline=${discName}${forceRefresh ? '&force=true' : ''}`);
      if (!res.ok) {
        throw new Error('Misslyckades att hämta rankinglistan.');
      }
      const json = await res.json();
      setRankings(json.data || []);
    } catch (err: any) {
      setError(err.message || 'Ett oväntat fel uppstod.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings(discipline);
  }, [discipline]);

  // Switch discipline tab
  const handleDisciplineChange = (newDisc: string) => {
    startTransition(() => {
      setDiscipline(newDisc);
      const params = new URLSearchParams(window.location.search);
      params.set('discipline', newDisc);
      router.push(`/rankings?${params.toString()}`);
    });
  };

  // Sort handler
  const handleSort = (column: keyof RankingEntry) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Recalculate ranks client-side based on the homologation setting
  const processedRankings = useMemo(() => {
    // Group by gender and category
    const groups: Record<string, RankingEntry[]> = {};
    rankings.forEach(entry => {
      const key = `${entry.gender}_${entry.category}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push({ ...entry });
    });

    const result: RankingEntry[] = [];
    Object.keys(groups).forEach(key => {
      const groupEntries = groups[key];
      
      // Sort group entries by their active scores
      groupEntries.sort((a, b) => {
        const scoreA1 = onlyHomologated ? a.score1 : a.allScore1;
        const scoreB1 = onlyHomologated ? b.score1 : b.allScore1;
        const scoreA2 = onlyHomologated ? a.score2 : a.allScore2;
        const scoreB2 = onlyHomologated ? b.score2 : b.allScore2;

        if (discipline === 'slalom') {
          const better = getBetterSlalom(scoreA1, scoreB1);
          if (better === scoreA1 && better !== scoreB1) return -1;
          if (better === scoreB1 && better !== scoreA1) return 1;
          
          const better2 = getBetterSlalom(scoreA2, scoreB2);
          if (better2 === scoreA2 && better2 !== scoreB2) return -1;
          if (better2 === scoreB2 && better2 !== scoreA2) return 1;
          return 0;
        } else if (discipline === 'tricks') {
          const aVal = parseInt(scoreA1, 10) || 0;
          const bVal = parseInt(scoreB1, 10) || 0;
          if (aVal !== bVal) return bVal - aVal;
          
          const aVal2 = parseInt(scoreA2, 10) || 0;
          const bVal2 = parseInt(scoreB2, 10) || 0;
          return bVal2 - aVal2;
        } else {
          const aVal = parseFloat(scoreA1) || 0;
          const bVal = parseFloat(scoreB1) || 0;
          if (aVal !== bVal) return bVal - aVal;
          
          const aVal2 = parseFloat(scoreA2) || 0;
          const bVal2 = parseFloat(scoreB2) || 0;
          return bVal2 - aVal2;
        }
      });

      // Re-assign ranks and align bestScore property
      groupEntries.forEach((entry, idx) => {
        entry.rank = idx + 1;
        entry.bestScore = onlyHomologated ? entry.score1 : entry.allScore1;
        result.push(entry);
      });
    });

    return result;
  }, [rankings, onlyHomologated, discipline]);

  // Perform filtering
  const filteredRankings = processedRankings.filter((entry) => {
    // Gender Filter
    const matchesGender = 
      genderFilter === 'all' || 
      entry.gender === genderFilter;

    // Category Class Filter
    const matchesClass = 
      classFilter === 'all' || 
      entry.category.toUpperCase() === classFilter.toUpperCase();

    // Search Query (filters by Name or Club)
    const matchesSearch = 
      entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.club && entry.club.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesGender && matchesClass && matchesSearch;
  });

  // Perform sorting
  const sortedRankings = [...filteredRankings].sort((a, b) => {
    let aValue = a[sortColumn];
    let bValue = b[sortColumn];

    // Handle null values
    if (aValue === null || aValue === undefined) aValue = '';
    if (bValue === null || bValue === undefined) bValue = '';

    // Numeric comparison if applicable
    if (sortColumn === 'rank' || sortColumn === 'yob') {
      const aNum = parseInt(aValue as string, 10) || 9999;
      const bNum = parseInt(bValue as string, 10) || 9999;
      return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
    }

    // String comparison
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();

    if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
    if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const getSortIcon = (column: keyof RankingEntry) => {
    if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-3 w-3 text-primary" /> 
      : <ArrowDown className="h-3 w-3 text-primary" />;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-2">
            <Trophy className="h-7 w-7 text-secondary" />
            Svensk Rankinglista
          </h1>
          <p className="text-sm text-muted">
            Ställning baserad på åkarnas två bästa resultat under de senaste 12 månaderna.
          </p>
        </div>
        <button
          onClick={() => fetchRankings(discipline, true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-card border border-border hover:bg-muted-bg transition-colors"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Uppdatera
        </button>
      </div>

      {/* Discipline Tabs */}
      <div className="flex border-b border-border">
        {['slalom', 'tricks', 'jump'].map((tab) => (
          <button
            key={tab}
            onClick={() => handleDisciplineChange(tab)}
            className={`flex-1 sm:flex-none px-6 py-3 font-semibold text-sm capitalize border-b-2 transition-all duration-200 ${
              discipline === tab
                ? 'border-primary text-primary dark:text-primary'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            {tab === 'jump' ? 'Hopp' : tab === 'tricks' ? 'Trick' : tab}
          </button>
        ))}
      </div>

      <HomologationToggle showNote={true} />

      {/* Filtering Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-card border border-border p-4 rounded-xl shadow-sm">
        {/* Search */}
        <div className="relative col-span-1 sm:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Sök på åkare eller klubb..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Gender Filter */}
        <div>
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">Alla Kön</option>
            <option value="M">Herrar (Men)</option>
            <option value="F">Damer (Women)</option>
          </select>
        </div>

        {/* Class Filter */}
        <div>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">Alla Klasser</option>
            <option value="U14">U14</option>
            <option value="U17">U17</option>
            <option value="U21">U21</option>
            <option value="Open">Open</option>
          </select>
        </div>
      </div>

      {/* Rankings Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <span>Hämtar rankingsiffror från IWWF EMS...</span>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-500 space-y-2">
            <p className="font-bold">Ett fel uppstod</p>
            <p className="text-sm">{error}</p>
            <button
              onClick={() => fetchRankings(discipline)}
              className="mt-4 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors"
            >
              Försök igen
            </button>
          </div>
        ) : sortedRankings.length === 0 ? (
          <div className="p-12 text-center text-muted">
            Inga åkare hittades som matchar de angivna filtren.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted-bg border-b border-border sticky-header">
                  <th 
                    onClick={() => handleSort('rank')}
                    className="p-4 text-xs font-bold uppercase tracking-wider text-muted cursor-pointer hover:bg-border/50 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Rank {getSortIcon('rank')}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('name')}
                    className="p-4 text-xs font-bold uppercase tracking-wider text-muted cursor-pointer hover:bg-border/50 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Namn {getSortIcon('name')}
                    </div>
                  </th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted select-none">
                    Klass
                  </th>

                  <th 
                    onClick={() => handleSort('yob')}
                    className="p-4 text-xs font-bold uppercase tracking-wider text-muted cursor-pointer hover:bg-border/50 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Född {getSortIcon('yob')}
                    </div>
                  </th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted select-none">
                    Bästa score
                  </th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted select-none">
                    Resultat 1 (Tävling)
                  </th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted select-none">
                    Resultat 2 (Tävling)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedRankings.map((entry, idx) => {
                  const activeScore1 = onlyHomologated ? entry.score1 : entry.allScore1;
                  const activeScore2 = onlyHomologated ? entry.score2 : entry.allScore2;
                  const activeComp1Code = onlyHomologated ? entry.comp1Code : entry.allComp1Code;
                  const activeComp1Name = onlyHomologated ? entry.comp1Name : entry.allComp1Name;
                  const activeComp2Code = onlyHomologated ? entry.comp2Code : entry.allComp2Code;
                  const activeComp2Name = onlyHomologated ? entry.comp2Name : entry.allComp2Name;
                  
                  const hasTwoScores = activeScore2 && activeScore2 !== '-';
                  return (
                    <tr 
                      key={entry.athleteId + idx} 
                      className="hover:bg-muted-bg/50 transition-colors duration-150 animate-fade-in"
                    >
                      <td className="p-4 font-bold text-sm">
                        {entry.rank || idx + 1}
                      </td>
                      <td className="p-4">
                        <Link 
                          href={`/athlete/${entry.athleteId}`} 
                          className="font-bold text-sm text-primary hover:underline"
                        >
                          {entry.name}
                        </Link>
                      </td>
                      <td className="p-4 text-sm font-medium">
                        {entry.category}
                      </td>

                      <td className="p-4 text-sm text-muted">
                        {entry.yob}
                      </td>
                      <td className="p-4 font-bold text-sm">
                        {activeScore1}
                      </td>
                      <td className="p-4 text-sm">
                        <div className="flex flex-col">
                          <span className="font-semibold">{activeScore1}</span>
                          <span className="text-xs text-muted max-w-[150px] truncate" title={activeComp1Name || activeComp1Code}>
                            {activeComp1Name || activeComp1Code}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-sm">
                        {hasTwoScores ? (
                          <div className="flex flex-col">
                            <span className="font-semibold">{activeScore2}</span>
                            <span className="text-xs text-muted max-w-[150px] truncate" title={activeComp2Name || activeComp2Code}>
                              {activeComp2Name || activeComp2Code}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted text-xs italic">Ej tillgängligt</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Rankings() {
  return (
    <Suspense fallback={
      <div className="p-12 text-center text-muted flex flex-col items-center justify-center gap-3 animate-pulse">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <span>Laddar rankinggränssnitt...</span>
      </div>
    }>
      <RankingsContent />
    </Suspense>
  );
}
