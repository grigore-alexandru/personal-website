/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: '#ffffff',
        'surface-highlight': '#f8fafc',
        display: '#1e293b',
        body: '#64748b',
        accent: '#3b82f6',
        'accent-pink': '#ec4899',
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['5rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-md': ['3.5rem', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
      },
      spacing: {
        '18': '4.5rem',
        '30': '7.5rem',
      },
      borderRadius: {
        '4xl': '2.5rem',
      },
      boxShadow: {
        'soft': '0 20px 40px -10px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
}