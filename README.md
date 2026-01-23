# Samiske stedsnavn – Tromsø (Leaflet)

En enkel **statisk webapplikasjon** som viser samiske stedsnavn i Tromsø-området på kart.  
Kartet er bygget med **Leaflet** og **Kartverkets bakgrunnskart**, med popup-innhold på flere språk.

Popupene støtter:
- Samisk (sme)
- Norsk (no)
- Engelsk (en)

Applikasjonen krever ingen backend og kan publiseres direkte via GitHub Pages.

---

## Demo

https://<github-bruker>.github.io/<repo-navn>/

Eksempel:  
https://dfy8c7bp8k-pixel.github.io/tromso-samisk-kart/

---

## Teknologi

- **Leaflet** – kartbibliotek (MIT-lisens)
- **Kartverket WMTS** – bakgrunnskart
- **SSR (Sentralt stedsnavnregister)** – stedsnavndata
- **GeoJSON** – dataformat
- Ren HTML og JavaScript (ingen rammeverk)

---

## Datastruktur

Stedsnavn og metadata leveres som GeoJSON i: data/stedsnavn.geojson

Felter per punkt:

- `samisk_navn`
- `norsk_navn`
- `infotekst_sme`
- `infotekst_no`
- `infotekst_en`
- `notion_url_sme`
- `notion_url_no`
- `notion_url_en`

---

## Lokal kjøring

Start en enkel statisk server fra repo-roten: python3 -m http.server 8000

Åpne deretter:
http://localhost:8000

---

## Dataprosess (valgfritt)

Excel-input:
tromso_samiske_stedsnavn_input.xlsx

Konvertering til GeoJSON:
python3 scripts/ssr_to_geojson.py

Dette regenererer:
data/stedsnavn.geojson


---

## Rettigheter og kreditering

### Kartbakgrunn
© Kartverket  
WMTS levert via https://cache.kartverket.no/

### Stedsnavn
SSR (Sentralt stedsnavnregister) © Kartverket  
https://www.kartverket.no/til-lands/stadnamn/sok-stadnamn-i-kart

Dataene brukes i tråd med Kartverkets vilkår for visning.  
Zoom-nivåer er satt innenfor tillatt bruk.

### Kartbibliotek
Leaflet (BSD-2-Clause)  
https://leafletjs.com/

---

## Lisens

Koden i dette repoet kan brukes fritt med kreditering.  
Kart- og stedsnavndata følger Kartverkets egne vilkår.