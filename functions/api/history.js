export async function onRequestDelete(context) {
  const userId = context.request.headers.get("x-user-id");
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get("id");
    if (!id) return new Response(JSON.stringify({ error: "Missing id" }), { status: 400 });

    const db = context.env.DB;
    await db.prepare("DELETE FROM analyses WHERE id = ? AND user_id = ?").bind(id, userId).run();

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

export async function onRequestGet(context) {
  const userId = context.request.headers.get("x-user-id");
  if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  try {
    const db = context.env.DB;
    const { results } = await db.prepare(
      "SELECT * FROM analyses WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"
    ).bind(userId).all();

    return new Response(JSON.stringify(results), {
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
    const { source_name, source_type, restaurante, platos, error } = await context.request.json();
    const db = context.env.DB;

    // Upsert user
    await db.prepare(
      "INSERT OR IGNORE INTO users (id, email) VALUES (?, ?)"
    ).bind(userId, userEmail).run();

    await db.prepare(
      "INSERT INTO analyses (user_id, source_name, source_type, restaurante, platos_json, error) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(userId, source_name, source_type, restaurante, JSON.stringify(platos || []), error || null).run();

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
