import { useState, useCallback, useEffect } from "react";
import Discover from "./Discover.jsx";
import { SignIn, SignUp, useUser, useClerk } from "@clerk/clerk-react";

const RANKS = [
  { label_es: "Primera recomendación", label_en: "First recommendation", bg: "#FAC775", color: "#412402" },
  { label_es: "Segunda recomendación", label_en: "Second recommendation", bg: "#D3D1C7", color: "#2C2C2A" },
  { label_es: "Tercera recomendación", label_en: "Third recommendation", bg: "#F0997B", color: "#4A1B0C" },
];

const T = {
  es: {
    logo: "La Carta Personalizada", logoSub: "Tu menú a medida",
    step1: "Preferencias", step2: "Las cartas", step3: "Mis platos",
    title1: "¿Qué comes y qué no comes?",
    hint1: "Escribe en lenguaje natural tus restricciones, alergias, preferencias o lo que no te gusta.",
    placeholder1: "Ej: No como gluten, lactosa, soya, cerdo, nitratos. Evito alimentos altos en histaminas...",
    savedPrefs: "Preferencias guardadas cargadas.",
    savePrefs: "Guardar preferencias",
    savedOk: "✓ Guardado",
    continue: "Continuar →",
    errPrefs: "Por favor describe tus preferencias.",
    title2: "Agrega las cartas",
    hint2: "Sube hasta 5 imágenes o PDFs, y/o agrega hasta 5 links de cartas online.",
    uploadLabel: "Imágenes o PDFs", uploadText: "Arrastra imágenes o PDFs aquí",
    uploadSub: "o haz clic para seleccionar (máx. 5)",
    linksLabel: "Links de cartas online", linkPlaceholder: "https://restaurante.com/carta",
    addLink: "+ Agregar otro link", errNoMenu: "Por favor sube al menos una carta o agrega un link.",
    analyze: "Ver mis platos recomendados", analyzingSub: "Analizando con inteligencia artificial",
    analyzing: "Analizando carta", of: "de",
    results: "Tus 3 platos ideales", restart: "← Empezar de nuevo",
    history: "Historial", noHistory: "Aún no tienes análisis guardados.",
    notMenu: "Este archivo no parece ser una carta de restaurante.",
    accessError: "No se pudo acceder a este link. Prueba subiendo una foto o PDF.",
    fileError: "No se pudo analizar este archivo. Asegúrate que la imagen sea clara.",
    warnGoogle: "Este es un link de búsqueda de Google. Busca el link directo al menú.",
    warnIG: "Instagram bloquea el acceso automático. Sube una foto de la carta.",
    warnFB: "Facebook bloquea el acceso automático. Sube una foto de la carta.",
    warnTT: "TikTok no tiene cartas. Usa el link directo al menú.",
    warnX: "X/Twitter bloquea el acceso automático. Usa el link directo al menú.",
    signIn: "Iniciar sesión", signUp: "Registrarse", signOut: "Cerrar sesión",
    authPrompt: "Inicia sesión para guardar tus preferencias e historial",
    useWithout: "Continuar sin cuenta",
    reuse: "Usar de nuevo",
    analyzedOn: "Analizado el",
  },
  en: {
    logo: "The Personalized Menu", logoSub: "Your menu, your way",
    step1: "Preferences", step2: "The menus", step3: "My dishes",
    title1: "What do you eat and what don't you eat?",
    hint1: "Write in natural language your restrictions, allergies, preferences or what you dislike.",
    placeholder1: "E.g.: No gluten, lactose, soy, pork, nitrates. I avoid high-histamine foods...",
    savedPrefs: "Saved preferences loaded.",
    savePrefs: "Save preferences",
    savedOk: "✓ Saved",
    continue: "Continue →",
    errPrefs: "Please describe your preferences.",
    title2: "Add the menus",
    hint2: "Upload up to 5 images or PDFs, and/or add up to 5 links to online menus.",
    uploadLabel: "Images or PDFs", uploadText: "Drag images or PDFs here",
    uploadSub: "or click to select (max. 5)",
    linksLabel: "Online menu links", linkPlaceholder: "https://restaurant.com/menu",
    addLink: "+ Add another link", errNoMenu: "Please upload at least one menu or add a link.",
    analyze: "See my recommended dishes", analyzingSub: "Analyzing with artificial intelligence",
    analyzing: "Analyzing menu", of: "of",
    results: "Your 3 ideal dishes", restart: "← Start over",
    history: "History", noHistory: "You have no saved analyses yet.",
    notMenu: "This file doesn't appear to be a restaurant menu.",
    accessError: "Could not access this link. Try uploading a photo or PDF.",
    fileError: "Could not analyze this file. Make sure the image is clear.",
    warnGoogle: "This is a Google search link. Find the direct link to the menu.",
    warnIG: "Instagram blocks automatic access. Upload a photo of the menu.",
    warnFB: "Facebook blocks automatic access. Upload a photo of the menu.",
    warnTT: "TikTok doesn't have menus. Use the direct link to the menu.",
    warnX: "X/Twitter blocks automatic access. Use the direct link to the menu.",
    signIn: "Sign in", signUp: "Sign up", signOut: "Sign out",
    authPrompt: "Sign in to save your preferences and history",
    useWithout: "Continue without account",
    reuse: "Use again",
    analyzedOn: "Analyzed on",
  }
};

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = () => rej(new Error("Could not read file."));
    r.readAsDataURL(file);
  });
}

function cleanUrl(url) {
  if (!url) return url;
  if (url.includes("google.com/search")) {
    try { const q = new URL(url).searchParams.get("q"); if (q?.startsWith("http")) return q; } catch {}
  }
  return url;
}

function getUrlWarning(url, t) {
  if (!url.trim()) return null;
  if (url.includes("google.com/search")) return t.warnGoogle;
  if (url.includes("instagram.com")) return t.warnIG;
  if (url.includes("facebook.com")) return t.warnFB;
  if (url.includes("tiktok.com")) return t.warnTT;
  if (url.includes("twitter.com") || url.includes("x.com")) return t.warnX;
  return null;
}

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
5. In "por_que": explain specifically why the main ingredient is compatible. Mention the separable side issue only in "advertencia". OMIT the "advertencia" field entirely if there is nothing to warn about — do NOT write "no warnings" or similar.
6. In "restaurante": exact name from menu.
7. In "etiquetas": max 3 short tags.
8. In "precio": copy EXACTLY as on menu. Omit if not visible.
9. Fewer than 3 is fine if not enough safe options.
10. NEVER recommend categories. Only specific named dishes.
11. URLs from sites like cluvi.pe, opentable.com, mesa247.pe, rappi.com, woki.pe, and similar restaurant or delivery platforms ARE restaurant menus — analyze them as such. Only return {"not_menu": true} if the content is clearly not food-related at all.
12. If NOT a restaurant menu, return: {"not_menu": true, "restaurante": ""}

${lang === "en" ? "Respond in English." : "Responde en español."}

Respond ONLY with JSON. Start with { end with }.
{"restaurante":"...","platos":[{"nombre":"...","precio":"...","por_que":"...","advertencia":"...","etiquetas":["..."]}]}`;
}

function buildUrlPrompt(prefs, url, lang) {
  return `You are a clinical dietitian and expert chef. The user's restrictions:\n\n"${prefs}"\n\nMenu at: ${url}\n\nSame strict rules as always — no assumptions, no modifications, only safe dishes explicitly described on the menu. If not a menu, return {"not_menu": true, "restaurante": ""}.\n\n${lang === "en" ? "Respond in English." : "Responde en español."}\n\nOnly JSON: {"restaurante":"...","platos":[{"nombre":"...","precio":"...","por_que":"...","advertencia":"...","etiquetas":["..."]}]}`;
}

function formatDate(str, lang) {
  const d = new Date(str);
  return d.toLocaleDateString(lang === "es" ? "es-PE" : "en-US", { day: "numeric", month: "short", year: "numeric" });
}

export default function App() {
  const [lang, setLang] = useState("es");
  const t = T[lang];
  const [tool, setTool] = useState("discover"); // carta | discover
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();

  const [view, setView] = useState("app"); // app | signin | signup | history
  const [step, setStep] = useState(1);
  const [prefs, setPrefs] = useState("");
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [files, setFiles] = useState([]);
  const [urls, setUrls] = useState([""]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Load saved preferences when user signs in
  useEffect(() => {
    if (isSignedIn && user && !prefsLoaded) {
      fetch("/api/preferences", { headers: { "x-user-id": user.id } })
        .then(r => r.json())
        .then(data => {
          if (data.prefs) { setPrefs(data.prefs); setPrefsLoaded(true); }
        }).catch(() => {});
    }
  }, [isSignedIn, user]);

  const savePreferences = async () => {
    if (!isSignedIn || !user || !prefs.trim()) return;
    await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": user.id, "x-user-email": user.primaryEmailAddress?.emailAddress || "" },
      body: JSON.stringify({ prefs }),
    });
    setPrefsSaved(true);
    setTimeout(() => setPrefsSaved(false), 2000);
  };

  const loadHistory = async () => {
    if (!isSignedIn || !user) return;
    setHistoryLoading(true);
    const r = await fetch("/api/history", { headers: { "x-user-id": user.id } });
    const data = await r.json();
    setHistory(data);
    setHistoryLoading(false);
  };

  const saveAnalysis = async (result, sourceName, sourceType) => {
    if (!isSignedIn || !user) return;
    await fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": user.id, "x-user-email": user.primaryEmailAddress?.emailAddress || "" },
      body: JSON.stringify({
        source_name: sourceName, source_type: sourceType,
        restaurante: result.restaurante, platos: result.platos, error: result.error || null,
      }),
    }).catch(() => {});
  };

  const addFiles = (newFiles) => {
    const valid = Array.from(newFiles).filter(f => f.type.startsWith("image/") || f.type === "application/pdf");
    setFiles(prev => [...prev, ...valid].slice(0, 5));
  };

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files);
  }, []);

  const handleUrlChange = (i, val) => {
    setUrls(prev => prev.map((u, j) => j === i ? cleanUrl(val) : u));
  };

  const validUrls = urls.filter(u => u.trim());

  const analyzeOne = async (messages, attempt = 1) => {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1500, messages }),
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

  const analyze = async () => {
    if (files.length === 0 && validUrls.length === 0) { setError(t.errNoMenu); return; }
    setError(""); setStep(3); setLoading(true); setResults(null);
    const total = files.length + validUrls.length;
    setProgress({ current: 0, total });
    const allResults = [];

    try {
      for (let i = 0; i < files.length; i++) {
        setProgress({ current: i + 1, total });
        const file = files[i];
        try {
          const base64 = await fileToBase64(file);
          const isImg = file.type.startsWith("image/");
          const contentPart = isImg
            ? { type: "image", source: { type: "base64", media_type: file.type, data: base64 } }
            : { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } };
          const messages = [{ role: "user", content: [contentPart, { type: "text", text: buildPrompt(prefs, lang) }] }];
          const parsed = await analyzeOne(messages);
          const result = parsed.not_menu
            ? { restaurante: file.name, platos: [], error: t.notMenu, source: file.name }
            : { ...parsed, source: file.name };
          allResults.push(result);
          if (!result.error && result.platos?.length > 0) await saveAnalysis(result, file.name, "file");
        } catch { allResults.push({ restaurante: file.name, platos: [], error: t.fileError, source: file.name }); }
      }

      for (let i = 0; i < validUrls.length; i++) {
        setProgress({ current: files.length + i + 1, total });
        const url = validUrls[i].trim();
        try {
          const messages = [{ role: "user", content: buildUrlPrompt(prefs, url, lang) }];
          const parsed = await analyzeOne(messages);
          const result = parsed.not_menu
            ? { restaurante: url, platos: [], error: t.notMenu, source: url }
            : { ...parsed, source: url };
          allResults.push(result);
          if (!result.error && result.platos?.length > 0) await saveAnalysis(result, url, "url");
        } catch (e) {
          if (e.message?.includes("limit") || e.message?.includes("Límite")) throw e;
          allResults.push({ restaurante: url, platos: [], error: t.accessError, source: url });
        }
      }
      setResults(allResults);
    } catch (e) {
      setError(e.message || "Error. Please try again.");
    } finally { setLoading(false); }
  };

  const restart = () => {
    setStep(1); setFiles([]); setUrls([""]); setResults(null); setError(""); setLoading(false);
  };

  const numResults = results ? results.length : 0;

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


