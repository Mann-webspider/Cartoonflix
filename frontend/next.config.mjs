import { withNextVideo } from "next-video/process";
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    BACKEND_URL: "http://localhost:5000",
  },
  images: {
    domains: ["d1nb9xnp3todvf.cloudfront.net"],
  },
};

export default withNextVideo(nextConfig);