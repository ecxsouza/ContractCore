/** @type {import('next').NextConfig} */

// Detectar versão do Next.js em runtime para compatibilidade local (v16) + Vercel (v14)
let nextMajorVersion = 14;
try {
  const { version } = require('next/package.json');
  nextMajorVersion = parseInt(version.split('.')[0], 10);
} catch (_) {}

const isNext16Plus = nextMajorVersion >= 16;

const nextConfig = {
  // Next.js 16+: serverExternalPackages na raiz
  // Next.js 14:  experimental.serverComponentsExternalPackages
  ...(isNext16Plus
    ? { serverExternalPackages: ['@react-pdf/renderer'] }
    : { experimental: { serverComponentsExternalPackages: ['@react-pdf/renderer'] } }
  ),

  // Next.js 16 / Turbopack: silenciar aviso de webpack sem config turbopack
  ...(isNext16Plus ? { turbopack: {} } : {}),

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },

  // webpack só é aplicado quando NÃO está usando Turbopack (Next.js 14 / Vercel)
  // No Next.js 16 com Turbopack ativo, este bloco é ignorado
  ...(!isNext16Plus ? {
    webpack: (config, { isServer }) => {
      if (isServer) {
        const externals = Array.isArray(config.externals) ? config.externals : [];
        config.externals = [...externals, 'canvas', 'jsdom'];
      }
      return config;
    },
  } : {}),
};

module.exports = nextConfig;
