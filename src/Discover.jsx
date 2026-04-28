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
  PRICE_LEVEL_FREE: "",
  PRICE_LEVEL_INEXPENSIVE: "S/",
  PRICE_LEVEL_MODERATE: "S/S/",
  PRICE_LEVEL_EXPENSIVE: "S/S/S/",
  PRICE_LEVEL_VERY_EXPENSIVE: "S/S/S/S/"
};

const TYPE_MAP = {
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
};

function getDistrict(address) {
  if (!address) return "";
  const parts = address.split(",").map(p => p.trim());
  // Find the district — usually 2nd or 3rd part, not postal code
  for (const part of parts) {
    if (part && !part.match(/^\d+$/) && part !== "Perú" && part !== "Peru" && part !== "Lima") {
      return part;
    }
  }
  return parts[1] || "";
}

function getTypeLabels(r) {
  const types = r.types || [];
  return types.map(t => TYPE_MAP[t]).filter(Boolean).slice(0, 2);
}

export default function Discover({ onAnalyze, lang = "es" }) {
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
      const query = f?.query || "restaurantes Lima Peru";
      const res = await fetch(`/api/places?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message || "Error");
      setRestaurants(data.places || []);
    } catch (e) {
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
    const url = r.websiteUri || "";
    if (onAnalyze) onAnalyze({ name, url, prefs });
  };

  const s = {
    wrap: { display: "flex", height: "100vh", fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", background: "var(--color-background-tertiary)" },
    left: { flex: 1, overflowY: "auto", padding: "1.5rem 1.5rem 1.5rem 2rem", display: "flex", flexDirection: "column", minWidth: 0 },
    right: { width: 290, flexShrink: 0, borderLeft: "0.5px solid var(--color-border-tertiary)", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem", background: "var(--color-background-primary)", overflowY: "auto" },
    logo: { fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 500, fontStyle: "italic", color: "var(--color-text-primary)" },
    logoSub: { fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--color-text-tertiary)", marginTop: 2 },
    divider: { width: 28, height: 1, background: "var(--color-border-secondary)", margin: "0.5rem 0" },
    sectionTitle: { fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-tertiary)", marginBottom: 8 },
    textarea: { width: "100%", minHeight: 80, padding: "9px 11px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-lg)", fontFamily: "inherit", fontSize: 12, lineHeight: 1.5, resize: "none", color: "var(--color-text-primary)", background: "var(--color-background-primary)", outline: "none", boxSizing: "border-box" },
    filtersWrap: { display: "flex", flexWrap: "wrap", gap: 5 },
    chip: (active) => ({ padding: "4px 11px", border: `0.5px solid ${active ? "var(--color-text-primary)" : "var(--color-border-secondary)"}`, borderRadius: 16, fontSize: 11, color: active ? "var(--color-background-primary)" : "var(--color-text-secondary)", cursor: "pointer", background: active ? "var(--color-text-primary)" : "transparent", whiteSpace: "nowrap", fontFamily: "inherit" }),
    searchInput: { width: "100%", padding: "8px 11px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-lg)", fontSize: 12, color: "var(--color-text-primary)", background: "var(--color-background-primary)", fontFamily: "inherit", outline: "none", boxSizing: "border-box" },
    btnPrimary: { width: "100%", padding: "10px", background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", borderRadius: "var(--border-radius-lg)", fontFamily: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer", marginTop: "auto" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1rem" },
    headerTitle: { fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 500, color: "var(--color-text-primary)" },
    count: { fontSize: 12, color: "var(--color-text-tertiary)" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 },
    card: (sel) => ({ background: "var(--color-background-primary)", border: sel ? "1.5px solid var(--color-text-primary)" : "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden", cursor: "pointer", transition: "border-color 0.15s", display: "flex", flexDirection: "column" }),
    cardImg: { width: "100%", height: 130, background: "var(--color-background-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "var(--color-text-tertiary)", flexShrink: 0, overflow: "hidden" },
    cardBody: { padding: "0.75rem 0.875rem", flex: 1, display: "flex", flexDirection: "column", gap: 4 },
    cardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
    cardName: { fontFamily: "Georgia, serif", fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", lineHeight: 1.2, flex: 1 },
    cardPrice: { fontSize: 11, color: "var(--color-text-tertiary)", flexShrink: 0 },
    cardMeta: { fontSize: 11, color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 5 },
    ratingDot: { width: 4, height: 4, background: "#ef9f27", borderRadius: "50%", flexShrink: 0 },
    tagsWrap: { display: "flex", gap: 4, flexWrap: "wrap", marginTop: 2 },
    tag: (i) => ({ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: i === 0 ? "#edfaf3" : "#e6f1fb", color: i === 0 ? "#1a7a4a" : "#185fa5" }),
    analyzeBtn: { marginTop: 8, fontSize: 11, padding: "5px 0", borderTop: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-secondary)", cursor: "pointer", background: "none", border: "none", borderTop: "0.5px solid var(--color-border-tertiary)", width: "100%", textAlign: "center", fontFamily: "inherit", paddingTop: 8 },
    loader: { textAlign: "center", padding: "3rem 1rem", color: "var(--color-text-tertiary)", fontSize: 13, fontStyle: "italic" },
    errorBox: { padding: "11px 13px", background: "#fff0f0", border: "0.5px solid #f5c0c0", borderRadius: 8, color: "#c0392b", fontSize: 13 },
  };

  return (
    <div style={s.wrap}>
      <div style={s.left}>
        <div style={s.header}>
          <span style={s.headerTitle}>
            {activeFilter === "todos" ? "Restaurantes en Lima" : FILTERS.find(f => f.id === activeFilter)?.label + " en Lima"}
          </span>
          <span style={s.count}>{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {loading && <div style={s.loader}>Buscando restaurantes…</div>}
        {error && <div style={s.errorBox}>{error}</div>}

        {!loading && !error && (
          <div style={s.grid}>
            {filtered.length === 0 && <div style={s.loader}>No se encontraron restaurantes.</div>}
            {filtered.map((r, i) => {
              const name = r.displayName?.text || "Restaurante";
              const district = getDistrict(r.formattedAddress);
              const price = PRICE_MAP[r.priceLevel] || "";
              const rating = r.rating?.toFixed(1) || "";
              const labels = getTypeLabels(r);
              const isSel = selected === i;
              const photo = r.photos?.[0];

              return (
                <div key={i} style={s.card(isSel)} onClick={() => setSelected(isSel ? null : i)}>
                  <div style={s.cardImg}>
                    {photo ? (
                      <img
                        src={`/api/photo?name=${encodeURIComponent(photo.name)}`}
                        alt={name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        onError={e => { e.target.style.display = "none"; }}
                      />
                    ) : (
                      <span style={{ fontSize: 32, opacity: 0.3 }}>🍽</span>
                    )}
                  </div>
                  <div style={s.cardBody}>
                    <div style={s.cardTop}>
                      <span style={s.cardName}>{name}</span>
                      <span style={s.cardPrice}>{price}</span>
                    </div>
                    <div style={s.cardMeta}>
                      {rating && <><span style={s.ratingDot} /><span>{rating}</span></>}
                      {rating && district && <span>·</span>}
                      {district && <span>{district}</span>}
                    </div>
                    {labels.length > 0 && (
                      <div style={s.tagsWrap}>
                        {labels.map((l, j) => <span key={j} style={s.tag(j)}>{l}</span>)}
                      </div>
                    )}
                    <button
                      style={s.analyzeBtn}
                      onClick={(e) => { e.stopPropagation(); handleAnalyze(r); }}
                    >
                      Analizar carta →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={s.right}>
        <div>
          <div style={s.logo}>Lima Eats</div>
          <div style={s.logoSub}>Tu menú a medida</div>
          <div style={s.divider} />
        </div>

        <div>
          <div style={s.sectionTitle}>Mis preferencias</div>
          <textarea
            style={s.textarea}
            value={prefs}
            onChange={e => setPrefs(e.target.value)}
            placeholder="Ej: No como gluten, lactosa ni cerdo. Evito alimentos altos en histaminas..."
          />
        </div>

        <div>
          <div style={s.sectionTitle}>Tipo de restaurante</div>
          <div style={s.filtersWrap}>
            {FILTERS.map(f => (
              <button key={f.id} style={s.chip(activeFilter === f.id)} onClick={() => {
                setActiveFilter(f.id);
                fetchPlaces(f.id);
              }}>{f.label}</button>
            ))}
          </div>
        </div>

        <div>
          <div style={s.sectionTitle}>Buscar</div>
          <input style={s.searchInput} type="text" placeholder="Restaurante o distrito..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <button style={s.btnPrimary} onClick={() => {
          if (selected !== null && filtered[selected]) handleAnalyze(filtered[selected]);
        }}>
          Analizar carta seleccionada →
        </button>
      </div>
    </div>
  );
}
