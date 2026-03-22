// app.js
// Samiske stedsnavn – Tromsø (Leaflet)
// Strict HTTPS policy: all external/user-provided URLs must be https://
// (Also: escape all data-derived strings before injecting into popup HTML.)

// ===== Språkvalg (frontend-only) =====
let currentLang = "sme"; // standard: samisk

// ===== Kart =====
const map = L.map("map", {
  zoomAnimation: true,
  zoomSnap: 0.75,
  zoomDelta: 0.75
}).setView([69.65, 18.95], 10);

L.tileLayer(
  "https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png",
  {
    maxZoom: 19,
    attribution:
      '© <a href="https://www.kartverket.no/" target="_blank" rel="noopener">Kartverket</a> | ' +
      'Stedsnavn: <a href="https://www.kartverket.no/til-lands/stadnamn/sok-stadnamn-i-kart" target="_blank" rel="noopener">SSR</a>',
  }
).addTo(map);

function getScaleForZoom(zoom) {
  const baseSize = 2;
  const scaleFactor = 40;

  const size = baseSize + (zoom - 8) * scaleFactor;

  return Math.max(30, size) / 100;
}

function applyMarkerScale(scale) {
  document.querySelectorAll(".marker-inner").forEach((el) => {
    el.style.transform = `scale(${scale})`;
  });
}

// Smooth animated zoom
map.on("zoomanim", (e) => {
  applyMarkerScale(getScaleForZoom(e.zoom));
});

// Final correction after zoom ends
map.on("zoomend", () => {
  applyMarkerScale(getScaleForZoom(map.getZoom()));
});

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
function svgIcon(path, size = 100) {
  const s = Number.isFinite(size) ? size : 100;

  return L.divIcon({
    className: "custom-svg-marker",
    html: `
      <div class="marker-shell" style="width:${s}px; height:${s}px;">
        <img src="${path}" class="marker-inner" alt="" />
      </div>
    `,
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
    popupAnchor: [0, -s / 2],
  });
}

const ICONS = {
  fjell: "assets/icons/natur/fjell.svg",
  gard: "assets/icons/bosetting/gard.svg",
  offerplass: "assets/icons/kultur/offerplass.svg",

  breivikeidet: "assets/icons/reindrift/breivikeidet.svg",
  groennaasen_skole: "assets/icons/skoler/groennaasen_skole.svg",
  prestvannet_skole: "assets/icons/skoler/prestvannet_skole.svg",
  finnheia: "assets/icons/sommerboplasser/finnheia.svg",
  straumhella: "assets/icons/sommerboplasser/straumhella.svg",
  gaisi_lakselvbukt: "assets/icons/spraksenter/gaisi_lakselvbukt.svg",
  gaisi_tromso: "assets/icons/spraksenter/gaisi_tromso.svg",
};

// OVERRIDE: base size per icon before zoom scaling.
// Value is percent/pixels relative to the standard 100 base size.
const ICON_OVERRIDES = {
  offerplass: 30,   // Sieidi smaller
  fjell: 80, 
  gaisi_tromso: 50       // fjell bigger
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
        const iconKey = clean(
          feature.properties?.icon_id || feature.properties?.objekttype
        ).toLowerCase();

        const iconPath = ICONS[iconKey];

        if (iconPath) {
          const baseSize = ICON_OVERRIDES[iconKey] || 100;
          return L.marker(latlng, { icon: svgIcon(iconPath, baseSize) });
        }

        // fallback: vanlig blå Leaflet-pin
        return L.marker(latlng);
      },
    }).addTo(map);

    const bounds = geo.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.1));
    }

    // Run once after markers exist
    applyMarkerScale(getScaleForZoom(map.getZoom()));
  })
  .catch((err) => {
    console.error(err);
    alert("Feil ved lasting av GeoJSON (se konsoll).");
  });