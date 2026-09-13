"""
fetch_and_build_maharashtra_villages.py

One-shot, no-manual-steps ingestion pipeline: downloads the real LGD
village dataset, extracts it, filters to Maharashtra, and writes
scripts/output/maharashtra-villages.json in the shape the rest of this
project expects.

Maharashtra, not any other state - this project is built for SIH
problem statement SIH26133, submitted by the Government of
Maharashtra (Maharashtra State Innovation Society, Department of
Skills, Employment, Entrepreneurship and Innovation). The existing
seed data in supabase/migrations/002_phase2_to_6.sql already uses
Palghar and Gadchiroli districts - this script should produce data
consistent with that.

Source (verified, stable GitHub Releases asset - not an interactive
page, safe to fetch programmatically):
  https://github.com/ramSeraph/indian_admin_boundaries/releases/download/villages/LGD_Villages.geojsonl.7z

  Description per the release notes: "Indian Village Boundary data with
  LGD mappings." Source: LGD / Bharatmaps. License: CC0 1.0 (attribute
  datameet + the original government source where possible). Per the
  same release notes, it's missing Himachal Pradesh, J&K, Sikkim,
  Meghalaya, Mizoram, Manipur, Nagaland, and Arunachal Pradesh -
  Maharashtra is not on that list.

Format: one GeoJSON Feature per line (.geojsonl), i.e. each line has a
`geometry` (the village boundary polygon - discarded here, you don't
need it for a dropdown) and `properties` (the actual name/code fields
- kept).

WHAT I COULD NOT VERIFY FROM HERE
-----------------------------------------------------
I cannot open a .7z file in this environment, so I don't know the
exact property key names LGD/Bharatmaps used (e.g. whether the state
field is called "stname", "STATE_NAME", "State_Name", etc). Rather
than guess and silently mislabel data, this script:
  1. Tries a list of plausible candidate key names per field.
  2. Prints the full property-key list of the first record it reads,
     so you can SEE the real schema on first run.
  3. Refuses to proceed with a best-guess mapping - if it can't find a
     confident match, it stops and shows you what it found instead of
     writing wrong data.
Run it once, look at the printed keys if it stops, adjust the
CANDIDATE_KEYS lists a few lines down to match, then rerun.

USAGE
-----------------------------------------------------
    pip install requests py7zr
    python fetch_and_build_maharashtra_villages.py

Produces: ./output/maharashtra-villages.json
"""

import json
import re
import sys
from pathlib import Path

import requests
import py7zr

SOURCE_URL = (
    "https://github.com/ramSeraph/indian_admin_boundaries/"
    "releases/download/villages/LGD_Villages.geojsonl.7z"
)

DOWNLOAD_DIR = Path("./_lgd_download")
ARCHIVE_PATH = DOWNLOAD_DIR / "LGD_Villages.geojsonl.7z"
DISTRICTS_JSON_PATH = Path("../data/maharashtra-districts.json")
OUTPUT_PATH = Path("./output/maharashtra-villages.json")

TARGET_STATE = "maharashtra"

# Adjust these if the script tells you it can't find a confident match.
# Order matters - first match wins.
CANDIDATE_KEYS = {
    "state": ["stname", "STATE_NAME", "State_Name", "state_name", "st_name", "State", "STATE"],
    "district": ["dtname", "DISTRICT_NAME", "District_Name", "district_name", "dt_name", "District", "DISTRICT"],
    "subdistrict": ["sdtname", "SUBDIST_NAME", "SubDistrict_Name", "subdistrict_name", "Subdistrict", "SUB_DIST"],
    "village_name": ["vilname11", "vilnam_soi", "vlname", "VILLAGE_NAME", "Village_Name", "village_name", "vill_name", "Village", "VILLAGE"],
    "village_code": ["vilcode11", "LGD_VILLAGE_CODE", "village_code", "VILLAGE_CODE", "vl_code", "vlcode"],
}

# Known official-name differences between this source and
# data/maharashtra-districts.json - extend if the "unmatched districts"
# report at the end lists more. Aurangabad and Osmanabad were
# officially renamed to Chhatrapati Sambhajinagar and Dharashiv in
# 2023-24; the LGD source may still use either the old or new name.
DISTRICT_NAME_ALIASES = {
    "aurangabad": "Chhatrapati Sambhajinagar",
    "osmanabad": "Dharashiv",
    "mumbai": "Mumbai City",
}


def find_key(props: dict, candidates: list[str]) -> str | None:
    for c in candidates:
        if c in props:
            return c
    return None


def download_archive():
    if ARCHIVE_PATH.exists():
        print(f"Already downloaded: {ARCHIVE_PATH} (delete it to re-download)")
        return
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Downloading {SOURCE_URL} ...")
    with requests.get(SOURCE_URL, stream=True, timeout=120) as r:
        r.raise_for_status()
        total = int(r.headers.get("content-length", 0))
        written = 0
        tmp_path = ARCHIVE_PATH.with_suffix(ARCHIVE_PATH.suffix + ".part")
        with open(tmp_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=1024 * 1024):
                f.write(chunk)
                written += len(chunk)
                if total:
                    print(f"\r  {written / 1e6:.1f} / {total / 1e6:.1f} MB", end="")
        print()
        if total and written != total:
            tmp_path.unlink(missing_ok=True)
            raise RuntimeError(
                f"Download incomplete: got {written} bytes, expected {total}. "
                "Rerun the script to retry (partial file was removed)."
            )
        tmp_path.rename(ARCHIVE_PATH)
    print("Download complete.")


def extract_archive() -> Path:
    extract_dir = DOWNLOAD_DIR / "extracted"
    if extract_dir.exists() and any(extract_dir.iterdir()):
        print(f"Already extracted in {extract_dir}")
    else:
        extract_dir.mkdir(parents=True, exist_ok=True)
        print(f"Extracting {ARCHIVE_PATH} ...")
        with py7zr.SevenZipFile(ARCHIVE_PATH, mode="r") as archive:
            archive.extractall(path=extract_dir)
        print("Extraction complete.")

    geojsonl_files = list(extract_dir.rglob("*.geojsonl"))
    if not geojsonl_files:
        print(f"ERROR: no .geojsonl file found under {extract_dir} after extraction.", file=sys.stderr)
        print(f"Contents: {list(extract_dir.rglob('*'))}", file=sys.stderr)
        sys.exit(1)
    return geojsonl_files[0]


def load_district_lookup() -> dict[str, str]:
    with open(DISTRICTS_JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)
    lookup = {}
    for d in data["districts"]:
        lookup[d["name"].strip().lower()] = d["id"]
    return lookup


def main():
    download_archive()
    geojsonl_path = extract_archive()
    district_lookup = load_district_lookup()

    resolved_keys = None
    villages = []
    seen_ids = set()
    unmatched_districts = set()
    total_lines = 0
    maharashtra_lines = 0

    print(f"Reading {geojsonl_path} (streaming, filtering to '{TARGET_STATE}')...")
    with open(geojsonl_path, encoding="utf-8") as f:
        for line in f:
            total_lines += 1
            if TARGET_STATE not in line.lower():
                continue  # cheap pre-filter before paying for a full JSON parse

            try:
                feature = json.loads(line)
            except json.JSONDecodeError:
                continue
            props = feature.get("properties", feature)

            if resolved_keys is None:
                resolved_keys = {field: find_key(props, keys) for field, keys in CANDIDATE_KEYS.items()}
                missing = [field for field, key in resolved_keys.items() if key is None]
                if missing:
                    print("\nERROR: could not confidently find these fields:", missing, file=sys.stderr)
                    print("Actual property keys on the first matching record:", file=sys.stderr)
                    print(sorted(props.keys()), file=sys.stderr)
                    print("\nUpdate CANDIDATE_KEYS at the top of this script to match, then rerun.", file=sys.stderr)
                    sys.exit(1)
                print("Resolved field mapping:", resolved_keys)

            state_val = str(props.get(resolved_keys["state"], "")).strip()
            if state_val.lower() != TARGET_STATE:
                continue  # the substring pre-filter can false-positive; confirm properly here

            maharashtra_lines += 1
            district_val = str(props.get(resolved_keys["district"], "")).strip()
            village_val = str(props.get(resolved_keys["village_name"], "")).strip()
            subdistrict_val = str(props.get(resolved_keys["subdistrict"], "")).strip()
            code_val = str(props.get(resolved_keys["village_code"], "")).strip()

            if not district_val or not village_val:
                continue

            district_key = DISTRICT_NAME_ALIASES.get(district_val.lower(), district_val).lower()
            district_id = district_lookup.get(district_key)
            if district_id is None:
                unmatched_districts.add(district_val)
                continue

            village_id = code_val if code_val else f"{district_id}-{re.sub(r'[^A-Z0-9]', '', village_val.upper())}"
            if village_id in seen_ids:
                continue
            seen_ids.add(village_id)

            villages.append({
                "id": village_id,
                "district_id": district_id,
                "name": village_val,
                "taluka": subdistrict_val,  # provenance only - not used by the dropdown
            })

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump({"villages": villages}, f, ensure_ascii=False, indent=2)

    print(f"\nScanned {total_lines} total lines, {maharashtra_lines} matched Maharashtra.")
    print(f"Wrote {len(villages)} villages to {OUTPUT_PATH}")
    if unmatched_districts:
        print(f"\nWARNING: {len(unmatched_districts)} district name(s) from the source file didn't match "
              f"data/maharashtra-districts.json and were skipped: {sorted(unmatched_districts)}")
        print("Add these to DISTRICT_NAME_ALIASES at the top of this script if they're just naming "
              "differences (e.g. 'Aurangabad' vs 'Chhatrapati Sambhajinagar'), then rerun.")


if __name__ == "__main__":
    main()
