import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { loadEnv, type Plugin } from 'vite'
import { resolve } from 'node:path'

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
    build: {
      rollupOptions: {
        input: {
          homepage: resolve(process.cwd(), 'index.html'),
          map: resolve(process.cwd(), 'map.html'),
        },
      },
    },
    test: { include: ['src/**/*.test.ts'], environment: 'node' },
  }
})
