import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** כתובת הבסיס. בפריסה לנתיב משנה מגדירים VITE_BASE, למשל /Kefel-lenny/detective/ */
export default defineConfig({
  base: process.env.VITE_BASE ?? './',
  plugins: [react()],
})
