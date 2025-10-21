/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neo-pink': '#FF005C',
        'neo-cyan': '#00F0FF',
        'neo-black': '#000000',
        'neo-white': '#FFFFFF',
        'neo-yellow': '#FFFF00',
        'neo-green': '#00FF00',
        'neo-purple': '#9333EA',
      },
      fontFamily: {
        'mono': ['IBM Plex Mono', 'Courier New', 'monospace'],
      },
      boxShadow: {
        'brutal': '6px 6px 0 #000000',
        'brutal-sm': '4px 4px 0 #000000',
        'brutal-lg': '8px 8px 0 #000000',
      },
    },
  },
  plugins: [],
}
