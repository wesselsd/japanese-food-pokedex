import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
    coverage: {
      thresholds: {
        statements: 75,
        branches: 65,
        functions: 60,
        lines: 75
      }
    }
  },
  define: {
    'import.meta.env.NUXT_PUBLIC_SUPABASE_URL': JSON.stringify(env.NUXT_PUBLIC_SUPABASE_URL),
    'import.meta.env.NUXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(env.NUXT_PUBLIC_SUPABASE_ANON_KEY)
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./', import.meta.url))
    }
  }
  }
})
