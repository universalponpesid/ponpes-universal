/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  webpack: (config) => {
    config.watchOptions = {
      ignored: ["**/System Volume Information/**"],
    };
    return config;
  },

  images: {
    remotePatterns: [
      // ✅ Cloudinary
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },

      // ✅ YouTube thumbnail
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },

       {
        protocol: "https",
        hostname: "i.ytimg.com",
      },

      // ✅ Imgur
      {
        protocol: "https",
        hostname: "i.imgur.com",
      },

      // ✅ Google user content
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },

      // ✅ Google Drive
      {
        protocol: "https",
        hostname: "drive.google.com",
      },
    ],

    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
  },
};

export default nextConfig;
