const RATE_LIMIT = new Map();

async function logEvent(db, telegram, data) {
  const { restaurantName, restaurantUrl, userEmail, ip, country } = data;

  try {
    if (db) {
      await db.prepare(
        "INSERT INTO events (user_email, restaurant_name, restaurant_url, ip, country) VALUES (?, ?, ?, ?, ?)"
      ).bind(userEmail || null, restaurantName || null, restaurantUrl || null, ip || null, country || null).run();
      console.log("[events] D1 insert ok");
    }
  } catch (e) {
    console.error("[events] D1 error:", e.message);
  }

  try {
    if (telegram && telegram.token && telegram.chatId) {
      const now = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
      const lines = [
        "🍽 <b>Nueva analisis</b>",
        "Restaurante: " + (restaurantName || "desconocido"),
        userEmail ? "Usuario: " + userEmail : "IP: " + (ip || "?"),
        country ? "Pais: " + country : null,
        "🕐 " + now,
      ].filter(Boolean).join("\n");

      const res = await fetch(
        "https://api.telegram.org/bot" + telegram.token + "/sendMessage",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: telegram.chatId, text: lines, parse_mode: "HTML" }),
        }
      );
      const json = await res.json();
      if (json.ok) {
        console.log("[telegram] sent ok for:", restaurantName);
      } else {
        console.error("[telegram] api error:", JSON.stringify(json));
      }
    } else {
      console.log("[telegram] skipped - token:", !!(telegram && telegram.token), "chatId:", !!(telegram && telegram.chatId));
    }
  } catch (e) {
    console.error("[telegram] exception:", e.message);
  }
}

export async function onRequestPost(context) {
  const ip = context.request.headers.get("cf-connecting-ip") || "unknown";
  const country = context.request.headers.get("cf-ipcountry") || null;
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const limit = 10;

  if (!RATE_LIMIT.has(ip)) RATE_LIMIT.set(ip, []);
  const timestamps = RATE_LIMIT.get(ip).filter(t => now - t < windowMs);
  if (timestamps.length >= limit) {
    return new Response(JSON.stringify({ error: "Rate limit: max " + limit + " analyses per hour." }), {
      status: 429, headers: { "Content-Type": "application/json" },
    });
  }
  timestamps.push(now);
  RATE_LIMIT.set(ip, timestamps);

  try {
    const body = await context.request.json();
    const { model, max_tokens, messages, restaurant_url, restaurant_name, restaurant_place_id } = body;
    const userEmail = context.request.headers.get("x-user-email") || null;

    let finalMessages = messages;

    if ((restaurant_url || restaurant_name) && messages && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const isTextOnly = Array.isArray(lastMsg && lastMsg.content)
        ? lastMsg.content.every(c => c.type === "text")
        : typeof (lastMsg && lastMsg.content) === "string";

      if (isTextOnly) {
        try {
          const scrapeController = new AbortController();
          const scrapeTimeout = setTimeout(() => scrapeController.abort(), 18000);
          const scrapeRes = await fetch(new URL(context.request.url).origin + "/api/scrape", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: restaurant_url || "", name: restaurant_name || "", placeId: restaurant_place_id || "" }),
            signal: scrapeController.signal,
          });
          clearTimeout(scrapeTimeout);

          if (scrapeRes.ok) {
            const scrapeData = await scrapeRes.json();
            const text = scrapeData.text;
            const source = scrapeData.source;
            const scrapedUrl = scrapeData.url;
            if (text && text.length > 200) {
              const prompt = typeof lastMsg.content === "string"
                ? lastMsg.content
                : (lastMsg.content.find(c => c.type === "text") || {}).text || "";
              const newContent = "MENU CONTENT (scraped from " + source + " - " + scrapedUrl + "):\n\n" + text + "\n\n---\n\n" + prompt;
              finalMessages = messages.slice(0, -1).concat([Object.assign({}, lastMsg, { content: newContent })]);
            }
          }
        } catch (e) {
          console.error("Scrape failed, falling back to direct URL:", e.message);
        }
      }
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": context.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: model, max_tokens: max_tokens, messages: finalMessages }),
    });

    const data = await response.json();

    const ownerEmails = (context.env.OWNER_EMAIL || "").split(",").map(e => e.trim().toLowerCase());
    const isOwner = userEmail && ownerEmails.length > 0 && ownerEmails.includes(userEmail.toLowerCase());
    console.log("[owner] userEmail:", userEmail, "isOwner:", isOwner);
    if (!isOwner) {
      await logEvent(
      context.env.DB,
      { token: context.env.TELEGRAM_BOT_TOKEN, chatId: context.env.TELEGRAM_CHAT_ID },
        { restaurantName: restaurant_name, restaurantUrl: restaurant_url, userEmail: userEmail, ip: ip, country: country }
      );
    }

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
