import { API_BASE } from "@/lib/config";

/**
 * Analytics collector.
 *
 * The browser posts here rather than to the API directly, for three reasons
 * that all happen to point the same way.
 *
 * Vercel resolves the visitor's address to a country, region and city before
 * this function runs and hands it over in headers. Reading them costs nothing —
 * no geolocation database in the deployment, no third-party lookup delaying the
 * request, and the answer is the network's own, which beats a bundled table.
 *
 * It is same-origin, so a beacon fired from a closing page is not held up by a
 * CORS preflight it will never live long enough to complete.
 *
 * And it keeps the API's address out of the page, so the write endpoint is not
 * something a reader can find and post rubbish to all afternoon.
 */
export async function POST(request) {
  // Nothing reads the reply — the page that sent it is usually gone. Every
  // path answers 204 so a failure here can never surface to a viewer.
  const accepted = new Response(null, { status: 204 });

  if (!API_BASE) return accepted;

  let payload;
  try {
    payload = await request.json();
  } catch {
    return accepted;
  }

  // Separated here so the token is never stored as part of an event.
  const { token, ...events } = payload ?? {};
  const body = JSON.stringify(events);

  const headers = {
    "content-type": "application/json",
    // What Vercel worked out about where this came from.
    "x-geo-country": request.headers.get("x-vercel-ip-country") ?? "",
    "x-geo-region": request.headers.get("x-vercel-ip-country-region") ?? "",
    "x-geo-city": request.headers.get("x-vercel-ip-city") ?? "",
    // The API hashes this rather than storing it; forwarding it is what lets
    // one visitor be told apart from another without keeping either address.
    "x-forwarded-for": request.headers.get("x-forwarded-for") ?? "",
    "x-real-ip": request.headers.get("x-real-ip") ?? "",
  };

  // A signed-in visitor's events are attributed to their account, and the token
  // is the only thing that may say so.
  const authorization = token ? `Bearer ${token}` : request.headers.get("authorization");
  if (authorization) headers.authorization = authorization;

  try {
    await fetch(`${API_BASE}/events`, { method: "POST", headers, body });
  } catch {
    // The API being unreachable is not the viewer's problem.
  }

  return accepted;
}
