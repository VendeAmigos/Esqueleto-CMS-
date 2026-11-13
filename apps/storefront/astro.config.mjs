import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_STOREFRONT_URL || 'https://lunnadecoco.com',
  integrations: [tailwind()],
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  vite: {
    server: {
      watch: {
        ignored: ['**/uploads/**', '**/.next/**']
      }
    },
    build: {
      commonjsOptions: {
        ignoreDynamicRequires: true
      }
    }
  }
});
