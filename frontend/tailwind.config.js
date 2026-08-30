/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0E1220',
          900: '#12172B',
          800: '#1B2140',
          700: '#262E52',
        },
        amber: {
          400: '#F2A93B',
          500: '#E89422',
        },
        paper: '#FAFAF7',
        slate: {
          400: '#8B93AE',
          500: '#6C7594',
        },
        signal: {
          go: '#4ADE80',
          wait: '#F2A93B',
          stop: '#F0625E',
        },
      },
      fontFamily: {
        display: ['"Manrope"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        board: '0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 24px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
}
