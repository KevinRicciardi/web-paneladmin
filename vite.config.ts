import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// En un build, la URL de la API tiene que venir configurada: sin esto el
// panel quedaba apuntando a http://localhost:3000, o mandaba los tokens
// por http a un servidor real. localhost se permite para probar el build.
function validarApiUrl(valor: string | undefined) {
  if (!valor) {
    throw new Error('Falta VITE_API_URL (la URL https de la API) para compilar el panel.')
  }
  const url = new URL(valor)
  const esLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  if (url.protocol !== 'https:' && !esLocal) {
    throw new Error(`VITE_API_URL tiene que ser https:// (llegó ${valor}).`)
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'build' && mode === 'production') {
    validarApiUrl(loadEnv(mode, process.cwd(), 'VITE_').VITE_API_URL)
  }

  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (id.includes("firebase")) return "firebase";
            if (id.includes("@mui") || id.includes("@emotion")) return "mui";
            if (id.includes("react")) return "react";
            return "vendor";
          },
        },
      },
    },
  }
})
