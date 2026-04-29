export async function onRequestPost(context) {
  const apiKey = context.env.BROWSERLESS_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: "not configured" }), { status: 500 });

  const { url, name } = await context.request.json();
  if (!url && !name) return new Response(JSON.stringify({ error: "url or name required" }), { status: 400 });

  // Try URLs in order: original → Cluvi → OpenTable
  const urlsToTry = [];
  if (url) urlsToTry.push({ url, source: "original" });
  if (name) {
    const encoded = encodeURIComponent(name);
    urlsToTry.push({ url: `https://www.opentable.com/s?term=${encoded}&covers=2&lang=es-PE`, source: "opentable" });
  }

  for (const { url: targetUrl, source } of urlsToTry) {
    try {
      const result = await scrapeWithBrowserless(targetUrl, apiKey);
      if (result && result.length > 200) {
        return new Response(JSON.stringify({ text: result, source, url: targetUrl }), {
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch (e) {
      console.error(`Failed to scrape ${targetUrl}:`, e.message);
    }
  }

  // Try Cluvi search as last resort
  if (name) {
    try {
      const cluvi = await searchCluvi(name, apiKey);
      if (cluvi) {
        return new Response(JSON.stringify({ text: cluvi.text, source: "cluvi", url: cluvi.url }), {
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch (e) {
      console.error("Cluvi search failed:", e.message);
    }
  }

  return new Response(JSON.stringify({ error: "No menu found", text: null }), {
    status: 404, headers: { "Content-Type": "application/json" },
  });
}

async function scrapeWithBrowserless(url, apiKey) {
  const res = await fetch(`https://production-sfo.browserless.io/content?token=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      waitFor: 2000,
      rejectResourceTypes: ["image", "font", "stylesheet"],
    }),
  });

  if (!res.ok) throw new Error(`Browserless error: ${res.status}`);
  const html = await res.text();

  // Extract text content - remove HTML tags and clean up
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 15000); // Limit to 15k chars

  return text;
}

async function searchCluvi(name, apiKey) {
  // Search Cluvi for the restaurant
  const searchUrl = `https://popular.cluvi.pe/popular/search?q=${encodeURIComponent(name)}`;
  const html = await scrapeWithBrowserless(searchUrl, apiKey);
  if (!html || html.length < 100) return null;

  // Try to find the restaurant's Cluvi page
  const match = html.match(/maincategory_id=(\d+)/);
  if (!match) return null;

  const menuUrl = `https://popular.cluvi.pe/popular/subcategories?maincategory_id=${match[1]}`;
  const menuText = await scrapeWithBrowserless(menuUrl, apiKey);
  if (!menuText || menuText.length < 200) return null;

  return { text: menuText, url: menuUrl };
}
