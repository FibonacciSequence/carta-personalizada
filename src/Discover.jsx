import { useState, useEffect, useCallback } from "react";

const FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "top50", label: "Top 50 Lat.", query: "top 50 mejores restaurantes latinoamerica Lima" },
  { id: "sin-gluten", label: "Sin gluten", query: "restaurantes sin gluten Lima" },
  { id: "vegano", label: "Vegano", query: "restaurantes veganos Lima" },
  { id: "polleria", label: "Pollería", query: "pollerías pollo a la brasa Lima" },
  { id: "chifa", label: "Chifa", query: "chifa restaurante chino Lima" },
  { id: "mariscos", label: "Mariscos", query: "cevichería mariscos Lima" },
  { id: "sushi", label: "Sushi / Japonesa", query: "restaurante japonés sushi Lima" },
];

const PRICE_MAP = { PRICE_LEVEL_INEXPENSIVE: "S/", PRICE_LEVEL_MODERATE: "S/S/", PRICE_LEVEL_EXPENSIVE: "S/S/S/", PRICE_LEVEL_VERY_EXPENSIVE: "S/S/S/S/" };

export default function Discover({ onAnalyze, lang = "es" }) {
  const [prefs, setPrefs] = useState("");
  const [activeFilter, setActiveFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");

  const fetchPlaces = useCallback(async (filter) => {
    setLoading(true);
    setError("");
    setRestaurants([]);
    try {
      const f = FILTERS.find(f => f.id === filter);
      const query = f?.query || "restaurantes Lima";
      const res = await fetch(`/api/places?query=${encodeURIComponent(query)}&type=${filter}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
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
    wrap: { display: "flex", minHeight: 600, fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif" },
    left: { flex: 1, padding: "1.5rem", display: "flex", flexDirection: "column", minWidth: 0 },
    right: { width: 300, flexShrink: 0, borderLeft: "0.5px solid var(--color-border-tertiary)", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" },
    logo: { fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 500, fontStyle: "italic", color: "var(--color-text-primary)" },
    logoSub: { fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--color-text-tertiary)", marginTop: 2 },
    divider: { width: 28, height: 1, background: "var(--color-border-secondary)", margin: "0.5rem 0" },
    sectionTitle: { fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-text-tertiary)", marginBottom: 8 },
    textarea: { width: "100%", minHeight: 90, padding: "10px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-lg)", fontFamily: "inherit", fontSize: 12, lineHeight: 1.5, resize: "none", color: "var(--color-text-primary)", background: "var(--color-background-primary)", outline: "none" },
    filtersWrap: { display: "flex", flexWrap: "wrap", gap: 5 },
    chip: (active) => ({ padding: "4px 11px", border: `0.5px solid ${active ? "var(--color-text-primary)" : "var(--color-border-secondary)"}`, borderRadius: 16, fontSize: 11, color: active ? "var(--color-background-primary)" : "var(--color-text-secondary)", cursor: "pointer", background: active ? "var(--color-text-primary)" : "var(--color-background-primary)", transition: "all 0.15s", whiteSpace: "nowrap" }),
    searchInput: { width: "100%", padding: "8px 12px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-lg)", fontSize: 12, color: "var(--color-text-primary)", background: "var(--color-background-primary)", fontFamily: "inherit", outline: "none" },
    btnPrimary: { width: "100%", padding: 10, background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", borderRadius: "var(--border-radius-lg)", fontFamily: "inherit", fontSize: 13, fontWeight: 500, cursor: "pointer" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" },
    headerTitle: { fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 500, color: "var(--color-text-primary)" },
    count: { fontSize: 12, color: "var(--color-text-tertiary)" },
    list: { flex: 1, display: "flex", flexDirection: "column", gap: 8 },
    card: (sel) => ({ background: "var(--color-background-primary)", border: sel ? "1px solid var(--color-text-primary)" : "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "0.875rem 1rem", display: "flex", gap: 12, cursor: "pointer", transition: "border-color 0.15s" }),
    cardImg: { width: 44, height: 44, borderRadius: "var(--border-radius-md)", background: "var(--color-background-secondary)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--color-text-tertiary)", overflow: "hidden" },
    cardBody: { flex: 1, minWidth: 0 },
    cardTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
    cardName: { fontFamily: "Georgia, serif", fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", lineHeight: 1.2 },
    cardPrice: { fontSize: 11, color: "var(--color-text-tertiary)", flexShrink: 0, marginLeft: 8 },
    cardMeta: { fontSize: 11, color: "var(--color-text-secondary)", margin: "3px 0 5px", display: "flex", alignItems: "center", gap: 6 },
    ratingDot: { width: 4, height: 4, background: "#ef9f27", borderRadius: "50%" },
    tagsWrap: { display: "flex", gap: 4, flexWrap: "wrap" },
    tag: (i) => ({ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: i === 0 ? "#edfaf3" : "#e6f1fb", color: i === 0 ? "#1a7a4a" : "#185fa5" }),
    analyzeBtn: { fontSize: 11, padding: "4px 10px", border: "0.5px solid var(--color-border-secondary)", borderRadius: "var(--border-radius-md)", color: "var(--color-text-secondary)", cursor: "pointer", background: "none", whiteSpace: "nowrap", fontFamily: "inherit", flexShrink: 0, alignSelf: "center" },
    loader: { textAlign: "center", padding: "3rem 1rem", color: "var(--color-text-tertiary)", fontSize: 13, fontStyle: "italic" },
    errorBox: { padding: "11px 13px", background: "#fff0f0", border: "0.5px solid #f5c0c0", borderRadius: 8, color: "#c0392b", fontSize: 13 },
  };

  const getPhotoUrl = (r) => {
    const photo = r.photos?.[0];
    if (!photo) return null;
    return `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=80&maxWidthPx=80&key=${photo.name}`;
  };

  const getTypeLabels = (r) => {
    const types = r.types || [];
    const map = { restaurant: "Restaurante", japanese_restaurant: "Japonesa", sushi_restaurant: "Sushi", chinese_restaurant: "Chifa", seafood_restaurant: "Mariscos", vegetarian_restaurant: "Vegetariano", vegan_restaurant: "Vegano", chicken_restaurant: "Pollería" };
    return types.slice(0, 2).map(t => map[t]).filter(Boolean);
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

        {!loading && (
          <div style={s.list}>
            {filtered.length === 0 && !error && (
              <div style={s.loader}>No se encontraron restaurantes.</div>
            )}
            {filtered.map((r, i) => {
              const name = r.displayName?.text || "Restaurante";
              const addr = r.formattedAddress?.split(",").slice(1, 3).join(",").trim() || "";
              const price = PRICE_MAP[r.priceLevel] || "";
              const rating = r.rating?.toFixed(1) || "";
              const labels = getTypeLabels(r);
              const isSel = selected === i;

              return (
                <div key={i} style={s.card(isSel)} onClick={() => setSelected(isSel ? null : i)}>
                  <div style={s.cardImg}>foto</div>
                  <div style={s.cardBody}>
                    <div style={s.cardTop}>
                      <span style={s.cardName}>{name}</span>
                      <span style={s.cardPrice}>{price}</span>
                    </div>
                    <div style={s.cardMeta}>
                      {rating && <><span style={s.ratingDot} />{rating}</>}
                      {rating && addr && <span>·</span>}
                      {addr && <span>{addr}</span>}
                    </div>
                    {labels.length > 0 && (
                      <div style={s.tagsWrap}>
                        {labels.map((l, j) => <span key={j} style={s.tag(j)}>{l}</span>)}
                      </div>
                    )}
                  </div>
                  <button style={s.analyzeBtn} onClick={(e) => { e.stopPropagation(); handleAnalyze(r); }}>
                    Analizar →
                  </button>
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
