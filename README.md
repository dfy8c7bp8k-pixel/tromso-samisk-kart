# Samiske stedsnavn – Tromsø (Leaflet)

En enkel **statisk webapplikasjon** som viser samiske stedsnavn i Tromsø-området på kart.  
Kartet er bygget med **Leaflet** og **Kartverkets bakgrunnskart**, med popup-innhold på flere språk.

Popupene støtter:
- Samisk (sme)
- Norsk (no)
- Engelsk (en)

Applikasjonen krever ingen backend og kan publiseres direkte via GitHub Pages.

---

## Prosjektstatus

Dette prosjektet er utviklet **på oppdrag for Tromsø kommune** som en del av arbeid med
synliggjøring og tilgjengeliggjøring av samiske stedsnavn i Tromsø-området.

Applikasjonen er et **visningsverktøy**. Offisielle stedsnavn forvaltes av
Kartverket gjennom SSR (Sentralt stedsnavnregister).


### Datagrunnlag og avvik

Hoveddelen av stedsnavnene i prosjektet er hentet fra
SSR (Sentralt stedsnavnregister).

Et mindre antall stedsnavn var ikke registrert i SSR på tidspunktet for
utarbeidelse og er derfor lagt inn manuelt som del av prosjektet, basert på
lokal kunnskap og tilgjengelige kilder.

Disse oppføringene er kun ment som visning og inngår ikke i Kartverkets
autoritative stedsnavnregister.


## Demo / visning

https://<github-bruker>.github.io/<repo-navn>/

Eksempel:  
https://dfy8c7bp8k-pixel.github.io/tromso-samisk-kart/

Eksempelet viser en fungerende visning av løsningen slik den er implementert.


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