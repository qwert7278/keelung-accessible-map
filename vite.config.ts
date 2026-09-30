import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
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
  return { plugins: [react()], test: { include: ['src/**/*.test.ts'], environment: 'node' } }
})
