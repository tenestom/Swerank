import { NextRequest, NextResponse } from 'next/server';
import { getAthleteProfile, fetchSwedishAthletes, fetchCalendar } from '@/lib/api';
import { getCache, setCache } from '@/lib/cache';

function isHomologatedCode(abbr: string | null | undefined): boolean {
  if (!abbr) return false;
  const a = abbr.toUpperCase();
  return a === 'RC' || a === 'RL' || a === 'R' || a === 'L' || a === 'E';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';

  if (!id) {
    return NextResponse.json({ error: 'Athlete ID is required.' }, { status: 400 });
  }

  const normalizedId = id.toLowerCase();
  const cacheKey = `athlete_profile_${normalizedId}`;

  try {
    if (!force) {
      const cachedData = getCache(cacheKey);
      if (cachedData) {
        return NextResponse.json({
          source: 'cache',
          timestamp: new Date().toISOString(),
          data: cachedData
        }, {
          headers: {
            'X-Cache': 'HIT',
            'Cache-Control': 'public, max-age=300'
          }
        });
      }
    }

    console.log(`Cache miss or force refresh. Fetching athlete profile for: ${normalizedId}...`);
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const startDateStr = '01/01/2010';
    const endDateStr = `31/${currentMonth.toString().padStart(2, '0')}/${currentYear}`;

    // Fetch calendar, profile and athletes list in parallel
    const [profile, athletesLookup, swedishCalendar] = await Promise.all([
      getAthleteProfile(normalizedId),
      fetchSwedishAthletes().catch(() => ({} as Record<string, { club: string | null; code: string; gender: 'M' | 'F' }>)),
      fetchCalendar(startDateStr, endDateStr, "164").catch(() => ({} as Record<string, any>))
    ]);

    // Merge club and verify license code
    const lookupEntry = athletesLookup[normalizedId];
    if (lookupEntry) {
      profile.club = lookupEntry.club;
      if (lookupEntry.code && !profile.code) {
        profile.code = lookupEntry.code;
      }
    }

    // Determine homologation for each performance
    profile.performances.forEach(perf => {
      const comp = swedishCalendar[perf.compCode.toUpperCase()];
      if (comp) {
        perf.homologated = isHomologatedCode(comp.homologation);
      } else {
        // If not found in Swedish calendar:
        // If it is a Swedish local event (contains 'SWE' in code), but not in our calendar lookup (which has all since 2010),
        // it means it was a normal/non-homologated club tournament.
        // If it does NOT contain 'SWE' (international event), default to true as foreign events in EMS are practically always homologated.
        const isSwedishLocal = perf.compCode.toUpperCase().includes('SWE');
        perf.homologated = !isSwedishLocal;
      }
    });

    // Save in cache
    setCache(cacheKey, profile);

    return NextResponse.json({
      source: 'network',
      timestamp: new Date().toISOString(),
      data: profile
    }, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error: any) {
    console.error(`Error fetching athlete profile ${normalizedId}:`, error);
    return NextResponse.json({
      error: 'Failed to retrieve athlete profile from IWWF EMS. Please verify the ID and try again.',
      details: error.message
    }, {
      status: 500
    });
  }
}
