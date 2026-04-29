export async function onRequestGet(context) {
  const apiKey = context.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: "not configured" }), { status: 500 });

  const url = new URL(context.request.url);
  const placeId = url.searchParams.get("placeId");
  if (!placeId) return new Response(JSON.stringify({ error: "placeId required" }), { status: 400 });

  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        // Request all URL-related fields to discover what's available
        "X-Goog-FieldMask": "id,displayName,websiteUri,googleMapsUri,reservationLinks,nationalPhoneNumber,currentOpeningHours,editorialSummary",
      },
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
