import { useState, useCallback, useEffect } from "react";
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
  return `You are a clinical dietitian and expert chef with deep knowledge of allergies, intolerances, and nutritional biochemistry. The user has these dietary preferences and restrictions:\n\n"${prefs}"\n\nWhen analyzing each restriction, consider ALL hidden ingredients and derivatives:\n- "No gluten": wheat, barley, rye, oats, malt, modified starch, traditional soy sauce\n- "No lactose/cow's milk": butter, cream, cheese, yogurt, casein, whey\n- "No soy": tofu, edamame, miso, soy sauce, soy lecithin\n- "No pork": ham, bacon, chorizo, blood sausage, pancetta, lard, pork gelatin\n- "No nitrates/nitrites": cold cuts, cured meats, ham, sausage, hot dog, bacon, processed meats\n- "High histamine foods" to avoid: tuna, sardines, anchovies, shellfish, aged cheeses, wine, beer, vinegar, tomato, spinach, eggplant, avocado, strawberries, citrus, chocolate, cold cuts, fermented foods\n- "DAO blockers" to avoid: alcohol, energy drinks, black tea, green tea, mate\n\nAnalyze the attached menu and recommend exactly the 3 best dishes.\n\nSTRICT RULES:\n1. Analyze EVERY ingredient including sauces, dressings, marinades and sides.\n2. If ANY DOUBT about a hidden ingredient, discard the dish.\n3. Only recommend dishes where you are CERTAIN all ingredients are safe.\n4. The FIRST recommendation must have zero modifications. The SECOND and THIRD can suggest a minor modification if no fully safe option exists — always note it in "por_que".\n5. Order from safest to least safe.\n6. "por_que": explain specifically why each main ingredient is compatible. Be specific, not generic.\n7. "advertencia": optional field for any potentially problematic ingredient.\n8. "restaurante": exact name from menu.\n9. "etiquetas": max 3 short tags.\n10. "precio": copy EXACTLY as on menu. Omit if not visible.\n11. Fewer than 3 is fine — better 1 safe dish than 3 doubtful ones.\n12. NEVER recommend categories or sections. Only specific named dishes.\n13. NEVER assume ingredients. Only analyze what is explicitly on the menu.\n14. If not enough ingredient info, discard the dish.\n15. "nombre": EXACTLY the dish name as on menu.\n16. If NOT a restaurant menu, return: {"not_menu": true, "restaurante": ""}\n\n${lang === "en" ? "Respond in English." : "Responde en español."}\n\nRespond ONLY with JSON. Start with { end with }.\n{"restaurante":"...","platos":[{"nombre":"...","precio":"...","por_que":"...","advertencia":"...","etiquetas":["..."]}]}`;
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
    wrap: { fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", width: "100%", maxWidth: numResults > 1 ? "none" : 560, margin: "0 auto", padding: numResults > 1 ? "2rem 3rem" : "2rem 1.25rem", boxSizing: "border-box" },
    topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" },
    logo: { fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700, fontStyle: "italic", letterSpacing: "0.02em" },
    logoSub: { fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#888" },
    topRight: { display: "flex", gap: 8, alignItems: "center" },
    langToggle: { display: "flex", gap: 3, background: "#f0efed", borderRadius: 20, padding: "3px 4px" },
    langBtn: (active) => ({ background: active ? "#111" : "transparent", color: active ? "white" : "#888", border: "none", borderRadius: 16, padding: "4px 10px", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }),
    authBtn: { background: "none", border: "0.5px solid #ddd", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "#555", cursor: "pointer", fontFamily: "inherit" },
    historyBtn: { background: "none", border: "0.5px solid #ddd", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "#555", cursor: "pointer", fontFamily: "inherit" },
    divider: { width: 36, height: 1, background: "#ddd", margin: "0.5rem auto 1.5rem" },
    steps: { display: "flex", justifyContent: "center", marginBottom: "2rem" },
    stepWrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1, maxWidth: 110, position: "relative" },
    dot: (active, done) => ({ width: 24, height: 24, borderRadius: "50%", border: `1.5px solid ${done ? "#5c9" : active ? "#111" : "#ccc"}`, background: done ? "#e8fbe8" : active ? "#111" : "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, color: done ? "#2a7a2a" : active ? "white" : "#aaa", position: "relative", zIndex: 1 }),
    connector: { position: "absolute", top: 12, left: "calc(50% + 12px)", width: "calc(100% - 24px)", height: 1, background: "#eee", zIndex: 0 },
    dotLabel: (active) => ({ fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase", color: active ? "#111" : "#aaa", textAlign: "center", lineHeight: 1.3 }),
    title: { fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 600, marginBottom: 6 },
    hint: { fontSize: 13, color: "#666", marginBottom: "1.1rem", lineHeight: 1.55 },
    textarea: { width: "100%", minHeight: 110, padding: "12px 14px", border: "0.5px solid #ddd", borderRadius: 12, fontFamily: "inherit", fontSize: 14, lineHeight: 1.6, resize: "vertical", outline: "none", boxSizing: "border-box" },
    input: { flex: 1, padding: "10px 13px", border: "0.5px solid #ddd", borderRadius: 10, fontFamily: "inherit", fontSize: 13, outline: "none", boxSizing: "border-box", minWidth: 0 },
    uploadZone: (drag) => ({ border: `1.5px dashed ${drag ? "#555" : "#ccc"}`, borderRadius: 12, padding: "1.5rem 1.25rem", textAlign: "center", cursor: "pointer", background: drag ? "#f7f7f7" : "white", transition: "all 0.2s" }),
    fileChip: { display: "flex", alignItems: "center", gap: 8, padding: "7px 11px", background: "#f7f7f7", borderRadius: 8, border: "0.5px solid #eee", fontSize: 12 },
    btn: { width: "100%", padding: "12px", marginTop: "1rem", background: "#111", color: "white", border: "none", borderRadius: 12, fontFamily: "inherit", fontSize: 14, fontWeight: 500, cursor: "pointer" },
    btnSecondary: { background: "none", border: "0.5px solid #ddd", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "#555", cursor: "pointer", fontFamily: "inherit" },
    saveBtn: (saved) => ({ background: saved ? "#edfaf3" : "none", border: `0.5px solid ${saved ? "#5c9" : "#ddd"}`, borderRadius: 8, padding: "6px 12px", fontSize: 12, color: saved ? "#2a7a2a" : "#555", cursor: "pointer", fontFamily: "inherit", transition: "all 0.3s" }),
    removeBtn: { background: "none", border: "none", color: "#bbb", cursor: "pointer", fontFamily: "inherit", fontSize: 12, padding: "0 4px", flexShrink: 0 },
    errorBox: { padding: "11px 13px", background: "#fff0f0", border: "0.5px solid #f5c0c0", borderRadius: 8, color: "#c0392b", fontSize: 13, marginTop: 10, lineHeight: 1.5 },
    warnBox: { fontSize: 12, color: "#7a5a00", background: "#fff8ed", border: "0.5px solid #f5dfa0", borderRadius: 8, padding: "8px 12px", marginTop: 4 },
    sectionLabel: { fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "#aaa", marginBottom: 8, display: "block" },
    restaurantSection: { marginBottom: "1.5rem" },
    restaurantTitle: { fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 600, marginBottom: "1rem", paddingBottom: 8, borderBottom: "0.5px solid #eee" },
    dishCard: { background: "white", border: "0.5px solid #e8e8e8", borderRadius: 12, padding: "1.1rem 1.2rem", marginBottom: 10 },
    dishRank: { fontFamily: "Georgia, serif", fontSize: 12, fontStyle: "italic", color: "#aaa", marginBottom: 4 },
    dishName: { fontFamily: "Georgia, serif", fontSize: 19, fontWeight: 600, marginBottom: 6, lineHeight: 1.2 },
    dishPrice: { fontSize: 13, color: "#888", marginBottom: 8 },
    tagsWrap: { display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 },
    tag: { fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#edfaf3", color: "#1a7a4a" },
    dishWhy: { fontSize: 13, color: "#555", lineHeight: 1.6, paddingTop: 10, borderTop: "0.5px solid #f0f0f0" },
    advertencia: { fontSize: 12, color: "#7a5a00", background: "#fff8ed", border: "0.5px solid #f5dfa0", borderRadius: 6, padding: "6px 10px", marginTop: 8 },
    restartBtn: { width: "100%", padding: 11, marginTop: "1.25rem", background: "transparent", color: "#777", border: "0.5px solid #ddd", borderRadius: 12, fontFamily: "inherit", fontSize: 13, cursor: "pointer" },
    medal: (bg, color) => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: "50%", background: bg, color, fontSize: 10, fontWeight: 600, marginRight: 6 }),
    progressBg: { height: 3, background: "#eee", borderRadius: 2, marginBottom: 8 },
    progressBar: (pct) => ({ height: 3, background: "#111", borderRadius: 2, width: `${pct}%`, transition: "width 0.4s ease" }),
    loader: { width: 28, height: 28, border: "2px solid #eee", borderTopColor: "#111", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 1rem" },
    historyCard: { background: "white", border: "0.5px solid #e8e8e8", borderRadius: 12, padding: "1rem 1.25rem", marginBottom: 10 },
    historyMeta: { fontSize: 11, color: "#aaa", marginBottom: 4 },
    historyName: { fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 600, marginBottom: 6 },
    historyDishes: { fontSize: 12, color: "#666" },
  };

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  const renderDishCard = (p, i) => {
    const { bg, color } = RANKS[i] || RANKS[2];
    const label = lang === "es" ? (RANKS[i] || RANKS[2]).label_es : (RANKS[i] || RANKS[2]).label_en;
    return (
      <div key={i} style={s.dishCard}>
        <div style={s.dishRank}><span style={s.medal(bg, color)}>{i + 1}</span>{label}</div>
        <div style={s.dishName}>{p.nombre}</div>
        {p.precio && <div style={s.dishPrice}>{p.precio}</div>}
        {p.etiquetas?.length > 0 && <div style={s.tagsWrap}>{p.etiquetas.map((tag, j) => <span key={j} style={s.tag}>{tag}</span>)}</div>}
        <div style={s.dishWhy}>{p.por_que}</div>
        {p.advertencia && <div style={s.advertencia}>⚠ {p.advertencia}</div>}
      </div>
    );
  };

  const getRestaurantName = (r) => {
    if (r.restaurante && !["Restaurante", "No disponible", ""].includes(r.restaurante)) return r.restaurante;
    if (r.source) { try { return new URL(r.source).hostname.replace("www.", ""); } catch { return r.source; } }
    return "Restaurante";
  };

  if (!isLoaded) return null;

  if (view === "signin") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "3rem 1rem" }}>
      <SignIn routing="hash" afterSignInUrl="/" />
      <button style={{ ...s.btnSecondary, marginTop: 16 }} onClick={() => setView("app")}>{t.useWithout}</button>
    </div>
  );

  if (view === "signup") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "3rem 1rem" }}>
      <SignUp routing="hash" afterSignUpUrl="/" />
      <button style={{ ...s.btnSecondary, marginTop: 16 }} onClick={() => setView("app")}>{t.useWithout}</button>
    </div>
  );

  if (view === "history") return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", maxWidth: 600, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <p style={s.title}>{t.history}</p>
        <button style={s.btnSecondary} onClick={() => setView("app")}>← {t.restart.replace("←", "").trim()}</button>
      </div>
      {historyLoading && <div style={{ textAlign: "center", padding: "2rem" }}><div style={s.loader} /></div>}
      {!historyLoading && history.length === 0 && <p style={{ color: "#888", fontSize: 14 }}>{t.noHistory}</p>}
      {history.map((item, i) => {
        const platos = JSON.parse(item.platos_json || "[]");
        return (
          <div key={i} style={s.historyCard}>
            <div style={s.historyMeta}>{t.analyzedOn} {formatDate(item.created_at, lang)}</div>
            <div style={s.historyName}>{item.restaurante || item.source_name}</div>
            {item.error
              ? <div style={{ fontSize: 12, color: "#c0392b" }}>⚠ {item.error}</div>
              : <div style={s.historyDishes}>{platos.slice(0, 3).map(p => p.nombre).join(" · ")}</div>
            }
            {platos.length > 0 && (
              <button style={{ ...s.btnSecondary, marginTop: 8 }} onClick={() => {
                setResults([{ restaurante: item.restaurante, platos, source: item.source_name }]);
                setView("app"); setStep(3);
              }}>{t.reuse}</button>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div style={s.wrap}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');`}</style>

      <div style={s.topBar}>
        <div>
          <div style={s.logo}>{t.logo}</div>
          <div style={s.logoSub}>{t.logoSub}</div>
        </div>
        <div style={s.topRight}>
          <div style={s.langToggle}>
            <button style={s.langBtn(lang === "es")} onClick={() => setLang("es")}>ES</button>
            <button style={s.langBtn(lang === "en")} onClick={() => setLang("en")}>EN</button>
          </div>
          {isSignedIn ? (
            <>
              <button style={s.historyBtn} onClick={() => { setView("history"); loadHistory(); }}>{t.history}</button>
              <button style={s.authBtn} onClick={() => signOut()}>{t.signOut}</button>
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
          <p style={s.title}>{t.title1}</p>
          <p style={s.hint}>{t.hint1}</p>
          <textarea style={s.textarea} value={prefs} onChange={e => setPrefs(e.target.value)} placeholder={t.placeholder1} />
          {isSignedIn && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <button style={s.saveBtn(prefsSaved)} onClick={savePreferences}>
                {prefsSaved ? t.savedOk : t.savePrefs}
              </button>
            </div>
          )}
          {!isSignedIn && (
            <p style={{ fontSize: 12, color: "#aaa", marginTop: 8, textAlign: "center" }}>
              <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => setView("signin")}>{t.signIn}</span> {lang === "es" ? "para guardar tus preferencias" : "to save your preferences"}
            </p>
          )}
          {!prefs.trim() && error && <div style={s.errorBox}>{error}</div>}
          <button style={s.btn} onClick={() => {
            if (!prefs.trim()) { setError(t.errPrefs); return; }
            setError(""); setStep(2);
          }}>{t.continue}</button>
        </div>
      )}

      {step === 2 && (
        <div>
          <p style={s.title}>{t.title2}</p>
          <p style={s.hint}>{t.hint2}</p>

          <span style={s.sectionLabel}>{t.uploadLabel} {files.length > 0 && `(${files.length}/5)`}</span>
          {files.length < 5 && (
            <div style={s.uploadZone(dragging)} onClick={() => document.getElementById("file-inp").click()}
              onDragOver={e => { e.preventDefault(); setDragging(true); }} onDrop={onDrop} onDragLeave={() => setDragging(false)}>
              <div style={{ fontSize: 22, marginBottom: 6, opacity: 0.35 }}>⬆</div>
              <p style={{ fontSize: 13, color: "#555", marginBottom: 3 }}>{t.uploadText}</p>
              <p style={{ fontSize: 12, color: "#aaa", fontStyle: "italic" }}>{t.uploadSub}</p>
            </div>
          )}
          <input id="file-inp" type="file" accept="image/*,.pdf" multiple style={{ display: "none" }} onChange={e => addFiles(e.target.files)} />
          {files.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
              {files.map((f, i) => (
                <div key={i} style={s.fileChip}>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📎 {f.name}</span>
                  <button style={s.removeBtn} onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ height: 20 }} />
          <span style={s.sectionLabel}>{t.linksLabel} {validUrls.length > 0 && `(${validUrls.length}/5)`}</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {urls.map((url, i) => (
              <div key={i}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input style={s.input} type="url" value={url} onChange={e => handleUrlChange(i, e.target.value)} placeholder={t.linkPlaceholder} />
                  {urls.length > 1 && <button style={s.removeBtn} onClick={() => setUrls(prev => prev.filter((_, j) => j !== i))}>✕</button>}
                </div>
                {getUrlWarning(url, t) && <div style={s.warnBox}>⚠ {getUrlWarning(url, t)}</div>}
              </div>
            ))}
          </div>
          {urls.length < 5 && <button style={{ ...s.btnSecondary, marginTop: 8 }} onClick={() => setUrls(prev => [...prev, ""])}>{t.addLink}</button>}
          {error && <div style={s.errorBox}>{error}</div>}
          <button style={s.btn} onClick={analyze}>{t.analyze}</button>
          <p style={{ textAlign: "center", fontSize: 12, color: "#aaa", marginTop: 7, fontStyle: "italic" }}>{t.analyzingSub}</p>
        </div>
      )}

      {step === 3 && (
        <div>
          {loading && (
            <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
              <div style={s.loader} />
              <p style={{ fontFamily: "Georgia, serif", fontSize: 17, fontStyle: "italic", marginBottom: 10 }}>
                {t.analyzing} {progress.current} {t.of} {progress.total}…
              </p>
              <div style={s.progressBg}><div style={s.progressBar(pct)} /></div>
              <p style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>{pct}%</p>
            </div>
          )}
          {!loading && error && <><div style={s.errorBox}>{error}</div><button style={s.restartBtn} onClick={restart}>{t.restart}</button></>}
          {!loading && results && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(numResults, 3)}, 1fr)`, gap: 24, alignItems: "start" }}>
                {results.map((r, ri) => (
                  <div key={ri} style={s.restaurantSection}>
                    <p style={s.restaurantTitle}>{getRestaurantName(r)}</p>
                    {r.error && <div style={s.warnBox}>⚠ {r.error}</div>}
                    {!r.error && (r.platos || []).slice(0, 3).map((p, i) => renderDishCard(p, i))}
                  </div>
                ))}
              </div>
              <button style={s.restartBtn} onClick={restart}>{t.restart}</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
