export async function onRequestGet(context) {
  const apiKey = context.env.GOOGLE_PLACES_API_KEY;
  const url = new URL(context.request.url);
  const name = url.searchParams.get("name");

  if (!name || !apiKey) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const photoUrl = `https://places.googleapis.com/v1/${name}/media?maxHeightPx=400&maxWidthPx=600&key=${apiKey}&skipHttpRedirect=true`;
    const res = await fetch(photoUrl);
    const data = await res.json();

    if (data.photoUri) {
      const imgRes = await fetch(data.photoUri);
      const img = await imgRes.arrayBuffer();
      return new Response(img, {
        headers: { "Content-Type": imgRes.headers.get("Content-Type") || "image/jpeg", "Cache-Control": "public, max-age=86400" },
      });
    }
    return new Response("Not found", { status: 404 });
  } catch {
    return new Response("Error", { status: 500 });
  }
}
