import { defineConfig } from 'vite'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// The React Router plugin replaces @vitejs/plugin-react (it includes React
// Fast Refresh) and adds framework mode: routes.ts, pre-rendering, etc.
export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
  ],
})
