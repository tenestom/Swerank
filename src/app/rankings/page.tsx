'use client';

import { useState, useEffect, Suspense, startTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { RankingEntry } from '@/lib/types';
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

  // Perform filtering
  const filteredRankings = rankings.filter((entry) => {
    // Gender Filter
    const entryGender = entry.category.toLowerCase().includes('women') || entry.category.toLowerCase().includes(' f ') || entry.category.toLowerCase().includes('female') || entry.category.toLowerCase().includes('damer') ? 'F' : 'M';
    // Wait, let's look at the parsed category name or gender.
    // In our parser we set the gender on the entry from athletes list if matched, or we can parse from category
    // Let's check entry.category: e.g. "Open Men Slalom July 2026", "Under 14 Women Slalom July 2026"
    // Wait! Let's check the category string: "Under 14", "Open", etc. It has classFilter category
    const matchesGender = 
      genderFilter === 'all' || 
      (genderFilter === 'M' && (entry.category.toLowerCase().includes('men') || !entry.category.toLowerCase().includes('women'))) ||
      (genderFilter === 'F' && entry.category.toLowerCase().includes('women'));

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
                    onClick={() => handleSort('club')}
                    className="p-4 text-xs font-bold uppercase tracking-wider text-muted cursor-pointer hover:bg-border/50 select-none"
                  >
                    <div className="flex items-center gap-1">
                      Klubb {getSortIcon('club')}
                    </div>
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
                    Resultat 1 (Kod)
                  </th>
                  <th className="p-4 text-xs font-bold uppercase tracking-wider text-muted select-none">
                    Resultat 2 (Kod)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedRankings.map((entry, idx) => {
                  const hasTwoScores = entry.score2 && entry.score2 !== '-';
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
                        {entry.club || 'Okänd klubb'}
                      </td>
                      <td className="p-4 text-sm text-muted">
                        {entry.yob}
                      </td>
                      <td className="p-4 font-bold text-sm">
                        {entry.bestScore}
                      </td>
                      <td className="p-4 text-sm">
                        <div className="flex flex-col">
                          <span className="font-semibold">{entry.score1}</span>
                          <span className="text-xs text-muted font-mono">{entry.comp1Code}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm">
                        {hasTwoScores ? (
                          <div className="flex flex-col">
                            <span className="font-semibold">{entry.score2}</span>
                            <span className="text-xs text-muted font-mono">{entry.comp2Code}</span>
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
