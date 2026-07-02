# Research Findings: IWWF EMS Reverse Engineering

This document details the internal endpoints, requests, and payloads discovered during the investigation of the IWWF EMS website (`https://ems.iwwf.sport`) for retrieving Swedish waterski ranking lists.

---

## 1. Athlete Search Endpoint

* **URL**: `POST https://ems.iwwf.sport/Athletes/SearchLoadData`
* **Method**: `POST`
* **Content-Type**: `application/x-www-form-urlencoded; charset=UTF-8`
* **Headers**:
  * `X-Requested-With`: `XMLHttpRequest`
  * `User-Agent`: Desktop browser UA
* **Parameters**:
  * `draw`: `1`
  * `start`: `0`
  * `length`: `1000` (sufficient to pull all Swedish athletes in one request)
  * `country`: `164` (Sweden)
  * `discipline`: `7` (Waterski)
  * DataTable structure parameter keys:
    * `columns[0][data]`: `0`, `columns[0][name]`: `Country_Abbreviation`, `columns[0][searchable]`: `true`, `columns[0][orderable]`: `true`
    * `columns[1][data]`: `1`, `columns[1][name]`: `LastName`, `columns[1][searchable]`: `true`, `columns[1][orderable]`: `true`
    * `columns[2][data]`: `2`, `columns[2][name]`: `GenderId`, `columns[2][searchable]`: `true`, `columns[2][orderable]`: `true`
    * `columns[3][data]`: `YobFormatter`, `columns[3][name]`: `BirthDate`, `columns[3][searchable]`: `true`, `columns[3][orderable]`: `true`
    * `columns[4][data]`: `Code`, `columns[4][name]`: `Code`, `columns[4][searchable]`: `true`, `columns[4][orderable]`: `false`
    * `columns[5][data]`: `5`, `columns[5][name]`: `Fav_Disciplines`, `columns[5][searchable]`: `true`, `columns[5][orderable]`: `false`
    * `order[0][column]`: `0`
    * `order[0][dir]`: `asc`
    * `search[value]`: `""`
    * `search[regex]`: `false`
* **Output Payload**:
  A JSON object with `recordsTotal`, `recordsFiltered`, and `data` containing:
  * `Id` (GUID): The unique athlete ID used for profile URLs.
  * `FullName`: The athlete's full name.
  * `Code`: The athlete's IWWF license code (e.g. `SWE...`).
  * `Gender_Description`: "Male" or "Female".
  * `Fav_Disciplines`: Favored disciplines array (e.g., `["WSKI"]`).
  * `Club`: Club name (e.g., `Karlstads VSK` or `null`).

---

## 2. Ranking List Search Endpoints

Retrieving ranking lists requires establishing a session to extract a valid anti-forgery token and matching cookies.

### Step 2.1: Establish Session (GET)
* **URL**: `GET https://ems.iwwf.sport/RankingList/RankingListWaterski?disciplineId=7`
* **Purpose**: Retrieves the cookie headers (including `__RequestVerificationToken`) and extracts the `<input type="hidden" name="__RequestVerificationToken" value="TOKEN_VALUE" />` from the HTML.

### Step 2.2: Submit Filters (POST)
* **URL**: `POST https://ems.iwwf.sport/RankingList/RankingListWaterSki`
* **Headers**:
  * `Content-Type`: `application/x-www-form-urlencoded`
  * `Cookie`: Collected cookie string
  * `Referer`: `https://ems.iwwf.sport/RankingList/RankingLists?DisciplineId=7`
  * `Origin`: `https://ems.iwwf.sport`
* **Payload**:
  * `__RequestVerificationToken`: Collected token value
  * `RLConfederationId`: `""`
  * `Filters.FiltersData.DisciplineId`: `7` (Waterski)
  * `Filters.FiltersData.Lastname`: `""`
  * `Filters.FiltersData.Firstname`: `""`
  * `Filters.FiltersData.AthleteCode`: `""`
  * `Filters.FiltersData.EventId`: `10` (Slalom), `11` (Tricks), or `12` (Jump)
  * `Filters.FiltersData.SeasonId`: `10` (Current season e.g. 2026)
  * `Filters.FiltersData.Month`: `7` (Current month)
  * `Filters.FiltersData.RLAgeCategoryId`: `""` (All age categories)
  * `Filters.FiltersData.Gender`: `""` (Both genders)
  * `Filters.FiltersData.ConfederationId`: `1` (Europe & Africa)
  * `Filters.FiltersData.FederationId`: `19290580-41c9-4543-a0f6-6a4619e44fdf` (Sweden)

### Step 2.3: Follow Redirect (GET)
* **URL**: `GET https://ems.iwwf.sport/RankingList/RankingListWaterSki?disciplineId=7`
* **Headers**: Includes cookies (carrying the established `ASP.NET_SessionId` cookie).
* **Response**: Returns the HTML containing separate rankings tables (card layout) for every combination of gender and age category (Open Men, Open Women, Under 14 Men/Women, Under 17 Men/Women, Under 21 Men/Women, etc.).

---

## 3. Calendar Lookup Endpoint

* **URL**: `POST https://ems.iwwf.sport/Calendar/LoadCalendar`
* **Method**: `POST`
* **Content-Type**: `application/x-www-form-urlencoded; charset=UTF-8`
* **Headers**:
  * `X-Requested-With`: `XMLHttpRequest`
* **Parameters**:
  * `draw`: `1`
  * `start`: `0`
  * `length`: `1000` (pulls all competitions in a single request)
  * `code`: `""` (or a specific code like `25SWE006` to look up one competition)
  * `startdate`: `02/07/2025`
  * `enddate`: `02/07/2026`
  * `discipline`: `7`
  * DataTable columns details for:
    * `CompetitionDate`, `DisciplineName`, `CompetitionTypeAbbr`, `HomologationAbbr`, `Abbr`, `CompetitionName`, `SiteName`, `CompetitionCode`, `FederationCode`
* **Output Payload**:
  A JSON object mapping each competition code to details:
  * `CompetitionName`
  * `SiteName` (Karlstad, Sweden)
  * `CompetitionDate` (e.g. `25-27 Jul 2025`)
  * `StartDate` / `EndDate` timestamps

---

## 4. Athlete Profile Endpoint

* **URL**: `GET https://ems.iwwf.sport/Athletes/Profile?Id=[Id]`
* **Purpose**: Fetches the HTML page containing an athlete's personal details, current rankings, and historical competition results list (including scores for individual rounds).
