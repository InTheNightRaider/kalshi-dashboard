import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0a0b0d',
          800: '#111318',
          700: '#181b22',
          600: '#1e2330',
          500: '#252c3a',
        },
        accent: {
          green: '#00d17a',
          red:   '#ff4d6d',
          blue:  '#4f8ef7',
          gold:  '#f5c842',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}

export default config
