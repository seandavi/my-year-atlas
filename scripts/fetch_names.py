#!/usr/bin/env python3
"""Baby-names pipeline (issue #19): harvest top-5 first names per birth year
per country from national statistical offices into site/public/data/names/.

Usage: python3 scripts/fetch_names.py
Raw downloads are cached in data/raw/names/ (gitignored); delete a file to re-fetch.

Two sources are bot-walled for plain HTTP and need a real-browser fetch into the
cache first (see data/NAMES_SOURCES.md): New Zealand (nzl_names.csv, Imperva) and
Belgium (bel_girls.xlsx/bel_boys.xlsx, F5 TSPD — not yet obtained).
"""
import csv
import io
import json
import sys
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "data" / "raw" / "names"
OUT = ROOT / "site" / "public" / "data" / "names"
MIN_YEAR = 1926  # app range floor; harvest everything, emit >= this
TOP_N = 5

# ssa.gov (Akamai) 403s bare clients; full browser header set gets through.
BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Upgrade-Insecure-Requests": "1",
}


def fetch(url, filename, headers=None, post_json=None):
    """Download url into cache (skip if cached); return path."""
    dest = CACHE / filename
    if dest.exists():
        return dest
    req = urllib.request.Request(url, headers=headers or {"User-Agent": "Mozilla/5.0"})
    if post_json is not None:
        req.data = json.dumps(post_json).encode()
        req.add_header("Content-Type", "application/json")
    print(f"  downloading {url}")
    with urllib.request.urlopen(req, timeout=300) as r:
        data = r.read()
    dest.write_bytes(data)
    return dest


def top5(rows):
    """rows: iterable of (year:int, sex:'f'|'m', name:str, count:int) ->
    {year: {'f': [names...], 'm': [...]}} with counts strictly checked descending."""
    acc = {}
    for year, sex, name, count in rows:
        acc.setdefault(year, {}).setdefault(sex, []).append((name, count))
    years = {}
    for year, sexes in sorted(acc.items()):
        yd = {}
        for sex, pairs in sexes.items():
            pairs.sort(key=lambda p: -p[1])
            top = pairs[:TOP_N]
            # structural invariants
            assert 1 <= len(top) <= TOP_N
            counts = [c for _, c in top]
            assert counts == sorted(counts, reverse=True), (year, sex, top)
            for n, _ in top:
                assert n and not n.startswith("_") and "RARE" not in n.upper(), (year, sex, n)
            yd[sex] = [n for n, _ in top]
        years[year] = yd
    return years


def titlecase(name):
    """JEAN-PIERRE -> Jean-Pierre (str.title handles hyphens/apostrophes)."""
    return name.title()


# ---------------------------------------------------------------- countries

def usa():
    path = fetch("https://www.ssa.gov/oact/babynames/names.zip", "ssa_names.zip",
                 headers=BROWSER_HEADERS)
    rows = []
    with zipfile.ZipFile(path) as z:
        for info in z.namelist():
            if not info.startswith("yob"):
                continue
            year = int(info[3:7])
            for line in io.TextIOWrapper(z.open(info), encoding="utf-8"):
                name, sex, count = line.strip().split(",")
                rows.append((year, sex.lower(), name, int(count)))
    return {
        "source": "Social Security Administration",
        "url": "https://www.ssa.gov/oact/babynames/",
        "license": "Public domain (US government work)",
        "basis": "birth",
        "years": top5(rows),
    }


def fra():
    path = fetch("https://www.insee.fr/fr/statistiques/fichier/8595130/prenoms-2025-nat_csv.zip",
                 "fra_prenoms_nat.zip")
    rows = []
    with zipfile.ZipFile(path) as z:
        f = io.TextIOWrapper(z.open("prenoms-2025-nat.csv"), encoding="utf-8")
        for rec in csv.DictReader(f, delimiter=";"):
            if rec["prenom"].startswith("_"):  # _PRENOMS_RARES aggregate row
                continue
            if not rec["periode"].isdigit():  # XXXX = unknown year
                continue
            sex = "m" if rec["sexe"] == "1" else "f"
            rows.append((int(rec["periode"]), sex, titlecase(rec["prenom"]), int(rec["valeur"])))
    return {
        "source": "INSEE, Fichier des prénoms",
        "url": "https://www.insee.fr/fr/statistiques/8595130",
        "license": "Licence Ouverte / Open Licence 2.0 (Etalab)",
        "basis": "birth",
        "years": top5(rows),
    }


def sct():
    path = fetch("https://www.nrscotland.gov.uk/media/0ytjopcq/all-names-given-to-babies-between-1974-to-2025.zip",
                 "sct_names.zip")
    rows = []
    with zipfile.ZipFile(path) as z:
        f = io.TextIOWrapper(z.open("full-list-1974-2025.csv"), encoding="utf-8-sig")
        for rec in csv.DictReader(f):
            sex = {"Boy": "m", "Girl": "f"}[rec["Sex"]]
            rows.append((int(rec["Year"]), sex, rec["Name"], int(rec["Number"])))
    return {
        "source": "National Records of Scotland, Babies' First Names",
        "url": "https://www.nrscotland.gov.uk/publications/babies-first-names-2025/",
        "license": "Open Government Licence v3.0",
        "basis": "registration",
        "name": "Scotland",
        "note": "Scotland only; shown for GBR selections alongside E&W if/when added",
        "years": top5(rows),
    }


def irl():
    rows = []
    for table, sex in (("VSA50", "m"), ("VSA60", "f")):  # VSA50=boys, VSA60=girls
        path = fetch(f"https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/{table}/CSV/1.0/en",
                     f"irl_{table.lower()}.csv")
        with open(path, encoding="utf-8-sig") as f:
            for rec in csv.DictReader(f):
                if "Occurrences" not in rec["Statistic Label"] or "Rank" in rec["Statistic Label"]:
                    continue
                if not rec["VALUE"]:
                    continue
                name = rec["Boys Names" if sex == "m" else "Girls Names"]
                rows.append((int(rec["Year"]), sex, name, int(rec["VALUE"])))
    return {
        "source": "Central Statistics Office Ireland (PxStat VSA50/VSA60)",
        "url": "https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/VSA50/CSV/1.0/en",
        "license": "CC BY 4.0",
        "basis": "registration",
        "years": top5(rows),
    }


def _ssb_rows(filename, contents_code):
    path = fetch("https://data.ssb.no/api/v0/en/table/10467", filename,
                 post_json={"query": [{"code": "ContentsCode",
                                      "selection": {"filter": "item", "values": [contents_code]}}],
                            "response": {"format": "json-stat2"}})
    d = json.loads(path.read_text(encoding="utf-8"))
    names = d["dimension"]["Fornavn"]["category"]
    years_dim = d["dimension"]["Tid"]["category"]["index"]
    values = d["value"]
    n_years = len(years_dim)
    rows = []
    for code, pos in names["index"].items():
        sex = "f" if code[0] == "1" else "m"  # SSB prefixes girl names 1, boy names 2
        label = names["label"][code]
        for ystr, ypos in years_dim.items():
            v = values[pos * n_years + ypos]
            if v:  # None = suppressed (<4 persons); 0 = not used
                rows.append((int(ystr), sex, label, v))
    return rows


def nor():
    rows = _ssb_rows("nor_10467.json", "Personer")  # person counts, 1945+
    have = {y for y, _, _, _ in rows}
    # pre-1945 SSB publishes only per-cent-of-born-persons; rank by that instead
    rows += [r for r in _ssb_rows("nor_10467_pct.json", "PersonerProsent")
             if r[0] not in have]
    return {
        "source": "Statistics Norway (SSB), StatBank table 10467",
        "url": "https://data.ssb.no/api/v0/en/table/10467",
        "license": "CC BY 4.0",
        "basis": "birth",
        "note": "Year of birth up to 2020; year of naming from 2021. Names used by <200 persons and counts <4 are excluded by SSB.",
        "years": top5(rows),
    }


def aut():
    path = fetch("https://data.statistik.gv.at/data/OGDEXT_VORNAMEN_1.csv", "aut_vornamen.csv")
    agg = {}  # file is per district; sum to national
    with open(path, encoding="utf-8-sig") as f:
        for rec in csv.DictReader(f, delimiter=";"):
            sex = "m" if rec["C-GESCHLECHT-0"] == "1" else "f"
            key = (int(rec["C-JAHR-0"]), sex, rec["F-VORNAME_NORMALISIERT"])
            agg[key] = agg.get(key, 0) + int(rec["F-ANZAHL_LGEB"])
    rows = [(y, s, n, c) for (y, s, n), c in agg.items()]
    return {
        "source": "Statistik Austria, OGD Vornamen (OGDEXT_VORNAMEN_1)",
        "url": "https://data.statistik.gv.at/data/OGDEXT_VORNAMEN_1.csv",
        "license": "CC BY 4.0",
        "basis": "birth",
        "note": "Names are orthographically normalized by Statistik Austria.",
        "years": top5(rows),
    }


def can():
    path = fetch("https://www150.statcan.gc.ca/n1/tbl/csv/17100147-eng.zip", "can_17100147.zip")
    rows = []
    with zipfile.ZipFile(path) as z:
        f = io.TextIOWrapper(z.open("17100147.csv"), encoding="utf-8-sig")
        for rec in csv.DictReader(f):
            if rec["GEO"] != "Canada" or rec["Indicator"] != "Frequency" or not rec["VALUE"]:
                continue
            sex = {"Male": "m", "Female": "f"}.get(rec["Sex at birth"])
            if not sex:
                continue
            rows.append((int(rec["REF_DATE"]), sex, titlecase(rec["First name at birth"]),
                         int(float(rec["VALUE"]))))
    return {
        "source": "Statistics Canada, table 17-10-0147-01",
        "url": "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1710014701",
        "license": "Statistics Canada Open Licence",
        "basis": "birth",
        "years": top5(rows),
    }


def nzl():
    # catalogue.data.govt.nz is Imperva bot-walled; the cached CSV was fetched
    # with a real browser (see NAMES_SOURCES.md). Plain urllib gets a challenge page.
    path = CACHE / "nzl_names.csv"
    if not path.exists():
        raise RuntimeError(
            "nzl_names.csv missing from cache; site is bot-walled — fetch "
            "https://catalogue.data.govt.nz/dataset/01ee87cd-ecf8-44a1-ad33-b376a689e597/"
            "resource/0b0b326c-d720-480f-8f86-bf2d221c7d3f/download/baby-names-1900-to-2025.csv "
            "with a real browser into data/raw/names/")
    rows = []
    # ponytail: file mixes latin-1 and DOS-codepage bytes in a handful of rare
    # accented names (Renée/André/Danté, counts <40, never top-5); latin-1 is
    # lossless and every name that can rank is ASCII.
    with open(path, encoding="latin-1") as f:
        for rec in csv.DictReader(f):
            rows.append((int(rec["Year"]), rec["Sex"].lower(), rec["Name"], int(rec["Count"])))
    return {
        "source": "NZ Department of Internal Affairs, Baby Name popularity over time",
        "url": "https://catalogue.data.govt.nz/dataset/baby-name-popularity-over-time",
        "license": "CC BY 4.0",
        "basis": "registration",
        "years": top5(rows),
    }


def bel():
    girls, boys = CACHE / "bel_girls.xlsx", CACHE / "bel_boys.xlsx"
    if not (girls.exists() and boys.exists()):
        raise RuntimeError(
            "statbel.fgov.be is behind an F5/TSPD JS challenge (curl and headless "
            "browser both blocked); fetch Firstnames_Girls_1995-.xlsx and "
            "Firstnames_Boys_1995-.xlsx manually into data/raw/names/ as "
            "bel_girls.xlsx / bel_boys.xlsx")
    # ponytail: parse via duckdb read_xlsx when the files ever land in cache
    raise NotImplementedError("add xlsx parsing once files are obtainable")



def bra():
    """Brazil — IBGE Censo 2010 'Nomes no Brasil' API: top names by DECADE of
    birth x sex (self-reported in the census). Decade granularity: every year
    of a decade carries its decade's list; the UI must say 'born in the 1970s'.
    Terms: IBGE open data, attribution required."""
    years = {}
    for dec in range(1930, 2010, 10):
        by_sex = {}
        for sex, key in (("F", "f"), ("M", "m")):
            raw = fetch(
                f"https://servicodados.ibge.gov.br/api/v2/censos/nomes/ranking?decada={dec}&sexo={sex}",
                f"bra_{dec}_{sex}.json")
            rows = json.loads(raw.read_text(encoding="utf-8"))[0]["res"]
            by_sex[key] = [titlecase(r["nome"]) for r in rows[:5]]
        for y in range(dec, dec + 10):
            years[y] = dict(by_sex)
    return {
        "source": "IBGE, Censo Demografico 2010 (Nomes no Brasil)",
        "url": "https://censo2010.ibge.gov.br/nomes/",
        "license": "IBGE open data, attribution required",
        "basis": "birth",
        "granularity": "decade",
        "years": years,
    }

COUNTRIES = [
    ("USA", usa), ("FRA", fra), ("SCT", sct), ("IRL", irl),
    ("NOR", nor), ("AUT", aut), ("CAN", can), ("NZL", nzl), ("BEL", bel), ("BRA", bra),
]


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    index, failed = {}, {}
    for iso3, fn in COUNTRIES:
        try:
            data = fn()
        except Exception as e:  # a failed country must not sink the run
            print(f"{iso3}: FAILED - {e}", file=sys.stderr)
            failed[iso3] = str(e)
            continue
        emit_years = {y: v for y, v in data["years"].items() if y >= MIN_YEAR}
        if not emit_years:
            failed[iso3] = "no years >= 1926"
            continue
        data["years"] = {str(y): emit_years[y] for y in sorted(emit_years)}
        out = OUT / f"{iso3}.json"
        out.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")),
                       encoding="utf-8")
        ys = sorted(emit_years)
        index[iso3] = {"from": ys[0], "to": ys[-1], "basis": data["basis"]}
        if "granularity" in data:
            index[iso3]["granularity"] = data["granularity"]
        print(f"{iso3}: {ys[0]}-{ys[-1]} ({len(ys)} years, {out.stat().st_size // 1024} KB)")
    # countries with an existing output but a failed re-fetch keep their entry
    for f in OUT.glob("*.json"):
        iso3 = f.stem
        if iso3 == "index" or iso3 in index:
            continue
        d = json.loads(f.read_text(encoding="utf-8"))
        ys = sorted(int(y) for y in d["years"])
        index[iso3] = {"from": ys[0], "to": ys[-1], "basis": d["basis"]}
        if "granularity" in d:
            index[iso3]["granularity"] = d["granularity"]
    (OUT / "index.json").write_text(json.dumps(index, separators=(",", ":")), encoding="utf-8")

    # spot checks
    usa_data = json.loads((OUT / "USA.json").read_text(encoding="utf-8"))
    assert usa_data["years"]["1971"]["f"][0] == "Jennifer", usa_data["years"]["1971"]
    print("\nUSA 1971:", usa_data["years"]["1971"])
    fra_data = json.loads((OUT / "FRA.json").read_text(encoding="utf-8"))
    print("FRA 1971:", fra_data["years"]["1971"])
    if failed:
        print("\nUnavailable:", ", ".join(f"{k} ({v.splitlines()[0][:60]})" for k, v in failed.items()))


if __name__ == "__main__":
    main()
