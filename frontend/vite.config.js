import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  preview: {
    allowedHosts: [
      "lovely-integrity-production-7cf9.up.railway.app"
    ],
  },
});