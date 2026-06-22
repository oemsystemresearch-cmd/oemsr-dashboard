/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:     '#f9fafb',   // page background — light gray
        surface:     '#f3f4f6',   // slightly darker surface
        card:        '#ffffff',   // white cards
        border:      '#e5e7eb',   // light border
        navy:        '#01122b',   // deep navy header — matched to logo background
        textPrimary: '#111827',   // dark main text
        accent: {
          DEFAULT: '#2EAF7D',    // teal-green (replaces orange)
          light:   '#3FD0C9',    // bright teal hover
        },
        muted: '#6b7280',         // secondary text — gray
        market: {
          low:  '#449342',        // positive / green
          mid:  '#2EAF7D',        // neutral teal
          high: '#D15050',        // negative / muted red
          mis:  '#3FD0C9',        // MIS system — bright teal
          dts:  '#4A8090',        // DTS system — gray-teal
        },
      },
      fontFamily: {
        sans:   ['Arial', '"Helvetica Neue"', 'Helvetica', 'system-ui', 'sans-serif'],
        arabic: ['"Noto Sans Arabic"', 'system-ui', 'sans-serif'],
        mono:   ['Arial', '"Helvetica Neue"', 'Helvetica', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
