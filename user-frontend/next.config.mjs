import { withNextVideo } from "next-video/process";
/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    env:{
      BUILD:"prod",
      NEXT_PUBLIC_SITE_URL:"http://localhost:3000",
      MONGO_URI:"mongodb+srv://maandalsania11:O2LqlEWoRofbYowQ@cartoonflix.4xurqhb.mongodb.net/streaming-platform?retryWrites=true&w=majority&appName=cartoonflix"
    },
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'd1nb9xnp3todvf.cloudfront.net',
          pathname: '/**',
        }
      ],
    },
    headers: () => [
        {
          source: '/:path*',
          headers: [
            {
              key: 'Cache-Control',
              value: 'store',
            },
          ],
        },
      ],
  };


export default withNextVideo(nextConfig);