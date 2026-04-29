export async function onRequestGet(context) {
  const apiKey = context.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key not configured" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(context.request.url);
  const query = url.searchParams.get("query") || "restaurantes Lima Peru";
  const filter = url.searchParams.get("filter") || "todos";

  const TYPE_MAP = {
    "sushi": ["japanese_restaurant", "sushi_restaurant"],
    "chifa": ["chinese_restaurant"],
    "mariscos": ["seafood_restaurant"],
    "polleria": ["chicken_restaurant"],
    "vegano": ["vegetarian_restaurant", "vegan_restaurant"],
  };

  const body = {
    textQuery: query,
    languageCode: "es",
    maxResultCount: 20,
    locationBias: {
      circle: {
        center: { latitude: -12.0464, longitude: -77.0428 },
        radius: 15000.0,
      },
    },
  };

  if (TYPE_MAP[filter]) {
    body.includedType = TYPE_MAP[filter][0];
  }

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.priceLevel,places.types,places.photos,places.websiteUri,places.location",
      },
      body: JSON.stringify(body),
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
