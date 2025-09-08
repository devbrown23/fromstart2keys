/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './public/**/*.html',   // ← include your standalone pages (optional, but handy)
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  safelist: [
    // keep gold utilities with opacity that appear in strings / variants
    'text-gold-500', 'bg-gold-500', 'hover:bg-gold-600',
    'border-gold-500',
    'border-gold-500/20', 'border-gold-500/25', 'border-gold-500/30', 'border-gold-500/40',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          500: '#FFD700',
          600: '#E6C200',
        },
        black: '#000000',
      },
    },
  },
  plugins: [],
};

