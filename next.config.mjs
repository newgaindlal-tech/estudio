/** @type {import('next').NextConfig} */
const nextConfig = {
  // Direct package optimization for modern Next.js
  optimizePackageImports: ['lucide-react', '@supabase/ssr'],
  
  // Experimental fallback for older Next.js releases
  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/ssr'],
  },

  // Enable gzip/brotli compression for assets
  compress: true,

  // Remove console.log in production build to reduce JS size
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
