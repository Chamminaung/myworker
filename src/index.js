/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const key = url.pathname.replace(/^\/+/, "");

    // OPTIONS (CORS preflight)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": "Range, Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    if (!key.endsWith(".m3u8") && !key.endsWith(".ts")) {
      return new Response("Forbidden", { status: 403 });
    }

    const range = request.headers.get("Range");

    const object = await env.VIDEO_BUCKET.get(key, {
      range: range ? { header: range } : undefined,
    });

    if (!object) return new Response("Not Found", { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);

    headers.set("Access-Control-Allow-Origin", "*");
    headers.set("Accept-Ranges", "bytes");

    if (range) {
      headers.set(
        "Content-Range",
        `bytes ${object.range.offset}-${object.range.end}/${object.size}`
      );
    }

    if (key.endsWith(".ts")) {
      headers.set("Content-Type", "video/mp2t");
      headers.set("Cache-Control", "public, max-age=31536000");
    } else {
      headers.set("Content-Type", "application/x-mpegURL");
      headers.set("Cache-Control", "no-cache");
    }

    return new Response(object.body, {
      status: range ? 206 : 200,
      headers,
    });
  },
};



// export default {
//   async fetch(request, env) {
//     if (request.method === "OPTIONS") {
//       return new Response(null, {
//         headers: {
//           "Access-Control-Allow-Origin": "*",
//           "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
//           "Access-Control-Allow-Headers": "Range",
//           "Access-Control-Max-Age": "86400",
//         },
//       });
//     }

//     const url = new URL(request.url);
//     const key = url.pathname.slice(1);

//     const range = request.headers.get("Range");

//     const object = await env.VIDEO_BUCKET.get(key, {
//       range: range ? { offset: Number(range.split("=")[1].split("-")[0]) } : undefined
//     });

//     if (!object) {
//       return new Response("Not found", { status: 404 });
//     }

//     const headers = new Headers();
//     object.writeHttpMetadata(headers);
//     headers.set("Accept-Ranges", "bytes");
//     headers.set("Access-Control-Allow-Origin", "*");
//     headers.set(
//       "Access-Control-Expose-Headers",
//       "Content-Length, Content-Range, Accept-Ranges"
//     );

//     return new Response(object.body, {
//       status: range ? 206 : 200,
//       headers,
//     });
//   },
// };


// export default {
//   async fetch(request, env, ctx) {
//     const url = new URL(request.url);

//     // Build R2 key from path
//     // example: /001-downloading-python-exe/index.m3u8
//     const key = url.pathname.startsWith("/")
//       ? url.pathname.slice(1)
//       : url.pathname;

//     // 🔐 Security: allow only HLS files
//     if (!key.endsWith(".m3u8") && !key.endsWith(".ts")) {
//       return new Response("Forbidden", { status: 403 });
//     }

//     const rangeHeader = request.headers.get("Range");

//     // 📦 Fetch from R2 (Range-aware)
//     const object = await env.VIDEO_BUCKET.get(
//       key,
//       rangeHeader ? { range: parseRange(rangeHeader) } : {}
//     );

//     if (!object) {
//       return new Response("Not Found", { status: 404 });
//     }

//     const headers = new Headers();
//     object.writeHttpMetadata(headers);

//     // 🌐 Required headers for video
//     headers.set("Access-Control-Allow-Origin", "*");
//     headers.set("Accept-Ranges", "bytes");

//     // 🎥 Content type
//     if (key.endsWith(".m3u8")) {
//       headers.set(
//         "Content-Type",
//         "application/vnd.apple.mpegurl"
//       );
//       // Playlist → short cache
//       headers.set("Cache-Control", "public, max-age=30");
//     } else {
//       // .ts segment → long cache
//       headers.set(
//         "Cache-Control",
//         "public, max-age=31536000, immutable"
//       );
//     }

//     // 📐 Partial content support (CRITICAL for Android)
//     let status = 200;

//     if (rangeHeader && object.range) {
//       status = 206;
//       headers.set(
//         "Content-Range",
//         `bytes ${object.range.offset}-${object.range.end}/${object.size}`
//       );
//     }

//     return new Response(object.body, {
//       status,
//       headers,
//     });
//   },
// };

// // 🔧 Range header parser
// function parseRange(rangeHeader) {
//   const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
//   if (!match) return null;

//   const start = Number(match[1]);
//   const end = match[2] ? Number(match[2]) : undefined;

//   return {
//     offset: start,
//     length: end !== undefined ? end - start + 1 : undefined,
//   };
// }

// နောက်ဆုံ အဆင်ပြေ

// export default {
//   async fetch(request, env, ctx) {
//     const url = new URL(request.url);
//     const key = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;

//     // 1. Handle CORS Preflight (Android/Web အတွက် အရေးကြီးဆုံးအပိုင်း)
//     if (request.method === "OPTIONS") {
//       return new Response(null, {
//         headers: {
//           "Access-Control-Allow-Origin": "*",
//           "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
//           "Access-Control-Allow-Headers": "Range",
//           "Access-Control-Allow-Headers": "*",
//           "Access-Control-Max-Age": "86400",
//         },
//       });
//     }

//     // Basic security: only allow HLS files
//     if (!key.endsWith(".m3u8") && !key.endsWith(".ts")) {
//       return new Response("Forbidden", { status: 403 });
//     }

//     const cache = caches.default;
//     const cacheKey = new Request(url.toString(), { method: "GET" });

//     // 2. Try Edge cache first
//     let response = await cache.match(cacheKey);
//     if (response) {
//       // Cache က လာရင်တောင် CORS header ပါအောင် ပြန်ထည့်ပေးရမယ်
//       let newHeaders = new Headers(response.headers);
//       newHeaders.set("Access-Control-Allow-Origin", "*");
//       return new Response(response.body, { headers: newHeaders });
//     }

//     // 3. Fetch from R2
//     const object = await env.VIDEO_BUCKET.get(key);
//     if (!object) {
//       return new Response("Not Found", { status: 404 });
//     }

//     const headers = new Headers();
//     object.writeHttpMetadata(headers);

//     // 4. Headers Optimization for Android & Browsers
//     headers.set("Access-Control-Allow-Origin", "*");
//     headers.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
//     headers.set("Accept-Ranges", "bytes");

//     if (key.endsWith(".ts")) {
//       headers.set("Content-Type", "video/mp2t"); // Android က ဒါကို ပိုကြိုက်တယ်
//       headers.set("Cache-Control", "public, max-age=31536000, immutable");
//     } else if (key.endsWith(".m3u8")) {
//       headers.set("Content-Type", "application/vnd.apple.mpegurl");
//       headers.set("Cache-Control", "public, max-age=30");
//     }

//     response = new Response(object.body, {
//       status: 200,
//       headers,
//     });

//     // 5. Save to Edge cache
//     ctx.waitUntil(cache.put(cacheKey, response.clone()));

//     return response;
//   },
// };


// export default {
// 	async fetch(request, env, ctx, params) {
// 		const url = new URL(request.url);

//   // Build R2 key from path
//   // example: 001-downloading-python-exe/index.m3u8
//   //const key = params.path.join("/");
//   const key = url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname;

//   // Basic security: only allow HLS files
//   if (!key.endsWith(".m3u8") && !key.endsWith(".ts")) {
//     return new Response("Forbidden", { status: 403 });
//   }

//   const cache = caches.default;

//   // IMPORTANT: cache key must NOT include auth / random headers
//   const cacheKey = new Request(url.toString(), {
//     method: "GET",
//   });

//   // 1️⃣ Try Edge cache first
//   let response = await cache.match(cacheKey);
//   if (response) {
//     return response;
//   }

//   // 2️⃣ Fetch from R2
//   const object = await env.VIDEO_BUCKET.get(key);
//   if (!object) {
//     return new Response("Not Found", { status: 404 });
//   }

//   const headers = new Headers();
//   object.writeHttpMetadata(headers);

//   // Always needed for video
//   headers.set("Access-Control-Allow-Origin", "*");
//   headers.set("Accept-Ranges", "bytes");

//   // 3️⃣ Cache strategy
//   if (key.endsWith(".ts")) {
//     // HLS segments: immutable, cache forever
//     headers.set(
//       "Cache-Control",
//       "public, max-age=31536000, immutable"
//     );
//   } else if (key.endsWith(".m3u8")) {
//     // Playlist: short cache
//     headers.set(
//       "Cache-Control",
//       "public, max-age=30"
//     );
//     headers.set(
//       "Content-Type",
//       "application/vnd.apple.mpegurl"
//     );
//   }

//   response = new Response(object.body, {
//     status: 200,
//     headers,
//   });

//   // 4️⃣ Save to Edge cache
//   await cache.put(cacheKey, response.clone());

//   return response;
// 	},
// };

// export async function onRequest({ request, env, params }) {
//   const url = new URL(request.url);

//   // Build R2 key from path
//   // example: 001-downloading-python-exe/index.m3u8
//   const key = params.path.join("/");

//   // Basic security: only allow HLS files
//   if (!key.endsWith(".m3u8") && !key.endsWith(".ts")) {
//     return new Response("Forbidden", { status: 403 });
//   }

//   const cache = caches.default;

//   // IMPORTANT: cache key must NOT include auth / random headers
//   const cacheKey = new Request(url.toString(), {
//     method: "GET",
//   });

//   // 1️⃣ Try Edge cache first
//   let response = await cache.match(cacheKey);
//   if (response) {
//     return response;
//   }

//   // 2️⃣ Fetch from R2
//   const object = await env.VIDEO_BUCKET.get(key);
//   if (!object) {
//     return new Response("Not Found", { status: 404 });
//   }

//   const headers = new Headers();
//   object.writeHttpMetadata(headers);

//   // Always needed for video
//   headers.set("Access-Control-Allow-Origin", "*");
//   headers.set("Accept-Ranges", "bytes");

//   // 3️⃣ Cache strategy
//   if (key.endsWith(".ts")) {
//     // HLS segments: immutable, cache forever
//     headers.set(
//       "Cache-Control",
//       "public, max-age=31536000, immutable"
//     );
//   } else if (key.endsWith(".m3u8")) {
//     // Playlist: short cache
//     headers.set(
//       "Cache-Control",
//       "public, max-age=30"
//     );
//     headers.set(
//       "Content-Type",
//       "application/vnd.apple.mpegurl"
//     );
//   }

//   response = new Response(object.body, {
//     status: 200,
//     headers,
//   });

//   // 4️⃣ Save to Edge cache
//   await cache.put(cacheKey, response.clone());

//   return response;
// }


// export default {
// 	async fetch(request, env, ctx) {
// 		return new Response('Hello workers workers!');
// 	},
// };
