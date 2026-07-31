/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // API base URL is provided per-environment via NEXT_PUBLIC_API_URL
  // (and optionally NEXT_PUBLIC_ADMIN_API_URL). When unset, the UI falls back
  // to bundled demo data so it renders locally without any backend.
};

export default nextConfig;
