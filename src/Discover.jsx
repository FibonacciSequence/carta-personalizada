import { useState, useEffect, useCallback, useRef } from "react";

function getInitials(name) {
  const words = name.trim().split(/\s+/).filter(w => !["el", "la", "los", "las", "de", "del", "restaurant", "restaurante"].includes(w.toLowerCase()));
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name) {
  const colors = [
    { bg: "#1a1025", color: "#9f7fef" },
    { bg: "#0f1e2a", color: "#4c9fef" },
    { bg: "#0f2a1a", color: "#4caf80" },
    { bg: "#2a1010", color: "#ef7f6f" },
    { bg: "#1a1a10", color: "#cfaf40" },
    { bg: "#1a0f18", color: "#cf6faf" },
    { bg: "#0f2a28", color: "#4fcfbf" },
    { bg: "#201510", color: "#df9f50" },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const FILTERS = [
  { id: "todos", label: "Todos", query: "restaurantes Lima Peru" },
  { id: "top50", label: "Top 50 Lat.", query: "Central Maido Kjolle Isolina Mérito Osso restaurante Lima Peru" },
  { id: "sin-gluten", label: "Sin gluten", query: "restaurantes sin gluten celíaco Lima Peru" },
  { id: "vegano", label: "Vegano", query: "restaurante vegano vegetariano Lima Peru" },
  { id: "polleria", label: "Pollería", query: "pollería pollo a la brasa Lima Peru" },
  { id: "chifa", label: "Chifa", query: "chifa restaurante chino Lima Peru" },
  { id: "mariscos", label: "Mariscos", query: "cevichería mariscos ceviche Lima Peru" },
  { id: "sushi", label: "Sushi / Japonesa", query: "restaurante japonés sushi nikkei Lima Peru" },
];

const PRICE_MAP = {
  PRICE_LEVEL_INEXPENSIVE: "S/",
  PRICE_LEVEL_MODERATE: "S/S/",
  PRICE_LEVEL_EXPENSIVE: "S/S/S/",
  PRICE_LEVEL_VERY_EXPENSIVE: "S/S/S/S/"
};

const TYPE_EMOJI = {
  japanese_restaurant: "🐟",
  sushi_restaurant: "🍣",
  chinese_restaurant: "🥢",
  seafood_restaurant: "🦞",
  vegetarian_restaurant: "🥗",
  vegan_restaurant: "🌿",
  chicken_restaurant: "🍗",
  peruvian_restaurant: "🫙",
  fine_dining_restaurant: "🍽",
  bar: "🍸",
  cafe: "☕",
  pizza_restaurant: "🍕",
  steak_house: "🥩",
  brazilian_restaurant: "🥩",
  american_restaurant: "🍔",
  italian_restaurant: "🍝",
  mexican_restaurant: "🌮",
};

const NAME_EMOJI = {
  central: "🌿", maido: "🐟", kjolle: "🌺", isolina: "🫙",
  "la mar": "🦞", osaka: "🍣", astrid: "🍫", gastón: "🍽",
  osso: "🥩", mérito: "🌶", mil: "🌿", pía: "🍳",
  norky: "🍗", bembos: "🍔", chifa: "🥢", sushi: "🍣",
  ceviche: "🦞", mariscos: "🦞", pollo: "🍗", pizza: "🍕",
  burger: "🍔", vegano: "🌿", vegana: "🌿", orgánico: "🌱",
  parrilla: "🥩", brasa: "🔥", anticucho: "🍢", cebichería: "🦞",
};

const TYPE_LABEL = {
  japanese_restaurant: "Japonesa",
  sushi_restaurant: "Sushi",
  chinese_restaurant: "Chifa",
  seafood_restaurant: "Mariscos",
  vegetarian_restaurant: "Vegetariano",
  vegan_restaurant: "Vegano",
  chicken_restaurant: "Pollería",
  peruvian_restaurant: "Peruano",
  fine_dining_restaurant: "Fine Dining",
  bar: "Bar",
  cafe: "Café",
  pizza_restaurant: "Pizza",
  steak_house: "Parrilla",
};

const TOP50 = ["Central", "Maido", "Kjolle", "Mil", "Mérito", "Osso", "Isolina", "La Mar", "Osaka"];

function getEmoji(r) {
  const name = (r.displayName?.text || "").toLowerCase();
  for (const [key, emoji] of Object.entries(NAME_EMOJI)) {
    if (name.includes(key)) return emoji;
  }
  const types = r.types || [];
  for (const t of types) { if (TYPE_EMOJI[t]) return TYPE_EMOJI[t]; }
  return "🍽";
}

function getLabels(r) {
  const types = r.types || [];
  return types.map(t => TYPE_LABEL[t]).filter(Boolean).slice(0, 2);
}

function getDistrict(address) {
  if (!address) return "";
  const parts = address.split(",").map(p => p.trim());
  const skip = new Set(["Perú", "Peru", "Lima", "Provincia de Lima", "Lima Metropolitan Area"]);
  // Try to find district - usually the part before Lima/Perú
  const valid = parts.filter(p => p && !p.match(/^\d/) && !skip.has(p) && !p.match(/^\d{5}/));
  // Prefer shorter parts that look like district names (not street addresses)
  const districts = valid.filter(p => !p.match(/^(Jr\.|Av\.|Calle|Jirón|Avenida|Pasaje|Pje\.)/) && p.length < 30);
  return districts[0] || valid[0] || "";
}

function isTop50(r) {
  const name = r.displayName?.text || "";
  return TOP50.some(t => name.includes(t));
}

export default function Discover({ onAnalyze, lang = "es" }) {
  const [prefs, setPrefs] = useState("");
  const [activeFilter, setActiveFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const markersRef = useRef([]);

  const fetchPlaces = useCallback(async (filterId) => {
    setLoading(true);
    setError("");
    setRestaurants([]);
    setSelected(null);
    try {
      const f = FILTERS.find(f => f.id === filterId);
      const res = await fetch(`/api/places?query=${encodeURIComponent(f?.query || "restaurantes Lima Peru")}&filter=${filterId}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message || "Error");
      setRestaurants(data.places || []);
    } catch {
      setError("No se pudieron cargar los restaurantes. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []);

  const filtered = restaurants.filter(r => {
    if ((r.rating || 0) < 4.0) return false;
    // Only show restaurants actually in Lima/Peru
    const addr = r.formattedAddress || "";
    if (!addr.toLowerCase().includes("lima") && !addr.toLowerCase().includes("perú") && !addr.toLowerCase().includes("peru")) return false;
    if (!search.trim()) return true;
    const name = r.displayName?.text?.toLowerCase() || "";
    return name.includes(search.toLowerCase()) || addr.toLowerCase().includes(search.toLowerCase());
  });

  const handleAnalyze = (r) => {
    const name = r.displayName?.text || "restaurante";
    // Clean URL - take only the first URL if multiple are concatenated
    let url = (r.websiteUri || "").trim().split(/\s+/)[0];
    // Remove trailing slashes and clean up
    url = url.replace(/\s/g, "").split("https://").filter(Boolean).map((u, i) => i === 0 ? "https://" + u : u)[0] || "";
    if (onAnalyze) onAnalyze({ name, url, prefs });
  };

  useEffect(() => { fetchPlaces("todos"); }, []);

  useEffect(() => {
    if (mapLoaded || typeof window === "undefined") return;
    fetch("/api/maps-key").then(r => r.json()).then(({ key }) => {
      if (!key) return;
      window.initMap = () => {
        const container = document.getElementById("gmap-container");
        if (!container) return;
        googleMapRef.current = new window.google.maps.Map(container, {
          center: { lat: -12.0464, lng: -77.0428 },
          zoom: 12,
          styles: [
            { elementType: "geometry", stylers: [{ color: "#1a1a1a" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#0e0e0e" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#888" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2a2a" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#111" }] },
            { featureType: "poi", stylers: [{ visibility: "off" }] },
          ],
        });
        setMapLoaded(true);
      };
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=initMap`;
      script.async = true;
      document.head.appendChild(script);
    });
  }, []);

  useEffect(() => {
    if (!googleMapRef.current || !window.google) return;
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];
    filtered.forEach(r => {
      const loc = r.location;
      if (!loc?.latitude && !loc?.lat) return;
      const lat = loc.latitude ?? loc.lat;
      const lng = loc.longitude ?? loc.lng;
      if (!lat || !lng) return;
      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: googleMapRef.current,
        title: r.displayName?.text || "",
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: "#ef9f27", fillOpacity: 1, strokeColor: "#0e0e0e", strokeWeight: 2 },
      });
      marker.addListener("click", () => {
        handleAnalyze(r);
      });
      markersRef.current.push(marker);
    });
    // Fit map to show all markers
    if (markersRef.current.length > 0 && googleMapRef.current) {
      const bounds = new window.google.maps.LatLngBounds();
      markersRef.current.forEach(m => bounds.extend(m.getPosition()));
      googleMapRef.current.fitBounds(bounds);
      if (markersRef.current.length === 1) googleMapRef.current.setZoom(15);
    }
  }, [restaurants, search, mapLoaded]);



  // Dark theme colors
  const bg = "#0e0e0e";
  const surface = "#181818";
  const border = "rgba(255,255,255,0.1)";
  const textPrimary = "#efefef";
  const textSecondary = "#909090";
  const textMuted = "#505050";

  const [mobileTab, setMobileTab] = useState("list"); // list | map
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", height: isMobile ? "auto" : "calc(100vh - 41px)", minHeight: "100vh", fontFamily: "'DM Sans','Helvetica Neue',sans-serif", background: bg, color: textPrimary }}>
      
      {/* Left — restaurant list */}
      <div style={{ flex: isMobile ? "none" : "0 0 60%", overflowY: isMobile ? "visible" : "auto", padding: isMobile ? "1rem" : "1.5rem 1.5rem 1.5rem 2rem", minWidth: 0 }}>
        {isMobile && (
          <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.06)", borderRadius: 20, padding: "3px 4px", marginBottom: "1rem" }}>
            <button onClick={() => setMobileTab("list")} style={{ flex: 1, padding: "6px", border: "none", borderRadius: 16, background: mobileTab === "list" ? "rgba(255,255,255,0.12)" : "transparent", color: mobileTab === "list" ? textPrimary : textSecondary, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{lang === "en" ? "List" : "Lista"}</button>
            <button onClick={() => { setMobileTab("map"); setTimeout(() => { if (googleMapRef.current) window.google.maps.event.trigger(googleMapRef.current, "resize"); else window.initMap && window.initMap(); }, 100); }} style={{ flex: 1, padding: "6px", border: "none", borderRadius: 16, background: mobileTab === "map" ? "rgba(255,255,255,0.12)" : "transparent", color: mobileTab === "map" ? textPrimary : textSecondary, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>{lang === "en" ? "Map" : "Mapa"}</button>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1.25rem" }}>
          <span style={{ fontFamily: "Georgia,serif", fontSize: 20, fontWeight: 500, color: textPrimary }}>
            {activeFilter === "todos" ? (lang === "en" ? "Restaurants in Lima" : "Restaurantes en Lima") : FILTERS.find(f => f.id === activeFilter)?.label + (lang === "en" ? " in Lima" : " en Lima")}
          </span>
          <span style={{ fontSize: 12, color: textMuted }}>{filtered.length} resultados</span>
        </div>

        {isMobile && mobileTab === "map" && (
          <div id="gmap-container" style={{ height: "calc(100vh - 200px)", borderRadius: 10, overflow: "hidden", border: `0.5px solid ${border}` }} />
        )}
        {(!isMobile || mobileTab === "list") && loading && <div style={{ textAlign: "center", padding: "3rem", color: textMuted, fontSize: 13, fontStyle: "italic" }}>Buscando restaurantes…</div>}
        {error && <div style={{ padding: "11px 13px", background: "#2a0f0f", border: "0.5px solid #5a1f1f", borderRadius: 8, color: "#f08080", fontSize: 13 }}>{error}</div>}

        {!loading && !error && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((r, i) => {
              const name = r.displayName?.text || "Restaurante";
              const district = getDistrict(r.formattedAddress);
              const price = PRICE_MAP[r.priceLevel] || "";
              const rating = r.rating?.toFixed(1) || "";
              const labels = getLabels(r);
              const top50 = isTop50(r);
              const isSel = selected === i;
              const initials = getInitials(name);
              const avatarColor = getAvatarColor(name);

              return (
                <div
                  key={i}
                  onClick={() => setSelected(isSel ? null : i)}
                  style={{
                    background: isSel ? "#222" : surface,
                    border: isSel ? `1px solid rgba(255,255,255,0.3)` : `0.5px solid ${border}`,
                    borderRadius: 12,
                    padding: "0.875rem 1rem",
                    display: "flex",
                    gap: 12,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: avatarColor.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 500, flexShrink: 0, color: avatarColor.color, letterSpacing: "0.02em" }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "Georgia,serif", fontSize: 15, fontWeight: 500, color: textPrimary, lineHeight: 1.2 }}>{name}</span>
                        {top50 && <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 8, background: "#2a1f00", color: "#fab" , fontWeight: 500 }}>Top 50</span>}
                      </div>
                      <span style={{ fontSize: 11, color: textMuted, flexShrink: 0, marginLeft: 8 }}>{price}</span>
                    </div>
                    <div style={{ fontSize: 11, color: textSecondary, margin: "3px 0 6px", display: "flex", alignItems: "center", gap: 5 }}>
                      {rating && <><span style={{ width: 5, height: 5, background: "#ef9f27", borderRadius: "50%", display: "inline-block", flexShrink: 0 }} /><span>{rating}</span></>}
                      {rating && district && <span>·</span>}
                      {district && <span>{district}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {labels.map((l, j) => (
                        <span key={j} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 10, background: j === 0 ? "#0f2a1a" : "#0f1a2a", color: j === 0 ? "#4caf80" : "#4c8faf" }}>{l}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleAnalyze(r); }}
                    style={{ fontSize: 11, padding: "5px 14px", border: "0.5px solid rgba(255,255,255,0.2)", borderRadius: 8, color: "#ccc", cursor: "pointer", background: "rgba(255,255,255,0.05)", whiteSpace: "nowrap", fontFamily: "inherit", alignSelf: "center", flexShrink: 0, letterSpacing: "0.02em" }}
                    onMouseEnter={e => e.target.style.background = "rgba(255,255,255,0.12)"}
                    onMouseLeave={e => e.target.style.background = "rgba(255,255,255,0.05)"}
                  >
                    Analizar →
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right — filters panel */}
      <div style={{ width: isMobile ? "100%" : "40%", minWidth: isMobile ? "auto" : 320, maxWidth: isMobile ? "none" : 480, flexShrink: 0, borderLeft: isMobile ? "none" : `0.5px solid ${border}`, borderTop: isMobile ? `0.5px solid ${border}` : "none", padding: isMobile ? "1rem" : "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem", overflowY: "auto", background: bg }}>
        <div>
          <div style={{ fontFamily: "Georgia,serif", fontSize: 18, fontWeight: 500, fontStyle: "italic", color: textPrimary }}>La Carta Personalizada</div>
          <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: textMuted, marginTop: 2 }}>{lang === "en" ? "Your menu, your way" : "Tu menú a medida"}</div>
          <div style={{ width: 28, height: 1, background: border, margin: "0.5rem 0" }} />
        </div>

        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#aaa", marginBottom: 8 }}>{lang === "en" ? "My preferences" : "Mis preferencias"}</div>
          <textarea
            value={prefs}
            onChange={e => setPrefs(e.target.value)}
            placeholder={lang === "en" ? "E.g.: No gluten, lactose or pork. I avoid high-histamine foods..." : "Ej: No como gluten, lactosa ni cerdo. Evito alimentos altos en histaminas..."}
            style={{ width: "100%", minHeight: 90, padding: "12px", border: `0.5px solid ${border}`, borderRadius: 10, fontFamily: "inherit", fontSize: 13, lineHeight: 1.6, resize: "none", color: textSecondary, background: "#111", outline: "none", boxSizing: "border-box", fontStyle: "italic" }}
          />
        </div>

        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#aaa", marginBottom: 8 }}>{lang === "en" ? "Restaurant type" : "Tipo de restaurante"}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => { setActiveFilter(f.id); fetchPlaces(f.id); }}
                style={{ padding: "4px 11px", border: `0.5px solid ${activeFilter === f.id ? "rgba(255,255,255,0.5)" : border}`, borderRadius: 16, fontSize: 11, color: activeFilter === f.id ? textPrimary : textSecondary, cursor: "pointer", background: activeFilter === f.id ? "rgba(255,255,255,0.1)" : "transparent", fontFamily: "inherit", whiteSpace: "nowrap" }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#aaa", marginBottom: 8 }}>{lang === "en" ? "Search" : "Buscar"}</div>
          <input
            type="text"
            placeholder={lang === "en" ? "Restaurant or district..." : "Restaurante o distrito..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", border: `0.5px solid ${border}`, borderRadius: 10, fontSize: 13, color: textSecondary, background: "#111", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        <button
          onClick={() => { if (selected !== null && filtered[selected]) handleAnalyze(filtered[selected]); }}
          style={{ width: "100%", padding: "12px", background: textPrimary, color: bg, border: "none", borderRadius: 10, fontFamily: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer", letterSpacing: "0.02em" }}
        >
          {lang === "en" ? "Analyze selected menu →" : "Analizar carta seleccionada →"}
        </button>

        {!isMobile && (
          <div id="gmap-container" style={{ flex: 1, minHeight: 240, borderRadius: 10, overflow: "hidden", border: `0.5px solid ${border}` }} />
        )}
      </div>
    </div>
  );
}
