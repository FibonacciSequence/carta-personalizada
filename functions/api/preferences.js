export async function onRequestGet(context) {
  const userId = context.request.headers.get("x-user-id");
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const db = context.env.DB;
  const result = await db.prepare(
    "SELECT prefs_text FROM preferences WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1"
  ).bind(userId).first();

  return new Response(JSON.stringify({ prefs: result?.prefs_text || "" }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function onRequestPost(context) {
  const userId = context.request.headers.get("x-user-id");
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const { prefs } = await context.request.json();
  const db = context.env.DB;

  await db.prepare(
    "INSERT INTO preferences (user_id, prefs_text) VALUES (?, ?) ON CONFLICT DO UPDATE SET prefs_text = ?, updated_at = CURRENT_TIMESTAMP"
  ).bind(userId, prefs, prefs).run();

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
