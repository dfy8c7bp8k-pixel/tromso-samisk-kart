const map = L.map("map").setView([69.65, 18.95], 10);

L.tileLayer(
  "https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png",
  { maxZoom: 19, attribution: "© Kartverket" }
).addTo(map);

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
  // escape + behold linjeskift fra Excel
  return escapeHtml(text).replace(/\n/g, "<br>");
}

function langBlock({ lang, iconHtml, iconImgSrc, text, url, linkText }) {
  const hasText = !!text;
  const hasUrl = !!url;
  if (!hasText && !hasUrl) return "";

  const iconPart = iconImgSrc
    ? `<img src="${escapeHtml(iconImgSrc)}" class="lang-icon" alt="" />`
    : iconHtml
      ? `<span class="lang-icon-inline" aria-hidden="true">${iconHtml}</span>`
      : "";

  return `
    <div class="popup-lang" lang="${escapeHtml(lang)}">
      ${iconPart}
      <div class="popup-text">
        ${hasText ? `<p>${renderText(text)}</p>` : ""}
        ${
          hasUrl
            ? `<p><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(
                linkText
              )}</a></p>`
            : ""
        }
      </div>
    </div>
  `;
}

function onEachFeature(feature, layer) {
  const p = feature.properties || {};

  const samisk = escapeHtml(clean(p.samisk_navn));
  const norsk = escapeHtml(clean(p.norsk_navn));

  const infotekstSme = clean(p.infotekst_sme);
  const infotekstNo = clean(p.infotekst_no);
  const infotekstEn = clean(p.infotekst_en);

  const urlSme = fixUrl(p.notion_url_sme);
  const urlNo = fixUrl(p.notion_url_no);
  const urlEn = fixUrl(p.notion_url_en);

  let html = `
    <div class="popup-samisk">${samisk}</div>
    <div class="popup-norsk">${norsk}</div>
  `;

  // Samisk (ikonfil)
  html += langBlock({
    lang: "sme",
    iconImgSrc: "assets/sami_flag.svg",
    text: infotekstSme,
    url: urlSme,
    linkText: "Lohkka sámegillii",
  });

  // Norsk (unicode-ikon)
  html += langBlock({
    lang: "no",
    iconHtml: "🇳🇴",
    text: infotekstNo,
    url: urlNo,
    linkText: "Les mer",
  });

  // Engelsk (unicode-ikon)
  html += langBlock({
    lang: "en",
    iconHtml: "🇬🇧",
    text: infotekstEn,
    url: urlEn,
    linkText: "Read more",
  });

  layer.bindPopup(html, { maxWidth: 360 });
}

fetch("./data/stedsnavn.geojson")
  .then((r) => {
    if (!r.ok) throw new Error(`Klarte ikke å laste GeoJSON (${r.status})`);
    return r.json();
  })
  .then((data) => {
    const geo = L.geoJSON(data, { onEachFeature }).addTo(map);
    const bounds = geo.getBounds();
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.1));
  })
  .catch((err) => {
    console.error(err);
    alert("Feil ved lasting av GeoJSON (se konsoll).");
  });