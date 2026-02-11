// app.js
// Samiske stedsnavn – Tromsø (Leaflet)
// Strict HTTPS policy: all external/user-provided URLs must be https://
// (Also: escape all data-derived strings before injecting into popup HTML.)

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

    // Static markup only (not data-driven) -> safe.
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

        // Defensive: only allow expected languages even if DOM is manipulated
        const lang = (a.dataset.lang || "").toLowerCase();
        if (!["sme", "no", "en"].includes(lang)) return;

        currentLang = lang;

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
function clean(v) {
  if (v === null || v === undefined) return "";
  const s = String(v).trim();
  if (!s) return "";
  if (s.toLowerCase() === "nan") return "";
  return s;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Render plain text safely, allowing only newlines as <br>
function renderText(text) {
  return escapeHtml(text).replace(/\n/g, "<br>");
}

/**
 * Strict HTTPS URL normalizer/validator for safe use in href attributes.
 *
 * Rules:
 * - Only accepts https:// URLs after normalization
 * - If the input has no scheme, https:// is prepended
 * - Rejects any non-https scheme (including http, javascript, data, file, etc.)
 * - Rejects malformed URLs
 */
function normalizeHttpsUrl(input) {
  let u = clean(input);
  if (!u) return "";

  // If input has no scheme, default to https://
  // (We only check for "scheme://" pattern.)
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(u)) {
    u = "https://" + u;
  }

  try {
    const parsed = new URL(u);

    // Strict: only allow https
    if (parsed.protocol !== "https:") return "";

    // Additional belt+suspenders: disallow whitespace/control chars
    const out = parsed.toString();
    if (/[\u0000-\u001F\u007F\s]/.test(out)) return "";

    return out;
  } catch {
    return "";
  }
}

// ===== Ikoner (SVG) for punkter =====
// (fikset: dynamisk størrelse + riktig anchor)
function svgIcon(path, size = 100) {
  const s = Number.isFinite(size) ? size : 100;
  return L.icon({
    iconUrl: path,
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
    popupAnchor: [0, -s / 2],
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
// Not data-driven -> safe to return HTML.
function langIconFor(lang) {
  if (lang === "sme") {
    return `<img src="assets/sami_flag.svg" class="lang-icon" alt="" />`;
  }
  if (lang === "no") {
    return `<span class="lang-icon-inline" aria-hidden="true">🇳🇴</span>`;
  }
  return `<span class="lang-icon-inline" aria-hidden="true">🇬🇧</span>`;
}

// ===== Popup builder (køres ved åpning) =====
function buildPopupHtml(p) {
  const samiskNavn = escapeHtml(clean(p.samisk_navn));
  const norskNavn = escapeHtml(clean(p.norsk_navn));

  // Defensive: constrain lang (even if currentLang is tampered with)
  const lang = ["sme", "no", "en"].includes(currentLang) ? currentLang : "sme";

  let html = `
    <div class="popup-samisk">${samiskNavn}</div>
    <div class="popup-norsk">${norskNavn}</div>
  `;

  const infotekst = clean(p[`infotekst_${lang}`]);
  const url = normalizeHttpsUrl(p[`notion_url_${lang}`]);

  if (infotekst || url) {
    html += `
      <div class="popup-lang" lang="${escapeHtml(lang)}">
        ${langIconFor(lang)}
        <div class="popup-text">
          ${infotekst ? `<p>${renderText(infotekst)}</p>` : ""}
          ${
            url
              ? `<p><a href="${escapeHtml(
                  url
                )}" target="_blank" rel="noopener noreferrer">${escapeHtml(
                  linkTextFor(lang)
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
        const type = clean(feature.properties?.objekttype).toLowerCase();
        const iconPath = ICONS[type];

        if (iconPath) {
          return L.marker(latlng, { icon: svgIcon(iconPath, 100) });
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