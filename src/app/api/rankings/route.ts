import { NextRequest, NextResponse } from 'next/server';
import { getSwedishRankings } from '@/lib/api';
import { getCache, setCache } from '@/lib/cache';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const discipline = searchParams.get('discipline') || 'slalom';
  const force = searchParams.get('force') === 'true';
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  const year = parseInt(searchParams.get('year') || '') || currentYear;
  const month = parseInt(searchParams.get('month') || '') || currentMonth;

  // Validate parameters
  let eventId = 10; // default slalom
  if (discipline.toLowerCase() === 'tricks') {
    eventId = 11;
  } else if (discipline.toLowerCase() === 'jump') {
    eventId = 12;
  }

  const cacheKey = `rankings_${eventId}_${year}_${month}`;

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

    console.log(`Cache miss or force refresh. Fetching rankings for event: ${eventId}, year: ${year}, month: ${month}...`);
    const data = await getSwedishRankings(eventId, year, month);

    // Save in cache
    setCache(cacheKey, data);

    return NextResponse.json({
      source: 'network',
      timestamp: new Date().toISOString(),
      data
    }, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error: any) {
    console.error('Error fetching rankings:', error);
    return NextResponse.json({
      error: 'Failed to retrieve rankings from IWWF EMS. Please try again later.',
      details: error.message
    }, {
      status: 500
    });
  }
}
