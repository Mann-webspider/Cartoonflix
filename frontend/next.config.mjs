/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Artwork comes from CloudFront (published posters) and TMDB (search
  // results). Both are rendered with plain <img> in this internal tool, so no
  // remote image loader configuration is needed.
};

export default nextConfig;
