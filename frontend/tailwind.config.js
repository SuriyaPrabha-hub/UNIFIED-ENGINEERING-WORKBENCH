/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        eng: {
          bg: '#F4F5F7',
          card: '#FFFFFF',
          sidebar: '#1F2429',
          'sidebar-text': '#C9CED4',
          border: '#D5D9DE',
          text: '#1B1F23',
          muted: '#5F6B76',
          accent: '#E8590C',
          ok: '#2E7D32',
          warn: '#B7791F',
          err: '#C62828',
        }
      },
      fontFamily: {
        sans: ['Segoe UI', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['Consolas', 'Courier New', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '4px',
        none: '0px',
        sm: '4px',
        md: '4px',
        lg: '4px',
        xl: '4px',
        '2xl': '4px',
        '3xl': '4px',
        full: '4px',
      },
      boxShadow: {
        DEFAULT: 'none',
        sm: 'none',
        md: 'none',
        lg: 'none',
        xl: 'none',
        '2xl': 'none',
        inner: 'none',
        none: 'none',
      }
    },
  },
  plugins: [],
}
