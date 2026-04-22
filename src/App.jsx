import { useState, useCallback } from "react";

const RANKS = [
  { label: "Primera recomendación", bg: "#FAC775", color: "#412402" },
  { label: "Segunda recomendación", bg: "#D3D1C7", color: "#2C2C2A" },
  { label: "Tercera recomendación", bg: "#F0997B", color: "#4A1B0C" },
];

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = () => rej(new Error("No se pudo leer el archivo."));
    r.readAsDataURL(file);
  });
}

function cleanUrl(url) {
  if (!url) return url;
  if (url.includes("google.com/search")) {
    try {
      const q = new URL(url).searchParams.get("q");
      if (q && q.startsWith("http")) return q;
    } catch {}
  }
  return url;
}

function getUrlWarning(url) {
  if (!url.trim()) return null;
  if (url.includes("google.com/search")) return "Este es un link de búsqueda de Google. Busca el link directo al menú del restaurante.";
  if (url.includes("instagram.com")) return "Instagram bloquea el acceso automático. Sube una foto de la carta en su lugar.";
  if (url.includes("facebook.com")) return "Facebook bloquea el acceso automático. Sube una foto de la carta en su lugar.";
  if (url.includes("tiktok.com")) return "TikTok no tiene cartas. Usa el link directo al menú del restaurante.";
  if (url.includes("twitter.com") || url.includes("x.com")) return "X/Twitter bloquea el acceso automático. Usa el link directo al menú.";
  return null;
}

function buildPrompt(prefs) {
  return `Eres un sommelier y chef experto. El usuario tiene estas preferencias y restricciones dietarias:\n\n"${prefs}"\n\nAnaliza la carta adjunta y recomienda exactamente los 3 mejores platos para esta persona.\n\nREGLAS ESTRICTAS:\n1. Solo recomienda platos que YA cumplan con todas las restricciones TAL COMO ESTÁN en la carta. Sin modificaciones ni sustituciones.\n2. Si un plato necesita adaptación, descártalo.\n3. Ordena del más compatible al menos compatible.\n4. En "por_que" explica en 1-2 frases por qué el plato ya es compatible. Nunca menciones sustituciones.\n5. En "restaurante" pon el nombre del restaurante tal como aparece en la carta (si no se menciona, usa "Restaurante").\n6. En "etiquetas" incluye máximo 3 tags cortos como "Sin gluten", "Vegano", "Alto en proteína".\n7. En "precio" copia el precio EXACTAMENTE como aparece en la carta, sin reformatear ni convertir moneda. Si dice "S/. 18" escribe "S/. 18". Si no hay precio visible, omite el campo precio.\n8. Si no hay 3 platos completamente compatibles, completa el resto con los más cercanos indicando en "por_que" qué ingrediente menor podría ser un problema.\n\nTu respuesta debe ser ÚNICAMENTE el JSON, sin ninguna palabra antes ni después, sin explicaciones, sin backticks. Empieza directamente con { y termina con }.\nFormato exacto:\n{"restaurante":"...","platos":[{"nombre":"...","precio":"...","por_que":"...","etiquetas":["..."]}]}`;
}

function buildUrlPrompt(prefs, url) {
  return `Eres un sommelier y chef experto. El usuario tiene estas preferencias y restricciones dietarias:\n\n"${prefs}"\n\nEl menú del restaurante está en este link: ${url}\n\nAnaliza la carta y recomienda exactamente los 3 mejores platos para esta persona.\n\nREGLAS ESTRICTAS:\n1. Solo recomienda platos que YA cumplan con todas las restricciones TAL COMO ESTÁN en la carta. Sin modificaciones ni sustituciones.\n2. Si un plato necesita adaptación, descártalo.\n3. Ordena del más compatible al menos compatible.\n4. En "por_que" explica en 1-2 frases por qué el plato ya es compatible. Nunca menciones sustituciones.\n5. En "restaurante" pon el nombre del restaurante TAL COMO APARECE en la carta. Si no encuentras el nombre en la carta, extráelo del URL. NUNCA inventes un nombre que no esté en la carta o en el URL.\n6. En "etiquetas" incluye máximo 3 tags cortos.\n7. En "precio" copia el precio EXACTAMENTE como aparece en la carta, sin reformatear ni convertir moneda. Si no hay precio visible, omite el campo precio.\n\nResponde SOLO con un JSON válido sin backticks ni texto adicional. Formato exacto:\n{"restaurante":"...","platos":[{"nombre":"...","precio":"...","por_que":"...","etiquetas":["..."]}]}`;
}

export default function App() {
  const [step, setStep] = useState(1);
  const [prefs, setPrefs] = useState("");
  const [files, setFiles] = useState([]);
  const [urls, setUrls] = useState([""]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const addFiles = (newFiles) => {
    const valid = Array.from(newFiles).filter(f => f.type.startsWith("image/") || f.type === "application/pdf");
    setFiles(prev => [...prev, ...valid].slice(0, 5));
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, []);

  const handleUrlChange = (i, val) => {
    const cleaned = cleanUrl(val);
    setUrls(prev => prev.map((u, j) => j === i ? cleaned : u));
  };

  const validUrls = urls.filter(u => u.trim());

  const analyzeOne = async (messages) => {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, messages }),
    });
    if (res.status === 429) {
      const data = await res.json();
      throw new Error(data.error || "Límite alcanzado. Intenta en una hora.");
    }
    const data = await res.json();
    const text = (data.content || []).map(b => b.text || "").join("");
    const clean = text.replace(/```json|```/g, "").trim();
    try {
      return JSON.parse(clean);
    } catch {
      return { restaurante: "No disponible", platos: [], error: "No se pudo analizar esta carta." };
    }
  };

  const analyze = async () => {
    if (files.length === 0 && validUrls.length === 0) {
      setError("Por favor sube al menos una carta o agrega un link.");
      return;
    }
    setError("");
    setStep(3);
    setLoading(true);
    setResults(null);

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
          const messages = [{ role: "user", content: [contentPart, { type: "text", text: buildPrompt(prefs) }] }];
          const parsed = await analyzeOne(messages);
          allResults.push({ ...parsed, source: file.name });
        } catch {
          allResults.push({ restaurante: file.name, platos: [], error: "No se pudo analizar este archivo. Asegúrate que la imagen sea clara y el texto legible." });
        }
      }

      for (let i = 0; i < validUrls.length; i++) {
        setProgress({ current: files.length + i + 1, total });
        const url = validUrls[i].trim();
        try {
          const messages = [{ role: "user", content: buildUrlPrompt(prefs, url) }];
          const parsed = await analyzeOne(messages);
          allResults.push({ ...parsed, source: url });
        } catch (e) {
          if (e.message && e.message.includes("Límite")) throw e;
          allResults.push({ restaurante: url, platos: [], error: "No se pudo acceder a este link. Prueba subiendo una foto o PDF." });
        }
      }

      setResults(allResults);
    } catch (e) {
      setError(e.message || "Ocurrió un error. Por favor intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const restart = () => {
    setStep(1); setPrefs(""); setFiles([]); setUrls([""]);
    setResults(null); setError(""); setLoading(false);
  };

  const numResults = results ? results.length : 0;

  const s = {
    wrap: { fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", width: "100%", maxWidth: numResults > 1 ? "none" : 540, margin: "0 auto", padding: numResults > 1 ? "2rem 3rem" : "2rem 1.25rem", boxSizing: "border-box" },
    logo: { fontFamily: "Georgia, serif", fontSize: 26, fontWeight: 700, fontStyle: "italic", letterSpacing: "0.02em", display: "block", marginBottom: 4, textAlign: "center" },
    logoSub: { fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase", color: "#888", display: "block", textAlign: "center" },
    divider: { width: 36, height: 1, background: "#ddd", margin: "0.75rem auto 2rem" },
    steps: { display: "flex", justifyContent: "center", marginBottom: "2rem" },
    stepWrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1, maxWidth: 110, position: "relative" },
    dot: (active, done) => ({ width: 24, height: 24, borderRadius: "50%", border: `1.5px solid ${done ? "#5c9" : active ? "#111" : "#ccc"}`, background: done ? "#e8fbe8" : active ? "#111" : "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, color: done ? "#2a7a2a" : active ? "white" : "#aaa", position: "relative", zIndex: 1, transition: "all 0.3s" }),
    connector: { position: "absolute", top: 12, left: "calc(50% + 12px)", width: "calc(100% - 24px)", height: 1, background: "#eee", zIndex: 0 },
    dotLabel: (active) => ({ fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase", color: active ? "#111" : "#aaa", textAlign: "center", lineHeight: 1.3 }),
    title: { fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 600, marginBottom: 6 },
    hint: { fontSize: 13, color: "#666", marginBottom: "1.1rem", lineHeight: 1.55 },
    textarea: { width: "100%", minHeight: 110, padding: "12px 14px", border: "0.5px solid #ddd", borderRadius: 12, fontFamily: "inherit", fontSize: 14, lineHeight: 1.6, resize: "vertical", outline: "none", boxSizing: "border-box" },
    input: { flex: 1, padding: "10px 13px", border: "0.5px solid #ddd", borderRadius: 10, fontFamily: "inherit", fontSize: 13, outline: "none", boxSizing: "border-box", minWidth: 0 },
    uploadZone: (drag) => ({ border: `1.5px dashed ${drag ? "#555" : "#ccc"}`, borderRadius: 12, padding: "1.5rem 1.25rem", textAlign: "center", cursor: "pointer", background: drag ? "#f7f7f7" : "white", transition: "all 0.2s" }),
    fileChip: { display: "flex", alignItems: "center", gap: 8, padding: "7px 11px", background: "#f7f7f7", borderRadius: 8, border: "0.5px solid #eee", fontSize: 12 },
    btn: { width: "100%", padding: "12px", marginTop: "1rem", background: "#111", color: "white", border: "none", borderRadius: 12, fontFamily: "inherit", fontSize: 14, fontWeight: 500, letterSpacing: "0.04em", cursor: "pointer" },
    addBtn: { background: "none", border: "0.5px solid #ddd", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "#555", cursor: "pointer", fontFamily: "inherit" },
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
    tag: { fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#edfaf3", color: "#1a7a4a", letterSpacing: "0.04em" },
    dishWhy: { fontSize: 13, color: "#555", lineHeight: 1.6, paddingTop: 10, borderTop: "0.5px solid #f0f0f0" },
    restartBtn: { width: "100%", padding: 11, marginTop: "1.25rem", background: "transparent", color: "#777", border: "0.5px solid #ddd", borderRadius: 12, fontFamily: "inherit", fontSize: 13, cursor: "pointer" },
    medal: (bg, color) => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: "50%", background: bg, color, fontSize: 10, fontWeight: 600, marginRight: 6 }),
    progressBg: { height: 3, background: "#eee", borderRadius: 2, marginBottom: 8 },
    progressBar: (pct) => ({ height: 3, background: "#111", borderRadius: 2, width: `${pct}%`, transition: "width 0.4s ease" }),
    loader: { width: 28, height: 28, border: "2px solid #eee", borderTopColor: "#111", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 1rem" },
  };

  const pct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div style={s.wrap}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');`}</style>

      <span style={s.logo}>La Carta Personalizada</span>
      <span style={s.logoSub}>Tu menú a medida</span>
      <div style={s.divider} />

      <div style={s.steps}>
        {[["Preferencias", 1], ["Las cartas", 2], ["Mis platos", 3]].map(([lbl, n], i) => (
          <div key={n} style={s.stepWrap}>
            {i < 2 && <div style={s.connector} />}
            <div style={s.dot(step === n, step > n)}>{step > n ? "✓" : n}</div>
            <span style={s.dotLabel(step === n)}>{lbl}</span>
          </div>
        ))}
      </div>

      {step === 1 && (
        <div>
          <p style={s.title}>¿Qué comes y qué no comes?</p>
          <p style={s.hint}>Escribe en lenguaje natural tus restricciones, alergias, preferencias o lo que no te gusta.</p>
          <textarea
            style={s.textarea}
            value={prefs}
            onChange={e => setPrefs(e.target.value)}
            placeholder="Ej: Soy vegetariana, no como gluten ni lactosa. Me encantan los sabores picantes. No soporto el cilantro..."
          />
          {!prefs.trim() && error && <div style={s.errorBox}>{error}</div>}
          <button style={s.btn} onClick={() => {
            if (!prefs.trim()) { setError("Por favor describe tus preferencias."); return; }
            setError(""); setStep(2);
          }}>Continuar →</button>
        </div>
      )}

      {step === 2 && (
        <div>
          <p style={s.title}>Agrega las cartas</p>
          <p style={s.hint}>Sube hasta 5 imágenes o PDFs, y/o agrega hasta 5 links de cartas online.</p>

          <span style={s.sectionLabel}>Imágenes o PDFs {files.length > 0 && `(${files.length}/5)`}</span>
          {files.length < 5 && (
            <div
              style={s.uploadZone(dragging)}
              onClick={() => document.getElementById("file-inp").click()}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDrop={onDrop}
              onDragLeave={() => setDragging(false)}
            >
              <div style={{ fontSize: 22, marginBottom: 6, opacity: 0.35 }}>⬆</div>
              <p style={{ fontSize: 13, color: "#555", marginBottom: 3 }}>Arrastra imágenes o PDFs aquí</p>
              <p style={{ fontSize: 12, color: "#aaa", fontStyle: "italic" }}>o haz clic para seleccionar (máx. 5)</p>
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
          <span style={s.sectionLabel}>Links de cartas online {validUrls.length > 0 && `(${validUrls.length}/5)`}</span>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {urls.map((url, i) => (
              <div key={i}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    style={s.input}
                    type="url"
                    value={url}
                    onChange={e => handleUrlChange(i, e.target.value)}
                    placeholder="https://restaurante.com/carta"
                  />
                  {urls.length > 1 && (
                    <button style={s.removeBtn} onClick={() => setUrls(prev => prev.filter((_, j) => j !== i))}>✕</button>
                  )}
                </div>
                {getUrlWarning(url) && (
                  <div style={s.warnBox}>⚠ {getUrlWarning(url)}</div>
                )}
              </div>
            ))}
          </div>

          {urls.length < 5 && (
            <button style={{ ...s.addBtn, marginTop: 8 }} onClick={() => setUrls(prev => [...prev, ""])}>
              + Agregar otro link
            </button>
          )}

          {error && <div style={s.errorBox}>{error}</div>}
          <button style={s.btn} onClick={analyze}>Ver mis platos recomendados</button>
          <p style={{ textAlign: "center", fontSize: 12, color: "#aaa", marginTop: 7, fontStyle: "italic" }}>Analizando con inteligencia artificial</p>
        </div>
      )}

      {step === 3 && (
        <div>
          {loading && (
            <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
              <div style={s.loader} />
              <p style={{ fontFamily: "Georgia, serif", fontSize: 17, fontStyle: "italic", marginBottom: 10 }}>
                Analizando carta {progress.current} de {progress.total}…
              </p>
              <div style={s.progressBg}>
                <div style={s.progressBar(pct)} />
              </div>
              <p style={{ fontSize: 12, color: "#aaa", marginTop: 6 }}>{pct}%</p>
            </div>
          )}

          {!loading && error && (
            <>
              <div style={s.errorBox}>{error}</div>
              <button style={s.restartBtn} onClick={restart}>← Empezar de nuevo</button>
            </>
          )}

          {!loading && results && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(numResults, 3)}, 1fr)`, gap: 24, alignItems: "start" }}>
                {results.map((r, ri) => (
                  <div key={ri} style={s.restaurantSection}>
                    <p style={s.restaurantTitle}>{r.restaurante && r.restaurante !== "Restaurante" ? r.restaurante : (r.source ? (() => { try { return new URL(r.source).hostname.replace("www.", ""); } catch { return r.source; } })() : "Restaurante")}</p>
                    {r.error && (
                      <div style={{ padding: "10px 13px", background: "#fff8ed", border: "0.5px solid #f5dfa0", borderRadius: 8, color: "#7a5a00", fontSize: 13 }}>
                        No se pudo analizar esta carta. Si es una imagen, asegúrate que la foto sea clara y legible. Si es un link, el sitio puede estar bloqueando el acceso — prueba subiendo una foto o PDF.
                      </div>
                    )}
                    {!r.error && (r.platos || []).slice(0, 3).map((p, i) => {
                      const { label, bg, color } = RANKS[i];
                      return (
                        <div key={i} style={s.dishCard}>
                          <div style={s.dishRank}><span style={s.medal(bg, color)}>{i + 1}</span>{label}</div>
                          <div style={s.dishName}>{p.nombre}</div>
                          {p.precio && <div style={s.dishPrice}>{p.precio}</div>}
                          {p.etiquetas?.length > 0 && (
                            <div style={s.tagsWrap}>{p.etiquetas.map((t, j) => <span key={j} style={s.tag}>{t}</span>)}</div>
                          )}
                          <div style={s.dishWhy}>{p.por_que}</div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              <button style={s.restartBtn} onClick={restart}>← Empezar de nuevo</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
