import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Caminhos relativos funcionam no GitHub Pages, em domínio próprio e após renomear o repositório.
  base: "./",
  server: { port: 5173, open: true },
});
