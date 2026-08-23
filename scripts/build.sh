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
# Data-vintage stamp, served with the site and shown in the footer.
cat > site/public/data/meta.json <<EOF
{"source":"UN WPP 2024","variant":"medium","ref_year":2026,"built":"$(date -u +%Y-%m-%d)","commit":"$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"}
EOF
echo "--- derived sizes"
du -sh data/derived/* site/public/data/cohorts-now.parquet site/public/data/traj
