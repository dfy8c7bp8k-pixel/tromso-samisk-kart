# Prosjektnotater – Samiske stedsnavn i Tromsø

Interne arbeidsnotater. Ikke ment for publikum.

---

## Formål
- Vise samiske og norske stedsnavn i Tromsø på kart
- Formidling på samisk, norsk og engelsk
- Lav terskel: statisk frontend uten backend

---

## Teknisk arkitektur
- Frontend-only (HTML + JS + GeoJSON)
- Leaflet for kart
- Kartgrunnlag: Kartverket
- Hosting: GitHub Pages

Ingen backend, ingen API-nøkler, ingen autentisering.

---

## Dataflyt
1. Excel (`tromso_samiske_stedsnavn_input.xlsx`)
2. Python-script (`scripts/ssr_to_geojson.py`)
3. Output: `data/stedsnavn.geojson`
4. Frontend laster GeoJSON direkte

GeoJSON committes i repo (offentlig).

---

## Språkvalg
- Samisk (sme)
  - Vises først
  - Eget SVG-flag (ingen Unicode finnes)
  - Lenketekst: *Lohkka sámegillii*
- Norsk (no)
  - Unicode 🇳🇴
  - Lenketekst: *Les mer*
- Engelsk (en)
  - Unicode 🇬🇧
  - Lenketekst: *Read more*

Språk vises kun hvis tekst/lenke finnes.

---

## Innholdsprinsipp
- Kort infotekst i popup
- Dypere innhold via Notion-lenker
- Notion-sider er offentlige

Repoet skal ikke inneholde lange tekster om steder.

---

## Designbeslutninger
- Samisk visuelt prioritert
- Ingen språk-toggle (alle språk vises samtidig)
- Unicode-flagg der mulig, SVG kun når nødvendig
- Popup skal fungere på mobil

---

## Kjente fallgruver
- Chrome cache (hard reload ved endringer)
- Python `SyntaxError` pga manglende komma i dicts
- `NaN` i GeoJSON hvis Excel-felt ikke renses
- Case-sensitive paths på GitHub Pages

---

## Videre arbeid (TODO)
- [ ] Finjustere popup-layout på mobil
- [ ] Forberede WordPress-embed (iframe)
- [ ] Vurdere språk-toggle (SME / NO / EN)
- [ ] Eventuell filtrering på objekttype
- [ ] Dokumentere publiseringsrutine i README

---

## Publisering
- GitHub Pages
- `index.html` i repo-roten
- Relative paths (`./data/...`, `./assets/...`)

---

Dato sist oppdatert: 2026-01-23