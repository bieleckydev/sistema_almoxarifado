const isDev = process.env.NODE_ENV === 'development';

/**
 * Domínios que o navegador precisa acessar:
 * - Firebase Auth (identitytoolkit/securetoken) e Firestore (fallback de leitura) em *.googleapis.com
 * - Página de autenticação do projeto em *.firebaseapp.com (iframe usado pelo SDK de Auth)
 * - Emuladores locais apenas em desenvolvimento
 */
const connectSrc = [
  "'self'",
  'https://*.googleapis.com',
  'https://*.firebaseio.com',
  'wss://*.firebaseio.com',
  ...(isDev ? ['http://localhost:*', 'http://127.0.0.1:*', 'ws://localhost:*'] : []),
];

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js injeta scripts inline de hidratação; sem nonce, 'unsafe-inline' é necessário.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  `connect-src ${connectSrc.join(' ')}`,
  'frame-src https://*.firebaseapp.com',
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['firebase-admin'],
  async headers() {
    return [
      { source: '/(.*)', headers: securityHeaders },
      // Respostas da API contêm dados de estoque e usuários: nunca guardar em cache compartilhado.
      { source: '/api/(.*)', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
    ];
  },
};

export default nextConfig;
