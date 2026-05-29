/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        chic: {
          bg: '#0B0820',
          surface: '#1E1B2E',
          'surface-2': '#2A2438',
          border: '#2E2A40',
          red: '#e53e3e',
          'red-light': '#fc8181',
          text: '#F5F5F5',
          muted: '#8A8A8A',
          lavender: '#C9A8F5',
          periwinkle: '#D4D8F5',
          cream: '#F5E4B0',
          pink: '#E8A0AE',
          mint: '#A8E0CE',
        },
      },
      borderRadius: {
        '4xl': '2rem',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
