/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Aeonik Fono"', 'system-ui', 'sans-serif'],
        block: ['Aeonik', 'system-ui', 'sans-serif'],
      },
      colors: {
        sidebar: {
          DEFAULT: '#2C2F33',
          button: '#3A3F45',
          hover: '#484E56',
        },
        canvas: '#F5F6F8',
        block: '#E8EEF3',
        accent: {
          DEFAULT: '#3B82F6',
          dark: '#2563EB',
        },
        marker: '#8B98A8',
      },
      width: {
        sidebar: '240px',
      },
    },
  },
  plugins: [],
};
