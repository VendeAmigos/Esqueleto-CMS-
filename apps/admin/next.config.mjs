/** @type {import('next').NextConfig} */
const nextConfig = {
  // En Docker/Linux standalone genera los symlinks sin restricciones.
  // En entornos locales de Windows se desactiva para evitar el error EPERM de symlinks.
  output: process.env.DOCKER_BUILD === '1' ? 'standalone' : undefined,
  transpilePackages: ['@esqueleto/core'],
  experimental: {
    serverComponentsExternalPackages: [
      'postgres', 
      'drizzle-orm'
    ],
  },
};

export default nextConfig;
