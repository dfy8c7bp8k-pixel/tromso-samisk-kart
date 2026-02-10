// ===== Språkvalg (frontend-only) =====
let currentLang = "sme"; // standard: samisk

// ===== Kart =====
const map = L.map("map").setView([69.65, 18.95], 10);

L.tileLayer(
  "https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png",
  {
    maxZoom: 19,
    attribution:
      '© <a href="https://www.kartverket.no/" target="_blank" rel="noopener">Kartverket</a> | ' +
      'Stedsnavn: <a href="https://www.kartverket.no/til-lands/stadnamn/sok-stadnamn-i-kart" target="_blank" rel="noopener">SSR</a>',
  }
).addTo(map);

// ===== Språk-knapper i Leaflet (øverst til høyre) =====
const LangControl = L.Control.extend({
  onAdd: function () {
    const div = L.DomUtil.create("div", "lang-switcher leaflet-bar");

    div.innerHTML = `
      <a href="#" data-lang="sme" class="active">SME</a>
      <a href="#" data-lang="no">NO</a>
      <a href="#" data-lang="en">EN</a>
    `;

    // Hindrer at kartet “tar” klikk/drag
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);

    div.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();

        currentLang = a.dataset.lang;

        div.querySelectorAll("a").forEach((x) => x.classList.remove("active"));
        a.classList.add("active");

        // Popup-innhold bygges på nytt ved åpning (se bindPopup(() => ...)).
        // Vi lukker bare popup, så brukeren kan klikke markør på nytt.
        map.closePopup();
      });
    });

    return div;
  },
});

map.addControl(new LangControl({ position: "topright" }));

// ===== Utils =====
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function clean(v) {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  if (!s) return "";
  if (s.toLowerCase() === "nan") return "";
  return s;
}

function fixUrl(u) {
  u = clean(u);
  if (!u) return "";
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  return u;
}

function renderText(text) {
  return escapeHtml(text).replace(/\n/g, "<br>");
}

// ===== Ikoner (SVG) for punkter =====
// (fikset: dynamisk størrelse + riktig anchor)
function svgIcon(path, size = 28) {
  return L.icon({
    iconUrl: path,
    iconSize: [100, 100],
    iconAnchor: [100 / 2, 100 / 2],
    popupAnchor: [0, -100 / 2],
  });
}

const ICONS = {
  fjell: "assets/icons/natur/fjell.svg",
  gard: "assets/icons/bosetting/gard.svg",
  offerplass: "assets/icons/kultur/offerplass.svg",
};

// ===== Språk: ikon + lenketekst =====
function linkTextFor(lang) {
  if (lang === "sme") return "Lohkka sámegillii";
  if (lang === "no") return "Les mer";
  return "Read more";
}

// Samisk: SVG-ikon. Norsk/Engelsk: emoji (unicode).
function langIconFor(lang) {
  if (lang === "sme") {
    return `<img src="assets/sami_flag.svg" class="lang-icon" alt="" />`;
  }
  if (lang === "no") {
    return `<span class="lang-icon-inline" aria-hidden="true">🇳🇴</span>`;
  }
  return `<span class="lang-icon-inline" aria-hidden="true">🇬🇧</span>`;
}

// ===== Popup builder (viktig: kjøres ved åpning) =====
function buildPopupHtml(p) {
  const samiskNavn = escapeHtml(clean(p.samisk_navn));
  const norskNavn = escapeHtml(clean(p.norsk_navn));

  let html = `
    <div class="popup-samisk">${samiskNavn}</div>
    <div class="popup-norsk">${norskNavn}</div>
  `;

  const infotekst = clean(p[`infotekst_${currentLang}`]);
  const url = fixUrl(p[`notion_url_${currentLang}`]);

  if (infotekst || url) {
    html += `
      <div class="popup-lang" lang="${escapeHtml(currentLang)}">
        ${langIconFor(currentLang)}
        <div class="popup-text">
          ${infotekst ? `<p>${renderText(infotekst)}</p>` : ""}
          ${
            url
              ? `<p><a href="${escapeHtml(
                  url
                )}" target="_blank" rel="noopener noreferrer">${escapeHtml(
                  linkTextFor(currentLang)
                )}</a></p>`
              : ""
          }
        </div>
      </div>
    `;
  }

  return html;
}

// ===== GeoJSON binding =====
function onEachFeature(feature, layer) {
  const p = feature.properties || {};
  layer.bindPopup(() => buildPopupHtml(p), { maxWidth: 360 });
}

fetch("./data/stedsnavn.geojson")
  .then((r) => {
    if (!r.ok) throw new Error(`Klarte ikke å laste GeoJSON (${r.status})`);
    return r.json();
  })
  .then((data) => {
    const geo = L.geoJSON(data, {
      onEachFeature,
      pointToLayer: (feature, latlng) => {
        const type = (feature.properties?.objekttype || "").toLowerCase();
        const iconPath = ICONS[type];

        if (iconPath) {
          return L.marker(latlng, { icon: svgIcon(iconPath, 28) });
        }

        // fallback: vanlig blå Leaflet-pin
        return L.marker(latlng);
      },
    }).addTo(map);

    const bounds = geo.getBounds();
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.1));
  })
  .catch((err) => {
    console.error(err);
    alert("Feil ved lasting av GeoJSON (se konsoll).");
  });