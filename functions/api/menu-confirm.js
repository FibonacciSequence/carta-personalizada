export async function onRequestPost(context) {
  const { placeId, restaurantName } = await context.request.json();
  if (!placeId) return new Response(JSON.stringify({ error: "placeId required" }), { status: 400 });

  const db = context.env.DB;
  if (!db) return new Response(JSON.stringify({ ok: false }), { status: 500 });

  await db.prepare("CREATE TABLE IF NOT EXISTS confirmed_menus (place_id TEXT PRIMARY KEY, restaurant_name TEXT, confirmed_at TEXT DEFAULT (datetime('now')))").run();

  await db.prepare("INSERT OR REPLACE INTO confirmed_menus (place_id, restaurant_name) VALUES (?, ?)")
    .bind(placeId, restaurantName || "").run();

  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
}
