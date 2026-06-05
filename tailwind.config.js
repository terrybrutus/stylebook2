/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#222831',
          mid: '#393E46',
          teal: '#00ADB5',
          light: '#EEEEEE',
        },
      },
    },
  },
  plugins: [],
}
