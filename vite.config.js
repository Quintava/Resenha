import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // O domínio próprio publica o aplicativo diretamente na raiz.
  base: "/",
  server: { port: 5173, open: true },
});
