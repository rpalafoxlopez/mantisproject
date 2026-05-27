/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#005ea1',
        secondary: '#0e59b6',
        tertiary: '#7d40a0',
        background: '#f5f6ff',
        surface: '#ffffff',
        'on-surface': '#1b2e51',
        'on-surface-variant': '#495b80',
        'border-subtle': '#E2E8F0',
        error: '#b31b25',
        'error-red': '#C53030',
        'success-green': '#2F855A',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
