import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    // Bump the warning threshold a touch — our biggest non-vendor
    // chunk is ~600 kB and that's already split as much as it can
    // reasonably be without churning every route into a lazy import.
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Manual chunk strategy: pull the heaviest third-party
        // dependencies into their own files so they cache across
        // deploys and don't get duplicated into every lazy page chunk.
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined
          // Group only the heavy, shared deps. Everything else stays
          // un-named so Rollup can tree-shake it into the page chunks
          // that actually import it (notably lucide-react: ~thousands
          // of icons, only a handful per page).
          if (id.includes('@supabase')) return 'vendor-supabase'
          if (id.includes('@tanstack')) return 'vendor-query'
          if (id.includes('motion') || id.includes('framer-motion')) return 'vendor-motion'
          if (id.includes('date-fns')) return 'vendor-date-fns'
          // mjml-browser is huge (~700 kB) — force it into its own
          // chunk so the await-import inside WelcomeComposer doesn't
          // get inlined into the OnboardingRequestsPage chunk.
          if (id.includes('mjml-browser')) return 'vendor-mjml'
          if (id.includes('react-dom') || id.includes('react-router')) return 'vendor-react'
          return undefined
        },
      },
    },
  },
})
