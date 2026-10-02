import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/');

          if (
            normalized.includes('/src/lib/data/factualSummaryCatalog') ||
            normalized.includes('/src/lib/data/referenceCatalog')
          ) {
            return 'catalogs-reference';
          }

          // Componentes de proposicoes e votacoes legislativas
          if (
            normalized.includes('/src/lib/components/votes/') ||
            normalized.includes('/src/lib/components/proposals/')
          ) {
            return 'panel-proposals-votes';
          }

          if (normalized.includes('/src/lib/components/parliamentarians/')) {
            return 'panel-parliamentarians';
          }

          if (normalized.includes('/src/lib/components/about/')) {
            return 'panel-about';
          }
        }
      }
    }
  },
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}', 'workers/**/*.{test,spec}.{js,ts}'],
    passWithNoTests: true
  }
});
