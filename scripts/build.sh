#!/usr/bin/env bash
# Thin shell around the pipeline: fetch raw, build derived, print sizes.
set -euo pipefail
cd "$(dirname "$0")/.."

python3 scripts/fetch.py
mkdir -p data/derived site/public/data
rm -rf site/public/data/traj
duckdb -f scripts/build.sql
echo "--- derived sizes"
du -sh data/derived/* site/public/data/cohorts-now.parquet site/public/data/traj
