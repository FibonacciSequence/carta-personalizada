import { useState, useEffect } from "react";
import { SignIn, SignUp, useUser, UserButton } from "@clerk/clerk-react";
import Discover from "./Discover.jsx";

const T = {
  es: {
    step1: "Preferencias", step2: "Las Cartas", step3: "Mis Platos",
    step1Title: "¿Qué comes y qué no comes?",
    step1Sub: "Escribe en lenguaje natural tus restricciones, alergias, preferencias o lo que no te gusta.",
    step2Title: "Agrega las cartas",
    step2Sub: "Sube hasta 5 imágenes o PDFs, y/o agrega hasta 5 links de cartas online.",
    step3Title: "Mis Platos",
    filesLabel: "Imágenes o PDFs",
    urlsLabel: "Links de cartas online",
    urlPlaceholder: "https://restaurante.com/carta",
    addUrl: "+ Agregar otro link",
    analyze: "Ver mis platos recomendados",
    analysing: "Analizando con inteligencia artificial",
    restart: "← Empezar de nuevo",
    signIn: "Iniciar sesión",
    signUp: "Registrarse",
    history: "Historial",
    reuse: "Usar de nuevo",
    savePrefs: "Iniciar sesión para guardar tus preferencias",
    firstRec: "Primera recomendación",
    secondRec: "Segunda recomendación",
    thirdRec: "Tercera recomendación",
    fileError: "No se pudo analizar este archivo. Asegúrate que la imagen sea clara.",
    notMenu: "No encontramos la carta online. Sube una foto o PDF de la carta, o busca el restaurante en cluvi.pe.",
    noResults: "No se encontraron platos compatibles con tus restricciones.",
    dragDrop: "Arrastra imágenes o PDFs aquí",
    dragDropSub: "o haz clic para seleccionar (máx. 5)",
    uploadSub: "JPG, PNG, PDF — máx. 10MB por archivo",
  },
  en: {
    step1: "Preferences", step2: "The Menus", step3: "My Dishes",
    step1Title: "What do you eat and what don't you eat?",
    step1Sub: "Write in natural language your restrictions, allergies, preferences, or dislikes.",
    step2Title: "Add the menus",
    step2Sub: "Upload up to 5 images or PDFs, and/or add up to 5 online menu links.",
    step3Title: "My Dishes",
    filesLabel: "Images or PDFs",
    urlsLabel: "Online menu links",
    urlPlaceholder: "https://restaurant.com/menu",
    addUrl: "+ Add another link",
    analyze: "See my recommended dishes",
    analysing: "Analyzing with artificial intelligence",
    restart: "← Start over",
    signIn: "Sign in",
    signUp: "Register",
    history: "History",
    reuse: "Use again",
    savePrefs: "Sign in to save your preferences",
    firstRec: "First recommendation",
    secondRec: "Second recommendation",
    thirdRec: "Third recommendation",
    fileError: "Could not analyze this file. Make sure the image is clear.",
    notMenu: "Menu not found online. Upload a photo or PDF of the menu, or search the restaurant on cluvi.pe.",
    noResults: "No dishes found compatible with your restrictions.",
    dragDrop: "Drag images or PDFs here",
    dragDropSub: "or click to select (max. 5)",
    uploadSub: "JPG, PNG, PDF — max. 10MB per file",
  },
};

function buildPrompt(prefs, lang) {
  return `You are a clinical dietitian and expert chef with deep knowledge of allergies, intolerances, and nutritional biochemistry. The user has these dietary preferences and restrictions:

"${prefs}"

When analyzing each restriction, consider ALL hidden ingredients and derivatives:
- "No gluten": wheat, barley, rye, oats, malt, modified starch, traditional soy sauce, bread, dough, pastry, empanada wrapper, pizza dough, breading
- "No lactose/cow milk": butter, cream, cheese, yogurt, casein, whey, provoleta, mozzarella
- "No soy": tofu, edamame, miso, soy sauce, soy lecithin
- "No pork": ham, bacon, chorizo, chori, morci (morcilla), blood sausage, pancetta, lard, bondiola, cerdo, jamón
- "No nitrates/nitrites": cold cuts, cured meats, chorizo, morcilla, sausage, hot dog, processed meats
- "High histamine foods" to avoid: aged cheeses, wine, beer, vinegar, tomato, spinach, eggplant, avocado, strawberries, citrus, chocolate, cold cuts, fermented foods, leftovers
- "DAO blockers" to avoid: alcohol, energy drinks, black tea, green tea, mate

CRITICAL INTERPRETATION RULES:
- "Con ensalada mixta" or "al plato con ensalada mixta" = the salad is a SEPARABLE SIDE DISH placed alongside the main dish. Evaluate only the main protein and cooking method. If the salad has tomato, note it in advertencia but still recommend the main dish.
- "Con provenzal" = garlic and parsley sauce, generally safe (check for butter).
- Fresh grilled chicken (pollo a la parrilla, pollo al limón, pollo deshuesado a la parrilla) = safe protein with no gluten, no lactose, no soy, no pork, no nitrates, low histamine.
- Organ meats from beef or chicken (riñones, molleja) = safe if grilled, not cured or processed.
- DISCARD: any dish with dough/bread/wrapper as core ingredient (empanadas, sandwiches, medialunas, choripán, bondipán, morcipán, milanga with breading).
- DISCARD: any dish with cheese as core ingredient (provoleta, pizza, matambre a la pizza).
- DISCARD: any dish where cerdo/pork is the main protein (bondiola, asado de cerdo, chorizo as main).

RECOMMENDATION RULES:
1. First recommendation: dish with ZERO issues — all core and side ingredients are safe.
2. Second and third: dishes where core protein is safe but a separable side may have an issue — note it in advertencia.
3. Order from safest to least safe.
4. Prioritize main dishes (grilled meats, proteins) over sides (papas, huevo frito).
5. In "por_que": explain specifically why the main ingredient is compatible. OMIT the "advertencia" field entirely if there is nothing to warn about.
6. In "restaurante": exact name from menu.
7. In "etiquetas": max 3 short tags.
8. In "precio": copy EXACTLY as on menu. Omit if not visible.
9. Fewer than 3 is fine if not enough safe options.
10. NEVER recommend categories. Only specific named dishes.
11. URLs from sites like cluvi.pe, opentable.com, mesa247.pe, rappi.com and similar ARE restaurant menus.
12. If NOT a restaurant menu, return: {"not_menu": true, "restaurante": ""}

${lang === "en" ? "Respond in English." : "Responde en español."}

Respond ONLY with JSON. Start with { end with }.
{"restaurante":"...","platos":[{"nombre":"...","precio":"...","por_que":"...","advertencia":"...","etiquetas":["..."]}]}`;
}

function buildUrlPrompt(prefs, url, lang) {
  return `${buildPrompt(prefs, lang)}\n\nAnalyze the restaurant menu at this URL: ${url}`;
}

function cleanUrl(url) {
  let u = url.trim();
  // Fix duplicate protocol like https://http://
  u = u.replace(/^https?:\/\/(https?:\/\/)/, "$1");
  try {
    const parsed = new URL(u);
    const q = parsed.searchParams.get("q") || parsed.searchParams.get("url");
    if (q) return q;
  } catch {}
  return u;
}

function getUrlWarning(url, t) {
  if (/instagram\.com|facebook\.com|tiktok\.com|twitter\.com|x\.com/.test(url)) {
    return lang => lang === "es" ? "⚠ Las redes sociales no permiten acceso directo. Sube una foto de la carta en su lugar." : "⚠ Social media doesn't allow direct access. Upload a photo of the menu instead.";
  }
  return null;
}

function AppInner({ lang, setLang, tool, setTool }) {
  const { isSignedIn, user } = useUser();
  const t = T[lang];
  const [view, setView] = useState("app");
  const [step, setStep] = useState(1);
  const [prefs, setPrefs] = useState("");
  const [files, setFiles] = useState([]);
  const [urls, setUrls] = useState([""]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [history, setHistory] = useState([]);
  const [pendingRestaurant, setPendingRestaurant] = useState("");
  const [pendingPlaceId, setPendingPlaceId] = useState(null);
  const numResults = results.length;

  const s = {
    wrap: { fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", width: "100%", maxWidth: numResults > 1 ? "none" : 600, margin: "0 auto", padding: numResults > 1 ? "2rem 3rem" : "2rem 1.25rem", boxSizing: "border-box", background: "#0e0e0e", minHeight: "100vh", color: "#efefef" },
    topBar: { display: "flex", alignItems: "center", gap: 12, marginBottom: "2rem", flexWrap: "wrap" },
    logo: { fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 500, fontStyle: "italic", lineHeight: 1.1, color: "#efefef" },
    logoSub: { fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#555", marginTop: 2 },
    topRight: { marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
    langToggle: { display: "flex", gap: 4, background: "rgba(255,255,255,0.06)", borderRadius: 20, padding: "3px 4px" },
    langBtn: (active) => ({ background: active ? "rgba(255,255,255,0.15)" : "transparent", color: active ? "#efefef" : "#666", border: "none", borderRadius: 16, padding: "4px 10px", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }),
    authBtn: { padding: "7px 16px", borderRadius: 20, border: "0.5px solid rgba(255,255,255,0.15)", background: "transparent", color: "#aaa", fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
    divider: { height: 1, background: "rgba(255,255,255,0.08)", margin: "0 0 1.5rem" },
    steps: { display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: "2rem" },
    stepWrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, position: "relative" },
    connector: { position: "absolute", top: 14, right: "calc(50% + 14px)", width: "calc(100% - 28px)", height: 1, background: "rgba(255,255,255,0.1)", minWidth: 40 },
    dot: (active, done) => ({ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: done ? 13 : 12, fontWeight: 600, background: done ? "#2a7a4a" : active ? "#efefef" : "rgba(255,255,255,0.08)", color: done ? "#fff" : active ? "#0e0e0e" : "#555", border: done ? "none" : active ? "none" : "0.5px solid rgba(255,255,255,0.15)", transition: "all 0.3s" }),
    dotLabel: (active) => ({ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: active ? "#efefef" : "#555", fontWeight: active ? 600 : 400 }),
    h1: { fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 500, marginBottom: "0.4rem", color: "#efefef" },
    subtitle: { fontSize: 14, color: "#666", marginBottom: "1.5rem", lineHeight: 1.5 },
    label: { fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#aaa", marginBottom: 8, display: "block" },
    textarea: { width: "100%", minHeight: 120, padding: "14px 16px", border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: 12, fontFamily: "inherit", fontSize: 14, lineHeight: 1.6, resize: "vertical", outline: "none", boxSizing: "border-box", background: "#181818", color: "#efefef" },
    uploadBox: { border: "1.5px dashed rgba(255,255,255,0.15)", borderRadius: 12, padding: "2.5rem 1rem", textAlign: "center", cursor: "pointer", background: "#111", transition: "border-color 0.2s", marginBottom: "1.25rem" },
    uploadIcon: { fontSize: 28, color: "#555", marginBottom: 8 },
    uploadText: { fontSize: 14, color: "#888", marginBottom: 4 },
    uploadSub: { fontSize: 12, color: "#555", fontStyle: "italic" },
    fileChip: { display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", background: "#1a1a1a", border: "0.5px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, color: "#ccc" },
    fileChipX: { cursor: "pointer", color: "#555", fontSize: 14 },
    urlInput: { width: "100%", padding: "10px 14px", border: "0.5px solid rgba(255,255,255,0.12)", borderRadius: 10, fontFamily: "inherit", fontSize: 13, outline: "none", marginBottom: 8, boxSizing: "border-box", background: "#181818", color: "#efefef" },
    addUrl: { padding: "7px 14px", border: "0.5px solid rgba(255,255,255,0.15)", borderRadius: 8, background: "transparent", color: "#888", fontSize: 12, cursor: "pointer", fontFamily: "inherit" },
    btn: { width: "100%", padding: "14px", background: "#efefef", color: "#0e0e0e", border: "none", borderRadius: 12, fontFamily: "inherit", fontSize: 15, fontWeight: 600, cursor: "pointer", marginTop: "1.25rem", letterSpacing: "0.02em" },
    btnSecondary: { padding: "7px 16px", border: "0.5px solid rgba(255,255,255,0.15)", borderRadius: 8, background: "transparent", color: "#888", fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
    btnLink: { background: "none", border: "none", color: "#888", fontSize: 13, cursor: "pointer", textDecoration: "underline", fontFamily: "inherit" },
    analysing: { fontSize: 13, color: "#555", textAlign: "center", marginTop: 8, fontStyle: "italic" },
    resultsGrid: { display: "grid", gridTemplateColumns: `repeat(${numResults}, 1fr)`, gap: "1.5rem", alignItems: "start" },
    restaurantName: { fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 500, marginBottom: "1rem", color: "#efefef", paddingBottom: "0.75rem", borderBottom: "0.5px solid rgba(255,255,255,0.08)", textTransform: "uppercase", letterSpacing: "0.05em" },
    dishCard: { background: "#181818", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "1.25rem", marginBottom: "1rem" },
    dishNum: (i) => ({ width: 26, height: 26, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, marginRight: 8, background: i === 0 ? "#b8860b" : i === 1 ? "#555" : "#4a3000", color: "#fff" }),
    dishLabel: { fontSize: 11, color: "#666", fontStyle: "italic" },
    dishName: { fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 600, margin: "0.25rem 0 0.4rem", color: "#efefef" },
    dishPrice: { fontSize: 14, color: "#666", marginBottom: "0.6rem" },
    tags: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: "0.75rem" },
    tag: { fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#0f2a1a", color: "#4caf80", border: "0.5px solid #1a4a2a" },
    dishDesc: { fontSize: 13, lineHeight: 1.6, color: "#999", marginBottom: "0.5rem" },
    warning: { background: "#2a1f00", border: "0.5px solid #4a3a00", borderRadius: 8, padding: "10px 13px", fontSize: 12, color: "#efb840", display: "flex", gap: 8, alignItems: "flex-start", marginTop: "0.5rem" },
    errorBox: { background: "#2a0f0f", border: "0.5px solid #5a1f1f", borderRadius: 8, padding: "10px 13px", fontSize: 13, color: "#f08080", display: "flex", gap: 8, alignItems: "flex-start" },
    restartBtn: { display: "block", width: "100%", padding: "14px", border: "0.5px solid rgba(255,255,255,0.15)", borderRadius: 12, background: "transparent", color: "#888", fontSize: 14, cursor: "pointer", fontFamily: "inherit", marginTop: "1.5rem", textAlign: "center" },
    historyCard: { background: "#181818", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: "0.75rem" },
    historyDate: { fontSize: 11, color: "#555", marginBottom: 4 },
    historyName: { fontFamily: "Georgia, serif", fontSize: 17, fontWeight: 500, marginBottom: 4, color: "#efefef" },
    historyDishes: { fontSize: 12, color: "#666", marginBottom: 8 },
    spinner: { width: 18, height: 18, border: "2px solid rgba(255,255,255,0.1)", borderTop: "2px solid #efefef", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block", verticalAlign: "middle", marginRight: 8 },
  };

  useEffect(() => {
    if (!isSignedIn || !user) return;
    fetch("/api/preferences", { headers: { "x-user-id": user.id } })
      .then(r => r.json()).then(d => { if (d.prefs) setPrefs(d.prefs); }).catch(() => {});
    fetch("/api/history", { headers: { "x-user-id": user.id } })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setHistory(d); }).catch(() => {});
  }, [isSignedIn, user]);

  const savePreferences = async (p) => {
    if (!isSignedIn || !user) return;
    await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": user.id, "x-user-email": user.primaryEmailAddress?.emailAddress || "" },
      body: JSON.stringify({ prefs: p }),
    }).catch(() => {});
  };

  const saveAnalysis = async (result, sourceName, sourceType) => {
    if (!isSignedIn || !user) return;
    await fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": user.id, "x-user-email": user.primaryEmailAddress?.emailAddress || "" },
      body: JSON.stringify({ source_name: sourceName, source_type: sourceType, restaurante: result.restaurante, platos: result.platos, error: result.error }),
    }).catch(() => {});
  };

  const deleteHistory = async (id) => {
    if (!isSignedIn || !user) return;
    await fetch("/api/history", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-user-id": user.id },
      body: JSON.stringify({ id }),
    }).catch(() => {});
    setHistory(prev => prev.filter(h => h.id !== id));
  };

  const fileToBase64 = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = () => rej(new Error("Read failed"));
    r.readAsDataURL(file);
  });

  const analyzeOne = async (messages, attempt = 1, restaurantUrl = "", restaurantName = "") => {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1500, messages, restaurant_url: restaurantUrl, restaurant_name: restaurantName, restaurant_place_id: pendingPlaceId || "" }),
    });
    if (res.status === 429) { const d = await res.json(); throw new Error(d.error || "Rate limit"); }
    const data = await res.json();
    const text = (data.content || []).map(b => b.text || "").join("");
    const clean = text.replace(/```json|```/g, "").trim();
    try {
      return JSON.parse(clean);
    } catch {
      if (attempt < 2) return analyzeOne(messages, attempt + 1);
      return { restaurante: "No disponible", platos: [], error: t.fileError };
    }
  };

  const confirmMenu = async (placeId, restaurantName) => {
    if (!placeId) return;
    await fetch("/api/menu-confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId, restaurantName }),
    }).catch(() => {});
  };

  const restart = () => { setStep(1); setFiles([]); setUrls([""]); setResults([]); setPendingRestaurant(""); setPendingPlaceId(null); };

  const analyze = async () => {
    const validFiles = files.filter(f => f);
    const validUrls = urls.map(u => cleanUrl(u)).filter(u => u.trim() && !/instagram\.com|facebook\.com|tiktok\.com|twitter\.com|x\.com/.test(u));
    // If no valid files/urls but we have a restaurant name, try scraping by name
    const shouldScrapeByName = validFiles.length === 0 && validUrls.length === 0 && pendingRestaurant;
    if (validFiles.length === 0 && validUrls.length === 0 && !shouldScrapeByName) return;
    setLoading(true);
    setStep(3);
    const newResults = [];

    for (const file of validFiles) {
      try {
        const base64 = await fileToBase64(file);
        const isImg = file.type.startsWith("image/");
        const contentPart = isImg
          ? { type: "image", source: { type: "base64", media_type: file.type, data: base64 } }
          : { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } };
        const messages = [{ role: "user", content: [contentPart, { type: "text", text: buildPrompt(prefs, lang) }] }];
        const result = await analyzeOne(messages);
        if (result.not_menu) result.error = t.notMenu;
        newResults.push({ ...result, source: file.name, displayName: result.restaurante || pendingRestaurant || file.name });
        if (!result.error && result.platos?.length > 0) {
          await saveAnalysis(result, file.name, "file");
          await confirmMenu(pendingPlaceId, result.restaurante);
        }
      } catch (e) {
        newResults.push({ restaurante: "No disponible", platos: [], error: e.message || t.fileError, source: file.name });
      }
    }

    for (const url of validUrls) {
      const isSocial = /instagram\.com|facebook\.com|tiktok\.com|twitter\.com|x\.com/.test(url);
      if (isSocial) {
        newResults.push({ restaurante: "No disponible", platos: [], error: lang === "es" ? "Las redes sociales no permiten acceso directo. Sube una foto de la carta." : "Social media doesn't allow direct access. Upload a photo of the menu.", source: url });
        continue;
      }
      try {
        const messages = [{ role: "user", content: buildUrlPrompt(prefs, url, lang) }];
        const result = await analyzeOne(messages, 1, url, pendingRestaurant);
        if (result.not_menu || result.error) result.error = t.notMenu;
        newResults.push({ ...result, source: url, displayName: pendingRestaurant || result.restaurante });
        if (!result.error && result.platos?.length > 0) {
          await saveAnalysis(result, url, "url");
          await confirmMenu(pendingPlaceId, result.restaurante);
        }
      } catch (e) {
        newResults.push({ restaurante: "No disponible", platos: [], error: t.notMenu, source: url, displayName: pendingRestaurant });
      }
    }

    // If no files/urls but have restaurant name, trigger scraper via analyze
    if (shouldScrapeByName) {
      try {
        const messages = [{ role: "user", content: buildUrlPrompt(prefs, "", lang) }];
        const result = await analyzeOne(messages, 1, "", pendingRestaurant);
        if (result.not_menu || result.error) result.error = t.notMenu;
        if (!result.restaurante) result.restaurante = pendingRestaurant;
        newResults.push({ ...result, source: pendingRestaurant, displayName: pendingRestaurant || result.restaurante });
        if (!result.error && result.platos?.length > 0) {
          await saveAnalysis(result, pendingRestaurant, "scrape");
          await confirmMenu(pendingPlaceId, result.restaurante);
        }
      } catch (e) {
        const noMenuMsg = lang === "es"
          ? "No encontramos la carta online. Sube una foto o PDF de la carta, o busca el link en Google."
          : "Menu not found online. Upload a photo or PDF, or find the link on Google.";
        newResults.push({ restaurante: pendingRestaurant, platos: [], error: noMenuMsg, source: pendingRestaurant, displayName: pendingRestaurant });
      }
    }

    setResults(newResults);
    setLoading(false);
  };

  const renderDishCard = (p, i) => {
    const labels = [t.firstRec, t.secondRec, t.thirdRec];
    return (
      <div key={i} style={s.dishCard}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 4 }}>
          <span style={s.dishNum(i)}>{i + 1}</span>
          <span style={s.dishLabel}>{labels[i] || `#${i + 1}`}</span>
        </div>
        <div style={s.dishName}>{p.nombre}</div>
        {p.precio && <div style={s.dishPrice}>{p.precio}</div>}
        {p.etiquetas?.length > 0 && (
          <div style={s.tags}>{p.etiquetas.map((tag, j) => <span key={j} style={s.tag}>{tag}</span>)}</div>
        )}
        <div style={s.dishDesc}>{p.por_que}</div>
        {p.advertencia && (
          <div style={s.warning}>⚠ {p.advertencia}</div>
        )}
      </div>
    );
  };

  const renderHistory = () => (
    <div style={{ ...s.wrap, maxWidth: 600 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h1 style={{ ...s.h1, marginBottom: 0 }}>Historial</h1>
        <button style={s.btnSecondary} onClick={() => setView("app")}>← {lang === "es" ? "Empezar de nuevo" : "Start over"}</button>
      </div>
      {history.length === 0 && <p style={{ color: "#555", fontSize: 14 }}>{lang === "es" ? "No hay análisis guardados." : "No saved analyses."}</p>}
      {history.map((item) => {
        const platos = (() => { try { return JSON.parse(item.platos_json || "[]"); } catch { return []; } })();
        return (
          <div key={item.id} style={s.historyCard}>
            <div style={s.historyDate}>{lang === "es" ? "Analizado el" : "Analyzed on"} {new Date(item.created_at).toLocaleDateString(lang === "es" ? "es-PE" : "en-US", { day: "numeric", month: "short", year: "numeric" })}</div>
            <div style={s.historyName}>{item.restaurante || "No disponible"}</div>
            {item.error
              ? <div style={{ fontSize: 12, color: "#f08080" }}>⚠ {item.error}</div>
              : <div style={s.historyDishes}>{platos.slice(0, 3).map(p => p.nombre).join(" · ")}</div>
            }
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              {platos.length > 0 && (
                <button style={s.btnSecondary} onClick={() => {
                  setResults([{ restaurante: item.restaurante, platos, source: item.source_name }]);
                  setView("app"); setStep(3);
                }}>{t.reuse}</button>
              )}
              <button style={{ ...s.btnSecondary, color: "#c0392b", borderColor: "#5a1f1f" }} onClick={() => deleteHistory(item.id)}>✕</button>
            </div>
          </div>
        );
      })}
    </div>
  );

  if (view === "signin") return (
    <div style={{ display: "flex", justifyContent: "center", padding: "3rem 1rem", background: "#0e0e0e", minHeight: "100vh" }}>
      <SignIn afterSignInUrl="/" />
    </div>
  );
  if (view === "signup") return (
    <div style={{ display: "flex", justifyContent: "center", padding: "3rem 1rem", background: "#0e0e0e", minHeight: "100vh" }}>
      <SignUp afterSignUpUrl="/" />
    </div>
  );
  if (view === "history") return renderHistory();

  if (tool === "discover") {
    return (
      <div style={{ fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", height: "100vh", overflow: "hidden", background: "#0e0e0e" }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "10px 1.5rem", borderBottom: "0.5px solid rgba(255,255,255,0.08)", background: "#0e0e0e" }}>
          <span style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 500, fontStyle: "italic", color: "#efefef" }}>La Carta Personalizada</span>
          <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.06)", borderRadius: 20, padding: "3px 4px", marginLeft: 8 }}>
            <button style={{ background: "transparent", color: "#888", border: "none", borderRadius: 16, padding: "4px 12px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }} onClick={() => setTool("carta")}>La Carta</button>
            <button style={{ background: "rgba(255,255,255,0.12)", color: "#efefef", border: "none", borderRadius: 16, padding: "4px 12px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Lima Eats</button>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 4, background: "rgba(255,255,255,0.06)", borderRadius: 20, padding: "3px 4px" }}>
            <button style={s.langBtn(lang === "es")} onClick={() => setLang("es")}>ES</button>
            <button style={s.langBtn(lang === "en")} onClick={() => setLang("en")}>EN</button>
          </div>
        </div>
        <Discover lang={lang} onAnalyze={({ name, url, prefs: p, placeId }) => {
          if (p) setPrefs(p);
          setUrls([url || ""]);
          setFiles([]);
          setStep(2);
          setPendingRestaurant(name);
          setPendingPlaceId(placeId || null);
          setTool("carta");
        }} />
      </div>
    );
  }

  return (
    <div style={s.wrap}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');`}</style>
      <>
      <div style={s.topBar}>
        <div>
          <div style={s.logo}>La Carta Personalizada</div>
          <div style={s.logoSub}>Tu menú a medida</div>
        </div>
        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.06)", borderRadius: 20, padding: "3px 4px", marginLeft: 8 }}>
          <button style={{ background: "transparent", color: "#888", border: "none", borderRadius: 16, padding: "4px 12px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>La Carta</button>
          <button style={{ background: "rgba(255,255,255,0.12)", color: "#efefef", border: "none", borderRadius: 16, padding: "4px 12px", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }} onClick={() => setTool("discover")}>Lima Eats</button>
        </div>
        <div style={s.topRight}>
          <div style={s.langToggle}>
            <button style={s.langBtn(lang === "es")} onClick={() => setLang("es")}>ES</button>
            <button style={s.langBtn(lang === "en")} onClick={() => setLang("en")}>EN</button>
          </div>
          {isSignedIn ? (
            <>
              <button style={s.authBtn} onClick={() => setView("history")}>{t.history}</button>
              <UserButton afterSignOutUrl="/" />
            </>
          ) : (
            <>
              <button style={s.authBtn} onClick={() => setView("signin")}>{t.signIn}</button>
              <button style={s.authBtn} onClick={() => setView("signup")}>{t.signUp}</button>
            </>
          )}
        </div>
      </div>

      <div style={s.divider} />

      <div style={s.steps}>
        {[[t.step1, 1], [t.step2, 2], [t.step3, 3]].map(([lbl, n], i) => (
          <div key={n} style={s.stepWrap}>
            {i < 2 && <div style={s.connector} />}
            <div style={s.dot(step === n, step > n)}>{step > n ? "✓" : n}</div>
            <span style={s.dotLabel(step === n)}>{lbl}</span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <div>
          <h1 style={s.h1}>{t.step1Title}</h1>
          <p style={s.subtitle}>{t.step1Sub}</p>
          <textarea
            style={s.textarea}
            value={prefs}
            onChange={e => setPrefs(e.target.value)}
            placeholder={lang === "es" ? "Ej: No como gluten, lactosa, soya, cerdo, nitratos. Evito alimentos altos en histaminas..." : "E.g.: No gluten, lactose, soy, pork, nitrates. I avoid high-histamine foods..."}
          />
          {isSignedIn
            ? <p style={{ fontSize: 12, color: "#555", marginTop: 6 }}>{lang === "es" ? "Tus preferencias se guardan automáticamente." : "Your preferences are saved automatically."}</p>
            : <p style={{ fontSize: 12, color: "#555", marginTop: 6 }}><button style={s.btnLink} onClick={() => setView("signin")}>{t.signIn}</button> {t.savePrefs}</p>
          }
          <button style={s.btn} onClick={() => {
            if (prefs.trim()) { savePreferences(prefs); setStep(2); }
          }}>{lang === "es" ? "Continuar →" : "Continue →"}</button>
        </div>
      )}

      {step === 2 && (
        <div>
          {pendingRestaurant ? (
            <>
              <h1 style={s.h1}>{pendingRestaurant}</h1>
              <p style={s.subtitle}>{lang === "es" ? "Sube la carta o agrega un link para analizar" : "Upload the menu or add a link to analyze"}</p>
              <a href={`https://www.google.com/search?q=${encodeURIComponent(pendingRestaurant + " Lima carta menu")}`} target="_blank" rel="noopener noreferrer" style={{ ...s.addUrl, textDecoration: "none", display: "inline-block", marginBottom: "1.25rem" }}>
                🌐 {lang === "es" ? "Buscar carta en Google" : "Search menu on Google"}
              </a>
            </>
          ) : (
            <>
              <h1 style={s.h1}>{t.step2Title}</h1>
              <p style={s.subtitle}>{t.step2Sub}</p>
            </>
          )}

          <label style={s.label}>{t.filesLabel}</label>
          <div
            style={{ ...s.uploadBox, borderColor: dragging ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)" }}
            onClick={() => document.getElementById("file-inp").click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDrop={e => { e.preventDefault(); setDragging(false); const f = Array.from(e.dataTransfer.files).slice(0, 5 - files.length); setFiles(prev => [...prev, ...f].slice(0, 5)); }}
            onDragLeave={() => setDragging(false)}
          >
            <div style={s.uploadIcon}>↑</div>
            <div style={s.uploadText}>{t.dragDrop}</div>
            <div style={s.uploadSub}>{t.dragDropSub}</div>
          </div>
          <input id="file-inp" type="file" accept="image/*,.pdf" multiple style={{ display: "none" }}
            onChange={e => { const f = Array.from(e.target.files).slice(0, 5 - files.length); setFiles(prev => [...prev, ...f].slice(0, 5)); }} />
          {files.map((f, i) => (
            <div key={i} style={{ ...s.fileChip, marginBottom: 6 }}>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📎 {f.name}</span>
              <span style={s.fileChipX} onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}>✕</span>
            </div>
          ))}

          <label style={{ ...s.label, marginTop: "1.25rem" }}>{t.urlsLabel}</label>
          {urls.map((url, i) => (
            <input key={i} style={s.urlInput} type="url" placeholder={t.urlPlaceholder} value={url}
              onChange={e => setUrls(prev => prev.map((u, j) => j === i ? e.target.value : u))} />
          ))}
          {urls.length < 5 && (
            <button style={s.addUrl} onClick={() => setUrls(prev => [...prev, ""])}>{t.addUrl}</button>
          )}

          {!prefs.trim() && (
            <div style={{ background: "#2a1f00", border: "0.5px solid #4a3a00", borderRadius: 8, padding: "10px 13px", fontSize: 12, color: "#efb840", marginTop: "1rem" }}>
              ⚠ {lang === "es" ? "No ingresaste tus preferencias alimentarias. Las recomendaciones serán genéricas." : "You haven't entered your dietary preferences. Recommendations will be generic."}
              {" "}<button style={{ background: "none", border: "none", color: "#efb840", textDecoration: "underline", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }} onClick={() => setStep(1)}>{lang === "es" ? "Agregar ahora" : "Add now"}</button>
            </div>
          )}
          <button style={s.btn} onClick={analyze}
            disabled={files.length === 0 && urls.every(u => !u.trim()) && !pendingRestaurant}>
            {loading ? <><span style={s.spinner} />{t.analysing}</> : t.analyze}
          </button>
          {loading && <p style={s.analysing}>{t.analysing}</p>}
        </div>
      )}

      {step === 3 && (
        <div>
          {loading && (
            <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
              <div style={{ ...s.spinner, width: 32, height: 32, margin: "0 auto 1rem" }} />
              <p style={{ fontFamily: "Georgia, serif", fontSize: 18, fontStyle: "italic", color: "#efefef", marginBottom: 6 }}>
                {lang === "es" ? "Leyendo la carta…" : "Reading the menu…"}
              </p>
              <p style={{ fontSize: 13, color: "#555" }}>{lang === "es" ? "Buscando los platos perfectos para ti" : "Finding the perfect dishes for you"}</p>
            </div>
          )}
          {!loading && results.length > 0 && (
            <div>
              <div style={s.resultsGrid}>
                {results.map((result, ri) => (
                  <div key={ri}>
                    <div style={s.restaurantName}>{result.displayName || result.restaurante || result.source}</div>
                    {result.error
                      ? <div style={s.errorBox}>⚠ {result.error}</div>
                      : (result.platos || []).slice(0, 3).map((p, i) => renderDishCard(p, i))
                    }
                  </div>
                ))}
              </div>
              {results.every(r => r.error) && pendingRestaurant ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "1.5rem" }}>
                  <button style={s.restartBtn} onClick={() => setStep(2)}>
                    {lang === "en" ? "↑ Upload menu photo or PDF" : "↑ Subir foto o PDF de la carta"}
                  </button>
                  <button style={{ ...s.restartBtn, marginTop: 0 }} onClick={() => { setTool("discover"); restart(); }}>
                    {lang === "en" ? "← Back to Lima Eats" : "← Volver a Lima Eats"}
                  </button>
                </div>
              ) : (
                <button style={s.restartBtn} onClick={restart}>{t.restart}</button>
              )}
            </div>
          )}
        </div>
      )}
      </>
    </div>
  );
}

export default function App() {
  const [lang, setLang] = useState("es");
  const [tool, setTool] = useState("discover");
  return <AppInner lang={lang} setLang={setLang} tool={tool} setTool={setTool} />;
}
