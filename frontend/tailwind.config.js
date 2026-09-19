/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        page: '#F7F8FA',
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F3F4F6',
        },
        primary: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          subtle: '#EFF6FF',
          dark: '#1E40AF',
        },
        content: {
          primary: '#111827',
          secondary: '#6B7280',
          muted: '#9CA3AF',
        },
        border: {
          DEFAULT: '#E5E7EB',
          dark: '#D1D5DB',
        },
        success: {
          DEFAULT: '#16A34A',
          subtle: '#F0FDF4',
          text: '#15803D',
          border: '#BBF7D0',
        },
        warning: {
          DEFAULT: '#D97706',
          subtle: '#FFFBEB',
          text: '#B45309',
          border: '#FDE68A',
        },
        danger: {
          DEFAULT: '#DC2626',
          subtle: '#FEF2F2',
          text: '#B91C1C',
          border: '#FECACA',
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif'
        ],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'modal': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
      },
      borderRadius: {
        'card': '10px',
        'panel': '12px',
        'modal': '12px',
      }
    },
  },
  plugins: [],
}
