/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e6f4f1',
          100: '#b8e0d7',
          200: '#89ccbd',
          300: '#5ab8a3',
          400: '#2ba489',
          500: '#095c54', // Main Brand Teal from reference
          600: '#0d6e65',
          700: '#08534b',
          800: '#05443e', // Primary Dark
          900: '#03312c',
          950: '#0f2925', // Main Text
        },
        surface: {
          DEFAULT: '#ffffff',
          alt: '#f0f6f4',
          subtle: '#f8faf9',
        },
        accent: {
          DEFAULT: '#d97706',
          soft: '#fef3c7',
        },
        civic: {
          green: '#10b981',
          blue: '#0284c7',
          amber: '#f59e0b',
          red: '#dc2626',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft-sm': '0 2px 8px rgba(9, 92, 84, 0.04)',
        'soft-md': '0 10px 30px rgba(9, 92, 84, 0.08)',
        'soft-lg': '0 20px 40px rgba(5, 68, 62, 0.14)',
        'soft-glow': '0 0 40px rgba(16, 185, 129, 0.2)',
      },
      borderRadius: {
        'sm': '8px',
        'md': '14px',
        'lg': '24px',
      }
    },
  },
  plugins: [],
}
