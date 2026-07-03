import * as cheerio from 'cheerio';
import { Athlete, Competition, RankingEntry, AthletePerformance, AthleteProfile } from './types';

const EMS_BASE = 'https://ems.iwwf.sport';

// Helper to make POST/GET requests and return HTML/JSON and Set-Cookie headers
async function fetchWithCookies(urlStr: string, options: RequestInit = {}): Promise<{ text: string; cookies: string; headers: Headers; finalUrl: string; status: number }> {
  const res = await fetch(urlStr, options);
  const text = await res.text();
  const finalUrl = res.url;
  
  // Extract Set-Cookie headers and format them into a Cookie string
  const setCookies = res.headers.getSetCookie();
  const cookies = setCookies.map(cookie => cookie.split(';')[0]).join('; ');

  return {
    text,
    cookies,
    headers: res.headers,
    finalUrl,
    status: res.status
  };
}

/**
 * Fetches all Swedish waterski athletes from IWWF EMS to build the ID -> Club map
 */
export async function fetchSwedishAthletes(): Promise<Record<string, { club: string | null; code: string; gender: 'M' | 'F' }>> {
  const params = new URLSearchParams();
  params.append('draw', '1');
  params.append('start', '0');
  params.append('length', '1000'); // Sufficient for all ~640 Swedish skiers
  params.append('lastname', '');
  params.append('firstname', '');
  params.append('code', '');
  params.append('yob', '');
  params.append('status', '');
  params.append('gender', '');
  params.append('country', '164'); // Sweden
  params.append('discipline', '7'); // Waterski

  const columns = [
    { data: '0', name: 'Country_Abbreviation' },
    { data: '1', name: 'LastName' },
    { data: '2', name: 'GenderId' },
    { data: 'YobFormatter', name: 'BirthDate' },
    { data: 'Code', name: 'Code' },
    { data: '5', name: 'Fav_Disciplines' }
  ];

  columns.forEach((col, idx) => {
    params.append(`columns[${idx}][data]`, col.data);
    params.append(`columns[${idx}][name]`, col.name);
    params.append(`columns[${idx}][searchable]`, 'true');
    params.append(`columns[${idx}][orderable]`, 'true');
    params.append(`columns[${idx}][search][value]`, '');
    params.append(`columns[${idx}][search][regex]`, 'false');
  });

  params.append('order[0][column]', '1'); // Order by LastName
  params.append('order[0][dir]', 'asc');
  params.append('search[value]', '');
  params.append('search[regex]', 'false');

  const res = await fetch(`${EMS_BASE}/Athletes/SearchLoadData`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    body: params.toString()
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch athletes search: HTTP ${res.status}`);
  }

  const payload = await res.json();
  const records = payload.data || [];
  
  const lookup: Record<string, { club: string | null; code: string; gender: 'M' | 'F' }> = {};
  for (const item of records) {
    if (item.Id) {
      lookup[item.Id.toLowerCase()] = {
        club: item.Club ? item.Club.trim() : null,
        code: item.Code ? item.Code.trim() : '',
        gender: item.ComputedGender === 'M' ? 'M' : 'F'
      };
    }
  }

  return lookup;
}

/**
 * Fetches all waterski competitions in the rolling 12 months to build the Code -> Competition metadata map
 */
export async function fetchCalendar(startDate: string, endDate: string, country: string = ''): Promise<Record<string, Competition>> {
  const params = new URLSearchParams();
  params.append('draw', '1');
  params.append('start', '0');
  params.append('length', '1000'); // Pull all 600+ world competitions in one request
  params.append('name', '');
  params.append('code', '');
  params.append('site', '');
  params.append('startdate', startDate); // dd/MM/yyyy
  params.append('enddate', endDate);     // dd/MM/yyyy
  params.append('discipline', '7'); // Waterski
  params.append('homologation', '');
  params.append('confederationId', '');
  params.append('country', country);
  params.append('onlylive', 'false');
  params.append('onlycashprize', 'false');
  params.append('competitionType', '');

  const columns = [
    { data: '0', name: 'CompetitionDate' },
    { data: 'DisciplineName', name: 'DisciplineName' },
    { data: 'CompetitionTypeAbbr', name: 'CompetitionTypeAbbr' },
    { data: 'HomologationAbbr', name: 'HomologationAbbr' },
    { data: 'Abbr', name: 'Abbr' },
    { data: '5', name: 'CompetitionName' },
    { data: '6', name: '' },
    { data: '7', name: 'SiteName' },
    { data: '8', name: 'CompetitionCode' },
    { data: '9', name: 'FederationCode' }
  ];

  columns.forEach((col, idx) => {
    params.append(`columns[${idx}][data]`, col.data);
    if (col.name) params.append(`columns[${idx}][name]`, col.name);
    params.append(`columns[${idx}][searchable]`, 'true');
    params.append(`columns[${idx}][orderable]`, 'true');
    params.append(`columns[${idx}][search][value]`, '');
    params.append(`columns[${idx}][search][regex]`, 'false');
  });

  params.append('order[0][column]', '0');
  params.append('order[0][dir]', 'asc');
  params.append('search[value]', '');
  params.append('search[regex]', 'false');

  const res = await fetch(`${EMS_BASE}/Calendar/LoadCalendar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    body: params.toString()
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch calendar: HTTP ${res.status}`);
  }

  const payload = await res.json();
  const records = payload.data || [];
  
  const lookup: Record<string, Competition> = {};
  for (const item of records) {
    const code = item.CompetitionCode ? item.CompetitionCode.trim().toUpperCase() : '';
    if (code) {
      lookup[code] = {
        id: item.Id || '',
        name: item.CompetitionName ? item.CompetitionName.trim() : 'Unknown Competition',
        code: code,
        dateStr: item.CompetitionDate ? item.CompetitionDate.trim() : '',
        siteName: item.SiteName ? item.SiteName.trim() : '',
        countryAbbr: item.SiteCountryAbbr || item.CountryAbbr || '',
        homologation: item.HomologationAbbr || ''
      };
    }
  }

  return lookup;
}

/**
 * Performs the ASP.NET session GET-then-POST-then-GET flow to fetch the Sweden-filtered rankings HTML page
 */
async function fetchSwedishRankingsHtml(eventId: number, seasonId: number, monthId: number): Promise<string> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };

  // 1. GET page to get the anti-forgery token and cookies
  const getUrl = `${EMS_BASE}/RankingList/RankingListWaterski?disciplineId=7`;
  const getRes = await fetchWithCookies(getUrl, { method: 'GET', headers });

  if (getRes.status !== 200) {
    throw new Error(`GET rankings page failed with status ${getRes.status}`);
  }

  // Extract __RequestVerificationToken
  const tokenMatch = getRes.text.match(/name="__RequestVerificationToken"\s+type="hidden"\s+value="([^"]+)"/);
  const token = tokenMatch ? tokenMatch[1] : null;
  if (!token) {
    throw new Error("ASP.NET Anti-forgery verification token not found.");
  }

  // 2. Build POST request params
  const params = new URLSearchParams();
  params.append('__RequestVerificationToken', token);
  params.append('RLConfederationId', '');
  params.append('Filters.FiltersData.DisciplineId', '7'); // Waterski
  params.append('Filters.FiltersData.Lastname', '');
  params.append('Filters.FiltersData.Firstname', '');
  params.append('Filters.FiltersData.AthleteCode', '');
  params.append('Filters.FiltersData.EventId', eventId.toString()); // 10 = Slalom, 11 = Tricks, 12 = Jump
  params.append('Filters.FiltersData.SeasonId', seasonId.toString()); // computed value
  params.append('Filters.FiltersData.Month', monthId.toString()); // 1-12
  params.append('Filters.FiltersData.RLAgeCategoryId', '');
  params.append('Filters.FiltersData.Gender', '');
  params.append('Filters.FiltersData.ConfederationId', '1'); // Europe & Africa
  params.append('Filters.FiltersData.FederationId', '19290580-41c9-4543-a0f6-6a4619e44fdf'); // Sweden

  // 3. POST the filters (IIS redirects with 302 to the results view)
  const postUrl = `${EMS_BASE}/RankingList/RankingListWaterSki`;
  const postRes = await fetch(postUrl, {
    method: 'POST',
    headers: {
      ...headers,
      'Cookie': getRes.cookies,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Referer': getRes.finalUrl,
      'Origin': EMS_BASE
    },
    body: params.toString(),
    redirect: 'manual' // Prevent fetch from following redirect automatically so we can capture cookies set during 302
  });

  // Extract redirect cookies & target URL
  const postSetCookies = postRes.headers.getSetCookie();
  const postCookies = postSetCookies.map(cookie => cookie.split(';')[0]).join('; ');
  const combinedCookies = [getRes.cookies, postCookies].filter(Boolean).join('; ');

  let nextUrl = postRes.headers.get('location') || '';
  if (postRes.status >= 300 && postRes.status < 400 && nextUrl) {
    if (!nextUrl.startsWith('http')) {
      nextUrl = new URL(nextUrl, EMS_BASE).toString();
    }
  } else {
    // If no 302 redirect occurred, try to read body directly
    return await postRes.text();
  }

  // 4. GET the redirected URL with cookies
  const finalRes = await fetch(nextUrl, {
    method: 'GET',
    headers: {
      ...headers,
      'Cookie': combinedCookies,
      'Referer': postUrl
    }
  });

  if (!finalRes.ok) {
    throw new Error(`Failed to load redirected ranking results page: HTTP ${finalRes.status}`);
  }

  return await finalRes.text();
}

/**
 * Helper to determine age category dynamically based on year of birth and reference year
 */
function getCategoryByAge(yobStr: string, refYear: number): string {
  const yob = parseInt(yobStr, 10);
  if (isNaN(yob)) return 'Open';
  const age = refYear - yob;
  if (age <= 14) return 'U14';
  if (age >= 15 && age <= 17) return 'U17';
  if (age >= 18 && age <= 21) return 'U21';
  return 'Open';
}

/**
 * Main function to fetch, merge and return parsed Swedish ranking entries for a given discipline
 */
export async function getSwedishRankings(eventId: number, year: number, month: number): Promise<RankingEntry[]> {
  // Compute SeasonId (2016 is SeasonId 0? Wait, 2026 is SeasonId 10, so SeasonId = year - 2016)
  const seasonId = year - 2016;

  // 1. Fetch Swedish athletes & rolling calendar concurrently
  const startDate = `01/${month.toString().padStart(2, '0')}/${year - 1}`;
  const endDate = `31/${month.toString().padStart(2, '0')}/${year}`;

  const [athletesLookup, calendarLookup, rawHtml] = await Promise.all([
    fetchSwedishAthletes().catch(err => {
      console.error("Failed to load athletes roster, continuing without clubs:", err);
      return {} as Record<string, { club: string | null; code: string; gender: 'M' | 'F' }>;
    }),
    fetchCalendar(startDate, endDate).catch(err => {
      console.error("Failed to load competition calendar, continuing with raw codes:", err);
      return {} as Record<string, Competition>;
    }),
    fetchSwedishRankingsHtml(eventId, seasonId, month)
  ]);

  const $ = cheerio.load(rawHtml);
  const rawEntries: RankingEntry[] = [];

  // Parse all card containers that hold tables
  $('.card').each((_idx, element) => {
    const header = $(element).find('.card-header');
    if (!header.length) return;

    const titleText = header.text().trim();
    
    // Determine card gender
    const isWomen = titleText.toLowerCase().includes('women') || titleText.toLowerCase().includes(' f ') || titleText.toLowerCase().includes('female') || titleText.toLowerCase().includes('damer');
    const cardGender: 'M' | 'F' = isWomen ? 'F' : 'M';

    const table = $(element).find('table');
    if (!table.length) return;

    table.find('tbody tr').each((_rIdx, tr) => {
      const tds = $(tr).find('td');
      if (tds.length < 10) return;

      const rank = parseInt($(tds[0]).text().trim(), 10) || 0;
      const worldRank = $(tds[1]).text().trim();
      
      const nameLink = $(tds[2]).find('a');
      if (!nameLink.length) return;

      const name = nameLink.text().trim();
      const href = nameLink.attr('href') || '';
      
      // Extract Athlete ID from href
      const idMatch = href.match(/[?&]Id=([^&]+)/i);
      const athleteId = idMatch ? idMatch[1].toLowerCase() : '';

      const federation = $(tds[3]).text().trim(); // SWE
      const catVal = $(tds[4]).text().trim();
      const yob = $(tds[5]).text().trim();
      const comp1Code = $(tds[6]).text().trim().toUpperCase();
      const score1 = $(tds[7]).text().trim();
      const comp2Code = $(tds[8]).text().trim().toUpperCase();
      const score2 = $(tds[9]).text().trim();

      // Look up club and athlete license code from athletes roster
      const athleteData = athletesLookup[athleteId];
      const club = athleteData ? athleteData.club : null;
      const athleteCode = athleteData ? athleteData.code : null;
      const gender = athleteData ? athleteData.gender : cardGender;

      // Look up competition names in calendar lookup
      const comp1 = calendarLookup[comp1Code];
      const comp1Name = comp1 ? comp1.name : comp1Code;

      const comp2 = calendarLookup[comp2Code];
      const comp2Name = comp2 ? comp2.name : comp2Code;

      // Determine category dynamically by age chart
      const category = getCategoryByAge(yob, year);

      // Best score is just the highest raw value, or we can use score1
      const bestScore = score1; 

      rawEntries.push({
        rank,
        worldRank,
        athleteId,
        name,
        gender,
        federation,
        category,
        yob,
        comp1Code,
        comp1Name,
        score1,
        comp2Code,
        comp2Name,
        score2,
        club,
        athleteCode,
        bestScore
      });
    });
  });

  // De-duplicate entries by athleteId, keeping the better score
  const uniqueEntries: Record<string, RankingEntry> = {};
  rawEntries.forEach(entry => {
    const existing = uniqueEntries[entry.athleteId];
    if (!existing) {
      uniqueEntries[entry.athleteId] = entry;
    } else {
      let isNewBetter = false;
      if (eventId === 10) {
        isNewBetter = getBetterSlalom(existing.bestScore, entry.bestScore) === entry.bestScore;
      } else if (eventId === 11) {
        isNewBetter = getBetterTricks(existing.bestScore, entry.bestScore) === entry.bestScore;
      } else if (eventId === 12) {
        isNewBetter = getBetterJump(existing.bestScore, entry.bestScore) === entry.bestScore;
      }
      
      if (isNewBetter) {
        uniqueEntries[entry.athleteId] = entry;
      }
    }
  });

  // Group by gender and category
  const groups: Record<string, RankingEntry[]> = {};
  Object.values(uniqueEntries).forEach(entry => {
    const key = `${entry.gender}_${entry.category}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(entry);
  });

  // Sort and rank each group
  const finalEntries: RankingEntry[] = [];
  Object.keys(groups).forEach(key => {
    const groupEntries = groups[key];
    
    groupEntries.sort((a, b) => {
      if (eventId === 10) {
        const better = getBetterSlalom(a.bestScore, b.bestScore);
        if (better === a.bestScore && better !== b.bestScore) return -1;
        if (better === b.bestScore && better !== a.bestScore) return 1;
        
        // If equal, compare score2
        const better2 = getBetterSlalom(a.score2, b.score2);
        if (better2 === a.score2 && better2 !== b.score2) return -1;
        if (better2 === b.score2 && better2 !== a.score2) return 1;
        return 0;
      } else if (eventId === 11) {
        const aVal = parseInt(a.bestScore, 10) || 0;
        const bVal = parseInt(b.bestScore, 10) || 0;
        if (aVal !== bVal) return bVal - aVal;
        
        const aVal2 = parseInt(a.score2, 10) || 0;
        const bVal2 = parseInt(b.score2, 10) || 0;
        return bVal2 - aVal2;
      } else {
        const aVal = parseFloat(a.bestScore) || 0;
        const bVal = parseFloat(b.bestScore) || 0;
        if (aVal !== bVal) return bVal - aVal;
        
        const aVal2 = parseFloat(a.score2) || 0;
        const bVal2 = parseFloat(b.score2) || 0;
        return bVal2 - aVal2;
      }
    });

    // Assign sequential ranks within the group
    groupEntries.forEach((entry, idx) => {
      entry.rank = idx + 1;
      finalEntries.push(entry);
    });
  });

  return finalEntries;
}

/**
 * Fetch and parse a specific athlete's profile and results
 */
export async function getAthleteProfile(id: string): Promise<AthleteProfile> {
  const url = `${EMS_BASE}/Athletes/Profile?Id=${id}`;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Failed to load athlete profile: HTTP ${res.status}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  // Parse Personal Info
  const name = $('.a-profile .e').first().text().trim();
  const code = $('.a-profile .n').first().text().trim();
  
  // Search gender
  let gender = 'Unknown';
  $('.n').each((_i, el) => {
    if ($(el).text().includes('GENDER:')) {
      gender = $(el).closest('.row').find('.e').text().trim();
    }
  });

  // Parse competition history
  const performances: AthletePerformance[] = [];
  
  // Find all result sections (each result is inside a card with a header containing the date and comp title)
  $('.card').each((_i, card) => {
    const cardHeader = $(card).find('.card-header');
    if (!cardHeader.length) return;

    // e.g. "4-6 Aug 2006SM2006SWE"
    // Let's parse date, comp title, and link
    const dateSpan = cardHeader.find('b');
    const dateStr = dateSpan.text().trim();
    
    const compLink = cardHeader.find('a');
    if (!compLink.length) return;

    const compName = compLink.text().trim();
    const compUrl = EMS_BASE + (compLink.attr('href') || '');

    const country = cardHeader.find('.float-right').text().trim();

    // Now look for the table inside or adjacent card-body
    const table = $(card).next('.card-body').find('table');
    if (!table.length) return;

    let currentDiscipline = '';
    let currentCompCode = '';

    table.find('tbody tr').each((_j, tr) => {
      const tds = $(tr).find('td');
      if (tds.length === 0) return;

      let category = '';
      let rank = '';
      let roundsStartIdx = 4;

      const firstCellText = $(tds[0]).text().trim().toLowerCase();
      const firstCellIsDiscipline = firstCellText === 'waterski' || firstCellText === 'wakeboard' || firstCellText === 'barefoot';

      if (firstCellIsDiscipline) {
        currentDiscipline = $(tds[0]).text().trim();
        currentCompCode = $(tds[1]).text().trim();
        category = $(tds[2]).text().trim();
        rank = $(tds[3]).text().trim();
        roundsStartIdx = 4;
      } else {
        // Rowspanned row: cell 0 is category, cell 1 is rank, cell 2+ are rounds
        category = $(tds[0]).text().trim();
        rank = $(tds[1]).text().trim();
        roundsStartIdx = 2;
      }

      if (currentDiscipline.toLowerCase() !== 'waterski') return;

      const rounds: string[] = [];
      for (let k = roundsStartIdx; k < tds.length; k++) {
        const roundScore = $(tds[k]).text().trim();
        if (roundScore && roundScore !== '-') {
          rounds.push(roundScore);
        }
      }

      performances.push({
        discipline: currentDiscipline,
        compCode: currentCompCode,
        compName,
        compUrl,
        dateStr,
        country,
        category,
        rank,
        rounds,
        homologated: true
      });
    });
  });

  // Calculate Personal Bests from history
  let pbSlalom: string | null = null;
  let pbTricks: string | null = null;
  let pbJump: string | null = null;

  for (const perf of performances) {
    const isSlalom = perf.category.toLowerCase().includes('slalom');
    const isTricks = perf.category.toLowerCase().includes('tricks');
    const isJump = perf.category.toLowerCase().includes('jump');

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

  return {
    id,
    name,
    code,
    gender,
    club: null, // Filled dynamically in API route using athletes roster lookup map
    performances,
    personalBests: {
      slalom: pbSlalom,
      tricks: pbTricks,
      jump: pbJump
    }
  };
}

// Heuristics for comparing scores

function getBetterSlalom(s1: string | null, s2: string): string {
  if (!s1) return s2;
  
  // Parse Slalom score: e.g. "5.00/58/12.00" or "4.50/55"
  // Format: Buoys/Speed/Rope
  function parseSlalom(s: string) {
    const parts = s.split('/');
    const buoys = parseFloat(parts[0]) || 0;
    const speed = parseFloat(parts[1]) || 0;
    // Default rope length is 18.25m if not specified
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
      // Shorter rope length is better
      return p1.rope < p2.rope ? s1 : s2;
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
  const j1 = parseFloat(s1) || 0;
  const j2 = parseFloat(s2) || 0;
  return j1 >= j2 ? s1 : s2;
}
