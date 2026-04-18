/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Inter for UI, Fraunces for the wordmark and dashboard headings only.
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      fontSize: {
        // Baseline 14px minimum, 1.6 line-height.
        xs: ['12px', { lineHeight: '1.5' }],
        sm: ['14px', { lineHeight: '1.6' }],
        base: ['15px', { lineHeight: '1.6' }],
        lg: ['17px', { lineHeight: '1.5' }],
        xl: ['20px', { lineHeight: '1.3' }],
        '2xl': ['24px', { lineHeight: '1.25' }],
        '3xl': ['30px', { lineHeight: '1.15' }],
        '5xl': ['48px', { lineHeight: '1' }],
        '6xl': ['60px', { lineHeight: '1' }],
      },
      borderRadius: {
        // Spec: 16px cards, 12px buttons, full pills.
        card: '16px',
        btn: '12px',
      },
      colors: {
        // Nature-Core named tokens
        forest: '#0B1F17',
        canopy: '#13301F',
        bone: '#F4F1EA',
        stone: '#E8E3D7',
        ink: '#1A2B1F',
        lichen: '#7BAE6F',
        'amber-bark': '#C08B4C',
        alert: '#B24A3F',
        // Scaled `moss` palette for shade-based classes, repointed to Nature-Core.
        moss: {
          50: '#F4F1EA',   // bone
          100: '#E8E3D7',  // stone
          200: '#D7E8D2',
          300: '#C7E5C5',  // "moss text" (dark-mode foreground)
          400: '#9BCB93',
          500: '#7BAE6F',  // lichen
          600: '#5D8E55',
          700: '#3E6A38',
          800: '#1F4328',
          900: '#13301F',  // canopy
          950: '#0B1F17',  // forest
        },
        bark: {
          50: '#F4F1EA',
          100: '#E8E3D7',
          200: '#D3CCB8',
          300: '#BDB198',
          400: '#A3936F',
          500: '#C08B4C',  // amber-bark
          600: '#9C7140',
          700: '#755533',
          800: '#4B3928',
          900: '#1A2B1F',  // ink
          950: '#0B1F17',
        },
      },
      boxShadow: {
        'inner-panel': 'inset 0 1px 0 0 rgba(255,255,255,0.04), inset 0 0 24px 0 rgba(0,0,0,0.25)',
        'card-light': '0 1px 2px rgba(26,43,31,0.06), 0 2px 8px rgba(26,43,31,0.04)',
      },
      keyframes: {
        fadein: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%, 80%, 100%': { opacity: '0.3', transform: 'scale(0.85)' },
          '40%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        // Spec: messages fade-in-up 200ms.
        fadein: 'fadein 200ms ease-out both',
        pulseDot: 'pulseDot 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
