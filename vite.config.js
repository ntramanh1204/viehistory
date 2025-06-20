import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

export default defineConfig({
  base: '/',
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
        },
        {
          src: 'src/page/**/*.html', 
          dest: 'src/page'
        },
        {
          src: 'public/assets/**/*',
          dest: 'assets'
        }
      ]
    })
  ],
  server: {
    port: 3000,
    historyApiFallback: {
      rewrites: [
        { from: /^\/blog/, to: '/index.html' },
        { from: /^\/post/, to: '/index.html' },
        { from: /.*/, to: '/index.html' }
      ]
    }
  }
})