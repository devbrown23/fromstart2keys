/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          500: '#FFD700', // main gold
          600: '#E6C200', // darker hover gold
        },
        black: '#000000',
      }
    },
  },
  plugins: [],
}
