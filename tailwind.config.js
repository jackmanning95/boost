/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#509fe0',
        secondary: {
          DEFAULT: '#0d5cdf',
          dark: '#0942a1'
        }
      },
      fontFamily: {
        yeseva: ['Yeseva One', 'cursive']
      }
    },
  },
  plugins: [],
};