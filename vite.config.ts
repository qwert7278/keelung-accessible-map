import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { loadEnv, type Plugin } from 'vite'
import { resolve } from 'node:path'
import { GET as locationResponse } from './api/location.ts'

function appRouteAliases(): Plugin {
  const seoRoutes: Record<string, string> = {
    '/how-to': '/seo-pages/how-to.html',
    '/about': '/seo-pages/about.html',
    '/privacy': '/seo-pages/privacy.html',
    '/terms': '/seo-pages/terms.html',
  }
  return {
    name: 'road-recall-app-route-aliases',
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        if (!request.url) return next()
        const [pathname, query] = request.url.split('?')
        if (pathname === '/api/location') {
          const headers = new Headers();
          if (request.headers.cookie) headers.set('cookie', request.headers.cookie);
          // Explicit local QA fixture only; absent in the production function.
          if (process.env.ROADTAG_QA_GEO_REGION) {
            headers.set('x-vercel-ip-country', 'TW');
            headers.set('x-vercel-ip-country-region', process.env.ROADTAG_QA_GEO_REGION);
          }
          const response = locationResponse(new Request('http://localhost/api/location', { headers }));
          _response.statusCode = response.status;
          response.headers.forEach((value, key) => _response.setHeader(key, value));
          void response.text().then(body => _response.end(body));
          return;
        }
        const target = pathname === '/map' || pathname === '/admin'
          ? '/map.html'
          : seoRoutes[pathname]
        if (target) request.url = `${target}${query ? `?${query}` : ''}`
        next()
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }
  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith('VITE_') || !value) continue
    let role = ''
    if (value.startsWith('eyJ')) {
      try { role = JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString()).role } catch { /* Not a JWT. */ }
    }
    if (value.startsWith('sb_secret_') || role === 'service_role') throw new Error(`Server-only credential forbidden in ${name}`)
  }
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY
  if (key && !key.startsWith('sb_publishable_')) throw new Error('VITE_SUPABASE_PUBLISHABLE_KEY must be a publishable key')
  return {
    plugins: [react(), appRouteAliases()],
    // The public release always uses the real repository, even if a stale QA flag exists.
    define: process.env.VERCEL_ENV === 'production' ? { 'import.meta.env.VITE_DEMO_MODE': JSON.stringify('false') } : {},
    build: {
      manifest: true,
      rollupOptions: {
        input: {
          consent: resolve(process.cwd(), 'src/consent-entry.tsx'),
          homepage: resolve(process.cwd(), 'index.html'),
          map: resolve(process.cwd(), 'map.html'),
        },
      },
    },
    test: { include: ['src/**/*.test.ts'], environment: 'node' },
  }
})
