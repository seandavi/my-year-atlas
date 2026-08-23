-- Build derived tables from raw UN WPP 2024 CSVs.
-- Run from repo root: duckdb -f scripts/build.sql
-- Reference year for the app slice; bump when re-basing "now".
SET VARIABLE ref_now = 2026;

------------------------------------------------------------------
-- Raw inputs. Population counts are in THOUSANDS in the raw files.
------------------------------------------------------------------
CREATE VIEW pop_raw AS
SELECT * FROM read_csv_auto('data/raw/WPP2024_PopulationBySingleAgeSex_Medium_*.csv.gz',
                            union_by_name = true, sample_size = -1);

CREATE VIEW ind_raw AS
SELECT * FROM read_csv_auto('data/raw/WPP2024_Demographic_Indicators_Medium.csv.gz',
                            sample_size = -1);

-- Countries/areas with an ISO3 code, plus World as 'WLD'.
CREATE MACRO keep_loc(LocTypeName, ISO3_code, LocID) AS
  (LocTypeName = 'Country/Area' AND ISO3_code IS NOT NULL) OR LocID = 900;

------------------------------------------------------------------
-- cohorts: one row per (location, ref_year, birth_year).
-- birth_year = ref_year - age (direct mapping; see methods, §4.1).
-- Age bucket '100+' is open-ended: its birth_year means "born in or
-- before ref_year-100"; flagged so downstream stats can exclude it.
------------------------------------------------------------------
CREATE TABLE cohorts AS
SELECT
  CASE WHEN LocID = 900 THEN 'WLD' ELSE ISO3_code END           AS iso3,
  Location                                                       AS location_name,
  Time::SMALLINT                                                 AS ref_year,
  (Time - AgeGrpStart)::SMALLINT                                 AS birth_year,
  CAST(round(PopTotal  * 1000) AS BIGINT)                        AS alive,
  CAST(round(PopMale   * 1000) AS BIGINT)                        AS alive_male,
  CAST(round(PopFemale * 1000) AS BIGINT)                        AS alive_female,
  (AgeGrp = '100+')                                              AS open_ended
FROM pop_raw
WHERE keep_loc(LocTypeName, ISO3_code, LocID);

------------------------------------------------------------------
-- births: one row per (iso3, year). Raw Births are in thousands.
------------------------------------------------------------------
CREATE TABLE births AS
SELECT
  CASE WHEN LocID = 900 THEN 'WLD' ELSE ISO3_code END AS iso3,
  Time::SMALLINT                                      AS year,
  CAST(round(Births * 1000) AS BIGINT)                AS births
FROM ind_raw
WHERE keep_loc(LocTypeName, ISO3_code, LocID) AND Births IS NOT NULL;

------------------------------------------------------------------
-- rank_index: cumulative people younger than each cohort.
-- "younger" = born in a later calendar year.
------------------------------------------------------------------
CREATE TABLE rank_index AS
SELECT
  iso3, ref_year, birth_year,
  COALESCE(SUM(alive) OVER (PARTITION BY iso3, ref_year ORDER BY birth_year DESC
                            ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) AS cum_alive_younger,
  SUM(alive) OVER (PARTITION BY iso3, ref_year)                                   AS total_alive
FROM cohorts;

------------------------------------------------------------------
-- Assertions (build fails loudly if any trip).
------------------------------------------------------------------
-- World: survivors of a birth year cannot exceed births that year.
-- Open-ended 100+ bucket excluded (it pools many birth years).
-- Tolerance 1.5% for rounding + the age<->birth-year straddle (§4.1).
SELECT CASE WHEN count(*) = 0 THEN 'ok: world alive<=births'
       ELSE error('ASSERTION FAILED: world alive > births for ' || count(*) || ' cohort-years') END
FROM cohorts c
JOIN births b ON b.iso3 = 'WLD' AND b.year = c.birth_year
WHERE c.iso3 = 'WLD' AND NOT c.open_ended
  AND c.alive > b.births * 1.015;

-- Every (iso3, ref_year) has exactly 101 age rows.
SELECT CASE WHEN count(*) = 0 THEN 'ok: 101 ages everywhere'
       ELSE error('ASSERTION FAILED: age-row count wrong for ' || count(*) || ' location-years') END
FROM (SELECT iso3, ref_year FROM cohorts GROUP BY 1, 2 HAVING count(*) <> 101);

-- World population at ref_now is in a sane range (8-9 billion).
SELECT CASE WHEN total BETWEEN 8e9 AND 9e9 THEN 'ok: world total ' || total
       ELSE error('ASSERTION FAILED: world total implausible: ' || total) END
FROM (SELECT sum(alive) AS total FROM cohorts
      WHERE iso3 = 'WLD' AND ref_year = getvariable('ref_now'));

------------------------------------------------------------------
-- Outputs.
------------------------------------------------------------------
COPY cohorts    TO 'data/derived/cohorts.parquet'    (FORMAT PARQUET, COMPRESSION ZSTD);
COPY births     TO 'data/derived/births.parquet'     (FORMAT PARQUET, COMPRESSION ZSTD);
COPY rank_index TO 'data/derived/rank_index.parquet' (FORMAT PARQUET, COMPRESSION ZSTD);

-- App slice: everything the first paint needs, one fetch.
-- SNAPPY because hyparquet reads it without extra decompressors.
COPY (
  SELECT c.iso3, c.location_name, c.birth_year,
         c.alive, c.alive_male, c.alive_female, c.open_ended,
         r.cum_alive_younger, r.total_alive,
         b.births
  FROM cohorts c
  JOIN rank_index r USING (iso3, ref_year, birth_year)
  LEFT JOIN births b ON b.iso3 = c.iso3 AND b.year = c.birth_year
  WHERE c.ref_year = getvariable('ref_now')
  ORDER BY c.iso3, c.birth_year
) TO 'site/public/data/cohorts-now.parquet' (FORMAT PARQUET, COMPRESSION SNAPPY);

-- World-only slice as JSON for the first paint: the default view needs
-- ~100 rows, so the critical path carries no parquet reader at all.
COPY (
  SELECT c.birth_year, c.alive, c.alive_male, c.alive_female, c.open_ended,
         r.cum_alive_younger, r.total_alive, b.births
  FROM cohorts c
  JOIN rank_index r USING (iso3, ref_year, birth_year)
  LEFT JOIN births b ON b.iso3 = c.iso3 AND b.year = c.birth_year
  WHERE c.iso3 = 'WLD' AND c.ref_year = getvariable('ref_now')
  ORDER BY c.birth_year
) TO 'site/public/data/world-now.json' (FORMAT JSON, ARRAY true);

-- Location list for the country selector.
COPY (
  SELECT iso3, location_name, sum(alive) AS total_alive
  FROM cohorts
  WHERE ref_year = getvariable('ref_now') AND iso3 <> 'WLD'
  GROUP BY 1, 2 ORDER BY location_name
) TO 'site/public/data/locations.json' (FORMAT JSON, ARRAY true);

-- Per-location cohort trajectories, lazy-fetched by the app.
-- ponytail: static per-country files instead of DuckDB-WASM; revisit
-- if we ever need ad-hoc queries in the browser.
COPY (
  SELECT iso3, birth_year, ref_year, alive
  FROM cohorts
  WHERE NOT open_ended
  ORDER BY birth_year, ref_year
) TO 'site/public/data/traj' (FORMAT PARQUET, PARTITION_BY (iso3), COMPRESSION SNAPPY, OVERWRITE_OR_IGNORE);
