/*
 * @Author: xudada 1820064201@qq.com
 * @Date: 2025-07-24 11:16:00
 * @LastEditors: xudada 1820064201@qq.com
 * @LastEditTime: 2025-07-24 12:42:25
 * @FilePath: /mcp-peta/mcp-desktop-app/frontend/next.config.mjs
 * Next.js configuration for Electron packaging
 */
/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development'

const nextConfig = {
  // Electron static export config - production only
  output: isDev ? undefined : 'export',

  // Image config - disable optimization for Electron
  images: {
    unoptimized: true, // Required for Electron
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;"
  },

  // Fix packaged path issues - production only
  assetPrefix: isDev ? undefined : './',

  // Experimental/performance options
  experimental: {
    optimizeCss: false, // Keep disabled for Electron
    optimizePackageImports: ['@radix-ui/react-*', 'lucide-react']
  },

  // TypeScript config - temporarily ignore build errors
  typescript: {
    ignoreBuildErrors: true
  },

  // ESLint config
  eslint: {
    ignoreDuringBuilds: false
  },

  // Enable compression
  compress: true,

  // Enable strict mode
  reactStrictMode: true,

  // Remove Next.js identifier
  poweredByHeader: false,

  // Webpack configuration tweaks
  webpack: (config, { dev, isServer }) => {
    // Fallback configuration for Electron environment
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false
      }
    }

    // Production optimizations
    if (!dev) {
      // Drop console.log (keep error and warn)
      config.optimization.minimize = true
      config.optimization.minimizer = config.optimization.minimizer || []

      // Chunking strategy
      if (!isServer) {
        config.optimization.splitChunks = {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 10
            },
            common: {
              minChunks: 2,
              priority: -10,
              reuseExistingChunk: true
            }
          }
        }
      }
    }

    return config
  }
}

export default nextConfig
