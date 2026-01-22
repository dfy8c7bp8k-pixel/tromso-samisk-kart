#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd
import requests

# ================= KONFIG =================

KNR = "5501"  # Tromsø kommune
API_BASE = "https://api.kartverket.no/stedsnavn/v1"

INPUT_XLSX = Path("tromso_samiske_stedsnavn_input.xlsx")

OUTPUT_GEOJSON = Path("data/stedsnavn.geojson")
OUTPUT_RAPPORT = Path("data/ssr_rapport.json")

# Leaflet forventer lon/lat i EPSG:4326
KOORDSYS_PREFERRED = ["4326", "4258", "25833"]

SLEEP_S = 0.10
TIMEOUT_S = 30

DEBUG = False

# =========================================


def norm(s: Any) -> str:
    return "" if s is None else str(s).strip()


def clean_query(s: str) -> str:
    s = norm(s)
    s = re.sub(r"\s*\(.*?\)\s*", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"[;,]\s*$", "", s).strip()
    return s


def safe_get(d: Any, *keys: str, default=None):
    cur = d
    for k in keys:
        if isinstance(cur, dict) and k in cur:
            cur = cur[k]
        else:
            return default
    return cur


@dataclass
class HitChoice:
    score: int
    hit: Dict[str, Any]
    display_name: str
    stedsnummer: Optional[str]


class SSRClient:
    def __init__(self):
        self.s = requests.Session()
        self.s.headers.update(
            {
                "User-Agent": "tromso-samiske-kart/1.0 (educational)",
                "Accept": "application/json",
            }
        )

    def get_json(self, url: str, params: Dict[str, Any]) -> Any:
        r = self.s.get(url, params=params, timeout=TIMEOUT_S)
        if DEBUG:
            print("DEBUG URL:", r.url)
        r.raise_for_status()
        return r.json()

    def search_navn(self, query: str) -> Dict[str, Any]:
        q = query.strip()
        if "*" not in q:
            q = q + "*"

        params = {
            "sok": q,
            "knr": KNR,
            "treffPerSide": 50,
            "side": 1,
        }
        return self.get_json(f"{API_BASE}/navn", params=params)

    def sted_by_id(self, stedsnummer: str, koordsys: str) -> Dict[str, Any]:
        params = {"koordsys": koordsys}
        return self.get_json(f"{API_BASE}/sted/{stedsnummer}", params=params)


def extract_stedsnummer(hit: Dict[str, Any]) -> Optional[str]:
    candidates = [
        safe_get(hit, "sted", "stedsnummer"),
        safe_get(hit, "sted", "stedsnr"),
        hit.get("stedsnummer"),
        hit.get("stedsnr"),
    ]
    for c in candidates:
        c = norm(c)
        if c:
            return c
    return None


def extract_display_name(hit: Dict[str, Any]) -> str:
    return (
        norm(safe_get(hit, "navn", "stedsnavn", "skrivemåte"))
        or norm(safe_get(hit, "stedsnavn", "skrivemåte"))
        or norm(hit.get("skrivemåte"))
        or norm(hit.get("navn"))
        or ""
    )


def find_first_list_by_key(obj: Any, wanted_key: str) -> Optional[List[Any]]:
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == wanted_key and isinstance(v, list):
                return v
            res = find_first_list_by_key(v, wanted_key)
            if res is not None:
                return res
    elif isinstance(obj, list):
        for item in obj:
            res = find_first_list_by_key(item, wanted_key)
            if res is not None:
                return res
    return None


def choose_best_hit(
    payload: Dict[str, Any],
    samisk: str,
    norsk: str,
) -> Tuple[Optional[HitChoice], List[HitChoice]]:
    hits = find_first_list_by_key(payload, "navn")
    if not isinstance(hits, list) or not hits:
        return None, []

    if DEBUG:
        print("DEBUG antall treff i payload:", len(hits))

    sam_l = clean_query(samisk).lower()
    nor_l = clean_query(norsk).lower()

    scored: List[HitChoice] = []
    for h in hits:
        disp = extract_display_name(h)
        disp_l = disp.lower().strip()

        score = 0
        if sam_l and disp_l == sam_l:
            score += 12
        if nor_l and disp_l == nor_l:
            score += 10
        if sam_l and sam_l in disp_l:
            score += 4
        if nor_l and nor_l in disp_l:
            score += 3

        knr_val = norm(
            h.get("kommunenummer")
            or h.get("knr")
            or safe_get(h, "sted", "kommunenummer")
            or safe_get(h, "sted", "knr")
            or ""
        )
        if knr_val == KNR:
            score += 3

        stedsnr = extract_stedsnummer(h)
        if stedsnr:
            score += 1

        scored.append(HitChoice(score=score, hit=h, display_name=disp, stedsnummer=stedsnr))

    scored.sort(key=lambda x: x.score, reverse=True)
    return scored[0], scored


def extract_repr_point_from_hit(hit: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Hent representasjonspunkt direkte fra /navn-treff.
    """
    p = safe_get(hit, "sted", "representasjonspunkt")
    if not isinstance(p, dict):
        p = hit.get("representasjonspunkt")
    if not isinstance(p, dict):
        return None

    nord = p.get("nord", p.get("y"))
    ost = p.get("ost", p.get("øst", p.get("x")))
    ks = p.get("koordsys") or p.get("koordinatsystem")  # kan være 4326/4258/25833

    if nord is None or ost is None:
        return None

    return {"nord": float(nord), "ost": float(ost), "koordsys": norm(ks)}


def extract_repr_point_from_sted(sted_payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Hent representasjonspunkt fra /sted/{id}.
    """
    sted_obj = sted_payload.get("sted", sted_payload)
    p = sted_obj.get("representasjonspunkt")
    if not isinstance(p, dict):
        return None

    nord = p.get("nord", p.get("y"))
    ost = p.get("ost", p.get("øst", p.get("x")))
    ks = p.get("koordsys") or p.get("koordinatsystem")

    if nord is None or ost is None:
        return None

    return {"nord": float(nord), "ost": float(ost), "koordsys": norm(ks)}


def to_lonlat(p: Dict[str, Any]) -> Optional[Tuple[float, float]]:
    ks = norm(p.get("koordsys"))

    # For 4326/4258 tolker vi ost=lon, nord=lat
    if ks in ("4326", "4258", ""):
        return float(p["ost"]), float(p["nord"])

    if ks == "25833":
        try:
            from pyproj import Transformer

            transformer = Transformer.from_crs("EPSG:25833", "EPSG:4326", always_xy=True)
            lon, lat = transformer.transform(float(p["ost"]), float(p["nord"]))
            return float(lon), float(lat)
        except Exception:
            return None

    return None


def build_queries(samisk: str, norsk: str) -> List[str]:
    q: List[str] = []
    s1 = clean_query(samisk)
    n1 = clean_query(norsk)

    if s1:
        q.append(s1)
        q.append(re.split(r"[/,]", s1)[0].strip())

    if n1:
        q.append(n1)
        q.append(re.split(r"[/,]", n1)[0].strip())

    seen = set()
    out: List[str] = []
    for item in q:
        item = item.strip()
        if item and item not in seen:
            seen.add(item)
            out.append(item)
    return out


def main():
    if not INPUT_XLSX.exists():
        raise SystemExit(f"Fant ikke {INPUT_XLSX}. Legg den i prosjektroten.")

    df = pd.read_excel(INPUT_XLSX)

    if "samisk_navn" not in df.columns and "norsk_navn" not in df.columns:
        raise SystemExit("Excel må ha minst 'samisk_navn' eller 'norsk_navn'.")

    client = SSRClient()

    features: List[Dict[str, Any]] = []
    rapport: Dict[str, Any] = {"ok": [], "flere_treff": [], "ingen_treff": [], "feil": []}

    for _, row in df.iterrows():
        samisk = norm(row.get("samisk_navn"))
        norsk = norm(row.get("norsk_navn"))
        objekttype = norm(row.get("objekttype"))
        nivaa = norm(row.get("nivaa"))
        infotekst_no = norm(row.get("infotekst_no"))
        infotekst_sme = norm(row.get("infotekst_sme"))
        notion_url_no = norm(row.get("notion_url_no"))
        notion_url_sme = norm(row.get("notion_url_sme"))
        infotekst_en = norm(row.get("infotekst_en"))
        notion_url_en = norm(row.get("notion_url_en"))

        if not samisk and not norsk:
            continue

        queries = build_queries(samisk, norsk)

        best_choice: Optional[HitChoice] = None
        scored_list: List[HitChoice] = []
        last_error: Optional[str] = None

        # Søk /navn
        for q in queries:
            try:
                payload = client.search_navn(q)
                choice, scored = choose_best_hit(payload, samisk, norsk)
                if choice:
                    best_choice = choice
                    scored_list = scored
                    break
            except Exception as e:
                last_error = str(e)
            finally:
                time.sleep(SLEEP_S)

        if not best_choice:
            rapport["ingen_treff"].append(
                {
                    "samisk_navn": samisk,
                    "norsk_navn": norsk,
                    "queries": queries,
                    "problem": "Fant ingen treff via /navn",
                    "last_error": last_error,
                }
            )
            continue

        # 1) Først: koordinater direkte fra /navn-treffet (unngår /sted 404)
        rp = extract_repr_point_from_hit(best_choice.hit)
        lonlat = to_lonlat(rp) if rp else None
        if lonlat:
            lon, lat = lonlat
            features.append(
                {
                    "type": "Feature",
                    "properties": {
                        "samisk_navn": samisk,
                        "norsk_navn": norsk,
                        "objekttype": objekttype,
                        "nivaa": nivaa,
                        "knr": KNR,
                        "stedsnummer": best_choice.stedsnummer,
                        "ssr_display": best_choice.display_name,
                        "infotekst_no": infotekst_no,
                        "infotekst_sme": infotekst_sme,
                        "infotekst_en": infotekst_en,
                        "notion_url_no": notion_url_no,
                        "notion_url_sme": notion_url_sme,
                        "notion_url_en": notion_url_en         
                    },
                    "geometry": {"type": "Point", "coordinates": [float(lon), float(lat)]},
                }
            )
            rapport["ok"].append(
                {
                    "samisk_navn": samisk,
                    "norsk_navn": norsk,
                    "queries": queries,
                    "stedsnummer": best_choice.stedsnummer,
                    "chosen_display": best_choice.display_name,
                    "source": "navn.representasjonspunkt",
                }
            )
            continue

        # 2) Fallback: prøv /sted/{stedsnummer} hvis mulig (kan gi 404)
        stedsnr = best_choice.stedsnummer
        if not stedsnr:
            rapport["ingen_treff"].append(
                {
                    "samisk_navn": samisk,
                    "norsk_navn": norsk,
                    "queries": queries,
                    "problem": "Treff uten stedsnummer og uten representasjonspunkt",
                    "last_error": last_error,
                }
            )
            continue

        point_lonlat: Optional[Tuple[float, float]] = None
        point_meta: Dict[str, Any] = {}

        for ks in KOORDSYS_PREFERRED:
            try:
                sted_payload = client.sted_by_id(stedsnr, ks)
                rp2 = extract_repr_point_from_sted(sted_payload)
                if not rp2:
                    continue
                point_meta = rp2
                lonlat2 = to_lonlat(rp2)
                if lonlat2:
                    point_lonlat = lonlat2
                    break
            except Exception as e:
                last_error = str(e)
            finally:
                time.sleep(SLEEP_S)

        if not point_lonlat:
            rapport["feil"].append(
                {
                    "samisk_navn": samisk,
                    "norsk_navn": norsk,
                    "queries": queries,
                    "stedsnummer": stedsnr,
                    "problem": "Fant ikke representasjonspunkt/kunne ikke konvertere til lon/lat",
                    "repr_point": point_meta,
                    "last_error": last_error,
                }
            )
            continue

        lon, lat = point_lonlat

        features.append(
            {
                "type": "Feature",
                "properties": {
                    "samisk_navn": samisk,
                    "norsk_navn": norsk,
                    "objekttype": objekttype,
                    "nivaa": nivaa,
                    "knr": KNR,
                    "stedsnummer": stedsnr,
                    "ssr_display": best_choice.display_name,
                },
                "geometry": {"type": "Point", "coordinates": [float(lon), float(lat)]},
            }
        )

        # Treffkvalitet-logg for fallback
        if len(scored_list) > 1 and scored_list[0].score == scored_list[1].score:
            rapport["flere_treff"].append(
                {
                    "samisk_navn": samisk,
                    "norsk_navn": norsk,
                    "queries": queries,
                    "stedsnummer": stedsnr,
                    "top": [
                        {"score": x.score, "display": x.display_name, "stedsnummer": x.stedsnummer}
                        for x in scored_list[:5]
                    ],
                    "source": "sted.representasjonspunkt",
                }
            )
        else:
            rapport["ok"].append(
                {
                    "samisk_navn": samisk,
                    "norsk_navn": norsk,
                    "queries": queries,
                    "stedsnummer": stedsnr,
                    "chosen_display": best_choice.display_name,
                    "source": "sted.representasjonspunkt",
                }
            )

    OUTPUT_GEOJSON.parent.mkdir(parents=True, exist_ok=True)

    OUTPUT_GEOJSON.write_text(
        json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    OUTPUT_RAPPORT.write_text(
        json.dumps(rapport, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Skrev {len(features)} punkter til: {OUTPUT_GEOJSON}")
    print(f"Skrev rapport til: {OUTPUT_RAPPORT}")
    print(
        f"OK: {len(rapport['ok'])} | Flere treff: {len(rapport['flere_treff'])} | "
        f"Ingen treff: {len(rapport['ingen_treff'])} | Feil: {len(rapport['feil'])}"
    )


if __name__ == "__main__":
    main()