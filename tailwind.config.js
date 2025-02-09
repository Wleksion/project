/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eefdf2',
          100: '#d7f9e0',
          200: '#b2f2c4',
          300: '#7ee4a0',
          400: '#48cf7b',
          500: '#25b65c',
          600: '#1a924a',
          700: '#19733e',
          800: '#1a5b35',
          900: '#174b2e',
        },
        secondary: {
          50: '#fef2f3',
          100: '#ffe1e3',
          200: '#ffc8cc',
          300: '#ffa0a7',
          400: '#ff6b75',
          500: '#f83b48',
          600: '#e11d2a',
          700: '#bd1721',
          800: '#9d161f',
          900: '#83171e',
        },
        accent: {
          50: '#f0f7ff',
          100: '#e0eeff',
          200: '#b9ddff',
          300: '#7cc2ff',
          400: '#3aa1ff',
          500: '#0b7fff',
          600: '#005fdb',
          700: '#004bb2',
          800: '#004094',
          900: '#003979',
        },
        neutral: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'inner-lg': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.15)',
        'glow': '0 0 15px -3px rgb(var(--color-primary-500) / 0.1), 0 0 6px -4px rgb(var(--color-primary-500) / 0.1)',
      }
    },
  },
  plugins: [],
};
