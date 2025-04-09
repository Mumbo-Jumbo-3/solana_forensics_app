/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        keyframes: {
          'pulse-glow': {
            '0%, 100%': {
              boxShadow: '0 0 8px 2px rgba(75, 144, 255, 0.5)',
            },
            '50%': {
              boxShadow: '0 0 16px 4px rgba(59, 130, 246, 1)',
            },
          },
        },
        animation: {
          'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        },
      },
    },
    plugins: [],
  }