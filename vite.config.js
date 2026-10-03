import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Domínio próprio publica na raiz; o workflow do GitHub informa /resenha/ explicitamente.
  base: process.env.VITE_BASE_PATH || "/",
  server: { port: 5173, open: true },
});
