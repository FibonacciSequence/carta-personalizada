export async function onRequestGet(context) {
  const apiKey = context.env.GOOGLE_MAPS_API_KEY || context.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return new Response(JSON.stringify({ error: "not configured" }), { status: 500 });
  return new Response(JSON.stringify({ key: apiKey }), {
    headers: { "Content-Type": "application/json" },
  });
}
