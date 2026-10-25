/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#FFF8F5',
        chit: '#FFFFFF',
        'chit-shade': '#F3ECE8',
        ink: '#1C1917',
        'ink-muted': '#6B5B53',
        dare: '#B91C14',
        truth: '#2757D6',
        highlighter: '#F6C244',
        peach: '#FFDDB0',
        pass: '#2F8F5B',
        fail: '#B91C14',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        handwriting: ['Newsreader', 'Georgia', 'serif'],
        mono: ['DM Mono', 'monospace'],
      },
      boxShadow: {
        hard: '4px 4px 0px 0px #1C1917',
        'hard-sm': '2px 2px 0px 0px #1C1917',
        'hard-lg': '6px 6px 0px 0px #1C1917',
        'hard-pressed': '1px 1px 0px 0px #1C1917',
      },
      borderRadius: {
        btn: '8px',
        chit: '4px',
      },
      borderWidth: {
        DEFAULT: '2px',
        2: '2px',
        3: '3px',
        4: '4px',
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
      },
    },
  },
  plugins: [],
}
