import { useState, useEffect, useCallback } from "react";

const FILTERS = [
  { id: "todos", label: "Todos", query: "restaurantes Lima Peru" },
  { id: "top50", label: "Top 50 Lat.", query: "mejores restaurantes Lima Peru gourmet fine dining" },
  { id: "sin-gluten", label: "Sin gluten", query: "restaurantes sin gluten Lima Peru" },
  { id: "vegano", label: "Vegano", query: "restaurantes veganos Lima Peru" },
  { id: "polleria", label: "Pollería", query: "pollería pollo a la brasa Lima Peru" },
  { id: "chifa", label: "Chifa", query: "chifa restaurante chino Lima Peru" },
  { id: "mariscos", label: "Mariscos", query: "cevichería mariscos Lima Peru" },
  { id: "sushi", label: "Sushi / Japonesa", query: "restaurante japonés sushi Lima Peru" },
];

const PRICE_MAP = {
  PRICE_LEVEL_INEXPENSIVE: "S/",
  PRICE_LEVEL_MODERATE: "S/S/",
  PRICE_LEVEL_EXPENSIVE: "S/S/S/",
  PRICE_LEVEL_VERY_EXPENSIVE: "S/S/S/S/"
};

const TYPE_EMOJI = {
  japanese_restaurant: "🍣",
  sushi_restaurant: "🍱",
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

export default function Discover({ onAnalyze }) {
  const [prefs, setPrefs] = useState("");
  const [activeFilter, setActiveFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  const fetchPlaces = useCallback(async (filterId) => {
    setLoading(true);
    setError("");
    setRestaurants([]);
    setSelected(null);
    try {
      const f = FILTERS.find(f => f.id === filterId);
      const res = await fetch(`/api/places?query=${encodeURIComponent(f?.query || "restaurantes Lima Peru")}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message || "Error");
      setRestaurants(data.places || []);
    } catch {
      setError("No se pudieron cargar los restaurantes. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlaces("todos"); }, []);

  const filtered = restaurants.filter(r => {
    if (!search.trim()) return true;
    const name = r.displayName?.text?.toLowerCase() || "";
    const addr = r.formattedAddress?.toLowerCase() || "";
    return name.includes(search.toLowerCase()) || addr.includes(search.toLowerCase());
  });

  const handleAnalyze = (r) => {
    const name = r.displayName?.text || "restaurante";
    // Clean URL - take only the first URL if multiple are concatenated
    let url = (r.websiteUri || "").trim().split(/\s+/)[0];
    // Remove trailing slashes and clean up
    url = url.replace(/\s/g, "").split("https://").filter(Boolean).map((u, i) => i === 0 ? "https://" + u : u)[0] || "";
    if (onAnalyze) onAnalyze({ name, url, prefs });
  };

  // Dark theme colors
  const bg = "#0e0e0e";
  const surface = "#181818";
  const border = "rgba(255,255,255,0.1)";
  const textPrimary = "#efefef";
  const textSecondary = "#909090";
  const textMuted = "#505050";

  return (
    <div style={{ display: "flex", height: "calc(100vh - 41px)", fontFamily: "'DM Sans','Helvetica Neue',sans-serif", background: bg, color: textPrimary }}>
      
      {/* Left — restaurant list */}
      <div style={{ flex: "0 0 60%", overflowY: "auto", padding: "1.5rem 1.5rem 1.5rem 2rem", minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1.25rem" }}>
          <span style={{ fontFamily: "Georgia,serif", fontSize: 20, fontWeight: 500, color: textPrimary }}>
            {activeFilter === "todos" ? "Restaurantes en Lima" : FILTERS.find(f => f.id === activeFilter)?.label + " en Lima"}
          </span>
          <span style={{ fontSize: 12, color: textMuted }}>{filtered.length} resultados</span>
        </div>

        {loading && <div style={{ textAlign: "center", padding: "3rem", color: textMuted, fontSize: 13, fontStyle: "italic" }}>Buscando restaurantes…</div>}
        {error && <div style={{ padding: "11px 13px", background: "#2a0f0f", border: "0.5px solid #5a1f1f", borderRadius: 8, color: "#f08080", fontSize: 13 }}>{error}</div>}

        {!loading && !error && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((r, i) => {
              const name = r.displayName?.text || "Restaurante";
              const district = getDistrict(r.formattedAddress);
              const price = PRICE_MAP[r.priceLevel] || "";
              const rating = r.rating?.toFixed(1) || "";
              const labels = getLabels(r);
              const emoji = getEmoji(r);
              const top50 = isTop50(r);
              const isSel = selected === i;

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
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: "#2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
                    {emoji}
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
      <div style={{ width: "40%", minWidth: 320, maxWidth: 480, flexShrink: 0, borderLeft: `0.5px solid ${border}`, padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem", overflowY: "auto", background: bg }}>
        <div>
          <div style={{ fontFamily: "Georgia,serif", fontSize: 22, fontWeight: 500, fontStyle: "italic", color: textPrimary }}>Lima Eats</div>
          <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: textMuted, marginTop: 2 }}>Tu menú a medida</div>
          <div style={{ width: 28, height: 1, background: border, margin: "0.5rem 0" }} />
        </div>

        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: textMuted, marginBottom: 8 }}>Mis preferencias</div>
          <textarea
            value={prefs}
            onChange={e => setPrefs(e.target.value)}
            placeholder="Ej: No como gluten, lactosa ni cerdo. Evito alimentos altos en histaminas..."
            style={{ width: "100%", minHeight: 90, padding: "12px", border: `0.5px solid ${border}`, borderRadius: 10, fontFamily: "inherit", fontSize: 13, lineHeight: 1.6, resize: "none", color: textSecondary, background: "#111", outline: "none", boxSizing: "border-box", fontStyle: "italic" }}
          />
        </div>

        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: textMuted, marginBottom: 8 }}>Tipo de restaurante</div>
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
          <div style={{ fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: textMuted, marginBottom: 8 }}>Buscar</div>
          <input
            type="text"
            placeholder="Restaurante o distrito..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", border: `0.5px solid ${border}`, borderRadius: 10, fontSize: 13, color: textSecondary, background: "#111", fontFamily: "inherit", outline: "none", boxSizing: "border-box" }}
          />
        </div>

        <button
          onClick={() => { if (selected !== null && filtered[selected]) handleAnalyze(filtered[selected]); }}
          style={{ width: "100%", padding: "12px", background: textPrimary, color: bg, border: "none", borderRadius: 10, fontFamily: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer", marginTop: "auto", letterSpacing: "0.02em" }}
        >
          Analizar carta seleccionada →
        </button>
      </div>
    </div>
  );
}
