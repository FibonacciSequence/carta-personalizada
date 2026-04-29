export async function onRequestPost(context) {
  const apiKey = context.env.BROWSERLESS_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: "not configured" }), { status: 500 });

  const { url, name, placeId } = await context.request.json();
  if (!url && !name) return new Response(JSON.stringify({ error: "url or name required" }), { status: 400 });
  const googleApiKey = context.env.GOOGLE_PLACES_API_KEY;

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

  // Try Rappi Peru search by name
  if (name) {
    try {
      const rappiSearch = `https://www.rappi.com.pe/restaurantes?searchterm=${encodeURIComponent(name)}`;
      const rappiHtml = await scrapeText(rappiSearch);
      // Find restaurant slug from search results
      const slugMatch = rappiHtml.match(/href="\/restaurantes\/([^"?]+)"/);
      if (slugMatch) {
        const rappiUrl = `https://www.rappi.com.pe/restaurantes/${slugMatch[1]}`;
        const menuHtml = await scrapeText(rappiUrl);
        const menuText = htmlToText(menuHtml);
        if (menuText.length > 300) {
          return new Response(JSON.stringify({ text: menuText, source: "rappi", url: rappiUrl }), {
            headers: { "Content-Type": "application/json" },
          });
        }
      }
    } catch (e) {
      console.error("Rappi search failed:", e.message);
    }
  }

  // Last resort: use Place Details API to find any menu/order links Google has for this place
  if (placeId && googleApiKey) {
    try {
      const detailsRes = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        headers: {
          "X-Goog-Api-Key": googleApiKey,
          "X-Goog-FieldMask": "websiteUri,reservationLinks",
        },
      });
      const details = await detailsRes.json();

      // Try websiteUri from Place Details (may differ from what we already tried)
      if (details.websiteUri && details.websiteUri !== url) {
        try {
          const html = await scrapeText(details.websiteUri);
          const text = htmlToText(html);
          const lowerText = text.toLowerCase();
          const menuWordCount = MENU_KEYWORDS.filter(k => lowerText.includes(k)).length;
          if (menuWordCount >= 1 && text.length > 300) {
            return new Response(JSON.stringify({ text, source: "place_details_website", url: details.websiteUri }), {
              headers: { "Content-Type": "application/json" },
            });
          }
        } catch {}
      }

      // Try any reservation/order links (some point to menu platforms)
      for (const link of (details.reservationLinks || [])) {
        if (!link.uri) continue;
        try {
          const html = await scrapeText(link.uri);
          const text = htmlToText(html);
          if (text.length > 300) {
            return new Response(JSON.stringify({ text, source: "place_details_link", url: link.uri }), {
              headers: { "Content-Type": "application/json" },
            });
          }
        } catch {}
      }
    } catch (e) {
      console.error("Place Details fallback failed:", e.message);
    }
  }

  return new Response(JSON.stringify({ error: "No menu found", text: null }), {
    status: 404, headers: { "Content-Type": "application/json" },
  });
}
