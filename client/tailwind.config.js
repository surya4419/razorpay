/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#14304D',
          hover: '#0E243B',
          light: 'rgba(20, 48, 77, 0.08)',
          border: 'rgba(20, 48, 77, 0.2)'
        },
        emerald: {
          DEFAULT: '#0F9D6B',
          hover: '#0C8359',
          light: '#E7F7F1',
          border: 'rgba(15, 157, 107, 0.25)'
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F7F8FA',
          hover: '#FAFBFC'
        },
        border: {
          DEFAULT: '#E2E5EB',
          dark: '#CAD0DB'
        },
        text: {
          primary: '#1A2332',
          secondary: '#6B7280'
        },
        status: {
          amber: '#B7791F',
          amberBg: '#FEF8EE',
          amberBorder: 'rgba(183, 121, 31, 0.25)',
          red: '#C0392B',
          redBg: '#FDF2F1',
          redBorder: 'rgba(192, 57, 43, 0.25)'
        }
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace']
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(16, 24, 40, 0.04)',
        drawer: '0 8px 24px rgba(16, 24, 40, 0.10)'
      }
    },
  },
  plugins: [],
}
