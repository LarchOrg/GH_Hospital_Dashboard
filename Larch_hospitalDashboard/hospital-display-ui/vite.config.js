import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for the Hospital Emergency & Accident Ward
// Patient Display System frontend.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  }
});
