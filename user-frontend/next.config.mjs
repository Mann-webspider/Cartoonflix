/** @type {import('next').NextConfig} */

/**
 * Headers applied to every response.
 *
 * This is a public site serving artwork from CloudFront and video from a
 * personal CDN, so the defaults worth setting are the cheap ones: stop content
 * sniffing, stop the site being framed, and keep referrers off third parties.
 */
const securityHeaders = [
  // Browsers must honour the declared Content-Type. Without this, an image
  // route that returns text can be coaxed into executing.
  { key: "X-Content-Type-Options", value: "nosniff" },

  // Clickjacking: nothing here is meant to be embedded in another site.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },

  // Send the origin to other sites, never the full path — a title id in a
  // Referer header leaks what someone was watching.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },

  // Deny the capabilities this app never uses. Fullscreen and
  // picture-in-picture are deliberately absent from this list: the player needs
  // both, and denying them here would silently break its controls.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig = {
  reactStrictMode: true,

  // The API base is provided per environment via NEXT_PUBLIC_API_URL. With it
  // unset the UI falls back to a bundled sample catalogue, so the site still
  // renders — that fallback is for local work, never for a failed request.

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
