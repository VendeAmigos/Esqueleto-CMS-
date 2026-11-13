import nextConstants from 'next/constants.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PHASE_DEV =
  nextConstants.PHASE_DEVELOPMENT_SERVER || 'phase-development-server';

/** @type {(phase: string) => import('next').NextConfig} */
export default function nextConfig(phase) {
  return {
    // Aislar la caché de desarrollo (.next-dev) de producción (.next)
    // evita que `next build` corrompa chunks cuando `next dev` está activo.
    distDir:
      process.env.NEXT_DIST_DIR ||
      (phase === PHASE_DEV ? '.next-dev' : '.next'),
    // En Docker/Linux standalone genera los symlinks sin restricciones.
    // En entornos locales de Windows se desactiva para evitar el error EPERM de symlinks.
    output: process.env.DOCKER_BUILD === '1' ? 'standalone' : undefined,
    transpilePackages: ['@esqueleto/core'],
    experimental: {
      serverComponentsExternalPackages: ['postgres', 'drizzle-orm'],
    },
    webpack(config) {
      config.module.rules.push({
        test: /input-switch-polyfill\.js$/,
        use: [path.resolve(__dirname, 'fix-switch-polyfill-loader.cjs')],
      });
      return config;
    },
  };
}
