/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "shared.akamai.steamstatic.com" },
      { protocol: "https", hostname: "steamcdn-a.akamaihd.net" },
      { protocol: "https", hostname: "cdn.cloudflare.steamstatic.com" },
      { protocol: "https", hostname: "steamuserimages-a.akamaihd.net" },
      { protocol: "https", hostname: "thumbnail.image.rakuten.co.jp" },
      { protocol: "https", hostname: "image.rakuten.co.jp" },
    ],
  },
};

export default nextConfig;
