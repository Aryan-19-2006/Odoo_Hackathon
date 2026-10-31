export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#101b33',
          900: '#172554',
          800: '#1e3a8a',
        },
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        surface: '#ffffff',
        canvas: '#f8fafc',
        line: '#e2e8f0',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
      },
      borderColor: {
        DEFAULT: '#e2e8f0',
        line: '#e2e8f0',
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.04), 0 1px 3px rgb(15 23 42 / 0.06)',
        popover: '0 16px 40px rgb(15 23 42 / 0.16)',
      },
      borderRadius: {
        card: '0.875rem',
      },
    },
  },
  plugins: [],
};
