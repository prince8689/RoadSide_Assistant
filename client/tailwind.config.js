module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./index.html"],
  theme: {
    extend: {
      colors: {
        primary:   "#FF6B35",   // Orange — main brand color
        dark:      "#1A1A2E",   // Dark Blue — headers, navbar
        secondary: "#16213E",   // Slightly lighter dark blue
        success:   "#28A745",   // Green — completed status
        danger:    "#DC3545",   // Red — cancelled, errors
        warning:   "#FFC107",   // Yellow — pending status
        light:     "#F8F9FA",   // Light gray — backgrounds
        muted:     "#6C757D",   // Gray — secondary text
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 20px rgba(0,0,0,0.08)',
        hover: '0 8px 30px rgba(0,0,0,0.12)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-ring': 'pulseRing 1.5s ease-out infinite',
        'bounce-soft': 'bounceSoft 1s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
