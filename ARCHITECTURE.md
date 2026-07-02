# Swerank Application Architecture

This document describes the design and architecture of the Live Swedish Waterski Ranking Web Application (Swerank).

---

## 1. Directory Structure

We use the Next.js App Router structure with a `src/` directory.

```
src/
├── app/
│   ├── api/
│   │   ├── athlete/
│   │   │   └── [id]/
│   │   │       └── route.ts         # GET /api/athlete/[id] -> Parse and return profile details
│   │   └── rankings/
│   │       └── route.ts             # GET /api/rankings?discipline=[id] -> Parse and return Sweden rankings
│   ├── athlete/
│   │   └── [id]/
│   │       └── page.tsx             # Athlete detail view (Personal Bests, Trend Charts, History)
│   ├── rankings/
│   │   └── page.tsx                 # Rankings grid view (Slalom/Tricks/Jump, Class & Gender filters)
│   ├── favicon.ico
│   ├── globals.css                  # Core CSS and Tailwind directives
│   ├── layout.tsx                   # Main wrapping layout (Navbar, Theme Toggle, Footer)
│   └── page.tsx                     # Landing Homepage (dashboard statistics, rolling period banner)
├── components/                      # Reusable UI widgets
│   ├── charts.tsx                   # Recharts performance trend graphs
│   ├── ui/                          # Scandinavian design styled atomic components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── table.tsx
├── lib/
│   ├── api.ts                       # IWWF EMS scraping and session handling utilities
│   ├── cache.ts                     # Short-lived in-memory server cache implementation
│   └── types.ts                     # TypeScript type definitions
```

---

## 2. Core Modules & Engine

### 2.1 API Scraping Layer (`src/lib/api.ts`)
Handles request flows and raw HTML parsing using the `cheerio` library.
* **`fetchSwedishAthletes()`**: POSTs to `/Athletes/SearchLoadData` to build an `Id -> Club` lookup map for Swedish waterskiers.
* **`fetchCalendar()`**: POSTs to `/Calendar/LoadCalendar` to fetch all competitions in the rolling 12-month period, building a `Code -> Competition` metadata lookup map.
* **`fetchSwedishRankings(eventId: number)`**:
  1. Requests `GET /RankingList/RankingListWaterski?disciplineId=7` to gather ASP.NET verification tokens and cookies.
  2. Submits `POST /RankingList/RankingListWaterSki` with Sweden's federation ID (`19290580-41c9-4543-a0f6-6a4619e44fdf`) and the selected event (10/11/12).
  3. Follows the 302 redirect to retrieve the pre-rendered HTML view.
  4. Parses the tables into JSON rows, looking up each athlete's club name (from Step 1) and each tournament's details (from Step 2).
* **`fetchAthleteProfile(id: string)`**: GETs `/Athletes/Profile?Id=[id]`, parsing personal details and complete performance list.

### 2.2 Short-Lived In-Memory Cache (`src/lib/cache.ts`)
To respect rate limits and keep response times fast, we implement a simple in-memory cache in the Node.js server.
* Key parameters (e.g. `rankings_10`, `athletes`, `calendar`) are cached for **5 minutes**.
* When a page request occurs:
  1. If cache is warm: returns immediately (instant, 0 requests to IWWF).
  2. If cache is cold: performs requests to IWWF EMS in parallel, updates cache, and returns.

### 2.3 Client-Side Filters & Table Engine
* Filters for Discipline, Gender, and Class are handled via React state.
* The table columns are fully sortable (with visual indicators), searchable by name/club, and have sticky headers.

---

## 3. Data Flows

### Loading Rankings Page
```
[User Navigate] 
      │
      ▼
[GET /api/rankings?discipline=slalom]
      │
      ├── Check Cache ──(Warm)──> [Return JSON Ranks]
      │
      └── (Cold)
            │
            ├── Fetch Athletes Map (POST /Athletes/SearchLoadData)
            ├── Fetch Calendar Map (POST /Calendar/LoadCalendar)
            ├── Fetch Rankings HTML (GET-POST-GET /RankingList)
            │
            ├── Parse HTML and Merge Lookup Maps (Link Club by ID, Link Tourney by Code)
            │
            ├── Store in Cache (5 minutes TTL)
            │
            ▼
      [Return JSON Ranks]
```

### Loading Athlete Profile
```
[GET /api/athlete/[id]]
      │
      ├── Check Cache ──(Warm)──> [Return JSON Profile]
      │
      └── (Cold)
            │
            ├── Fetch Athlete Profile Page (GET /Athletes/Profile)
            ├── Parse details, personal bests, trend data
            ├── Store in Cache (5 minutes TTL)
            │
            ▼
      [Return JSON Profile]
```

---

## 4. UI/UX & Aesthetics (Scandinavian Design)

* **Colors**: Premium modern Scandinavian palette:
  * Light Mode: Soft white background, slate-grey text, muted cold-blue highlights.
  * Dark Mode: Slate/charcoal background, silver-grey text, teal accents.
* **Typography**: Outfit or Inter typeface loaded from Google Fonts.
* **Transitions**: Smooth micro-animations on table rows and navigation cards.
* **Mobile Friendliness**: Flexboxes, grids, and `overflow-x-auto` table wrappers to ensure readable screens on smartphones.
