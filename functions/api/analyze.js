const RATE_LIMIT = new Map();

export async function onRequestPost(context) {
  const ip = context.request.headers.get("cf-connecting-ip") || "unknown";
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const limit = 10;

  if (!RATE_LIMIT.has(ip)) RATE_LIMIT.set(ip, []);
  const timestamps = RATE_LIMIT.get(ip).filter(t => now - t < windowMs);
  if (timestamps.length >= limit) {
    return new Response(JSON.stringify({ error: `Rate limit: max ${limit} analyses per hour.` }), {
      status: 429, headers: { "Content-Type": "application/json" },
    });
  }
  timestamps.push(now);
  RATE_LIMIT.set(ip, timestamps);

  try {
    const body = await context.request.json();
    const { model, max_tokens, messages, restaurant_url, restaurant_name, restaurant_place_id } = body;

    let finalMessages = messages;

    // If URL or name provided and it's a text message (not file), try to scrape first
    if ((restaurant_url || restaurant_name) && messages?.length > 0) {
      const lastMsg = messages[messages.length - 1];
      const isTextOnly = Array.isArray(lastMsg?.content)
        ? lastMsg.content.every(c => c.type === "text")
        : typeof lastMsg?.content === "string";

      if (isTextOnly) {
        try {
          const scrapeController = new AbortController();
          const scrapeTimeout = setTimeout(() => scrapeController.abort(), 18000);
          const scrapeRes = await fetch(`${new URL(context.request.url).origin}/api/scrape`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: restaurant_url || "", name: restaurant_name || "", placeId: restaurant_place_id || "" }),
            signal: scrapeController.signal,
          });
          clearTimeout(scrapeTimeout);

          if (scrapeRes.ok) {
            const { text, source, url: scrapedUrl } = await scrapeRes.json();
            if (text && text.length > 200) {
              // Prepend scraped content to the prompt
              const prompt = typeof lastMsg.content === "string" ? lastMsg.content : lastMsg.content.find(c => c.type === "text")?.text || "";
              const newContent = `MENU CONTENT (scraped from ${source} - ${scrapedUrl}):\n\n${text}\n\n---\n\n${prompt}`;
              finalMessages = [
                ...messages.slice(0, -1),
                { ...lastMsg, content: newContent },
              ];
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
      body: JSON.stringify({ model, max_tokens, messages: finalMessages }),
    });

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
