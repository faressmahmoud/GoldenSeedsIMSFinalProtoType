import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** GitHub project Pages URL is https://<user>.github.io/<repo>/ — set BASE_PATH=/repo/ when building. */
function resolveBase(): string {
  const raw = process.env.BASE_PATH?.trim()
  if (!raw || raw === '/') return '/'
  let p = raw.startsWith('/') ? raw : `/${raw}`
  if (!p.endsWith('/')) p = `${p}/`
  return p
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: resolveBase(),
})
