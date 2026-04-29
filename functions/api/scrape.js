export async function onRequestPost(context) {
  const apiKey = context.env.BROWSERLESS_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: "not configured" }), { status: 500 });

  const { url, name } = await context.request.json();
  if (!url && !name) return new Response(JSON.stringify({ error: "url or name required" }), { status: 400 });

  const MENU_KEYWORDS = ["carta", "menu", "menú", "food", "platos", "dishes", "comida", "almuerzo", "cena", "desayuno", "bebidas", "drinks"];

  async function scrapeText(targetUrl) {
    const res = await fetch(`https://production-sfo.browserless.io/content?token=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: targetUrl,
        waitFor: 2000,
        rejectResourceTypes: ["image", "font", "stylesheet"],
      }),
    });
    if (!res.ok) throw new Error(`Browserless error: ${res.status}`);
    return await res.text();
  }

  function htmlToText(html) {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 15000);
  }

  function findMenuLinks(html, baseUrl) {
    const links = [];
    const base = new URL(baseUrl);
    const hrefRegex = /href=["']([^"']+)["']/gi;
    let match;
    while ((match = hrefRegex.exec(html)) !== null) {
      const href = match[1];
      try {
        const full = href.startsWith("http") ? href : new URL(href, base).href;
        const lower = full.toLowerCase();
        if (MENU_KEYWORDS.some(k => lower.includes(k)) && full.includes(base.hostname)) {
          links.push(full);
        }
      } catch {}
    }
    return [...new Set(links)].slice(0, 3);
  }

  // Try original URL first
  if (url) {
    try {
      const html = await scrapeText(url);
      const text = htmlToText(html);

      // If content looks like a menu (has food-related words), return it
      const lowerText = text.toLowerCase();
      const menuWordCount = MENU_KEYWORDS.filter(k => lowerText.includes(k)).length;

      if (menuWordCount >= 2 && text.length > 500) {
        return new Response(JSON.stringify({ text, source: "original", url }), {
          headers: { "Content-Type": "application/json" },
        });
      }

      // Try to find menu subpage
      const menuLinks = findMenuLinks(html, url);
      for (const menuUrl of menuLinks) {
        try {
          const menuHtml = await scrapeText(menuUrl);
          const menuText = htmlToText(menuHtml);
          if (menuText.length > 300) {
            return new Response(JSON.stringify({ text: menuText, source: "menu_page", url: menuUrl }), {
              headers: { "Content-Type": "application/json" },
            });
          }
        } catch {}
      }
    } catch (e) {
      console.error(`Failed to scrape ${url}:`, e.message);
    }
  }

  // Try Cluvi search by name
  if (name) {
    try {
      const searchUrl = `https://popular.cluvi.pe/popular/search?q=${encodeURIComponent(name)}`;
      const searchHtml = await scrapeText(searchUrl);
      const match = searchHtml.match(/maincategory_id=(\d+)/);
      if (match) {
        const menuUrl = `https://popular.cluvi.pe/popular/subcategories?maincategory_id=${match[1]}`;
        const menuHtml = await scrapeText(menuUrl);
        const menuText = htmlToText(menuHtml);
        if (menuText.length > 200) {
          return new Response(JSON.stringify({ text: menuText, source: "cluvi", url: menuUrl }), {
            headers: { "Content-Type": "application/json" },
          });
        }
      }
    } catch (e) {
      console.error("Cluvi search failed:", e.message);
    }
  }

  return new Response(JSON.stringify({ error: "No menu found", text: null }), {
    status: 404, headers: { "Content-Type": "application/json" },
  });
}
