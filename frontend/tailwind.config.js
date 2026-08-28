/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        racing: {
          dark: '#0b0f19',
          card: '#131b2e',
          cardHover: '#1c2742',
          gold: '#f59e0b',
          green: '#10b981',
          blue: '#3b82f6',
          purple: '#8b5cf6',
          red: '#ef4444'
        }
      }
    },
  },
  plugins: [],
}
