/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/ssr'],
  },
  compress: true,
};

export default nextConfig;
