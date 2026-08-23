#!/usr/bin/env python3
"""Download UN WPP 2024 source CSVs to data/raw/ and record sha256 in data/SOURCES.md."""
import hashlib
import pathlib
import urllib.request
from datetime import date

# Verified 2026-08-22. The path published in older docs
# (…/wpp/Download/Files/…) now 404s; files live under /wpp/assets/.
BASE = "https://population.un.org/wpp/assets/Excel%20Files/1_Indicator%20(Standard)/CSV_FILES/"
FILES = [
    "WPP2024_PopulationBySingleAgeSex_Medium_1950-2023.csv.gz",
    "WPP2024_PopulationBySingleAgeSex_Medium_2024-2100.csv.gz",
    "WPP2024_Demographic_Indicators_Medium.csv.gz",
]

# NASA GISTEMP v4 global annual temperature anomaly (vs 1951-1980 baseline).
# US government work — public domain. Updated monthly upstream.
GISTEMP_URL = "https://data.giss.nasa.gov/gistemp/tabledata_v4/GLB.Ts+dSST.csv"
GISTEMP_FILE = "gistemp_glb.csv"

ROOT = pathlib.Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"


def sha256(path: pathlib.Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    RAW.mkdir(parents=True, exist_ok=True)
    rows = []
    for name in FILES:
        dest = RAW / name
        if not dest.exists():
            print(f"downloading {name} …")
            urllib.request.urlretrieve(BASE + name, dest)
        rows.append((name, dest.stat().st_size, sha256(dest)))
        print(f"  {name}  {rows[-1][1]:,} bytes  sha256={rows[-1][2]}")

    gt = RAW / GISTEMP_FILE
    if not gt.exists():
        print(f"downloading {GISTEMP_FILE} …")
        urllib.request.urlretrieve(GISTEMP_URL, gt)
    rows.append((GISTEMP_FILE, gt.stat().st_size, sha256(gt)))
    print(f"  {GISTEMP_FILE}  {rows[-1][1]:,} bytes  sha256={rows[-1][2]}")

    sources = ROOT / "data" / "SOURCES.md"
    with open(sources, "w") as f:
        f.write("# Data sources\n\n")
        f.write("**UN World Population Prospects 2024** — medium variant.\n")
        f.write(f"Downloaded {date.today().isoformat()} from `{BASE}`\n\n")
        f.write("License: [CC BY 3.0 IGO](https://creativecommons.org/licenses/by/3.0/igo/). ")
        f.write("Citation: United Nations, Department of Economic and Social Affairs, "
                "Population Division (2024). *World Population Prospects 2024*.\n\n")
        f.write("**Natural Earth 110m country geometry** — via the `world-atlas@2` "
                "package (`countries-110m.json`, jsDelivr). Natural Earth is in the "
                "public domain. Projected to Equal Earth at build time by "
                "`scripts/build_map.mjs`.\n\n")
        f.write("**NASA GISTEMP v4** — global annual surface temperature anomaly "
                "vs the 1951–1980 baseline, from "
                f"`{GISTEMP_URL}`. US government work, public domain. "
                "Citation: GISTEMP Team, GISS Surface Temperature Analysis, "
                "NASA Goddard Institute for Space Studies.\n\n")
        f.write("| file | bytes | sha256 |\n|---|---|---|\n")
        for name, size, digest in rows:
            f.write(f"| `{name}` | {size:,} | `{digest}` |\n")
    print(f"wrote {sources}")


if __name__ == "__main__":
    main()
