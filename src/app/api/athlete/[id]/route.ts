import { NextRequest, NextResponse } from 'next/server';
import { getAthleteProfile, fetchSwedishAthletes } from '@/lib/api';
import { getCache, setCache } from '@/lib/cache';

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
    
    // Fetch profile and athletes list in parallel to merge club name
    const [profile, athletesLookup] = await Promise.all([
      getAthleteProfile(normalizedId),
      fetchSwedishAthletes().catch(() => ({} as Record<string, { club: string | null; code: string; gender: 'M' | 'F' }>))
    ]);

    // Merge club and verify license code
    const lookupEntry = athletesLookup[normalizedId];
    if (lookupEntry) {
      profile.club = lookupEntry.club;
      if (lookupEntry.code && !profile.code) {
        profile.code = lookupEntry.code;
      }
    }

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
