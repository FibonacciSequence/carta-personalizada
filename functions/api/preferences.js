export async function onRequestGet(context) {
  const userId = context.request.headers.get("x-user-id");
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  try {
    const db = context.env.DB;
    const result = await db.prepare(
      "SELECT prefs_text FROM preferences WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1"
    ).bind(userId).first();

    return new Response(JSON.stringify({ prefs: result?.prefs_text || "" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function onRequestPost(context) {
  const userId = context.request.headers.get("x-user-id");
  const userEmail = context.request.headers.get("x-user-email") || "";
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  try {
    const { prefs } = await context.request.json();
    const db = context.env.DB;

    // Upsert user
    await db.prepare(
      "INSERT OR IGNORE INTO users (id, email) VALUES (?, ?)"
    ).bind(userId, userEmail).run();

    // Upsert preferences
    const existing = await db.prepare(
      "SELECT id FROM preferences WHERE user_id = ?"
    ).bind(userId).first();

    if (existing) {
      await db.prepare(
        "UPDATE preferences SET prefs_text = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?"
      ).bind(prefs, userId).run();
    } else {
      await db.prepare(
        "INSERT INTO preferences (user_id, prefs_text) VALUES (?, ?)"
      ).bind(userId, prefs).run();
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
