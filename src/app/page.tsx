import Link from 'next/link';
import { fetchSwedishAthletes, fetchCalendar } from '@/lib/api';
import { getCache, setCache } from '@/lib/cache';
import { Trophy, Calendar, Users, ChevronRight, Activity, Zap } from 'lucide-react';

// Force dynamic so it computes live stats on page load (unless cached)
export const dynamic = 'force-dynamic';

export default async function Home() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Rolling 12 months dates
  const startDate = `01/${currentMonth.toString().padStart(2, '0')}/${currentYear - 1}`;
  const endDate = `${new Date(currentYear, currentMonth, 0).getDate()}/${currentMonth.toString().padStart(2, '0')}/${currentYear}`;

  let athletesCount = 0;
  let compsCount = 0;
  let lastUpdate = now.toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' });
  let fetchSource = 'network';

  const cacheKey = 'home_stats';
  interface CachedStats {
    athletesCount: number;
    compsCount: number;
    lastUpdate: string;
  }
  const cached = getCache<CachedStats>(cacheKey);

  if (cached) {
    athletesCount = cached.athletesCount;
    compsCount = cached.compsCount;
    lastUpdate = cached.lastUpdate;
    fetchSource = 'cache';
  } else {
    try {
      // Fetch in parallel
      const [athletes, calendar] = await Promise.all([
        fetchSwedishAthletes().catch(() => ({})),
        fetchCalendar(startDate, endDate).catch(() => ({}))
      ]);
      
      athletesCount = Object.keys(athletes).length;
      compsCount = Object.keys(calendar).length;
      lastUpdate = new Date().toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'medium' });

      // Cache stats for 10 minutes (600,000 ms)
      setCache(cacheKey, { athletesCount, compsCount, lastUpdate }, 600000);
    } catch (e) {
      console.error('Error fetching home stats:', e);
    }
  }

  const disciplines = [
    {
      id: 'slalom',
      name: 'Slalom',
      description: 'Hitta vem som rundat flest bojar på de kortaste linorna. Svensk rankingserie för herrar och damer.',
      color: 'from-blue-500/10 to-indigo-500/10 hover:border-blue-500 dark:hover:border-blue-400'
    },
    {
      id: 'tricks',
      name: 'Trick',
      description: 'Teknik och finess på högsta nivå. Se ställningen i trickranking för alla åldersklasser.',
      color: 'from-amber-500/10 to-orange-500/10 hover:border-amber-500 dark:hover:border-amber-400'
    },
    {
      id: 'jump',
      name: 'Hopp',
      description: 'Längd, mod och kraft över hoppet. Se vem som flyger längst i de svenska vattnen.',
      color: 'from-emerald-500/10 to-teal-500/10 hover:border-emerald-500 dark:hover:border-emerald-400'
    }
  ];

  return (
    <div className="space-y-10 py-4 animate-fade-in">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-sky-400 dark:to-blue-400 bg-clip-text text-transparent">
          Svensk Vattenskidranking
        </h1>
        <p className="text-lg text-muted font-medium">
          Inofficiell svensk ranking
        </p>
        
        {/* Rolling Banner */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted-bg text-sm font-semibold border border-border">
          <Calendar className="h-4 w-4 text-primary" />
          <span>Aktiv Rankingperiod: {startDate} &mdash; {endDate}</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow duration-300">
          <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted uppercase tracking-wider">Svenska Åkare</p>
            <h3 className="text-2xl font-bold">{athletesCount || '640+'}</h3>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow duration-300">
          <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted uppercase tracking-wider">Tävlingar</p>
            <h3 className="text-2xl font-bold">{compsCount || '600+'}</h3>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow duration-300">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <Activity className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted uppercase tracking-wider">Senaste Synk</p>
            <h3 className="text-lg font-bold truncate">{lastUpdate}</h3>
          </div>
        </div>
      </div>

      {/* Discipline Navigation Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold border-l-4 border-secondary pl-3">Discipliner</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {disciplines.map((d) => (
            <Link 
              key={d.id} 
              href={`/rankings?discipline=${d.id}`}
              className={`group flex flex-col justify-between p-6 bg-gradient-to-br ${d.color} border border-border rounded-xl hover:shadow-md transition-all duration-300`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">{d.name}</h3>
                  <ChevronRight className="h-5 w-5 text-muted group-hover:text-foreground group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-sm text-muted">{d.description}</p>
              </div>
              <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-primary">
                <Zap className="h-3 w-3" />
                <span>Öppna ställning</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
      
      {/* Info Card */}
      <div className="bg-muted-bg border border-border rounded-xl p-6 space-y-3">
        <h3 className="text-lg font-bold">Hur beräknas rankingen?</h3>
        <p className="text-sm text-muted leading-relaxed">
          Enligt IWWF:s officiella rankingregler baseras placeringen på åkarens <strong>genomsnitt av de två bästa resultaten</strong> uppnådda under de senaste 12 månaderna. Resultaten måste komma från två olika tävlingar (och oftast olika arenor) för att godkännas. Om en åkare endast har ett godkänt resultat under perioden tas de inte med i rankinglistan förrän ett andra resultat registreras.
        </p>
      </div>
    </div>
  );
}
