/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#1a1611', 800: '#241f18', 700: '#2f2920', 600: '#3f382c' },
        pine: { DEFAULT: '#1a3a38', 800: '#1e4543', 700: '#255552', 600: '#2f6b66', 500: '#3d857f', 400: '#5aa39c', 300: '#8bc4be', 200: '#b8ddd9', 100: '#e0f0ee' },
        gold: { 50: '#fdf8f0', 100: '#f9efd8', 200: '#f0dcad', 300: '#e5c47a', 400: '#d9a84f', 500: '#c48e3a', 600: '#a6722e', 700: '#845926', 800: '#644320', 900: '#432e16' },
        cream: { DEFAULT: '#faf7f2', 100: '#f4efe6', 200: '#ebe4d6' },
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Jost', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 40px -12px rgba(21,18,14,.18)',
        lift: '0 30px 70px -25px rgba(21,18,14,.4)',
        gold: '0 14px 30px -12px rgba(184,143,62,.6)',
        glass: '0 8px 32px 0 rgba(60,42,15,.14), inset 0 1px 0 0 rgba(255,255,255,.65)',
        'glass-lg': '0 24px 60px -15px rgba(60,42,15,.28), inset 0 1px 0 0 rgba(255,255,255,.7)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(26px)' }, '100%': { opacity: 1, transform: 'none' } },
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        kenburns: { '0%': { transform: 'scale(1)' }, '100%': { transform: 'scale(1.1)' } },
        float: { '0%,100%': { transform: 'translate3d(0,0,0) scale(1)' }, '50%': { transform: 'translate3d(40px,-30px,0) scale(1.12)' } },
        pop: { '0%': { opacity: 0, transform: 'scale(.94) translateY(12px)' }, '100%': { opacity: 1, transform: 'none' } },
      },
      animation: {
        'fade-up': 'fade-up .9s cubic-bezier(.2,.7,.2,1) both',
        'fade-in': 'fade-in .6s ease both',
        kenburns: 'kenburns 9s ease-out both',
        float: 'float 22s ease-in-out infinite',
        pop: 'pop .45s cubic-bezier(.2,.7,.2,1) both',
      },
    },
  },
  plugins: [],
};
