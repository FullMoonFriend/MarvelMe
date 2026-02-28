/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        marvel: {
          red: '#ed1d24',
          darkred: '#a01018',
          gold: '#f5c518',
          dark: '#0f0f0f',
          card: '#1a1a1a',
          border: '#2a2a2a',
        },
      },
      fontFamily: {
        bangers: ['Bangers', 'cursive'],
      },
      keyframes: {
        shimmer: {
          '0%, 100%': { boxShadow: '0 0 8px 2px #ed1d24, 0 0 20px 4px #f5c518' },
          '50%': { boxShadow: '0 0 16px 4px #f5c518, 0 0 30px 8px #ed1d24' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.06)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s ease-in-out infinite',
        fadeIn: 'fadeIn 0.4s ease-out forwards',
        pop: 'pop 0.3s ease-in-out',
      },
    },
  },
  plugins: [],
}
