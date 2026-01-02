/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**", // Mengizinkan semua path di bawah domain res.cloudinary.com
      },
    ],
  },
};

export default nextConfig;
