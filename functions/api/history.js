export async function onRequestGet(context) {
  const userId = context.request.headers.get("x-user-id");
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const db = context.env.DB;
  const { results } = await db.prepare(
    "SELECT * FROM analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"
  ).bind(userId).all();

  return new Response(JSON.stringify(results), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestPost(context) {
  const userId = context.request.headers.get("x-user-id");
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const { source_name, source_type, restaurante, platos, error } = await context.request.json();
  const db = context.env.DB;

  await db.prepare(
    "INSERT INTO analyses (user_id, source_name, source_type, restaurante, platos_json, error) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(userId, source_name, source_type, restaurante, JSON.stringify(platos || []), error || null).run();

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
