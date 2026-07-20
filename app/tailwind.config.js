/** @type {import('tailwindcss').Config} */
// AeroLoop design system — six semantic accents on a committed dark ground.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        al: {
          bg: '#05070b',
          bg2: '#090d14',
          surface: '#0d121b',
          surface2: '#111925',
          line: 'rgba(180,205,255,.10)',
          line2: 'rgba(180,205,255,.19)',
          line3: 'rgba(180,205,255,.32)',
          text: '#f6f8ff',
          muted: '#8f9aac',
          muted2: '#616c7d',
          cyan: '#43ddff',   // advisor intelligence / primary action
          blue: '#7587ff',   // buyer / sourcing
          gold: '#ffc875',   // seller / value / concession
          lime: '#91f4a9',   // verified / eligible / approved
          red: '#ff6d80',    // blocked / conflict / risk
          purple: '#b78cff', // private / permissioned / protected
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: { xl2: '20px', xl3: '28px' },
      keyframes: {
        blink: { '50%': { opacity: '.4', transform: 'scale(.85)' } },
        orb: { '50%': { transform: 'translateY(-2px) scale(1.05)' } },
        fadeUp: { from: { opacity: '0', transform: 'translateY(6px)' } },
        slideIn: { from: { opacity: '0', transform: 'translateX(16px)' } },
      },
      animation: {
        blink: 'blink 1.6s infinite',
        orb: 'orb 4s infinite',
        fadeUp: 'fadeUp .3s ease',
        slideIn: 'slideIn .3s ease',
      },
    },
  },
  plugins: [],
}
