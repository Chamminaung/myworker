/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export async function onRequest({ request, env, params }) {
  const url = new URL(request.url);

  // Build R2 key from path
  // example: 001-downloading-python-exe/index.m3u8
  const key = params.path.join("/");

  // Basic security: only allow HLS files
  if (!key.endsWith(".m3u8") && !key.endsWith(".ts")) {
    return new Response("Forbidden", { status: 403 });
  }

  const cache = caches.default;

  // IMPORTANT: cache key must NOT include auth / random headers
  const cacheKey = new Request(url.toString(), {
    method: "GET",
  });

  // 1️⃣ Try Edge cache first
  let response = await cache.match(cacheKey);
  if (response) {
    return response;
  }

  // 2️⃣ Fetch from R2
  const object = await env.VIDEO_BUCKET.get(key);
  if (!object) {
    return new Response("Not Found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);

  // Always needed for video
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Accept-Ranges", "bytes");

  // 3️⃣ Cache strategy
  if (key.endsWith(".ts")) {
    // HLS segments: immutable, cache forever
    headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable"
    );
  } else if (key.endsWith(".m3u8")) {
    // Playlist: short cache
    headers.set(
      "Cache-Control",
      "public, max-age=30"
    );
    headers.set(
      "Content-Type",
      "application/vnd.apple.mpegurl"
    );
  }

  response = new Response(object.body, {
    status: 200,
    headers,
  });

  // 4️⃣ Save to Edge cache
  await cache.put(cacheKey, response.clone());

  return response;
}


// export default {
// 	async fetch(request, env, ctx) {
// 		return new Response('Hello workers workers!');
// 	},
// };
