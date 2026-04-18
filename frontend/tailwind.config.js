/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'bv-blue': '#017EFE',
        'bv-green': '#03A504',
      },
    },
  },
  plugins: [],
};
