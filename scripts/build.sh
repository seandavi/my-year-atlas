#!/usr/bin/env bash
# Thin shell around the pipeline: fetch raw, build derived, print sizes.
set -euo pipefail
cd "$(dirname "$0")/.."

python3 scripts/fetch.py
mkdir -p data/derived site/public/data
rm -rf site/public/data/traj site/public/data/now
duckdb -f scripts/build.sql
mkdir -p site/public/data/now
duckdb -f data/derived/_per_country.sql
# World map geometry -> projected SVG paths (fetches world-atlas once).
[ -f data/raw/countries-110m.json ] || curl -sL 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json' -o data/raw/countries-110m.json
duckdb -noheader -csv -c "SELECT DISTINCT ISO3_code, LocID FROM read_csv_auto('data/raw/WPP2024_Demographic_Indicators_Medium.csv.gz', sample_size=-1) WHERE LocTypeName='Country/Area' AND ISO3_code IS NOT NULL ORDER BY ISO3_code" > data/derived/iso_m49.csv
node scripts/build_map.mjs
# Keep the methods page's cited build commit in sync with this build.
sed -i -E "s|(build commit <code>)[0-9a-f]+|\1$(git rev-parse --short HEAD)|; s|(produced at commit <code>)[0-9a-f]+|\1$(git rev-parse --short HEAD)|" site/public/methods.html
# Data-vintage stamp, served with the site and shown in the footer.
cat > site/public/data/meta.json <<EOF
{"source":"UN WPP 2024","variant":"medium","ref_year":2026,"built":"$(date -u +%Y-%m-%d)","commit":"$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"}
EOF
echo "--- derived sizes"
du -sh data/derived/* site/public/data/cohorts-now.parquet site/public/data/traj
