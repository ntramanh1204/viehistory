import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    }
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'src/templates/**/*.html',
          dest: 'src/templates'
        }
        // Bỏ target src/components nếu không có file html ở đó
      ]
    })
  ],
  server: {
    port: 3000
  }
})